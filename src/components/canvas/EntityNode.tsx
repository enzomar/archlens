import React, { useState } from 'react';
import type { ArchEntity, EntityKind, VisualConfig } from '../../domain/types';
import { KIND_COLORS, MATURITY_COLORS, VIEWPOINT_COLORS, NODE_DIMENSIONS, NODE_DIMENSIONS_EXTENDED, DRILLABLE_KINDS } from '../../domain/types';

interface EntityNodeProps {
  entity: ArchEntity;
  x: number;
  y: number;
  selected: boolean;
  visualConfig: VisualConfig;
  onSelect: (id: string, e?: React.MouseEvent) => void;
  onDrillDown: (id: string) => void;
  onDragStart: (id: string, startX: number, startY: number) => void;
  onConnectStart?: (id: string, clientX: number, clientY: number) => void;
  connectTarget?: boolean; // highlight this node as a connection drop target
}

const SHAPE_RENDERERS: Record<EntityKind, (w: number, h: number) => React.ReactNode> = {
  // ── C4 core ────────────────────────────────────────────────
  person: (w, h) => (
    <>
      <circle cx={w / 2} cy={-14} r={16} fill="currentColor" opacity={0.20} stroke="currentColor" strokeWidth={2} />
      <rect x={0} y={0} width={w} height={h} rx={8} ry={8} fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={2} />
    </>
  ),
  system: (w, h) => (
    <rect x={0} y={0} width={w} height={h} rx={8} ry={8} fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={2.5} />
  ),
  container: (w, h) => (
    <rect x={0} y={0} width={w} height={h} rx={6} ry={6} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
  ),
  component: (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={4} ry={4} fill="currentColor" opacity={0.08} stroke="currentColor" strokeWidth={1.5} />
      <rect x={-8} y={14} width={16} height={8} rx={1} fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1} />
      <rect x={-8} y={28} width={16} height={8} rx={1} fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1} />
    </>
  ),
  artifact: (w, h) => {
    const fold = 16;
    return (
      <path
        d={`M0,0 L${w - fold},0 L${w},${fold} L${w},${h} L0,${h} Z M${w - fold},0 L${w - fold},${fold} L${w},${fold}`}
        fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={1.5}
      />
    );
  },
  trigger: (w, h) => (
    <polygon
      points={`${w / 2},0 ${w},${h * 0.4} ${w * 0.6},${h * 0.4} ${w * 0.7},${h} ${0},${h * 0.6} ${w * 0.4},${h * 0.6}`}
      fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={2}
    />
  ),

  // ── AI / ML ────────────────────────────────────────────────
  aimodel: (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={10} ry={10} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2.5} />
      <path d={`M${w - 22},8 L${w - 19},14 L${w - 13},14 L${w - 18},18 L${w - 16},24 L${w - 22},20 L${w - 28},24 L${w - 26},18 L${w - 31},14 L${w - 25},14 Z`}
        fill="currentColor" opacity={0.35} />
    </>
  ),
  vectorstore: (w, h) => {
    const ry = 14;
    return (
      <>
        <path d={`M0,${ry} L0,${h - ry} Q0,${h} ${w / 2},${h} Q${w},${h} ${w},${h - ry} L${w},${ry}`}
          fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
        <ellipse cx={w / 2} cy={ry} rx={w / 2} ry={ry} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
        <line x1={w * 0.25} y1={ry + 10} x2={w * 0.25} y2={h - ry - 4} stroke="currentColor" strokeWidth={0.7} opacity={0.2} />
        <line x1={w * 0.5} y1={ry + 10} x2={w * 0.5} y2={h - ry - 4} stroke="currentColor" strokeWidth={0.7} opacity={0.2} />
        <line x1={w * 0.75} y1={ry + 10} x2={w * 0.75} y2={h - ry - 4} stroke="currentColor" strokeWidth={0.7} opacity={0.2} />
      </>
    );
  },
  retriever: (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={6} ry={6} fill="currentColor" opacity={0.08} stroke="currentColor" strokeWidth={1.5} />
      <circle cx={w - 22} cy={14} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.3} />
      <line x1={w - 18} y1={18} x2={w - 14} y2={22} stroke="currentColor" strokeWidth={1.5} opacity={0.3} />
    </>
  ),
  evaluation: (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={6} ry={6} fill="currentColor" opacity={0.08} stroke="currentColor" strokeWidth={1.5} strokeDasharray="6 2" />
      <circle cx={w - 20} cy={14} r={7} fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.3} />
      <line x1={w - 20} y1={14} x2={w - 16} y2={10} stroke="currentColor" strokeWidth={1.2} opacity={0.35} />
    </>
  ),

  // ── ArchiMate — Business Layer ─────────────────────────────
  'business-actor': (w, h) => (
    <>
      <circle cx={w / 2} cy={-12} r={14} fill="currentColor" opacity={0.18} stroke="currentColor" strokeWidth={1.8} />
      <rect x={0} y={0} width={w} height={h} rx={6} ry={6} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
    </>
  ),
  'business-role': (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={6} ry={6} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
      {/* Role marker — small circle top-right */}
      <circle cx={w - 12} cy={12} r={6} fill="currentColor" opacity={0.25} stroke="currentColor" strokeWidth={1.2} />
    </>
  ),
  'business-process': (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={10} ry={10} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
      {/* Arrow marker — top-right */}
      <polygon points={`${w - 20},6 ${w - 8},14 ${w - 20},22`} fill="currentColor" opacity={0.30} />
    </>
  ),
  'business-service': (w, h) => (
    <>
      {/* Rounded-top rectangle (ArchiMate service) */}
      <path d={`M0,${h * 0.15} Q0,0 ${w * 0.15},0 L${w * 0.85},0 Q${w},0 ${w},${h * 0.15} L${w},${h} L0,${h} Z`}
        fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
    </>
  ),
  'business-object': (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={2} ry={2} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={1.5} />
      <line x1={0} y1={18} x2={w} y2={18} stroke="currentColor" strokeWidth={1} opacity={0.25} />
    </>
  ),
  'business-event': (w, h) => (
    <>
      {/* Event shape — notched left side */}
      <path d={`M${h * 0.15},0 L${w},0 L${w},${h} L${h * 0.15},${h} Q0,${h / 2} ${h * 0.15},0 Z`}
        fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
    </>
  ),
  'business-interface': (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={4} ry={4} fill="currentColor" opacity={0.08} stroke="currentColor" strokeWidth={1.5} />
      {/* Interface lollipop */}
      <circle cx={-6} cy={h / 2} r={6} fill="currentColor" opacity={0.20} stroke="currentColor" strokeWidth={1.2} />
      <line x1={0} y1={h / 2} x2={-12} y2={h / 2} stroke="currentColor" strokeWidth={1.2} opacity={0.25} />
    </>
  ),
  contract: (w, h) => {
    const fold = 14;
    return (
      <>
        <path
          d={`M0,0 L${w - fold},0 L${w},${fold} L${w},${h} L0,${h} Z M${w - fold},0 L${w - fold},${fold} L${w},${fold}`}
          fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={1.5}
        />
        {/* Signature lines */}
        <line x1={w * 0.2} y1={h - 22} x2={w * 0.8} y2={h - 22} stroke="currentColor" strokeWidth={0.8} opacity={0.25} />
        <line x1={w * 0.2} y1={h - 14} x2={w * 0.6} y2={h - 14} stroke="currentColor" strokeWidth={0.8} opacity={0.20} />
      </>
    );
  },

  // ── ArchiMate — Application Layer ──────────────────────────
  'application-component': (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={4} ry={4} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
      {/* ArchiMate component tabs on left */}
      <rect x={-8} y={14} width={16} height={8} rx={1} fill="currentColor" opacity={0.18} stroke="currentColor" strokeWidth={1} />
      <rect x={-8} y={28} width={16} height={8} rx={1} fill="currentColor" opacity={0.18} stroke="currentColor" strokeWidth={1} />
    </>
  ),
  'application-service': (w, h) => (
    <path d={`M0,${h * 0.15} Q0,0 ${w * 0.15},0 L${w * 0.85},0 Q${w},0 ${w},${h * 0.15} L${w},${h} L0,${h} Z`}
      fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
  ),
  'application-function': (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={8} ry={8} fill="currentColor" opacity={0.08} stroke="currentColor" strokeWidth={1.5} />
      {/* Gear marker */}
      <circle cx={w - 16} cy={14} r={6} fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.3} />
      <circle cx={w - 16} cy={14} r={2} fill="currentColor" opacity={0.3} />
    </>
  ),
  'application-interface': (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={4} ry={4} fill="currentColor" opacity={0.08} stroke="currentColor" strokeWidth={1.5} />
      <circle cx={-6} cy={h / 2} r={6} fill="currentColor" opacity={0.20} stroke="currentColor" strokeWidth={1.2} />
      <line x1={0} y1={h / 2} x2={-12} y2={h / 2} stroke="currentColor" strokeWidth={1.2} opacity={0.25} />
    </>
  ),
  'application-process': (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={10} ry={10} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
      <polygon points={`${w - 20},6 ${w - 8},14 ${w - 20},22`} fill="currentColor" opacity={0.30} />
    </>
  ),
  'data-object': (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={2} ry={2} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={1.5} />
      <line x1={0} y1={18} x2={w} y2={18} stroke="currentColor" strokeWidth={1} opacity={0.25} />
    </>
  ),

  // ── ArchiMate — Technology Layer ───────────────────────────
  node: (w, h) => {
    const d = 16; // 3D depth
    return (
      <>
        {/* Front face */}
        <rect x={0} y={d} width={w - d} height={h - d} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
        {/* Top face */}
        <polygon points={`0,${d} ${d},0 ${w},0 ${w - d},${d}`} fill="currentColor" opacity={0.06} stroke="currentColor" strokeWidth={1.5} />
        {/* Right face */}
        <polygon points={`${w - d},${d} ${w},0 ${w},${h - d} ${w - d},${h}`} fill="currentColor" opacity={0.04} stroke="currentColor" strokeWidth={1.5} />
      </>
    );
  },
  device: (w, h) => {
    const d = 14;
    return (
      <>
        <rect x={0} y={d} width={w - d} height={h - d} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
        <polygon points={`0,${d} ${d},0 ${w},0 ${w - d},${d}`} fill="currentColor" opacity={0.06} stroke="currentColor" strokeWidth={1.5} />
        <polygon points={`${w - d},${d} ${w},0 ${w},${h - d} ${w - d},${h}`} fill="currentColor" opacity={0.04} stroke="currentColor" strokeWidth={1.5} />
        {/* Device base bar */}
        <rect x={w * 0.1} y={h - 6} width={w * 0.65} height={4} rx={1} fill="currentColor" opacity={0.20} />
      </>
    );
  },
  'system-software': (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={6} ry={6} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
      {/* Circle marker (cog) top-right */}
      <circle cx={w - 14} cy={14} r={7} fill="none" stroke="currentColor" strokeWidth={1.3} opacity={0.3} />
      <circle cx={w - 14} cy={14} r={2.5} fill="currentColor" opacity={0.3} />
    </>
  ),
  'technology-service': (w, h) => (
    <path d={`M0,${h * 0.15} Q0,0 ${w * 0.15},0 L${w * 0.85},0 Q${w},0 ${w},${h * 0.15} L${w},${h} L0,${h} Z`}
      fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
  ),
  'communication-network': (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={6} ry={6} fill="currentColor" opacity={0.08} stroke="currentColor" strokeWidth={1.5} />
      {/* Network line with dots */}
      <line x1={16} y1={h - 16} x2={w - 16} y2={h - 16} stroke="currentColor" strokeWidth={1.5} opacity={0.3} />
      <circle cx={16} cy={h - 16} r={3} fill="currentColor" opacity={0.35} />
      <circle cx={w / 2} cy={h - 16} r={3} fill="currentColor" opacity={0.35} />
      <circle cx={w - 16} cy={h - 16} r={3} fill="currentColor" opacity={0.35} />
    </>
  ),
  'technology-interface': (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={4} ry={4} fill="currentColor" opacity={0.08} stroke="currentColor" strokeWidth={1.5} />
      <circle cx={-6} cy={h / 2} r={6} fill="currentColor" opacity={0.20} stroke="currentColor" strokeWidth={1.2} />
      <line x1={0} y1={h / 2} x2={-12} y2={h / 2} stroke="currentColor" strokeWidth={1.2} opacity={0.25} />
    </>
  ),

  // ── ArchiMate — Strategy / Motivation ──────────────────────
  capability: (w, h) => (
    <rect x={0} y={0} width={w} height={h} rx={14} ry={14} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
  ),
  stakeholder: (w, h) => (
    <>
      <circle cx={w / 2} cy={-12} r={14} fill="currentColor" opacity={0.18} stroke="currentColor" strokeWidth={1.8} />
      <rect x={0} y={0} width={w} height={h} rx={8} ry={8} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
    </>
  ),
  goal: (w, h) => (
    <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="currentColor" opacity={0.10} stroke="currentColor" strokeWidth={2} />
  ),
  requirement: (w, h) => (
    <>
      <rect x={0} y={0} width={w} height={h} rx={4} ry={4} fill="currentColor" opacity={0.08} stroke="currentColor" strokeWidth={1.5} />
      {/* Check mark */}
      <polyline points={`${w - 24},12 ${w - 18},18 ${w - 10},8`} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.35} />
    </>
  ),
};

const KIND_LABEL: Record<EntityKind, string> = {
  // C4 core
  person: 'Person',
  system: 'Software System',
  container: 'Container',
  component: 'Component',
  artifact: 'Artifact',
  trigger: 'Trigger',
  // AI / ML
  aimodel: 'AI Model',
  vectorstore: 'Vector Store',
  retriever: 'Retriever',
  evaluation: 'Evaluation',
  // ArchiMate — Business
  'business-actor': 'Business Actor',
  'business-role': 'Business Role',
  'business-process': 'Business Process',
  'business-service': 'Business Service',
  'business-object': 'Business Object',
  'business-event': 'Business Event',
  'business-interface': 'Business Interface',
  contract: 'Contract',
  // ArchiMate — Application
  'application-component': 'App Component',
  'application-service': 'App Service',
  'application-function': 'App Function',
  'application-interface': 'App Interface',
  'application-process': 'App Process',
  'data-object': 'Data Object',
  // ArchiMate — Technology
  node: 'Node',
  device: 'Device',
  'system-software': 'System Software',
  'technology-service': 'Tech Service',
  'communication-network': 'Network',
  'technology-interface': 'Tech Interface',
  // ArchiMate — Strategy / Motivation
  capability: 'Capability',
  stakeholder: 'Stakeholder',
  goal: 'Goal',
  requirement: 'Requirement',
};

/* ─── Standard C4 Node ────────────────────────────────────── */

const StandardNode: React.FC<{ entity: ArchEntity; dims: { width: number; height: number }; color: string; drillable: boolean }> = ({
  entity, dims, color, drillable,
}) => {
  // Type label: [Kind] or [Kind: Technology] for software elements
  const tech = entity.metadata.technology;
  const kindStr = KIND_LABEL[entity.kind];
  const showTech = tech && !['person', 'trigger', 'business-actor', 'business-role', 'business-event', 'business-object', 'contract', 'stakeholder', 'goal', 'capability', 'requirement'].includes(entity.kind);
  const typeLabel = showTech
    ? `[${kindStr}: ${tech}]`
    : `[${kindStr}]`;

  // All standard C4 elements render text inside a box now (even person)
  const textStartY = 24;

  return (
    <>
      {SHAPE_RENDERERS[entity.kind](dims.width, dims.height)}

      {/* Name */}
      <text
        x={dims.width / 2}
        y={textStartY}
        textAnchor="middle"
        fill="var(--canvas-text, #2D3436)"
        fontSize={entity.kind === 'system' ? 14 : 12}
        fontWeight={600}
        className="entity-label"
      >
        {entity.name.length > Math.floor(dims.width / 8)
          ? (entity.shortName || entity.name.slice(0, Math.floor(dims.width / 8) - 1) + '…')
          : entity.name}
      </text>

      {/* C4 Type label: [Kind] or [Kind: Technology] */}
      <text
        x={dims.width / 2}
        y={textStartY + 15}
        textAnchor="middle"
        fill="var(--canvas-text-secondary, #636E72)"
        fontSize={10}
        className="entity-kind-label"
      >
        {typeLabel}
      </text>

      {/* Description (wrapped, centered) */}
      {entity.description && (
        <foreignObject x={8} y={textStartY + 22} width={dims.width - 16} height={dims.height - textStartY - 30} className="entity-label">
          <div style={{
            fontSize: 9, lineHeight: '1.3',
            color: 'var(--canvas-text-secondary, #636E72)',
            textAlign: 'center', overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const, wordBreak: 'break-word',
          }}>
            {entity.description}
          </div>
        </foreignObject>
      )}

      {/* Drill-down indicator */}
      {drillable && (
        <g transform={`translate(${dims.width - 18}, ${dims.height - 18})`} opacity={0.5}>
          <circle r={8} fill={color} opacity={0.2} />
          <text x={0} y={4} textAnchor="middle" fontSize={10} fill={color}>⌄</text>
        </g>
      )}
    </>
  );
};

/* ─── Extended Card Node (Zoned Grid Layout) ─────────────── */

const MATURITY_LABEL_COLORS: Record<string, string> = {
  DEV: '#7C3AED', INTRO: '#2563EB', GROW: '#059669', MATURE: '#D97706', DECLINE: '#DC2626',
};

const ExtendedNode: React.FC<{ entity: ArchEntity; dims: { width: number; height: number }; color: string; drillable: boolean }> = ({
  entity, dims, color, drillable,
}) => {
  const w = dims.width;
  const h = dims.height;
  const meta = entity.metadata;

  // Parse technology string into chips
  const techChips = meta.technology
    ? meta.technology.split(/[,;/]+/).map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <>
      {/* Card background */}
      <rect x={0} y={0} width={w} height={h} rx={8} ry={8}
        fill="var(--canvas-bg, #FFFFFF)" stroke={color} strokeWidth={2} />

      {/* Full card content via foreignObject for CSS Grid */}
      <foreignObject x={0} y={0} width={w} height={h} style={{ overflow: 'hidden', borderRadius: 8 }}>
        <div className="ext-card" style={{ width: w, height: h, borderColor: color }}>

          {/* ── ZONE 1: HEADER ── */}
          <div className="ext-header" style={{ background: `${color}18` }}>
            <div className="ext-header-row">
              {/* Left: 3-letter code badge */}
              {entity.identificationId ? (
                <span className="ext-code-badge" style={{ background: `${color}22`, color }}>{entity.identificationId}</span>
              ) : entity.shortName ? (
                <span className="ext-code-badge" style={{ background: `${color}22`, color }}>{entity.shortName}</span>
              ) : (
                <span className="ext-code-badge" style={{ background: `${color}22`, color }}>{entity.kind.slice(0, 3).toUpperCase()}</span>
              )}

              {/* Center: long name */}
              <span className="ext-name" title={entity.name}>{entity.name}</span>

              {/* Right: context badges */}
              <span className="ext-context-badges">
                {meta.pii && <span className="ext-badge ext-badge--pii">PII</span>}
                {meta.pciDss && <span className="ext-badge ext-badge--pci">PCI</span>}
              </span>
            </div>

            {/* Kind badge (top-right overlay) */}
            <span className="ext-kind-badge" style={{ background: color }}>{entity.kind.toUpperCase()}</span>
          </div>

          {/* ── ZONE 2: DESCRIPTION ── */}
          {entity.description && (
            <div className="ext-desc">{entity.description}</div>
          )}

          {/* ── ZONE 3: CLASSIFICATION STRIP ── */}
          <div className="ext-strip">
            {meta.appType && <span className="ext-chip">{meta.appType}</span>}
            {meta.size && <span className="ext-chip">{meta.size}</span>}
            {meta.compute && <span className="ext-chip">⚙{meta.compute}</span>}
            {meta.deploymentStage && (
              <span className="ext-chip ext-chip--stage">{meta.deploymentStage}</span>
            )}
            {meta.maturity && (
              <span className="ext-chip" style={{ color: MATURITY_LABEL_COLORS[meta.maturity] ?? '#888', borderColor: MATURITY_LABEL_COLORS[meta.maturity] ?? '#888' }}>
                {meta.maturity}
              </span>
            )}
          </div>

          {/* ── ZONE 4: CONTENT AREA ── */}
          <div className="ext-content">
            {/* LEFT: Metrics */}
            <div className="ext-metrics">
              {meta.techConvergency != null && (
                <span className="ext-metric">
                  <span className="ext-metric-label">TC</span>
                  <span className="ext-metric-value">{'★'.repeat(meta.techConvergency)}{'☆'.repeat(3 - meta.techConvergency)}</span>
                </span>
              )}
              {meta.tps != null && (
                <span className="ext-metric">
                  <span className="ext-metric-label">TPS</span>
                  <span className="ext-metric-value">{meta.tps.toLocaleString()}</span>
                </span>
              )}
              {meta.owner && (
                <span className="ext-metric">
                  <span className="ext-metric-label">Owner</span>
                  <span className="ext-metric-value">{meta.owner}</span>
                </span>
              )}
            </div>

            {/* RIGHT: Technology chips */}
            <div className="ext-tech">
              {techChips.map((t) => (
                <span key={t} className="ext-tech-chip">{t}</span>
              ))}
            </div>
          </div>

          {/* Drill-down indicator */}
          {drillable && (
            <div className="ext-drill" style={{ color }}>⌄</div>
          )}
        </div>
      </foreignObject>
    </>
  );
};

/* ─── Main EntityNode ─────────────────────────────────────── */

export const EntityNode: React.FC<EntityNodeProps> = ({
  entity, x, y, selected, visualConfig, onSelect, onDrillDown, onDragStart,
  onConnectStart, connectTarget,
}) => {
  const [borderHover, setBorderHover] = useState(false);
  const isExtended = visualConfig.nodeDisplayMode === 'extended';
  const dims = isExtended ? NODE_DIMENSIONS_EXTENDED[entity.kind] : NODE_DIMENSIONS[entity.kind];

  // ArchiMate viewpoint always drives the border color
  const borderColor = VIEWPOINT_COLORS[entity.viewpoint];
  // Interior accent follows user colorBy preference
  const accentColor = visualConfig.colorBy === 'viewpoint'
    ? VIEWPOINT_COLORS[entity.viewpoint]
    : visualConfig.colorBy === 'kind'
      ? KIND_COLORS[entity.kind]
      : (entity.metadata.maturity ? MATURITY_COLORS[entity.metadata.maturity] : KIND_COLORS[entity.kind]);
  // For the SVG group (shapes use currentColor for stroke) → always viewpoint border
  const color = borderColor;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.detail === 2) {
      onDrillDown(entity.id);
    } else {
      onSelect(entity.id, e);
      onDragStart(entity.id, e.clientX, e.clientY);
    }
  };

  const drillable = !!DRILLABLE_KINDS[entity.kind];

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ color, cursor: 'pointer', transition: 'transform 0.3s ease' }}
      onMouseDown={handleMouseDown}
      className={`entity-node ${selected ? 'entity-node--selected' : ''}`}
      role="button"
      aria-label={`${entity.kind}: ${entity.name}${selected ? ' (selected)' : ''}${drillable ? ', double-click to drill down' : ''}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(entity.id);
        }
      }}
    >
      {/* Selection glow */}
      {selected && (
        <rect
          x={-6} y={-6}
          width={dims.width + 12} height={dims.height + 12}
          rx={12} fill="none"
          stroke={color} strokeWidth={3} opacity={0.4}
          className="selection-glow"
        />
      )}

      {isExtended
        ? <ExtendedNode entity={entity} dims={dims} color={accentColor} drillable={drillable} />
        : <StandardNode entity={entity} dims={dims} color={accentColor} drillable={drillable} />
      }

      {/* ── Connect-target highlight (shown when dragging an edge onto this node) */}
      {connectTarget && (
        <rect
          x={-6} y={-6}
          width={dims.width + 12} height={dims.height + 12}
          rx={12} fill="none"
          stroke="var(--accent, #0984E3)" strokeWidth={2.5}
          opacity={0.85}
          pointerEvents="none"
        />
      )}

      {/* ── Border hover ring (visual hint that dragging from here creates an edge) */}
      {borderHover && (
        <rect
          x={-4} y={-4}
          width={dims.width + 8} height={dims.height + 8}
          rx={11} fill="none"
          stroke={color} strokeWidth={1.5}
          opacity={0.7}
          strokeDasharray="5 3"
          pointerEvents="none"
        />
      )}

      {/* ── Invisible border strike zone: pointer-events:stroke means only the
           perimeter stroke area is hit-testable, not the fill. Hovering here
           shows the crosshair cursor and reveals the dashed ring hint. */}
      {onConnectStart && (
        <rect
          x={0} y={0}
          width={dims.width} height={dims.height}
          rx={8}
          fill="none"
          stroke="transparent"
          strokeWidth={16}
          style={{ cursor: 'crosshair', pointerEvents: 'stroke' }}
          onMouseEnter={() => setBorderHover(true)}
          onMouseLeave={() => setBorderHover(false)}
          onMouseDown={(e) => {
            e.stopPropagation();
            setBorderHover(false);
            onConnectStart(entity.id, e.clientX, e.clientY);
          }}
        />
      )}
    </g>
  );
};
