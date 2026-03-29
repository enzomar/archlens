import React from 'react';
import { useStore } from '../../store/useStore';
import type { ZoomLevel, Viewpoint } from '../../domain/types';
import type { LayoutMode } from '../../layout/types';

/* ── Static data ────────────────────────────────────────────── */

const ZOOM_LEVELS: { value: ZoomLevel; label: string; icon: string }[] = [
  { value: 'context',   label: 'System',    icon: '◻' },
  { value: 'container', label: 'Container', icon: '▣' },
  { value: 'component', label: 'Component', icon: '⊞' },
];

const VIEWPOINTS: { value: Viewpoint; label: string }[] = [
  { value: 'business',    label: 'Business' },
  { value: 'application', label: 'Application' },
  { value: 'technology',  label: 'Technology' },
];

const ORIENTATIONS: { value: LayoutMode; label: string; icon: string }[] = [
  { value: 'c4-nested',          label: 'C4 Nested',    icon: '▣' },
  { value: 'archimate-layered',  label: 'ArchiMate',    icon: '☰' },
];

/* ── Component ──────────────────────────────────────────────── */

export const ContextControlBar: React.FC = () => {
  const activeZoomLevels        = useStore((s) => s.activeZoomLevels);
  const activeViewpoints        = useStore((s) => s.activeViewpoints);
  const toggleActiveZoomLevel   = useStore((s) => s.toggleActiveZoomLevel);
  const toggleActiveViewpoint   = useStore((s) => s.toggleActiveViewpoint);
  const swimlaneOrientation     = useStore((s) => s.swimlaneOrientation);
  const setSwimlaneOrientation  = useStore((s) => s.setSwimlaneOrientation);

  return (
    <div className="ccb" role="toolbar" aria-label="Diagram filters">
      {/* ── C4 Level chips ─────────────────────────────── */}
      <div className="ccb-group" role="group" aria-label="C4 zoom levels">
        <span className="ccb-group-label">C4 Level</span>
        {ZOOM_LEVELS.map((z) => {
          const active = activeZoomLevels.includes(z.value);
          return (
            <button
              key={z.value}
              role="switch"
              aria-checked={active}
              className={`ccb-chip${active ? ' ccb-chip--on' : ''}`}
              onClick={() => toggleActiveZoomLevel(z.value)}
            >
              <span className="ccb-chip-icon">{z.icon}</span>
              {z.label}
            </button>
          );
        })}
      </div>

      <span className="ccb-divider" aria-hidden="true" />

      {/* ── Viewpoint chips ────────────────────────────── */}
      <div className="ccb-group" role="group" aria-label="ArchiMate viewpoints">
        <span className="ccb-group-label">Layer</span>
        {VIEWPOINTS.map((vp) => {
          const active = activeViewpoints.includes(vp.value);
          return (
            <button
              key={vp.value}
              role="switch"
              aria-checked={active}
              className={`ccb-chip ccb-chip--vp ccb-chip--${vp.value}${active ? ' ccb-chip--on' : ''}`}
              onClick={() => toggleActiveViewpoint(vp.value)}
            >
              <span className="ccb-chip-dot" />
              {vp.label}
            </button>
          );
        })}
      </div>

      <span className="ccb-divider" aria-hidden="true" />

      {/* ── Layout orientation chips ───────────────────── */}
      <div className="ccb-group" role="group" aria-label="Layout orientation">
        <span className="ccb-group-label">Layout</span>
        {ORIENTATIONS.map((o) => {
          const active = swimlaneOrientation === o.value;
          return (
            <button
              key={o.value}
              role="radio"
              aria-checked={active}
              className={`ccb-chip${active ? ' ccb-chip--on' : ''}`}
              onClick={() => setSwimlaneOrientation(o.value)}
            >
              <span className="ccb-chip-icon">{o.icon}</span>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
