import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { DEFAULT_NOTE_STYLE } from '../../domain/types';
import type { NoteStyle } from '../../domain/types';
import { X } from 'lucide-react';

export const NoteForm: React.FC = () => {
  const showForm = useStore((s) => s.showNoteForm);
  const editingId = useStore((s) => s.editingNoteId);
  const notes = useStore((s) => s.notes);
  const entities = useStore((s) => s.entities);
  const addNote = useStore((s) => s.addNote);
  const updateNote = useStore((s) => s.updateNote);
  const setShowNoteForm = useStore((s) => s.setShowNoteForm);

  const editing = editingId ? notes.find((n) => n.id === editingId) : null;

  const [text, setText] = useState('');
  const [attachedToId, setAttachedToId] = useState<string>('');
  const [width, setWidth] = useState(180);
  const [height, setHeight] = useState(100);
  const [style, setStyle] = useState<NoteStyle>({ ...DEFAULT_NOTE_STYLE });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showForm) return;
    const el = modalRef.current;
    if (el) {
      const first = el.querySelector<HTMLElement>('input, select, textarea, button');
      first?.focus();
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNoteForm(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showForm]);

  useEffect(() => {
    if (editing) {
      setText(editing.text);
      setAttachedToId(editing.attachedToId ?? '');
      setWidth(editing.width);
      setHeight(editing.height);
      setStyle({ ...editing.style });
    } else {
      setText('');
      setAttachedToId('');
      setWidth(180);
      setHeight(100);
      setStyle({ ...DEFAULT_NOTE_STYLE });
    }
  }, [editing]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    if (editing) {
      updateNote(editing.id, {
        text,
        attachedToId: attachedToId || null,
        width,
        height,
        style,
      });
    } else {
      const id = addNote(text, attachedToId || null);
      // Update dimensions after creation
      const store = useStore.getState();
      store.updateNote(id, { width, height, style });
    }
    setShowNoteForm(false);
  }

  if (!showForm) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowNoteForm(false)} role="presentation">
      <div
        className="modal-content note-form"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-form-title"
      >
        <div className="modal-header">
          <h2 id="note-form-title">{editing ? 'Edit Note' : 'Add Note'}</h2>
          <button className="btn-icon" onClick={() => setShowNoteForm(false)} aria-label="Close"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="note-text">Text *</label>
            <textarea id="note-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Note content..." />
          </div>

          <div className="form-group">
            <label htmlFor="note-attach">Attach to Entity</label>
            <select id="note-attach" value={attachedToId} onChange={(e) => setAttachedToId(e.target.value)}>
              <option value="">— Free floating —</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>{ent.name} [{ent.kind}]</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="note-w">Width</label>
              <input id="note-w" type="number" min={80} max={600} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label htmlFor="note-h">Height</label>
              <input id="note-h" type="number" min={40} max={400} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
            </div>
          </div>

          <fieldset className="style-fieldset">
            <legend>Style</legend>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="note-fill">Fill</label>
                <input id="note-fill" type="color" value={style.fillColor} onChange={(e) => setStyle({ ...style, fillColor: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="note-border">Border</label>
                <input id="note-border" type="color" value={style.borderColor} onChange={(e) => setStyle({ ...style, borderColor: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="note-text-color">Text</label>
                <input id="note-text-color" type="color" value={style.textColor} onChange={(e) => setStyle({ ...style, textColor: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="note-fontsize">Font Size</label>
                <input id="note-fontsize" type="number" min={8} max={24} value={style.fontSize} onChange={(e) => setStyle({ ...style, fontSize: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label htmlFor="note-fontweight">Weight</label>
                <select id="note-fontweight" value={style.fontWeight} onChange={(e) => setStyle({ ...style, fontWeight: Number(e.target.value) })}>
                  <option value={400}>Normal</option>
                  <option value={600}>Bold</option>
                  <option value={300}>Light</option>
                </select>
              </div>
            </div>
          </fieldset>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowNoteForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!text.trim()}>{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
