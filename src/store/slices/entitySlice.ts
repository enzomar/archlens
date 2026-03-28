import { v4 as uuid } from 'uuid';
import type { ArchEntity, Relationship, TraceabilityType } from '../../domain/types';
import type { StoreSet, StoreGet } from '../storeTypes';

export const createEntitySlice = (set: StoreSet, get: StoreGet) => ({
  entities: [] as ArchEntity[],
  relationships: [] as Relationship[],
  positions: [] as { entityId: string; x: number; y: number; locked: boolean }[],
  traceabilityLinks: [] as { id: string; sourceId: string; targetId: string; type: TraceabilityType; label?: string }[],
  showListView: false,

  // ── Entity CRUD ─────────────────────────────────────────────

  addEntity: (entity: Omit<ArchEntity, 'id'>) => {
    const id = uuid();
    const newEntity: ArchEntity = { ...entity, id };
    set((s) => ({ entities: [...s.entities, newEntity] }));
    get().addLogEntry('info', `Entity created: "${entity.name}" [${entity.kind}]`);
    return id;
  },

  updateEntity: (id: string, updates: Partial<ArchEntity>) => {
    const name = get().entities.find((e) => e.id === id)?.name ?? id;
    set((s) => ({
      entities: s.entities.map((e) => (e.id === id ? { ...e, ...updates, id } : e)),
    }));
    get().addLogEntry('debug', `Entity updated: "${name}"`);
  },

  deleteEntity: (id: string) => {
    const name = get().entities.find((e) => e.id === id)?.name ?? id;
    set((s) => ({
      entities: s.entities.filter((e) => e.id !== id),
      relationships: s.relationships.filter((r) => r.sourceId !== id && r.targetId !== id),
      positions: s.positions.filter((p) => p.entityId !== id),
      selectedEntityId: s.selectedEntityId === id ? null : s.selectedEntityId,
    }));
    get().addLogEntry('warn', `Entity deleted: "${name}"`);
  },

  duplicateEntity: (id: string) => {
    const state = get();
    const entity = state.entities.find((e) => e.id === id);
    if (!entity) return null;
    const { id: _oldId, ...rest } = entity;
    const newId = uuid();
    const clone: ArchEntity = {
      ...rest,
      id: newId,
      name: `${entity.name} (Copy)`,
      shortName: `${entity.shortName}-copy`,
    };
    set((s) => ({ entities: [...s.entities, clone] }));
    get().addLogEntry('info', `Entity duplicated: "${entity.name}" → "${clone.name}"`);
    return newId;
  },

  toggleListView: () => set((s) => ({ showListView: !s.showListView })),

  // ── Relationship CRUD ───────────────────────────────────────

  addRelationship: (rel: Omit<Relationship, 'id'>) => {
    const id = uuid();
    set((s) => ({ relationships: [...s.relationships, { ...rel, id }] }));
    get().addLogEntry('info', `Relationship created: "${rel.label || '(unlabeled)'}" [${rel.type}]`);
    return id;
  },

  updateRelationship: (id: string, updates: Partial<Relationship>) => {
    set((s) => ({
      relationships: s.relationships.map((r) => (r.id === id ? { ...r, ...updates, id } : r)),
    }));
    get().addLogEntry('debug', `Relationship updated`);
  },

  deleteRelationship: (id: string) => {
    const label = get().relationships.find((r) => r.id === id)?.label ?? id;
    set((s) => ({
      relationships: s.relationships.filter((r) => r.id !== id),
      selectedRelationshipId: s.selectedRelationshipId === id ? null : s.selectedRelationshipId,
    }));
    get().addLogEntry('warn', `Relationship deleted: "${label || '(unlabeled)'}"`);
  },

  // ── Position ────────────────────────────────────────────────

  setPosition: (entityId: string, x: number, y: number) => {
    set((s) => {
      const existing = s.positions.find((p) => p.entityId === entityId);
      if (existing) {
        if (existing.locked) return s;
        return {
          positions: s.positions.map((p) =>
            p.entityId === entityId ? { ...p, x, y } : p
          ),
        };
      }
      return { positions: [...s.positions, { entityId, x, y, locked: false }] };
    });
  },

  lockPosition: (entityId: string, locked: boolean) => {
    set((s) => ({
      positions: s.positions.map((p) =>
        p.entityId === entityId ? { ...p, locked } : p
      ),
    }));
  },

  // ── Traceability Links ──────────────────────────────────────

  addTraceabilityLink: (sourceId: string, targetId: string, type: TraceabilityType, label?: string) => {
    const id = uuid();
    set((s) => ({
      traceabilityLinks: [...s.traceabilityLinks, { id, sourceId, targetId, type, label }],
    }));
    get().addLogEntry('info', `Traceability link created: ${type}`);
    return id;
  },

  deleteTraceabilityLink: (id: string) => {
    set((s) => ({
      traceabilityLinks: s.traceabilityLinks.filter((l) => l.id !== id),
    }));
    get().addLogEntry('warn', `Traceability link deleted`);
  },
});
