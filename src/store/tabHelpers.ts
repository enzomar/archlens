import type { DiagramTab } from '../domain/types';
import type { ArchLensState } from './storeTypes';
import { DEFAULT_VISUAL_CONFIG } from './storeTypes';

export function emptyTabData(): Omit<DiagramTab, 'id' | 'name'> {
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

export function saveStateToTab(s: ArchLensState, tabId: string): DiagramTab[] {
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

export function restoreTabToState(tab: DiagramTab): Partial<ArchLensState> {
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
