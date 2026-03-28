import React, { useRef, useState } from 'react';
import { useStore, useTemporalStore } from '../../store/useStore';
import { ALL_MATURITIES, ALL_DEPLOYMENT_STAGES, ALL_PREDEFINED_TAGS, KIND_COLORS, MATURITY_COLORS, getKindsForViewpointLevel } from '../../domain/types';
import type { EntityKind, Maturity, DeploymentStage, PredefinedTag, ThemeMode } from '../../domain/types';
import { exportProject, importProject } from '../../export/exportService';
import { EXAMPLE_PROJECT } from '../../utils/exampleData';
import {
  FilePlus, FolderOpen, Save, Upload, FlaskConical,
  Plus, Link, Palette, Zap,
  Target, Maximize, LayoutGrid,
  Sun, Moon, Monitor,
  Keyboard, Info, BookOpen, X,
  StickyNote, Square, CreditCard, Grid3x3, Magnet,
  Focus, MonitorPlay, Heart, HelpCircle, Mail,
  Undo2, Redo2, Filter,
} from 'lucide-react';

type RibbonTab = 'file' | 'insert' | 'view' | 'format' | 'help';

const KIND_LABELS: Record<EntityKind, string> = {
  person: 'Person',
  system: 'System',
  container: 'Container',
  component: 'Component',
  artifact: 'Artifact',
  trigger: 'Trigger',
  aimodel: 'AI Model',
  vectorstore: 'Vector Store',
  retriever: 'Retriever',
  evaluation: 'Evaluation',
};

const MATURITY_LABELS: Record<Maturity, string> = {
  DEV: 'Dev',
  INTRO: 'Intro',
  GROW: 'Grow',
  MATURE: 'Mature',
  DECLINE: 'Decline',
};

const STAGE_LABELS: Record<DeploymentStage, string> = {
  LOCAL: 'Local',
  TESTING: 'Testing',
  PRODUCTION: 'Prod',
};

const THEME_ICONS: Record<ThemeMode, React.ReactNode> = {
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
  system: <Monitor size={16} />,
};

const THEME_CYCLE: ThemeMode[] = ['system', 'light', 'dark'];

export const Toolbar: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<RibbonTab>('insert');
  const [ribbonCollapsed, setRibbonCollapsed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  const projectName = useStore((s) => s.projectName);
  const setProjectName = useStore((s) => s.setProjectName);
  const zoomLevel = useStore((s) => s.zoomLevel);
  const viewpoint = useStore((s) => s.viewpoint);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const visualConfig = useStore((s) => s.visualConfig);
  const theme = useStore((s) => s.theme);

  const setShowEntityForm = useStore((s) => s.setShowEntityForm);
  const setShowRelationshipForm = useStore((s) => s.setShowRelationshipForm);
  const setShowExportPanel = useStore((s) => s.setShowExportPanel);
  const setShowNoteForm = useStore((s) => s.setShowNoteForm);
  const setShowBoundaryForm = useStore((s) => s.setShowBoundaryForm);
  const autoLayout = useStore((s) => s.autoLayout);
  const setVisualConfig = useStore((s) => s.setVisualConfig);
  const loadProject = useStore((s) => s.loadProject);
  const getProject = useStore((s) => s.getProject);
  const newProject = useStore((s) => s.newProject);
  const setScale = useStore((s) => s.setScale);
  const setTheme = useStore((s) => s.setTheme);
  const uiMode = useStore((s) => s.uiMode);
  const setUiMode = useStore((s) => s.setUiMode);

  const canUndo = useTemporalStore((s) => s.pastStates.length > 0);
  const canRedo = useTemporalStore((s) => s.futureStates.length > 0);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  function startEditTitle() {
    setTitleDraft(projectName);
    setEditingTitle(true);
    // focus after render
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
            {(['file', 'insert', 'view', 'format', 'help'] as RibbonTab[]).map((tab) => (
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
            aria-label="Focus mode (F11)" title="Focus mode (F11)"
          >
            <Focus size={15} />
          </button>
          <button
            className={`btn-icon ${uiMode === 'presentation' ? 'btn-icon--active' : ''}`}
            onClick={() => setUiMode(uiMode === 'presentation' ? 'normal' : 'presentation')}
            aria-label="Presentation mode (F5)" title="Presentation mode (F5)"
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
          <button className="btn-icon" onClick={() => { setContactSent(false); setShowContact(true); }} aria-label="Contact" title="Contact">
            <Mail size={15} />
          </button>
        </div>
      </div>

      {/* ── ROW 2: Ribbon content ──────────────────────────── */}
      <div className={`ribbon-body${ribbonCollapsed ? ' ribbon-body--collapsed' : ''}`} role="tabpanel" id={`ribbon-panel-${activeTab}`} aria-label={`${activeTab} ribbon`}>
        {activeTab === 'file' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-group-buttons">
                <button className="ribbon-btn" onClick={() => newProject()}>
                  <span className="ribbon-btn-icon"><FilePlus size={20} /></span>
                  <span className="ribbon-btn-label">New</span>
                </button>
                <button className="ribbon-btn" onClick={() => fileInputRef.current?.click()}>
                  <span className="ribbon-btn-icon"><FolderOpen size={20} /></span>
                  <span className="ribbon-btn-label">Open</span>
                </button>
                <button className="ribbon-btn" onClick={() => exportProject(getProject())}>
                  <span className="ribbon-btn-icon"><Save size={20} /></span>
                  <span className="ribbon-btn-label">Save</span>
                </button>
              </div>
              <span className="ribbon-group-label">Project</span>
            </div>

            <div className="ribbon-separator" />

            <div className="ribbon-group">
              <div className="ribbon-group-buttons">
                <button className="ribbon-btn" onClick={() => setShowExportPanel(true)}>
                  <span className="ribbon-btn-icon"><Upload size={20} /></span>
                  <span className="ribbon-btn-label">Export</span>
                </button>
                <button className="ribbon-btn" onClick={() => loadProject(EXAMPLE_PROJECT)}>
                  <span className="ribbon-btn-icon"><FlaskConical size={20} /></span>
                  <span className="ribbon-btn-label">Demo</span>
                </button>
              </div>
              <span className="ribbon-group-label">Share</span>
            </div>
          </>
        )}

        {activeTab === 'insert' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-group-buttons">
                <button className="ribbon-btn ribbon-btn--accent" onClick={() => setShowEntityForm(true)}>
                  <span className="ribbon-btn-icon"><Plus size={20} /></span>
                  <span className="ribbon-btn-label">Entity</span>
                </button>
                <button className="ribbon-btn ribbon-btn--accent" onClick={() => setShowRelationshipForm(true)}>
                  <span className="ribbon-btn-icon"><Link size={20} /></span>
                  <span className="ribbon-btn-label">Relationship</span>
                </button>
              </div>
              <span className="ribbon-group-label">Elements</span>
            </div>

            <div className="ribbon-separator" />

            <div className="ribbon-group">
              <div className="ribbon-group-buttons">
                <button className="ribbon-btn" onClick={() => setShowNoteForm(true)}>
                  <span className="ribbon-btn-icon"><StickyNote size={20} /></span>
                  <span className="ribbon-btn-label">Note</span>
                </button>
                <button className="ribbon-btn" onClick={() => setShowBoundaryForm(true)}>
                  <span className="ribbon-btn-icon"><Square size={20} /></span>
                  <span className="ribbon-btn-label">Boundary</span>
                </button>
              </div>
              <span className="ribbon-group-label">Annotations</span>
            </div>
          </>
        )}

        {activeTab === 'view' && (() => {
          const contextKinds = getKindsForViewpointLevel(viewpoint, zoomLevel);
          const activeKinds = filters.kinds ?? [];
          const activeMaturities = filters.maturities ?? [];
          const activeStages = filters.deploymentStages ?? [];
          const activeTags = filters.tags ?? [];

          const toggleKind = (k: EntityKind) => {
            const cur = new Set(activeKinds);
            if (cur.has(k)) cur.delete(k); else cur.add(k);
            setFilters({ ...filters, kinds: cur.size > 0 ? [...cur] : undefined });
          };
          const toggleMaturity = (m: Maturity) => {
            const cur = new Set(activeMaturities);
            if (cur.has(m)) cur.delete(m); else cur.add(m);
            setFilters({ ...filters, maturities: cur.size > 0 ? [...cur] : undefined });
          };
          const toggleStage = (s: DeploymentStage) => {
            const cur = new Set(activeStages);
            if (cur.has(s)) cur.delete(s); else cur.add(s);
            setFilters({ ...filters, deploymentStages: cur.size > 0 ? [...cur] : undefined });
          };
          const toggleTag = (t: PredefinedTag) => {
            const cur = new Set(activeTags);
            if (cur.has(t)) cur.delete(t); else cur.add(t);
            setFilters({ ...filters, tags: cur.size > 0 ? [...cur] : undefined });
          };
          const hasAnyFilter = activeKinds.length > 0 || activeMaturities.length > 0 || activeStages.length > 0 || activeTags.length > 0;
          const clearAll = () => setFilters({});

          return (
            <>
              {/* ── By Kind ── */}
              <div className="ribbon-group">
                <div className="ribbon-group-buttons ribbon-group-buttons--wrap">
                  {contextKinds.map((k) => (
                    <button
                      key={k}
                      className={`btn btn-xs ${activeKinds.includes(k) ? 'btn-active' : ''}`}
                      style={{ '--kind-accent': KIND_COLORS[k] } as React.CSSProperties}
                      onClick={() => toggleKind(k)}
                      title={KIND_LABELS[k]}
                    >
                      <span className="kind-dot" style={{ background: KIND_COLORS[k] }} />
                      {KIND_LABELS[k]}
                    </button>
                  ))}
                </div>
                <span className="ribbon-group-label">By Kind</span>
              </div>

              <div className="ribbon-separator" />

              {/* ── By Maturity ── */}
              <div className="ribbon-group">
                <div className="ribbon-group-buttons ribbon-group-buttons--wrap">
                  {ALL_MATURITIES.map((m) => (
                    <button
                      key={m}
                      className={`btn btn-xs ${activeMaturities.includes(m) ? 'btn-active' : ''}`}
                      onClick={() => toggleMaturity(m)}
                      title={MATURITY_LABELS[m]}
                    >
                      <span className="kind-dot" style={{ background: MATURITY_COLORS[m] }} />
                      {MATURITY_LABELS[m]}
                    </button>
                  ))}
                </div>
                <span className="ribbon-group-label">By Maturity</span>
              </div>

              <div className="ribbon-separator" />

              {/* ── By Stage ── */}
              <div className="ribbon-group">
                <div className="ribbon-group-buttons ribbon-group-buttons--wrap">
                  {ALL_DEPLOYMENT_STAGES.map((st) => (
                    <button
                      key={st}
                      className={`btn btn-xs ${activeStages.includes(st) ? 'btn-active' : ''}`}
                      onClick={() => toggleStage(st)}
                    >
                      {STAGE_LABELS[st]}
                    </button>
                  ))}
                </div>
                <span className="ribbon-group-label">By Stage</span>
              </div>

              <div className="ribbon-separator" />

              {/* ── By Tag ── */}
              <div className="ribbon-group">
                <div className="ribbon-group-buttons ribbon-group-buttons--wrap">
                  {ALL_PREDEFINED_TAGS.map((t) => (
                    <button
                      key={t}
                      className={`btn btn-xs ${activeTags.includes(t) ? 'btn-active' : ''}`}
                      onClick={() => toggleTag(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <span className="ribbon-group-label">By Tag</span>
              </div>

              <div className="ribbon-separator" />

              {/* ── Camera + Clear ── */}
              <div className="ribbon-group">
                <div className="ribbon-group-buttons">
                  <button className="ribbon-btn" onClick={() => { useStore.getState().setPan(0, 0); useStore.getState().setScale(1); }}>
                    <span className="ribbon-btn-icon"><Target size={20} /></span>
                    <span className="ribbon-btn-label">Reset</span>
                  </button>
                  <button className="ribbon-btn" onClick={() => setScale(1)}>
                    <span className="ribbon-btn-icon"><Maximize size={20} /></span>
                    <span className="ribbon-btn-label">100%</span>
                  </button>
                  {hasAnyFilter && (
                    <button className="ribbon-btn ribbon-btn--warning" onClick={clearAll} title="Clear all filters">
                      <span className="ribbon-btn-icon"><Filter size={20} /></span>
                      <span className="ribbon-btn-label">Clear</span>
                    </button>
                  )}
                </div>
                <span className="ribbon-group-label">Camera</span>
              </div>
            </>
          );
        })()}

        {activeTab === 'format' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-group-buttons">
                <button
                  className={`ribbon-btn ${visualConfig.nodeDisplayMode === 'extended' ? 'ribbon-btn--active' : ''}`}
                  onClick={() => setVisualConfig({ ...visualConfig, nodeDisplayMode: visualConfig.nodeDisplayMode === 'standard' ? 'extended' : 'standard' })}
                  title={`Node display: ${visualConfig.nodeDisplayMode}`}
                >
                  <span className="ribbon-btn-icon"><CreditCard size={20} /></span>
                  <span className="ribbon-btn-label">{visualConfig.nodeDisplayMode === 'standard' ? 'Standard' : 'Extended'}</span>
                </button>
                <button
                  className="ribbon-btn"
                  onClick={() => setVisualConfig({ ...visualConfig, colorBy: visualConfig.colorBy === 'kind' ? 'maturity' : 'kind' })}
                  title={`Color by: ${visualConfig.colorBy}`}
                >
                  <span className="ribbon-btn-icon"><Palette size={20} /></span>
                  <span className="ribbon-btn-label">{visualConfig.colorBy === 'kind' ? 'By Kind' : 'By Maturity'}</span>
                </button>
              </div>
              <span className="ribbon-group-label">Display</span>
            </div>

            <div className="ribbon-separator" />

            <div className="ribbon-group">
              <div className="ribbon-group-buttons">
                <button
                  className={`ribbon-btn ${visualConfig.animateEdges !== 'off' ? 'ribbon-btn--active' : ''}`}
                  onClick={() => {
                    const next = visualConfig.animateEdges === 'off' ? 'on' : visualConfig.animateEdges === 'on' ? 'dynamic' : 'off';
                    setVisualConfig({ ...visualConfig, animateEdges: next });
                  }}
                  title={`Edge animation: ${visualConfig.animateEdges}`}
                >
                  <span className="ribbon-btn-icon"><Zap size={20} /></span>
                  <span className="ribbon-btn-label">{visualConfig.animateEdges === 'off' ? 'Static' : visualConfig.animateEdges === 'on' ? 'Animated' : 'Dynamic'}</span>
                </button>
              </div>
              <span className="ribbon-group-label">Effects</span>
            </div>

            <div className="ribbon-separator" />

            <div className="ribbon-group">
              <div className="ribbon-group-buttons">
                <button
                  className={`ribbon-btn ${visualConfig.showGrid ? 'ribbon-btn--active' : ''}`}
                  onClick={() => setVisualConfig({ ...visualConfig, showGrid: !visualConfig.showGrid })}
                  title={visualConfig.showGrid ? 'Hide grid' : 'Show grid'}
                >
                  <span className="ribbon-btn-icon"><Grid3x3 size={20} /></span>
                  <span className="ribbon-btn-label">{visualConfig.showGrid ? 'Grid On' : 'Grid Off'}</span>
                </button>
                <button
                  className={`ribbon-btn ${visualConfig.snapToGrid ? 'ribbon-btn--active' : ''}`}
                  onClick={() => setVisualConfig({ ...visualConfig, snapToGrid: !visualConfig.snapToGrid })}
                  title={visualConfig.snapToGrid ? 'Disable snap' : 'Enable snap'}
                >
                  <span className="ribbon-btn-icon"><Magnet size={20} /></span>
                  <span className="ribbon-btn-label">{visualConfig.snapToGrid ? 'Snap On' : 'Snap Off'}</span>
                </button>
              </div>
              <span className="ribbon-group-label">Grid</span>
            </div>

            <div className="ribbon-separator" />

            <div className="ribbon-group">
              <div className="ribbon-group-buttons">
                <button className="ribbon-btn ribbon-btn--accent" onClick={() => autoLayout()} title="Re-layout all unlocked entities">
                  <span className="ribbon-btn-icon"><LayoutGrid size={20} /></span>
                  <span className="ribbon-btn-label">Auto Layout</span>
                </button>
              </div>
              <span className="ribbon-group-label">Arrange</span>
            </div>
          </>
        )}

        {activeTab === 'help' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-group-buttons">
                <button className="ribbon-btn" onClick={() => setShowHelp(true)}>
                  <span className="ribbon-btn-icon"><Keyboard size={20} /></span>
                  <span className="ribbon-btn-label">Shortcuts</span>
                </button>
                <button className="ribbon-btn" onClick={() => window.open('https://c4model.com', '_blank', 'noopener,noreferrer')}>
                  <span className="ribbon-btn-icon"><BookOpen size={20} /></span>
                  <span className="ribbon-btn-label">C4 Model</span>
                </button>
                <button className="ribbon-btn" onClick={() => setShowHelp(true)}>
                  <span className="ribbon-btn-icon"><Info size={20} /></span>
                  <span className="ribbon-btn-label">About</span>
                </button>
              </div>
              <span className="ribbon-group-label">Resources</span>
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".archlens,.json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />

      {/* Help dialog */}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)} role="presentation">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="help-title">
            <div className="modal-header">
              <h2 id="help-title">ArchLens — Help</h2>
              <button className="btn-icon" onClick={() => setShowHelp(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="help-content">
              <h3>Keyboard Shortcuts</h3>
              <div className="help-shortcuts">
                <div className="help-shortcut"><kbd>Scroll</kbd> <span>Zoom in/out</span></div>
                <div className="help-shortcut"><kbd>Click + Drag</kbd> <span>Pan canvas</span></div>
                <div className="help-shortcut"><kbd>Double-click</kbd> <span>Drill into entity</span></div>
                <div className="help-shortcut"><kbd>Escape</kbd> <span>Close dialog</span></div>
                <div className="help-shortcut"><kbd>F5</kbd> <span>Presentation mode</span></div>
                <div className="help-shortcut"><kbd>F11</kbd> <span>Distraction-free mode</span></div>
              </div>
              <h3 style={{ marginTop: 16 }}>About</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                ArchLens is a C4-model compliant architecture modeling platform.
                It supports zoom levels (System Context, Container, Component, Code).
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Version 1.0.0
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Support dialog */}
      {showSupport && (
        <div className="modal-overlay" onClick={() => setShowSupport(false)} role="presentation">
          <div className="modal-content modal-content--support" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="support-title">
            <div className="modal-header">
              <h2 id="support-title">Support ArchLens</h2>
              <button className="btn-icon" onClick={() => setShowSupport(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="support-content">
              <div className="support-hero">
                <Heart size={40} className="support-heart-icon" />
              </div>
              <h3 className="support-heading">Why your support matters</h3>
              <p className="support-text">
                ArchLens is a free, open-source tool built with passion to help teams 
                visualize and communicate software architecture effectively.
              </p>
              <ul className="support-reasons">
                <li>Keep ArchLens free and ad-free for everyone</li>
                <li>Fund new features: collaboration, import/export, cloud sync</li>
                <li>Cover hosting, infrastructure, and development costs</li>
                <li>Support an independent developer — not a corporation</li>
              </ul>
              <p className="support-text">
                Every contribution, no matter how small, helps keep this project alive 
                and growing. Thank you for being part of the journey.
              </p>
              <button
                className="support-btn"
                onClick={() => window.open('https://www.paypal.com/donate/?hosted_button_id=ARCHLENS', '_blank', 'noopener,noreferrer')}
              >
                <Heart size={16} />
                Support via PayPal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact dialog */}
      {showContact && (
        <div className="modal-overlay" onClick={() => setShowContact(false)} role="presentation">
          <div className="modal-content modal-content--contact" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="contact-title">
            <div className="modal-header">
              <h2 id="contact-title">Contact</h2>
              <button className="btn-icon" onClick={() => setShowContact(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="contact-content">
              {contactSent ? (
                <div className="contact-success">
                  <p>Message sent! We'll get back to you soon.</p>
                  <button className="btn btn-sm" onClick={() => setShowContact(false)}>Close</button>
                </div>
              ) : (
                <form
                  className="contact-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setContactSending(true);
                    try {
                      const res = await fetch('https://formspree.io/f/xpwdgkjq', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                        body: JSON.stringify({ name: contactName, email: contactEmail, message: contactMessage }),
                      });
                      if (res.ok) {
                        setContactSent(true);
                        setContactName(''); setContactEmail(''); setContactMessage('');
                      } else {
                        alert('Failed to send. Please try again.');
                      }
                    } catch {
                      alert('Network error. Please try again.');
                    } finally {
                      setContactSending(false);
                    }
                  }}
                >
                  <label className="contact-label">
                    Name
                    <input
                      className="contact-input"
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                      placeholder="Your name"
                    />
                  </label>
                  <label className="contact-label">
                    Email
                    <input
                      className="contact-input"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                    />
                  </label>
                  <label className="contact-label">
                    Message
                    <textarea
                      className="contact-input contact-textarea"
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      required
                      rows={4}
                      placeholder="How can we help?"
                    />
                  </label>
                  <button className="contact-submit" type="submit" disabled={contactSending}>
                    {contactSending ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
