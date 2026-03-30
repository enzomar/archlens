import type { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk-api.js';
import type { Relationship, Viewpoint } from '../domain/types';
import type { FilteredGraph } from './graphFilter';
import type { GraphBuilder, ElkGraph, ZoomLayoutConfig, GraphBuilderOptions } from './graphBuilder';
import { buildElkNode, KIND_LEVEL, LEVEL_X_STEP, layoutDensity } from './graphBuilder';

// ─── ArchiMate Layered Graph Builder ──────────────────────────────
// Produces per-viewpoint ELK sub-graphs that are stacked as
// horizontal swimlane bands. Each band uses ELK layered algorithm
// internally, with C4 compound nesting preserved.
//
// Layer constraints:
//   business    → row 0 (top)
//   application → row 1 (middle)
//   technology  → row 2 (bottom)
//
// Cross-viewpoint edges are routed via orthogonal fallback
// after all per-band layouts are resolved.

const SWIMLANE_VP_ORDER: Viewpoint[] = ['business', 'application', 'technology'];
const LANE_LABEL_W = 50; // left gutter for rotated viewpoint label

export class ArchiMateLayeredGraphBuilder implements GraphBuilder {
  build(
    graph: FilteredGraph,
    dims: Record<string, { width: number; height: number }>,
    relationships: Relationship[],
    zc: ZoomLayoutConfig,
    options?: GraphBuilderOptions,
  ): ElkGraph {
    const { unlocked, allIds } = graph;
    const activeViewpoints = options?.activeViewpoints ?? [];

    // Determine visible rows
    const activeVps = SWIMLANE_VP_ORDER.filter(
      (vp) => activeViewpoints.includes(vp) || activeViewpoints.includes('global' as Viewpoint),
    );
    const rows = activeVps.length > 0 ? activeVps : SWIMLANE_VP_ORDER;

    // Bucket entities by viewpoint row
    const laneEntities = new Map<Viewpoint, typeof unlocked>();
    for (const vp of rows) laneEntities.set(vp, []);
    for (const e of unlocked) {
      const vp = rows.includes(e.viewpoint) ? e.viewpoint : rows[0];
      laneEntities.get(vp)!.push(e);
    }

    // Build one ELK sub-graph per viewpoint band
    const routing = options?.edgeRouting ?? 'ORTHOGONAL';
    const bandChildren: ElkNode[] = [];

    for (let ri = 0; ri < rows.length; ri++) {
      const vp = rows[ri];
      const vpEnts = laneEntities.get(vp)!;
      if (vpEnts.length === 0) {
        // Empty band — placeholder so swimlane dimensions are consistent
        bandChildren.push({
          id: `__lane_${vp}__`,
          width: zc.laneMinH * 2,
          height: zc.laneMinH,
          layoutOptions: {
            'elk.nodeSize.constraints': 'FIXED_MINIMUM_SIZE',
            'elk.nodeSize.minimum': `(${zc.laneMinH * 2}, ${zc.laneMinH})`,
            'elk.partitioning.partition': String(ri),
          },
          children: [],
        });
        continue;
      }

      const vpIdSet = new Set(vpEnts.map((e) => e.id));
      const vpEntityById = new Map(vpEnts.map((e) => [e.id, e]));

      // Build parent→children map within this viewpoint
      const childrenOf = new Map<string, string[]>();
      const rootIds: string[] = [];
      for (const e of vpEnts) {
        const pid = e.parentId && vpIdSet.has(e.parentId) ? e.parentId : null;
        if (pid === null) {
          rootIds.push(e.id);
        } else {
          if (!childrenOf.has(pid)) childrenOf.set(pid, []);
          childrenOf.get(pid)!.push(e.id);
        }
      }

      const elkChildren: ElkNode[] = (() => {
        // ── Semantic sort within this band ───────────────────────────────
        // Same 5-tier priority as C4: kind level → parent group → fan-in
        // → fan-out → name.  Ensures left→right order is domain-coherent.
        const bandFanIn  = new Map<string, number>();
        const bandFanOut = new Map<string, number>();
        for (const e of vpEnts) { bandFanIn.set(e.id, 0); bandFanOut.set(e.id, 0); }
        for (const r of relationships) {
          if (vpIdSet.has(r.targetId)) bandFanIn.set(r.targetId,  (bandFanIn.get(r.targetId)  ?? 0) + 1);
          if (vpIdSet.has(r.sourceId)) bandFanOut.set(r.sourceId, (bandFanOut.get(r.sourceId) ?? 0) + 1);
        }
        const nameOf   = (id: string) => vpEntityById.get(id)?.name ?? id;
        const kLvl     = (id: string) => KIND_LEVEL[vpEntityById.get(id)?.kind ?? ''] ?? 3;
        const bandSort = (a: string, b: string): number => {
          const la = kLvl(a), lb = kLvl(b); if (la !== lb) return la - lb;
          const pa = vpEntityById.get(a)?.parentId ?? '', pb = vpEntityById.get(b)?.parentId ?? '';
          if (pa !== pb) return pa.localeCompare(pb);
          const fia = bandFanIn.get(a) ?? 0, fib = bandFanIn.get(b) ?? 0; if (fia !== fib) return fia - fib;
          const foa = bandFanOut.get(a) ?? 0, fob = bandFanOut.get(b) ?? 0; if (foa !== fob) return fob - foa;
          return nameOf(a).localeCompare(nameOf(b));
        };
        rootIds.sort(bandSort);
        for (const kids of childrenOf.values()) kids.sort(bandSort);

        // If prior positions exist, re-sort roots by their prior X to preserve
        // the left→right visual order across filter and zoom-level changes.
        // This creates continuity without needing absolute canvas coordinates.
        const priorXMap = options?.priorXMap;
        if (priorXMap) {
          rootIds.sort((a, b) => {
            const pa = priorXMap.get(a), pb = priorXMap.get(b);
            if (pa !== undefined && pb !== undefined) return pa - pb;
            if (pa !== undefined) return -1;
            if (pb !== undefined) return  1;
            return 0;
          });
        }

        // Assign sequential x-hints so ELK's semiInteractive crossing-min
        // stage respects this left→right ordering within the band.
        return rootIds.map((id, idx) => {
          const node = buildElkNode(id, childrenOf, vpEntityById, dims, zc, 0, routing);
          return { ...node, x: idx * LEVEL_X_STEP };
        });
      })();

      // Intra-viewpoint edges only
      const vpEdges: ElkExtendedEdge[] = relationships
        .filter((r) => vpIdSet.has(r.sourceId) && vpIdSet.has(r.targetId))
        .map((r) => ({ id: r.id, sources: [r.sourceId], targets: [r.targetId] }));

      // Dynamic spacing
      const nodeCount = vpEnts.length;
      const spacingScale = nodeCount > 30 ? 0.85 : 1.0;
      // Density scale: more nodes in this band → more room for edge routing.
      const bd = layoutDensity(nodeCount);

      bandChildren.push({
        id: `__lane_${vp}__`,
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.spacing.nodeNode': String(Math.round(zc.nestGap * spacingScale)),
          'elk.layered.spacing.nodeNodeBetweenLayers': String(Math.round(zc.laneGap * spacingScale)),
          'elk.edgeRouting': routing,
          'elk.spacing.edgeNode': String(Math.round(35 * bd)),
          'elk.spacing.edgeEdge': String(Math.round(22 * bd)),
          'elk.layered.spacing.edgeNodeBetweenLayers': String(Math.round(35 * bd)),
          'elk.layered.spacing.edgeEdgeBetweenLayers': String(Math.round(22 * bd)),
          'elk.layered.nodePlacement.favorStraightEdges': 'true',
          'elk.layered.unnecessaryBendpoints': 'true',
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.crossingMinimization.semiInteractive': 'true',
          'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
          'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
          'elk.padding': `[top=${zc.lanePad * 1.5},left=${zc.lanePad},bottom=${zc.lanePad * 1.5},right=${zc.lanePad}]`,
          'elk.nodeSize.constraints': 'FIXED_MINIMUM_SIZE',
          'elk.nodeSize.minimum': `(${zc.laneMinH * 2}, ${zc.laneMinH})`,
          'elk.partitioning.partition': String(ri),
        },
        children: elkChildren,
        edges: vpEdges,
      });
    }

    // Cross-viewpoint edges — hoisted to root level
    const crossVpEdges: ElkExtendedEdge[] = [];
    const laneIdSets = new Map<Viewpoint, Set<string>>();
    for (const vp of rows) {
      laneIdSets.set(vp, new Set((laneEntities.get(vp) ?? []).map((e) => e.id)));
    }
    for (const r of relationships) {
      if (!allIds.has(r.sourceId) || !allIds.has(r.targetId)) continue;
      // Check if source and target are in different viewpoint bands
      let srcVp: Viewpoint | null = null;
      let tgtVp: Viewpoint | null = null;
      for (const vp of rows) {
        const ids = laneIdSets.get(vp)!;
        if (ids.has(r.sourceId)) srcVp = vp;
        if (ids.has(r.targetId)) tgtVp = vp;
      }
      if (srcVp && tgtVp && srcVp !== tgtVp) {
        crossVpEdges.push({ id: r.id, sources: [r.sourceId], targets: [r.targetId] });
      }
    }

    // Density scale for root-level inter-band edge spacing.
    const rd = layoutDensity(unlocked.length);
    // Root graph: stacks bands vertically (DOWN direction).
    // INTERACTIVE layering + y-position hints make the band order a HARD
    // constraint: business=0, application=1, technology=2 — no matter
    // which direction cross-band edges flow.
    const BAND_Y_STEP = 2000; // large gap so ELK never merges layers
    const orderedBands = bandChildren.map((band, i) => ({
      ...band,
      y: i * BAND_Y_STEP,
    }));

    return {
      root: {
        id: '__archiroot__',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'DOWN',
          'elk.layered.layering.strategy': 'INTERACTIVE',
          'elk.spacing.nodeNode': String(zc.laneGap),
          'elk.layered.spacing.nodeNodeBetweenLayers': String(zc.laneGap),
          'elk.edgeRouting': routing,
          'elk.spacing.edgeNode': String(Math.round(35 * rd)),
          'elk.spacing.edgeEdge': String(Math.round(22 * rd)),
          'elk.layered.spacing.edgeNodeBetweenLayers': String(Math.round(35 * rd)),
          'elk.layered.spacing.edgeEdgeBetweenLayers': String(Math.round(15 * rd)),
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.unnecessaryBendpoints': 'true',
          'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
          'elk.padding': `[top=${zc.laneOuterPad},left=${zc.laneOuterPad + LANE_LABEL_W},bottom=${zc.laneOuterPad},right=${zc.laneOuterPad}]`,
        },
        children: orderedBands,
        edges: crossVpEdges,
      },
      viewpointRows: rows,
    };
  }
}

export { LANE_LABEL_W };
