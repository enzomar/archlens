import type { NodePosition, Viewpoint } from '../domain/types';

// ─── Layout Types ─────────────────────────────────────────────────

export type LayoutStrategy = 'swimlane' | 'nested' | 'flat' | 'pure-layers';

/** 'c4-nested' = C4 nested containment; 'archimate-layered' = ArchiMate horizontal bands */
export type LayoutMode = 'c4-nested' | 'archimate-layered';

export interface EdgeRoute {
  relationshipId: string;
  points: Array<{ x: number; y: number }>;
}

/** Describes a containment box drawn on the canvas (system or container boundary). */
export interface ContainmentBox {
  entityId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  viewpoint: Viewpoint;
  depth: number; // 0 = system-level, 1 = container-level, …
}

export interface LayoutResult {
  positions: NodePosition[];
  edgeRoutes?: EdgeRoute[];
  strategy?: LayoutStrategy;
  /** Swimlane bands for background rendering */
  swimlanes?: Array<{ viewpoint: Viewpoint; x: number; y: number; width: number; height: number }>;
  /** Nested containment boxes (systems containing containers, etc.) */
  containmentBoxes?: ContainmentBox[];
  labelWidth?: number;
  orientation?: LayoutMode;
}
