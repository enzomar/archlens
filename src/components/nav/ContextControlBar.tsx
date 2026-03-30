import React from 'react';
import { useStore } from '../../store/useStore';
import type { ZoomLevel, Viewpoint } from '../../domain/types';
import type { LayoutMode } from '../../layout/types';

// ─────────────────────────────────────────────────────────────────
// Context Control Bar — VIEW MODES STRATEGY
//
// Two distinct modes with ONE dominant and ONE secondary dimension:
//
//  C4-First (c4-nested)
//    PRIMARY:   Abstraction level (Context → Container → Component)
//    SECONDARY: ArchiMate layer represented via color / icon on nodes
//
//  ArchiMate-First (archimate-layered)
//    PRIMARY:   Layer (Business → Application → Technology)
//    SECONDARY: C4 abstraction level accessible via zoom within bands
//
// Switching modes does NOT reload data — only changes layout projection.
// The context sentence reinforces "same model, shown differently."
// ─────────────────────────────────────────────────────────────────

/* ── Static data ────────────────────────────────────────────── */

const ZOOM_LEVELS: { value: ZoomLevel; label: string; icon: string; description: string }[] = [
  { value: 'context',   label: 'Context',   icon: '◻', description: 'System boundaries and actors' },
  { value: 'container', label: 'Container', icon: '▣', description: 'Applications and data stores' },
  { value: 'component', label: 'Component', icon: '⊞', description: 'Internal building blocks' },
];

const VIEWPOINTS: { value: Viewpoint; label: string; description: string }[] = [
  { value: 'business',    label: 'Business',     description: 'Processes, roles, services' },
  { value: 'application', label: 'Application',  description: 'Systems, containers, components' },
  { value: 'technology',  label: 'Technology',   description: 'Infrastructure and platforms' },
];

const MODES: { value: LayoutMode; label: string; icon: string; primary: string; intent: string }[] = [
  {
    value: 'c4-nested',
    label: 'C4-First',
    icon: '▣',
    primary: 'Hierarchy',
    intent: 'Understand system structure',
  },
  {
    value: 'archimate-layered',
    label: 'ArchiMate-First',
    icon: '☰',
    primary: 'Layers',
    intent: 'Understand enterprise structure',
  },
];

/* ── Component ──────────────────────────────────────────────── */

export const ContextControlBar: React.FC = () => {
  const activeZoomLevels        = useStore((s) => s.activeZoomLevels);
  const activeViewpoints        = useStore((s) => s.activeViewpoints);
  const toggleActiveZoomLevel   = useStore((s) => s.toggleActiveZoomLevel);
  const toggleActiveViewpoint   = useStore((s) => s.toggleActiveViewpoint);
  const swimlaneOrientation     = useStore((s) => s.swimlaneOrientation);
  const setSwimlaneOrientation  = useStore((s) => s.setSwimlaneOrientation);

  const isC4 = swimlaneOrientation === 'c4-nested';
  const currentMode = MODES.find((m) => m.value === swimlaneOrientation)!;

  // Context description varies by mode
  const contextParts: string[] = [];
  if (isC4) {
    const levels = activeZoomLevels.map((zl) => ZOOM_LEVELS.find((z) => z.value === zl)?.label ?? zl);
    contextParts.push(levels.length > 0 ? levels.join(' + ') : 'all abstractions');
    if (activeViewpoints.length < 3 && activeViewpoints.length > 0) {
      contextParts.push(activeViewpoints.join(' + ') + ' layer' + (activeViewpoints.length > 1 ? 's' : ''));
    }
  } else {
    const vps = activeViewpoints.map((vp) => VIEWPOINTS.find((v) => v.value === vp)?.label ?? vp);
    contextParts.push(vps.length > 0 ? vps.join(' + ') : 'all layers');
    if (activeZoomLevels.length < 3 && activeZoomLevels.length > 0) {
      contextParts.push(activeZoomLevels.join(' + ') + ' abstraction');
    }
  }

  return (
    <div className={`ccb ccb--${isC4 ? 'c4' : 'archi'}`} role="toolbar" aria-label="Diagram view mode">

      {/* ══ MODE SWITCHER (always first, always prominent) ══════ */}
      <div className="ccb-mode-switcher" role="group" aria-label="Visualization mode">
        {MODES.map((m) => {
          const active = swimlaneOrientation === m.value;
          return (
            <button
              key={m.value}
              role="radio"
              aria-checked={active}
              className={`ccb-mode-btn${active ? ' ccb-mode-btn--active' : ''}`}
              onClick={() => setSwimlaneOrientation(m.value)}
              title={`${m.intent} — same model, shown differently`}
            >
              <span className="ccb-mode-icon">{m.icon}</span>
              <span className="ccb-mode-label">{m.label}</span>
              <span className="ccb-mode-sub">{m.primary}</span>
            </button>
          );
        })}
      </div>

      <span className="ccb-divider" aria-hidden="true" />

      {/* ══ PRIMARY CONTROLS — adapt per mode ════════════════════
          C4-First:        Abstraction level is primary
          ArchiMate-First: Layer / viewpoint is primary          */}
      {isC4 ? (
        <div className="ccb-group ccb-group--primary" role="group" aria-label="Abstraction">
          <span className="ccb-group-label">Abstraction</span>
          {ZOOM_LEVELS.map((z) => {
            const active = activeZoomLevels.includes(z.value);
            return (
              <button
                key={z.value}
                role="switch"
                aria-checked={active}
                className={`ccb-chip${active ? ' ccb-chip--on' : ''}`}
                title={z.description}
                onClick={() => toggleActiveZoomLevel(z.value)}
              >
                <span className="ccb-chip-icon">{z.icon}</span>
                {z.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="ccb-group ccb-group--primary" role="group" aria-label="Layer">
          <span className="ccb-group-label">Layer</span>
          {VIEWPOINTS.map((vp) => {
            const active = activeViewpoints.includes(vp.value);
            return (
              <button
                key={vp.value}
                role="switch"
                aria-checked={active}
                className={`ccb-chip ccb-chip--vp ccb-chip--${vp.value}${active ? ' ccb-chip--on' : ''}`}
                title={vp.description}
                onClick={() => toggleActiveViewpoint(vp.value)}
              >
                <span className="ccb-chip-dot" />
                {vp.label}
              </button>
            );
          })}
        </div>
      )}

      <span className="ccb-divider" aria-hidden="true" />

      {/* ══ SECONDARY CONTROLS — dimmed, shown as context detail ══
          C4-First:        Viewpoints shown for layer-aware filtering
          ArchiMate-First: Abstraction shown for detail-level control */}
      {isC4 ? (
        <div className="ccb-group ccb-group--secondary" role="group" aria-label="Layer (secondary)">
          <span className="ccb-group-label">Layer</span>
          {VIEWPOINTS.map((vp) => {
            const active = activeViewpoints.includes(vp.value);
            return (
              <button
                key={vp.value}
                role="switch"
                aria-checked={active}
                className={`ccb-chip ccb-chip--vp ccb-chip--${vp.value}${active ? ' ccb-chip--on' : ''}`}
                title={`${vp.description} (secondary — shown as color/icon on nodes)`}
                onClick={() => toggleActiveViewpoint(vp.value)}
              >
                <span className="ccb-chip-dot" />
                {vp.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="ccb-group ccb-group--secondary" role="group" aria-label="Abstraction (secondary)">
          <span className="ccb-group-label">Abstraction</span>
          {ZOOM_LEVELS.map((z) => {
            const active = activeZoomLevels.includes(z.value);
            return (
              <button
                key={z.value}
                role="switch"
                aria-checked={active}
                className={`ccb-chip${active ? ' ccb-chip--on' : ''}`}
                title={`${z.description} (secondary — shown inside bands)`}
                onClick={() => toggleActiveZoomLevel(z.value)}
              >
                <span className="ccb-chip-icon">{z.icon}</span>
                {z.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ══ LIVE CONTEXT SENTENCE ═══════════════════════════════ */}
      <span className="ccb-context-sentence" aria-live="polite">
        <em>{currentMode.intent}</em>
        {contextParts.length > 0 && ` — ${contextParts.join(', ')}`}
      </span>
    </div>
  );
};
