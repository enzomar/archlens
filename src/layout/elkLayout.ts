// ─── ELK Layout Engine (Orchestrator) ─────────────────────────────
// Single public API layering: Filter → Build → ELK.layout → Render.
//
// ELK is the ONLY source of truth for all layout computation.
// No custom Sugiyama, tree, or grid logic.
// ─────────────────────────────────────────────────────────────────
import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode } from 'elkjs/lib/elk-api.js';
import type {
  ArchEntity,
  Relationship,
  NodePosition,
  NodeDisplayMode,
  Viewpoint,
  ZoomLevel,
} from '../domain/types';
import { NODE_DIMENSIONS, NODE_DIMENSIONS_EXTENDED } from '../domain/types';
import type { LayoutResult, ContainmentBox, EdgeRoute, LayoutMode } from './types';
import { filterGraph } from './graphFilter';
import { getZoomConfig } from './graphBuilder';
import type { GraphBuilder } from './graphBuilder';
import { C4NestedGraphBuilder } from './c4GraphBuilder';
import { ArchiMateLayeredGraphBuilder, LANE_LABEL_W } from './archiGraphBuilder';

// ─── ELK singleton ────────────────────────────────────────────────
const elk = new ELK();

// ─── Builder registry ─────────────────────────────────────────────
const builders: Record<LayoutMode, GraphBuilder> = {
  'c4-nested': new C4NestedGraphBuilder(),
  'archimate-layered': new ArchiMateLayeredGraphBuilder(),
};

// ─── Result extraction helpers ────────────────────────────────────

/**
 * Traverse the laid-out ELK subtree, collecting:
 * - Leaf nodes      → positions (absolute canvas coordinates)
 * - Compound nodes  → containmentBoxes
 */
function extractFromElkNode(
  node: ElkNode,
  absX: number,
  absY: number,
  entityById: Map<string, ArchEntity>,
  positions: NodePosition[],
  containmentBoxes: ContainmentBox[],
  posMap: Map<string, { x: number; y: number; width: number; height: number }>,
  depth: number,
): void {
  const x = absX + (node.x ?? 0);
  const y = absY + (node.y ?? 0);
  const w = node.width ?? 0;
  const h = node.height ?? 0;

  posMap.set(node.id, { x, y, width: w, height: h });

  if ((node.children?.length ?? 0) > 0) {
    const entity = entityById.get(node.id);
    if (entity) {
      containmentBoxes.push({
        entityId: node.id,
        label: entity.name,
        x, y, width: w, height: h,
        viewpoint: entity.viewpoint,
        depth,
      });
    }
    for (const child of node.children!) {
      extractFromElkNode(child, x, y, entityById, positions, containmentBoxes, posMap, depth + 1);
    }
  } else {
    positions.push({ entityId: node.id, x, y, locked: false });
  }
}

/**
 * Walk ELK nodes collecting edge sections (bend-point polylines).
 */
function extractEdgeRoutes(
  node: ElkNode,
  absX: number,
  absY: number,
  edgeRoutes: EdgeRoute[],
  seenEdgeIds: Set<string>,
): void {
  for (const edge of node.edges ?? []) {
    if (seenEdgeIds.has(edge.id)) continue;
    seenEdgeIds.add(edge.id);
    const sections = edge.sections ?? [];
    if (sections.length === 0) continue;
    const s = sections[0];
    const pts = [
      { x: s.startPoint.x + absX, y: s.startPoint.y + absY },
      ...(s.bendPoints ?? []).map((p) => ({ x: p.x + absX, y: p.y + absY })),
      { x: s.endPoint.x + absX, y: s.endPoint.y + absY },
    ];
    edgeRoutes.push({ relationshipId: edge.id, points: pts });
  }
  for (const child of node.children ?? []) {
    extractEdgeRoutes(
      child,
      absX + (child.x ?? 0),
      absY + (child.y ?? 0),
      edgeRoutes,
      seenEdgeIds,
    );
  }
}

/**
 * Orthogonal fallback routing for edges not routed by ELK
 * (cross-viewpoint edges in ArchiMate mode).
 */
function routeOrthogonal(
  relationships: Relationship[],
  posMap: Map<string, { x: number; y: number; width: number; height: number }>,
  visibleIds: Set<string>,
  elkRoutedIds: Set<string>,
): EdgeRoute[] {
  const routes: EdgeRoute[] = [];
  for (const rel of relationships) {
    if (elkRoutedIds.has(rel.id)) continue;
    if (!visibleIds.has(rel.sourceId) || !visibleIds.has(rel.targetId)) continue;
    const src = posMap.get(rel.sourceId);
    const tgt = posMap.get(rel.targetId);
    if (!src || !tgt) continue;
    const srcCX = src.x + src.width / 2;
    const srcCY = src.y + src.height / 2;
    const tgtCX = tgt.x + tgt.width / 2;
    const tgtCY = tgt.y + tgt.height / 2;
    if (Math.abs(tgtCY - srcCY) >= Math.abs(tgtCX - srcCX)) {
      const sy = srcCY < tgtCY ? src.y + src.height : src.y;
      const ty = srcCY < tgtCY ? tgt.y : tgt.y + tgt.height;
      const midY = (sy + ty) / 2;
      routes.push({ relationshipId: rel.id, points: [{ x: srcCX, y: sy }, { x: srcCX, y: midY }, { x: tgtCX, y: midY }, { x: tgtCX, y: ty }] });
    } else {
      const sx = srcCX < tgtCX ? src.x + src.width : src.x;
      const tx = srcCX < tgtCX ? tgt.x : tgt.x + tgt.width;
      const midX = (sx + tx) / 2;
      routes.push({ relationshipId: rel.id, points: [{ x: sx, y: srcCY }, { x: midX, y: srcCY }, { x: midX, y: tgtCY }, { x: tx, y: tgtCY }] });
    }
  }
  return routes;
}

// ─── C4 result assembly ───────────────────────────────────────────
function assembleC4Result(
  elkResult: ElkNode,
  graph: ReturnType<typeof filterGraph>,
): LayoutResult {
  const positions: NodePosition[] = [...graph.locked.values()];
  const containmentBoxes: ContainmentBox[] = [];
  const posMap = new Map<string, { x: number; y: number; width: number; height: number }>();
  const edgeRoutes: EdgeRoute[] = [];

  for (const child of elkResult.children ?? []) {
    extractFromElkNode(child, 0, 0, graph.entityById, positions, containmentBoxes, posMap, 0);
  }
  extractEdgeRoutes(elkResult, 0, 0, edgeRoutes, new Set<string>());

  // Swimlane metadata: one band per top-level compound node
  const swimlanes = (elkResult.children ?? [])
    .filter((n) => (n.children?.length ?? 0) > 0)
    .map((n) => {
      const entity = graph.entityById.get(n.id);
      return {
        viewpoint: entity?.viewpoint ?? ('application' as Viewpoint),
        x: n.x ?? 0,
        y: n.y ?? 0,
        width: n.width ?? 0,
        height: n.height ?? 0,
      };
    });

  return {
    positions,
    edgeRoutes,
    strategy: 'nested',
    swimlanes: swimlanes.length > 0 ? swimlanes : undefined,
    containmentBoxes,
    labelWidth: 0,
    orientation: 'c4-nested',
  };
}

// ─── ArchiMate result assembly ────────────────────────────────────
function assembleArchiMateResult(
  elkResult: ElkNode,
  graph: ReturnType<typeof filterGraph>,
  relationships: Relationship[],
  viewpointRows: Viewpoint[],
): LayoutResult {
  const positions: NodePosition[] = [...graph.locked.values()];
  const containmentBoxes: ContainmentBox[] = [];
  const posMap = new Map<string, { x: number; y: number; width: number; height: number }>();
  const edgeRoutes: EdgeRoute[] = [];
  const seenEdgeIds = new Set<string>();

  // Each child of the root is a swimlane band
  const swimlanes: Array<{ viewpoint: Viewpoint; x: number; y: number; width: number; height: number }> = [];

  for (let i = 0; i < (elkResult.children?.length ?? 0); i++) {
    const bandNode = elkResult.children![i];
    const vp = viewpointRows[i] ?? ('application' as Viewpoint);
    const bx = (bandNode.x ?? 0);
    const by = (bandNode.y ?? 0);
    const bw = bandNode.width ?? 0;
    const bh = bandNode.height ?? 0;

    swimlanes.push({ viewpoint: vp, x: bx, y: by, width: bw, height: bh });

    // Extract nodes from this band
    for (const child of bandNode.children ?? []) {
      extractFromElkNode(child, bx, by, graph.entityById, positions, containmentBoxes, posMap, 0);
    }

    // Extract intra-band edge routes
    extractEdgeRoutes(bandNode, bx, by, edgeRoutes, seenEdgeIds);
  }

  // Extract root-level edge routes (cross-viewpoint)
  extractEdgeRoutes(elkResult, 0, 0, edgeRoutes, seenEdgeIds);

  // Fallback routing for any remaining unrouted edges
  const fallbackRoutes = routeOrthogonal(relationships, posMap, graph.allIds, seenEdgeIds);
  edgeRoutes.push(...fallbackRoutes);

  return {
    positions,
    edgeRoutes,
    strategy: 'swimlane',
    swimlanes,
    containmentBoxes,
    labelWidth: LANE_LABEL_W,
    orientation: 'archimate-layered',
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Compute layout using ELK as the single backend.
 *
 * Pipeline: Filter → Build → ELK.layout → Assemble Result
 */
export async function computeElkLayout(
  entities: ArchEntity[],
  existingPositions: NodePosition[],
  displayMode: NodeDisplayMode = 'standard',
  relationships: Relationship[] = [],
  activeViewpoints: Viewpoint[] = [],
  activeZoomLevels: ZoomLevel[] = [],
  orientation: LayoutMode = 'archimate-layered',
  edgeRouting: string = 'ORTHOGONAL',
): Promise<LayoutResult> {
  if (entities.length === 0) {
    return { positions: existingPositions.filter((p) => p.locked) };
  }

  const dims = displayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;
  const zc = getZoomConfig(activeZoomLevels);

  // 1. Filter
  const graph = filterGraph(entities, existingPositions, relationships);
  if (graph.unlocked.length === 0) {
    return { positions: [...graph.locked.values()], orientation };
  }

  // 2. Build ELK graph
  const builder = builders[orientation];
  const elkGraph = builder.build(graph, dims, relationships, zc, {
    activeViewpoints,
    activeZoomLevels,
    edgeRouting,
  });

  // 3. Run ELK
  const elkResult = await elk.layout(elkGraph.root);

  // 4. Assemble result
  if (orientation === 'c4-nested') {
    return assembleC4Result(elkResult, graph);
  }
  return assembleArchiMateResult(elkResult, graph, relationships, elkGraph.viewpointRows ?? []);
}

/**
 * Center the layout around a specific entity.
 */
export function centerOnEntity(
  entityId: string,
  positions: NodePosition[],
  entities: ArchEntity[],
  viewportWidth: number,
  viewportHeight: number,
): { panX: number; panY: number } {
  const pos = positions.find((p) => p.entityId === entityId);
  const entity = entities.find((e) => e.id === entityId);
  if (!pos || !entity) return { panX: 0, panY: 0 };
  const dims = NODE_DIMENSIONS[entity.kind];
  const centerX = pos.x + dims.width / 2;
  const centerY = pos.y + dims.height / 2;
  return {
    panX: viewportWidth / 2 - centerX,
    panY: viewportHeight / 2 - centerY,
  };
}

// Re-export types for backward compatibility
export type { LayoutResult, ContainmentBox, EdgeRoute, LayoutMode, LayoutStrategy } from './types';
