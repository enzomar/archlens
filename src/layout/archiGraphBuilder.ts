import type { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk-api.js';
import type { Relationship, Viewpoint } from '../domain/types';
import type { FilteredGraph } from './graphFilter';
import type { GraphBuilder, ElkGraph, ZoomLayoutConfig, GraphBuilderOptions } from './graphBuilder';
import { buildElkNode } from './graphBuilder';

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

      const elkChildren = rootIds.map((id) =>
        buildElkNode(id, childrenOf, vpEntityById, dims, zc, 0, routing),
      );

      // Intra-viewpoint edges only
      const vpEdges: ElkExtendedEdge[] = relationships
        .filter((r) => vpIdSet.has(r.sourceId) && vpIdSet.has(r.targetId))
        .map((r) => ({ id: r.id, sources: [r.sourceId], targets: [r.targetId] }));

      // Dynamic spacing
      const nodeCount = vpEnts.length;
      const spacingScale = nodeCount > 30 ? 0.85 : 1.0;

      bandChildren.push({
        id: `__lane_${vp}__`,
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.spacing.nodeNode': String(Math.round(zc.nestGap * spacingScale)),
          'elk.layered.spacing.nodeNodeBetweenLayers': String(Math.round(zc.laneGap * spacingScale)),
          'elk.edgeRouting': routing,
          'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
          'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
          'elk.padding': `[top=${zc.lanePad},left=${zc.lanePad},bottom=${zc.lanePad},right=${zc.lanePad}]`,
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

    // Root graph: stacks bands vertically (DOWN direction)
    return {
      root: {
        id: '__archiroot__',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'DOWN',
          'elk.spacing.nodeNode': String(zc.laneGap),
          'elk.layered.spacing.nodeNodeBetweenLayers': String(zc.laneGap),
          'elk.edgeRouting': routing,
          'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
          'elk.partitioning.activate': 'true',
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
          'elk.padding': `[top=${zc.laneOuterPad},left=${zc.laneOuterPad + LANE_LABEL_W},bottom=${zc.laneOuterPad},right=${zc.laneOuterPad}]`,
        },
        children: bandChildren,
        edges: crossVpEdges,
      },
      viewpointRows: rows,
    };
  }
}

export { LANE_LABEL_W };
