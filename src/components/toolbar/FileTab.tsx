import React, { useRef } from 'react';
import { useStore } from '../../store/useStore';
import { exportProject, exportProjectAs, importProject } from '../../export/exportService';
import { EXAMPLE_PROJECT } from '../../utils/exampleData';
import { FilePlus, FolderOpen, Save, SaveAll, Upload, FlaskConical } from 'lucide-react';

/* ── File Menu ─────────────────────────────────────────────────
   Drop-down menu triggered from the title-bar "File" button.
   Inspired by PowerPoint backstage / draw.io File menu.
   ────────────────────────────────────────────────────────────── */

interface FileMenuProps {
  onClose: () => void;
}

export const FileMenu: React.FC<FileMenuProps> = ({ onClose }) => {
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
    onClose();
  }

  return (
    <div className="file-menu" role="menu" aria-label="File menu">
      <button className="file-menu-item" role="menuitem" onClick={() => { newProject(); onClose(); }}>
        <FilePlus size={15} />
        <span>New Project</span>
      </button>
      <button className="file-menu-item" role="menuitem" onClick={() => fileInputRef.current?.click()}>
        <FolderOpen size={15} />
        <span>Open…</span>
      </button>
      <button className="file-menu-item" role="menuitem" onClick={() => { exportProject(getProject()); onClose(); }}>
        <Save size={15} />
        <span>Save</span>
        <kbd className="file-menu-shortcut">⌘S</kbd>
      </button>
      <button className="file-menu-item" role="menuitem" onClick={() => {
        const name = prompt('Save as:', getProject().name);
        if (name) { exportProjectAs(getProject(), name); }
        onClose();
      }}>
        <SaveAll size={15} />
        <span>Save As…</span>
        <kbd className="file-menu-shortcut">⇧⌘S</kbd>
      </button>
      <div className="file-menu-sep" />
      <button className="file-menu-item" role="menuitem" onClick={() => { setShowExportPanel(true); onClose(); }}>
        <Upload size={15} />
        <span>Export…</span>
      </button>
      <div className="file-menu-sep" />
      <button className="file-menu-item" role="menuitem" onClick={() => { loadProject(EXAMPLE_PROJECT); onClose(); }}>
        <FlaskConical size={15} />
        <span>Load Demo</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".archlens,.json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />
    </div>
  );
};
