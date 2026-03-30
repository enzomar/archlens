import React from 'react';
import { useStore } from '../../store/useStore';
import { KIND_TO_ZOOM, CONCRETE_VIEWPOINTS, VIEWPOINT_LABELS, ZOOM_LEVEL_LABELS, getViewpointsForKindLevel } from '../../domain/types';
import type { EntityKind, Viewpoint, ZoomLevel } from '../../domain/types';
import { getValidKindsForViewpoint } from '../../utils/validation';
import { Edit, Trash2, Plus, Eye, LayoutGrid, RotateCcw, StickyNote, Square, Navigation, GitBranch, Minus } from 'lucide-react';

type ContextMenuTarget =
  | { kind: 'entity'; id: string }
  | { kind: 'note'; id: string }
  | { kind: 'boundary'; id: string }
  | { kind: 'relationship'; id: string }
  | { kind: 'canvas'; worldX: number; worldY: number };

interface CanvasContextMenuProps {
  target: ContextMenuTarget;
  x: number;
  y: number;
  onClose: () => void;
  snapVal: (v: number) => number;
}

export type { ContextMenuTarget };

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({ target, x, y, onClose, snapVal }) => {
  const entities = useStore((s) => s.entities);
  const viewpoint = useStore((s) => s.viewpoint);
  const zoomLevel = useStore((s) => s.zoomLevel);
  const focusEntityId = useStore((s) => s.focusEntityId);

  const addEntity = useStore((s) => s.addEntity);
  const deleteEntity = useStore((s) => s.deleteEntity);
  const deleteNote = useStore((s) => s.deleteNote);
  const deleteBoundary = useStore((s) => s.deleteBoundary);
  const deleteRelationship = useStore((s) => s.deleteRelationship);
  const updateRelationship = useStore((s) => s.updateRelationship);
  const relationships = useStore((s) => s.relationships);
  const setShowEntityForm = useStore((s) => s.setShowEntityForm);
  const setShowRelationshipForm = useStore((s) => s.setShowRelationshipForm);
  const setShowNoteForm = useStore((s) => s.setShowNoteForm);
  const setShowBoundaryForm = useStore((s) => s.setShowBoundaryForm);
  const drillDown = useStore((s) => s.drillDown);
  const setZoomLevel = useStore((s) => s.setZoomLevel);
  const setViewpoint = useStore((s) => s.setViewpoint);
  const setPosition = useStore((s) => s.setPosition);
  const setPan = useStore((s) => s.setPan);
  const setScale = useStore((s) => s.setScale);
  const setManualLayout = useStore((s) => s.setManualLayout);
  const selectEntity = useStore((s) => s.selectEntity);
  const autoLayout = useStore((s) => s.autoLayout);
  const addNote = useStore((s) => s.addNote);
  const updateNote = useStore((s) => s.updateNote);
  const addBoundary = useStore((s) => s.addBoundary);
  const updateBoundary = useStore((s) => s.updateBoundary);

  const menuX = Math.min(x, window.innerWidth - 200);
  const menuY = Math.min(y, window.innerHeight - 260);
  const t = target;
  const items: React.ReactNode[] = [];

  if (t.kind === 'entity') {
    const entity = entities.find((e) => e.id === t.id);
    const entityKind = entity?.kind;
    const viewInOptions: { vp: Viewpoint; level: ZoomLevel; label: string }[] = [];
    if (entityKind) {
      const kindLevel = KIND_TO_ZOOM[entityKind];
      for (const vp of CONCRETE_VIEWPOINTS) {
        const vpKinds = getViewpointsForKindLevel(entityKind, kindLevel);
        if (vpKinds.includes(vp)) {
          const isCurrent = vp === viewpoint && kindLevel === zoomLevel;
          if (!isCurrent) {
            viewInOptions.push({
              vp,
              level: kindLevel,
              label: `${VIEWPOINT_LABELS[vp]} · ${ZOOM_LEVEL_LABELS[kindLevel]}`,
            });
          }
        }
      }
    }

    items.push(
      <button key="edit" className="ctx-item" onClick={() => { setShowEntityForm(true, t.id); onClose(); }}>
        <Edit size={14} /><span>Edit Entity</span>
      </button>,
      <button key="drill" className="ctx-item" onClick={() => { drillDown(t.id); onClose(); }}>
        <Eye size={14} /><span>Expand Internals</span>
      </button>,
    );
    if (viewInOptions.length > 0) {
      items.push(
        <div key="viewin-header" className="ctx-separator" />,
        <div key="viewin-label" className="ctx-group-label">View in…</div>,
      );
      for (const opt of viewInOptions) {
        items.push(
          <button key={`viewin-${opt.vp}-${opt.level}`} className="ctx-item" onClick={() => {
            setViewpoint(opt.vp);
            setZoomLevel(opt.level);
            onClose();
          }}>
            <Navigation size={14} /><span>{opt.label}</span>
          </button>,
        );
      }
    }
    items.push(
      <div key="sep" className="ctx-separator" />,
      <button key="del" className="ctx-item ctx-item--danger" onClick={() => { deleteEntity(t.id); onClose(); }}>
        <Trash2 size={14} /><span>Delete</span>
      </button>,
    );
  } else if (t.kind === 'note') {
    items.push(
      <button key="edit" className="ctx-item" onClick={() => { setShowNoteForm(true, t.id); onClose(); }}>
        <Edit size={14} /><span>Edit Note</span>
      </button>,
      <div key="sep" className="ctx-separator" />,
      <button key="del" className="ctx-item ctx-item--danger" onClick={() => { deleteNote(t.id); onClose(); }}>
        <Trash2 size={14} /><span>Delete</span>
      </button>,
    );
  } else if (t.kind === 'boundary') {
    items.push(
      <button key="edit" className="ctx-item" onClick={() => { setShowBoundaryForm(true, t.id); onClose(); }}>
        <Edit size={14} /><span>Edit Boundary</span>
      </button>,
      <div key="sep" className="ctx-separator" />,
      <button key="del" className="ctx-item ctx-item--danger" onClick={() => { deleteBoundary(t.id); onClose(); }}>
        <Trash2 size={14} /><span>Delete</span>
      </button>,
    );
  } else if (t.kind === 'relationship') {
    const rel = relationships.find((r) => r.id === t.id);
    const curRouting = rel?.routing;
    items.push(
      <button key="edit" className="ctx-item" onClick={() => { setShowRelationshipForm(true, t.id); onClose(); }}>
        <Edit size={14} /><span>Edit Relationship</span>
      </button>,
      <div key="sep-route" className="ctx-separator" />,
      <div key="route-label" className="ctx-group-label">Routing</div>,
      <button
        key="route-ortho"
        className={`ctx-item${curRouting === 'ORTHOGONAL' ? ' ctx-item--active' : ''}`}
        onClick={() => { updateRelationship(t.id, { routing: 'ORTHOGONAL' }); onClose(); }}
      >
        <GitBranch size={14} /><span>Orthogonal (elbow)</span>
      </button>,
      <button
        key="route-poly"
        className={`ctx-item${curRouting === 'POLYLINE' ? ' ctx-item--active' : ''}`}
        onClick={() => { updateRelationship(t.id, { routing: 'POLYLINE' }); onClose(); }}
      >
        <Minus size={14} /><span>Polyline (straight)</span>
      </button>,
      <button
        key="route-inherit"
        className={`ctx-item${!curRouting ? ' ctx-item--active' : ''}`}
        onClick={() => { updateRelationship(t.id, { routing: undefined }); onClose(); }}
      >
        <RotateCcw size={14} /><span>Inherit global</span>
      </button>,
      <div key="sep" className="ctx-separator" />,
      <button key="del" className="ctx-item ctx-item--danger" onClick={() => { deleteRelationship(t.id); onClose(); }}>
        <Trash2 size={14} /><span>Delete</span>
      </button>,
    );
  } else if (t.kind === 'canvas') {
    const kindsForZoom = getValidKindsForViewpoint(viewpoint, zoomLevel);
    const defaultKind = (kindsForZoom.length > 0 ? kindsForZoom[kindsForZoom.length - 1] : 'system') as EntityKind;
    items.push(
      <button key="add-entity" className="ctx-item" onClick={() => {
        const id = addEntity({
          name: `New ${defaultKind.charAt(0).toUpperCase() + defaultKind.slice(1)}`,
          shortName: defaultKind.slice(0, 3).toUpperCase(),
          description: '', kind: defaultKind,
          viewpoint,
          parentId: focusEntityId,
          metadata: { tags: [] }, responsibilities: [],
        });
        setPosition(id, snapVal(t.worldX), snapVal(t.worldY));
        setManualLayout(true); selectEntity(id); onClose();
      }}>
        <Plus size={14} /><span>Add Entity</span>
      </button>,
      <button key="add-note" className="ctx-item" onClick={() => {
        const id = addNote('New note');
        updateNote(id, { x: snapVal(t.worldX), y: snapVal(t.worldY) }); onClose();
      }}>
        <StickyNote size={14} /><span>Add Note</span>
      </button>,
      <button key="add-boundary" className="ctx-item" onClick={() => {
        const id = addBoundary('Boundary');
        updateBoundary(id, { x: snapVal(t.worldX), y: snapVal(t.worldY) }); onClose();
      }}>
        <Square size={14} /><span>Add Boundary</span>
      </button>,
      <div key="sep" className="ctx-separator" />,
      <button key="auto-layout" className="ctx-item" onClick={() => { autoLayout(); onClose(); }}>
        <LayoutGrid size={14} /><span>Auto Layout</span>
      </button>,
      <button key="reset" className="ctx-item" onClick={() => { setPan(0, 0); setScale(1); onClose(); }}>
        <RotateCcw size={14} /><span>Reset View</span>
      </button>,
    );
  }

  return (
    <>
      <div className="ctx-backdrop" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="canvas-context-menu"
        style={{ left: menuX, top: menuY }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {items}
      </div>
    </>
  );
};
