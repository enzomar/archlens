import type { EntityKind, Viewpoint, ZoomLevel } from './core';

// ─── KIND MATRIX (SOURCE OF TRUTH) ───────────────────────────────

export interface KindMatrixEntry {
  kind: EntityKind;
  level: ZoomLevel;
  viewpoints: Viewpoint[];
  category: 'core' | 'ai' | 'support';
}

export const KIND_MATRIX: KindMatrixEntry[] = [
  // ───────────────────────────────────────────────
  // SYSTEM / CONTEXT LEVEL
  // ───────────────────────────────────────────────
  { kind: 'person',      level: 'context',   viewpoints: ['business'],                         category: 'core' },
  { kind: 'system',      level: 'context',   viewpoints: ['application'],                      category: 'core' },
  { kind: 'trigger',     level: 'context',   viewpoints: ['business', 'application', 'technology'], category: 'support' },

  // ArchiMate Business — Context
  { kind: 'business-actor',   level: 'context',   viewpoints: ['business'],                    category: 'core' },
  { kind: 'business-role',    level: 'context',   viewpoints: ['business'],                    category: 'core' },
  { kind: 'business-event',   level: 'context',   viewpoints: ['business'],                    category: 'core' },

  // ArchiMate Strategy / Motivation — Context
  { kind: 'capability',       level: 'context',   viewpoints: ['business'],                    category: 'core' },
  { kind: 'stakeholder',      level: 'context',   viewpoints: ['business'],                    category: 'core' },
  { kind: 'goal',             level: 'context',   viewpoints: ['business'],                    category: 'core' },

  // ───────────────────────────────────────────────
  // CONTAINER LEVEL
  // ───────────────────────────────────────────────
  { kind: 'container',   level: 'container', viewpoints: ['application', 'technology'],        category: 'core' },
  { kind: 'aimodel',     level: 'container', viewpoints: ['application', 'technology'],        category: 'ai' },
  { kind: 'vectorstore', level: 'container', viewpoints: ['technology'],                       category: 'ai' },

  // ArchiMate Business — Container
  { kind: 'business-process', level: 'container', viewpoints: ['business'],                    category: 'core' },
  { kind: 'business-service', level: 'container', viewpoints: ['business'],                    category: 'core' },

  // ArchiMate Application — Container
  { kind: 'application-component', level: 'container', viewpoints: ['application'],            category: 'core' },
  { kind: 'application-service',   level: 'container', viewpoints: ['application'],            category: 'core' },
  { kind: 'application-process',   level: 'container', viewpoints: ['application'],            category: 'core' },

  // ArchiMate Technology — Container
  { kind: 'node',                  level: 'container', viewpoints: ['technology'],             category: 'core' },
  { kind: 'device',                level: 'container', viewpoints: ['technology'],             category: 'core' },
  { kind: 'system-software',       level: 'container', viewpoints: ['technology'],             category: 'core' },
  { kind: 'technology-service',    level: 'container', viewpoints: ['technology'],             category: 'core' },
  { kind: 'communication-network', level: 'container', viewpoints: ['technology'],             category: 'core' },

  // ───────────────────────────────────────────────
  // COMPONENT LEVEL
  // ───────────────────────────────────────────────
  { kind: 'component',   level: 'component', viewpoints: ['application', 'technology'],        category: 'core' },
  { kind: 'retriever',   level: 'component', viewpoints: ['application', 'technology'],        category: 'ai' },
  { kind: 'evaluation',  level: 'component', viewpoints: ['business', 'application'],          category: 'ai' },
  { kind: 'artifact',    level: 'component', viewpoints: ['application', 'technology'],        category: 'support' },

  // ArchiMate Business — Component
  { kind: 'business-object',    level: 'component', viewpoints: ['business'],                  category: 'core' },
  { kind: 'business-interface', level: 'component', viewpoints: ['business'],                  category: 'core' },
  { kind: 'contract',           level: 'component', viewpoints: ['business'],                  category: 'core' },

  // ArchiMate Application — Component
  { kind: 'application-function',  level: 'component', viewpoints: ['application'],            category: 'core' },
  { kind: 'application-interface', level: 'component', viewpoints: ['application'],            category: 'core' },
  { kind: 'data-object',          level: 'component', viewpoints: ['application', 'technology'], category: 'core' },

  // ArchiMate Technology — Component
  { kind: 'technology-interface',  level: 'component', viewpoints: ['technology'],             category: 'core' },

  // ArchiMate Motivation — Component
  { kind: 'requirement',          level: 'component', viewpoints: ['business', 'application'], category: 'core' },
];


/**
 * Returns the entity kinds that are valid for a given (viewpoint, level) pair.
 */
export function getKindsForViewpointLevel(viewpoint: Viewpoint, level: ZoomLevel): EntityKind[] {
  const kinds: EntityKind[] = [];
  for (const entry of KIND_MATRIX) {
    if (viewpoint !== 'global' && !entry.viewpoints.includes(viewpoint)) continue;
    // Support kinds are shown at their own level AND all deeper levels
    // (e.g. trigger at context shows at context+container+component;
    //  artifact at component only shows at component level)
    if (entry.category === 'support') {
      const levelDepth: Record<ZoomLevel, number> = { context: 0, container: 1, component: 2, code: 3 };
      if (levelDepth[level] >= levelDepth[entry.level]) {
        kinds.push(entry.kind);
      }
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
// Derived from KIND_MATRIX — single source of truth.

export const KIND_TO_ZOOM: Record<EntityKind, ZoomLevel> = Object.fromEntries(
  KIND_MATRIX.map((e) => [e.kind, e.level]),
) as Record<EntityKind, ZoomLevel>;

export const DRILLABLE_KINDS: Partial<Record<EntityKind, ZoomLevel>> = {
  system: 'container',
  container: 'component',
  component: 'code',
  aimodel: 'component',
  'application-component': 'component',
  node: 'component',
  'business-process': 'component',
};

// ─── ZOOM LEVEL → VALID ENTITY KINDS ───────────────────────────

export const ZOOM_VISIBLE_KINDS: Record<ZoomLevel, EntityKind[]> = {
  context:   [
    'person', 'system', 'trigger', 'artifact',
    'business-actor', 'business-role', 'business-event',
    'capability', 'stakeholder', 'goal',
  ],
  container: [
    'person', 'system', 'container', 'trigger', 'artifact', 'aimodel', 'vectorstore',
    'business-actor', 'business-role', 'business-event', 'capability', 'stakeholder', 'goal',
    'business-process', 'business-service',
    'application-component', 'application-service', 'application-process',
    'node', 'device', 'system-software', 'technology-service', 'communication-network',
  ],
  component: [
    'person', 'container', 'component', 'trigger', 'artifact', 'retriever', 'evaluation',
    'business-process', 'business-service',
    'application-component', 'application-service', 'application-process',
    'node', 'device', 'system-software', 'technology-service', 'communication-network',
    'business-object', 'business-interface', 'contract',
    'application-function', 'application-interface', 'data-object',
    'technology-interface', 'requirement',
  ],
  code:      ['component', 'artifact'],
};
