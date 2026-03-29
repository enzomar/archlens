import React from 'react';
import { KIND_COLORS, EDGE_VISUALS, VIEWPOINT_COLORS, VIEWPOINT_LABELS, CONCRETE_VIEWPOINTS } from '../../domain/types';
import type { EntityKind, EdgeType, EdgeVisual } from '../../domain/types';

const KIND_LABELS: Record<EntityKind, string> = {
  person: 'Person',
  system: 'Software System',
  container: 'Container',
  component: 'Component',
  artifact: 'Artifact',
  trigger: 'Trigger',
  aimodel: 'AI Model',
  vectorstore: 'Vector Store',
  retriever: 'Retriever',
  evaluation: 'Evaluation',
  'business-actor': 'Business Actor',
  'business-role': 'Business Role',
  'business-process': 'Business Process',
  'business-service': 'Business Service',
  'business-object': 'Business Object',
  'business-event': 'Business Event',
  'business-interface': 'Business Interface',
  contract: 'Contract',
  'application-component': 'App Component',
  'application-service': 'App Service',
  'application-function': 'App Function',
  'application-interface': 'App Interface',
  'application-process': 'App Process',
  'data-object': 'Data Object',
  node: 'Node',
  device: 'Device',
  'system-software': 'System Software',
  'technology-service': 'Tech Service',
  'communication-network': 'Network',
  'technology-interface': 'Tech Interface',
  capability: 'Capability',
  stakeholder: 'Stakeholder',
  goal: 'Goal',
  requirement: 'Requirement',
};

const EDGE_LABELS: Record<string, string> = {
  sync: 'Synchronous',
  async: 'Asynchronous',
  dataflow: 'Data Flow',
  dependency: 'Dependency',
  trigger: 'Trigger',
  retrieves: 'Retrieves',
  augments: 'Augments',
  generates: 'Generates',
  retrieves_from: 'Retrieves From',
  queries_model: 'Queries Model',
  evaluates: 'Evaluates',
};

interface CanvasLegendProps {
  visibleKinds: EntityKind[];
  visibleEdgeTypes: EdgeType[];
  isGlobalView: boolean;
}

function KindIcon({ kind }: { kind: EntityKind }) {
  const c = KIND_COLORS[kind];
  if (kind === 'person') return (
    <>
      <circle cx={11} cy={3} r={3} fill={c} opacity={0.5} stroke={c} strokeWidth={0.8} />
      <rect x={2} y={7} width={18} height={9} rx={2} fill={c} opacity={0.3} stroke={c} strokeWidth={0.8} />
    </>
  );
  if (kind === 'component') return (
    <>
      <rect x={3} y={1} width={17} height={14} rx={1} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
      <rect x={0} y={4} width={6} height={3} rx={0.5} fill={c} opacity={0.4} stroke={c} strokeWidth={0.5} />
      <rect x={0} y={9} width={6} height={3} rx={0.5} fill={c} opacity={0.4} stroke={c} strokeWidth={0.5} />
    </>
  );
  if (kind === 'artifact') return (
    <path d="M0,0 L16,0 L20,4 L20,16 L0,16 Z M16,0 L16,4 L20,4" fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
  );
  if (kind === 'trigger') return (
    <polygon points="11,0 22,6 14,6 15,16 0,10 8,10" fill={c} opacity={0.3} stroke={c} strokeWidth={0.8} />
  );
  if (kind === 'aimodel') return (
    <>
      <rect x={1} y={1} width={20} height={14} rx={4} fill={c} opacity={0.2} stroke={c} strokeWidth={1.2} />
      <path d="M8,5 L11,3 L14,5 L11,7 Z" fill={c} opacity={0.5} />
    </>
  );
  if (kind === 'vectorstore') return (
    <>
      <ellipse cx={11} cy={4} rx={10} ry={3} fill={c} opacity={0.25} stroke={c} strokeWidth={0.8} />
      <path d="M1,4 L1,12 Q1,15 11,15 Q21,15 21,12 L21,4" fill={c} opacity={0.15} stroke={c} strokeWidth={0.8} />
    </>
  );
  if (kind === 'retriever') return (
    <>
      <rect x={1} y={1} width={20} height={14} rx={2} fill={c} opacity={0.15} stroke={c} strokeWidth={0.8} />
      <circle cx={10} cy={7} r={3} fill="none" stroke={c} strokeWidth={0.8} opacity={0.5} />
      <line x1={12} y1={9} x2={15} y2={12} stroke={c} strokeWidth={0.8} opacity={0.5} />
    </>
  );
  if (kind === 'evaluation') return (
    <rect x={1} y={1} width={20} height={14} rx={2} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} strokeDasharray="3 1" />
  );
  // ArchiMate — process/event (arrow marker)
  if (kind === 'business-process' || kind === 'application-process') return (
    <>
      <rect x={1} y={1} width={20} height={14} rx={4} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
      <polygon points="17,4 21,8 17,12" fill={c} opacity={0.45} />
    </>
  );
  // ArchiMate — service (rounded top)
  if (kind === 'business-service' || kind === 'application-service' || kind === 'technology-service') return (
    <path d="M1,4 Q1,1 4,1 L18,1 Q21,1 21,4 L21,15 L1,15 Z" fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
  );
  // ArchiMate — interface (lollipop)
  if (kind === 'business-interface' || kind === 'application-interface' || kind === 'technology-interface') return (
    <>
      <rect x={3} y={1} width={18} height={14} rx={2} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
      <circle cx={1} cy={8} r={3} fill={c} opacity={0.35} stroke={c} strokeWidth={0.6} />
    </>
  );
  // ArchiMate — object / data-object (rect with header line)
  if (kind === 'business-object' || kind === 'data-object') return (
    <>
      <rect x={1} y={1} width={20} height={14} rx={1} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
      <line x1={1} y1={5} x2={21} y2={5} stroke={c} strokeWidth={0.6} opacity={0.35} />
    </>
  );
  // ArchiMate — actor / stakeholder (person shape)
  if (kind === 'business-actor' || kind === 'stakeholder') return (
    <>
      <circle cx={11} cy={3} r={3} fill={c} opacity={0.4} stroke={c} strokeWidth={0.8} />
      <rect x={2} y={7} width={18} height={9} rx={2} fill={c} opacity={0.25} stroke={c} strokeWidth={0.8} />
    </>
  );
  // ArchiMate — role (circle marker)
  if (kind === 'business-role') return (
    <>
      <rect x={1} y={1} width={20} height={14} rx={2} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
      <circle cx={18} cy={4} r={2.5} fill={c} opacity={0.4} stroke={c} strokeWidth={0.5} />
    </>
  );
  // ArchiMate — event (notched left)
  if (kind === 'business-event') return (
    <path d="M4,1 L21,1 L21,15 L4,15 Q1,8 4,1 Z" fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
  );
  // Contract (document-like)
  if (kind === 'contract') return (
    <path d="M0,0 L16,0 L20,4 L20,16 L0,16 Z M16,0 L16,4 L20,4" fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
  );
  // ArchiMate — application-component (tabs)
  if (kind === 'application-component') return (
    <>
      <rect x={3} y={1} width={17} height={14} rx={1} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
      <rect x={0} y={4} width={6} height={3} rx={0.5} fill={c} opacity={0.35} stroke={c} strokeWidth={0.5} />
      <rect x={0} y={9} width={6} height={3} rx={0.5} fill={c} opacity={0.35} stroke={c} strokeWidth={0.5} />
    </>
  );
  // ArchiMate — function (gear marker)
  if (kind === 'application-function') return (
    <>
      <rect x={1} y={1} width={20} height={14} rx={3} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
      <circle cx={17} cy={5} r={2.5} fill="none" stroke={c} strokeWidth={0.6} opacity={0.4} />
    </>
  );
  // ArchiMate — node (3D box)
  if (kind === 'node') return (
    <>
      <rect x={0} y={4} width={17} height={12} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
      <polygon points="0,4 4,0 21,0 17,4" fill={c} opacity={0.1} stroke={c} strokeWidth={0.6} />
      <polygon points="17,4 21,0 21,12 17,16" fill={c} opacity={0.08} stroke={c} strokeWidth={0.6} />
    </>
  );
  // ArchiMate — device (3D box + base)
  if (kind === 'device') return (
    <>
      <rect x={0} y={4} width={17} height={10} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
      <polygon points="0,4 4,0 21,0 17,4" fill={c} opacity={0.1} stroke={c} strokeWidth={0.6} />
      <polygon points="17,4 21,0 21,10 17,14" fill={c} opacity={0.08} stroke={c} strokeWidth={0.6} />
      <rect x={2} y={14} width={14} height={2} rx={0.5} fill={c} opacity={0.3} />
    </>
  );
  // ArchiMate — system-software (rect + circle)
  if (kind === 'system-software') return (
    <>
      <rect x={1} y={1} width={20} height={14} rx={2} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
      <circle cx={17} cy={5} r={2.5} fill="none" stroke={c} strokeWidth={0.7} opacity={0.4} />
      <circle cx={17} cy={5} r={1} fill={c} opacity={0.4} />
    </>
  );
  // ArchiMate — network (line + dots)
  if (kind === 'communication-network') return (
    <>
      <rect x={1} y={1} width={20} height={14} rx={2} fill={c} opacity={0.15} stroke={c} strokeWidth={0.8} />
      <line x1={4} y1={12} x2={18} y2={12} stroke={c} strokeWidth={0.8} opacity={0.4} />
      <circle cx={4} cy={12} r={1.5} fill={c} opacity={0.45} />
      <circle cx={11} cy={12} r={1.5} fill={c} opacity={0.45} />
      <circle cx={18} cy={12} r={1.5} fill={c} opacity={0.45} />
    </>
  );
  // Goal (ellipse)
  if (kind === 'goal') return (
    <ellipse cx={11} cy={8} rx={10} ry={7} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
  );
  // Capability (rounded rect)
  if (kind === 'capability') return (
    <rect x={1} y={1} width={20} height={14} rx={6} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
  );
  // Requirement (rect + check)
  if (kind === 'requirement') return (
    <>
      <rect x={1} y={1} width={20} height={14} rx={2} fill={c} opacity={0.2} stroke={c} strokeWidth={0.8} />
      <polyline points="14,5 17,8 21,3" fill="none" stroke={c} strokeWidth={0.8} opacity={0.5} />
    </>
  );
  // Default fallback
  return (
    <rect x={1} y={1} width={20} height={14} rx={3} fill={c} opacity={0.25} stroke={c} strokeWidth={kind === 'system' ? 1.5 : 0.8} />
  );
}

export const CanvasLegend: React.FC<CanvasLegendProps> = ({ visibleKinds, visibleEdgeTypes, isGlobalView }) => {
  if (visibleKinds.length === 0 && visibleEdgeTypes.length === 0) return null;

  return (
    <g className="diagram-key">
      <foreignObject
        x="100%"
        y="100%"
        width={220}
        height={400}
        style={{ overflow: 'visible' }}
      >
        <div
          style={{
            position: 'absolute',
            right: 16,
            bottom: 48,
            background: 'var(--surface, #fff)',
            border: '1px solid var(--border, #DFE6E9)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 10,
            lineHeight: '1.6',
            color: 'var(--text, #2D3436)',
            minWidth: 170,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6 }}>Key</div>
          {isGlobalView && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 10, marginBottom: 3, color: 'var(--text-secondary, #636E72)' }}>Viewpoints</div>
              {CONCRETE_VIEWPOINTS.map((vp) => (
                <div key={vp} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{
                    display: 'inline-block', width: 10, height: 10, borderRadius: 2,
                    background: VIEWPOINT_COLORS[vp], opacity: 0.7,
                  }} />
                  <span>{VIEWPOINT_LABELS[vp]}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border, #DFE6E9)', marginTop: 4, paddingTop: 4 }} />
            </div>
          )}
          {visibleKinds.map((kind) => (
            <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <svg width={22} height={16} style={{ flexShrink: 0 }}>
                <KindIcon kind={kind} />
              </svg>
              <span>{KIND_LABELS[kind]}</span>
            </div>
          ))}
          {visibleEdgeTypes.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border, #DFE6E9)', marginTop: 4, paddingTop: 4 }}>
              {visibleEdgeTypes.map((et) => {
                const vis = EDGE_VISUALS[et];
                return (
                  <div key={et} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <svg width={22} height={10} style={{ flexShrink: 0 }}>
                      <line
                        x1={0} y1={5} x2={16} y2={5}
                        stroke={vis.stroke}
                        strokeWidth={Math.min(vis.strokeWidth, 2)}
                        strokeDasharray={vis.dashArray}
                      />
                      <polygon points="16,2 22,5 16,8" fill={vis.stroke} />
                    </svg>
                    <span>{EDGE_LABELS[et]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </foreignObject>
    </g>
  );
};
