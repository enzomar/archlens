import React from 'react';
import { useStore } from '../../store/useStore';
import { LayoutGrid, X } from 'lucide-react';

export const ViewManager: React.FC = () => {
  const views = useStore((s) => s.views);
  const loadView = useStore((s) => s.loadView);
  const deleteView = useStore((s) => s.deleteView);
  const saveView = useStore((s) => s.saveView);

  const [open, setOpen] = React.useState(false);

  function handleSaveView() {
    const name = prompt('View name:');
    if (name?.trim()) saveView(name.trim());
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
            <button className="btn btn-sm btn-primary" onClick={handleSaveView}>+ Save Current</button>
          </div>
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
