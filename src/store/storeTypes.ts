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
  ThemeMode,
  DiagramNote,
  DiagramBoundary,
  NoteStyle,
  BoundaryStyle,
  DiagramTab,
  TraceabilityLink,
  TraceabilityType,
  ArchLensProject,
} from '../domain/types';

// ─── LOG ENTRY ───────────────────────────────────────────────────

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
}

// ─── DEFAULTS ────────────────────────────────────────────────────

export const DEFAULT_VISUAL_CONFIG: VisualConfig = {
  colorBy: 'kind',
  animateEdges: 'on',
  nodeDisplayMode: 'standard',
  showGrid: true,
  snapToGrid: false,
};

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
  // ── Multi-select view filters ─────────────────────────────────────────────
  activeZoomLevels: ZoomLevel[];
  activeViewpoints: Viewpoint[];
  toggleActiveZoomLevel: (level: ZoomLevel) => void;
  toggleActiveViewpoint: (vp: Viewpoint) => void;
  setFocusEntity: (id: string | null) => void;
  setDiagramMode: (mode: DiagramMode) => void;
  drillDown: (entityId: string) => void;
  drillUp: () => void;
  drillTo: (breadcrumbIndex: number) => void;

  selectEntity: (id: string | null) => void;
  selectRelationship: (id: string | null) => void;
  selectedEntityIds: Set<string>;
  toggleSelectEntity: (id: string) => void;
  selectEntities: (ids: string[]) => void;
  clearMultiSelect: () => void;
  deleteSelectedEntities: () => void;
  setShowEntityForm: (show: boolean, editId?: string | null) => void;
  editingRelationshipId: string | null;
  setShowRelationshipForm: (show: boolean, editId?: string | null) => void;
  prefillRelSourceId: string | null;
  prefillRelTargetId: string | null;
  openNewRelationship: (sourceId?: string | null, targetId?: string | null) => void;
  setShowExportPanel: (show: boolean) => void;
  setFilters: (filters: ViewFilters) => void;
  setVisualConfig: (config: VisualConfig) => void;
  setPan: (x: number, y: number) => void;
  setScale: (s: number) => void;

  setTheme: (theme: ThemeMode) => void;
  setProjectName: (name: string) => void;

  toggleRightSidebar: () => void;
  toggleLeftSidebar: () => void;

  toggleLogPanel: () => void;
  addLogEntry: (level: LogEntry['level'], message: string) => void;
  clearLog: () => void;

  setUiMode: (mode: 'normal' | 'distraction-free' | 'presentation') => void;

  addTab: (name?: string) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;

  saveView: (name: string) => void;
  loadView: (viewId: string) => void;
  deleteView: (viewId: string) => void;

  addNote: (text: string, attachedToId?: string | null) => string;
  updateNote: (id: string, updates: Partial<DiagramNote>) => void;
  deleteNote: (id: string) => void;
  setNoteStyle: (id: string, style: Partial<NoteStyle>) => void;

  addBoundary: (label: string) => string;
  updateBoundary: (id: string, updates: Partial<DiagramBoundary>) => void;
  deleteBoundary: (id: string) => void;
  setBoundaryStyle: (id: string, style: Partial<BoundaryStyle>) => void;

  manualLayout: boolean;
  setManualLayout: (manual: boolean) => void;
  autoLayout: () => void;

  selectedNoteId: string | null;
  selectedBoundaryId: string | null;
  selectNote: (id: string | null) => void;
  selectBoundary: (id: string | null) => void;

  showNoteForm: boolean;
  editingNoteId: string | null;
  showBoundaryForm: boolean;
  editingBoundaryId: string | null;
  setShowNoteForm: (show: boolean, editId?: string | null) => void;
  setShowBoundaryForm: (show: boolean, editId?: string | null) => void;

  showListView: boolean;
  toggleListView: () => void;
  duplicateEntity: (id: string) => string | null;

  loadProject: (project: ArchLensProject) => void;
  getProject: () => ArchLensProject;
  newProject: () => void;

  addTraceabilityLink: (sourceId: string, targetId: string, type: TraceabilityType, label?: string) => string;
  deleteTraceabilityLink: (id: string) => void;

  getVisibleEntities: () => ArchEntity[];
  getVisibleRelationships: () => Relationship[];
  getChildrenOf: (parentId: string) => ArchEntity[];

  // ── Autosave settings ──────────────────────────────────────
  autosaveEnabled: boolean;
  autosaveInterval: number;   // seconds
  setAutosaveEnabled: (enabled: boolean) => void;
  setAutosaveInterval: (seconds: number) => void;
  // ── Canvas zoom sensitivity ──────────────────────────────────────────────────
  zoomSensitivity: number;    // 0.01 – 0.30, default 0.08
  setZoomSensitivity: (v: number) => void;
  // ── Canvas panel visibility ────────────────────────────────
  showMinimap: boolean;
  showValidationPanel: boolean;
  showViewsPanel: boolean;
  toggleShowMinimap: () => void;
  toggleShowValidationPanel: () => void;
  toggleShowViewsPanel: () => void;
  // ── Inspect mode ──────────────────────────────────────────
  inspectMode: boolean;
  toggleInspectMode: () => void;
  // ── Expand in place ───────────────────────────────────────
  expandedEntityIds: Set<string>;
  toggleExpandEntity: (id: string) => void;
  collapseAllEntities: () => void;
}

// ─── SLICE HELPER TYPES ──────────────────────────────────────────

export type StoreSet = (
  partial: Partial<ArchLensState> | ((state: ArchLensState) => Partial<ArchLensState>),
) => void;
export type StoreGet = () => ArchLensState;

// The diagram-data slice we track for undo/redo.
export type DiagramSnapshot = Pick<
  ArchLensState,
  'entities' | 'relationships' | 'positions' | 'notes' | 'boundaries' | 'traceabilityLinks'
>;
