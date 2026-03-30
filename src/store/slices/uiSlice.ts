import { v4 as uuid } from 'uuid';
import type { ViewFilters, VisualConfig, ThemeMode, CanvasMode, HighlightShape } from '../../domain/types';
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
  zoomSensitivity: 0.08,         // 0.01 – 0.30

  // ── Canvas panel visibility ────────────────────────────
  showMinimap: true,
  showValidationPanel: true,
  showViewsPanel: true,
  canvasMode: 'select' as CanvasMode,
  inspectMode: false,
  highlightShapes: [] as HighlightShape[],
  highlightShapeType: 'rect' as 'rect' | 'ellipse',
  selectedHighlightId: null as string | null,
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
    set((s) => {
      const next = [...s.logEntries, entry];
      return { logEntries: next.length > 1000 ? next.slice(next.length - 1000) : next };
    });
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
    const result = await computeElkLayout(layoutEntities, lockedOnly, s.visualConfig.nodeDisplayMode, visibleRels, s.activeViewpoints, s.activeZoomLevels, s.swimlaneOrientation, s.visualConfig.edgeRoutingContainment);
    const newIds = new Set(result.positions.map((p) => p.entityId));
    const kept = s.positions.filter((p) => !newIds.has(p.entityId) && p.locked);
    // Preserve the user's current viewport (pan/scale) — mode switching and entity
    // additions should not teleport the user. Initial load starts at (0,0,1) which
    // already shows the diagram correctly since ELK places nodes near origin.
    set({ positions: [...kept, ...result.positions], manualLayout: false, lastLayoutResult: result });
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
  setCanvasMode:               (mode: CanvasMode) => set({ canvasMode: mode, inspectMode: mode === 'inspect' }),
  toggleInspectMode:           () => set((s) => {
    const next = s.canvasMode === 'inspect' ? 'select' : 'inspect';
    return { canvasMode: next as CanvasMode, inspectMode: next === 'inspect' };
  }),
  setHighlightShapeType:        (t: 'rect' | 'ellipse') => set({ highlightShapeType: t }),
  addHighlightShape:            (shape: HighlightShape) => set((s) => ({ highlightShapes: [...s.highlightShapes, shape] })),
  removeHighlightShape:         (id: string) => set((s) => ({ highlightShapes: s.highlightShapes.filter((h) => h.id !== id), selectedHighlightId: s.selectedHighlightId === id ? null : s.selectedHighlightId })),
  selectHighlight:              (id: string | null) => set({ selectedHighlightId: id }),
  clearHighlightShapes:         () => set({ highlightShapes: [], selectedHighlightId: null }),

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
    } else {
      // EXPAND: add to set — autoLayout will include the children
      next.add(id);
    }

    // Commit the new expanded set and clear manualLayout so the DiagramCanvas
    // layout effect fires a full autoLayout() — same path as any other composition change.
    set({ expandedEntityIds: next, manualLayout: false });
  },
});
