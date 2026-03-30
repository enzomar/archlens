import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api.js';
import type { Relationship } from '../domain/types';
import type { FilteredGraph } from './graphFilter';
import type { GraphBuilder, ElkGraph, ZoomLayoutConfig, GraphBuilderOptions } from './graphBuilder';
import { buildElkNode, KIND_LEVEL, VP_ORDER, LEVEL_X_STEP, VP_GAP, layoutDensity } from './graphBuilder';

// ─── C4 Nested Graph Builder ──────────────────────────────────────
// Produces a single ELK graph with compound nodes mirroring the C4
// containment hierarchy (System → Container → Component).
//
// Ordering philosophy:
//   1. Most-inclusive C4 level first (context > container > component)
//      — entities that CONTAIN others sit visually above what they contain.
//   2. Within the same C4 level, fewer incoming edges (fan-in) come first
//      — sources / initiators sit at the top-left; downstream sinks below.
//   3. Among equal fan-in, entities with MORE outgoing edges (wider fans)
//      come first — they "own" their subtree.
//   4. ELK `INTERACTIVE` layering respects the y-position hints we embed
//      so the sort order is honoured. Same-rank nodes share a layer and
//      are arranged side-by-side using x-hints + NETWORK_SIMPLEX placement.
// ─────────────────────────────────────────────────────────────────

// KIND_LEVEL, VP_ORDER, LEVEL_X_STEP, VP_GAP are shared — imported from graphBuilder.

/** Y spacing (canvas units) per C4 level.  ELK INTERACTIVE uses this to
 *  assign nodes to layers: bigger gaps → cleaner layer separation. */
const LEVEL_Y_STEP = 800;

/** Extra y-offset per subtree depth level — separates deep compound
 *  nodes from shallow ones within the same C4 band. */
const DEPTH_Y_BONUS = 100;

/** Compute maximum subtree depth below a node. */
function subtreeDepth(id: string, childrenOf: Map<string, string[]>): number {
  const kids = childrenOf.get(id);
  if (!kids || kids.length === 0) return 0;
  return 1 + Math.max(...kids.map((k) => subtreeDepth(k, childrenOf)));
}

export class C4NestedGraphBuilder implements GraphBuilder {
  build(
    graph: FilteredGraph,
    dims: Record<string, { width: number; height: number }>,
    relationships: Relationship[],
    zc: ZoomLayoutConfig,
    options?: GraphBuilderOptions,
  ): ElkGraph {
    const { unlocked, entityById, allIds } = graph;
    const idSet = new Set(unlocked.map((e) => e.id));

    // ── 1. Build parent→children map ────────────────────────────────
    const childrenOf = new Map<string, string[]>();
    const rootIds: string[] = [];
    for (const e of unlocked) {
      const pid = e.parentId && idSet.has(e.parentId) ? e.parentId : null;
      if (pid === null) {
        rootIds.push(e.id);
      } else {
        if (!childrenOf.has(pid)) childrenOf.set(pid, []);
        childrenOf.get(pid)!.push(e.id);
      }
    }

    // ── 2. Compute fan-in and fan-out for every entity ───────────────
    const fanIn  = new Map<string, number>();
    const fanOut = new Map<string, number>();
    for (const e of unlocked) { fanIn.set(e.id, 0); fanOut.set(e.id, 0); }
    for (const r of relationships) {
      if (idSet.has(r.targetId)) fanIn.set(r.targetId, (fanIn.get(r.targetId) ?? 0) + 1);
      if (idSet.has(r.sourceId)) fanOut.set(r.sourceId, (fanOut.get(r.sourceId) ?? 0) + 1);
    }

    // ── 3. Sort helpers ─────────────────────────────────────────────────
    // Defined BEFORE sortBySemantics so the comparator can reference them.
    const nameOf    = (id: string) => entityById.get(id)?.name ?? id;
    // C4 level: more inclusive kinds (person, system) = lower = visually higher.
    const kindLevel = (id: string) => KIND_LEVEL[entityById.get(id)?.kind ?? ''] ?? 3;
    // ArchiMate layer: business → application → technology.
    const vpOf      = (id: string) => VP_ORDER[entityById.get(id)?.viewpoint ?? 'application'] ?? 1;

    // Full 6-tier comparator — keeps domains coherent and layout stable:
    //   C4 level → ArchiMate layer → parent group → fan-in → fan-out → name
    const sortBySemantics = (a: string, b: string): number => {
      const la = kindLevel(a), lb = kindLevel(b);
      if (la !== lb) return la - lb;
      const va = vpOf(a), vb = vpOf(b);
      if (va !== vb) return va - vb;
      // Group siblings: nodes sharing the same parent cluster together.
      const pa = entityById.get(a)?.parentId ?? '', pb = entityById.get(b)?.parentId ?? '';
      if (pa !== pb) return pa.localeCompare(pb);
      // Sources (low fan-in) before sinks; wider hubs before narrow leaves.
      const fia = fanIn.get(a) ?? 0, fib = fanIn.get(b) ?? 0;
      if (fia !== fib) return fia - fib;
      const foa = fanOut.get(a) ?? 0, fob = fanOut.get(b) ?? 0;
      if (foa !== fob) return fob - foa;
      return nameOf(a).localeCompare(nameOf(b));
    };

    // Pre-sort children in every compound node.
    for (const kids of childrenOf.values()) kids.sort(sortBySemantics);

    // ── 4. Sort root nodes — sortBySemantics handles all tiers ──────────
    rootIds.sort(sortBySemantics);

    // ── 5. Group roots by C4 level for x-position assignment ────────
    const levelGroups = new Map<number, string[]>();
    for (const id of rootIds) {
      const lv = kindLevel(id);
      if (!levelGroups.has(lv)) levelGroups.set(lv, []);
      levelGroups.get(lv)!.push(id);
    }

    // Precompute x-positions with gaps between viewpoint clusters
    // (O(n) lookup vs O(n²) indexOf per node).
    const xPositionOf = new Map<string, number>();
    for (const group of levelGroups.values()) {
      let x = 0;
      let prevVp = '';
      for (const id of group) {
        const vp = entityById.get(id)?.viewpoint ?? 'application';
        if (prevVp && vp !== prevVp) x += VP_GAP;
        xPositionOf.set(id, x);
        x += LEVEL_X_STEP;
        prevVp = vp;
      }
    }

    // Normalized priority scaling: relative to actual data range.
    const maxFanIn = Math.max(...Array.from(fanIn.values()), 1);

    // ── 6. Build ELK nodes with y/x position hints ──────────────────
    // y-hints are ONLY applied to root nodes — ELK sizes and places children
    // freely inside compound nodes to avoid conflicting position constraints.
    const routing   = options?.edgeRouting ?? 'ORTHOGONAL';
    const priorXMap = options?.priorXMap;
    const elkChildren: ElkNode[] = rootIds.map((id) => {
      const node  = buildElkNode(id, childrenOf, entityById, dims, zc, 0, routing);
      const lv    = kindLevel(id);
      const depth = subtreeDepth(id, childrenOf);

      // Normalized priority: fewer inputs → higher priority (placed first).
      const priority = Math.round((1 - ((fanIn.get(id) ?? 0) / maxFanIn)) * 100);

      // X hint: prefer prior canvas position for spatial continuity across
      // filter toggles, zoom changes, and mode switches.
      // Fall back to semantic left-to-right x within the C4 level band.
      const xHint = priorXMap?.get(id) ?? xPositionOf.get(id)!;

      return {
        ...node,
        // Position hints for INTERACTIVE layering (root nodes only):
        //   y → C4 level band + depth offset for deep-tree separation
        //   x → prior position (stable) or semantic ordering within level
        x: xHint,
        y: lv * LEVEL_Y_STEP + depth * DEPTH_Y_BONUS,
        layoutOptions: {
          ...node.layoutOptions,
          'elk.priority': String(priority),
        },
      };
    });

    // ── 7. Edges at root (ELK routes through compound boundaries) ───
    const elkEdges: ElkExtendedEdge[] = relationships
      .filter((r) => allIds.has(r.sourceId) && allIds.has(r.targetId))
      .map((r) => ({
        id: r.id,
        sources: [r.sourceId],
        targets: [r.targetId],
        layoutOptions: { 'elk.priority': '1' },
      }));

    // ── 8. Spacing scales ────────────────────────────────────────────
    const nodeCount = unlocked.length;
    const sc = nodeCount > 50 ? 0.8 : nodeCount > 20 ? 0.9 : 1.0;    // Density scale: dense diagrams get more breathing room around edge routes.
    const dn = layoutDensity(nodeCount);
    return {
      root: {
        id: '__c4root__',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'DOWN',

          // INTERACTIVE: ELK respects our pre-assigned y/x hints to preserve
          // the C4 level → fan-in ordering while still optimising crossings.
          'elk.layered.layering.strategy': 'INTERACTIVE',

          // Semi-interactive crossing min: uses our x hints as a starting
          // point for the sweep, then optimises within each layer.
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.crossingMinimization.semiInteractive': 'true',

          'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',

          // Hierarchical edge routing (through compound-node boundaries)
          'elk.edgeRouting': routing,
          'elk.hierarchyHandling': 'INCLUDE_CHILDREN',

          // Spacing
          'elk.spacing.nodeNode': String(Math.round(zc.nestGap * sc)),
          'elk.layered.spacing.nodeNodeBetweenLayers': String(Math.round(zc.laneGap * sc * 2)),
          'elk.spacing.edgeNode': String(Math.round(30 * dn)),
          'elk.spacing.edgeEdge': String(Math.round(18 * dn)),
          'elk.layered.spacing.edgeNodeBetweenLayers': String(Math.round(30 * dn)),
          'elk.layered.spacing.edgeEdgeBetweenLayers': String(Math.round(18 * dn)),
          'elk.layered.nodePlacement.favorStraightEdges': 'true',
          'elk.layered.unnecessaryBendpoints': 'true',

          'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',

          'elk.randomSeed': '1',

          'elk.padding': `[top=${zc.laneOuterPad},left=${zc.laneOuterPad},bottom=${zc.laneOuterPad},right=${zc.laneOuterPad}]`,
        },
        children: elkChildren,
        edges: elkEdges,
      },
    };
  }
}
