import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store/useStore';
import { EntityNode } from './EntityNode';
import { RelationshipEdge, EdgeDefs, rectEdgePoint } from './RelationshipEdge';
import { NoteNode } from './NoteNode';
import { BoundaryBox } from './BoundaryBox';
import { computeElkLayout } from '../../layout/elkLayout';
import { KIND_COLORS, NODE_DIMENSIONS, NODE_DIMENSIONS_EXTENDED, VIEWPOINT_LABELS, VIEWPOINT_COLORS, VIEWPOINT_BG_COLORS, ZOOM_LEVEL_LABELS } from '../../domain/types';
import type { EntityKind, EdgeType, Viewpoint, HighlightShape } from '../../domain/types';
import { getValidKindsForViewpoint } from '../../utils/validation';
import { CanvasContextMenu } from './CanvasContextMenu';
import type { ContextMenuTarget } from './CanvasContextMenu';
import { CanvasLegend } from './CanvasLegend';
import { InspectOverlay } from './InspectOverlay';
import type { InspectTarget } from './InspectOverlay';
import { EXAMPLE_PROJECT } from '../../utils/exampleData';

/** Minimum distance from point (px,py) to line segment (ax,ay)-(bx,by) */
function ptToSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}

/** Minimum distance from point to a polyline (array of {x,y}) */
function minDistToPolyline(wx: number, wy: number, pts: { x: number; y: number }[]): number {
  let min = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    min = Math.min(min, ptToSegDist(wx, wy, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y));
  }
  return min;
}

/**
 * SVG paint order for entity kinds.
 * Lower = rendered first (behind); higher = rendered last (in front).
 *
 * Desired stack (back → front):
 *   ArchiMate layer entities (0)
 *   → C4 Context – person / system (1)
 *   → C4 Container – container / AI / infra (2)
 *   → C4 Component – component / retriever / artifact (3)
 *
 * Manual boundaries and swimlane backgrounds live in separate SVG layers
 * that are already positioned correctly (behind all entity nodes).
 * NoteNodes live in a layer above all entities.
 */
const ENTITY_Z_ORDER: Partial<Record<string, number>> = {
  // ── ArchiMate / infrastructure entities (deepest) ──────────────
  'stakeholder': 0, 'goal': 0, 'capability': 0, 'requirement': 0,
  'business-actor': 0, 'business-role': 0, 'business-process': 0,
  'business-service': 0, 'business-object': 0, 'business-event': 0,
  'business-interface': 0, 'contract': 0,
  'node': 0, 'device': 0, 'system-software': 0, 'technology-service': 0,
  'communication-network': 0, 'technology-interface': 0,
  'application-component': 0, 'application-service': 0, 'application-function': 0,
  'application-interface': 0, 'application-process': 0, 'data-object': 0,
  // ── C4 Context (person / system) ───────────────────────────────
  'person': 1, 'system': 1,
  // ── C4 Container (container-level kinds) ───────────────────────
  'container': 2, 'aimodel': 2, 'vectorstore': 2,
  // ── C4 Component (finest-grain — always in front) ──────────────
  'component': 3, 'retriever': 3, 'evaluation': 3, 'artifact': 3, 'trigger': 3,
};

type ResizeHandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_CURSOR: Record<ResizeHandleType, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', e: 'e-resize',
  se: 'se-resize', s: 's-resize', sw: 'sw-resize', w: 'w-resize',
};

export const DiagramCanvas: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ entityId: string; offsetX: number; offsetY: number } | null>(null);
  const [draggingNote, setDraggingNote] = useState<{ noteId: string; offsetX: number; offsetY: number } | null>(null);
  const [draggingBoundary, setDraggingBoundary] = useState<{ boundaryId: string; offsetX: number; offsetY: number } | null>(null);
  const [draggingParentGroup, setDraggingParentGroup] = useState<{
    parentId: string;
    childIds: string[];
    startMouseX: number;
    startMouseY: number;
    startPositions: Map<string, { x: number; y: number }>;
  } | null>(null);
  const [resizing, setResizing] = useState<{
    kind: 'boundary' | 'note';
    id: string;
    handle: ResizeHandleType;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; target: ContextMenuTarget } | null>(null);
  // Drag-to-connect: tracks an in-progress edge being drawn from an entity border
  const [connecting, setConnecting] = useState<{
    sourceId: string;
    curX: number; // world-space cursor
    curY: number;
    overEntityId: string | null;
  } | null>(null);

  const [rubberBand, setRubberBand] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  // ── Canvas interaction mode ───────────────────────────────────
  const canvasMode = useStore((s) => s.canvasMode);
  const setCanvasMode = useStore((s) => s.setCanvasMode);
  const inspectMode = canvasMode === 'inspect';
  const laserMode = canvasMode === 'laser';
  const [inspectTarget, setInspectTarget] = useState<InspectTarget | null>(null);
  const [inspectMouse, setInspectMouse] = useState({ x: 0, y: 0 });
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);

  // ── Alignment guides ─────────────────────────────────────────
  // Each guide is a canvas-space line shown while dragging.
  type AlignGuide = { orientation: 'h' | 'v'; value: number; span: [number, number] };
  const [alignGuides, setAlignGuides] = useState<AlignGuide[]>([]);

  /** Snap threshold in canvas pixels — guides appear within this distance. */
  const ALIGN_THRESH = 6;

  // Global mousemove for laser: tracks position even when the SVG re-renders
  // during auto-layout, so the dot never disappears mid-session.
  useEffect(() => {
    if (!laserMode) { setLaserPos(null); return; }
    const onMove = (e: MouseEvent) => setLaserPos({ x: e.clientX, y: e.clientY });
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [laserMode]);

  // ── Highlight / spotlight drawing state ──────────────────────
  const highlightShapes = useStore((s) => s.highlightShapes);
  const highlightShapeType = useStore((s) => s.highlightShapeType);
  const addHighlightShape = useStore((s) => s.addHighlightShape);
  const selectedHighlightId = useStore((s) => s.selectedHighlightId);
  const selectHighlight = useStore((s) => s.selectHighlight);
  const [drawingHighlight, setDrawingHighlight] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  const entities = useStore((s) => s.entities);
  const relationships = useStore((s) => s.relationships);
  const positions = useStore((s) => s.positions);
  const selectedEntityId = useStore((s) => s.selectedEntityId);
  const selectedEntityIds = useStore((s) => s.selectedEntityIds);
  const selectedRelationshipId = useStore((s) => s.selectedRelationshipId);
  const visualConfig = useStore((s) => s.visualConfig);
  const panX = useStore((s) => s.panX);
  const panY = useStore((s) => s.panY);
  const scale = useStore((s) => s.scale);

  const selectEntity = useStore((s) => s.selectEntity);
  const toggleSelectEntity = useStore((s) => s.toggleSelectEntity);
  const selectEntities = useStore((s) => s.selectEntities);
  const clearMultiSelect = useStore((s) => s.clearMultiSelect);
  const selectRelationship = useStore((s) => s.selectRelationship);
  const setShowRelationshipForm = useStore((s) => s.setShowRelationshipForm);
  const openNewRelationship = useStore((s) => s.openNewRelationship);
  const toggleExpandEntity = useStore((s) => s.toggleExpandEntity);
  const setPosition = useStore((s) => s.setPosition);
  const setPan = useStore((s) => s.setPan);
  const autoLayout = useStore((s) => s.autoLayout);
  const manualLayout = useStore((s) => s.manualLayout);
  const setManualLayout = useStore((s) => s.setManualLayout);
  const swimlaneOrientation = useStore((s) => s.swimlaneOrientation);
  const uiMode = useStore((s) => s.uiMode);
  const isReadOnly = uiMode === 'presentation';

  const projectName = useStore((s) => s.projectName);
  const zoomLevel = useStore((s) => s.zoomLevel);
  const viewpoint = useStore((s) => s.viewpoint);
  const focusEntityId = useStore((s) => s.focusEntityId);
  const activeViewpoints = useStore((s) => s.activeViewpoints);
  const activeZoomLevels = useStore((s) => s.activeZoomLevels);

  const notes = useStore((s) => s.notes);
  const boundaries = useStore((s) => s.boundaries);
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const selectedBoundaryId = useStore((s) => s.selectedBoundaryId);
  const selectNote = useStore((s) => s.selectNote);
  const selectBoundary = useStore((s) => s.selectBoundary);
  const updateNote = useStore((s) => s.updateNote);
  const updateBoundary = useStore((s) => s.updateBoundary);
  const addEntity = useStore((s) => s.addEntity);
  const addNote = useStore((s) => s.addNote);
  const addBoundary = useStore((s) => s.addBoundary);

  const getVisibleEntities = useStore((s) => s.getVisibleEntities);
  const getVisibleRelationships = useStore((s) => s.getVisibleRelationships);

  // Derive visible sets once per render; stabilise IDs so useEffect deps
  // don't change on every render when the actual data hasn't changed.
  const visibleEntities = getVisibleEntities();
  const visibleRelationships = getVisibleRelationships();
  const visibleEntityKey = useMemo(
    () => visibleEntities.map((e) => e.id).join(','),
    [visibleEntities],
  );
  const visibleRelKey = useMemo(
    () => visibleRelationships.map((r) => r.id).join(','),
    [visibleRelationships],
  );

  // Guard against concurrent / redundant layout runs.
  const layoutRunning = useRef(false);

  // Auto layout on mount or when visible entities/relationships change
  useEffect(() => {
    if (visibleEntities.length === 0) return;

    if (!manualLayout) {
      if (layoutRunning.current) return;
      layoutRunning.current = true;
      autoLayout().finally(() => { layoutRunning.current = false; });
      return;
    }

    // Manual mode: only assign positions to brand-new entities
    const posMap = new Map(positions.map((p) => [p.entityId, p]));
    const needsLayout = visibleEntities.some((e) => !posMap.has(e.id));
    if (needsLayout) {
      // Exclude parent-frame entities from layout
      const childParentIds = new Set<string>();
      for (const e of visibleEntities) {
        if (e.parentId && visibleEntities.some((p) => p.id === e.parentId)) {
          childParentIds.add(e.parentId);
        }
      }
      const layoutEntities = visibleEntities.filter((e) => !childParentIds.has(e.id));
      computeElkLayout(layoutEntities, positions, visualConfig.nodeDisplayMode, visibleRelationships, activeViewpoints, activeZoomLevels, swimlaneOrientation, visualConfig.edgeRoutingContainment).then((result) => {
        const posMap2 = new Map(positions.map((p) => [p.entityId, p]));
        for (const pos of result.positions) {
          if (!posMap2.has(pos.entityId)) {
            setPosition(pos.entityId, pos.x, pos.y);
          }
        }
      });
    }
  }, [visibleEntityKey, visibleRelKey, manualLayout, activeViewpoints.join(','), activeZoomLevels.join(','), visualConfig.edgeRoutingContainment, visualConfig.edgeRoutingExternal, visualConfig.nodeDisplayMode, swimlaneOrientation]);

  // Space key: activates pan-override mode (Space + drag)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpaceDown(true);
        return;
      }

      // Arrow keys: pan the canvas
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 200 : 60;
        const s = useStore.getState();
        const dx = e.key === 'ArrowLeft' ? step : e.key === 'ArrowRight' ? -step : 0;
        const dy = e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0;
        s.setPan(s.panX + dx, s.panY + dy);
        return;
      }

      // Canvas mode shortcuts: V = select, H = pan (hand), I = inspect
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat) {
        if (e.key === 'v' || e.key === 'V') { setCanvasMode('select'); return; }
        if (e.key === 'h' || e.key === 'H') { setCanvasMode('pan'); return; }
        if (e.key === 'i' || e.key === 'I') { setCanvasMode('inspect'); return; }
        if (e.key === 'l' || e.key === 'L') { setCanvasMode('highlight'); return; }
        if (e.key === 'p' || e.key === 'P') { setCanvasMode('laser'); return; }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.repeat) {
        const state = useStore.getState();
        if (state.selectedHighlightId) {
          e.preventDefault();
          state.removeHighlightShape(state.selectedHighlightId);
        } else if (state.selectedEntityIds.size > 0) {
          e.preventDefault();
          state.deleteSelectedEntities();
        } else if (state.selectedEntityId) {
          e.preventDefault();
          state.deleteEntity(state.selectedEntityId);
        } else if (state.selectedNoteId) {
          e.preventDefault();
          state.deleteNote(state.selectedNoteId);
        } else if (state.selectedBoundaryId) {
          e.preventDefault();
          state.deleteBoundary(state.selectedBoundaryId);
        } else if (state.selectedRelationshipId) {
          e.preventDefault();
          state.deleteRelationship(state.selectedRelationshipId);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceDown(false);
        setPanning(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Window-level pan tracking: panning continues even when pointer leaves the SVG
  useEffect(() => {
    if (!panning) return;
    const onMove = (e: MouseEvent) => {
      setPan(
        panning.startPanX + (e.clientX - panning.startX),
        panning.startPanY + (e.clientY - panning.startY),
      );
    };
    const onUp = () => setPanning(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [panning]);

  const posMap = useMemo(() => new Map(positions.map((p) => [p.entityId, p])), [positions]);
  const entityMap = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);

  // Max TPS across all entities (for dynamic edge animation scaling)
  const maxTps = useMemo(() => {
    let max = 0;
    for (const e of entities) {
      if (e.metadata.tps != null && e.metadata.tps > max) max = e.metadata.tps;
    }
    return max;
  }, [entities]);

  // ── Drag handling ────────────────────────────────────────────

  const handleDragStart = useCallback((entityId: string, clientX: number, clientY: number) => {
    if (isReadOnly) return;
    // Pan mode: override entity drag → start panning
    if (canvasMode === 'pan') {
      setPanning({ startX: clientX, startY: clientY, startPanX: panX, startPanY: panY });
      return;
    }
    const pos = posMap.get(entityId);
    if (!pos) return;
    // If this entity is part of a multi-selection, bulk-drag all selected
    const state = useStore.getState();
    if (state.selectedEntityIds.size > 1 && state.selectedEntityIds.has(entityId)) {
      // Store offsets for all selected entities
      setDragging({
        entityId, // anchor entity
        offsetX: clientX / scale - pos.x - panX / scale,
        offsetY: clientY / scale - pos.y - panY / scale,
      });
      return;
    }
    setDragging({
      entityId,
      offsetX: clientX / scale - pos.x - panX / scale,
      offsetY: clientY / scale - pos.y - panY / scale,
    });
  }, [positions, scale, panX, panY]);

  const handleNoteDragStart = useCallback((noteId: string, clientX: number, clientY: number) => {
    if (isReadOnly) return;
    if (canvasMode === 'pan') {
      setPanning({ startX: clientX, startY: clientY, startPanX: panX, startPanY: panY });
      return;
    }
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    setDraggingNote({
      noteId,
      offsetX: clientX / scale - note.x - panX / scale,
      offsetY: clientY / scale - note.y - panY / scale,
    });
  }, [notes, scale, panX, panY]);

  // Drag a parent-group frame: moves the parent entity + all its visible children as a unit
  const handleParentGroupDragStart = useCallback((parentId: string, clientX: number, clientY: number) => {
    if (isReadOnly) return;
    if (canvasMode === 'pan') {
      setPanning({ startX: clientX, startY: clientY, startPanX: panX, startPanY: panY });
      return;
    }
    // Collect all visible entities that are children of this parent, plus the parent itself
    const childIds = visibleEntities
      .filter((e) => e.parentId === parentId)
      .map((e) => e.id);
    const allIds = [parentId, ...childIds];
    const startPositions = new Map<string, { x: number; y: number }>();
    for (const id of allIds) {
      const pos = posMap.get(id);
      if (pos) startPositions.set(id, { x: pos.x, y: pos.y });
    }
    if (startPositions.size === 0) return;
    setDraggingParentGroup({
      parentId,
      childIds: allIds,
      startMouseX: clientX / scale - panX / scale,
      startMouseY: clientY / scale - panY / scale,
      startPositions,
    });
  }, [isReadOnly, visibleEntities, posMap, scale, panX, panY]);

  const handleBoundaryDragStart = useCallback((boundaryId: string, clientX: number, clientY: number) => {
    if (isReadOnly) return;
    if (canvasMode === 'pan') {
      setPanning({ startX: clientX, startY: clientY, startPanX: panX, startPanY: panY });
      return;
    }
    const boundary = boundaries.find((b) => b.id === boundaryId);
    if (!boundary) return;
    setDraggingBoundary({
      boundaryId,
      offsetX: clientX / scale - boundary.x - panX / scale,
      offsetY: clientY / scale - boundary.y - panY / scale,
    });
  }, [boundaries, scale, panX, panY]);

  const handleBoundaryResizeStart = useCallback((id: string, handle: ResizeHandleType, clientX: number, clientY: number) => {
    if (isReadOnly) return;
    const boundary = boundaries.find((b) => b.id === id);
    if (!boundary) return;
    setResizing({ kind: 'boundary', id, handle, startClientX: clientX, startClientY: clientY, origX: boundary.x, origY: boundary.y, origW: boundary.width, origH: boundary.height });
  }, [isReadOnly, boundaries]);

  const handleNoteResizeStart = useCallback((id: string, handle: ResizeHandleType, clientX: number, clientY: number) => {
    if (isReadOnly) return;
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    setResizing({ kind: 'note', id, handle, startClientX: clientX, startClientY: clientY, origX: note.x, origY: note.y, origW: note.width, origH: note.height });
  }, [isReadOnly, notes]);

  const GRID_SIZE = 20;
  const snap = visualConfig.snapToGrid;
  const snapVal = (v: number) => snap ? Math.round(v / GRID_SIZE) * GRID_SIZE : v;

  /* ── Drag-and-drop from shape palette ──────────────────── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isReadOnly) return;
    if (e.dataTransfer.types.includes('application/archlens-shape')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [isReadOnly]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (isReadOnly) return;
    const payload = e.dataTransfer.getData('application/archlens-shape');
    if (!payload) return;
    e.preventDefault();

    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const wx = snapVal((e.clientX - svgRect.left - panX) / scale);
    const wy = snapVal((e.clientY - svgRect.top - panY) / scale);

    if (payload.startsWith('entity:')) {
      const kind = payload.slice(7) as EntityKind;
      const vpState = useStore.getState().viewpoint;
      if (!getValidKindsForViewpoint(vpState, zoomLevel).includes(kind)) return;
      const id = addEntity({
        name: `New ${kind.charAt(0).toUpperCase() + kind.slice(1)}`,
        shortName: kind.slice(0, 3).toUpperCase(),
        description: '',
        kind,
        viewpoint: vpState,
        parentId: useStore.getState().focusEntityId,
        metadata: { tags: [] },
        responsibilities: [],
      });
      setPosition(id, wx, wy);
      setManualLayout(true);
      selectEntity(id);
    } else if (payload === 'note') {
      const id = addNote('New note');
      updateNote(id, { x: wx, y: wy });
    } else if (payload === 'boundary') {
      const id = addBoundary('Boundary');
      updateBoundary(id, { x: wx, y: wy });
    }
  }, [isReadOnly, panX, panY, scale, snap, zoomLevel, addEntity, setPosition, setManualLayout, selectEntity, addNote, updateNote, addBoundary, updateBoundary]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Panning is handled by the window-level effect so it works outside SVG bounds.
    if (resizing) {
      const dx = (e.clientX - resizing.startClientX) / scale;
      const dy = (e.clientY - resizing.startClientY) / scale;
      const MIN = 40;
      let newX = resizing.origX, newY = resizing.origY;
      let newW = resizing.origW, newH = resizing.origH;

      if (resizing.handle.includes('w')) {
        const rawLeft = snapVal(resizing.origX + dx);
        const right = resizing.origX + resizing.origW;
        newX = Math.min(rawLeft, right - MIN);
        newW = right - newX;
      }
      if (resizing.handle.includes('e')) {
        newW = Math.max(MIN, snapVal(resizing.origX + resizing.origW + dx) - resizing.origX);
      }
      if (resizing.handle.includes('n')) {
        const rawTop = snapVal(resizing.origY + dy);
        const bottom = resizing.origY + resizing.origH;
        newY = Math.min(rawTop, bottom - MIN);
        newH = bottom - newY;
      }
      if (resizing.handle.includes('s')) {
        newH = Math.max(MIN, snapVal(resizing.origY + resizing.origH + dy) - resizing.origY);
      }

      if (resizing.kind === 'boundary') {
        updateBoundary(resizing.id, { x: newX, y: newY, width: newW, height: newH });
      } else {
        updateNote(resizing.id, { x: newX, y: newY, width: newW, height: newH });
      }
      return;
    }
    if (connecting) {
      const wx = (e.clientX - panX) / scale;
      const wy = (e.clientY - panY) / scale;
      // Hit-test: find which visible entity the cursor is over (skip source)
      const DIMS_MAP = visualConfig.nodeDisplayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;
      let overEntityId: string | null = null;
      for (const entity of visibleEntities) {
        if (entity.id === connecting.sourceId) continue;
        const pos = posMap.get(entity.id);
        if (!pos) continue;
        const d = DIMS_MAP[entity.kind];
        if (wx >= pos.x && wx <= pos.x + d.width && wy >= pos.y && wy <= pos.y + d.height) {
          overEntityId = entity.id;
          break;
        }
      }
      setConnecting({ ...connecting, curX: wx, curY: wy, overEntityId });
      return;
    }
    if (rubberBand) {
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const wx = (e.clientX - svgRect.left - panX) / scale;
      const wy = (e.clientY - svgRect.top - panY) / scale;
      setRubberBand({ ...rubberBand, endX: wx, endY: wy });
      return;
    }
    if (drawingHighlight) {
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const wx = (e.clientX - svgRect.left - panX) / scale;
      const wy = (e.clientY - svgRect.top - panY) / scale;
      setDrawingHighlight({ ...drawingHighlight, endX: wx, endY: wy });
      return;
    }
    if (dragging) {
      const newX = snapVal(e.clientX / scale - dragging.offsetX - panX / scale);
      const newY = snapVal(e.clientY / scale - dragging.offsetY - panY / scale);
      const state = useStore.getState();
      // Bulk drag: move all selected entities by the same delta
      if (state.selectedEntityIds.size > 1 && state.selectedEntityIds.has(dragging.entityId)) {
        const anchorPos = posMap.get(dragging.entityId);
        if (anchorPos) {
          const dx = newX - anchorPos.x;
          const dy = newY - anchorPos.y;
          for (const id of state.selectedEntityIds) {
            const p = posMap.get(id);
            if (p) setPosition(id, snapVal(p.x + dx), snapVal(p.y + dy));
          }
        }
      } else {
        setPosition(dragging.entityId, newX, newY);
      }

      // ── Compute alignment guides (only when feature is enabled) ─────────
      if (!visualConfig.showAlignGuides) { setAlignGuides([]); }
      else {
      const DIMS_MAP_AG = visualConfig.nodeDisplayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;
      const draggedKind = visibleEntities.find((en) => en.id === dragging.entityId)?.kind;
      const draggedDim = (draggedKind ? DIMS_MAP_AG[draggedKind] : undefined) ?? { width: 160, height: 80 };
      // Edges of the dragged node
      const dLeft   = newX;
      const dCenterX = newX + draggedDim.width / 2;
      const dRight  = newX + draggedDim.width;
      const dTop    = newY;
      const dCenterY = newY + draggedDim.height / 2;
      const dBottom = newY + draggedDim.height;

      const guides: AlignGuide[] = [];
      // Span of all nodes for extending guide lines across the canvas
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const ent of visibleEntities) {
        if (ent.id === dragging.entityId) continue;
        const p = posMap.get(ent.id); if (!p) continue;
        const d = DIMS_MAP_AG[ent.kind] ?? { width: 160, height: 80 };
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x + d.width);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y + d.height);
      }
      const spanX: [number, number] = [Math.min(minX, dLeft) - 20, Math.max(maxX, dRight) + 20];
      const spanY: [number, number] = [Math.min(minY, dTop)  - 20, Math.max(maxY, dBottom) + 20];

      for (const ent of visibleEntities) {
        if (ent.id === dragging.entityId) continue;
        const p = posMap.get(ent.id); if (!p) continue;
        const d = DIMS_MAP_AG[ent.kind] ?? { width: 160, height: 80 };
        const oLeft    = p.x;
        const oCenterX = p.x + d.width / 2;
        const oRight   = p.x + d.width;
        const oTop     = p.y;
        const oCenterY = p.y + d.height / 2;
        const oBottom  = p.y + d.height;
        // Vertical guides (check X edges)
        for (const [dv, ov] of [
          [dLeft, oLeft], [dLeft, oCenterX], [dLeft, oRight],
          [dCenterX, oLeft], [dCenterX, oCenterX], [dCenterX, oRight],
          [dRight, oLeft], [dRight, oCenterX], [dRight, oRight],
        ] as [number, number][]) {
          if (Math.abs(dv - ov) <= ALIGN_THRESH) {
            if (!guides.some((g) => g.orientation === 'v' && Math.abs(g.value - ov) < 1)) {
              guides.push({ orientation: 'v', value: ov, span: spanY });
            }
          }
        }
        // Horizontal guides (check Y edges)
        for (const [dv, ov] of [
          [dTop, oTop], [dTop, oCenterY], [dTop, oBottom],
          [dCenterY, oTop], [dCenterY, oCenterY], [dCenterY, oBottom],
          [dBottom, oTop], [dBottom, oCenterY], [dBottom, oBottom],
        ] as [number, number][]) {
          if (Math.abs(dv - ov) <= ALIGN_THRESH) {
            if (!guides.some((g) => g.orientation === 'h' && Math.abs(g.value - ov) < 1)) {
              guides.push({ orientation: 'h', value: ov, span: spanX });
            }
          }
        }
      }
      setAlignGuides(guides);
      } // end showAlignGuides
    } else if (draggingParentGroup) {
      // Move all children + parent by the mouse delta from drag start
      const curX = e.clientX / scale - panX / scale;
      const curY = e.clientY / scale - panY / scale;
      const dx = curX - draggingParentGroup.startMouseX;
      const dy = curY - draggingParentGroup.startMouseY;
      for (const id of draggingParentGroup.childIds) {
        const orig = draggingParentGroup.startPositions.get(id);
        if (orig) setPosition(id, snapVal(orig.x + dx), snapVal(orig.y + dy));
      }
    } else if (draggingNote) {
      const newX = snapVal(e.clientX / scale - draggingNote.offsetX - panX / scale);
      const newY = snapVal(e.clientY / scale - draggingNote.offsetY - panY / scale);
      updateNote(draggingNote.noteId, { x: newX, y: newY });
    } else if (draggingBoundary) {
      const newX = snapVal(e.clientX / scale - draggingBoundary.offsetX - panX / scale);
      const newY = snapVal(e.clientY / scale - draggingBoundary.offsetY - panY / scale);
      updateBoundary(draggingBoundary.boundaryId, { x: newX, y: newY });
    }

    // ── Inspect mode hit-testing ───────────────────────────────
    if (inspectMode) {
      setInspectMouse({ x: e.clientX, y: e.clientY });

      const svgRect = svgRef.current?.getBoundingClientRect();
      if (svgRect) {
        const wx = (e.clientX - svgRect.left - panX) / scale;
        const wy = (e.clientY - svgRect.top - panY) / scale;
        const DIMS_MAP = visualConfig.nodeDisplayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;

        // 1. Check entities (leaf nodes with positions)
        let found: InspectTarget | null = null;
        for (const entity of visibleEntities) {
          const pos = posMap.get(entity.id);
          if (!pos) continue;
          const d = DIMS_MAP[entity.kind];
          if (wx >= pos.x && wx <= pos.x + d.width && wy >= pos.y && wy <= pos.y + d.height) {
            const rels = relationships.filter((r) => r.sourceId === entity.id || r.targetId === entity.id);
            found = { kind: 'entity', entity, position: pos, relationships: rels };
            break;
          }
        }

        // 1b. Check parent group frames (hit deeper/smaller groups first)
        if (!found && parentGroups.length > 0) {
          for (let i = parentGroups.length - 1; i >= 0; i--) {
            const pg = parentGroups[i];
            if (wx >= pg.x && wx <= pg.x + pg.width && wy >= pg.y && wy <= pg.y + pg.height) {
              const entity = entityMap.get(pg.id);
              if (entity) {
                const rels = relationships.filter((r) => r.sourceId === entity.id || r.targetId === entity.id);
                found = { kind: 'entity', entity, position: { entityId: entity.id, x: pg.x, y: pg.y, locked: false }, relationships: rels };
                break;
              }
            }
          }
        }

        // 2. Check notes
        if (!found) {
          for (const note of notes) {
            if (wx >= note.x && wx <= note.x + note.width && wy >= note.y && wy <= note.y + note.height) {
              found = { kind: 'note', note };
              break;
            }
          }
        }

        // 3. Check boundaries
        if (!found) {
          for (const boundary of boundaries) {
            if (wx >= boundary.x && wx <= boundary.x + boundary.width && wy >= boundary.y && wy <= boundary.y + boundary.height) {
              found = { kind: 'boundary', boundary };
              break;
            }
          }
        }

        // 4. Check relationships (proximity to any segment of the path)
        if (!found) {
          const HIT_RADIUS = 14;
          for (const rel of visibleRelationships) {
            const sPos = posMap.get(rel.sourceId);
            const tPos = posMap.get(rel.targetId);
            const sEnt = entityMap.get(rel.sourceId);
            const tEnt = entityMap.get(rel.targetId);
            if (!sPos || !tPos || !sEnt || !tEnt) continue;
            const sd = DIMS_MAP[sEnt.kind];
            const td = DIMS_MAP[tEnt.kind];
            const sCx = sPos.x + sd.width / 2;
            const sCy = sPos.y + sd.height / 2;
            const tCx = tPos.x + td.width / 2;
            const tCy = tPos.y + td.height / 2;
            const sp = rectEdgePoint(sCx, sCy, sd.width, sd.height, tCx, tCy);
            const tp = rectEdgePoint(tCx, tCy, td.width, td.height, sCx, sCy);
            const isContainment = sEnt.parentId === tEnt.parentId;
            const edgeRouting = isContainment ? visualConfig.edgeRoutingContainment : visualConfig.edgeRoutingExternal;
            let pathPts: { x: number; y: number }[];
            if (edgeRouting === 'POLYLINE') {
              pathPts = [sp, tp];
            } else {
              // ORTHOGONAL elbow
              const domH = Math.abs(tp.x - sp.x) >= Math.abs(tp.y - sp.y);
              if (domH) {
                const midX = (sp.x + tp.x) / 2;
                pathPts = [sp, { x: midX, y: sp.y }, { x: midX, y: tp.y }, tp];
              } else {
                const midY = (sp.y + tp.y) / 2;
                pathPts = [sp, { x: sp.x, y: midY }, { x: tp.x, y: midY }, tp];
              }
            }
            if (minDistToPolyline(wx, wy, pathPts) <= HIT_RADIUS) {
              found = { kind: 'relationship', rel, source: sEnt, target: tEnt };
              break;
            }
          }
        }

        setInspectTarget(found);
      }
    }
  }, [rubberBand, drawingHighlight, resizing, connecting, dragging, draggingNote, draggingBoundary, scale, panX, panY, snap, visibleEntities, posMap, visualConfig.nodeDisplayMode, inspectMode, notes, boundaries, visibleRelationships, relationships, entityMap]);

  const handleMouseUp = useCallback(() => {
    // Commit a highlight shape
    if (drawingHighlight) {
      const x = Math.min(drawingHighlight.startX, drawingHighlight.endX);
      const y = Math.min(drawingHighlight.startY, drawingHighlight.endY);
      const w = Math.abs(drawingHighlight.endX - drawingHighlight.startX);
      const h = Math.abs(drawingHighlight.endY - drawingHighlight.startY);
      // Only commit if the shape is reasonably large (avoids accidental clicks)
      if (w > 10 && h > 10) {
        addHighlightShape({
          id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: highlightShapeType,
          x, y, width: w, height: h,
        });
      }
      setDrawingHighlight(null);
      return;
    }
    if (rubberBand) {
      // Compute entities within the rubber-band rectangle
      const x1 = Math.min(rubberBand.startX, rubberBand.endX);
      const y1 = Math.min(rubberBand.startY, rubberBand.endY);
      const x2 = Math.max(rubberBand.startX, rubberBand.endX);
      const y2 = Math.max(rubberBand.startY, rubberBand.endY);
      const DIMS_MAP = visualConfig.nodeDisplayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;
      const hitIds: string[] = [];
      for (const entity of visibleEntities) {
        const pos = posMap.get(entity.id);
        if (!pos) continue;
        const d = DIMS_MAP[entity.kind];
        // Entity overlaps selection rect
        if (pos.x + d.width >= x1 && pos.x <= x2 && pos.y + d.height >= y1 && pos.y <= y2) {
          hitIds.push(entity.id);
        }
      }
      if (hitIds.length > 0) {
        selectEntities(hitIds);
      }
      setRubberBand(null);
      return;
    }
    if (connecting) {
      if (connecting.overEntityId) {
        openNewRelationship(connecting.sourceId, connecting.overEntityId);
      }
      setConnecting(null);
      return;
    }
    if (dragging || draggingParentGroup) {
      setManualLayout(true);
    }
    setAlignGuides([]);
    setDragging(null);
    setDraggingNote(null);
    setDraggingBoundary(null);
    setDraggingParentGroup(null);
    setResizing(null);
    setPanning(null);
  }, [drawingHighlight, highlightShapeType, addHighlightShape, rubberBand, connecting, dragging, draggingParentGroup, openNewRelationship, setManualLayout, visibleEntities, posMap, visualConfig.nodeDisplayMode]);

  // Start a drag-to-connect from an entity's border
  const handleConnectStart = useCallback((sourceId: string, clientX: number, clientY: number) => {
    if (isReadOnly) return;
    const curX = (clientX - panX) / scale;
    const curY = (clientY - panY) / scale;
    setConnecting({ sourceId, curX, curY, overEntityId: null });
  }, [isReadOnly, panX, panY, scale]);

  // Background rect: left-click on empty canvas space → deselect all + pan (or rubber-band with Shift)
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;

    // Pan mode: always start panning, skip selection
    if (canvasMode === 'pan') {
      setPanning({ startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY });
      return;
    }

    // Highlight mode: start drawing a spotlight shape
    if (canvasMode === 'highlight') {
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const wx = (e.clientX - svgRect.left - panX) / scale;
      const wy = (e.clientY - svgRect.top - panY) / scale;
      setDrawingHighlight({ startX: wx, startY: wy, endX: wx, endY: wy });
      return;
    }

    if (e.shiftKey && !isReadOnly) {
      // Start rubber-band selection
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const wx = (e.clientX - svgRect.left - panX) / scale;
      const wy = (e.clientY - svgRect.top - panY) / scale;
      setRubberBand({ startX: wx, startY: wy, endX: wx, endY: wy });
      return;
    }
    selectEntity(null);
    selectRelationship(null);
    selectHighlight(null);
    clearMultiSelect();
    setPanning({ startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY });
  }, [panX, panY, scale, isReadOnly, canvasMode]);

  // SVG level: middle-button (button=1) always pans regardless of what's under the cursor
  const handleSvgMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1) {
      e.preventDefault();
      setPanning({ startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY });
    }
  }, [panX, panY]);

  // Space overlay: left-drag while Space is held (overrides node interactions)
  const handleSpacePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setPanning({ startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY });
  }, [panX, panY]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const state = useStore.getState();
    const sensitivity = state.zoomSensitivity ?? 0.08;
    const delta = e.deltaY > 0 ? -sensitivity : sensitivity;
    const oldScale = state.scale;
    const newScale = Math.max(0.1, Math.min(4, oldScale + delta));
    if (newScale === oldScale) return;

    // Zoom toward mouse cursor position
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const ratio = newScale / oldScale;
    const newPanX = mx - (mx - state.panX) * ratio;
    const newPanY = my - (my - state.panY) * ratio;
    state.setPan(newPanX, newPanY);
    state.setScale(newScale);
  }, []);

  // Attach wheel listener as non-passive so preventDefault works
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Context menu ─────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    setDragging(null);
    setDraggingNote(null);
    setDraggingBoundary(null);
    setDraggingParentGroup(null);
    setResizing(null);
    setConnecting(null);

    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const wx = (e.clientX - svgRect.left - panX) / scale;
    const wy = (e.clientY - svgRect.top - panY) / scale;
    const DIMS = visualConfig.nodeDisplayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;

    // Hit-test in visual stacking order: notes (top) → entities → boundaries
    for (const note of notes) {
      if (wx >= note.x && wx <= note.x + note.width && wy >= note.y && wy <= note.y + note.height) {
        selectEntity(null); selectRelationship(null); selectBoundary(null);
        selectNote(note.id);
        setContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'note', id: note.id } });
        return;
      }
    }
    for (const entity of visibleEntities) {
      const pos = posMap.get(entity.id);
      if (!pos) continue;
      const d = DIMS[entity.kind];
      if (wx >= pos.x && wx <= pos.x + d.width && wy >= pos.y && wy <= pos.y + d.height) {
        selectNote(null); selectRelationship(null); selectBoundary(null);
        selectEntity(entity.id);
        setContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'entity', id: entity.id } });
        return;
      }
    }
    for (const boundary of boundaries) {
      if (wx >= boundary.x && wx <= boundary.x + boundary.width && wy >= boundary.y && wy <= boundary.y + boundary.height) {
        selectEntity(null); selectRelationship(null); selectNote(null);
        selectBoundary(boundary.id);
        setContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'boundary', id: boundary.id } });
        return;
      }
    }

    // If a relationship was selected by its own mousedown (fires before contextmenu)
    const relId = useStore.getState().selectedRelationshipId;
    if (relId) {
      selectEntity(null); selectNote(null); selectBoundary(null);
      setContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'relationship', id: relId } });
      return;
    }

    // Empty canvas
    selectEntity(null); selectRelationship(null); selectNote(null); selectBoundary(null);
    setContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'canvas', worldX: wx, worldY: wy } });
  }, [isReadOnly, panX, panY, scale, notes, visibleEntities, boundaries, posMap, visualConfig.nodeDisplayMode]);

  useEffect(() => {
    if (!contextMenu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [contextMenu]);

  // C4 diagram title
  const focusEntity = focusEntityId ? entities.find((e) => e.id === focusEntityId) : null;
  const isGlobalView = false;
  const lastLayoutResult = useStore((s) => s.lastLayoutResult);
  const baseSwimlanes = lastLayoutResult?.swimlanes;
  const bandMap = lastLayoutResult?.bandMap;
  const isSwimlaneView = lastLayoutResult?.strategy === 'swimlane' && !!baseSwimlanes;

  // ── Live swimlanes: wrap band rects around actual entity positions ──
  // Each band's rect is derived from its entities' current positions so that
  // dragging an entity grows the band.  All bands share the same x / width.
  // A non-overlap constraint pushes later bands down if an earlier band's
  // entities extend into the next band's territory.
  const BAND_PAD = 20; // px padding inside band around entities
  const BAND_GAP = 16; // px vertical gap between adjacent bands
  const swimlanes = useMemo(() => {
    if (!baseSwimlanes || !bandMap) return baseSwimlanes;
    const DIMS = visualConfig.nodeDisplayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;

    // 1. Compute per-band bounding box from entity positions
    type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
    const vpBounds = new Map<string, Bounds>();
    for (const lane of baseSwimlanes) {
      // Seed from baseSwimlane (ELK output) so empty bands keep their size
      vpBounds.set(lane.viewpoint, {
        minX: lane.x, maxX: lane.x + lane.width,
        minY: lane.y, maxY: lane.y + lane.height,
      });
    }
    for (const p of positions) {
      const vp = bandMap[p.entityId];
      if (!vp || !vpBounds.has(vp)) continue;
      const ent = visibleEntities.find((e) => e.id === p.entityId);
      const dim = ent ? (DIMS[ent.kind] ?? { width: 160, height: 80 }) : { width: 160, height: 80 };
      const b = vpBounds.get(vp)!;
      b.minX = Math.min(b.minX, p.x - BAND_PAD);
      b.maxX = Math.max(b.maxX, p.x + dim.width + BAND_PAD);
      b.minY = Math.min(b.minY, p.y - BAND_PAD);
      b.maxY = Math.max(b.maxY, p.y + dim.height + BAND_PAD);
    }
    // Also account for containment boxes
    for (const box of lastLayoutResult?.containmentBoxes ?? []) {
      const vp = bandMap[box.entityId];
      if (!vp || !vpBounds.has(vp)) continue;
      const b = vpBounds.get(vp)!;
      b.minX = Math.min(b.minX, box.x - BAND_PAD);
      b.maxX = Math.max(b.maxX, box.x + box.width + BAND_PAD);
      b.minY = Math.min(b.minY, box.y - BAND_PAD);
      b.maxY = Math.max(b.maxY, box.y + box.height + BAND_PAD);
    }

    // 2. Uniform x and width across all bands
    let globalMinX = Infinity;
    let globalMaxX = -Infinity;
    for (const b of vpBounds.values()) {
      if (b.minX < globalMinX) globalMinX = b.minX;
      if (b.maxX > globalMaxX) globalMaxX = b.maxX;
    }
    if (globalMinX === Infinity) return baseSwimlanes;
    const bandW = globalMaxX - globalMinX;

    // 3. Build lanes from entity-derived bounds
    const lanes = baseSwimlanes.map((lane) => {
      const b = vpBounds.get(lane.viewpoint)!;
      return { ...lane, x: globalMinX, y: b.minY, width: bandW, height: b.maxY - b.minY };
    });

    // 4. Non-overlap safety: push each band below the previous one
    for (let i = 1; i < lanes.length; i++) {
      const prevBottom = lanes[i - 1].y + lanes[i - 1].height;
      if (lanes[i].y < prevBottom + BAND_GAP) {
        const pushDelta = prevBottom + BAND_GAP - lanes[i].y;
        lanes[i].y += pushDelta;
        // Extend height so the band still reaches its entities' bottom
        const origBottom = vpBounds.get(lanes[i].viewpoint)!.maxY;
        lanes[i].height = Math.max(lanes[i].height, origBottom - lanes[i].y);
      }
    }

    return lanes;
  }, [baseSwimlanes, bandMap, positions, visibleEntities, visualConfig.nodeDisplayMode, lastLayoutResult?.containmentBoxes]);

  const diagramTitle = focusEntityId
    ? `${VIEWPOINT_LABELS[viewpoint]} · ${ZOOM_LEVEL_LABELS[zoomLevel]} — ${focusEntity?.name ?? projectName}`
    : `${activeViewpoints.map((vp) => VIEWPOINT_LABELS[vp]).join(' + ')} · ${activeZoomLevels.map((zl) => ZOOM_LEVEL_LABELS[zl] ?? zl).join(' + ')}`;

  // Global layout swim-lane/row metadata (global view is currently disabled)
  const globalLanes: { viewpoint: Viewpoint; x: number; y: number; width: number; height: number }[] = [];
  const globalRows: { level: string; x: number; y: number; width: number; height: number }[] = [];

  // Collect unique kinds and edge types visible for the key/legend
  const visibleKinds = useMemo(() => {
    const kinds = new Set(visibleEntities.map((e) => e.kind));
    return Array.from(kinds) as EntityKind[];
  }, [visibleEntities]);

  const visibleEdgeTypes = useMemo(() => {
    const types = new Set(visibleRelationships.map((r) => r.type));
    return Array.from(types) as EdgeType[];
  }, [visibleRelationships]);

  // ── Prezi parent frame ─────────────────────────────────────────
  // When drilled into an entity, compute its children's bounding box
  // and derive a parent frame rect plus cross-boundary relationships.
  const parentFrame = useMemo(() => {
    if (!focusEntityId || visibleEntities.length === 0) return null;
    const PADDING = 80;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let anyPos = false;
    for (const e of visibleEntities) {
      const pos = posMap.get(e.id);
      if (!pos) continue;
      anyPos = true;
      const dims = NODE_DIMENSIONS[e.kind];
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + dims.width);
      maxY = Math.max(maxY, pos.y + dims.height);
    }
    if (!anyPos) return null;
    const color = focusEntity ? KIND_COLORS[focusEntity.kind] : '#888';
    return {
      x: minX - PADDING,
      y: minY - PADDING,
      width: maxX - minX + PADDING * 2,
      height: maxY - minY + PADDING * 2,
      color,
      label: focusEntity?.name ?? '',
      kind: focusEntity?.kind ?? 'system',
    };
  }, [focusEntityId, visibleEntities, posMap, focusEntity]);

  // ── C4 parent grouping ────────────────────────────────────────
  // When NOT drilled in, group visible entities by their parentId
  // and render the parent entity as a container frame around its children.
  // This gives the classic C4 view: systems containing containers, etc.
  const parentGroups = useMemo(() => {
    if (focusEntityId) return []; // drill-down uses parentFrame instead
    const FRAME_PAD = 40;
    const DIMS_MAP = visualConfig.nodeDisplayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;

    // Group visible entities by parentId (only when parent is also visible)
    const visibleIds = new Set(visibleEntities.map((e) => e.id));
    const groups = new Map<string, typeof visibleEntities>();
    for (const e of visibleEntities) {
      if (!e.parentId) continue;
      if (!visibleIds.has(e.parentId)) continue; // parent must also be visible
      const arr = groups.get(e.parentId);
      if (arr) arr.push(e);
      else groups.set(e.parentId, [e]);
    }

    const frames: {
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      label: string;
      kind: string;
    }[] = [];

    for (const [parentId, children] of groups) {
      const parent = entities.find((p) => p.id === parentId);
      if (!parent) continue;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let anyPos = false;
      for (const child of children) {
        const pos = posMap.get(child.id);
        if (!pos) continue;
        anyPos = true;
        const dims = DIMS_MAP[child.kind] ?? { width: 120, height: 60 };
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + dims.width);
        maxY = Math.max(maxY, pos.y + dims.height);
      }
      if (!anyPos) continue;
      const color = KIND_COLORS[parent.kind] ?? '#888';
      frames.push({
        id: parentId,
        x: minX - FRAME_PAD,
        y: minY - FRAME_PAD - 28, // extra room for the label
        width: maxX - minX + FRAME_PAD * 2,
        height: maxY - minY + FRAME_PAD * 2 + 28,
        color,
        label: parent.name,
        kind: parent.kind,
      });
    }
    return frames;
  }, [focusEntityId, visibleEntities, posMap, entities, visualConfig.nodeDisplayMode]);

  // ── Cross-boundary relationships ───────────────────────────────
  // Relationships that connect the focused entity to its peers at
  // the parent level (the "external dependencies" of the drilled view).
  const crossBoundaryRels = useMemo(() => {
    if (!focusEntityId) return [];
    const visibleIds = new Set(visibleEntities.map((e) => e.id));
    return relationships.filter((r) =>
      (r.sourceId === focusEntityId && !visibleIds.has(r.targetId)) ||
      (r.targetId === focusEntityId && !visibleIds.has(r.sourceId))
    );
  }, [focusEntityId, visibleEntities, relationships]);

  return (
    <>
    <svg
      ref={svgRef}
      id="main-canvas"
      className="diagram-canvas"
      width="100%"
      height="100%"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { handleMouseUp(); }}
      onMouseDown={handleSvgMouseDown}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        background: 'var(--canvas-bg, #FAFBFC)',
        cursor: connecting ? 'crosshair' : panning ? 'grabbing' : resizing ? HANDLE_CURSOR[resizing.handle] : spaceDown ? 'grab' : canvasMode === 'pan' ? 'grab' : canvasMode === 'highlight' ? 'crosshair' : inspectMode ? 'crosshair' : laserMode ? 'none' : 'default',
      }}
      role="application"
      aria-label="Architecture diagram canvas. Drag to pan, scroll to zoom, middle-click or Space+drag to pan freely."
    >
      <EdgeDefs />

      {/* Infinite-canvas background: transparent full-viewport rect that catches all
          empty-space mouse events for panning. Must be first so content renders on top.
          Grid rects above this use pointer-events:none so they don't intercept clicks. */}
      <rect
        x={0} y={0} width="100%" height="100%"
        fill="transparent"
        onMouseDown={handleCanvasMouseDown}
      />

      {/* draw.io-style grid: fixed SVG rect with patternTransform for pan/zoom */}
      {visualConfig.showGrid && (
        <>
          <defs>
            <pattern
              id="grid-minor"
              width={20}
              height={20}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${panX}, ${panY}) scale(${scale})`}
            >
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--canvas-grid, #E8ECF0)" strokeWidth={0.5} />
            </pattern>
            <pattern
              id="grid-major"
              width={100}
              height={100}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${panX}, ${panY}) scale(${scale})`}
            >
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="var(--canvas-grid, #E8ECF0)" strokeWidth={1} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-minor)" style={{ pointerEvents: 'none' }} />
          <rect width="100%" height="100%" fill="url(#grid-major)" style={{ pointerEvents: 'none' }} />
        </>
      )}

      <g transform={`translate(${panX}, ${panY}) scale(${scale})`}>

        {/* ── Global View: Viewpoint swim-lanes & level rows ── */}
        {isGlobalView && (
          <g className="layer-global-grid" pointerEvents="none">
            {/* Viewpoint horizontal swim-lane rows (ArchiMate layers) */}
            {globalLanes.map((lane) => {
              const borderColor = VIEWPOINT_COLORS[lane.viewpoint];
              const bgColor = VIEWPOINT_BG_COLORS[lane.viewpoint];
              return (
                <g key={lane.viewpoint}>
                  <rect
                    x={lane.x - 8} y={lane.y - 8}
                    width={lane.width + 16} height={lane.height + 16}
                    rx={14}
                    fill={bgColor} fillOpacity={0.25}
                    stroke={borderColor} strokeWidth={1.5}
                    opacity={0.6}
                  />
                  <text
                    x={lane.x - 16}
                    y={lane.y + lane.height / 2}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill={borderColor}
                    fontSize={14}
                    fontWeight={700}
                    fontFamily="var(--font)"
                    opacity={0.85}
                  >
                    {VIEWPOINT_LABELS[lane.viewpoint]}
                  </text>
                </g>
              );
            })}
            {/* C4 level column labels (at top) */}
            {globalRows.map((row) => (
              <text
                key={row.level}
                x={row.x + row.width / 2}
                y={row.y - 12}
                textAnchor="middle"
                fill="var(--text-secondary, #636E72)"
                fontSize={11}
                fontWeight={600}
                fontFamily="var(--font)"
                opacity={0.6}
                style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                {ZOOM_LEVEL_LABELS[row.level]}
              </text>
            ))}
            {/* Vertical separator lines between level columns */}
            {globalRows.slice(1).map((row) => (
              <line
                key={`sep-${row.level}`}
                x1={row.x - 20}
                y1={row.y}
                x2={row.x - 20}
                y2={row.y + row.height}
                stroke="var(--border, #DFE6E9)"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.4}
              />
            ))}
          </g>
        )}

        {/* ── Swimlane View: ArchiMate viewpoint rows/columns with nested C4 containment ── */}
        {isSwimlaneView && swimlanes && (
          <>
          <g className="layer-swimlanes" pointerEvents="none">
            {/* Viewpoint swimlane backgrounds */}
            {swimlanes.map((lane, idx) => {
              const borderColor = VIEWPOINT_COLORS[lane.viewpoint];
              const bgColor = VIEWPOINT_BG_COLORS[lane.viewpoint];
              const isC4NestedMode = lastLayoutResult?.orientation === 'c4-nested';
              return (
                <g key={`lane-${lane.viewpoint}-${idx}`}>
                  <rect
                    x={lane.x}
                    y={lane.y}
                    width={lane.width}
                    height={lane.height}
                    rx={8}
                    fill={bgColor} fillOpacity={0.25}
                    stroke={borderColor} strokeWidth={1.5}
                    opacity={0.6}
                    style={{ transition: 'x 0.35s ease, y 0.35s ease, width 0.35s ease, height 0.35s ease' }}
                  />
                  {!isC4NestedMode && (
                    /* Layer mode: rotated label left of each row */
                    <text
                      x={lane.x - 12}
                      y={lane.y + lane.height / 2}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fill={borderColor}
                      fontSize={11}
                      fontWeight={700}
                      fontFamily="var(--font)"
                      opacity={0.85}
                      style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      transform={`rotate(-90, ${lane.x - 12}, ${lane.y + lane.height / 2})`}
                    >
                      {VIEWPOINT_LABELS[lane.viewpoint]}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Containment boundaries — handled by dynamic parentGroups below */}
          </>
        )}

        {/* ── Layer 0 (deepest): Prezi parent frame ── */}
        {parentFrame && (
          <g className="layer-parent-frame" pointerEvents="none">
            <rect
              x={parentFrame.x} y={parentFrame.y}
              width={parentFrame.width} height={parentFrame.height}
              rx={16}
              fill={parentFrame.color}
              fillOpacity={0.04}
              stroke={parentFrame.color}
              strokeWidth={2.5}
              strokeDasharray="10 5"
              opacity={0.6}
            />
            <text
              x={parentFrame.x + 18}
              y={parentFrame.y + 22}
              fill={parentFrame.color}
              fontSize={13}
              fontWeight={600}
              opacity={0.7}
              fontFamily="var(--font)"
            >
              {parentFrame.label}
            </text>
            <text
              x={parentFrame.x + 18}
              y={parentFrame.y + 38}
              fill={parentFrame.color}
              fontSize={10}
              opacity={0.45}
              fontFamily="var(--font)"
              style={{ textTransform: 'uppercase' }}
            >
              [{parentFrame.kind}]
            </text>
          </g>
        )}

        {/* ── Layer 0b: Parent grouping frames (always visible, dynamic) ── */}
        {parentGroups.length > 0 && (
          <g className="layer-parent-groups">
            {parentGroups.map((pg) => {
              const isSelected = selectedEntityId === pg.id || selectedEntityIds.has(pg.id);
              return (
              <g
                key={pg.id}
                style={{ cursor: draggingParentGroup?.parentId === pg.id ? 'grabbing' : 'grab' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.shiftKey) {
                    toggleSelectEntity(pg.id);
                  } else {
                    selectEntity(pg.id);
                  }
                }}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  selectEntity(pg.id);
                  handleParentGroupDragStart(pg.id, e.clientX, e.clientY);
                }}
              >
                <rect
                  x={pg.x} y={pg.y}
                  width={pg.width} height={pg.height}
                  rx={12}
                  fill={pg.color}
                  fillOpacity={0.05}
                  stroke={pg.color}
                  strokeWidth={isSelected ? 2.5 : 2}
                  strokeDasharray="8 4"
                  opacity={isSelected ? 0.85 : 0.55}
                />
                <text
                  x={pg.x + 14}
                  y={pg.y + 18}
                  fill={pg.color}
                  fontSize={12}
                  fontWeight={600}
                  opacity={0.75}
                  fontFamily="var(--font)"
                  pointerEvents="none"
                >
                  {pg.label}
                </text>
                <text
                  x={pg.x + 14}
                  y={pg.y + 32}
                  fill={pg.color}
                  fontSize={9}
                  opacity={0.4}
                  fontFamily="var(--font)"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  pointerEvents="none"
                >
                  [{pg.kind}]
                </text>
              </g>
              );
            })}
          </g>
        )}

        {/* ── Layer 1 (lowest): Boundaries ── */}
        <g className="layer-boundaries">
          {boundaries.map((boundary) => (
            <BoundaryBox
              key={boundary.id}
              boundary={boundary}
              selected={selectedBoundaryId === boundary.id}
              onSelect={selectBoundary}
              onDragStart={handleBoundaryDragStart}
              onResizeStart={handleBoundaryResizeStart}
            />
          ))}
        </g>

        {/* ── Layer 2 (mid): Edges → Nodes → Rubber-band ── */}
        <g className="layer-entities">
          {/* Edges (underneath nodes) */}
          {(() => {
            // Build sibling map: for each unordered pair, track edges in order
            const siblingMap = new Map<string, string[]>();
            for (const rel of visibleRelationships) {
              const pairKey = [rel.sourceId, rel.targetId].sort().join('::');
              const arr = siblingMap.get(pairKey);
              if (arr) arr.push(rel.id);
              else siblingMap.set(pairKey, [rel.id]);
            }
            // Build a lookup: relId → { index, count }
            const siblingInfo = new Map<string, { index: number; count: number }>();
            for (const ids of siblingMap.values()) {
              for (let i = 0; i < ids.length; i++) {
                siblingInfo.set(ids[i], { index: i, count: ids.length });
              }
            }
            return visibleRelationships.map((rel) => {
              const sPos = posMap.get(rel.sourceId);
              const tPos = posMap.get(rel.targetId);
              const sEnt = entityMap.get(rel.sourceId);
              const tEnt = entityMap.get(rel.targetId);
              if (!sPos || !tPos || !sEnt || !tEnt) return null;
              const info = siblingInfo.get(rel.id) ?? { index: 0, count: 1 };
              return (
                <RelationshipEdge
                  key={rel.id}
                  rel={rel}
                  sourcePos={sPos}
                  targetPos={tPos}
                  sourceEntity={sEnt}
                  targetEntity={tEnt}
                  selected={selectedRelationshipId === rel.id}
                  animateEdges={visualConfig.animateEdges}
                  maxTps={maxTps}
                  nodeDisplayMode={visualConfig.nodeDisplayMode}
                  edgeRoutingContainment={visualConfig.edgeRoutingContainment}
                  edgeRoutingExternal={visualConfig.edgeRoutingExternal}
                  onSelect={selectRelationship}
                  onEdit={(id) => setShowRelationshipForm(true, id)}
                  siblingIndex={info.index}
                  siblingCount={info.count}
                />
              );
            });
          })()}

          {/* ── Alignment guides (shown during entity drag) ─── */}
          {alignGuides.map((g, i) =>
            g.orientation === 'v'
              ? <line key={`ag-v-${i}`} className="align-guide" vectorEffect="non-scaling-stroke" x1={g.value} y1={g.span[0]} x2={g.value} y2={g.span[1]} pointerEvents="none" />
              : <line key={`ag-h-${i}`} className="align-guide" vectorEffect="non-scaling-stroke" x1={g.span[0]} y1={g.value} x2={g.span[1]} y2={g.value} pointerEvents="none" />
          )}

          {/* Nodes — skip entities that are rendered as parent-group frames */}
          {(() => {
            const frameIds = new Set(parentGroups.map((pg) => pg.id));
            // Sort by z-order so component > container > context > archimate entities.
            // Stable sort: items with the same z-value keep their original array order.
            const sorted = [...visibleEntities].sort(
              (a, b) => (ENTITY_Z_ORDER[a.kind] ?? 0) - (ENTITY_Z_ORDER[b.kind] ?? 0)
            );
            return sorted.map((entity) => {
            // If this entity is a parent-group frame, don't render it as a node
            if (frameIds.has(entity.id)) return null;
            const pos = posMap.get(entity.id);
            if (!pos) return null;
            return (
              <EntityNode
                key={entity.id}
                entity={entity}
                x={pos.x}
                y={pos.y}
                selected={selectedEntityId === entity.id || selectedEntityIds.has(entity.id)}
                visualConfig={visualConfig}
                onSelect={(id, e) => {
                  if (e?.shiftKey) {
                    toggleSelectEntity(id);
                  } else {
                    selectEntity(id);
                  }
                }}
                onDrillDown={toggleExpandEntity}
                onDragStart={handleDragStart}
                onConnectStart={isReadOnly ? undefined : handleConnectStart}
                connectTarget={!isReadOnly && connecting !== null && connecting.overEntityId === entity.id}
                hasChildren={entities.some((c) => c.parentId === entity.id)}
                onExpand={toggleExpandEntity}
              />
            );
          });
          })()}

          {/* ── Cross-boundary edges (shown when drilled in) ── */}
          {parentFrame && crossBoundaryRels.map((rel) => {
            const internalId = visibleEntities.some((e) => e.id === rel.sourceId)
              ? rel.sourceId
              : rel.targetId;
            const internalPos = posMap.get(internalId);
            const internalEntity = entityMap.get(internalId);
            if (!internalPos || !internalEntity) return null;
            const DIMS_MAP = visualConfig.nodeDisplayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;
            const d = DIMS_MAP[internalEntity.kind] ?? { width: 120, height: 60 };
            const cx = internalPos.x + d.width / 2;
            const cy = internalPos.y + d.height / 2;
            const frameCx = parentFrame.x + parentFrame.width / 2;
            const frameCy = parentFrame.y + parentFrame.height / 2;
            const dx = cx - frameCx;
            const dy = cy - frameCy;
            const norm = Math.sqrt(dx * dx + dy * dy) || 1;
            const exitX = parentFrame.x + parentFrame.width / 2 + (dx / norm) * (parentFrame.width / 2 + 32);
            const exitY = parentFrame.y + parentFrame.height / 2 + (dy / norm) * (parentFrame.height / 2 + 32);
            const isOutgoing = rel.sourceId === internalId;
            const cbColor = parentFrame.color;
            return (
              <g key={`cb-${rel.id}`} pointerEvents="none" opacity={0.55}>
                <line
                  x1={cx} y1={cy} x2={exitX} y2={exitY}
                  stroke={cbColor} strokeWidth={1.5} strokeDasharray="6 4"
                />
                {isOutgoing && (
                  <circle cx={exitX} cy={exitY} r={3.5} fill={cbColor} />
                )}
                {!isOutgoing && (
                  <circle cx={cx} cy={cy} r={3.5} fill={cbColor} />
                )}
                {rel.label && (
                  <text
                    x={(cx + exitX) / 2}
                    y={(cy + exitY) / 2 - 5}
                    fill={cbColor}
                    fontSize={9}
                    textAnchor="middle"
                    fontStyle="italic"
                  >
                    {rel.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Rubber-band edge: shown while drag-to-connect is in progress */}
          {connecting && (() => {
            const srcPos = posMap.get(connecting.sourceId);
            const srcEntity = entityMap.get(connecting.sourceId);
            if (!srcPos || !srcEntity) return null;
            const DIMS_MAP = visualConfig.nodeDisplayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;
            const d = DIMS_MAP[srcEntity.kind];

            // Returns the point on a rect's border along the line from its center to (toX, toY)
            const borderPt = (rx: number, ry: number, rw: number, rh: number, toX: number, toY: number) => {
              const cx = rx + rw / 2, cy = ry + rh / 2;
              const dx = toX - cx, dy = toY - cy;
              if (dx === 0 && dy === 0) return { x: cx, y: cy };
              const hw = rw / 2, hh = rh / 2;
              const tx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
              const ty = dy !== 0 ? hh / Math.abs(dy) : Infinity;
              const t = Math.min(tx, ty);
              return { x: cx + t * dx, y: cy + t * dy };
            };

            // Determine end point: border of target if hovering, else raw cursor
            let x2 = connecting.curX, y2 = connecting.curY;
            if (connecting.overEntityId) {
              const tPos = posMap.get(connecting.overEntityId);
              const tEnt = entityMap.get(connecting.overEntityId);
              if (tPos && tEnt) {
                const td = DIMS_MAP[tEnt.kind];
                const srcCx = srcPos.x + d.width / 2, srcCy = srcPos.y + d.height / 2;
                const bp = borderPt(tPos.x, tPos.y, td.width, td.height, srcCx, srcCy);
                x2 = bp.x; y2 = bp.y;
              }
            }

            // Start point: border of source toward end point
            const start = borderPt(srcPos.x, srcPos.y, d.width, d.height, x2, y2);

            return (
              <g pointerEvents="none">
                <line
                  x1={start.x} y1={start.y}
                  x2={x2} y2={y2}
                  stroke="var(--accent, #0984E3)"
                  strokeWidth={2}
                  strokeDasharray="8 5"
                  opacity={0.75}
                />
                <circle
                  cx={x2} cy={y2}
                  r={5}
                  fill={connecting.overEntityId ? 'var(--accent, #0984E3)' : 'var(--surface, #fff)'}
                  stroke="var(--accent, #0984E3)"
                  strokeWidth={2}
                  opacity={0.85}
                />
              </g>
            );
          })()}
        </g>

        {/* ── Rubber-band selection rectangle ── */}
        {rubberBand && (() => {
          const x = Math.min(rubberBand.startX, rubberBand.endX);
          const y = Math.min(rubberBand.startY, rubberBand.endY);
          const w = Math.abs(rubberBand.endX - rubberBand.startX);
          const h = Math.abs(rubberBand.endY - rubberBand.startY);
          return (
            <rect
              x={x} y={y} width={w} height={h}
              fill="rgba(9, 132, 227, 0.08)"
              stroke="var(--accent, #0984E3)"
              strokeWidth={1}
              strokeDasharray="4 2"
              pointerEvents="none"
            />
          );
        })()}

        {/* ── Layer 3 (highest): Notes ── */}
        <g className="layer-notes">
          {notes.map((note) => (
            <NoteNode
              key={note.id}
              note={note}
              attachedPos={note.attachedToId ? posMap.get(note.attachedToId) : undefined}
              selected={selectedNoteId === note.id}
              onSelect={selectNote}
              onDragStart={handleNoteDragStart}
              onResizeStart={handleNoteResizeStart}
            />
          ))}
        </g>

        {/* ── Spotlight / highlight overlay ─────────────────────── */}
        {(highlightShapes.length > 0 || drawingHighlight) && (() => {
          // Compute a large "world" bounding box that fully covers the visible area
          const BIG = 100000;
          // All committed shapes + the in-progress drawing
          const allShapes: HighlightShape[] = [...highlightShapes];
          if (drawingHighlight) {
            allShapes.push({
              id: '__drawing__',
              type: highlightShapeType,
              x: Math.min(drawingHighlight.startX, drawingHighlight.endX),
              y: Math.min(drawingHighlight.startY, drawingHighlight.endY),
              width: Math.abs(drawingHighlight.endX - drawingHighlight.startX),
              height: Math.abs(drawingHighlight.endY - drawingHighlight.startY),
            });
          }
          return (
            <g className="layer-highlight-overlay">
              <defs>
                <mask id="highlight-mask">
                  {/* White = dark overlay visible everywhere */}
                  <rect x={-BIG} y={-BIG} width={BIG * 2} height={BIG * 2} fill="white" />
                  {/* Black cutouts = bright / transparent → spotlight areas */}
                  {allShapes.map((s) =>
                    s.type === 'ellipse' ? (
                      <ellipse
                        key={s.id}
                        cx={s.x + s.width / 2}
                        cy={s.y + s.height / 2}
                        rx={s.width / 2}
                        ry={s.height / 2}
                        fill="black"
                      />
                    ) : (
                      <rect
                        key={s.id}
                        x={s.x} y={s.y}
                        width={s.width} height={s.height}
                        rx={4}
                        fill="black"
                      />
                    )
                  )}
                </mask>
              </defs>

              {/* Dark overlay with cutouts */}
              <rect
                x={-BIG} y={-BIG}
                width={BIG * 2} height={BIG * 2}
                fill="black"
                opacity={0.55}
                mask="url(#highlight-mask)"
                pointerEvents="none"
              />

              {/* Dashed borders on spotlight shapes — click to select, Delete to remove */}
              {highlightShapes.map((s) => {
                const isSel = selectedHighlightId === s.id;
                const strokeColor = isSel ? 'var(--canvas-edge-selected, #D63031)' : 'var(--accent, #0984E3)';
                const sw = (isSel ? 3 : 2) / scale;
                return s.type === 'ellipse' ? (
                  <ellipse
                    key={`border-${s.id}`}
                    cx={s.x + s.width / 2}
                    cy={s.y + s.height / 2}
                    rx={s.width / 2}
                    ry={s.height / 2}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={sw}
                    strokeDasharray={`${6 / scale} ${4 / scale}`}
                    opacity={0.8}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); selectHighlight(isSel ? null : s.id); }}
                  />
                ) : (
                  <rect
                    key={`border-${s.id}`}
                    x={s.x} y={s.y}
                    width={s.width} height={s.height}
                    rx={4}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={sw}
                    strokeDasharray={`${6 / scale} ${4 / scale}`}
                    opacity={0.8}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); selectHighlight(isSel ? null : s.id); }}
                  />
                );
              })}

              {/* In-progress drawing preview */}
              {drawingHighlight && (() => {
                const dx = Math.min(drawingHighlight.startX, drawingHighlight.endX);
                const dy = Math.min(drawingHighlight.startY, drawingHighlight.endY);
                const dw = Math.abs(drawingHighlight.endX - drawingHighlight.startX);
                const dh = Math.abs(drawingHighlight.endY - drawingHighlight.startY);
                return highlightShapeType === 'ellipse' ? (
                  <ellipse
                    cx={dx + dw / 2} cy={dy + dh / 2}
                    rx={dw / 2} ry={dh / 2}
                    fill="none"
                    stroke="var(--accent, #0984E3)"
                    strokeWidth={2 / scale}
                    strokeDasharray={`${6 / scale} ${4 / scale}`}
                    opacity={0.6}
                    pointerEvents="none"
                  />
                ) : (
                  <rect
                    x={dx} y={dy} width={dw} height={dh}
                    rx={4}
                    fill="none"
                    stroke="var(--accent, #0984E3)"
                    strokeWidth={2 / scale}
                    strokeDasharray={`${6 / scale} ${4 / scale}`}
                    opacity={0.6}
                    pointerEvents="none"
                  />
                );
              })()}
            </g>
          );
        })()}
      </g>

      {/* Empty state – contextual prompt */}
      {visibleEntities.length === 0 && (
        <foreignObject x="0" y="0" width="100%" height="100%" style={{ pointerEvents: 'none' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            <div className="canvas-empty-prompt" style={{ pointerEvents: 'auto' }}>
              <div className="canvas-empty-icon">◇</div>
              <p className="canvas-empty-title">
                Start building your architecture
              </p>
              <p className="canvas-empty-hint">
                Choose a starting point, or drag shapes from the palette.
              </p>
              <div className="canvas-empty-actions">
                <button className="btn btn-sm btn-primary" onClick={() => {
                  const sysId = addEntity({ name: 'My System', shortName: 'SYS', description: 'Top-level system', kind: 'system', viewpoint: 'application', parentId: null, metadata: { tags: [] }, responsibilities: [] });
                  const personId = addEntity({ name: 'User', shortName: 'USR', description: 'End user', kind: 'person', viewpoint: 'application', parentId: null, metadata: { tags: [] }, responsibilities: [] });
                  addEntity({ name: 'Service', shortName: 'SVC', description: 'Application container', kind: 'container', viewpoint: 'application', parentId: sysId, metadata: { tags: [] }, responsibilities: [] });
                  selectEntity(personId);
                  autoLayout();
                }}>
                  Map a system
                </button>
                <button className="btn btn-sm" onClick={() => {
                  useStore.getState().setShowEntityForm(true);
                }}>
                  Add an entity
                </button>
                <button className="btn btn-sm" onClick={() => {
                  const loadProject = useStore.getState().loadProject;
                  loadProject(EXAMPLE_PROJECT);
                }}>
                  Load example
                </button>
              </div>
            </div>
          </div>
        </foreignObject>
      )}

      {/* C4 Diagram Title (fixed, doesn't pan/zoom) */}
      <text
        x={16}
        y={24}
        fill="var(--canvas-text, #2D3436)"
        fontSize={15}
        fontWeight={600}
        className="entity-label"
      >
        {diagramTitle}
      </text>

      {/* C4 Diagram Key/Legend (fixed bottom-right) */}
      <CanvasLegend visibleKinds={visibleKinds} visibleEdgeTypes={visibleEdgeTypes} isGlobalView={isGlobalView} />

      {/* Space-key pan overlay: sits on top of everything so Space+drag overrides
          node interactions and lets the user freely pan across the infinite canvas. */}
      {spaceDown && (
        <rect
          x={0} y={0} width="100%" height="100%"
          fill="transparent"
          style={{ cursor: panning ? 'grabbing' : 'grab' }}
          onMouseDown={handleSpacePanStart}
        />
      )}
    </svg>

    {/* Context menu */}
    {contextMenu && (
      <CanvasContextMenu
        target={contextMenu.target}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu(null)}
        snapVal={snapVal}
      />
    )}

    {/* Inspect overlay */}
    {inspectMode && (
      <InspectOverlay
        target={inspectTarget}
        mouseX={inspectMouse.x}
        mouseY={inspectMouse.y}
      />
    )}

    {/* Laser pointer dot — rendered via portal so it sits in document.body as a real HTML element */}
    {laserMode && laserPos && createPortal(
      <div
        className="laser-pointer"
        style={{ left: laserPos.x, top: laserPos.y }}
        aria-hidden="true"
      />,
      document.body,
    )}
    </>
  );
};
