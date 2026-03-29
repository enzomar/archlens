import React from 'react';
import { useStore } from '../../store/useStore';
import type { EntityKind, ZoomLevel } from '../../domain/types';
import { KIND_COLORS } from '../../domain/types';
import { getValidKindsForViewpoint } from '../../utils/validation';

/* ── Palette shape definitions ─────────────────────────────── */

interface PaletteItem {
  type: 'entity' | 'note' | 'boundary';
  kind?: EntityKind;
  label: string;
}

interface PaletteGroup {
  title: string;
  zoomLevel?: ZoomLevel; // undefined = always available ("Free Form")
  items: PaletteItem[];
}

const PALETTE_GROUPS: PaletteGroup[] = [
  {
    title: 'System Context',
    zoomLevel: 'context',
    items: [
      { type: 'entity', kind: 'person', label: 'Person' },
      { type: 'entity', kind: 'system', label: 'System' },
    ],
  },
  {
    title: 'Container',
    zoomLevel: 'container',
    items: [
      { type: 'entity', kind: 'container', label: 'Container' },
      { type: 'entity', kind: 'aimodel', label: 'AI Model' },
      { type: 'entity', kind: 'vectorstore', label: 'Vector Store' },
    ],
  },
  {
    title: 'Component',
    zoomLevel: 'component',
    items: [
      { type: 'entity', kind: 'component', label: 'Component' },
      { type: 'entity', kind: 'retriever', label: 'Retriever' },
      { type: 'entity', kind: 'evaluation', label: 'Evaluation' },
    ],
  },
  {
    title: 'Business Layer',
    items: [
      { type: 'entity', kind: 'business-actor', label: 'Business Actor' },
      { type: 'entity', kind: 'business-role', label: 'Business Role' },
      { type: 'entity', kind: 'business-process', label: 'Business Process' },
      { type: 'entity', kind: 'business-service', label: 'Business Service' },
      { type: 'entity', kind: 'business-object', label: 'Business Object' },
      { type: 'entity', kind: 'business-event', label: 'Business Event' },
      { type: 'entity', kind: 'business-interface', label: 'Business Interface' },
      { type: 'entity', kind: 'contract', label: 'Contract' },
    ],
  },
  {
    title: 'Application Layer',
    items: [
      { type: 'entity', kind: 'application-component', label: 'App Component' },
      { type: 'entity', kind: 'application-service', label: 'App Service' },
      { type: 'entity', kind: 'application-function', label: 'App Function' },
      { type: 'entity', kind: 'application-interface', label: 'App Interface' },
      { type: 'entity', kind: 'application-process', label: 'App Process' },
      { type: 'entity', kind: 'data-object', label: 'Data Object' },
    ],
  },
  {
    title: 'Technology Layer',
    items: [
      { type: 'entity', kind: 'node', label: 'Node' },
      { type: 'entity', kind: 'device', label: 'Device' },
      { type: 'entity', kind: 'system-software', label: 'System Software' },
      { type: 'entity', kind: 'technology-service', label: 'Tech Service' },
      { type: 'entity', kind: 'communication-network', label: 'Network' },
      { type: 'entity', kind: 'technology-interface', label: 'Tech Interface' },
    ],
  },
  {
    title: 'Strategy / Motivation',
    items: [
      { type: 'entity', kind: 'capability', label: 'Capability' },
      { type: 'entity', kind: 'stakeholder', label: 'Stakeholder' },
      { type: 'entity', kind: 'goal', label: 'Goal' },
      { type: 'entity', kind: 'requirement', label: 'Requirement' },
    ],
  },
  {
    title: 'Cross-Level',
    items: [
      { type: 'entity', kind: 'trigger', label: 'Trigger' },
      { type: 'entity', kind: 'artifact', label: 'Artifact' },
    ],
  },
  {
    title: 'Free Form',
    items: [
      { type: 'note', label: 'Note' },
      { type: 'boundary', label: 'Boundary' },
    ],
  },
];

/* ── Tiny SVG shape thumbnails ─────────────────────────────── */

const ShapeThumbnail: React.FC<{ item: PaletteItem; disabled: boolean }> = ({ item, disabled }) => {
  const color = disabled
    ? 'var(--text-muted)'
    : item.kind
      ? KIND_COLORS[item.kind]
      : 'var(--text-secondary)';
  const w = 36;
  const h = 28;

  if (item.type === 'note') {
    return (
      <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb">
        <rect x={2} y={2} width={32} height={24} rx={2} fill="#FFF9C4" stroke="#F9A825" strokeWidth={1.5} opacity={disabled ? 0.4 : 1} />
        <line x1={8} y1={10} x2={28} y2={10} stroke="#F9A825" strokeWidth={0.8} opacity={0.5} />
        <line x1={8} y1={15} x2={24} y2={15} stroke="#F9A825" strokeWidth={0.8} opacity={0.5} />
      </svg>
    );
  }

  if (item.type === 'boundary') {
    return (
      <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb">
        <rect x={2} y={2} width={32} height={24} rx={3} fill="#E3F2FD" fillOpacity={disabled ? 0.15 : 0.3} stroke="#1565C0" strokeWidth={1.5} strokeDasharray="4 2" opacity={disabled ? 0.4 : 1} />
      </svg>
    );
  }

  // Entity shapes
  const op = disabled ? 0.35 : 1;
  switch (item.kind) {
    case 'person':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <circle cx={18} cy={6} r={5} fill="currentColor" opacity={0.25} stroke="currentColor" strokeWidth={1.2} />
          <rect x={6} y={12} width={24} height={14} rx={4} fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1.2} />
        </svg>
      );
    case 'system':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={2} y={2} width={32} height={24} rx={4} fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1.5} />
        </svg>
      );
    case 'container':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={2} y={2} width={32} height={24} rx={3} fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1.2} />
        </svg>
      );
    case 'component':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={4} y={2} width={30} height={24} rx={2} fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1} />
          <rect x={0} y={7} width={8} height={5} rx={1} fill="currentColor" opacity={0.2} stroke="currentColor" strokeWidth={0.8} />
          <rect x={0} y={16} width={8} height={5} rx={1} fill="currentColor" opacity={0.2} stroke="currentColor" strokeWidth={0.8} />
        </svg>
      );
    case 'artifact': {
      const f = 8;
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <path d={`M2,2 L${34 - f},2 L34,${2 + f} L34,26 L2,26 Z M${34 - f},2 L${34 - f},${2 + f} L34,${2 + f}`}
            fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1.2} />
        </svg>
      );
    }
    case 'trigger':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <polygon
            points="18,1 34,11 22,11 25,27 2,17 14,17"
            fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1.2} />
        </svg>
      );
    case 'aimodel':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={2} y={2} width={32} height={24} rx={5} fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1.5} />
          <path d="M14,9 L18,6 L22,9 L18,12 Z" fill="currentColor" opacity={0.4} />
        </svg>
      );
    case 'vectorstore':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <ellipse cx={18} cy={7} rx={15} ry={5} fill="currentColor" opacity={0.2} stroke="currentColor" strokeWidth={1.2} />
          <path d="M3,7 L3,21 Q3,26 18,26 Q33,26 33,21 L33,7" fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1.2} />
        </svg>
      );
    case 'retriever':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={2} y={2} width={32} height={24} rx={3} fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1} />
          <circle cx={15} cy={12} r={5} fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.4} />
          <line x1={19} y1={16} x2={24} y2={21} stroke="currentColor" strokeWidth={1.2} opacity={0.4} />
        </svg>
      );
    case 'evaluation':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={2} y={2} width={32} height={24} rx={3} fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1.2} strokeDasharray="4 2" />
          <circle cx={18} cy={12} r={6} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.35} />
          <line x1={18} y1={12} x2={22} y2={8} stroke="currentColor" strokeWidth={1} opacity={0.4} />
        </svg>
      );
    // ArchiMate — Business Actor / Stakeholder (person-like)
    case 'business-actor':
    case 'stakeholder':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <circle cx={18} cy={5} r={4} fill="currentColor" opacity={0.3} stroke="currentColor" strokeWidth={1} />
          <rect x={6} y={10} width={24} height={16} rx={3} fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1.2} />
        </svg>
      );
    // ArchiMate — Business Role (circle marker)
    case 'business-role':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={2} y={2} width={32} height={24} rx={3} fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1.2} />
          <circle cx={28} cy={8} r={4} fill="currentColor" opacity={0.35} stroke="currentColor" strokeWidth={0.8} />
        </svg>
      );
    // ArchiMate — Process (rounded + arrow)
    case 'business-process':
    case 'application-process':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={2} y={2} width={32} height={24} rx={6} fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1.2} />
          <polygon points="27,6 33,14 27,22" fill="currentColor" opacity={0.4} />
        </svg>
      );
    // ArchiMate — Service (rounded top)
    case 'business-service':
    case 'application-service':
    case 'technology-service':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <path d="M2,6 Q2,2 7,2 L29,2 Q34,2 34,6 L34,26 L2,26 Z" fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1.2} />
        </svg>
      );
    // ArchiMate — Object / Data Object (rect + header line)
    case 'business-object':
    case 'data-object':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={2} y={2} width={32} height={24} rx={1} fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1.2} />
          <line x1={2} y1={9} x2={34} y2={9} stroke="currentColor" strokeWidth={0.8} opacity={0.3} />
        </svg>
      );
    // ArchiMate — Event (notched left)
    case 'business-event':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <path d="M7,2 L34,2 L34,26 L7,26 Q2,14 7,2 Z" fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1.2} />
        </svg>
      );
    // ArchiMate — Interface (lollipop)
    case 'business-interface':
    case 'application-interface':
    case 'technology-interface':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={6} y={2} width={28} height={24} rx={2} fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1} />
          <circle cx={4} cy={14} r={4} fill="currentColor" opacity={0.3} stroke="currentColor" strokeWidth={0.8} />
        </svg>
      );
    // ArchiMate — Contract (folded doc + lines)
    case 'contract':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <path d={`M2,2 L26,2 L34,10 L34,26 L2,26 Z M26,2 L26,10 L34,10`}
            fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1.2} />
          <line x1={8} y1={18} x2={28} y2={18} stroke="currentColor" strokeWidth={0.6} opacity={0.25} />
          <line x1={8} y1={22} x2={22} y2={22} stroke="currentColor" strokeWidth={0.6} opacity={0.2} />
        </svg>
      );
    // ArchiMate — Application Component (tabs)
    case 'application-component':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={4} y={2} width={30} height={24} rx={2} fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1} />
          <rect x={0} y={7} width={8} height={5} rx={1} fill="currentColor" opacity={0.25} stroke="currentColor" strokeWidth={0.8} />
          <rect x={0} y={16} width={8} height={5} rx={1} fill="currentColor" opacity={0.25} stroke="currentColor" strokeWidth={0.8} />
        </svg>
      );
    // ArchiMate — Application Function (gear)
    case 'application-function':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={2} y={2} width={32} height={24} rx={4} fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1.2} />
          <circle cx={28} cy={8} r={4} fill="none" stroke="currentColor" strokeWidth={0.8} opacity={0.35} />
          <circle cx={28} cy={8} r={1.5} fill="currentColor" opacity={0.35} />
        </svg>
      );
    // ArchiMate — Node (3D box)
    case 'node':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={0} y={6} width={28} height={20} fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1} />
          <polygon points="0,6 6,0 34,0 28,6" fill="currentColor" opacity={0.06} stroke="currentColor" strokeWidth={0.8} />
          <polygon points="28,6 34,0 34,20 28,26" fill="currentColor" opacity={0.04} stroke="currentColor" strokeWidth={0.8} />
        </svg>
      );
    // ArchiMate — Device (3D box + base)
    case 'device':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={0} y={6} width={28} height={17} fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1} />
          <polygon points="0,6 6,0 34,0 28,6" fill="currentColor" opacity={0.06} stroke="currentColor" strokeWidth={0.8} />
          <polygon points="28,6 34,0 34,17 28,23" fill="currentColor" opacity={0.04} stroke="currentColor" strokeWidth={0.8} />
          <rect x={2} y={24} width={24} height={3} rx={1} fill="currentColor" opacity={0.25} />
        </svg>
      );
    // ArchiMate — System Software (circle marker)
    case 'system-software':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={2} y={2} width={32} height={24} rx={3} fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1.2} />
          <circle cx={28} cy={8} r={4} fill="none" stroke="currentColor" strokeWidth={0.8} opacity={0.35} />
          <circle cx={28} cy={8} r={1.5} fill="currentColor" opacity={0.35} />
        </svg>
      );
    // ArchiMate — Network (line + dots)
    case 'communication-network':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={2} y={2} width={32} height={24} rx={3} fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1} />
          <line x1={8} y1={20} x2={28} y2={20} stroke="currentColor" strokeWidth={1} opacity={0.35} />
          <circle cx={8} cy={20} r={2} fill="currentColor" opacity={0.4} />
          <circle cx={18} cy={20} r={2} fill="currentColor" opacity={0.4} />
          <circle cx={28} cy={20} r={2} fill="currentColor" opacity={0.4} />
        </svg>
      );
    // ArchiMate — Capability (rounded)
    case 'capability':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={2} y={2} width={32} height={24} rx={10} fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1.2} />
        </svg>
      );
    // ArchiMate — Goal (ellipse)
    case 'goal':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <ellipse cx={18} cy={14} rx={16} ry={12} fill="currentColor" opacity={0.12} stroke="currentColor" strokeWidth={1.2} />
        </svg>
      );
    // ArchiMate — Requirement (check mark)
    case 'requirement':
      return (
        <svg width={w} height={h} viewBox="0 0 36 28" className="palette-thumb" style={{ color, opacity: op }}>
          <rect x={2} y={2} width={32} height={24} rx={2} fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={1.2} />
          <polyline points="22,8 26,12 32,4" fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.45} />
        </svg>
      );
    default:
      return <svg width={w} height={h} className="palette-thumb" />;
  }
};

/* ── Main component ────────────────────────────────────────── */

export const ShapePalette: React.FC = () => {
  const zoomLevel = useStore((s) => s.zoomLevel);
  const viewpoint = useStore((s) => s.viewpoint);
  const allowedKinds = new Set(getValidKindsForViewpoint(viewpoint, zoomLevel));

  const handleDragStart = (e: React.DragEvent, item: PaletteItem) => {
    const payload = item.type === 'entity'
      ? `entity:${item.kind}`
      : item.type;
    e.dataTransfer.setData('application/archlens-shape', payload);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="shape-palette">
      <div className="shape-palette-title">Shapes</div>
      {PALETTE_GROUPS.map((group) => {
        const isCurrentZoom = !group.zoomLevel || group.zoomLevel === zoomLevel;
        return (
          <div key={group.title} className={`palette-group ${isCurrentZoom ? '' : 'palette-group--dimmed'}`}>
            <div className="palette-group-header">
              <span className="palette-group-title">{group.title}</span>
              {group.zoomLevel && group.zoomLevel !== zoomLevel && (
                <span className="palette-group-badge">{group.zoomLevel}</span>
              )}
            </div>
            <div className="palette-items">
              {group.items.map((item) => {
                const disabled = item.type === 'entity' && !allowedKinds.has(item.kind!);
                return (
                  <div
                    key={item.label}
                    className={`palette-item ${disabled ? 'palette-item--disabled' : ''}`}
                    draggable={!disabled}
                    onDragStart={disabled ? undefined : (e) => handleDragStart(e, item)}
                    title={disabled ? `${item.label} is not available at ${zoomLevel} zoom level` : `Drag to add ${item.label}`}
                  >
                    <ShapeThumbnail item={item} disabled={disabled} />
                    <span className="palette-item-label">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
