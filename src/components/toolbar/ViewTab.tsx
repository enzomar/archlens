import React from 'react';
import { useStore } from '../../store/useStore';
import { Target, Maximize2, LayoutList, Map, ShieldCheck, Layers, AlignJustify, ScanSearch, Network, BarChart3, Building2, Bookmark } from 'lucide-react';

export const ViewTab: React.FC = () => {
  const setScale        = useStore((s) => s.setScale);
  const setPan          = useStore((s) => s.setPan);
  const viewMode       = useStore((s) => s.viewMode);
  const setViewMode     = useStore((s) => s.setViewMode);
  const notArch = viewMode !== 'architecture';

  const showMinimap           = useStore((s) => s.showMinimap);
  const showValidationPanel   = useStore((s) => s.showValidationPanel);
  const showViewsPanel        = useStore((s) => s.showViewsPanel);
  const logPanelOpen          = useStore((s) => s.logPanelOpen);
  const inspectMode           = useStore((s) => s.inspectMode);
  const toggleShowMinimap         = useStore((s) => s.toggleShowMinimap);
  const toggleShowValidationPanel = useStore((s) => s.toggleShowValidationPanel);
  const toggleShowViewsPanel      = useStore((s) => s.toggleShowViewsPanel);
  const toggleLogPanel            = useStore((s) => s.toggleLogPanel);
  const toggleInspectMode         = useStore((s) => s.toggleInspectMode);

  return (
    <>
      {/* ── View mode ─────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button
            className={`ribbon-btn${viewMode === 'architecture' ? ' ribbon-btn--active' : ''}`}
            onClick={() => setViewMode('architecture')}
            title="Architecture diagram canvas"
            aria-label="Architecture view"
            aria-pressed={viewMode === 'architecture'}
          >
            <span className="ribbon-btn-icon"><Network size={20} /></span>
            <span className="ribbon-btn-label">Architecture</span>
          </button>
          <button
            className={`ribbon-btn${viewMode === 'list' ? ' ribbon-btn--active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Entity list view"
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <span className="ribbon-btn-icon"><LayoutList size={20} /></span>
            <span className="ribbon-btn-label">List</span>
          </button>
          <button
            className={`ribbon-btn${viewMode === 'analysis' ? ' ribbon-btn--active' : ''}`}
            onClick={() => setViewMode('analysis')}
            title="Analysis view"
            aria-label="Analysis view"
            aria-pressed={viewMode === 'analysis'}
          >
            <span className="ribbon-btn-icon"><BarChart3 size={20} /></span>
            <span className="ribbon-btn-label">Analysis</span>
          </button>
          <button
            className={`ribbon-btn${viewMode === 'organization' ? ' ribbon-btn--active' : ''}`}
            onClick={() => setViewMode('organization')}
            title="Organization view"
            aria-label="Organization view"
            aria-pressed={viewMode === 'organization'}
          >
            <span className="ribbon-btn-icon"><Building2 size={20} /></span>
            <span className="ribbon-btn-label">Organization</span>
          </button>
        </div>
        <span className="ribbon-group-label">View</span>
      </div>

      <div className="ribbon-separator" />

      {/* ── Camera ───────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button
            className="ribbon-btn"
            onClick={() => { setPan(0, 0); setScale(1); }}
            title="Reset view to origin"
            disabled={notArch}
          >
            <span className="ribbon-btn-icon"><Target size={20} /></span>
            <span className="ribbon-btn-label">Reset</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => setScale(1)}
            title="Set zoom to 100%"
            disabled={notArch}
          >
            <span className="ribbon-btn-icon"><Maximize2 size={20} /></span>
            <span className="ribbon-btn-label">100%</span>
          </button>
        </div>
        <span className="ribbon-group-label">Camera</span>
      </div>

      <div className="ribbon-separator" />

      {/* ── Show / Hide canvas elements ────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button
            className={`ribbon-btn${showMinimap ? ' ribbon-btn--active' : ''}`}
            onClick={toggleShowMinimap}
            title={showMinimap ? 'Hide mini-map' : 'Show mini-map'}
            aria-pressed={showMinimap}
            disabled={notArch}
          >
            <span className="ribbon-btn-icon"><Map size={20} /></span>
            <span className="ribbon-btn-label">Minimap</span>
          </button>
          <button
            className={`ribbon-btn${showValidationPanel ? ' ribbon-btn--active' : ''}`}
            onClick={toggleShowValidationPanel}
            title={showValidationPanel ? 'Hide validation panel' : 'Show validation panel'}
            aria-pressed={showValidationPanel}
            disabled={notArch}
          >
            <span className="ribbon-btn-icon"><ShieldCheck size={20} /></span>
            <span className="ribbon-btn-label">Validate</span>
          </button>
          <button
            className={`ribbon-btn${showViewsPanel ? ' ribbon-btn--active' : ''}`}
            onClick={toggleShowViewsPanel}
            title={showViewsPanel ? 'Hide saved views' : 'Show saved views'}
            aria-pressed={showViewsPanel}
            disabled={notArch}
          >
            <span className="ribbon-btn-icon"><Layers size={20} /></span>
            <span className="ribbon-btn-label">Views</span>
          </button>
          <button
            className={`ribbon-btn${logPanelOpen ? ' ribbon-btn--active' : ''}`}
            onClick={toggleLogPanel}
            title={logPanelOpen ? 'Hide log footer' : 'Show log footer'}
            aria-pressed={logPanelOpen}
          >
            <span className="ribbon-btn-icon"><AlignJustify size={20} /></span>
            <span className="ribbon-btn-label">Log</span>
          </button>
        </div>
        <span className="ribbon-group-label">Show</span>
      </div>

      <div className="ribbon-separator" />

      {/* ── Inspect mode ──────────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button
            className={`ribbon-btn${inspectMode ? ' ribbon-btn--active ribbon-btn--inspect' : ''}`}
            onClick={toggleInspectMode}
            title={inspectMode ? 'Exit inspect mode' : 'Inspect mode: hover elements to see debug info'}
            aria-pressed={inspectMode}
            disabled={notArch}
          >
            <span className="ribbon-btn-icon"><ScanSearch size={20} /></span>
            <span className="ribbon-btn-label">Inspect</span>
          </button>
        </div>
        <span className="ribbon-group-label">Debug</span>
      </div>

      <div className="ribbon-separator" />

      {/* ── View presets ─────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button
            className="ribbon-btn"
            onClick={() => {
              const s = useStore.getState();
              s.setViewMode('architecture');
              s.setViewpoint('application');
              s.setZoomLevel('container');
              s.setSwimlaneOrientation('c4-nested');
              s.autoLayout();
            }}
            title="Application containers as C4 Hierarchy"
          >
            <span className="ribbon-btn-icon"><Bookmark size={20} /></span>
            <span className="ribbon-btn-label">Solution</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => {
              const s = useStore.getState();
              s.setViewMode('architecture');
              s.setViewpoint('application');
              s.setZoomLevel('component');
              s.setSwimlaneOrientation('c4-nested');
              s.autoLayout();
            }}
            title="Application components as C4 Hierarchy"
          >
            <span className="ribbon-btn-icon"><Bookmark size={20} /></span>
            <span className="ribbon-btn-label">Developer</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => {
              const s = useStore.getState();
              s.setViewMode('architecture');
              s.setSwimlaneOrientation('archimate-layered');
              // Activate all viewpoints + context level for full landscape
              s.setViewpoint('business');
              s.toggleActiveViewpoint('application');
              s.toggleActiveViewpoint('technology');
              s.autoLayout();
            }}
            title="All layers as ArchiMate swimlanes"
          >
            <span className="ribbon-btn-icon"><Bookmark size={20} /></span>
            <span className="ribbon-btn-label">Landscape</span>
          </button>
        </div>
        <span className="ribbon-group-label">Presets</span>
      </div>
    </>
  );
};
