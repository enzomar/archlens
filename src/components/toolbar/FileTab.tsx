import React, { useRef } from 'react';
import { useStore } from '../../store/useStore';
import { exportProject, importProject } from '../../export/exportService';
import { EXAMPLE_PROJECT } from '../../utils/exampleData';
import { FilePlus, FolderOpen, Save, Upload, FlaskConical } from 'lucide-react';

export const FileTab: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadProject = useStore((s) => s.loadProject);
  const getProject = useStore((s) => s.getProject);
  const newProject = useStore((s) => s.newProject);
  const setShowExportPanel = useStore((s) => s.setShowExportPanel);

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const project = await importProject(file);
      loadProject(project);
    } catch (err) {
      alert('Failed to load file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    e.target.value = '';
  }

  return (
    <>
      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button className="ribbon-btn" onClick={() => newProject()} title="New project" aria-label="New project">
            <span className="ribbon-btn-icon"><FilePlus size={20} /></span>
            <span className="ribbon-btn-label">New</span>
          </button>
          <button className="ribbon-btn" onClick={() => fileInputRef.current?.click()} title="Open project file (.archlens / .json)" aria-label="Open project">
            <span className="ribbon-btn-icon"><FolderOpen size={20} /></span>
            <span className="ribbon-btn-label">Open</span>
          </button>
          <button className="ribbon-btn" onClick={() => exportProject(getProject())} title="Save project (Ctrl+S)" aria-label="Save project">
            <span className="ribbon-btn-icon"><Save size={20} /></span>
            <span className="ribbon-btn-label">Save</span>
          </button>
        </div>
        <span className="ribbon-group-label">Project</span>
      </div>

      <div className="ribbon-separator" />

      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button className="ribbon-btn" onClick={() => setShowExportPanel(true)} title="Export project (CSV, Excel, PlantUML…)" aria-label="Export project">
            <span className="ribbon-btn-icon"><Upload size={20} /></span>
            <span className="ribbon-btn-label">Export</span>
          </button>
          <button className="ribbon-btn" onClick={() => loadProject(EXAMPLE_PROJECT)} title="Load example C4 diagram" aria-label="Load demo project">
            <span className="ribbon-btn-icon"><FlaskConical size={20} /></span>
            <span className="ribbon-btn-label">Demo</span>
          </button>
        </div>
        <span className="ribbon-group-label">Share</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".archlens,.json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />
    </>
  );
};
