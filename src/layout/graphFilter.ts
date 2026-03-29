import type { ArchEntity, Relationship, NodePosition } from '../domain/types';

// ─── Graph Filter ─────────────────────────────────────────────────
// Separates locked/unlocked entities and prunes dangling edges.
// This is the first stage of the layout pipeline.

export interface FilteredGraph {
  /** Entities that need layout (unlocked). */
  unlocked: ArchEntity[];
  /** Locked positions keyed by entity ID. */
  locked: Map<string, NodePosition>;
  /** All entity IDs in the graph (locked + unlocked). */
  allIds: Set<string>;
  /** Entity lookup by ID (unlocked only). */
  entityById: Map<string, ArchEntity>;
  /** Relationships where both endpoints exist in allIds. */
  edges: Relationship[];
}

/**
 * Filter entities and relationships into a clean graph ready for ELK.
 *
 * - Separates locked (user-pinned) positions from unlocked entities
 * - Removes relationships whose source or target is not in the visible set
 */
export function filterGraph(
  entities: ArchEntity[],
  existingPositions: NodePosition[],
  relationships: Relationship[],
): FilteredGraph {
  const locked = new Map<string, NodePosition>();
  const unlocked: ArchEntity[] = [];

  for (const e of entities) {
    const pos = existingPositions.find((p) => p.entityId === e.id);
    if (pos?.locked) {
      locked.set(e.id, pos);
    } else {
      unlocked.push(e);
    }
  }

  const allIds = new Set(entities.map((e) => e.id));
  const entityById = new Map(unlocked.map((e) => [e.id, e]));

  // Only keep edges where both endpoints are visible
  const edges = relationships.filter(
    (r) => allIds.has(r.sourceId) && allIds.has(r.targetId),
  );

  return { unlocked, locked, allIds, entityById, edges };
}
