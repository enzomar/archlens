import { create, useStore as useZustandStore } from 'zustand';
import { temporal } from 'zundo';
import type { TemporalState } from 'zundo';
import { v4 as uuid } from 'uuid';
import type {
  ArchEntity,
  Relationship,
  NodePosition,
  SavedView,
  ZoomLevel,
  DiagramMode,
  Viewpoint,
  ViewFilters,
  VisualConfig,
  ArchLensProject,
  ThemeMode,
  DiagramNote,
  DiagramBoundary,
  NoteStyle,
  BoundaryStyle,
  DiagramTab,
  TraceabilityLink,
  TraceabilityType,
} from '../domain/types';
import { DEFAULT_NOTE_STYLE, DEFAULT_BOUNDARY_STYLE, DRILLABLE_KINDS, NODE_DIMENSIONS, inferViewpoint, getKindsForViewpointLevel } from '../domain/types';

import { computeLayout } from '../layout/layoutEngine';

// ─── LOG ENTRY ───────────────────────────────────────────────────

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
}

// ─── TAB HELPERS ─────────────────────────────────────────────────
// DiagramTab is now defined in types.ts and re-exported from there.
// These helpers make the save/restore pattern DRY across tab actions.

const DEFAULT_VISUAL_CONFIG: VisualConfig = {
  colorBy: 'kind',
  animateEdges: 'on',
  nodeDisplayMode: 'standard',
  showGrid: true,
  snapToGrid: false,
};

function emptyTabData(): Omit<DiagramTab, 'id' | 'name'> {
  return {
    entities: [],
    relationships: [],
    positions: [],
    notes: [],
    boundaries: [],
    traceabilityLinks: [],
    views: [],
    zoomLevel: 'context',
    viewpoint: 'application',
    focusEntityId: null,
    breadcrumb: [],
    diagramMode: 'focused',
    panX: 0,
    panY: 0,
    scale: 1,
    filters: {},
    visualConfig: { ...DEFAULT_VISUAL_CONFIG },
    selectedEntityId: null,
    selectedRelationshipId: null,
    selectedNoteId: null,
    selectedBoundaryId: null,
  };
}
function saveStateToTab(s: ArchLensState, tabId: string): DiagramTab[] {
  return s.tabs.map((t) =>
    t.id === tabId
      ? {
          ...t,
          entities: s.entities,
          relationships: s.relationships,
          positions: s.positions,
          notes: s.notes,
          boundaries: s.boundaries,
          traceabilityLinks: s.traceabilityLinks,
          views: s.views,
          zoomLevel: s.zoomLevel,
          viewpoint: s.viewpoint,
          focusEntityId: s.focusEntityId,
          breadcrumb: s.breadcrumb,
          diagramMode: s.diagramMode,
          panX: s.panX,
          panY: s.panY,
          scale: s.scale,
          filters: s.filters,
          visualConfig: s.visualConfig,
          selectedEntityId: s.selectedEntityId,
          selectedRelationshipId: s.selectedRelationshipId,
          selectedNoteId: s.selectedNoteId,
          selectedBoundaryId: s.selectedBoundaryId,
        }
      : t
  );
}

/** Extract a tab's diagram data into global store fields. */
function restoreTabToState(tab: DiagramTab): Partial<ArchLensState> {
  return {
    entities: tab.entities,
    relationships: tab.relationships,
    positions: tab.positions,
    notes: tab.notes,
    boundaries: tab.boundaries,
    traceabilityLinks: tab.traceabilityLinks ?? [],
    views: tab.views,
    zoomLevel: tab.zoomLevel,
    viewpoint: tab.viewpoint ?? 'application',
    focusEntityId: tab.focusEntityId,
    breadcrumb: tab.breadcrumb,
    diagramMode: tab.diagramMode ?? 'focused',
    panX: tab.panX,
    panY: tab.panY,
    scale: tab.scale,
    filters: tab.filters,
    visualConfig: tab.visualConfig,
    selectedEntityId: tab.selectedEntityId,
    selectedRelationshipId: tab.selectedRelationshipId,
    selectedNoteId: tab.selectedNoteId,
    selectedBoundaryId: tab.selectedBoundaryId,
  };
}

// ─── STORE STATE ─────────────────────────────────────────────────

export interface ArchLensState {
  // Project metadata
  projectName: string;
  projectDescription: string;

  // Core data
  entities: ArchEntity[];
  relationships: Relationship[];
  positions: NodePosition[];
  views: SavedView[];
  notes: DiagramNote[];
  boundaries: DiagramBoundary[];
  traceabilityLinks: TraceabilityLink[];

  // Navigation
  zoomLevel: ZoomLevel;
  viewpoint: Viewpoint;
  focusEntityId: string | null;
  breadcrumb: { id: string; name: string; level: ZoomLevel }[];
  diagramMode: DiagramMode;

  // UI state
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  showEntityForm: boolean;
  showRelationshipForm: boolean;
  showExportPanel: boolean;
  editingEntityId: string | null;
  filters: ViewFilters;
  visualConfig: VisualConfig;
  panX: number;
  panY: number;
  scale: number;

  // Theme
  theme: ThemeMode;

  // Sidebars
  rightSidebarOpen: boolean;
  leftSidebarOpen: boolean;

  // Log panel
  logPanelOpen: boolean;
  logEntries: LogEntry[];

  // UI mode
  uiMode: 'normal' | 'distraction-free' | 'presentation';

  // Tabs
  tabs: DiagramTab[];
  activeTabId: string | null;

  // Actions
  addEntity: (entity: Omit<ArchEntity, 'id'>) => string;
  updateEntity: (id: string, updates: Partial<ArchEntity>) => void;
  deleteEntity: (id: string) => void;

  addRelationship: (rel: Omit<Relationship, 'id'>) => string;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;

  setPosition: (entityId: string, x: number, y: number) => void;
  lockPosition: (entityId: string, locked: boolean) => void;

  setZoomLevel: (level: ZoomLevel) => void;
  setViewpoint: (vp: Viewpoint) => void;
  setFocusEntity: (id: string | null) => void;
  setDiagramMode: (mode: DiagramMode) => void;
  drillDown: (entityId: string) => void;
  drillUp: () => void;
  drillTo: (breadcrumbIndex: number) => void;

  selectEntity: (id: string | null) => void;
  selectRelationship: (id: string | null) => void;
  // Multi-select
  selectedEntityIds: Set<string>;
  toggleSelectEntity: (id: string) => void;
  selectEntities: (ids: string[]) => void;
  clearMultiSelect: () => void;
  deleteSelectedEntities: () => void;
  setShowEntityForm: (show: boolean, editId?: string | null) => void;
  editingRelationshipId: string | null;
  setShowRelationshipForm: (show: boolean, editId?: string | null) => void;
  // Prefill source/target for new relationships (used by drag-to-connect)
  prefillRelSourceId: string | null;
  prefillRelTargetId: string | null;
  openNewRelationship: (sourceId?: string | null, targetId?: string | null) => void;
  setShowExportPanel: (show: boolean) => void;
  setFilters: (filters: ViewFilters) => void;
  setVisualConfig: (config: VisualConfig) => void;
  setPan: (x: number, y: number) => void;
  setScale: (s: number) => void;

  // Theme
  setTheme: (theme: ThemeMode) => void;
  setProjectName: (name: string) => void;

  // Sidebars
  toggleRightSidebar: () => void;
  toggleLeftSidebar: () => void;

  // Log panel
  toggleLogPanel: () => void;
  addLogEntry: (level: LogEntry['level'], message: string) => void;
  clearLog: () => void;

  // UI mode
  setUiMode: (mode: 'normal' | 'distraction-free' | 'presentation') => void;

  // Tabs
  addTab: (name?: string) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;

  saveView: (name: string) => void;
  loadView: (viewId: string) => void;
  deleteView: (viewId: string) => void;

  // Notes
  addNote: (text: string, attachedToId?: string | null) => string;
  updateNote: (id: string, updates: Partial<DiagramNote>) => void;
  deleteNote: (id: string) => void;
  setNoteStyle: (id: string, style: Partial<NoteStyle>) => void;

  // Boundaries
  addBoundary: (label: string) => string;
  updateBoundary: (id: string, updates: Partial<DiagramBoundary>) => void;
  deleteBoundary: (id: string) => void;
  setBoundaryStyle: (id: string, style: Partial<BoundaryStyle>) => void;

  // Auto-layout
  manualLayout: boolean;
  setManualLayout: (manual: boolean) => void;
  autoLayout: () => void;

  // Selection for notes/boundaries
  selectedNoteId: string | null;
  selectedBoundaryId: string | null;
  selectNote: (id: string | null) => void;
  selectBoundary: (id: string | null) => void;

  // Note/Boundary forms
  showNoteForm: boolean;
  editingNoteId: string | null;
  showBoundaryForm: boolean;
  editingBoundaryId: string | null;
  setShowNoteForm: (show: boolean, editId?: string | null) => void;
  setShowBoundaryForm: (show: boolean, editId?: string | null) => void;

  // List view
  showListView: boolean;
  toggleListView: () => void;
  duplicateEntity: (id: string) => string | null;

  loadProject: (project: ArchLensProject) => void;
  getProject: () => ArchLensProject;
  newProject: () => void;

  // Traceability
  addTraceabilityLink: (sourceId: string, targetId: string, type: TraceabilityType, label?: string) => string;
  deleteTraceabilityLink: (id: string) => void;

  getVisibleEntities: () => ArchEntity[];
  getVisibleRelationships: () => Relationship[];
  getChildrenOf: (parentId: string) => ArchEntity[];
}

// ─── STORE CREATION ──────────────────────────────────────────────

// The app always starts with one empty tab.
const _initialTabId = uuid();
const _initialTab: DiagramTab = { id: _initialTabId, name: 'Diagram 1', ...emptyTabData() };

// The diagram-data slice we track for undo/redo.
// UI/navigation/log state is deliberately excluded so those changes
// don't pollute the history stack.
type DiagramSnapshot = Pick<
  ArchLensState,
  'entities' | 'relationships' | 'positions' | 'notes' | 'boundaries' | 'traceabilityLinks'
>;

export const useStore = create<ArchLensState>()(
  temporal(
    (set, get) => ({
  projectName: 'Untitled Project',
  projectDescription: '',

  entities: [],
  relationships: [],
  positions: [],
  views: [],
  notes: [],
  boundaries: [],
  traceabilityLinks: [],

  zoomLevel: 'context',
  viewpoint: 'application' as Viewpoint,
  focusEntityId: null,
  breadcrumb: [],
  diagramMode: 'focused',

  selectedEntityId: null,
  selectedRelationshipId: null,
  selectedEntityIds: new Set<string>(),
  showEntityForm: false,
  showRelationshipForm: false,
  showExportPanel: false,
  editingEntityId: null,
  editingRelationshipId: null,
  prefillRelSourceId: null,
  prefillRelTargetId: null,
  filters: {},
  visualConfig: { ...DEFAULT_VISUAL_CONFIG },
  panX: 0,
  panY: 0,
  scale: 1,

  theme: 'system',
  rightSidebarOpen: true,
  leftSidebarOpen: false,
  logPanelOpen: false,
  logEntries: [],
  manualLayout: false,
  uiMode: 'normal',
  tabs: [_initialTab],
  activeTabId: _initialTabId,

  selectedNoteId: null,
  selectedBoundaryId: null,
  showNoteForm: false,
  editingNoteId: null,
  showBoundaryForm: false,
  editingBoundaryId: null,

  showListView: false,

  // ── Entity CRUD ─────────────────────────────────────────────

  addEntity: (entity) => {
    const id = uuid();
    const newEntity: ArchEntity = { ...entity, id };
    set((s) => ({ entities: [...s.entities, newEntity] }));
    get().addLogEntry('info', `Entity created: "${entity.name}" [${entity.kind}]`);
    return id;
  },

  updateEntity: (id, updates) => {
    const name = get().entities.find((e) => e.id === id)?.name ?? id;
    set((s) => ({
      entities: s.entities.map((e) => (e.id === id ? { ...e, ...updates, id } : e)),
    }));
    get().addLogEntry('debug', `Entity updated: "${name}"`);
  },

  deleteEntity: (id) => {
    const name = get().entities.find((e) => e.id === id)?.name ?? id;
    set((s) => ({
      entities: s.entities.filter((e) => e.id !== id),
      relationships: s.relationships.filter((r) => r.sourceId !== id && r.targetId !== id),
      positions: s.positions.filter((p) => p.entityId !== id),
      selectedEntityId: s.selectedEntityId === id ? null : s.selectedEntityId,
    }));
    get().addLogEntry('warn', `Entity deleted: "${name}"`);
  },

  duplicateEntity: (id) => {
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

  addRelationship: (rel) => {
    const id = uuid();
    set((s) => ({ relationships: [...s.relationships, { ...rel, id }] }));
    get().addLogEntry('info', `Relationship created: "${rel.label || '(unlabeled)'}" [${rel.type}]`);
    return id;
  },

  updateRelationship: (id, updates) => {
    set((s) => ({
      relationships: s.relationships.map((r) => (r.id === id ? { ...r, ...updates, id } : r)),
    }));
    get().addLogEntry('debug', `Relationship updated`);
  },

  deleteRelationship: (id) => {
    const label = get().relationships.find((r) => r.id === id)?.label ?? id;
    set((s) => ({
      relationships: s.relationships.filter((r) => r.id !== id),
      selectedRelationshipId: s.selectedRelationshipId === id ? null : s.selectedRelationshipId,
    }));
    get().addLogEntry('warn', `Relationship deleted: "${label || '(unlabeled)'}"`);
  },

  // ── Position ────────────────────────────────────────────────

  setPosition: (entityId, x, y) => {
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

  lockPosition: (entityId, locked) => {
    set((s) => ({
      positions: s.positions.map((p) =>
        p.entityId === entityId ? { ...p, locked } : p
      ),
    }));
  },

  // ── Navigation ──────────────────────────────────────────────

  // Manual zoom changes from the toolbar clear navigation state to avoid
  // a stale focusEntityId making the canvas appear empty.
  setZoomLevel: (level) => {
    set({ zoomLevel: level, focusEntityId: null, breadcrumb: [] });
    get().addLogEntry('debug', `Zoom level changed to ${level}`);
  },

  setDiagramMode: (mode) => {
    set({ diagramMode: mode });
    get().addLogEntry('debug', `Diagram mode changed to ${mode}`);
  },

  setViewpoint: (vp) => {
    set({ viewpoint: vp, focusEntityId: null, breadcrumb: [] });
    get().addLogEntry('debug', `Viewpoint changed to ${vp}`);
  },

  setFocusEntity: (id) => set({ focusEntityId: id }),

  drillDown: (entityId) => {
    const state = get();
    const entity = state.entities.find((e) => e.id === entityId);
    if (!entity) return;

    const targetZoom = DRILLABLE_KINDS[entity.kind];
    if (!targetZoom) return;

    set({
      zoomLevel: targetZoom,
      focusEntityId: entityId,
      breadcrumb: [
        ...state.breadcrumb,
        { id: entityId, name: entity.name, level: state.zoomLevel },
      ],
      selectedEntityId: null,
    });

    // ── Prezi-like auto-fit: zoom the camera to frame the children ──
    // We do this after the state update so getVisibleEntities reflects
    // the new focusEntityId and zoom level.
    const PADDING = 120;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const children = state.entities.filter((e) => e.parentId === entityId);
    const positions = state.positions;
    if (children.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const child of children) {
        const pos = positions.find((p) => p.entityId === child.id);
        const dims = NODE_DIMENSIONS[child.kind];
        const x = pos?.x ?? 100;
        const y = pos?.y ?? 100;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + dims.width);
        maxY = Math.max(maxY, y + dims.height);
      }
      const contentW = maxX - minX + PADDING * 2;
      const contentH = maxY - minY + PADDING * 2;
      const newScale = Math.max(0.2, Math.min(2, Math.min(viewportW / contentW, viewportH / contentH)));
      const newPanX = viewportW / 2 - (minX - PADDING + contentW / 2) * newScale;
      const newPanY = viewportH / 2 - (minY - PADDING + contentH / 2) * newScale;
      set({ scale: newScale, panX: newPanX, panY: newPanY });
    }

    get().addLogEntry('debug', `Drilled into "${entity.name}" → ${targetZoom}`);
  },

  drillUp: () => {
    const state = get();
    if (state.breadcrumb.length === 0) return;

    const newBreadcrumb = [...state.breadcrumb];
    const popped = newBreadcrumb.pop()!;

    set({
      zoomLevel: popped.level,
      focusEntityId: newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1].id : null,
      breadcrumb: newBreadcrumb,
      selectedEntityId: null,
    });
    get().addLogEntry('debug', `Drilled up to ${popped.level}`);
  },

  drillTo: (index: number) => {
    const state = get();
    if (index < 0 || index >= state.breadcrumb.length) return;
    const newBreadcrumb = state.breadcrumb.slice(0, index + 1);
    const target = newBreadcrumb[newBreadcrumb.length - 1];
    // We want to navigate INTO this entity, so set zoomLevel to one below
    // and focusEntityId to the target. Use DRILLABLE_KINDS to find the target zoom.
    const entity = state.entities.find((e) => e.id === target.id);
    const targetZoom = entity ? DRILLABLE_KINDS[entity.kind] : undefined;
    if (targetZoom) {
      set({
        zoomLevel: targetZoom,
        focusEntityId: target.id,
        breadcrumb: newBreadcrumb,
        selectedEntityId: null,
      });
    } else {
      // Fallback: navigate up to that breadcrumb entry's level
      set({
        zoomLevel: target.level,
        focusEntityId: index > 0 ? newBreadcrumb[index - 1].id : null,
        breadcrumb: newBreadcrumb.slice(0, index),
        selectedEntityId: null,
      });
    }
    get().addLogEntry('debug', `Navigated to breadcrumb: ${target.name}`);
  },

  // ── UI State ────────────────────────────────────────────────

  selectEntity: (id) => set({ selectedEntityId: id, selectedEntityIds: new Set<string>(), selectedRelationshipId: null, selectedNoteId: null, selectedBoundaryId: null }),

  selectRelationship: (id) => set({ selectedRelationshipId: id, selectedEntityId: null, selectedEntityIds: new Set<string>(), selectedNoteId: null, selectedBoundaryId: null }),

  toggleSelectEntity: (id) => {
    const s = get();
    const next = new Set(s.selectedEntityIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selectedEntityIds: next, selectedEntityId: next.size === 1 ? [...next][0] : null, selectedRelationshipId: null, selectedNoteId: null, selectedBoundaryId: null });
  },
  selectEntities: (ids) => set({ selectedEntityIds: new Set(ids), selectedEntityId: ids.length === 1 ? ids[0] : null, selectedRelationshipId: null, selectedNoteId: null, selectedBoundaryId: null }),
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

  setShowEntityForm: (show, editId = null) =>
    set({ showEntityForm: show, editingEntityId: editId }),

  setShowRelationshipForm: (show, editId = null) =>
    set({ showRelationshipForm: show, editingRelationshipId: editId }),

  openNewRelationship: (sourceId = null, targetId = null) =>
    set({
      showRelationshipForm: true,
      editingRelationshipId: null,
      prefillRelSourceId: sourceId ?? null,
      prefillRelTargetId: targetId ?? null,
    }),

  setShowExportPanel: (show) => set({ showExportPanel: show }),

  setFilters: (filters) => set({ filters }),

  setVisualConfig: (config) => set({ visualConfig: config }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  setScale: (s) => set({ scale: Math.max(0.1, Math.min(4, s)) }),

  // ── Theme ───────────────────────────────────────────────────

  setTheme: (theme) => {
    set({ theme });
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  },

  setProjectName: (name) => set({ projectName: name }),

  // ── Sidebars ────────────────────────────────────────────────

  toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),

  // ── Log panel ───────────────────────────────────────────────

  toggleLogPanel: () => set((s) => ({ logPanelOpen: !s.logPanelOpen })),

  addLogEntry: (level, message) => {
    const entry: LogEntry = { id: uuid(), timestamp: Date.now(), level, message };
    set((s) => ({ logEntries: [...s.logEntries, entry] }));
  },

  clearLog: () => set({ logEntries: [] }),

  // ── Tabs ────────────────────────────────────────────────────

  addTab: (name) => {
    const s = get();
    const newTabId = uuid();
    const tabName = name ?? `Diagram ${s.tabs.length + 1}`;

    // Save current global diagram state into the current active tab snapshot
    const savedTabs = s.activeTabId ? saveStateToTab(s, s.activeTabId) : s.tabs;

    const newTab: DiagramTab = { id: newTabId, name: tabName, ...emptyTabData() };

    set({
      tabs: [...savedTabs, newTab],
      activeTabId: newTabId,
      // Load empty diagram state for the new tab
      ...restoreTabToState(newTab),
    });
  },

  closeTab: (tabId) => {
    const s = get();
    const newTabs = s.tabs.filter((t) => t.id !== tabId);

    if (s.activeTabId !== tabId) {
      // Closing an inactive tab — just remove it, no state swap needed
      set({ tabs: newTabs });
      return;
    }

    // Closing the active tab — switch to another
    if (newTabs.length === 0) {
      set({ tabs: [], activeTabId: null, ...restoreTabToState({ ...emptyTabData(), id: '', name: '' }) });
      return;
    }

    const newActive = newTabs[newTabs.length - 1];
    set({ tabs: newTabs, activeTabId: newActive.id, ...restoreTabToState(newActive) });
  },

  switchTab: (tabId) => {
    const s = get();
    if (!s.activeTabId || tabId === s.activeTabId) return;

    // Save current global state into the current tab snapshot
    const savedTabs = saveStateToTab(s, s.activeTabId);

    const target = savedTabs.find((t) => t.id === tabId);
    if (!target) return;

    set({ tabs: savedTabs, activeTabId: tabId, ...restoreTabToState(target) });
  },

  renameTab: (tabId, name) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, name } : t)),
    }));
  },

  // ── Views ───────────────────────────────────────────────────

  saveView: (name) => {
    const state = get();
    const view: SavedView = {
      id: uuid(),
      name,
      zoomLevel: state.zoomLevel,
      focusEntityId: state.focusEntityId,
      filters: { ...state.filters },
    };
    set((s) => ({ views: [...s.views, view] }));
    get().addLogEntry('info', `View saved: "${name}"`);
  },

  loadView: (viewId) => {
    const state = get();
    const view = state.views.find((v) => v.id === viewId);
    if (!view) return;
    set({
      zoomLevel: view.zoomLevel,
      focusEntityId: view.focusEntityId,
      filters: { ...view.filters },
    });
    get().addLogEntry('debug', `View loaded: "${view.name}"`);
  },

  deleteView: (viewId) => {
    const name = get().views.find((v) => v.id === viewId)?.name ?? viewId;
    set((s) => ({ views: s.views.filter((v) => v.id !== viewId) }));
    get().addLogEntry('warn', `View deleted: "${name}"`);
  },

  // ── Notes ─────────────────────────────────────────────────────

  addNote: (text, attachedToId = null) => {
    const id = uuid();
    const note: DiagramNote = {
      id,
      text,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: 180,
      height: 100,
      attachedToId: attachedToId ?? null,
      style: { ...DEFAULT_NOTE_STYLE },
    };
    set((s) => ({ notes: [...s.notes, note] }));
    get().addLogEntry('info', `Note added`);
    return id;
  },

  updateNote: (id, updates) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates, id } : n)),
    }));
  },

  deleteNote: (id) => {
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
    }));
    get().addLogEntry('warn', `Note deleted`);
  },

  setNoteStyle: (id, style) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, style: { ...n.style, ...style } } : n
      ),
    }));
  },

  // ── Boundaries ────────────────────────────────────────────────

  addBoundary: (label) => {
    const id = uuid();
    const boundary: DiagramBoundary = {
      id,
      label,
      x: 50 + Math.random() * 100,
      y: 50 + Math.random() * 100,
      width: 400,
      height: 300,
      style: { ...DEFAULT_BOUNDARY_STYLE },
    };
    set((s) => ({ boundaries: [...s.boundaries, boundary] }));
    get().addLogEntry('info', `Boundary added: "${label}"`);
    return id;
  },

  updateBoundary: (id, updates) => {
    set((s) => ({
      boundaries: s.boundaries.map((b) => (b.id === id ? { ...b, ...updates, id } : b)),
    }));
  },

  deleteBoundary: (id) => {
    const label = get().boundaries.find((b) => b.id === id)?.label ?? id;
    set((s) => ({
      boundaries: s.boundaries.filter((b) => b.id !== id),
      selectedBoundaryId: s.selectedBoundaryId === id ? null : s.selectedBoundaryId,
    }));
    get().addLogEntry('warn', `Boundary deleted: "${label}"`);
  },

  setBoundaryStyle: (id, style) => {
    set((s) => ({
      boundaries: s.boundaries.map((b) =>
        b.id === id ? { ...b, style: { ...b.style, ...style } } : b
      ),
    }));
  },

  // ── Selection (notes/boundaries) ─────────────────────────────

  selectNote: (id) => set({ selectedNoteId: id, selectedEntityId: null, selectedRelationshipId: null, selectedBoundaryId: null }),
  selectBoundary: (id) => set({ selectedBoundaryId: id, selectedEntityId: null, selectedRelationshipId: null, selectedNoteId: null }),

  setShowNoteForm: (show, editId = null) => set({ showNoteForm: show, editingNoteId: editId }),
  setShowBoundaryForm: (show, editId = null) => set({ showBoundaryForm: show, editingBoundaryId: editId }),

  // ── Auto-layout ───────────────────────────────────────────────

  autoLayout: () => {
    const s = get();
    const visible = s.getVisibleEntities();
    const visibleRels = s.getVisibleRelationships();

    // Exclude parent-frame entities from layout — they are rendered as
    // containing frames around their children, not as positioned nodes.
    const childParentIds = new Set<string>();
    for (const e of visible) {
      if (e.parentId) {
        const parentVisible = visible.some((p) => p.id === e.parentId);
        if (parentVisible) childParentIds.add(e.parentId);
      }
    }
    const layoutEntities = visible.filter((e) => !childParentIds.has(e.id));

    const lockedOnly = s.positions.filter((p) => p.locked);
    const result = computeLayout(layoutEntities, lockedOnly, s.visualConfig.nodeDisplayMode, visibleRels);
    const newIds = new Set(result.positions.map((p) => p.entityId));
    const kept = s.positions.filter((p) => !newIds.has(p.entityId) && p.locked);
    set({ positions: [...kept, ...result.positions], scale: 1, panX: 0, panY: 0, manualLayout: false });
    get().addLogEntry('debug', `Auto-layout applied to ${layoutEntities.length} entities`);
  },

  setManualLayout: (manual) => set({ manualLayout: manual }),

  setUiMode: (mode) => set({ uiMode: mode }),

  // ── Persistence ─────────────────────────────────────────────

  loadProject: (project) => {
    let tabs: DiagramTab[];
    let activeTabId: string;

    // ── Migration helper: ensure every entity has a viewpoint ──
    const migrateEntities = (entities: ArchEntity[]): ArchEntity[] =>
      entities.map((e) => ({
        ...e,
        viewpoint: e.viewpoint ?? inferViewpoint(e.kind),
      }));

    // Ensure every tab has traceabilityLinks (migration)
    const migrateTab = (t: DiagramTab): DiagramTab => ({
      ...t,
      entities: migrateEntities(t.entities),
      traceabilityLinks: t.traceabilityLinks ?? [],
      viewpoint: t.viewpoint ?? 'application',
    });

    if (project.tabs && project.tabs.length > 0) {
      // v2 format: project already has isolated tabs
      tabs = project.tabs.map(migrateTab);
      activeTabId = (project.activeTabId && tabs.some((t) => t.id === project.activeTabId))
        ? project.activeTabId!
        : tabs[0].id;
    } else {
      // v1 backward-compat: flat data → wrap in a single tab
      const tabId = uuid();
      tabs = [{
        id: tabId,
        name: 'Diagram 1',
        entities: migrateEntities(project.entities ?? []),
        relationships: project.relationships ?? [],
        positions: project.positions ?? [],
        notes: project.notes ?? [],
        boundaries: project.boundaries ?? [],
        traceabilityLinks: project.traceabilityLinks ?? [],
        views: project.views ?? [],
        zoomLevel: 'context',
        viewpoint: 'application',
        focusEntityId: null,
        breadcrumb: [],
        panX: 0,
        panY: 0,
        scale: 1,
        filters: {},
        visualConfig: { ...DEFAULT_VISUAL_CONFIG },
        selectedEntityId: null,
        selectedRelationshipId: null,
        selectedNoteId: null,
        selectedBoundaryId: null,
        diagramMode: 'focused',
      }];
      activeTabId = tabId;
    }

    const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
    set({
      projectName: project.name,
      projectDescription: project.description,
      tabs,
      activeTabId: activeTab.id,
      ...restoreTabToState(activeTab),
    });
    get().addLogEntry('info', `Project loaded: "${project.name}" (${tabs.length} tab${tabs.length > 1 ? 's' : ''})`);
  },

  getProject: () => {
    const s = get();
    // Snapshot the current global state into the active tab before serializing
    const tabs = s.activeTabId ? saveStateToTab(s, s.activeTabId) : s.tabs;
    return {
      version: '2.0.0',
      name: s.projectName,
      description: s.projectDescription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tabs,
      activeTabId: s.activeTabId,
    };
  },

  newProject: () => {
    const tabId = uuid();
    const newTab: DiagramTab = { id: tabId, name: 'Diagram 1', ...emptyTabData() };
    set({
      projectName: 'Untitled Project',
      projectDescription: '',
      tabs: [newTab],
      activeTabId: tabId,
      ...restoreTabToState(newTab),
    });
    get().addLogEntry('info', `New project created`);
  },

  // ── Traceability Links ──────────────────────────────────────

  addTraceabilityLink: (sourceId, targetId, type, label) => {
    const id = uuid();
    set((s) => ({
      traceabilityLinks: [...s.traceabilityLinks, { id, sourceId, targetId, type, label }],
    }));
    get().addLogEntry('info', `Traceability link created: ${type}`);
    return id;
  },

  deleteTraceabilityLink: (id) => {
    set((s) => ({
      traceabilityLinks: s.traceabilityLinks.filter((l) => l.id !== id),
    }));
    get().addLogEntry('warn', `Traceability link deleted`);
  },

  getVisibleEntities: () => {
    const s = get();

    // ── Global viewpoint: show entities from all viewpoints at selected zoom level ──
    if (s.viewpoint === 'global') {
      const allowedKinds = new Set(getKindsForViewpointLevel('global', s.zoomLevel));
      let visible = s.entities.filter((e) => allowedKinds.has(e.kind));

      // Include parent entities (one level up) as containing frames
      const primaryIds = new Set(visible.map((e) => e.id));
      const parentIds = new Set<string>();
      for (const e of visible) {
        if (e.parentId && !primaryIds.has(e.parentId)) parentIds.add(e.parentId);
      }
      if (parentIds.size > 0) {
        const parents = s.entities.filter((e) => parentIds.has(e.id));
        visible = [...visible, ...parents];
      }

      // Also include direct children (one level deeper) for nesting
      const allIds = new Set(visible.map((e) => e.id));
      const children = s.entities.filter(
        (e) => e.parentId && allIds.has(e.parentId) && !allIds.has(e.id)
      );
      if (children.length > 0) {
        visible = [...visible, ...children];
      }

      const f = s.filters;
      if (f.kinds && f.kinds.length > 0) {
        visible = visible.filter((e) => f.kinds!.includes(e.kind));
      }
      if (f.maturities && f.maturities.length > 0) {
        visible = visible.filter((e) => e.metadata.maturity && f.maturities!.includes(e.metadata.maturity));
      }
      if (f.tags && f.tags.length > 0) {
        visible = visible.filter((e) => f.tags!.some((t) => e.metadata.tags.includes(t)));
      }
      if (f.deploymentStages && f.deploymentStages.length > 0) {
        visible = visible.filter(
          (e) => e.metadata.deploymentStage && f.deploymentStages!.includes(e.metadata.deploymentStage)
        );
      }
      return visible;
    }

    // ── Focused mode: viewpoint + level filtered ──
    const vp = s.viewpoint;

    // Focused mode: viewpoint + level filtered.
    const allowedKinds = new Set(getKindsForViewpointLevel(vp, s.zoomLevel));
    let visible: typeof s.entities;
    if (s.focusEntityId) {
      visible = s.entities.filter(
        (e) => e.parentId === s.focusEntityId && allowedKinds.has(e.kind)
      );
    } else {
      visible = s.entities.filter((e) => e.viewpoint === vp && allowedKinds.has(e.kind));
    }

    // C4 nesting: include parent entities (one level up) so they render
    // as containing frames.  E.g. at Container zoom, each container's
    // parent System is included to act as the visual boundary.
    if (!s.focusEntityId) {
      const primaryIds = new Set(visible.map((e) => e.id));
      const parentIds = new Set<string>();
      for (const e of visible) {
        if (e.parentId && !primaryIds.has(e.parentId)) parentIds.add(e.parentId);
      }
      if (parentIds.size > 0) {
        const parents = s.entities.filter((e) => parentIds.has(e.id));
        visible = [...visible, ...parents];
      }
    }

    // Also include direct children of each primary entity so they render
    // nested inside their parent frame (the C4 "container shows its
    // components" pattern).  Children use the viewpoint filter but not
    // the zoom-level kind filter — they're naturally one level deeper.
    if (!s.focusEntityId) {
      const allIds = new Set(visible.map((e) => e.id));
      const children = s.entities.filter(
        (e) => e.parentId && allIds.has(e.parentId) && !allIds.has(e.id) &&
               (e.viewpoint === vp || vp === 'global')
      );
      if (children.length > 0) {
        visible = [...visible, ...children];
      }
    }

    // Apply filters
    const f = s.filters;
    if (f.kinds && f.kinds.length > 0) {
      visible = visible.filter((e) => f.kinds!.includes(e.kind));
    }
    if (f.maturities && f.maturities.length > 0) {
      visible = visible.filter((e) => e.metadata.maturity && f.maturities!.includes(e.metadata.maturity));
    }
    if (f.tags && f.tags.length > 0) {
      visible = visible.filter((e) => f.tags!.some((t) => e.metadata.tags.includes(t)));
    }
    if (f.deploymentStages && f.deploymentStages.length > 0) {
      visible = visible.filter(
        (e) => e.metadata.deploymentStage && f.deploymentStages!.includes(e.metadata.deploymentStage)
      );
    }

    return visible;
  },

  getVisibleRelationships: () => {
    const s = get();
    const visibleIds = new Set(s.getVisibleEntities().map((e) => e.id));
    return s.relationships.filter(
      (r) => visibleIds.has(r.sourceId) && visibleIds.has(r.targetId)
    );
  },

  getChildrenOf: (parentId) => {
    return get().entities.filter((e) => e.parentId === parentId);
  },
}),
{
  // Only record a history entry when diagram data actually changes.
  // UI state (pan, zoom, selection, log, tabs, theme) is excluded.
  partialize: (state): DiagramSnapshot => ({
    entities: state.entities,
    relationships: state.relationships,
    positions: state.positions,
    notes: state.notes,
    boundaries: state.boundaries,
    traceabilityLinks: state.traceabilityLinks,
  }),
  // Limit history to 100 steps to keep memory bounded.
  limit: 100,
}
));

// ─── TEMPORAL STORE (undo / redo) ────────────────────────────────
// Exposes useTemporalStore which has: undo, redo, pastStates, futureStates.
// canUndo / canRedo are derived from the length of those arrays.
export const useTemporalStore = <T>(
  selector: (state: TemporalState<DiagramSnapshot>) => T
): T => useZustandStore(useStore.temporal, selector);
