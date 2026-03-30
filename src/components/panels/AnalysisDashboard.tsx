import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import {
  KIND_COLORS,
  MATURITY_COLORS,
  VIEWPOINT_COLORS,
  VIEWPOINT_LABELS,
} from '../../domain/types';
import type { ArchEntity, EntityKind, Viewpoint, ZoomLevel, Maturity, Relationship, TShirtSize, DeploymentStage, PredefinedTag } from '../../domain/types';
import { KIND_TO_ZOOM } from '../../domain/matrix';
import { validateModel } from '../../validation/validator';
import {
  Search, AlertTriangle, AlertCircle,
  Pencil, Shield, ShieldAlert, Layers, Zap,
  TrendingUp, Activity, Target, GitBranch, Box, Users,
  Tag, Eye,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// Architecture Control Tower
// ═══════════════════════════════════════════════════════════════════
//
// Three-tier information hierarchy:
//   Tier 1 — Command Strip: health score + 3 decisive KPIs
//   Tier 2 — Action Queue:  ranked hotspot cards with reasons + actions
//   Tier 3 — Diagnostic Lanes: tabbed secondary analytics
//
// Design principle: prioritise decisions over inventory.
// Users should know what needs attention within 10 seconds.
// ═══════════════════════════════════════════════════════════════════

// ─── Types ────────────────────────────────────────────────────────

type DiagnosticTab = 'risk' | 'coupling' | 'debt' | 'maturity' | 'landscape' | 'distribution';

interface RiskItem {
  entity: ArchEntity;
  score: number;
  reasons: string[];
  coupling: number;
}

// ─── Pure computation helpers ─────────────────────────────────────

function severity(score: number): 'ok' | 'warn' | 'danger' {
  if (score >= 80) return 'ok';
  if (score >= 50) return 'warn';
  return 'danger';
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

function countMissing(entities: ArchEntity[], field: (e: ArchEntity) => unknown): number {
  return entities.filter((e) => {
    const v = field(e);
    if (v == null) return true;
    if (typeof v === 'string' && !v.trim()) return true;
    return false;
  }).length;
}

function computeCoupling(entities: ArchEntity[], relationships: Relationship[]) {
  const aff = new Map<string, number>();
  const eff = new Map<string, number>();
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

// ─── Richer Health Score ──────────────────────────────────────────
// Weighted across: validation (40%), metadata completeness (30%),
// coupling health (15%), maturity mix (15%).

function computeHealthScore(
  entities: ArchEntity[],
  relationships: Relationship[],
  errors: { type: 'error' | 'warning' }[],
): { score: number; drivers: string[] } {
  if (entities.length === 0) return { score: 100, drivers: [] };
  const drivers: string[] = [];

  // Validation (40 pts)
  const errCount = errors.filter((e) => e.type === 'error').length;
  const warnCount = errors.filter((e) => e.type === 'warning').length;
  const valPenalty = Math.min(40, errCount * 6 + warnCount * 2);
  const valScore = 40 - valPenalty;
  if (errCount > 0) drivers.push(`${errCount} validation error${errCount > 1 ? 's' : ''}`);
  if (warnCount > 0) drivers.push(`${warnCount} warning${warnCount > 1 ? 's' : ''}`);

  // Metadata completeness (30 pts)
  let metaTotal = 0, metaFilled = 0;
  for (const e of entities) {
    metaTotal += 5;
    if (e.metadata.organization?.trim()) metaFilled++;
    if (e.metadata.technology?.trim()) metaFilled++;
    if (e.metadata.maturity) metaFilled++;
    if (e.description.trim()) metaFilled++;
    if (e.metadata.size) metaFilled++;
  }
  const metaPct = metaTotal > 0 ? metaFilled / metaTotal : 1;
  const metaScore = Math.round(metaPct * 30);
  if (metaPct < 0.5) drivers.push(`metadata ${Math.round(metaPct * 100)}% complete`);

  // Coupling health (15 pts) — penalise if any entity has >8 connections
  const coupling = computeCoupling(entities, relationships);
  const maxCoup = coupling.reduce((m, c) => Math.max(m, c.total), 0);
  const coupScore = maxCoup > 8 ? 5 : maxCoup > 5 ? 10 : 15;
  if (maxCoup > 8) drivers.push(`max coupling ${maxCoup}`);

  // Maturity mix (15 pts) — penalise declining, reward mature
  const declining = entities.filter((e) => e.metadata.maturity === 'DECLINE').length;
  const matPenalty = Math.min(15, declining * 3);
  const matScore = 15 - matPenalty;
  if (declining > 0) drivers.push(`${declining} declining`);

  return {
    score: Math.max(0, Math.min(100, valScore + metaScore + coupScore + matScore)),
    drivers,
  };
}

// ─── Richer Risk Scoring ──────────────────────────────────────────
// 0-10 scale factoring: maturity, ownership, docs, coupling, compliance, deployment

function computeRisk(
  entities: ArchEntity[],
  relationships: Relationship[],
): RiskItem[] {
  const couplingMap = new Map<string, number>();
  for (const r of relationships) {
    couplingMap.set(r.sourceId, (couplingMap.get(r.sourceId) ?? 0) + 1);
    couplingMap.set(r.targetId, (couplingMap.get(r.targetId) ?? 0) + 1);
  }

  return entities.map((e) => {
    let score = 0;
    const reasons: string[] = [];
    const coup = couplingMap.get(e.id) ?? 0;

    if (e.metadata.maturity === 'DECLINE') { score += 3; reasons.push('Declining maturity'); }
    if (!e.metadata.organization?.trim()) { score += 2; reasons.push('No owner'); }
    if (!e.description?.trim()) { score += 1; reasons.push('Undocumented'); }
    if (coup > 6) { score += 2; reasons.push(`High coupling (${coup})`); }
    if (e.metadata.pii) { score += 1; reasons.push('Handles PII'); }
    if (e.metadata.pciDss) { score += 1; reasons.push('PCI-DSS scope'); }
    if (e.metadata.deploymentStage === 'LOCAL') { score += 1; reasons.push('Local only'); }

    return { entity: e, score, reasons, coupling: coup };
  })
  .filter((r) => r.score > 0)
  .sort((a, b) => b.score - a.score);
}

function riskLevel(score: number): { label: string; severity: 'ok' | 'warn' | 'danger' } {
  if (score >= 6) return { label: 'Critical', severity: 'danger' };
  if (score >= 3) return { label: 'Elevated', severity: 'warn' };
  return { label: 'Low', severity: 'ok' };
}

// ─── Sub-components ───────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 64 }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const sev = severity(score);
  const color = sev === 'ok' ? 'var(--success)' : sev === 'warn' ? 'var(--warning)' : 'var(--danger)';
  return (
    <svg width={size} height={size} className="ct-score-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="ct-score-text" fill={color}>{score}</text>
    </svg>
  );
};

const SegmentBar: React.FC<{ segments: { label: string; count: number; color: string }[] }> = ({ segments }) => {
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (total === 0) return null;
  return (
    <div className="ct-segment-bar" role="img" aria-label="Distribution">
      {segments.map((seg) =>
        seg.count > 0 ? (
          <div key={seg.label} className="ct-segment"
            style={{ width: `${(seg.count / total) * 100}%`, background: seg.color }}
            title={`${seg.label}: ${seg.count} (${pct(seg.count, total)})`} />
        ) : null
      )}
    </div>
  );
};

/** Sortable mini-table. */
const EntityTable: React.FC<{
  rows: { entity: ArchEntity; values: (string | number)[] }[];
  columns: string[];
  onAction: (id: string) => void;
  actionLabel?: string;
}> = ({ rows, columns, onAction, actionLabel = 'Edit' }) => {
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

  return (
    <div className="ct-table-wrap">
      <table className="ct-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c}
                onClick={() => { if (sortCol === i) setSortAsc((a) => !a); else { setSortCol(i); setSortAsc(false); } }}
                className={sortCol === i ? 'ct-th--sorted' : ''}>
                {c}{sortCol === i && <span className="ct-sort-arrow">{sortAsc ? ' ↑' : ' ↓'}</span>}
              </th>
            ))}
            <th className="ct-th-action" />
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, 20).map(({ entity, values }) => (
            <tr key={entity.id} onClick={() => onAction(entity.id)}>
              {values.map((v, i) => (
                <td key={i}>
                  {i === 0 ? (
                    <span className="ct-name-cell">
                      <span className="ct-entity-dot" style={{ background: KIND_COLORS[entity.kind] ?? 'var(--border)' }} />
                      {v}
                    </span>
                  ) : v}
                </td>
              ))}
              <td>
                <button className="ct-edit-btn" title={actionLabel}
                  onClick={(ev) => { ev.stopPropagation(); onAction(entity.id); }}>
                  <Pencil size={11} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 20 && <div className="ct-table-more">Showing top 20 of {rows.length}</div>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Main Control Tower
// ═══════════════════════════════════════════════════════════════════

export const AnalysisDashboard: React.FC = () => {
  const entities = useStore((s) => s.entities);
  const relationships = useStore((s) => s.relationships);
  const setShowEntityForm = useStore((s) => s.setShowEntityForm);
  const selectEntity = useStore((s) => s.selectEntity);
  const setViewMode = useStore((s) => s.setViewMode);

  const [search, setSearch] = useState('');
  const [vpFilter, setVpFilter] = useState<Viewpoint | 'all'>('all');
  const [activeTab, setActiveTab] = useState<DiagnosticTab>('risk');

  const onEdit = useCallback((id: string) => setShowEntityForm(true, id), [setShowEntityForm]);

  const onInspect = useCallback((id: string) => {
    selectEntity(id);
    setViewMode('architecture');
    // Double-rAF: first rAF yields to React's commit, second rAF fires after the
    // canvas element is in the DOM following the architecture-view transition.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const state = useStore.getState();
      const pos = state.positions.find((p) => p.entityId === id);
      if (pos) {
        const canvas = document.getElementById('main-canvas');
        const vw = canvas?.clientWidth ?? window.innerWidth;
        const vh = canvas?.clientHeight ?? window.innerHeight;
        state.setPan(-pos.x * state.scale + vw / 2, -pos.y * state.scale + vh / 2);
      }
    }));
  }, [selectEntity, setViewMode]);

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
          (e.metadata.organization ?? '').toLowerCase().includes(q) ||
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
  const health = useMemo(() => computeHealthScore(filtered, filteredRels, validationErrors), [filtered, filteredRels, validationErrors]);

  // ── Risk hotspots ───────────────────────────────────────────────
  const riskEntities = useMemo(() => computeRisk(filtered, filteredRels), [filtered, filteredRels]);
  const criticalCount = riskEntities.filter((r) => r.score >= 6).length;
  const elevatedCount = riskEntities.filter((r) => r.score >= 3 && r.score < 6).length;

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
  const missingOwner = countMissing(filtered, (e) => e.metadata.organization);
  const missingTech = countMissing(filtered, (e) => e.metadata.technology);
  const missingMaturity = countMissing(filtered, (e) => e.metadata.maturity);
  const decliningEntities = filtered.filter((e) => e.metadata.maturity === 'DECLINE');
  const piiEntities = filtered.filter((e) => e.metadata.pii);
  const pciEntities = filtered.filter((e) => e.metadata.pciDss);

  const metadataCompleteness = useMemo(() => {
    if (filtered.length === 0) return 100;
    let total = 0, filled = 0;
    for (const e of filtered) {
      total += 5;
      if (e.metadata.organization?.trim()) filled++;
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

  // ── Ownership ───────────────────────────────────────────────────
  const sortedOwners = useMemo(() => {
    const map = new Map<string, ArchEntity[]>();
    for (const e of filtered) {
      const o = e.metadata.organization?.trim() || 'Unassigned';
      const list = map.get(o);
      if (list) list.push(e); else map.set(o, [e]);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  // ── Technology landscape ────────────────────────────────────────
  const techFrequency = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) {
      const t = e.metadata.technology?.trim();
      if (t) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const tagFrequency = useMemo(() => {
    const map = new Map<PredefinedTag, number>();
    for (const e of filtered) {
      for (const tag of (e.metadata.tags ?? [])) map.set(tag, (map.get(tag) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const byDeploymentStage = useMemo(() => {
    const map = new Map<DeploymentStage | 'none', number>();
    for (const e of filtered) {
      const s = e.metadata.deploymentStage ?? 'none';
      map.set(s, (map.get(s) ?? 0) + 1);
    }
    return map;
  }, [filtered]);

  const bySize = useMemo(() => {
    const map = new Map<TShirtSize | 'none', number>();
    for (const e of filtered) {
      const s = e.metadata.size ?? 'none';
      map.set(s, (map.get(s) ?? 0) + 1);
    }
    return map;
  }, [filtered]);

  const edgeTypeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredRels) map.set(r.type, (map.get(r.type) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredRels]);

  // ── Render ──────────────────────────────────────────────────────
  const viewpointOrder: Viewpoint[] = ['business', 'application', 'technology', 'global'];
  const levelOrder: ZoomLevel[] = ['context', 'container', 'component', 'code'];

  const DIAG_TABS: { id: DiagnosticTab; label: string; icon: React.ReactNode }[] = [
    { id: 'risk', label: 'Risk', icon: <AlertTriangle size={13} /> },
    { id: 'coupling', label: 'Coupling', icon: <GitBranch size={13} /> },
    { id: 'debt', label: 'Debt', icon: <ShieldAlert size={13} /> },
    { id: 'maturity', label: 'Maturity', icon: <TrendingUp size={13} /> },
    { id: 'landscape', label: 'Landscape', icon: <Tag size={13} /> },
    { id: 'distribution', label: 'Distribution', icon: <Layers size={13} /> },
  ];

  return (
    <div className="ct-root">
      {/* ════════ TOOLBAR ════════ */}
      <div className="ct-toolbar">
        <div className="ct-toolbar-left">
          <Activity size={16} className="ct-toolbar-icon" />
          <span className="ct-toolbar-title">Control Tower</span>
        </div>
        <div className="ct-toolbar-center">
          <div className="ct-vp-pills">
            <button className={`ct-vp-pill ${vpFilter === 'all' ? 'ct-vp-pill--active' : ''}`}
              onClick={() => setVpFilter('all')}>All</button>
            {viewpointOrder.map((vp) => (
              <button key={vp}
                className={`ct-vp-pill ${vpFilter === vp ? 'ct-vp-pill--active' : ''}`}
                style={vpFilter === vp ? { borderColor: VIEWPOINT_COLORS[vp], color: VIEWPOINT_COLORS[vp] } : undefined}
                onClick={() => setVpFilter(vp)}>{VIEWPOINT_LABELS[vp]}</button>
            ))}
          </div>
        </div>
        <div className="ct-search-wrap">
          <Search size={13} />
          <input className="ct-search" placeholder="Search entities…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ════════ TIER 1 — COMMAND STRIP ════════ */}
      <div className="ct-command-strip">
        <div className="ct-cmd-health">
          <ScoreRing score={health.score} size={52} />
          <div className="ct-cmd-health-info">
            <div className="ct-cmd-health-label">Architecture Health</div>
            {health.drivers.length > 0 ? (
              <div className="ct-cmd-health-drivers">{health.drivers.join(' · ')}</div>
            ) : (
              <div className="ct-cmd-health-drivers ct-cmd-health-drivers--ok">All clear</div>
            )}
          </div>
        </div>
        <div className="ct-cmd-kpis">
          <div className={`ct-kpi ${criticalCount > 0 ? 'ct-kpi--danger' : elevatedCount > 0 ? 'ct-kpi--warn' : 'ct-kpi--ok'}`}>
            <div className="ct-kpi-num">{criticalCount + elevatedCount}</div>
            <div className="ct-kpi-label">Risk Items</div>
          </div>
          <div className={`ct-kpi ${metadataCompleteness < 50 ? 'ct-kpi--danger' : metadataCompleteness < 80 ? 'ct-kpi--warn' : 'ct-kpi--ok'}`}>
            <div className="ct-kpi-num">{metadataCompleteness}%</div>
            <div className="ct-kpi-label">Complete</div>
          </div>
          <div className={`ct-kpi ${errorCount > 0 ? 'ct-kpi--danger' : warnCount > 0 ? 'ct-kpi--warn' : 'ct-kpi--ok'}`}>
            <div className="ct-kpi-num">{errorCount + warnCount}</div>
            <div className="ct-kpi-label">Issues</div>
          </div>
        </div>
      </div>

      {/* ════════ SCROLLABLE BODY ════════ */}
      <div className="ct-body">

        {/* ════════ TIER 2 — ACTION QUEUE ════════ */}
        <section className="ct-tier ct-tier--action">
          <div className="ct-tier-header">
            <h2 className="ct-tier-title">
              <AlertTriangle size={15} />
              Act Now
              {riskEntities.length > 0 && (
                <span className={`ct-badge ct-badge--${riskEntities[0].score >= 6 ? 'danger' : 'warn'}`}>
                  {riskEntities.length}
                </span>
              )}
            </h2>
            <span className="ct-tier-sub">Ranked by risk — highest impact first</span>
          </div>

          {riskEntities.length === 0 ? (
            <div className="ct-empty">
              <Shield size={20} />
              <span>No risk items detected. Architecture looks healthy.</span>
            </div>
          ) : (
            <div className="ct-action-list">
              {riskEntities.slice(0, 8).map(({ entity: e, score, reasons, coupling: coup }) => {
                const risk = riskLevel(score);
                return (
                  <div key={e.id} className={`ct-action-card ct-action-card--${risk.severity}`}>
                    <div className="ct-action-header">
                      <span className="ct-entity-dot" style={{ background: KIND_COLORS[e.kind] ?? 'var(--border)' }} />
                      <span className="ct-action-name">{e.name}</span>
                      <span className="ct-action-kind">{kindLabel(e.kind)}</span>
                      <span className={`ct-risk-badge ct-risk-badge--${risk.severity}`}>{risk.label}</span>
                    </div>
                    <div className="ct-action-reasons">
                      {reasons.map((r, i) => <span key={i} className="ct-reason-tag">{r}</span>)}
                    </div>
                    <div className="ct-action-meta">
                      {e.metadata.organization && <span className="ct-action-owner">{e.metadata.organization}</span>}
                      {coup > 0 && <span className="ct-action-coupling">{coup} connections</span>}
                      {e.metadata.maturity && <span className="ct-action-maturity">{e.metadata.maturity}</span>}
                    </div>
                    <div className="ct-action-buttons">
                      <button className="ct-btn ct-btn--primary" onClick={() => onInspect(e.id)}>
                        <Eye size={12} /> Inspect
                      </button>
                      <button className="ct-btn ct-btn--secondary" onClick={() => onEdit(e.id)}>
                        <Pencil size={12} /> Edit
                      </button>
                    </div>
                  </div>
                );
              })}
              {riskEntities.length > 8 && (
                <div className="ct-action-overflow">
                  +{riskEntities.length - 8} more items — switch to the Risk tab below for the full list
                </div>
              )}
            </div>
          )}

          {/* Validation issues inline */}
          {validationErrors.length > 0 && (
            <div className="ct-validation-strip">
              <div className="ct-validation-header">
                <span className="ct-validation-title">
                  {errorCount > 0 ? <AlertCircle size={13} /> : <AlertTriangle size={13} />}
                  Model Validation
                </span>
                <span className="ct-validation-counts">
                  {errorCount > 0 && <span className="ct-vc ct-vc--err">{errorCount} errors</span>}
                  {warnCount > 0 && <span className="ct-vc ct-vc--warn">{warnCount} warnings</span>}
                </span>
              </div>
              <ul className="ct-issue-list">
                {validationErrors.slice(0, 6).map((err, i) => (
                  <li key={i} className={`ct-issue ct-issue--${err.type}`}
                    onClick={() => { if (err.entityId) onInspect(err.entityId); }}
                    role={err.entityId ? 'button' : undefined}
                    tabIndex={err.entityId ? 0 : undefined}>
                    {err.type === 'error' ? <AlertCircle size={12} /> : <AlertTriangle size={12} />}
                    <span>{err.message}</span>
                  </li>
                ))}
                {validationErrors.length > 6 && (
                  <li className="ct-issue ct-issue--more">+{validationErrors.length - 6} more</li>
                )}
              </ul>
            </div>
          )}
        </section>

        {/* ════════ TIER 3 — DIAGNOSTIC LANES ════════ */}
        <section className="ct-tier ct-tier--diag">
          <div className="ct-diag-tabs" role="tablist">
            {DIAG_TABS.map((tab) => (
              <button key={tab.id} role="tab"
                className={`ct-diag-tab ${activeTab === tab.id ? 'ct-diag-tab--active' : ''}`}
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}>
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="ct-diag-body" role="tabpanel">
            {/* ── Risk tab ──────────────────── */}
            {activeTab === 'risk' && (
              <div className="ct-diag-content">
                <div className="ct-stat-row">
                  <div className="ct-stat ct-stat--danger"><span className="ct-stat-num">{criticalCount}</span><span className="ct-stat-label">Critical</span></div>
                  <div className="ct-stat ct-stat--warn"><span className="ct-stat-num">{elevatedCount}</span><span className="ct-stat-label">Elevated</span></div>
                  <div className="ct-stat ct-stat--ok"><span className="ct-stat-num">{filtered.length - criticalCount - elevatedCount}</span><span className="ct-stat-label">Low / None</span></div>
                  <div className="ct-stat"><span className="ct-stat-num">{piiEntities.length + pciEntities.length}</span><span className="ct-stat-label">Compliance</span></div>
                </div>
                {riskEntities.length > 0 && (
                  <EntityTable
                    columns={['Name', 'Risk', 'Reasons', 'Owner', 'Kind']}
                    rows={riskEntities.slice(0, 20).map(({ entity: e, score, reasons }) => ({
                      entity: e,
                      values: [e.name, score, reasons.join(', '), e.metadata.organization ?? '—', kindLabel(e.kind)],
                    }))}
                    onAction={onInspect} actionLabel="Inspect" />
                )}
              </div>
            )}

            {/* ── Coupling tab ──────────────── */}
            {activeTab === 'coupling' && (
              <div className="ct-diag-content">
                <div className="ct-stat-row">
                  <div className="ct-stat"><span className="ct-stat-num">{avgCoupling}</span><span className="ct-stat-label">Avg Coupling</span></div>
                  <div className={`ct-stat ${topCoupled[0]?.total > 8 ? 'ct-stat--danger' : topCoupled[0]?.total > 5 ? 'ct-stat--warn' : ''}`}>
                    <span className="ct-stat-num">{topCoupled[0]?.total ?? 0}</span>
                    <span className="ct-stat-label">Max ({topCoupled[0]?.entity.name ?? '—'})</span>
                  </div>
                  <div className="ct-stat"><span className="ct-stat-num">{filteredRels.length}</span><span className="ct-stat-label">Relationships</span></div>
                </div>
                <EntityTable
                  columns={['Name', 'In', 'Out', 'Total', 'Kind']}
                  rows={topCoupled.map((c) => ({
                    entity: c.entity,
                    values: [c.entity.name, c.afferent, c.efferent, c.total, kindLabel(c.entity.kind)],
                  }))}
                  onAction={onInspect} actionLabel="Inspect" />
                {structural.length > 0 && (
                  <>
                    <div className="ct-sub-title"><Box size={13} /> Structural Complexity</div>
                    <EntityTable
                      columns={['Name', 'Children', 'Kind', 'Layer']}
                      rows={structural.slice(0, 10).map((s) => ({
                        entity: s.entity,
                        values: [s.entity.name, s.children, kindLabel(s.entity.kind), VIEWPOINT_LABELS[s.entity.viewpoint]],
                      }))}
                      onAction={onInspect} actionLabel="Inspect" />
                  </>
                )}
              </div>
            )}

            {/* ── Debt tab ──────────────────── */}
            {activeTab === 'debt' && (
              <div className="ct-diag-content">
                <div className="ct-stat-row">
                  <div className={`ct-stat ${missingOwner > filtered.length * 0.5 ? 'ct-stat--danger' : missingOwner > 0 ? 'ct-stat--warn' : 'ct-stat--ok'}`}>
                    <span className="ct-stat-num">{missingOwner}</span><span className="ct-stat-label">No Owner</span>
                  </div>
                  <div className={`ct-stat ${missingDesc > filtered.length * 0.3 ? 'ct-stat--danger' : missingDesc > 0 ? 'ct-stat--warn' : 'ct-stat--ok'}`}>
                    <span className="ct-stat-num">{missingDesc}</span><span className="ct-stat-label">No Description</span>
                  </div>
                  <div className={`ct-stat ${missingTech > filtered.length * 0.5 ? 'ct-stat--warn' : 'ct-stat--ok'}`}>
                    <span className="ct-stat-num">{missingTech}</span><span className="ct-stat-label">No Technology</span>
                  </div>
                  <div className={`ct-stat ${missingMaturity > filtered.length * 0.3 ? 'ct-stat--warn' : 'ct-stat--ok'}`}>
                    <span className="ct-stat-num">{missingMaturity}</span><span className="ct-stat-label">No Maturity</span>
                  </div>
                </div>
                <div className="ct-progress-row">
                  <div className="ct-progress">
                    <div className="ct-progress-label">Metadata Completeness</div>
                    <div className="ct-progress-bar">
                      <div className={`ct-progress-fill ct-progress-fill--${severity(metadataCompleteness)}`}
                        style={{ width: `${metadataCompleteness}%` }} />
                    </div>
                    <span className="ct-progress-pct">{metadataCompleteness}%</span>
                  </div>
                </div>
                {decliningEntities.length > 0 && (
                  <>
                    <div className="ct-sub-title"><TrendingUp size={13} /> Declining Entities</div>
                    <EntityTable
                      columns={['Name', 'Kind', 'Technology', 'Organization']}
                      rows={decliningEntities.map((e) => ({
                        entity: e,
                        values: [e.name, kindLabel(e.kind), e.metadata.technology ?? '—', e.metadata.organization ?? '—'],
                      }))}
                      onAction={onEdit} />
                  </>
                )}
                {(piiEntities.length > 0 || pciEntities.length > 0) && (
                  <>
                    <div className="ct-sub-title"><Target size={13} /> Compliance Scope</div>
                    <div className="ct-stat-row">
                      <div className={`ct-stat ${piiEntities.length > 0 ? 'ct-stat--warn' : 'ct-stat--ok'}`}>
                        <span className="ct-stat-num">{piiEntities.length}</span><span className="ct-stat-label">PII</span>
                      </div>
                      <div className={`ct-stat ${pciEntities.length > 0 ? 'ct-stat--warn' : 'ct-stat--ok'}`}>
                        <span className="ct-stat-num">{pciEntities.length}</span><span className="ct-stat-label">PCI-DSS</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Maturity tab ──────────────── */}
            {activeTab === 'maturity' && (
              <div className="ct-diag-content">
                <SegmentBar segments={[
                  { label: 'DEV', count: byMaturity.get('DEV') ?? 0, color: MATURITY_COLORS.DEV },
                  { label: 'INTRO', count: byMaturity.get('INTRO') ?? 0, color: MATURITY_COLORS.INTRO },
                  { label: 'GROW', count: byMaturity.get('GROW') ?? 0, color: MATURITY_COLORS.GROW },
                  { label: 'MATURE', count: byMaturity.get('MATURE') ?? 0, color: MATURITY_COLORS.MATURE },
                  { label: 'DECLINE', count: byMaturity.get('DECLINE') ?? 0, color: MATURITY_COLORS.DECLINE },
                  { label: 'Unset', count: byMaturity.get('none') ?? 0, color: 'var(--border)' },
                ]} />
                <div className="ct-legend">
                  {(['DEV', 'INTRO', 'GROW', 'MATURE', 'DECLINE'] as const).map((m) => {
                    const c = byMaturity.get(m) ?? 0;
                    return (
                      <span key={m} className="ct-legend-item">
                        <span className="ct-legend-dot" style={{ background: MATURITY_COLORS[m] }} />
                        {m} <span className="ct-legend-count">{c}</span>
                      </span>
                    );
                  })}
                  {(byMaturity.get('none') ?? 0) > 0 && (
                    <span className="ct-legend-item">
                      <span className="ct-legend-dot" style={{ background: 'var(--border)' }} />
                      Unset <span className="ct-legend-count">{byMaturity.get('none')}</span>
                    </span>
                  )}
                </div>

                <div className="ct-sub-title" style={{ marginTop: 16 }}><Zap size={13} /> Deployment Stage</div>
                <SegmentBar segments={[
                  { label: 'PRODUCTION', count: byDeploymentStage.get('PRODUCTION') ?? 0, color: '#00B894' },
                  { label: 'TESTING', count: byDeploymentStage.get('TESTING') ?? 0, color: '#FDCB6E' },
                  { label: 'LOCAL', count: byDeploymentStage.get('LOCAL') ?? 0, color: '#636E72' },
                ]} />
                <div className="ct-legend">
                  {([
                    { k: 'PRODUCTION' as DeploymentStage, color: '#00B894' },
                    { k: 'TESTING' as DeploymentStage, color: '#FDCB6E' },
                    { k: 'LOCAL' as DeploymentStage, color: '#636E72' },
                  ]).map(({ k, color }) => {
                    const c = byDeploymentStage.get(k) ?? 0;
                    if (c === 0) return null;
                    return (
                      <span key={k} className="ct-legend-item">
                        <span className="ct-legend-dot" style={{ background: color }} />
                        {k} <span className="ct-legend-count">{c}</span>
                      </span>
                    );
                  })}
                </div>

                <div className="ct-sub-title" style={{ marginTop: 16 }}><Users size={13} /> Team Ownership</div>
                <div className="ct-bar-chart">
                  {sortedOwners.map(([owner, ents]) => (
                    <div key={owner} className="ct-bar-row">
                      <span className="ct-bar-label">{owner}</span>
                      <div className="ct-bar-track">
                        <div className="ct-bar-fill" style={{
                          width: `${(ents.length / (sortedOwners[0]?.[1].length ?? 1)) * 100}%`,
                          background: owner === 'Unassigned' ? 'var(--text-muted)' : 'var(--accent)',
                        }} />
                      </div>
                      <span className="ct-bar-count">{ents.length}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Landscape tab ─────────────── */}
            {activeTab === 'landscape' && (
              <div className="ct-diag-content">
                {techFrequency.length > 0 && (
                  <div className="ct-dist-section">
                    <div className="ct-dist-label">Technologies Used</div>
                    <div className="ct-bar-chart">
                      {techFrequency.slice(0, 12).map(([tech, count]) => (
                        <div key={tech} className="ct-bar-row">
                          <span className="ct-bar-label">{tech}</span>
                          <div className="ct-bar-track">
                            <div className="ct-bar-fill" style={{
                              width: `${(count / (techFrequency[0]?.[1] ?? 1)) * 100}%`,
                              background: 'var(--accent)',
                            }} />
                          </div>
                          <span className="ct-bar-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {tagFrequency.length > 0 && (
                  <div className="ct-dist-section">
                    <div className="ct-dist-label">Tags</div>
                    <div className="ct-tag-cloud">
                      {tagFrequency.map(([tag, count]) => (
                        <span key={tag} className="ct-tag-chip" title={`${count} entities`}>
                          {tag}<span className="ct-tag-count">{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="ct-dist-section">
                  <div className="ct-dist-label">Size (T-shirt)</div>
                  <SegmentBar segments={[
                    { label: 'XL', count: bySize.get('XL') ?? 0, color: '#E17055' },
                    { label: 'L', count: bySize.get('L') ?? 0, color: '#FDCB6E' },
                    { label: 'M', count: bySize.get('M') ?? 0, color: '#74B9FF' },
                    { label: 'S', count: bySize.get('S') ?? 0, color: '#55EFC4' },
                  ]} />
                  <div className="ct-legend">
                    {(['XL', 'L', 'M', 'S'] as TShirtSize[]).map((s) => {
                      const c = bySize.get(s) ?? 0;
                      if (c === 0) return null;
                      const CM: Record<TShirtSize, string> = { XL: '#E17055', L: '#FDCB6E', M: '#74B9FF', S: '#55EFC4' };
                      return <span key={s} className="ct-legend-item"><span className="ct-legend-dot" style={{ background: CM[s] }} />{s} <span className="ct-legend-count">{c}</span></span>;
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Distribution tab ──────────── */}
            {activeTab === 'distribution' && (
              <div className="ct-diag-content">
                <div className="ct-stat-row">
                  <div className="ct-stat"><span className="ct-stat-num">{filtered.length}</span><span className="ct-stat-label">Entities</span></div>
                  <div className="ct-stat"><span className="ct-stat-num">{filteredRels.length}</span><span className="ct-stat-label">Relationships</span></div>
                </div>
                <div className="ct-dist-section">
                  <div className="ct-dist-label">By Abstraction</div>
                  <SegmentBar segments={levelOrder.map((l) => ({
                    label: l, count: byLevel.get(l) ?? 0,
                    color: l === 'context' ? '#6C5CE7' : l === 'container' ? '#00B894' : l === 'component' ? '#FDCB6E' : '#E17055',
                  }))} />
                  <div className="ct-legend">
                    {levelOrder.map((l) => {
                      const c = byLevel.get(l) ?? 0;
                      if (c === 0) return null;
                      return <span key={l} className="ct-legend-item"><span className="ct-legend-dot" style={{
                        background: l === 'context' ? '#6C5CE7' : l === 'container' ? '#00B894' : l === 'component' ? '#FDCB6E' : '#E17055',
                      }} />{l} <span className="ct-legend-count">{c}</span></span>;
                    })}
                  </div>
                </div>
                <div className="ct-dist-section">
                  <div className="ct-dist-label">By Layer</div>
                  <SegmentBar segments={viewpointOrder.map((vp) => ({
                    label: VIEWPOINT_LABELS[vp], count: byViewpoint.get(vp) ?? 0, color: VIEWPOINT_COLORS[vp],
                  }))} />
                  <div className="ct-legend">
                    {viewpointOrder.map((vp) => {
                      const c = byViewpoint.get(vp) ?? 0;
                      if (c === 0) return null;
                      return <span key={vp} className="ct-legend-item"><span className="ct-legend-dot" style={{ background: VIEWPOINT_COLORS[vp] }} />{VIEWPOINT_LABELS[vp]} <span className="ct-legend-count">{c}</span></span>;
                    })}
                  </div>
                </div>
                <div className="ct-dist-section">
                  <div className="ct-dist-label">By Kind (top 12)</div>
                  <div className="ct-bar-chart">
                    {byKind.slice(0, 12).map(([kind, count]) => (
                      <div key={kind} className="ct-bar-row">
                        <span className="ct-bar-label">{kindLabel(kind)}</span>
                        <div className="ct-bar-track">
                          <div className="ct-bar-fill" style={{
                            width: `${(count / (byKind[0]?.[1] ?? 1)) * 100}%`,
                            background: KIND_COLORS[kind] ?? 'var(--accent)',
                          }} />
                        </div>
                        <span className="ct-bar-count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {edgeTypeBreakdown.length > 0 && (
                  <div className="ct-dist-section">
                    <div className="ct-dist-label">Relationship Types</div>
                    <div className="ct-bar-chart">
                      {edgeTypeBreakdown.map(([type, count]) => (
                        <div key={type} className="ct-bar-row">
                          <span className="ct-bar-label">{type}</span>
                          <div className="ct-bar-track">
                            <div className="ct-bar-fill" style={{
                              width: `${(count / (edgeTypeBreakdown[0]?.[1] ?? 1)) * 100}%`,
                              background: 'var(--accent)',
                            }} />
                          </div>
                          <span className="ct-bar-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
