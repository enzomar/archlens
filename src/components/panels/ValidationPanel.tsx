import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { validateModel } from '../../validation/validator';
import { SearchCheck, CircleCheck, CircleX, AlertTriangle } from 'lucide-react';

export const ValidationPanel: React.FC = () => {
  const [show, setShow] = useState(false);
  const entities = useStore((s) => s.entities);
  const relationships = useStore((s) => s.relationships);
  const selectEntity = useStore((s) => s.selectEntity);

  const errors = show ? validateModel(entities, relationships) : [];
  const errorCount = errors.filter((e) => e.type === 'error').length;
  const warnCount = errors.filter((e) => e.type === 'warning').length;

  const handleItemClick = (entityId?: string) => {
    if (!entityId) return;
    selectEntity(entityId);
    // Pan to entity using canvas element dimensions (not window — sidebars reduce viewport width)
    const state = useStore.getState();
    const pos = state.positions.find((p) => p.entityId === entityId);
    if (pos) {
      const canvas = document.getElementById('main-canvas');
      const vw = canvas?.clientWidth ?? window.innerWidth;
      const vh = canvas?.clientHeight ?? window.innerHeight;
      state.setPan(-pos.x * state.scale + vw / 2, -pos.y * state.scale + vh / 2);
    }
  };

  return (
    <div className="validation-panel">
      <button
        className={`btn btn-sm validation-toggle ${show ? 'btn-active' : ''}`}
        onClick={() => setShow(!show)}
        title={show ? 'Hide validation results' : 'Validate model'}
        aria-label={show ? 'Hide validation results' : 'Validate model'}
        aria-expanded={show}
      >
        <SearchCheck size={14} /> Validate {show && errors.length > 0 && (
          <span className="validation-count">
            {errorCount > 0 && <span className="validation-error-count">{errorCount}E</span>}
            {warnCount > 0 && <span className="validation-warn-count">{warnCount}W</span>}
          </span>
        )}
      </button>

      {show && (
        <div className="validation-results" role="region" aria-live="polite" aria-label="Validation results">
          {errors.length === 0 ? (
            <p className="validation-ok"><CircleCheck size={14} /> Model is valid — no issues found.</p>
          ) : (
            <ul className="validation-list">
              {errors.map((err, i) => (
                <li
                  key={i}
                  className={`validation-item validation-item--${err.type}${err.entityId ? ' validation-item--clickable' : ''}`}
                  onClick={() => handleItemClick(err.entityId)}
                  role={err.entityId ? 'button' : undefined}
                  tabIndex={err.entityId ? 0 : undefined}
                  onKeyDown={err.entityId ? (e) => { if (e.key === 'Enter') handleItemClick(err.entityId); } : undefined}
                >
                  <span className="validation-icon">{err.type === 'error' ? <CircleX size={14} /> : <AlertTriangle size={14} />}</span>
                  {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
