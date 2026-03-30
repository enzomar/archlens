import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useStore, useTemporalStore } from '../../store/useStore';
import type { ThemeMode } from '../../domain/types';
import { exportProject } from '../../export/exportService';
import { FileMenu } from './FileTab';
import { InsertTab } from './InsertTab';
import { ViewTab } from './ViewTab';
import { FormatTab } from './FormatTab';
import { HelpTab } from './HelpTab';
import { ToolbarDialogs } from './ToolbarDialogs';
import {
  Save, Sun, Moon, Monitor,
  Focus, MonitorPlay, HelpCircle, Heart,
  Undo2, Redo2, ChevronDown, Settings,
  ZoomIn,
} from 'lucide-react';

type RibbonTab = 'home' | 'insert' | 'view' | 'help';

const THEME_ICONS: Record<ThemeMode, React.ReactNode> = {
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
  system: <Monitor size={16} />,
};

const THEME_CYCLE: ThemeMode[] = ['system', 'light', 'dark'];

/* ── Settings dropdown (self-contained store subscriptions) ──── */
const SettingsDropdown: React.FC = () => {
  const autosaveEnabled    = useStore((s) => s.autosaveEnabled);
  const autosaveInterval   = useStore((s) => s.autosaveInterval);
  const setAutosaveEnabled = useStore((s) => s.setAutosaveEnabled);
  const setAutosaveInterval = useStore((s) => s.setAutosaveInterval);
  const zoomSensitivity    = useStore((s) => s.zoomSensitivity);
  const setZoomSensitivity = useStore((s) => s.setZoomSensitivity);

  return (
    <div className="settings-dropdown" role="menu" aria-label="Settings">
      <div className="settings-section">
        <span className="settings-section-label">Autosave</span>
        <div className="settings-row">
          <button
            className={`settings-toggle${autosaveEnabled ? ' settings-toggle--on' : ''}`}
            onClick={() => setAutosaveEnabled(!autosaveEnabled)}
            aria-pressed={autosaveEnabled}
          >
            {autosaveEnabled ? 'On' : 'Off'}
          </button>
          <input
            type="number"
            className="settings-num"
            value={autosaveInterval}
            min={5} max={300} step={5}
            disabled={!autosaveEnabled}
            onChange={(e) => setAutosaveInterval(Number(e.target.value))}
            aria-label="Autosave interval in seconds"
          />
          <span className="settings-unit">sec</span>
        </div>
      </div>
      <div className="settings-section">
        <span className="settings-section-label">Zoom Sensitivity</span>
        <div className="settings-row">
          <ZoomIn size={12} className="settings-icon" />
          <input
            type="range" className="settings-slider"
            min={1} max={30} step={1}
            value={Math.round(zoomSensitivity * 100)}
            onChange={(e) => setZoomSensitivity(Number(e.target.value) / 100)}
            aria-label="Zoom sensitivity"
          />
          <span className="settings-unit">{Math.round(zoomSensitivity * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export const Toolbar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  const [ribbonCollapsed, setRibbonCollapsed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns on outside click
  const closeDropdowns = useCallback((e: MouseEvent) => {
    if (fileMenuOpen && fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
      setFileMenuOpen(false);
    }
    if (settingsOpen && settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
      setSettingsOpen(false);
    }
  }, [fileMenuOpen, settingsOpen]);

  useEffect(() => {
    document.addEventListener('mousedown', closeDropdowns);
    return () => document.removeEventListener('mousedown', closeDropdowns);
  }, [closeDropdowns]);

  return (
    <header className="ribbon">
      {/* ── ROW 1: Tab bar ──────────────────────────────────── */}
      <div className="ribbon-tabbar">
        <div className="ribbon-tabbar-left">
          <div className="toolbar-logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">ArchLens</span>
          </div>

          {/* ── File dropdown trigger ──────────────── */}
          <div className="ribbon-file-wrapper" ref={fileMenuRef}>
            <button
              className={`ribbon-tab ribbon-tab--file${fileMenuOpen ? ' ribbon-tab--active' : ''}`}
              onClick={() => { setFileMenuOpen((o) => !o); setSettingsOpen(false); }}
              aria-haspopup="menu"
              aria-expanded={fileMenuOpen}
            >
              File <ChevronDown size={9} style={{ marginLeft: 2, opacity: 0.6 }} />
            </button>
            {fileMenuOpen && <FileMenu onClose={() => setFileMenuOpen(false)} />}
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
            {(['home', 'insert', 'view', 'help'] as RibbonTab[]).map((tab) => (
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
          <div className="ribbon-settings-wrapper" ref={settingsRef}>
            <button
              className={`btn-icon${settingsOpen ? ' btn-icon--active' : ''}`}
              onClick={() => { setSettingsOpen((o) => !o); setFileMenuOpen(false); }}
              aria-label="Settings"
              title="Settings"
              aria-haspopup="menu"
              aria-expanded={settingsOpen}
            >
              <Settings size={15} />
            </button>
            {settingsOpen && <SettingsDropdown />}
          </div>
          <div className="toolbar-divider" />
          <button className="btn-icon btn-icon--heart" onClick={() => setShowSupport(true)} aria-label="Support" title="Support">
            <Heart size={15} />
          </button>
          <button className="btn-icon" onClick={() => setShowHelp(true)} aria-label="Help" title="Help">
            <HelpCircle size={15} />
          </button>
        </div>
      </div>

      {/* ── ROW 2: Ribbon content ──────────────────────────── */}
      <div className={`ribbon-body${ribbonCollapsed ? ' ribbon-body--collapsed' : ''}`} role="tabpanel" id={`ribbon-panel-${activeTab}`} aria-label={`${activeTab} ribbon`}>
        {activeTab === 'home' && <FormatTab />}
        {activeTab === 'insert' && <InsertTab />}
        {activeTab === 'view' && <ViewTab />}
        {activeTab === 'help' && <HelpTab onShowHelp={() => setShowHelp(true)} onShowAbout={() => setShowAbout(true)} onShowSupport={() => setShowSupport(true)} onShowContact={() => setShowContact(true)} />}
      </div>

      <ToolbarDialogs
        showHelp={showHelp}
        onCloseHelp={() => setShowHelp(false)}
        showAbout={showAbout}
        onCloseAbout={() => setShowAbout(false)}
        showSupport={showSupport}
        onCloseSupport={() => setShowSupport(false)}
        showContact={showContact}
        onCloseContact={() => setShowContact(false)}
      />
    </header>
  );
};
