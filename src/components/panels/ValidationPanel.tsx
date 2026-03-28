import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { validateModel } from '../../validation/validator';
import { SearchCheck, CircleCheck, CircleX, AlertTriangle } from 'lucide-react';

export const ValidationPanel: React.FC = () => {
  const [show, setShow] = useState(false);
  const entities = useStore((s) => s.entities);
  const relationships = useStore((s) => s.relationships);

  const errors = show ? validateModel(entities, relationships) : [];
  const errorCount = errors.filter((e) => e.type === 'error').length;
  const warnCount = errors.filter((e) => e.type === 'warning').length;

  return (
    <div className="validation-panel">
      <button
        className={`btn btn-sm validation-toggle ${show ? 'btn-active' : ''}`}
        onClick={() => setShow(!show)}
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
                <li key={i} className={`validation-item validation-item--${err.type}`}>
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
