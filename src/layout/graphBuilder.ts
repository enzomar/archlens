import type { ElkNode } from 'elkjs/lib/elk-api.js';
import type { ArchEntity, Relationship, Viewpoint, ZoomLevel } from '../domain/types';
import type { FilteredGraph } from './graphFilter';

// ─── GraphBuilder Interface ───────────────────────────────────────
// Each builder converts filtered domain data into an ELK graph.

export interface ElkGraph {
  root: ElkNode;
  /** Viewpoints that were laid out (for ArchiMate swimlane rendering). */
  viewpointRows?: Viewpoint[];
}

export interface GraphBuilder {
  build(
    graph: FilteredGraph,
    dims: Record<string, { width: number; height: number }>,
    relationships: Relationship[],
    zc: ZoomLayoutConfig,
    options?: GraphBuilderOptions,
  ): ElkGraph;
}

export interface GraphBuilderOptions {
  activeViewpoints?: Viewpoint[];
  activeZoomLevels?: ZoomLevel[];
  expandedEntityIds?: Set<string>;
  edgeRouting?: string;
  /** Prior canvas X per entityId — used by builders for spatial-continuity hints. */
  priorXMap?: Map<string, number>;
}

// ─── Shared entity kind → conceptual level ───────────────────────
// Lower = more inclusive = visually higher/earlier in every layout.
// Shared between C4 and ArchiMate builders for consistent ordering.
export const KIND_LEVEL: Partial<Record<string, number>> = {
  'stakeholder': 0, 'goal': 0, 'capability': 0, 'requirement': 0,
  'business-actor': 1, 'business-role': 1, 'business-process': 1,
  'business-service': 1, 'business-object': 1, 'business-event': 1,
  'business-interface': 1, 'contract': 1,
  'person': 2, 'system': 2,
  'container': 3, 'aimodel': 3, 'vectorstore': 3,
  'application-component': 3, 'application-service': 3,
  'application-function': 3, 'application-interface': 3,
  'application-process': 3, 'data-object': 3,
  'node': 3, 'device': 3, 'system-software': 3,
  'technology-service': 3, 'communication-network': 3,
  'technology-interface': 3,
  'component': 4, 'retriever': 4, 'evaluation': 4,
  'artifact': 5, 'trigger': 5,
};

/** ArchiMate viewpoint / C4 domain ordering (used for lane grouping). */
export const VP_ORDER: Record<string, number> = { business: 0, application: 1, technology: 2, global: 3 };

/** Horizontal spacing hint between sibling nodes in the same layer. */
export const LEVEL_X_STEP = 240;
/** Extra horizontal gap inserted between viewpoint clusters within a C4 level. */
export const VP_GAP = 480;

/**
 * Layout density multiplier: larger graphs need proportionally more
 * edge-to-node spacing so routes stay clear of node bodies.
 * Returns 1.0 for ≤10 nodes, scaling up to 1.5 at ≥80 nodes.
 */
export function layoutDensity(nodeCount: number): number {
  return Math.min(1.5, Math.max(1.0, 1.0 + Math.max(0, nodeCount - 10) * 0.007));
}

// ─── Shared Zoom-Level Config ─────────────────────────────────────
export interface ZoomLayoutConfig {
  nodeGapX: number;     // horizontal gap between sibling nodes
  nodeGapY: number;     // vertical gap between rows
  nestPad: number;      // padding inside a containment box
  nestHdr: number;      // header height for container/system label
  nestGap: number;      // gap between sibling boxes
  maxPerRow: number;    // max children per row (used for fallback sizing)
  lanePad: number;      // padding inside each swimlane
  laneGap: number;      // gap between swimlane rows
  laneMinH: number;     // minimum swimlane height
  laneOuterPad: number; // canvas margin
  maxNestDepth: number; // how many containment levels to draw as boxes
}

export const ZOOM_CONFIGS: Record<ZoomLevel | 'multi', ZoomLayoutConfig> = {
  context:   { nodeGapX: 48, nodeGapY: 36, nestPad: 24, nestHdr: 32, nestGap: 32, maxPerRow: 6, lanePad: 40, laneGap: 28, laneMinH: 160, laneOuterPad: 70, maxNestDepth: 0 },
  container: { nodeGapX: 36, nodeGapY: 28, nestPad: 20, nestHdr: 28, nestGap: 24, maxPerRow: 4, lanePad: 30, laneGap: 24, laneMinH: 140, laneOuterPad: 60, maxNestDepth: 1 },
  component: { nodeGapX: 28, nodeGapY: 22, nestPad: 16, nestHdr: 24, nestGap: 18, maxPerRow: 3, lanePad: 24, laneGap: 20, laneMinH: 120, laneOuterPad: 50, maxNestDepth: 2 },
  code:      { nodeGapX: 24, nodeGapY: 18, nestPad: 14, nestHdr: 22, nestGap: 16, maxPerRow: 3, lanePad: 20, laneGap: 16, laneMinH: 100, laneOuterPad: 40, maxNestDepth: 3 },
  multi:     { nodeGapX: 36, nodeGapY: 28, nestPad: 20, nestHdr: 28, nestGap: 24, maxPerRow: 4, lanePad: 30, laneGap: 24, laneMinH: 140, laneOuterPad: 60, maxNestDepth: 2 },
};

export function getZoomConfig(activeZoomLevels: ZoomLevel[]): ZoomLayoutConfig {
  if (activeZoomLevels.length === 0) return ZOOM_CONFIGS.multi;
  if (activeZoomLevels.length === 1) return ZOOM_CONFIGS[activeZoomLevels[0]];
  return ZOOM_CONFIGS.multi;
}

// ─── Shared ELK Node Builder ──────────────────────────────────────
/**
 * Recursively build an ELK node for `entityId`.
 * - Entities with children AND depth < maxNestDepth  → compound node
 * - Everything else                                  → leaf node (FIXED_SIZE)
 *
 * Used by both C4 and ArchiMate builders.
 */
export function buildElkNode(
  entityId: string,
  childrenOf: Map<string, string[]>,
  entityById: Map<string, ArchEntity>,
  dims: Record<string, { width: number; height: number }>,
  zc: ZoomLayoutConfig,
  depth: number,
  edgeRouting: string = 'ORTHOGONAL',
): ElkNode {
  const entity = entityById.get(entityId)!;
  const d = dims[entity.kind] ?? { width: 160, height: 80 };
  const kids = depth < zc.maxNestDepth ? (childrenOf.get(entityId) ?? []) : [];

  if (kids.length === 0) {
    return {
      id: entityId,
      width: d.width,
      height: d.height,
      layoutOptions: { 'elk.nodeSize.constraints': 'FIXED_SIZE' },
    };
  }

  // Compound node — ELK sizes it around its children.
  // NOTE: INCLUDE_CHILDREN is intentionally NOT set here — only the root
  // graph sets it.  This lets ELK solve each compound independently (fast)
  // while still routing cross-compound edges at the root level.
  const pad = zc.nestPad;
  const hdr = zc.nestHdr;
  return {
    id: entityId,
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.padding': `[top=${hdr + pad * 2},left=${pad * 2},bottom=${pad * 2},right=${pad * 2}]`,
      'elk.spacing.nodeNode': String(zc.nodeGapX),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(zc.nodeGapY),
      'elk.edgeRouting': edgeRouting,
      'elk.spacing.edgeNode': '25',
      'elk.spacing.edgeEdge': '15',
      'elk.layered.nodePlacement.favorStraightEdges': 'true',
      'elk.layered.unnecessaryBendpoints': 'true',
      'elk.nodeSize.constraints': 'FIXED_MINIMUM_SIZE',
      'elk.nodeSize.minimum': `(${d.width}, ${d.height})`,
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.randomSeed': '1',
    },
    children: kids.map((cid) => buildElkNode(cid, childrenOf, entityById, dims, zc, depth + 1, edgeRouting)),
  };
}
