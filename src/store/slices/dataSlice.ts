import { v4 as uuid } from 'uuid';
import type {
  ArchEntity,
  Relationship,
  DiagramNote,
  DiagramBoundary,
  DiagramTab,
  SavedView,
  NoteStyle,
  BoundaryStyle,
  ArchLensProject,
  ViewFilters,
} from '../../domain/types';
import { DEFAULT_NOTE_STYLE, DEFAULT_BOUNDARY_STYLE, inferViewpoint, getKindsForViewpointLevel } from '../../domain/types';
import type { StoreSet, StoreGet } from '../storeTypes';
import { DEFAULT_VISUAL_CONFIG } from '../storeTypes';
import { emptyTabData, saveStateToTab, restoreTabToState } from '../tabHelpers';

// ── Shared filter helper ──────────────────────────────────────────
function applyFilters(entities: ArchEntity[], f: ViewFilters): ArchEntity[] {
  let result = entities;
  if (f.kinds?.length)            result = result.filter((e) => f.kinds!.includes(e.kind));
  if (f.maturities?.length)       result = result.filter((e) => e.metadata.maturity != null && f.maturities!.includes(e.metadata.maturity!));
  if (f.tags?.length)             result = result.filter((e) => f.tags!.some((t) => e.metadata.tags.includes(t)));
  if (f.deploymentStages?.length) result = result.filter((e) => e.metadata.deploymentStage != null && f.deploymentStages!.includes(e.metadata.deploymentStage!));
  return result;
}

export const createDataSlice = (set: StoreSet, get: StoreGet, initialTab: DiagramTab) => ({
  projectName: 'Untitled Project',
  projectDescription: '',
  views: [] as SavedView[],
  notes: [] as DiagramNote[],
  boundaries: [] as DiagramBoundary[],
  tabs: [initialTab] as DiagramTab[],
  activeTabId: initialTab.id as string | null,

  // ── Notes ─────────────────────────────────────────────────────

  addNote: (text: string, attachedToId: string | null = null) => {
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

  updateNote: (id: string, updates: Partial<DiagramNote>) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates, id } : n)),
    }));
  },

  deleteNote: (id: string) => {
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
    }));
    get().addLogEntry('warn', `Note deleted`);
  },

  setNoteStyle: (id: string, style: Partial<NoteStyle>) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, style: { ...n.style, ...style } } : n
      ),
    }));
  },

  // ── Boundaries ────────────────────────────────────────────────

  addBoundary: (label: string) => {
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

  updateBoundary: (id: string, updates: Partial<DiagramBoundary>) => {
    set((s) => ({
      boundaries: s.boundaries.map((b) => (b.id === id ? { ...b, ...updates, id } : b)),
    }));
  },

  deleteBoundary: (id: string) => {
    const label = get().boundaries.find((b) => b.id === id)?.label ?? id;
    set((s) => ({
      boundaries: s.boundaries.filter((b) => b.id !== id),
      selectedBoundaryId: s.selectedBoundaryId === id ? null : s.selectedBoundaryId,
    }));
    get().addLogEntry('warn', `Boundary deleted: "${label}"`);
  },

  setBoundaryStyle: (id: string, style: Partial<BoundaryStyle>) => {
    set((s) => ({
      boundaries: s.boundaries.map((b) =>
        b.id === id ? { ...b, style: { ...b.style, ...style } } : b
      ),
    }));
  },

  // ── Tabs ────────────────────────────────────────────────────

  addTab: (name?: string) => {
    const s = get();
    const newTabId = uuid();
    const tabName = name ?? `Diagram ${s.tabs.length + 1}`;
    const savedTabs = s.activeTabId ? saveStateToTab(s, s.activeTabId) : s.tabs;
    const newTab: DiagramTab = { id: newTabId, name: tabName, ...emptyTabData() };
    set({
      tabs: [...savedTabs, newTab],
      activeTabId: newTabId,
      ...restoreTabToState(newTab),
    });
  },

  closeTab: (tabId: string) => {
    const s = get();
    const newTabs = s.tabs.filter((t) => t.id !== tabId);

    if (s.activeTabId !== tabId) {
      set({ tabs: newTabs });
      return;
    }

    if (newTabs.length === 0) {
      set({ tabs: [], activeTabId: null, ...restoreTabToState({ ...emptyTabData(), id: '', name: '' }) });
      return;
    }

    const newActive = newTabs[newTabs.length - 1];
    set({ tabs: newTabs, activeTabId: newActive.id, ...restoreTabToState(newActive) });
  },

  switchTab: (tabId: string) => {
    const s = get();
    if (!s.activeTabId || tabId === s.activeTabId) return;
    const savedTabs = saveStateToTab(s, s.activeTabId);
    const target = savedTabs.find((t) => t.id === tabId);
    if (!target) return;
    set({ tabs: savedTabs, activeTabId: tabId, ...restoreTabToState(target) });
  },

  renameTab: (tabId: string, name: string) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, name } : t)),
    }));
  },

  // ── Views ───────────────────────────────────────────────────

  saveView: (name: string) => {
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

  loadView: (viewId: string) => {
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

  deleteView: (viewId: string) => {
    const name = get().views.find((v) => v.id === viewId)?.name ?? viewId;
    set((s) => ({ views: s.views.filter((v) => v.id !== viewId) }));
    get().addLogEntry('warn', `View deleted: "${name}"`);
  },

  // ── Persistence ─────────────────────────────────────────────

  loadProject: (project: ArchLensProject) => {
    const migrateEntities = (entities: ArchEntity[]): ArchEntity[] =>
      entities.map((e) => ({
        ...e,
        viewpoint: e.viewpoint ?? inferViewpoint(e.kind),
      }));

    const migrateTab = (t: DiagramTab): DiagramTab => ({
      ...t,
      entities: migrateEntities(t.entities),
      traceabilityLinks: t.traceabilityLinks ?? [],
      viewpoint: t.viewpoint ?? 'application',
      // Merge with defaults so new fields introduced in later versions always have a value.
      // Old projects had a single `edgeRouting` field; migrate to the new dual-routing shape.
      visualConfig: {
        ...DEFAULT_VISUAL_CONFIG,
        ...(t.visualConfig ?? {}),
        edgeRoutingContainment: (t.visualConfig as any)?.edgeRoutingContainment ?? (t.visualConfig as any)?.edgeRouting ?? DEFAULT_VISUAL_CONFIG.edgeRoutingContainment,
        edgeRoutingExternal: (t.visualConfig as any)?.edgeRoutingExternal ?? DEFAULT_VISUAL_CONFIG.edgeRoutingExternal,
      } as DiagramTab['visualConfig'],
    });

    let tabs: DiagramTab[];
    let activeTabId: string;

    if (project.tabs && project.tabs.length > 0) {
      tabs = project.tabs.map(migrateTab);
      activeTabId = (project.activeTabId && tabs.some((t) => t.id === project.activeTabId))
        ? project.activeTabId!
        : tabs[0].id;
    } else {
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

  getProject: (): ArchLensProject => {
    const s = get();
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

  // ── Computed selectors ──────────────────────────────────────

  getVisibleEntities: (): ArchEntity[] => {
    const s = get();

    // ── Drill-down view ──────────────────────────────────────────
    if (s.focusEntityId) {
      const allowedKinds = new Set(getKindsForViewpointLevel(s.viewpoint, s.zoomLevel));
      const visible = s.entities.filter(
        (e) => e.parentId === s.focusEntityId && allowedKinds.has(e.kind),
      );
      return applyFilters(visible, s.filters);
    }

    // ── Standard C4 multi-select view ───────────────────────────
    const allowedKinds = new Set<string>();
    for (const vp of s.activeViewpoints) {
      for (const zl of s.activeZoomLevels) {
        for (const k of getKindsForViewpointLevel(vp, zl)) allowedKinds.add(k);
      }
    }

    const visibleIds = new Set<string>();
    const visible: ArchEntity[] = [];

    // Seed with direct matches
    for (const e of s.entities) {
      if (allowedKinds.has(e.kind) && s.activeViewpoints.includes(e.viewpoint)) {
        visible.push(e);
        visibleIds.add(e.id);
      }
    }

    // Walk up ancestry once per entity — O(n × depth) instead of O(n²)
    const entityMap = new Map(s.entities.map((e) => [e.id, e]));
    for (const e of [...visible]) {
      let pid = e.parentId;
      while (pid && !visibleIds.has(pid)) {
        const parent = entityMap.get(pid);
        if (!parent || !s.activeViewpoints.includes(parent.viewpoint)) break;
        visible.push(parent);
        visibleIds.add(pid);
        pid = parent.parentId;
      }
    }

    let result = applyFilters(visible, s.filters);

    // ── Expand in place: reveal children of expanded entities ───
    if (s.expandedEntityIds.size > 0) {
      const expandedIds = s.expandedEntityIds;
      let expanding = true;
      while (expanding) {
        expanding = false;
        const currentIds = new Set(result.map((e) => e.id));
        for (const expandedId of expandedIds) {
          if (!currentIds.has(expandedId)) continue;
          for (const child of s.entities) {
            if (child.parentId === expandedId && !currentIds.has(child.id)) {
              result = [...result, child];
              expanding = true;
            }
          }
        }
      }
    }

    return result;
  },

  getVisibleRelationships: (): Relationship[] => {
    const s = get();
    const visibleIds = new Set(s.getVisibleEntities().map((e) => e.id));
    return s.relationships.filter(
      (r) => visibleIds.has(r.sourceId) && visibleIds.has(r.targetId)
    );
  },

  getChildrenOf: (parentId: string): ArchEntity[] => {
    return get().entities.filter((e) => e.parentId === parentId);
  },
});
