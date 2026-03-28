import React from 'react';
import { useStore } from '../../store/useStore';
import { Save, Zap, Play, PauseCircle, ZoomIn } from 'lucide-react';

export const SettingsTab: React.FC = () => {
  const autosaveEnabled    = useStore((s) => s.autosaveEnabled);
  const autosaveInterval   = useStore((s) => s.autosaveInterval);
  const setAutosaveEnabled = useStore((s) => s.setAutosaveEnabled);
  const setAutosaveInterval = useStore((s) => s.setAutosaveInterval);

  const visualConfig       = useStore((s) => s.visualConfig);
  const setVisualConfig    = useStore((s) => s.setVisualConfig);

  const zoomSensitivity    = useStore((s) => s.zoomSensitivity);
  const setZoomSensitivity = useStore((s) => s.setZoomSensitivity);

  const edgeAnimation = visualConfig.animateEdges !== 'off';

  // Convert 0.01–0.30 to a 1–10 display scale (step 1 ≈ 0.03)
  const sensitivityDisplay = Math.round(zoomSensitivity * 100);

  return (
    <>
      {/* ── Autosave ──────────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-buttons ribbon-group-buttons--col">
          <button
            className={`ribbon-btn ribbon-btn--wide${autosaveEnabled ? ' ribbon-btn--active' : ''}`}
            onClick={() => setAutosaveEnabled(!autosaveEnabled)}
            title={autosaveEnabled ? 'Disable autosave' : 'Enable autosave'}
            aria-pressed={autosaveEnabled}
          >
            <span className="ribbon-btn-icon">
              {autosaveEnabled ? <Save size={18} /> : <PauseCircle size={18} />}
            </span>
            <span className="ribbon-btn-label">
              Autosave {autosaveEnabled ? 'on' : 'off'}
            </span>
          </button>

          <div className={`ribbon-number-row${!autosaveEnabled ? ' ribbon-number-row--disabled' : ''}`}>
            <span className="ribbon-num-label">Every</span>
            <input
              type="number"
              className="ribbon-num-input"
              value={autosaveInterval}
              min={5}
              max={300}
              step={5}
              disabled={!autosaveEnabled}
              onChange={(e) => setAutosaveInterval(Number(e.target.value))}
              aria-label="Autosave interval in seconds"
            />
            <span className="ribbon-num-label">sec</span>
          </div>
        </div>
        <span className="ribbon-group-label">Autosave</span>
      </div>

      <div className="ribbon-separator" />

      {/* ── Canvas zoom sensitivity ───────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-buttons ribbon-group-buttons--col">
          <div className="ribbon-slider-row">
            <span className="ribbon-num-label ribbon-slider-icon"><ZoomIn size={13} /></span>
            <input
              type="range"
              className="ribbon-slider"
              min={1}
              max={30}
              step={1}
              value={sensitivityDisplay}
              onChange={(e) => setZoomSensitivity(Number(e.target.value) / 100)}
              aria-label="Canvas zoom sensitivity"
              title={`Zoom sensitivity: ${sensitivityDisplay}%`}
            />
            <span className="ribbon-num-label ribbon-num-label--fixed">{sensitivityDisplay}%</span>
          </div>
          <button
            className="ribbon-btn ribbon-btn--wide ribbon-btn--ghost"
            onClick={() => setZoomSensitivity(0.08)}
            title="Reset zoom sensitivity to default (8%)"
            disabled={sensitivityDisplay === 8}
          >
            <span className="ribbon-btn-label">Reset to default</span>
          </button>
        </div>
        <span className="ribbon-group-label">Zoom speed</span>
      </div>

      <div className="ribbon-separator" />

      {/* ── Canvas defaults ────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button
            className={`ribbon-btn${edgeAnimation ? ' ribbon-btn--active' : ''}`}
            onClick={() =>
              setVisualConfig({ ...visualConfig, animateEdges: edgeAnimation ? 'off' : 'on' })
            }
            title={edgeAnimation ? 'Disable edge animation' : 'Enable edge animation'}
            aria-pressed={edgeAnimation}
          >
            <span className="ribbon-btn-icon">
              {edgeAnimation ? <Zap size={20} /> : <Play size={20} />}
            </span>
            <span className="ribbon-btn-label">
              Edges {edgeAnimation ? 'animated' : 'static'}
            </span>
          </button>
        </div>
        <span className="ribbon-group-label">Canvas</span>
      </div>
    </>
  );
};
