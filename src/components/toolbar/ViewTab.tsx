import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import {
  ALL_MATURITIES, ALL_DEPLOYMENT_STAGES, ALL_PREDEFINED_TAGS,
  KIND_COLORS, MATURITY_COLORS, getKindsForViewpointLevel,
} from '../../domain/types';
import type { EntityKind, Maturity, DeploymentStage, PredefinedTag } from '../../domain/types';
import { Target, Maximize2, SlidersHorizontal, X, LayoutList, Map, ShieldCheck, Layers, AlignJustify, ScanSearch } from 'lucide-react';

const KIND_LABELS: Record<EntityKind, string> = {
  person: 'Person', system: 'System', container: 'Container', component: 'Component',
  artifact: 'Artifact', trigger: 'Trigger', aimodel: 'AI Model',
  vectorstore: 'Vector Store', retriever: 'Retriever', evaluation: 'Evaluation',
};

const MATURITY_LABELS: Record<Maturity, string> = {
  DEV: 'Dev', INTRO: 'Intro', GROW: 'Grow', MATURE: 'Mature', DECLINE: 'Decline',
};

const STAGE_LABELS: Record<DeploymentStage, string> = {
  LOCAL: 'Local', TESTING: 'Testing', PRODUCTION: 'Prod',
};

export const ViewTab: React.FC = () => {
  const filters    = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const setScale        = useStore((s) => s.setScale);
  const setPan          = useStore((s) => s.setPan);
  const showListView    = useStore((s) => s.showListView);
  const toggleListView  = useStore((s) => s.toggleListView);

  const showMinimap           = useStore((s) => s.showMinimap);
  const showValidationPanel   = useStore((s) => s.showValidationPanel);
  const showViewsPanel        = useStore((s) => s.showViewsPanel);
  const logPanelOpen          = useStore((s) => s.logPanelOpen);
  const inspectMode           = useStore((s) => s.inspectMode);
  const activeZoomLevels      = useStore((s) => s.activeZoomLevels);
  const activeViewpoints      = useStore((s) => s.activeViewpoints);
  const toggleShowMinimap         = useStore((s) => s.toggleShowMinimap);
  const toggleShowValidationPanel = useStore((s) => s.toggleShowValidationPanel);
  const toggleShowViewsPanel      = useStore((s) => s.toggleShowViewsPanel);
  const toggleLogPanel            = useStore((s) => s.toggleLogPanel);
  const toggleInspectMode         = useStore((s) => s.toggleInspectMode);

  const [filterOpen, setFilterOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef  = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !dropdownRef.current?.contains(e.target as Node) &&
        !filterBtnRef.current?.contains(e.target as Node)
      ) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  const contextKinds     = [...new Set(
    activeViewpoints.flatMap((vp) => activeZoomLevels.flatMap((zl) => getKindsForViewpointLevel(vp, zl)))
  )] as EntityKind[];
  const activeKinds      = filters.kinds ?? [];
  const activeMaturities = filters.maturities ?? [];
  const activeStages     = filters.deploymentStages ?? [];
  const activeTags       = filters.tags ?? [];

  const filterCount =
    activeKinds.length + activeMaturities.length + activeStages.length + activeTags.length;

  const toggle = <T extends string>(
    active: T[], value: T,
    mapKey: (arr: T[]) => Partial<typeof filters>
  ) => {
    const cur = new Set(active);
    cur.has(value) ? cur.delete(value) : cur.add(value);
    setFilters({ ...filters, ...mapKey([...cur]) });
  };

  const toggleKind      = (k: EntityKind)        => toggle(activeKinds, k,
    (arr) => ({ kinds: arr.length > 0 ? arr : undefined }));
  const toggleMaturity  = (m: Maturity)           => toggle(activeMaturities, m,
    (arr) => ({ maturities: arr.length > 0 ? arr : undefined }));
  const toggleStage     = (s: DeploymentStage)    => toggle(activeStages, s,
    (arr) => ({ deploymentStages: arr.length > 0 ? arr : undefined }));
  const toggleTag       = (t: PredefinedTag)      => toggle(activeTags, t,
    (arr) => ({ tags: arr.length > 0 ? arr : undefined }));

  return (
    <>
      {/* ── View mode ─────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button
            className={`ribbon-btn${showListView ? ' ribbon-btn--active' : ''}`}
            onClick={toggleListView}
            title={showListView ? 'Back to diagram canvas' : 'Switch to entity list view'}
            aria-label={showListView ? 'Back to diagram canvas' : 'Switch to entity list view'}
            aria-pressed={showListView}
          >
            <span className="ribbon-btn-icon"><LayoutList size={20} /></span>
            <span className="ribbon-btn-label">List</span>
          </button>
        </div>
        <span className="ribbon-group-label">Mode</span>
      </div>

      <div className="ribbon-separator" />

      {/* ── Camera ───────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button
            className="ribbon-btn"
            onClick={() => { setPan(0, 0); setScale(1); }}
            title="Reset view to origin"
            disabled={showListView}
          >
            <span className="ribbon-btn-icon"><Target size={20} /></span>
            <span className="ribbon-btn-label">Reset</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => setScale(1)}
            title="Set zoom to 100%"
            disabled={showListView}
          >
            <span className="ribbon-btn-icon"><Maximize2 size={20} /></span>
            <span className="ribbon-btn-label">100%</span>
          </button>
        </div>
        <span className="ribbon-group-label">Camera</span>
      </div>

      <div className="ribbon-separator" />

      {/* ── Filters ──────────────────────────────── */}
      <div className="ribbon-group" style={{ position: 'relative' }}>
        <div className="ribbon-group-buttons">
          <button
            ref={filterBtnRef}
            className={`ribbon-btn${filterOpen ? ' ribbon-btn--active' : ''}${filterCount > 0 ? ' ribbon-btn--filtered' : ''}`}
            onClick={() => setFilterOpen((o) => !o)}
            title="Toggle filters"
          >
            <span className="ribbon-btn-icon" style={{ position: 'relative' }}>
              <SlidersHorizontal size={20} />
              {filterCount > 0 && (
                <span className="filter-badge">{filterCount}</span>
              )}
            </span>
            <span className="ribbon-btn-label">Filter{filterCount > 0 ? ` (${filterCount})` : ''}</span>
          </button>

          {filterCount > 0 && (
            <button
              className="ribbon-btn ribbon-btn--warning"
              onClick={() => setFilters({})}
              title="Clear all filters"
            >
              <span className="ribbon-btn-icon"><X size={20} /></span>
              <span className="ribbon-btn-label">Clear</span>
            </button>
          )}
        </div>
        <span className="ribbon-group-label">Filters</span>

        {/* Dropdown panel */}
        {filterOpen && (
          <div ref={dropdownRef} className="filter-dropdown">
            <FilterSection label="Kind">
              {contextKinds.map((k) => (
                <FilterChip
                  key={k}
                  label={KIND_LABELS[k]}
                  active={activeKinds.includes(k)}
                  color={KIND_COLORS[k]}
                  onClick={() => toggleKind(k)}
                />
              ))}
            </FilterSection>

            <FilterSection label="Maturity">
              {ALL_MATURITIES.map((m) => (
                <FilterChip
                  key={m}
                  label={MATURITY_LABELS[m]}
                  active={activeMaturities.includes(m)}
                  color={MATURITY_COLORS[m]}
                  onClick={() => toggleMaturity(m)}
                />
              ))}
            </FilterSection>

            <FilterSection label="Stage">
              {ALL_DEPLOYMENT_STAGES.map((s) => (
                <FilterChip
                  key={s}
                  label={STAGE_LABELS[s]}
                  active={activeStages.includes(s)}
                  onClick={() => toggleStage(s)}
                />
              ))}
            </FilterSection>

            <FilterSection label="Tags">
              {ALL_PREDEFINED_TAGS.map((t) => (
                <FilterChip
                  key={t}
                  label={t}
                  active={activeTags.includes(t)}
                  onClick={() => toggleTag(t)}
                />
              ))}
            </FilterSection>

            {filterCount > 0 && (
              <div className="filter-dropdown-footer">
                <button className="filter-clear-btn" onClick={() => { setFilters({}); setFilterOpen(false); }} title="Clear all active filters" aria-label="Clear all filters">
                  Clear all {filterCount} filter{filterCount !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        )}
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
            disabled={showListView}
          >
            <span className="ribbon-btn-icon"><Map size={20} /></span>
            <span className="ribbon-btn-label">Minimap</span>
          </button>
          <button
            className={`ribbon-btn${showValidationPanel ? ' ribbon-btn--active' : ''}`}
            onClick={toggleShowValidationPanel}
            title={showValidationPanel ? 'Hide validation panel' : 'Show validation panel'}
            aria-pressed={showValidationPanel}
            disabled={showListView}
          >
            <span className="ribbon-btn-icon"><ShieldCheck size={20} /></span>
            <span className="ribbon-btn-label">Validate</span>
          </button>
          <button
            className={`ribbon-btn${showViewsPanel ? ' ribbon-btn--active' : ''}`}
            onClick={toggleShowViewsPanel}
            title={showViewsPanel ? 'Hide saved views' : 'Show saved views'}
            aria-pressed={showViewsPanel}
            disabled={showListView}
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
            disabled={showListView}
          >
            <span className="ribbon-btn-icon"><ScanSearch size={20} /></span>
            <span className="ribbon-btn-label">Inspect</span>
          </button>
        </div>
        <span className="ribbon-group-label">Debug</span>
      </div>
    </>
  );
};

/* ── Sub-components ───────────────────────────────────────────── */

const FilterSection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="filter-section">
    <span className="filter-section-label">{label}</span>
    <div className="filter-chips">{children}</div>
  </div>
);

const FilterChip: React.FC<{
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}> = ({ label, active, color, onClick }) => (
  <button
    className={`filter-chip${active ? ' filter-chip--active' : ''}`}
    style={active && color ? { background: color, borderColor: color } : undefined}
    onClick={onClick}
    title={active ? `Remove filter: ${label}` : `Filter by: ${label}`}
    aria-label={active ? `Remove filter: ${label}` : `Filter by: ${label}`}
    aria-pressed={active}
  >
    {color && <span className="filter-chip-dot" style={{ background: color }} />}
    {label}
  </button>
);
