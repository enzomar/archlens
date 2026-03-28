import React from 'react';
import { useStore } from '../../store/useStore';
import type { ZoomLevel, Viewpoint } from '../../domain/types';
import { VIEWPOINT_LABELS, VIEWPOINT_COLORS } from '../../domain/types';

/* ── Constants ──────────────────────────────────────────────── */

const ZOOM_LEVELS: { value: ZoomLevel; label: string; shortcut: string }[] = [
  { value: 'context',   label: 'System',    shortcut: '1' },
  { value: 'container', label: 'Container', shortcut: '2' },
  { value: 'component', label: 'Component', shortcut: '3' },
];

const VIEWPOINTS: { value: Viewpoint; label: string; shortcut: string }[] = [
  { value: 'business',    label: 'Business',    shortcut: 'B' },
  { value: 'application', label: 'Application', shortcut: 'A' },
  { value: 'technical',   label: 'Technical',   shortcut: 'T' },
];

/* ── Component ──────────────────────────────────────────────── */

export const ContextControlBar: React.FC = () => {
  const activeZoomLevels      = useStore((s) => s.activeZoomLevels);
  const activeViewpoints      = useStore((s) => s.activeViewpoints);
  const toggleActiveZoomLevel = useStore((s) => s.toggleActiveZoomLevel);
  const toggleActiveViewpoint = useStore((s) => s.toggleActiveViewpoint);

  return (
    <div className="context-control-bar" role="toolbar" aria-label="Diagram context">
      {/* ── LEFT: Zoom selector (multi-select) ──────────── */}
      <div className="ccb-section ccb-zoom">
        <span className="ccb-label">Zoom</span>
        <div className="ccb-segmented" role="group" aria-label="Zoom levels — select one or more">
          {ZOOM_LEVELS.map((z) => {
            const active = activeZoomLevels.includes(z.value);
            return (
              <button
                key={z.value}
                role="checkbox"
                aria-checked={active}
                className={`ccb-seg-btn${active ? ' ccb-seg-btn--active' : ''}`}
                onClick={() => toggleActiveZoomLevel(z.value)}
                title={`${z.label} level (${z.shortcut}) — click to ${active ? 'remove' : 'add'}`}
              >
                {z.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CENTER: Viewpoint selector (multi-select) ───── */}
      <div className="ccb-section ccb-viewpoint">
        <span className="ccb-label">Viewpoint</span>
        <div className="ccb-segmented ccb-segmented--vp" role="group" aria-label="Viewpoints — select one or more">
          {VIEWPOINTS.map((vp) => {
            const active = activeViewpoints.includes(vp.value);
            return (
              <button
                key={vp.value}
                role="checkbox"
                aria-checked={active}
                className={`ccb-seg-btn ccb-seg-btn--vp${active ? ' ccb-seg-btn--vp-active' : ''}`}
                onClick={() => toggleActiveViewpoint(vp.value)}
                title={`${vp.label} viewpoint (${vp.shortcut}) — click to ${active ? 'remove' : 'add'}`}
                style={
                  active
                    ? ({ '--vp-color': VIEWPOINT_COLORS[vp.value] } as React.CSSProperties)
                    : undefined
                }
              >
                {vp.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Context label (read-only summary) ─────── */}
      <div className="ccb-section ccb-context-label">
        <span className="ccb-context-badge">
          {activeViewpoints.map((vp) => VIEWPOINT_LABELS[vp]).join(' + ')}
          {' · '}
          {activeZoomLevels.map((zl) => ZOOM_LEVELS.find((z) => z.value === zl)?.label ?? zl).join(' + ')}
        </span>
      </div>
    </div>
  );
};
