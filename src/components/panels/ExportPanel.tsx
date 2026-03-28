import React, { useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { exportEntitiesCsv, exportRelationshipsCsv, exportExcel, exportProject } from '../../export/exportService';
import { Save, Table, Link, FileSpreadsheet, X } from 'lucide-react';

export const ExportPanel: React.FC = () => {
  const show = useStore((s) => s.showExportPanel);
  const setShow = useStore((s) => s.setShowExportPanel);
  const entities = useStore((s) => s.entities);
  const relationships = useStore((s) => s.relationships);
  const getProject = useStore((s) => s.getProject);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const el = modalRef.current;
    if (el) {
      const firstFocusable = el.querySelector<HTMLElement>('button');
      firstFocusable?.focus();
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShow(false);
        return;
      }
      if (e.key === 'Tab' && el) {
        const focusable = el.querySelectorAll<HTMLElement>('button, [tabindex]');
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
  }, [show]);

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={() => setShow(false)} role="presentation">
      <div
        className="modal-content export-panel"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-panel-title"
      >
        <div className="modal-header">
          <h2 id="export-panel-title">Export</h2>
          <button className="btn-icon" onClick={() => setShow(false)} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="export-options">
          <button className="export-card" onClick={() => { exportProject(getProject()); setShow(false); }}>
            <div className="export-icon" aria-hidden="true"><Save size={24} /></div>
            <h4>ArchLens Project</h4>
            <p>Full project file (.archlens) with all entities, relationships, layout, and views.</p>
          </button>

          <button className="export-card" onClick={() => { exportEntitiesCsv(entities); setShow(false); }}>
            <div className="export-icon" aria-hidden="true"><Table size={24} /></div>
            <h4>Entities CSV</h4>
            <p>All entities with metadata in comma-separated format.</p>
          </button>

          <button className="export-card" onClick={() => { exportRelationshipsCsv(relationships); setShow(false); }}>
            <div className="export-icon" aria-hidden="true"><Link size={24} /></div>
            <h4>Relationships CSV</h4>
            <p>All relationships with types and protocols.</p>
          </button>

          <button className="export-card" onClick={() => { exportExcel(entities, relationships); setShow(false); }}>
            <div className="export-icon" aria-hidden="true"><FileSpreadsheet size={24} /></div>
            <h4>Excel (TSV)</h4>
            <p>Combined entities and relationships in tab-separated format for Excel.</p>
          </button>
        </div>
      </div>
    </div>
  );
};
