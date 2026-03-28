import type { ZoomLevel, DiagramMode, Viewpoint } from '../../domain/types';
import { DRILLABLE_KINDS, NODE_DIMENSIONS } from '../../domain/types';
import type { StoreSet, StoreGet } from '../storeTypes';

export const createNavigationSlice = (set: StoreSet, get: StoreGet) => ({
  zoomLevel: 'context' as ZoomLevel,
  viewpoint: 'application' as Viewpoint,
  focusEntityId: null as string | null,
  breadcrumb: [] as { id: string; name: string; level: ZoomLevel }[],
  diagramMode: 'focused' as DiagramMode,

  setZoomLevel: (level: ZoomLevel) => {
    set({ zoomLevel: level, focusEntityId: null, breadcrumb: [] });
    get().addLogEntry('debug', `Zoom level changed to ${level}`);
  },

  setDiagramMode: (mode: DiagramMode) => {
    set({ diagramMode: mode });
    get().addLogEntry('debug', `Diagram mode changed to ${mode}`);
  },

  setViewpoint: (vp: Viewpoint) => {
    set({ viewpoint: vp, focusEntityId: null, breadcrumb: [] });
    get().addLogEntry('debug', `Viewpoint changed to ${vp}`);
  },

  setFocusEntity: (id: string | null) => set({ focusEntityId: id }),

  drillDown: (entityId: string) => {
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
      set({
        zoomLevel: target.level,
        focusEntityId: index > 0 ? newBreadcrumb[index - 1].id : null,
        breadcrumb: newBreadcrumb.slice(0, index),
        selectedEntityId: null,
      });
    }
    get().addLogEntry('debug', `Navigated to breadcrumb: ${target.name}`);
  },
});
