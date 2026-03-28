import type { ArchEntity, Relationship } from '../domain/types';

export interface ValidationError {
  type: 'error' | 'warning';
  entityId?: string;
  relationshipId?: string;
  message: string;
}

/**
 * Validate the entire model and return a list of errors/warnings.
 */
export function validateModel(
  entities: ArchEntity[],
  relationships: Relationship[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  // 1. Each component must belong to exactly one container
  const components = entities.filter((e) => e.kind === 'component');
  for (const comp of components) {
    if (!comp.parentId) {
      errors.push({
        type: 'error',
        entityId: comp.id,
        message: `Component "${comp.name}" must belong to a container (no parent set).`,
      });
    } else {
      const parent = entityMap.get(comp.parentId);
      if (parent && parent.kind !== 'container') {
        errors.push({
          type: 'error',
          entityId: comp.id,
          message: `Component "${comp.name}" parent must be a container, but is "${parent.kind}".`,
        });
      }
    }
  }

  // 2. Each container must belong to a system
  const containers = entities.filter((e) => e.kind === 'container');
  for (const cont of containers) {
    if (!cont.parentId) {
      errors.push({
        type: 'warning',
        entityId: cont.id,
        message: `Container "${cont.name}" has no parent system.`,
      });
    } else {
      const parent = entityMap.get(cont.parentId);
      if (parent && parent.kind !== 'system') {
        errors.push({
          type: 'error',
          entityId: cont.id,
          message: `Container "${cont.name}" parent must be a system, but is "${parent.kind}".`,
        });
      }
    }
  }

  // 3. No self-referencing relationships
  for (const rel of relationships) {
    if (rel.sourceId === rel.targetId) {
      errors.push({
        type: 'error',
        relationshipId: rel.id,
        message: `Relationship "${rel.label}" is self-referencing.`,
      });
    }
  }

  // 4. Relationship targets must exist
  for (const rel of relationships) {
    if (!entityMap.has(rel.sourceId)) {
      errors.push({
        type: 'error',
        relationshipId: rel.id,
        message: `Relationship "${rel.label}" references non-existent source.`,
      });
    }
    if (!entityMap.has(rel.targetId)) {
      errors.push({
        type: 'error',
        relationshipId: rel.id,
        message: `Relationship "${rel.label}" references non-existent target.`,
      });
    }
  }

  // 5. Entity must have a name
  for (const entity of entities) {
    if (!entity.name.trim()) {
      errors.push({
        type: 'error',
        entityId: entity.id,
        message: `Entity has an empty name.`,
      });
    }
  }

  // 6. Warn about orphan entities (no relationships)
  const connectedIds = new Set<string>();
  for (const rel of relationships) {
    connectedIds.add(rel.sourceId);
    connectedIds.add(rel.targetId);
  }
  for (const entity of entities) {
    if (!connectedIds.has(entity.id) && entity.kind !== 'person') {
      errors.push({
        type: 'warning',
        entityId: entity.id,
        message: `"${entity.name}" has no relationships.`,
      });
    }
  }

  return errors;
}
