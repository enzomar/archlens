import type { ElkExtendedEdge } from 'elkjs/lib/elk-api.js';
import type { Relationship } from '../domain/types';
import type { FilteredGraph } from './graphFilter';
import type { GraphBuilder, ElkGraph, ZoomLayoutConfig, GraphBuilderOptions } from './graphBuilder';
import { buildElkNode } from './graphBuilder';

// ─── C4 Nested Graph Builder ──────────────────────────────────────
// Produces a single ELK graph with compound nodes mirroring the
// C4 containment hierarchy (System → Container → Component).
// All edges are hoisted to root with INCLUDE_CHILDREN for
// hierarchical routing through compound boundaries.

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

    // Build parent→children map
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

    // Build ELK compound nodes
    const routing = options?.edgeRouting ?? 'ORTHOGONAL';
    const elkChildren = rootIds.map((id) =>
      buildElkNode(id, childrenOf, entityById, dims, zc, 0, routing),
    );

    // All edges at root level — ELK routes them through compound boundaries
    const elkEdges: ElkExtendedEdge[] = relationships
      .filter((r) => allIds.has(r.sourceId) && allIds.has(r.targetId))
      .map((r) => ({ id: r.id, sources: [r.sourceId], targets: [r.targetId] }));

    // Dynamic spacing: scale gaps based on node count
    const nodeCount = unlocked.length;
    const spacingScale = nodeCount > 50 ? 0.8 : nodeCount > 20 ? 0.9 : 1.0;

    return {
      root: {
        id: '__c4root__',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'DOWN',
          'elk.spacing.nodeNode': String(Math.round(zc.nestGap * spacingScale)),
          'elk.layered.spacing.nodeNodeBetweenLayers': String(Math.round(zc.laneGap * spacingScale)),
          'elk.edgeRouting': routing,
          'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
          'elk.padding': `[top=${zc.laneOuterPad},left=${zc.laneOuterPad},bottom=${zc.laneOuterPad},right=${zc.laneOuterPad}]`,
        },
        children: elkChildren,
        edges: elkEdges,
      },
    };
  }
}
