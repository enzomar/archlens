import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { DEFAULT_BOUNDARY_STYLE } from '../../domain/types';
import type { BoundaryStyle } from '../../domain/types';
import { X } from 'lucide-react';

export const BoundaryForm: React.FC = () => {
  const showForm = useStore((s) => s.showBoundaryForm);
  const editingId = useStore((s) => s.editingBoundaryId);
  const boundaries = useStore((s) => s.boundaries);
  const addBoundary = useStore((s) => s.addBoundary);
  const updateBoundary = useStore((s) => s.updateBoundary);
  const setShowBoundaryForm = useStore((s) => s.setShowBoundaryForm);

  const editing = editingId ? boundaries.find((b) => b.id === editingId) : null;

  const [label, setLabel] = useState('');
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(300);
  const [style, setStyle] = useState<BoundaryStyle>({ ...DEFAULT_BOUNDARY_STYLE });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showForm) return;
    const el = modalRef.current;
    if (el) {
      const first = el.querySelector<HTMLElement>('input, select, textarea, button');
      first?.focus();
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowBoundaryForm(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showForm]);

  useEffect(() => {
    if (editing) {
      setLabel(editing.label);
      setWidth(editing.width);
      setHeight(editing.height);
      setStyle({ ...editing.style });
    } else {
      setLabel('');
      setWidth(400);
      setHeight(300);
      setStyle({ ...DEFAULT_BOUNDARY_STYLE });
    }
  }, [editing]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;

    if (editing) {
      updateBoundary(editing.id, { label, width, height, style });
    } else {
      const id = addBoundary(label);
      useStore.getState().updateBoundary(id, { width, height, style });
    }
    setShowBoundaryForm(false);
  }

  if (!showForm) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowBoundaryForm(false)} role="presentation">
      <div
        className="modal-content boundary-form"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="boundary-form-title"
      >
        <div className="modal-header">
          <h2 id="boundary-form-title">{editing ? 'Edit Boundary' : 'Add Boundary'}</h2>
          <button className="btn-icon" onClick={() => setShowBoundaryForm(false)} aria-label="Close"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="boundary-label">Label *</label>
            <input id="boundary-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Cloud VPC, DMZ" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="boundary-w">Width</label>
              <input id="boundary-w" type="number" min={100} max={2000} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label htmlFor="boundary-h">Height</label>
              <input id="boundary-h" type="number" min={80} max={2000} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
            </div>
          </div>

          <fieldset className="style-fieldset">
            <legend>Style</legend>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bound-fill">Fill</label>
                <input id="bound-fill" type="color" value={style.fillColor.slice(0, 7)} onChange={(e) => setStyle({ ...style, fillColor: e.target.value + '20' })} />
              </div>
              <div className="form-group">
                <label htmlFor="bound-border">Border</label>
                <input id="bound-border" type="color" value={style.borderColor} onChange={(e) => setStyle({ ...style, borderColor: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="bound-text">Text</label>
                <input id="bound-text" type="color" value={style.textColor} onChange={(e) => setStyle({ ...style, textColor: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bound-fontsize">Font Size</label>
                <input id="bound-fontsize" type="number" min={10} max={28} value={style.fontSize} onChange={(e) => setStyle({ ...style, fontSize: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label htmlFor="bound-fontweight">Weight</label>
                <select id="bound-fontweight" value={style.fontWeight} onChange={(e) => setStyle({ ...style, fontWeight: Number(e.target.value) })}>
                  <option value={400}>Normal</option>
                  <option value={600}>Bold</option>
                  <option value={700}>Extra Bold</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="bound-dash">Border Dash</label>
                <select id="bound-dash" value={style.borderDash} onChange={(e) => setStyle({ ...style, borderDash: e.target.value })}>
                  <option value="8 4">Dashed</option>
                  <option value="4 2">Fine Dash</option>
                  <option value="2 2">Dotted</option>
                  <option value="">Solid</option>
                </select>
              </div>
            </div>
          </fieldset>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowBoundaryForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!label.trim()}>{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
