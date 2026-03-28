import { v4 as uuid } from 'uuid';
import type { ViewFilters, VisualConfig, ThemeMode } from '../../domain/types';
import { computeLayout } from '../../layout/layoutEngine';
import type { StoreSet, StoreGet, LogEntry } from '../storeTypes';
import { DEFAULT_VISUAL_CONFIG } from '../storeTypes';

export const createUiSlice = (set: StoreSet, get: StoreGet) => ({
  selectedEntityId: null as string | null,
  selectedRelationshipId: null as string | null,
  selectedEntityIds: new Set<string>(),
  showEntityForm: false,
  showRelationshipForm: false,
  showExportPanel: false,
  editingEntityId: null as string | null,
  editingRelationshipId: null as string | null,
  prefillRelSourceId: null as string | null,
  prefillRelTargetId: null as string | null,
  filters: {} as ViewFilters,
  visualConfig: { ...DEFAULT_VISUAL_CONFIG } as VisualConfig,
  panX: 0,
  panY: 0,
  scale: 1,

  theme: 'system' as ThemeMode,
  rightSidebarOpen: true,
  leftSidebarOpen: false,
  logPanelOpen: false,
  logEntries: [] as LogEntry[],
  manualLayout: false,
  uiMode: 'normal' as 'normal' | 'distraction-free' | 'presentation',

  selectedNoteId: null as string | null,
  selectedBoundaryId: null as string | null,
  showNoteForm: false,
  editingNoteId: null as string | null,
  showBoundaryForm: false,
  editingBoundaryId: null as string | null,

  // ── Selection ───────────────────────────────────────────────

  selectEntity: (id: string | null) => set({ selectedEntityId: id, selectedEntityIds: new Set<string>(), selectedRelationshipId: null, selectedNoteId: null, selectedBoundaryId: null }),

  selectRelationship: (id: string | null) => set({ selectedRelationshipId: id, selectedEntityId: null, selectedEntityIds: new Set<string>(), selectedNoteId: null, selectedBoundaryId: null }),

  toggleSelectEntity: (id: string) => {
    const s = get();
    const next = new Set(s.selectedEntityIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selectedEntityIds: next, selectedEntityId: next.size === 1 ? [...next][0] : null, selectedRelationshipId: null, selectedNoteId: null, selectedBoundaryId: null });
  },
  selectEntities: (ids: string[]) => set({ selectedEntityIds: new Set(ids), selectedEntityId: ids.length === 1 ? ids[0] : null, selectedRelationshipId: null, selectedNoteId: null, selectedBoundaryId: null }),
  clearMultiSelect: () => set({ selectedEntityIds: new Set<string>() }),
  deleteSelectedEntities: () => {
    const s = get();
    const ids = s.selectedEntityIds;
    if (ids.size === 0) return;
    const newEntities = s.entities.filter((e) => !ids.has(e.id));
    const newRels = s.relationships.filter((r) => !ids.has(r.sourceId) && !ids.has(r.targetId));
    const newPositions = s.positions.filter((p) => !ids.has(p.entityId));
    set({ entities: newEntities, relationships: newRels, positions: newPositions, selectedEntityIds: new Set<string>(), selectedEntityId: null });
  },

  selectNote: (id: string | null) => set({ selectedNoteId: id, selectedEntityId: null, selectedRelationshipId: null, selectedBoundaryId: null }),
  selectBoundary: (id: string | null) => set({ selectedBoundaryId: id, selectedEntityId: null, selectedRelationshipId: null, selectedNoteId: null }),

  // ── Form toggles ───────────────────────────────────────────

  setShowEntityForm: (show: boolean, editId: string | null = null) =>
    set({ showEntityForm: show, editingEntityId: editId }),

  setShowRelationshipForm: (show: boolean, editId: string | null = null) =>
    set({ showRelationshipForm: show, editingRelationshipId: editId }),

  openNewRelationship: (sourceId: string | null = null, targetId: string | null = null) =>
    set({
      showRelationshipForm: true,
      editingRelationshipId: null,
      prefillRelSourceId: sourceId ?? null,
      prefillRelTargetId: targetId ?? null,
    }),

  setShowExportPanel: (show: boolean) => set({ showExportPanel: show }),
  setShowNoteForm: (show: boolean, editId: string | null = null) => set({ showNoteForm: show, editingNoteId: editId }),
  setShowBoundaryForm: (show: boolean, editId: string | null = null) => set({ showBoundaryForm: show, editingBoundaryId: editId }),

  // ── Filters & Visual ───────────────────────────────────────

  setFilters: (filters: ViewFilters) => set({ filters }),
  setVisualConfig: (config: VisualConfig) => set({ visualConfig: config }),
  setPan: (x: number, y: number) => set({ panX: x, panY: y }),
  setScale: (s: number) => set({ scale: Math.max(0.1, Math.min(4, s)) }),

  // ── Theme ───────────────────────────────────────────────────

  setTheme: (theme: ThemeMode) => {
    set({ theme });
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  },

  setProjectName: (name: string) => set({ projectName: name }),

  // ── Sidebars ────────────────────────────────────────────────

  toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),

  // ── Log panel ───────────────────────────────────────────────

  toggleLogPanel: () => set((s) => ({ logPanelOpen: !s.logPanelOpen })),

  addLogEntry: (level: LogEntry['level'], message: string) => {
    const entry: LogEntry = { id: uuid(), timestamp: Date.now(), level, message };
    set((s) => ({ logEntries: [...s.logEntries, entry] }));
  },

  clearLog: () => set({ logEntries: [] }),

  // ── Layout & Mode ──────────────────────────────────────────

  autoLayout: () => {
    const s = get();
    const visible = s.getVisibleEntities();
    const visibleRels = s.getVisibleRelationships();

    const childParentIds = new Set<string>();
    for (const e of visible) {
      if (e.parentId) {
        const parentVisible = visible.some((p) => p.id === e.parentId);
        if (parentVisible) childParentIds.add(e.parentId);
      }
    }
    const layoutEntities = visible.filter((e) => !childParentIds.has(e.id));

    const lockedOnly = s.positions.filter((p) => p.locked);
    const result = computeLayout(layoutEntities, lockedOnly, s.visualConfig.nodeDisplayMode, visibleRels, s.viewpoint, s.zoomLevel);
    const newIds = new Set(result.positions.map((p) => p.entityId));
    const kept = s.positions.filter((p) => !newIds.has(p.entityId) && p.locked);
    set({ positions: [...kept, ...result.positions], scale: 1, panX: 0, panY: 0, manualLayout: false });
    get().addLogEntry('debug', `Auto-layout applied to ${layoutEntities.length} entities`);
  },

  setManualLayout: (manual: boolean) => set({ manualLayout: manual }),
  setUiMode: (mode: 'normal' | 'distraction-free' | 'presentation') => set({ uiMode: mode }),
});
