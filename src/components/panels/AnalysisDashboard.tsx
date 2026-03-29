import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import {
  KIND_COLORS,
  MATURITY_COLORS,
  VIEWPOINT_COLORS,
  VIEWPOINT_BG_COLORS,
  VIEWPOINT_LABELS,
} from '../../domain/types';
import type { ArchEntity, EntityKind, Viewpoint, ZoomLevel, Maturity, Relationship } from '../../domain/types';
import { KIND_MATRIX, KIND_TO_ZOOM, DRILLABLE_KINDS } from '../../domain/matrix';
import { validateModel } from '../../validation/validator';
import {
  Search, ChevronDown, ChevronRight, AlertTriangle, AlertCircle,
  Pencil, Shield, ShieldAlert, Layers, Network, Zap,
  TrendingUp, Activity, Target, GitBranch, Box, Users,
  ArrowRightLeft,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

type PanelId =
  | 'health' | 'techdebt' | 'complexity' | 'distribution'
  | 'coupling' | 'coverage' | 'maturity' | 'ownership';

interface Metric {
  label: string;
  value: number | string;
  total?: number;
  severity?: 'ok' | 'warn' | 'danger';
  detail?: string;
}

// ─── Pure computation helpers ─────────────────────────────────────

function computeHealthScore(
  entities: ArchEntity[],
  relationships: Relationship[],
  errors: { type: 'error' | 'warning' }[],
): number {
  if (entities.length === 0) return 100;
  const errCount = errors.filter((e) => e.type === 'error').length;
  const warnCount = errors.filter((e) => e.type === 'warning').length;
  const penalty = errCount * 8 + warnCount * 2;
  return Math.max(0, Math.min(100, 100 - penalty));
}

function severity(score: number): 'ok' | 'warn' | 'danger' {
  if (score >= 80) return 'ok';
  if (score >= 50) return 'warn';
  return 'danger';
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

/** Count entities with a given field missing or empty. */
function countMissing(entities: ArchEntity[], field: (e: ArchEntity) => unknown): number {
  return entities.filter((e) => {
    const v = field(e);
    if (v == null) return true;
    if (typeof v === 'string' && !v.trim()) return true;
    return false;
  }).length;
}

/** Afferent + efferent coupling per entity. */
function computeCoupling(entities: ArchEntity[], relationships: Relationship[]) {
  const aff = new Map<string, number>(); // incoming
  const eff = new Map<string, number>(); // outgoing
  for (const r of relationships) {
    eff.set(r.sourceId, (eff.get(r.sourceId) ?? 0) + 1);
    aff.set(r.targetId, (aff.get(r.targetId) ?? 0) + 1);
  }
  return entities.map((e) => ({
    entity: e,
    afferent: aff.get(e.id) ?? 0,
    efferent: eff.get(e.id) ?? 0,
    total: (aff.get(e.id) ?? 0) + (eff.get(e.id) ?? 0),
  }));
}

/** Entities with highest child count (structural fan-out). */
function structuralComplexity(entities: ArchEntity[]) {
  const childCount = new Map<string, number>();
  for (const e of entities) {
    if (e.parentId) childCount.set(e.parentId, (childCount.get(e.parentId) ?? 0) + 1);
  }
  return entities
    .filter((e) => childCount.has(e.id))
    .map((e) => ({ entity: e, children: childCount.get(e.id)! }))
    .sort((a, b) => b.children - a.children);
}

function kindLabel(kind: string): string {
  return kind.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Sub-components ───────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 64 }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const sev = severity(score);
  const color = sev === 'ok' ? 'var(--success)' : sev === 'warn' ? 'var(--warning)' : 'var(--danger)';
  return (
    <svg width={size} height={size} className="ad-score-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="ad-score-text" fill={color}
      >
        {score}
      </text>
    </svg>
  );
};

/** Horizontal bar segment chart. */
const SegmentBar: React.FC<{ segments: { label: string; count: number; color: string }[] }> = ({ segments }) => {
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (total === 0) return null;
  return (
    <div className="ad-segment-bar" role="img" aria-label="Distribution">
      {segments.map((seg) =>
        seg.count > 0 ? (
          <div
            key={seg.label}
            className="ad-segment"
            style={{ width: `${(seg.count / total) * 100}%`, background: seg.color }}
            title={`${seg.label}: ${seg.count} (${pct(seg.count, total)})`}
          />
        ) : null
      )}
    </div>
  );
};

const MetricCard: React.FC<Metric & { icon?: React.ReactNode }> = ({ label, value, total, severity: sev, detail, icon }) => (
  <div className={`ad-metric ${sev ? `ad-metric--${sev}` : ''}`}>
    <div className="ad-metric-top">
      {icon && <span className="ad-metric-icon">{icon}</span>}
      <span className="ad-metric-label">{label}</span>
    </div>
    <div className="ad-metric-value">
      {value}
      {total != null && <span className="ad-metric-total">/{total}</span>}
    </div>
    {detail && <span className="ad-metric-detail">{detail}</span>}
  </div>
);

/** Sortable, filterable mini-table for entity lists. */
const EntityTable: React.FC<{
  rows: { entity: ArchEntity; values: (string | number)[] }[];
  columns: string[];
  onEdit: (id: string) => void;
}> = ({ rows, columns, onEdit }) => {
  const [sortCol, setSortCol] = useState(1);
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const idx = sortCol;
    return [...rows].sort((a, b) => {
      const av = a.values[idx] ?? '';
      const bv = b.values[idx] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [rows, sortCol, sortAsc]);

  const handleSort = (i: number) => {
    if (sortCol === i) setSortAsc((a) => !a);
    else { setSortCol(i); setSortAsc(false); }
  };

  return (
    <div className="ad-table-wrap">
      <table className="ad-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c} onClick={() => handleSort(i)} className={sortCol === i ? 'ad-th--sorted' : ''}>
                {c}
                {sortCol === i && <span className="ad-sort-arrow">{sortAsc ? '↑' : '↓'}</span>}
              </th>
            ))}
            <th className="ad-th-action" />
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, 20).map(({ entity, values }) => (
            <tr key={entity.id} onClick={() => onEdit(entity.id)}>
              {values.map((v, i) => (
                <td key={i}>
                  {i === 0 ? (
                    <span className="ad-name-cell">
                      <span className="ad-entity-dot" style={{ background: KIND_COLORS[entity.kind] ?? 'var(--border)' }} />
                      {v}
                    </span>
                  ) : v}
                </td>
              ))}
              <td>
                <button className="ad-edit-btn" onClick={(ev) => { ev.stopPropagation(); onEdit(entity.id); }}><Pencil size={11} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 20 && <div className="ad-table-more">Showing top 20 of {rows.length}</div>}
    </div>
  );
};

/** Collapsible panel. */
const Panel: React.FC<{
  id: PanelId;
  title: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeSeverity?: 'ok' | 'warn' | 'danger';
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, badge, badgeSeverity, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="ad-panel">
      <button className="ad-panel-header" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ad-panel-icon">{icon}</span>
        <span className="ad-panel-title">{title}</span>
        {badge != null && (
          <span className={`ad-badge ${badgeSeverity ? `ad-badge--${badgeSeverity}` : ''}`}>{badge}</span>
        )}
        <span className="ad-panel-chevron">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
      </button>
      {open && <div className="ad-panel-body">{children}</div>}
    </section>
  );
};

// ─── Main dashboard ───────────────────────────────────────────────

export const AnalysisDashboard: React.FC = () => {
  const entities = useStore((s) => s.entities);
  const relationships = useStore((s) => s.relationships);
  const setShowEntityForm = useStore((s) => s.setShowEntityForm);

  const [search, setSearch] = useState('');
  const [vpFilter, setVpFilter] = useState<Viewpoint | 'all'>('all');

  const onEdit = useCallback((id: string) => setShowEntityForm(true, id), [setShowEntityForm]);

  // ── Filtered entities ───────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = entities;
    if (vpFilter !== 'all') list = list.filter((e) => e.viewpoint === vpFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.shortName.toLowerCase().includes(q) ||
          e.kind.toLowerCase().includes(q) ||
          (e.metadata.owner ?? '').toLowerCase().includes(q) ||
          (e.metadata.technology ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [entities, vpFilter, search]);

  const filteredRels = useMemo(() => {
    const ids = new Set(filtered.map((e) => e.id));
    return relationships.filter((r) => ids.has(r.sourceId) || ids.has(r.targetId));
  }, [filtered, relationships]);

  // ── Validation ──────────────────────────────────────────────────
  const validationErrors = useMemo(() => validateModel(filtered, filteredRels), [filtered, filteredRels]);
  const errorCount = validationErrors.filter((e) => e.type === 'error').length;
  const warnCount = validationErrors.filter((e) => e.type === 'warning').length;
  const healthScore = useMemo(() => computeHealthScore(filtered, filteredRels, validationErrors), [filtered, filteredRels, validationErrors]);

  // ── Distribution ────────────────────────────────────────────────
  const byKind = useMemo(() => {
    const map = new Map<EntityKind, number>();
    for (const e of filtered) map.set(e.kind, (map.get(e.kind) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const byLevel = useMemo(() => {
    const map = new Map<ZoomLevel, number>();
    for (const e of filtered) {
      const lvl = KIND_TO_ZOOM[e.kind] ?? 'context';
      map.set(lvl, (map.get(lvl) ?? 0) + 1);
    }
    return map;
  }, [filtered]);

  const byViewpoint = useMemo(() => {
    const map = new Map<Viewpoint, number>();
    for (const e of filtered) map.set(e.viewpoint, (map.get(e.viewpoint) ?? 0) + 1);
    return map;
  }, [filtered]);

  const byMaturity = useMemo(() => {
    const map = new Map<Maturity | 'none', number>();
    for (const e of filtered) {
      const m = e.metadata.maturity ?? 'none';
      map.set(m, (map.get(m) ?? 0) + 1);
    }
    return map;
  }, [filtered]);

  // ── Tech debt indicators ────────────────────────────────────────
  const missingDesc = countMissing(filtered, (e) => e.description);
  const missingOwner = countMissing(filtered, (e) => e.metadata.owner);
  const missingTech = countMissing(filtered, (e) => e.metadata.technology);
  const missingMaturity = countMissing(filtered, (e) => e.metadata.maturity);
  const decliningEntities = filtered.filter((e) => e.metadata.maturity === 'DECLINE');
  const devEntities = filtered.filter((e) => e.metadata.maturity === 'DEV');
  const piiEntities = filtered.filter((e) => e.metadata.pii);
  const pciEntities = filtered.filter((e) => e.metadata.pciDss);
  const orphanCount = warnCount; // orphans are the main warning

  const documentationScore = useMemo(() => {
    if (filtered.length === 0) return 100;
    const documented = filtered.filter((e) => e.description.trim().length > 0).length;
    return Math.round((documented / filtered.length) * 100);
  }, [filtered]);

  const metadataCompleteness = useMemo(() => {
    if (filtered.length === 0) return 100;
    let total = 0;
    let filled = 0;
    for (const e of filtered) {
      total += 5; // owner, tech, maturity, description, size
      if (e.metadata.owner?.trim()) filled++;
      if (e.metadata.technology?.trim()) filled++;
      if (e.metadata.maturity) filled++;
      if (e.description.trim()) filled++;
      if (e.metadata.size) filled++;
    }
    return Math.round((filled / total) * 100);
  }, [filtered]);

  // ── Coupling / Complexity ───────────────────────────────────────
  const coupling = useMemo(() => computeCoupling(filtered, filteredRels), [filtered, filteredRels]);
  const topCoupled = useMemo(() => [...coupling].sort((a, b) => b.total - a.total).slice(0, 10), [coupling]);
  const avgCoupling = coupling.length > 0 ? (coupling.reduce((s, c) => s + c.total, 0) / coupling.length).toFixed(1) : '0';

  const structural = useMemo(() => structuralComplexity(filtered), [filtered]);

  // ── Ownership distribution ──────────────────────────────────────
  const ownerMap = useMemo(() => {
    const map = new Map<string, ArchEntity[]>();
    for (const e of filtered) {
      const o = e.metadata.owner?.trim() || 'Unassigned';
      const list = map.get(o);
      if (list) list.push(e);
      else map.set(o, [e]);
    }
    return map;
  }, [filtered]);

  const sortedOwners = useMemo(() =>
    Array.from(ownerMap.entries())
      .sort((a, b) => b[1].length - a[1].length),
  [ownerMap]);

  // ── Edge type breakdown ─────────────────────────────────────────
  const edgeTypeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredRels) map.set(r.type, (map.get(r.type) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredRels]);

  // ── Render ──────────────────────────────────────────────────────
  const levelOrder: ZoomLevel[] = ['context', 'container', 'component', 'code'];
  const viewpointOrder: Viewpoint[] = ['business', 'application', 'technology', 'global'];

  return (
    <div className="ad-root">
      {/* ── Toolbar ──────────────────────────────── */}
      <div className="ad-toolbar">
        <div className="ad-toolbar-left">
          <Activity size={16} className="ad-toolbar-icon" />
          <span className="ad-toolbar-title">Architecture Analysis</span>
        </div>
        <div className="ad-toolbar-center">
          <div className="ad-vp-pills">
            <button
              className={`ad-vp-pill ${vpFilter === 'all' ? 'ad-vp-pill--active' : ''}`}
              onClick={() => setVpFilter('all')}
            >All</button>
            {viewpointOrder.map((vp) => (
              <button
                key={vp}
                className={`ad-vp-pill ${vpFilter === vp ? 'ad-vp-pill--active' : ''}`}
                style={vpFilter === vp ? { borderColor: VIEWPOINT_COLORS[vp], color: VIEWPOINT_COLORS[vp] } : undefined}
                onClick={() => setVpFilter(vp)}
              >
                {VIEWPOINT_LABELS[vp]}
              </button>
            ))}
          </div>
        </div>
        <div className="ad-search-wrap">
          <Search size={13} />
          <input className="ad-search" placeholder="Search entities…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ── Scoreboard ───────────────────────────── */}
      <div className="ad-scoreboard">
        <div className="ad-score-card ad-score-card--health">
          <ScoreRing score={healthScore} size={56} />
          <div>
            <div className="ad-score-label">Health Score</div>
            <div className="ad-score-sub">{errorCount} errors · {warnCount} warnings</div>
          </div>
        </div>
        <div className="ad-score-card">
          <div className="ad-score-num">{filtered.length}</div>
          <div className="ad-score-label">Entities</div>
        </div>
        <div className="ad-score-card">
          <div className="ad-score-num">{filteredRels.length}</div>
          <div className="ad-score-label">Relationships</div>
        </div>
        <div className="ad-score-card">
          <div className="ad-score-num">{documentationScore}%</div>
          <div className="ad-score-label">Documented</div>
        </div>
        <div className="ad-score-card">
          <div className="ad-score-num">{metadataCompleteness}%</div>
          <div className="ad-score-label">Completeness</div>
        </div>
        <div className="ad-score-card">
          <div className="ad-score-num">{avgCoupling}</div>
          <div className="ad-score-label">Avg Coupling</div>
        </div>
      </div>

      {/* ── Dashboard body ───────────────────────── */}
      <div className="ad-body">
        {/* LEFT column */}
        <div className="ad-col">
          {/* Health & Validation */}
          <Panel id="health" title="Model Health" icon={<Shield size={14} />}
            badge={errorCount + warnCount} badgeSeverity={errorCount > 0 ? 'danger' : warnCount > 0 ? 'warn' : 'ok'}>
            {validationErrors.length === 0 ? (
              <p className="ad-empty-msg">Model is clean — no issues detected.</p>
            ) : (
              <ul className="ad-issue-list">
                {validationErrors.map((err, i) => (
                  <li key={i} className={`ad-issue ad-issue--${err.type}`}
                    onClick={() => { if (err.entityId) onEdit(err.entityId); }}
                    role={err.entityId ? 'button' : undefined}
                    tabIndex={err.entityId ? 0 : undefined}
                  >
                    {err.type === 'error' ? <AlertCircle size={12} /> : <AlertTriangle size={12} />}
                    <span>{err.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Tech Debt */}
          <Panel id="techdebt" title="Tech Debt & Gaps" icon={<ShieldAlert size={14} />}
            badge={missingDesc + missingOwner + missingTech + decliningEntities.length}
            badgeSeverity={decliningEntities.length > 0 ? 'danger' : missingOwner > 0 ? 'warn' : 'ok'}>
            <div className="ad-metrics-grid">
              <MetricCard label="Missing description" value={missingDesc} total={filtered.length}
                severity={missingDesc > filtered.length * 0.3 ? 'danger' : missingDesc > 0 ? 'warn' : 'ok'}
                detail={pct(missingDesc, filtered.length)} />
              <MetricCard label="Missing owner" value={missingOwner} total={filtered.length}
                severity={missingOwner > filtered.length * 0.5 ? 'danger' : missingOwner > 0 ? 'warn' : 'ok'}
                detail={pct(missingOwner, filtered.length)} />
              <MetricCard label="Missing technology" value={missingTech} total={filtered.length}
                severity={missingTech > filtered.length * 0.5 ? 'warn' : 'ok'}
                detail={pct(missingTech, filtered.length)} />
              <MetricCard label="Missing maturity" value={missingMaturity} total={filtered.length}
                severity={missingMaturity > filtered.length * 0.3 ? 'warn' : 'ok'}
                detail={pct(missingMaturity, filtered.length)} />
              <MetricCard label="Declining" value={decliningEntities.length}
                severity={decliningEntities.length > 0 ? 'danger' : 'ok'}
                icon={<TrendingUp size={12} />}
                detail="DECLINE maturity" />
              <MetricCard label="In development" value={devEntities.length}
                severity={'ok'}
                icon={<Zap size={12} />}
                detail="DEV maturity" />
              <MetricCard label="Orphan entities" value={orphanCount}
                severity={orphanCount > 0 ? 'warn' : 'ok'}
                detail="No relationships" />
              <MetricCard label="Completeness" value={`${metadataCompleteness}%`}
                severity={severity(metadataCompleteness)} />
            </div>
            {decliningEntities.length > 0 && (
              <EntityTable
                columns={['Name', 'Kind', 'Technology', 'Owner']}
                rows={decliningEntities.map((e) => ({
                  entity: e,
                  values: [e.name, kindLabel(e.kind), e.metadata.technology ?? '—', e.metadata.owner ?? '—'],
                }))}
                onEdit={onEdit}
              />
            )}
          </Panel>

          {/* Coupling */}
          <Panel id="coupling" title="Coupling Analysis" icon={<GitBranch size={14} />}
            badge={topCoupled.length > 0 ? topCoupled[0].total : 0}
            defaultOpen={true}>
            <div className="ad-metrics-grid ad-metrics-grid--2">
              <MetricCard label="Avg coupling" value={avgCoupling} detail="connections/entity" />
              <MetricCard label="Max coupling" value={topCoupled.length > 0 ? topCoupled[0].total : 0}
                detail={topCoupled.length > 0 ? topCoupled[0].entity.name : '—'}
                severity={topCoupled.length > 0 && topCoupled[0].total > 8 ? 'danger' : topCoupled.length > 0 && topCoupled[0].total > 5 ? 'warn' : 'ok'} />
            </div>
            {topCoupled.length > 0 && (
              <EntityTable
                columns={['Name', 'In', 'Out', 'Total', 'Kind']}
                rows={topCoupled.map((c) => ({
                  entity: c.entity,
                  values: [c.entity.name, c.afferent, c.efferent, c.total, kindLabel(c.entity.kind)],
                }))}
                onEdit={onEdit}
              />
            )}
          </Panel>

          {/* Compliance */}
          {(piiEntities.length > 0 || pciEntities.length > 0) && (
            <Panel id="coverage" title="Compliance & Security" icon={<Target size={14} />}
              badge={piiEntities.length + pciEntities.length} badgeSeverity="warn">
              <div className="ad-metrics-grid ad-metrics-grid--2">
                <MetricCard label="PII entities" value={piiEntities.length} severity={piiEntities.length > 0 ? 'warn' : 'ok'} icon={<ShieldAlert size={12} />} />
                <MetricCard label="PCI-DSS entities" value={pciEntities.length} severity={pciEntities.length > 0 ? 'warn' : 'ok'} icon={<Shield size={12} />} />
              </div>
              <EntityTable
                columns={['Name', 'Kind', 'PII', 'PCI-DSS', 'Owner']}
                rows={[...piiEntities, ...pciEntities]
                  .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
                  .map((e) => ({
                    entity: e,
                    values: [e.name, kindLabel(e.kind), e.metadata.pii ? '✓' : '', e.metadata.pciDss ? '✓' : '', e.metadata.owner ?? '—'],
                  }))}
                onEdit={onEdit}
              />
            </Panel>
          )}
        </div>

        {/* RIGHT column */}
        <div className="ad-col">
          {/* Distribution */}
          <Panel id="distribution" title="Architecture Distribution" icon={<Layers size={14} />}>
            {/* By level */}
            <div className="ad-dist-section">
              <div className="ad-dist-label">By C4 Level</div>
              <SegmentBar segments={levelOrder.map((l) => ({
                label: l, count: byLevel.get(l) ?? 0,
                color: l === 'context' ? '#6C5CE7' : l === 'container' ? '#00B894' : l === 'component' ? '#FDCB6E' : '#E17055',
              }))} />
              <div className="ad-dist-legend">
                {levelOrder.map((l) => {
                  const c = byLevel.get(l) ?? 0;
                  if (c === 0) return null;
                  return (
                    <span key={l} className="ad-legend-item">
                      <span className="ad-legend-dot" style={{
                        background: l === 'context' ? '#6C5CE7' : l === 'container' ? '#00B894' : l === 'component' ? '#FDCB6E' : '#E17055',
                      }} />
                      {l} <span className="ad-legend-count">{c}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* By viewpoint */}
            <div className="ad-dist-section">
              <div className="ad-dist-label">By Viewpoint</div>
              <SegmentBar segments={viewpointOrder.map((vp) => ({
                label: VIEWPOINT_LABELS[vp], count: byViewpoint.get(vp) ?? 0, color: VIEWPOINT_COLORS[vp],
              }))} />
              <div className="ad-dist-legend">
                {viewpointOrder.map((vp) => {
                  const c = byViewpoint.get(vp) ?? 0;
                  if (c === 0) return null;
                  return (
                    <span key={vp} className="ad-legend-item">
                      <span className="ad-legend-dot" style={{ background: VIEWPOINT_COLORS[vp] }} />
                      {VIEWPOINT_LABELS[vp]} <span className="ad-legend-count">{c}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* By kind (top 12) */}
            <div className="ad-dist-section">
              <div className="ad-dist-label">By Kind (top 12)</div>
              <div className="ad-bar-chart">
                {byKind.slice(0, 12).map(([kind, count]) => (
                  <div key={kind} className="ad-bar-row">
                    <span className="ad-bar-label">{kindLabel(kind)}</span>
                    <div className="ad-bar-track">
                      <div
                        className="ad-bar-fill"
                        style={{
                          width: `${(count / (byKind[0]?.[1] ?? 1)) * 100}%`,
                          background: KIND_COLORS[kind] ?? 'var(--accent)',
                        }}
                      />
                    </div>
                    <span className="ad-bar-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Relationship types */}
            {edgeTypeBreakdown.length > 0 && (
              <div className="ad-dist-section">
                <div className="ad-dist-label">Relationship Types</div>
                <div className="ad-bar-chart">
                  {edgeTypeBreakdown.map(([type, count]) => (
                    <div key={type} className="ad-bar-row">
                      <span className="ad-bar-label">{type}</span>
                      <div className="ad-bar-track">
                        <div className="ad-bar-fill" style={{
                          width: `${(count / (edgeTypeBreakdown[0]?.[1] ?? 1)) * 100}%`,
                          background: 'var(--accent)',
                        }} />
                      </div>
                      <span className="ad-bar-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {/* Maturity */}
          <Panel id="maturity" title="Maturity Landscape" icon={<TrendingUp size={14} />}
            badge={decliningEntities.length > 0 ? `${decliningEntities.length} declining` : undefined}
            badgeSeverity={decliningEntities.length > 0 ? 'danger' : undefined}>
            <SegmentBar segments={[
              { label: 'DEV', count: byMaturity.get('DEV') ?? 0, color: MATURITY_COLORS.DEV },
              { label: 'INTRO', count: byMaturity.get('INTRO') ?? 0, color: MATURITY_COLORS.INTRO },
              { label: 'GROW', count: byMaturity.get('GROW') ?? 0, color: MATURITY_COLORS.GROW },
              { label: 'MATURE', count: byMaturity.get('MATURE') ?? 0, color: MATURITY_COLORS.MATURE },
              { label: 'DECLINE', count: byMaturity.get('DECLINE') ?? 0, color: MATURITY_COLORS.DECLINE },
              { label: 'Unset', count: byMaturity.get('none') ?? 0, color: 'var(--border)' },
            ]} />
            <div className="ad-dist-legend">
              {(['DEV', 'INTRO', 'GROW', 'MATURE', 'DECLINE'] as const).map((m) => {
                const c = byMaturity.get(m) ?? 0;
                return (
                  <span key={m} className="ad-legend-item">
                    <span className="ad-legend-dot" style={{ background: MATURITY_COLORS[m] }} />
                    {m} <span className="ad-legend-count">{c}</span>
                  </span>
                );
              })}
              {(byMaturity.get('none') ?? 0) > 0 && (
                <span className="ad-legend-item">
                  <span className="ad-legend-dot" style={{ background: 'var(--border)' }} />
                  Unset <span className="ad-legend-count">{byMaturity.get('none')}</span>
                </span>
              )}
            </div>
          </Panel>

          {/* Structural complexity */}
          <Panel id="complexity" title="Structural Complexity" icon={<Box size={14} />}
            badge={structural.length > 0 ? `max ${structural[0]?.children}` : undefined}>
            {structural.length > 0 ? (
              <EntityTable
                columns={['Name', 'Children', 'Kind', 'Viewpoint']}
                rows={structural.slice(0, 15).map((s) => ({
                  entity: s.entity,
                  values: [s.entity.name, s.children, kindLabel(s.entity.kind), VIEWPOINT_LABELS[s.entity.viewpoint]],
                }))}
                onEdit={onEdit}
              />
            ) : (
              <p className="ad-empty-msg">No parent–child hierarchy found.</p>
            )}
          </Panel>

          {/* Ownership */}
          <Panel id="ownership" title="Team Ownership" icon={<Users size={14} />}
            badge={ownerMap.size}>
            <div className="ad-bar-chart">
              {sortedOwners.map(([owner, ents]) => (
                <div key={owner} className="ad-bar-row">
                  <span className="ad-bar-label">{owner}</span>
                  <div className="ad-bar-track">
                    <div className="ad-bar-fill" style={{
                      width: `${(ents.length / (sortedOwners[0]?.[1].length ?? 1)) * 100}%`,
                      background: owner === 'Unassigned' ? 'var(--text-muted)' : 'var(--accent)',
                    }} />
                  </div>
                  <span className="ad-bar-count">{ents.length}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};
