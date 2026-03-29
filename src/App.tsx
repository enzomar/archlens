import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Toolbar } from './components/toolbar/Toolbar';
import { DiagramCanvas } from './components/canvas/DiagramCanvas';
import { DetailPanel } from './components/panels/DetailPanel';
import { NavigatorPanel } from './components/panels/NavigatorPanel';
import { LogPanel } from './components/panels/LogPanel';
import { TabBar } from './components/panels/TabBar';
import { EntityListView } from './components/panels/EntityListView';
import { OrganizationView } from './components/panels/OrganizationView';
import { AnalysisDashboard } from './components/panels/AnalysisDashboard';
import './styles/organization.css';
import './styles/analysis.css';
import { PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose, ChevronDown, ChevronRight, ZoomIn, ZoomOut, X, Home, LayoutList, Network, Maximize2, Minimize2, BarChart3, Building2 } from 'lucide-react';
import { CanvasControls } from './components/canvas/CanvasControls';
import { ResizeHandle } from './components/panels/ResizeHandle';
import { ShapePalette } from './components/panels/ShapePalette';
import { EntityForm } from './components/forms/EntityForm';
import { RelationshipForm } from './components/forms/RelationshipForm';
import { NoteForm } from './components/forms/NoteForm';
import { BoundaryForm } from './components/forms/BoundaryForm';
import { ExportPanel } from './components/panels/ExportPanel';
import { ValidationPanel } from './components/panels/ValidationPanel';
import { ViewManager } from './components/panels/ViewManager';
import { CommandPalette } from './components/panels/CommandPalette';
import { RecoveryBanner } from './components/shared/RecoveryBanner';
import { useStore } from './store/useStore';
import { exportProject } from './export/exportService';
import { ContextControlBar } from './components/nav/ContextControlBar';
import type { ZoomLevel, Viewpoint } from './domain/types';
import './App.css';

const MemoToolbar = React.memo(Toolbar);
const MemoCanvas = React.memo(DiagramCanvas);
const MemoDetailPanel = React.memo(DetailPanel);
const MemoValidation = React.memo(ValidationPanel);
const MemoViewManager = React.memo(ViewManager);
const MemoNavigator = React.memo(NavigatorPanel);
const MemoLogPanel = React.memo(LogPanel);
const MemoTabBar = React.memo(TabBar);

const App: React.FC = () => {
  const rightSidebarOpen = useStore((s) => s.rightSidebarOpen);
  const leftSidebarOpen = useStore((s) => s.leftSidebarOpen);
  const logPanelOpen = useStore((s) => s.logPanelOpen);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const theme = useStore((s) => s.theme);
  const toggleLeftSidebar = useStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useStore((s) => s.toggleRightSidebar);
  const uiMode = useStore((s) => s.uiMode);
  const setUiMode = useStore((s) => s.setUiMode);
  const breadcrumb = useStore((s) => s.breadcrumb);
  const projectName = useStore((s) => s.projectName);
  const scale = useStore((s) => s.scale);
  const setScale = useStore((s) => s.setScale);
  const drillUp = useStore((s) => s.drillUp);
  const drillTo = useStore((s) => s.drillTo);
  const setZoomLevel = useStore((s) => s.setZoomLevel);
  const setViewpoint = useStore((s) => s.setViewpoint);

  const autosaveEnabled  = useStore((s) => s.autosaveEnabled);
  const autosaveInterval = useStore((s) => s.autosaveInterval);
  const showValidationPanel = useStore((s) => s.showValidationPanel);
  const showViewsPanel      = useStore((s) => s.showViewsPanel);

  const isImmersive = uiMode !== 'normal';

  // ── Browser Fullscreen API ─────────────────────────────────
  // Enter fullscreen whenever an immersive mode is activated; exit on normal.
  useEffect(() => {
    if (uiMode !== 'normal') {
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
        mozRequestFullScreen?: () => Promise<void>;
      };
      const req = el.requestFullscreen?.bind(el)
        ?? el.webkitRequestFullscreen?.bind(el)
        ?? el.mozRequestFullScreen?.bind(el);
      req?.().catch(() => { /* user or browser denied fullscreen — no-op */ });
    } else {
      const doc = document as Document & {
        webkitExitFullscreen?: () => Promise<void>;
        mozCancelFullScreen?: () => Promise<void>;
      };
      const exit = doc.exitFullscreen?.bind(doc)
        ?? doc.webkitExitFullscreen?.bind(doc)
        ?? doc.mozCancelFullScreen?.bind(doc);
      if (document.fullscreenElement) exit?.().catch(() => {});
    }
  }, [uiMode]);

  // Sync store back to normal when the user exits fullscreen via browser Esc
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && uiMode !== 'normal') {
        setUiMode('normal');
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, [uiMode, setUiMode]);

  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(300);
  const [logHeight, setLogHeight] = useState(200);
  const [logFullScreen, setLogFullScreen] = useState(false);
  const [detailCollapsed, setDetailCollapsed] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const onResizeLeft = useCallback((delta: number) => {
    setLeftWidth((w) => Math.min(500, Math.max(160, w + delta)));
  }, []);
  const onResizeRight = useCallback((delta: number) => {
    setRightWidth((w) => Math.min(500, Math.max(200, w - delta)));
  }, []);
  const onResizeLog = useCallback((delta: number) => {
    setLogHeight((h) => Math.min(600, Math.max(80, h - delta)));
  }, []);

  // Apply theme on mount
  useEffect(() => {
    if (theme !== 'system') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, []);

  // ── Autosave to localStorage with crash recovery ──────────
  const AUTOSAVE_KEY = 'archlens-autosave';
  const AUTOSAVE_TS_KEY = 'archlens-autosave-ts';
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>();

  const [recoveryData, setRecoveryData] = useState<{ project: unknown; entityCount: number; savedAt: string } | null>(null);

  // On mount: check for autosaved project — show non-blocking banner instead of confirm() dialog
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      const ts = localStorage.getItem(AUTOSAVE_TS_KEY);
      if (saved) {
        const project = JSON.parse(saved);
        if (project && project.entities && project.entities.length > 0) {
          const savedAt = ts ? new Date(Number(ts)).toLocaleString() : 'unknown time';
          setRecoveryData({ project, entityCount: project.entities.length, savedAt });
        }
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  function handleRestore() {
    if (!recoveryData) return;
    useStore.getState().loadProject(recoveryData.project);
    setRecoveryData(null);
  }

  function handleDiscardRecovery() {
    localStorage.removeItem(AUTOSAVE_KEY);
    localStorage.removeItem(AUTOSAVE_TS_KEY);
    setRecoveryData(null);
  }

  // Debounced autosave: subscribe to store changes
  useEffect(() => {
    if (!autosaveEnabled) return;
    const unsub = useStore.subscribe(() => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        try {
          const project = useStore.getState().getProject();
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project));
          localStorage.setItem(AUTOSAVE_TS_KEY, String(Date.now()));
        } catch { /* quota exceeded — silently fail */ }
      }, autosaveInterval * 1000);
    });
    return () => unsub();
  }, [autosaveEnabled, autosaveInterval]);

  // Keyboard shortcuts for immersive modes + undo/redo/save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const ctrl = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Command palette: Ctrl+Shift+P or Cmd+Shift+P
      if (ctrl && e.shiftKey && key === 'p') {
        e.preventDefault();
        setShowCommandPalette((s) => !s);
        return;
      }

      if (ctrl && !e.shiftKey && key === 'z') {
        e.preventDefault();
        useStore.temporal.getState().undo();
        return;
      }
      if (ctrl && (key === 'y' || (e.shiftKey && key === 'z'))) {
        e.preventDefault();
        useStore.temporal.getState().redo();
        return;
      }
      if (ctrl && key === 's') {
        e.preventDefault();
        exportProject(useStore.getState().getProject());
        return;
      }

      // Zoom shortcuts: 1/2/3 — exclusive select; Shift+1/2/3 — additive toggle
      const ZOOM_KEYS: Record<string, ZoomLevel> = { '1': 'context', '2': 'container', '3': 'component' };
      if (!ctrl && ZOOM_KEYS[e.key]) {
        e.preventDefault();
        if (e.shiftKey) {
          useStore.getState().toggleActiveZoomLevel(ZOOM_KEYS[e.key]);
        } else {
          useStore.getState().setZoomLevel(ZOOM_KEYS[e.key]);
        }
        return;
      }
      // Viewpoint shortcuts: b/a/t — exclusive select; Shift+b/a/t — additive toggle
      const VP_KEYS: Record<string, Viewpoint> = { b: 'business', a: 'application', t: 'technology' };
      if (!ctrl && VP_KEYS[key]) {
        e.preventDefault();
        if (e.shiftKey) {
          useStore.getState().toggleActiveViewpoint(VP_KEYS[key]);
        } else {
          useStore.getState().setViewpoint(VP_KEYS[key]);
        }
        return;
      }

      // Canvas zoom: +/= to zoom in, -/_ to zoom out — relative to canvas centre
      if (!ctrl && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_')) {
        e.preventDefault();
        const state = useStore.getState();
        const step = 0.15;
        const delta = (e.key === '+' || e.key === '=') ? step : -step;
        const oldScale = state.scale;
        const newScale = Math.max(0.1, Math.min(4, oldScale + delta));
        if (newScale !== oldScale) {
          const canvas = document.querySelector('svg.diagram-canvas');
          const rect = canvas?.getBoundingClientRect();
          if (rect) {
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const ratio = newScale / oldScale;
            state.setPan(cx - (cx - state.panX) * ratio, cy - (cy - state.panY) * ratio);
          }
          state.setScale(newScale);
        }
        return;
      }

      if (e.key === 'F11') {
        e.preventDefault();
        setUiMode(uiMode === 'distraction-free' ? 'normal' : 'distraction-free');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setUiMode(uiMode === 'presentation' ? 'normal' : 'presentation');
      } else if (e.key === 'Escape' && isImmersive) {
        setUiMode('normal');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [uiMode, isImmersive, setUiMode, setZoomLevel, setViewpoint]);

  return (
    <div className={`app${isImmersive ? ' app--immersive' : ''}`}>
      {!isImmersive && <MemoToolbar />}
      {!isImmersive && viewMode === 'architecture' && <ContextControlBar />}
      {!isImmersive && (
        <div className="diagram-nav-bar">
          <button
            className={`panel-toggle-btn ${leftSidebarOpen ? 'panel-toggle-btn--active' : ''}`}
            onClick={toggleLeftSidebar}
            title={leftSidebarOpen ? 'Hide left panel' : 'Show left panel'}
            aria-pressed={leftSidebarOpen}
          >
            {leftSidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </button>
          {breadcrumb.length > 0 && (
            <nav className="breadcrumb" aria-label="Navigation breadcrumb">
              <button className="breadcrumb-item" onClick={() => { while (useStore.getState().breadcrumb.length > 0) drillUp(); }} aria-label="Go to root">
                <Home size={12} />
              </button>
              {breadcrumb.map((b, i) => (
                <React.Fragment key={b.id}>
                  <span className="breadcrumb-sep">/</span>
                  <button
                    className={`breadcrumb-item${i === breadcrumb.length - 1 ? ' breadcrumb-item--current' : ''}`}
                    onClick={() => drillTo(i)}
                    title={`Navigate to ${b.name}`}
                  >
                    {b.name}
                  </button>
                </React.Fragment>
              ))}
            </nav>
          )}
          <div className="panel-toggles-spacer" />
          <div className="nav-bar-view-btns">
            <button
              className={`panel-toggle-btn${viewMode === 'architecture' ? ' panel-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('architecture')}
              title="Architecture view"
              aria-pressed={viewMode === 'architecture'}
              aria-label="Switch to architecture view"
            >
              <Network size={14} />
            </button>
            <button
              className={`panel-toggle-btn${viewMode === 'list' ? ' panel-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
              aria-pressed={viewMode === 'list'}
              aria-label="Switch to list view"
            >
              <LayoutList size={14} />
            </button>
            <button
              className={`panel-toggle-btn${viewMode === 'analysis' ? ' panel-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('analysis')}
              title="Analysis view"
              aria-pressed={viewMode === 'analysis'}
              aria-label="Switch to analysis view"
            >
              <BarChart3 size={14} />
            </button>
            <button
              className={`panel-toggle-btn${viewMode === 'organization' ? ' panel-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('organization')}
              title="Organization view"
              aria-pressed={viewMode === 'organization'}
              aria-label="Switch to organization view"
            >
              <Building2 size={14} />
            </button>
          </div>
          <div className="nav-bar-sep" />
          <button
            className="panel-toggle-btn"
            onClick={() => setUiMode(uiMode === 'distraction-free' ? 'normal' : 'distraction-free')}
            title={uiMode === 'distraction-free' ? 'Exit fullscreen (F11)' : 'Fullscreen (F11)'}
            aria-label={uiMode === 'distraction-free' ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {uiMode === 'distraction-free' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <div className="nav-bar-sep" />
          <button
            className={`panel-toggle-btn ${rightSidebarOpen ? 'panel-toggle-btn--active' : ''}`}
            onClick={toggleRightSidebar}
            title={rightSidebarOpen ? 'Hide right panel' : 'Show right panel'}
            aria-pressed={rightSidebarOpen}
          >
            {rightSidebarOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
          </button>
        </div>
      )}
      <div className="app-body" role="main">
        {leftSidebarOpen && !isImmersive && (
          <>
            <div className="left-sidebar" style={{ width: leftWidth, minWidth: 160, maxWidth: 500, flexShrink: 0 }}>
              <ShapePalette />
            </div>
            <ResizeHandle direction="horizontal" onResize={onResizeLeft} />
          </>
        )}
        <div className="canvas-and-log">
          {viewMode === 'list' ? (
            <EntityListView />
          ) : viewMode === 'analysis' ? (
            <AnalysisDashboard />
          ) : viewMode === 'organization' ? (
            <OrganizationView />
          ) : (
            <div className="canvas-area">
              <MemoCanvas />
              <CanvasControls />
              {!isImmersive && (
                <div className="canvas-footer">
                  <div className="canvas-footer-controls">
                    {showValidationPanel && <MemoValidation />}
                    {showViewsPanel && <MemoViewManager />}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {rightSidebarOpen && !isImmersive && viewMode === 'architecture' && (
          <>
            <ResizeHandle direction="horizontal" onResize={onResizeRight} />
            <div className="right-sidebar" style={{ width: rightWidth, minWidth: 200, maxWidth: 500, flexShrink: 0 }}>
              <MemoNavigator />
              <div className={`sidebar-section ${detailCollapsed ? 'sidebar-section--collapsed' : ''}`}>
                <button
                  className="sidebar-section-header"
                  onClick={() => setDetailCollapsed((c) => !c)}
                  aria-expanded={!detailCollapsed}
                >
                  {detailCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <span className="sidebar-section-title">Properties</span>
                </button>
                {!detailCollapsed && <MemoDetailPanel />}
              </div>
            </div>
          </>
        )}
      </div>
      {!isImmersive && <MemoTabBar />}
      {!isImmersive && (
        <div
          className={[
            'log-footer',
            !logPanelOpen ? 'log-footer--collapsed' : '',
            logFullScreen ? 'log-footer--fullscreen' : '',
          ].filter(Boolean).join(' ')}
          style={logPanelOpen && !logFullScreen ? { height: logHeight } : undefined}
        >
          {logPanelOpen && !logFullScreen && (
            <ResizeHandle direction="vertical" onResize={onResizeLog} />
          )}
          <MemoLogPanel
            fullScreen={logFullScreen}
            onToggleFullScreen={() => setLogFullScreen((f) => !f)}
          />
        </div>
      )}

      {/* Immersive HUD overlay */}
      {isImmersive && (
        <div className={`canvas-hud canvas-hud--${uiMode}`}>
          {uiMode === 'presentation' && (
            <div className="canvas-hud-bar">
              <div className="canvas-hud-left">
                <span className="canvas-hud-logo">◈</span>
                <span className="canvas-hud-project">{projectName}</span>
                {breadcrumb.length > 0 && (
                  <nav className="canvas-hud-breadcrumb">
                    <button className="canvas-hud-bc-btn" onClick={() => { while (useStore.getState().breadcrumb.length > 0) drillUp(); }}>
                      <Home size={12} />
                    </button>
                    {breadcrumb.map((b, i) => (
                      <button
                        key={b.id}
                        className="canvas-hud-bc-item"
                        onClick={() => drillTo(i)}
                        title={`Navigate to ${b.name}`}
                      >
                        <span className="canvas-hud-bc-sep">/</span>
                        {b.name}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
              <div className="canvas-hud-right">
                <button className="canvas-hud-zoom-btn" onClick={() => setScale(Math.max(0.1, scale - 0.1))} aria-label="Zoom out"><ZoomOut size={13} /></button>
                <span className="canvas-hud-zoom-val">{Math.round(scale * 100)}%</span>
                <button className="canvas-hud-zoom-btn" onClick={() => setScale(Math.min(4, scale + 0.1))} aria-label="Zoom in"><ZoomIn size={13} /></button>
                <div className="canvas-hud-divider" />
                <button className="canvas-hud-exit-btn" onClick={() => setUiMode('normal')} title="Exit presentation (Esc)">
                  <X size={14} />
                  <span>Exit</span>
                </button>
              </div>
            </div>
          )}
          {uiMode === 'distraction-free' && (
            <button className="canvas-hud-exit-pill" onClick={() => setUiMode('normal')} title="Exit distraction-free (F11 or Esc)">
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Recovery banner */}
      {recoveryData && (
        <RecoveryBanner
          entityCount={recoveryData.entityCount}
          savedAt={recoveryData.savedAt}
          onRestore={handleRestore}
          onDiscard={handleDiscardRecovery}
        />
      )}

      {/* Modals */}
      <EntityForm />
      <RelationshipForm />
      <NoteForm />
      <BoundaryForm />
      <ExportPanel />
      {showCommandPalette && <CommandPalette onClose={() => setShowCommandPalette(false)} />}
    </div>
  );
};

export default App;
