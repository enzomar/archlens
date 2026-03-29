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

  // Compound node — ELK sizes it around its children
  const pad = zc.nestPad;
  const hdr = zc.nestHdr;
  return {
    id: entityId,
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.padding': `[top=${hdr + pad},left=${pad},bottom=${pad},right=${pad}]`,
      'elk.spacing.nodeNode': String(zc.nodeGapX),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(zc.nodeGapY),
      'elk.edgeRouting': edgeRouting,
      'elk.nodeSize.constraints': 'FIXED_MINIMUM_SIZE',
      'elk.nodeSize.minimum': `(${d.width}, ${d.height})`,
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    },
    children: kids.map((cid) => buildElkNode(cid, childrenOf, entityById, dims, zc, depth + 1, edgeRouting)),
  };
}
