import React, { useRef, useState } from 'react';
import { useStore, useTemporalStore } from '../../store/useStore';
import type { ThemeMode } from '../../domain/types';
import { exportProject } from '../../export/exportService';
import { FileTab } from './FileTab';
import { InsertTab } from './InsertTab';
import { ViewTab } from './ViewTab';
import { FormatTab } from './FormatTab';
import { HelpTab } from './HelpTab';
import { SettingsTab } from './SettingsTab';
import { ToolbarDialogs } from './ToolbarDialogs';
import {
  Save, Sun, Moon, Monitor,
  Focus, MonitorPlay, Heart, HelpCircle, Mail,
  Undo2, Redo2,
} from 'lucide-react';

type RibbonTab = 'file' | 'insert' | 'view' | 'format' | 'settings' | 'help';

const THEME_ICONS: Record<ThemeMode, React.ReactNode> = {
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
  system: <Monitor size={16} />,
};

const THEME_CYCLE: ThemeMode[] = ['system', 'light', 'dark'];

export const Toolbar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RibbonTab>('insert');
  const [ribbonCollapsed, setRibbonCollapsed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const projectName = useStore((s) => s.projectName);
  const setProjectName = useStore((s) => s.setProjectName);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const getProject = useStore((s) => s.getProject);
  const uiMode = useStore((s) => s.uiMode);
  const setUiMode = useStore((s) => s.setUiMode);

  const canUndo = useTemporalStore((s) => s.pastStates.length > 0);
  const canRedo = useTemporalStore((s) => s.futureStates.length > 0);

  function startEditTitle() {
    setTitleDraft(projectName);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  }

  function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed) setProjectName(trimmed);
    setEditingTitle(false);
  }

  function cycleTheme() {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  }

  return (
    <header className="ribbon">
      {/* ── ROW 1: Tab bar ──────────────────────────────────── */}
      <div className="ribbon-tabbar">
        <div className="ribbon-tabbar-left">
          <div className="toolbar-logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">ArchLens</span>
          </div>

          <div className="ribbon-qab" role="toolbar" aria-label="Quick access">
            <button
              className="ribbon-qab-btn"
              onClick={() => exportProject(getProject())}
              title="Save (Ctrl+S)"
              aria-label="Save"
            >
              <Save size={13} />
            </button>
            <button
              className="ribbon-qab-btn"
              onClick={() => useStore.temporal.getState().undo()}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 size={13} />
            </button>
            <button
              className="ribbon-qab-btn"
              onClick={() => useStore.temporal.getState().redo()}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo"
            >
              <Redo2 size={13} />
            </button>
          </div>

          <nav className="ribbon-tabs" role="tablist" aria-label="Ribbon tabs">
            {(['file', 'insert', 'view', 'format', 'settings', 'help'] as RibbonTab[]).map((tab) => (
              <button
                key={tab}
                className={`ribbon-tab ${activeTab === tab && !ribbonCollapsed ? 'ribbon-tab--active' : ''}`}
                onClick={() => {
                  if (activeTab === tab) {
                    setRibbonCollapsed((c) => !c);
                  } else {
                    setActiveTab(tab);
                    setRibbonCollapsed(false);
                  }
                }}
                role="tab"
                aria-selected={activeTab === tab && !ribbonCollapsed}
                aria-controls={`ribbon-panel-${tab}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="ribbon-tabbar-center">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              className="project-name-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
              autoFocus
              aria-label="Project name"
            />
          ) : (
            <span
              className="project-name project-name--editable"
              onClick={startEditTitle}
              title="Click to rename project"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') startEditTitle(); }}
            >
              {projectName}
            </span>
          )}
        </div>

        <div className="ribbon-tabbar-right">
          <button
            className={`btn-icon ${uiMode === 'distraction-free' ? 'btn-icon--active' : ''}`}
            onClick={() => setUiMode(uiMode === 'distraction-free' ? 'normal' : 'distraction-free')}
            aria-label={uiMode === 'distraction-free' ? 'Exit focus fullscreen (F11)' : 'Focus fullscreen (F11)'}
            title={uiMode === 'distraction-free' ? 'Exit focus fullscreen (F11)' : 'Focus fullscreen (F11)'}
          >
            <Focus size={15} />
          </button>
          <button
            className={`btn-icon ${uiMode === 'presentation' ? 'btn-icon--active' : ''}`}
            onClick={() => setUiMode(uiMode === 'presentation' ? 'normal' : 'presentation')}
            aria-label={uiMode === 'presentation' ? 'Exit presentation fullscreen (F5)' : 'Presentation fullscreen (F5)'}
            title={uiMode === 'presentation' ? 'Exit presentation fullscreen (F5)' : 'Presentation fullscreen (F5)'}
          >
            <MonitorPlay size={15} />
          </button>
          <div className="toolbar-divider" />
          <button className="btn-icon" onClick={cycleTheme} aria-label={`Theme: ${theme}`} title={`Theme: ${theme}`}>
            {THEME_ICONS[theme]}
          </button>
          <div className="toolbar-divider" />
          <button className="btn-icon" onClick={() => setShowHelp(true)} aria-label="Help" title="Help">
            <HelpCircle size={15} />
          </button>
          <button className="btn-icon btn-icon--heart" onClick={() => setShowSupport(true)} aria-label="Support ArchLens" title="Support ArchLens">
            <Heart size={15} />
          </button>
          <button className="btn-icon" onClick={() => setShowContact(true)} aria-label="Contact" title="Contact">
            <Mail size={15} />
          </button>
        </div>
      </div>

      {/* ── ROW 2: Ribbon content ──────────────────────────── */}
      <div className={`ribbon-body${ribbonCollapsed ? ' ribbon-body--collapsed' : ''}`} role="tabpanel" id={`ribbon-panel-${activeTab}`} aria-label={`${activeTab} ribbon`}>
        {activeTab === 'file' && <FileTab />}
        {activeTab === 'insert' && <InsertTab />}
        {activeTab === 'view' && <ViewTab />}
        {activeTab === 'format' && <FormatTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'help' && <HelpTab onShowHelp={() => setShowHelp(true)} />}
      </div>

      <ToolbarDialogs
        showHelp={showHelp}
        onCloseHelp={() => setShowHelp(false)}
        showSupport={showSupport}
        onCloseSupport={() => setShowSupport(false)}
        showContact={showContact}
        onCloseContact={() => setShowContact(false)}
      />
    </header>
  );
};
