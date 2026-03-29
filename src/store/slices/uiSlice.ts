import { v4 as uuid } from 'uuid';
import type { ViewFilters, VisualConfig, ThemeMode, NodePosition } from '../../domain/types';
import { NODE_DIMENSIONS } from '../../domain/types';
import { computeElkLayout } from '../../layout/elkLayout';
import type { LayoutResult, LayoutMode } from '../../layout/types';
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

  // ── Autosave settings ──────────────────────────────────
  autosaveEnabled: true,
  autosaveInterval: 30,          // seconds

  // ── Canvas panel visibility ────────────────────────────
  showMinimap: true,
  showValidationPanel: true,
  showViewsPanel: true,
  inspectMode: false,
  expandedEntityIds: new Set<string>(),

  selectedNoteId: null as string | null,
  selectedBoundaryId: null as string | null,
  showNoteForm: false,
  editingNoteId: null as string | null,
  showBoundaryForm: false,
  editingBoundaryId: null as string | null,

  lastLayoutResult: null as LayoutResult | null,

  swimlaneOrientation: 'archimate-layered' as LayoutMode,
  setSwimlaneOrientation: (o: LayoutMode) => {
    set({ swimlaneOrientation: o });
    get().autoLayout();
  },

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

  autoLayout: async () => {
    const s = get();
    const visible = s.getVisibleEntities();
    const visibleRels = s.getVisibleRelationships();

    // Pass ALL visible entities — the layout engine handles
    // parent/child nesting internally via containment boxes.
    const layoutEntities = visible;

    const lockedOnly = s.positions.filter((p) => p.locked);
    const result = await computeElkLayout(layoutEntities, lockedOnly, s.visualConfig.nodeDisplayMode, visibleRels, s.activeViewpoints, s.activeZoomLevels, s.swimlaneOrientation, s.visualConfig.edgeRouting);
    const newIds = new Set(result.positions.map((p) => p.entityId));
    const kept = s.positions.filter((p) => !newIds.has(p.entityId) && p.locked);
    set({ positions: [...kept, ...result.positions], scale: 1, panX: 0, panY: 0, manualLayout: false, expandedEntityIds: new Set<string>(), lastLayoutResult: result });
    get().addLogEntry('debug', `Auto-layout applied to ${layoutEntities.length} entities (strategy: ${result.strategy ?? 'default'})`);
  },

  setManualLayout: (manual: boolean) => set({ manualLayout: manual }),
  setUiMode: (mode: 'normal' | 'distraction-free' | 'presentation') => set({ uiMode: mode }),

  // ── Autosave settings ──────────────────────────────────────
  setAutosaveEnabled: (enabled: boolean) => set({ autosaveEnabled: enabled }),
  setAutosaveInterval: (seconds: number) => set({ autosaveInterval: Math.max(5, Math.min(300, seconds)) }),
  setZoomSensitivity:  (v: number)       => set({ zoomSensitivity: Math.max(0.01, Math.min(0.30, v)) }),

  // ── Canvas panel visibility ────────────────────────────────
  toggleShowMinimap:          () => set((s) => ({ showMinimap: !s.showMinimap })),
  toggleShowValidationPanel:  () => set((s) => ({ showValidationPanel: !s.showValidationPanel })),
  toggleShowViewsPanel:       () => set((s) => ({ showViewsPanel: !s.showViewsPanel })),
  toggleInspectMode:          () => set((s) => ({ inspectMode: !s.inspectMode })),

  // ── Expand in place ────────────────────────────────────────
  collapseAllEntities: () => set({ expandedEntityIds: new Set<string>() }),

  toggleExpandEntity: (id: string) => {
    const s = get();

    // Only available in the normal (non-drilled) canvas view
    if (s.focusEntityId) return;

    const hasChildren = s.entities.some((e) => e.parentId === id);
    if (!hasChildren) return;

    const next = new Set(s.expandedEntityIds);
    if (next.has(id)) {
      // COLLAPSE: remove this entity and all its descendants
      next.delete(id);
      const queue = [id];
      while (queue.length) {
        const curr = queue.shift()!;
        for (const child of s.entities.filter((e) => e.parentId === curr)) {
          next.delete(child.id);
          queue.push(child.id);
        }
      }
      set({ expandedEntityIds: next });
    } else {
      // EXPAND: add to set, pre-position children near their parent
      next.add(id);
      const parentPos = s.positions.find((p) => p.entityId === id);
      const children = s.entities.filter((e) => e.parentId === id);
      const posMap = new Map(s.positions.map((p) => [p.entityId, p]));
      const newPositions: NodePosition[] = [...s.positions];

      if (parentPos && children.length > 0) {
        const COLS = Math.min(3, children.length);
        const COL_GAP = 40;
        const ROW_GAP = 40;
        let unpositioned = children.filter((c) => !posMap.has(c.id));
        let col = 0, row = 0;
        // Estimate column width from first child's kind dimensions
        const firstDims = NODE_DIMENSIONS[unpositioned[0]?.kind ?? 'container'] ?? { width: 160, height: 80 };
        const colW = firstDims.width + COL_GAP;
        const rowH = firstDims.height + ROW_GAP;
        const gridOffsetX = parentPos.x + 40;
        const gridOffsetY = parentPos.y + 80;

        for (const child of unpositioned) {
          newPositions.push({
            entityId: child.id,
            x: gridOffsetX + col * colW,
            y: gridOffsetY + row * rowH,
            locked: false,
          } as NodePosition);
          col++;
          if (col >= COLS) { col = 0; row++; }
        }
      }

      set({ expandedEntityIds: next, manualLayout: true, positions: newPositions });
    }
  },
});
