import type { EntityKind, Viewpoint, ZoomLevel } from './core';

// ─── KIND MATRIX (SOURCE OF TRUTH) ───────────────────────────────

export interface KindMatrixEntry {
  kind: EntityKind;
  level: ZoomLevel;
  viewpoints: Viewpoint[];
  category: 'core' | 'ai' | 'support';
}

export const KIND_MATRIX: KindMatrixEntry[] = [
  // ── System Level ──
  { kind: 'person',      level: 'context',   viewpoints: ['business'],                   category: 'core' },
  { kind: 'system',      level: 'context',   viewpoints: ['application'],                category: 'core' },
  // ── Container Level ──
  { kind: 'container',   level: 'container',  viewpoints: ['application', 'technical'],  category: 'core' },
  { kind: 'aimodel',     level: 'container',  viewpoints: ['application', 'technical'],  category: 'ai' },
  { kind: 'vectorstore', level: 'container',  viewpoints: ['technical'],                 category: 'ai' },
  // ── Component Level ──
  { kind: 'component',   level: 'component',  viewpoints: ['application', 'technical'],  category: 'core' },
  { kind: 'retriever',   level: 'component',  viewpoints: ['application', 'technical'],  category: 'ai' },
  { kind: 'evaluation',  level: 'component',  viewpoints: ['application', 'business'],   category: 'ai' },
  // ── Cross-Level Support ──
  { kind: 'trigger',     level: 'context',   viewpoints: ['business', 'application', 'technical'], category: 'support' },
  { kind: 'artifact',    level: 'component', viewpoints: ['application', 'technical'],   category: 'support' },
];

/**
 * Returns the entity kinds that are valid for a given (viewpoint, level) pair.
 */
export function getKindsForViewpointLevel(viewpoint: Viewpoint, level: ZoomLevel): EntityKind[] {
  const kinds: EntityKind[] = [];
  for (const entry of KIND_MATRIX) {
    if (viewpoint !== 'global' && !entry.viewpoints.includes(viewpoint)) continue;
    if (entry.category === 'support') {
      kinds.push(entry.kind);
    } else if (entry.level === level) {
      kinds.push(entry.kind);
    }
  }
  return kinds;
}

/**
 * Returns ALL viewpoints in which the given kind is allowed at the given level.
 */
export function getViewpointsForKindLevel(kind: EntityKind, level: ZoomLevel): Viewpoint[] {
  for (const entry of KIND_MATRIX) {
    if (entry.kind === kind) {
      if (entry.category === 'support' || entry.level === level) {
        return entry.viewpoints;
      }
    }
  }
  return [];
}

/**
 * Returns the default viewpoint for a kind.
 */
export function inferViewpoint(kind: EntityKind): Viewpoint {
  const entry = KIND_MATRIX.find((e) => e.kind === kind);
  if (!entry) return 'application';
  if (entry.viewpoints.includes('application')) return 'application';
  return entry.viewpoints[0];
}

// ─── ENTITY KIND → ZOOM LEVEL MAPPING ────────────────────────────

export const KIND_TO_ZOOM: Record<EntityKind, ZoomLevel> = {
  person: 'context',
  system: 'context',
  container: 'container',
  component: 'component',
  artifact: 'component',
  trigger: 'context',
  aimodel: 'container',
  vectorstore: 'container',
  retriever: 'component',
  evaluation: 'component',
};

export const DRILLABLE_KINDS: Partial<Record<EntityKind, ZoomLevel>> = {
  system: 'container',
  container: 'component',
  component: 'code',
  aimodel: 'component',
};

// ─── ZOOM LEVEL → VALID ENTITY KINDS ───────────────────────────

export const ZOOM_VISIBLE_KINDS: Record<ZoomLevel, EntityKind[]> = {
  context:   ['person', 'system', 'trigger', 'artifact'],
  container: ['person', 'system', 'container', 'trigger', 'artifact', 'aimodel', 'vectorstore'],
  component: ['person', 'container', 'component', 'trigger', 'artifact', 'retriever', 'evaluation'],
  code:      ['component', 'artifact'],
};
