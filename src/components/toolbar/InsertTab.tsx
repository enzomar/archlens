import React from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Link, StickyNote, Square } from 'lucide-react';

export const InsertTab: React.FC = () => {
  const setShowEntityForm = useStore((s) => s.setShowEntityForm);
  const setShowRelationshipForm = useStore((s) => s.setShowRelationshipForm);
  const setShowNoteForm = useStore((s) => s.setShowNoteForm);
  const setShowBoundaryForm = useStore((s) => s.setShowBoundaryForm);

  return (
    <>
      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button className="ribbon-btn ribbon-btn--accent" onClick={() => setShowEntityForm(true)} title="Add new entity" aria-label="Add entity">
            <span className="ribbon-btn-icon"><Plus size={20} /></span>
            <span className="ribbon-btn-label">Entity</span>
          </button>
          <button className="ribbon-btn ribbon-btn--accent" onClick={() => setShowRelationshipForm(true)} title="Add new relationship" aria-label="Add relationship">
            <span className="ribbon-btn-icon"><Link size={20} /></span>
            <span className="ribbon-btn-label">Relationship</span>
          </button>
        </div>
        <span className="ribbon-group-label">Elements</span>
      </div>

      <div className="ribbon-separator" />

      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button className="ribbon-btn" onClick={() => setShowNoteForm(true)} title="Add sticky note" aria-label="Add note">
            <span className="ribbon-btn-icon"><StickyNote size={20} /></span>
            <span className="ribbon-btn-label">Note</span>
          </button>
          <button className="ribbon-btn" onClick={() => setShowBoundaryForm(true)} title="Add boundary box" aria-label="Add boundary">
            <span className="ribbon-btn-icon"><Square size={20} /></span>
            <span className="ribbon-btn-label">Boundary</span>
          </button>
        </div>
        <span className="ribbon-group-label">Annotations</span>
      </div>
    </>
  );
};
