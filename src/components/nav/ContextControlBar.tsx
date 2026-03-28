import React from 'react';
import { useStore } from '../../store/useStore';
import type { ZoomLevel, Viewpoint } from '../../domain/types';
import { VIEWPOINT_LABELS, VIEWPOINT_COLORS } from '../../domain/types';

/* ── Constants ──────────────────────────────────────────────── */

const ZOOM_LEVELS: { value: ZoomLevel; label: string; shortcut: string }[] = [
  { value: 'context', label: 'System', shortcut: '1' },
  { value: 'container', label: 'Container', shortcut: '2' },
  { value: 'component', label: 'Component', shortcut: '3' },
];

const VIEWPOINTS: { value: Viewpoint; label: string; shortcut: string }[] = [
  { value: 'business', label: 'Business', shortcut: 'B' },
  { value: 'application', label: 'Application', shortcut: 'A' },
  { value: 'technical', label: 'Technical', shortcut: 'T' },
  { value: 'global', label: 'Global', shortcut: 'G' },
];

/* ── Component ──────────────────────────────────────────────── */

export const ContextControlBar: React.FC = () => {
  const zoomLevel = useStore((s) => s.zoomLevel);
  const setZoomLevel = useStore((s) => s.setZoomLevel);
  const viewpoint = useStore((s) => s.viewpoint);
  const setViewpoint = useStore((s) => s.setViewpoint);
  const isGlobal = viewpoint === 'global';

  return (
    <div className={`context-control-bar${isGlobal ? ' ccb--global' : ''}`} role="toolbar" aria-label="Diagram context">
      {/* ── LEFT: Zoom selector ─────────────────────────── */}
      <div className="ccb-section ccb-zoom">
        <span className="ccb-label">Zoom</span>
        <div className="ccb-segmented" role="radiogroup" aria-label="Zoom level">
          {ZOOM_LEVELS.map((z) => (
            <button
              key={z.value}
              role="radio"
              aria-checked={zoomLevel === z.value}
              className={`ccb-seg-btn${zoomLevel === z.value ? ' ccb-seg-btn--active' : ''}`}
              onClick={() => setZoomLevel(z.value)}
              title={`${z.label} level (${z.shortcut})`}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CENTER: Viewpoint selector ──────────────────── */}
      <div className="ccb-section ccb-viewpoint">
        <span className="ccb-label">Viewpoint</span>
        <div className="ccb-segmented ccb-segmented--vp" role="radiogroup" aria-label="Viewpoint">
          {VIEWPOINTS.map((vp) => (
            <button
              key={vp.value}
              role="radio"
              aria-checked={viewpoint === vp.value}
              className={`ccb-seg-btn ccb-seg-btn--vp${viewpoint === vp.value ? ' ccb-seg-btn--vp-active' : ''}`}
              onClick={() => setViewpoint(vp.value)}
              title={`${vp.label} viewpoint (${vp.shortcut})`}
              style={
                viewpoint === vp.value
                  ? ({ '--vp-color': VIEWPOINT_COLORS[vp.value] } as React.CSSProperties)
                  : undefined
              }
            >
              {vp.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Context label (read-only) ────────────── */}
      <div className="ccb-section ccb-context-label">
        <span
          className="ccb-context-badge"
          style={{ '--vp-color': VIEWPOINT_COLORS[viewpoint] } as React.CSSProperties}
        >
          {isGlobal
            ? `Global · ${ZOOM_LEVELS.find((z) => z.value === zoomLevel)?.label ?? zoomLevel}`
            : `${VIEWPOINT_LABELS[viewpoint]} · ${ZOOM_LEVELS.find((z) => z.value === zoomLevel)?.label ?? zoomLevel}`}
        </span>
      </div>
    </div>
  );
};
