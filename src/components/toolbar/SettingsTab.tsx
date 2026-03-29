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
  const sensitivityDisplay = Math.round(zoomSensitivity * 100);

  return (
    <>
      {/* ── Autosave ──────────────────────────────────── */}
      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button
            className={`ribbon-btn${autosaveEnabled ? ' ribbon-btn--active' : ''}`}
            onClick={() => setAutosaveEnabled(!autosaveEnabled)}
            title={autosaveEnabled ? 'Disable autosave' : 'Enable autosave'}
            aria-pressed={autosaveEnabled}
          >
            <span className="ribbon-btn-icon">
              {autosaveEnabled ? <Save size={20} /> : <PauseCircle size={20} />}
            </span>
            <span className="ribbon-btn-label">
              {autosaveEnabled ? 'On' : 'Off'}
            </span>
          </button>
          <div className={`ribbon-number-row${!autosaveEnabled ? ' ribbon-number-row--disabled' : ''}`}>
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
        <div className="ribbon-group-buttons">
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
        </div>
        <span className="ribbon-group-label">Zoom</span>
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
              {edgeAnimation ? 'Animated' : 'Static'}
            </span>
          </button>
        </div>
        <span className="ribbon-group-label">Edges</span>
      </div>
    </>
  );
};
