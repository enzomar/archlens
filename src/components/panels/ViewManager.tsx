import React from 'react';
import { useStore } from '../../store/useStore';
import { LayoutGrid, X, Check } from 'lucide-react';

export const ViewManager: React.FC = () => {
  const views = useStore((s) => s.views);
  const loadView = useStore((s) => s.loadView);
  const deleteView = useStore((s) => s.deleteView);
  const saveView = useStore((s) => s.saveView);

  const [open, setOpen] = React.useState(false);
  const [showNameInput, setShowNameInput] = React.useState(false);
  const [pendingName, setPendingName] = React.useState('');

  function handleSaveConfirm() {
    if (pendingName.trim()) {
      saveView(pendingName.trim());
      setPendingName('');
      setShowNameInput(false);
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSaveConfirm();
    if (e.key === 'Escape') { setShowNameInput(false); setPendingName(''); }
  }

  return (
    <div className="view-manager">
      <button
        className="btn btn-sm"
        onClick={() => setOpen(!open)}
        title={open ? 'Hide saved views' : 'Show saved views'}
        aria-label="Saved views"
        aria-expanded={open}
      >
        <LayoutGrid size={14} /> Views {views.length > 0 && `(${views.length})`}
      </button>

      {open && (
        <div className="view-dropdown">
          <div className="view-dropdown-header">
            <span>Saved Views</span>
            {!showNameInput && (
              <button className="btn btn-sm btn-primary" onClick={() => setShowNameInput(true)}>+ Save Current</button>
            )}
          </div>
          {showNameInput && (
            <div className="view-name-input-row">
              <input
                type="text"
                className="view-name-input"
                placeholder="View name…"
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                autoFocus
                maxLength={80}
              />
              <button className="btn-icon" onClick={handleSaveConfirm} aria-label="Save view" title="Save" disabled={!pendingName.trim()}>
                <Check size={14} />
              </button>
              <button className="btn-icon" onClick={() => { setShowNameInput(false); setPendingName(''); }} aria-label="Cancel">
                <X size={14} />
              </button>
            </div>
          )}
          {views.length === 0 ? (
            <p className="view-empty">No saved views yet.</p>
          ) : (
            <ul className="view-list">
              {views.map((v) => (
                <li key={v.id} className="view-item">
                  <button className="view-item-name" onClick={() => { loadView(v.id); setOpen(false); }}>
                    {v.name}
                    <span className="view-item-meta">{v.zoomLevel}</span>
                  </button>
                  <button className="btn-icon btn-danger-icon" onClick={() => deleteView(v.id)} aria-label={`Delete view: ${v.name}`} title={`Delete view: ${v.name}`}><X size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
