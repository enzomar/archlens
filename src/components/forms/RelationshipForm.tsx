import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import type { EdgeType } from '../../domain/types';
import { ALL_EDGE_TYPES } from '../../domain/types';
import { X } from 'lucide-react';

export const RelationshipForm: React.FC = () => {
  const showForm = useStore((s) => s.showRelationshipForm);
  const editingId = useStore((s) => s.editingRelationshipId);
  const prefillSourceId = useStore((s) => s.prefillRelSourceId);
  const prefillTargetId = useStore((s) => s.prefillRelTargetId);
  const entities = useStore((s) => s.entities);
  const relationships = useStore((s) => s.relationships);
  const addRelationship = useStore((s) => s.addRelationship);
  const updateRelationship = useStore((s) => s.updateRelationship);
  const setShowRelationshipForm = useStore((s) => s.setShowRelationshipForm);

  const editingRel = editingId ? relationships.find((r) => r.id === editingId) : null;
  const isEdit = !!editingRel;

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [type, setType] = useState<EdgeType>('sync');
  const [label, setLabel] = useState('');
  const [protocol, setProtocol] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Populate form when editing
  useEffect(() => {
    if (showForm && editingRel) {
      setSourceId(editingRel.sourceId);
      setTargetId(editingRel.targetId);
      setType(editingRel.type);
      setLabel(editingRel.label);
      setProtocol(editingRel.protocol ?? '');
      setDescription(editingRel.description ?? '');
    } else if (showForm && !editingRel) {
      resetForm();
      // Pre-fill source/target when opened via drag-to-connect
      if (prefillSourceId) setSourceId(prefillSourceId);
      if (prefillTargetId) setTargetId(prefillTargetId);
    }
  }, [showForm, editingRel, prefillSourceId, prefillTargetId]);

  // Focus trap + Escape handler
  useEffect(() => {
    if (!showForm) return;
    const el = modalRef.current;
    if (el) {
      const firstFocusable = el.querySelector<HTMLElement>('input, select, textarea, button');
      firstFocusable?.focus();
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRelationshipForm(false);
        return;
      }
      if (e.key === 'Tab' && el) {
        const focusable = el.querySelectorAll<HTMLElement>('input, select, textarea, button, [tabindex]');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  function resetForm() {
    setSourceId(''); setTargetId(''); setType('sync'); setLabel('');
    setProtocol(''); setDescription(''); setErrors([]);
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!sourceId) errs.push('Source is required');
    if (!targetId) errs.push('Target is required');
    if (sourceId === targetId) errs.push('Source and target must be different');
    if (!label.trim()) errs.push('Label is required');
    setErrors(errs);
    return errs.length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (isEdit && editingId) {
      updateRelationship(editingId, {
        sourceId,
        targetId,
        type,
        label,
        protocol: protocol || undefined,
        description: description || undefined,
      });
    } else {
      addRelationship({
        sourceId,
        targetId,
        type,
        label,
        ...(protocol && { protocol }),
        ...(description && { description }),
      });
    }

    setShowRelationshipForm(false);
    resetForm();
  }

  if (!showForm) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowRelationshipForm(false)} role="presentation">
      <div
        className="modal-content relationship-form"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rel-form-title"
      >
        <div className="modal-header">
          <h2 id="rel-form-title">{isEdit ? 'Edit Relationship' : 'Create Relationship'}</h2>
          <button className="btn-icon" onClick={() => setShowRelationshipForm(false)} aria-label="Close"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {errors.length > 0 && (
            <div className="form-errors" role="alert" aria-live="assertive">
              {errors.map((err, i) => <div key={i} className="form-error">{err}</div>)}
            </div>
          )}

          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="rel-source">Source *</label>
              <select id="rel-source" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                <option value="">— Select —</option>
                {entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>{ent.name} [{ent.kind}]</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ alignSelf: 'end', paddingBottom: 8 }} aria-hidden="true">
              →
            </div>
            <div className="form-group flex-2">
              <label htmlFor="rel-target">Target *</label>
              <select id="rel-target" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                <option value="">— Select —</option>
                {entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>{ent.name} [{ent.kind}]</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="rel-type">Type *</label>
              <select id="rel-type" value={type} onChange={(e) => setType(e.target.value as EdgeType)}>
                {ALL_EDGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === 'sync' ? '⟶ Synchronous' :
                     t === 'async' ? '⇢ Asynchronous' :
                     t === 'dataflow' ? '⟹ Data Flow' :
                     t === 'dependency' ? '⟶ Dependency' :
                     '⚡ Trigger'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group flex-2">
              <label htmlFor="rel-label">Label *</label>
              <input id="rel-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Makes API calls" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="rel-protocol">Protocol</label>
              <input id="rel-protocol" type="text" value={protocol} onChange={(e) => setProtocol(e.target.value)} placeholder="e.g. HTTPS, gRPC" />
            </div>
            <div className="form-group flex-2">
              <label htmlFor="rel-desc">Description</label>
              <input id="rel-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional details" />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowRelationshipForm(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEdit ? 'Save Changes' : 'Create Relationship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
