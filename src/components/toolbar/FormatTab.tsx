import React from 'react';
import { useStore } from '../../store/useStore';
import { CreditCard, Palette, Zap, Grid3x3, Magnet, LayoutGrid, Route } from 'lucide-react';

export const FormatTab: React.FC = () => {
  const visualConfig = useStore((s) => s.visualConfig);
  const setVisualConfig = useStore((s) => s.setVisualConfig);
  const autoLayout = useStore((s) => s.autoLayout);

  return (
    <>
      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button
            className={`ribbon-btn ${visualConfig.nodeDisplayMode === 'extended' ? 'ribbon-btn--active' : ''}`}
            onClick={() => setVisualConfig({ ...visualConfig, nodeDisplayMode: visualConfig.nodeDisplayMode === 'standard' ? 'extended' : 'standard' })}
            title={`Node display: ${visualConfig.nodeDisplayMode}`}
          >
            <span className="ribbon-btn-icon"><CreditCard size={20} /></span>
            <span className="ribbon-btn-label">{visualConfig.nodeDisplayMode === 'standard' ? 'Standard' : 'Extended'}</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => setVisualConfig({ ...visualConfig, colorBy: visualConfig.colorBy === 'kind' ? 'maturity' : 'kind' })}
            title={`Color by: ${visualConfig.colorBy}`}
          >
            <span className="ribbon-btn-icon"><Palette size={20} /></span>
            <span className="ribbon-btn-label">{visualConfig.colorBy === 'kind' ? 'By Kind' : 'By Maturity'}</span>
          </button>
        </div>
        <span className="ribbon-group-label">Display</span>
      </div>

      <div className="ribbon-separator" />

      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button
            className={`ribbon-btn ${visualConfig.animateEdges !== 'off' ? 'ribbon-btn--active' : ''}`}
            onClick={() => {
              const next = visualConfig.animateEdges === 'off' ? 'on' : visualConfig.animateEdges === 'on' ? 'dynamic' : 'off';
              setVisualConfig({ ...visualConfig, animateEdges: next });
            }}
            title={`Edge animation: ${visualConfig.animateEdges}`}
          >
            <span className="ribbon-btn-icon"><Zap size={20} /></span>
            <span className="ribbon-btn-label">{visualConfig.animateEdges === 'off' ? 'Static' : visualConfig.animateEdges === 'on' ? 'Animated' : 'Dynamic'}</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => {
              const next = visualConfig.edgeRouting === 'ORTHOGONAL' ? 'POLYLINE' : visualConfig.edgeRouting === 'POLYLINE' ? 'SPLINES' : 'ORTHOGONAL';
              setVisualConfig({ ...visualConfig, edgeRouting: next });
            }}
            title={`Edge routing: ${visualConfig.edgeRouting.toLowerCase()}`}
          >
            <span className="ribbon-btn-icon"><Route size={20} /></span>
            <span className="ribbon-btn-label">{visualConfig.edgeRouting === 'ORTHOGONAL' ? 'Orthogonal' : visualConfig.edgeRouting === 'POLYLINE' ? 'Polyline' : 'Splines'}</span>
          </button>
        </div>
        <span className="ribbon-group-label">Effects</span>
      </div>

      <div className="ribbon-separator" />

      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button
            className={`ribbon-btn ${visualConfig.showGrid ? 'ribbon-btn--active' : ''}`}
            onClick={() => setVisualConfig({ ...visualConfig, showGrid: !visualConfig.showGrid })}
            title={visualConfig.showGrid ? 'Hide grid' : 'Show grid'}
          >
            <span className="ribbon-btn-icon"><Grid3x3 size={20} /></span>
            <span className="ribbon-btn-label">{visualConfig.showGrid ? 'Grid On' : 'Grid Off'}</span>
          </button>
          <button
            className={`ribbon-btn ${visualConfig.snapToGrid ? 'ribbon-btn--active' : ''}`}
            onClick={() => setVisualConfig({ ...visualConfig, snapToGrid: !visualConfig.snapToGrid })}
            title={visualConfig.snapToGrid ? 'Disable snap' : 'Enable snap'}
          >
            <span className="ribbon-btn-icon"><Magnet size={20} /></span>
            <span className="ribbon-btn-label">{visualConfig.snapToGrid ? 'Snap On' : 'Snap Off'}</span>
          </button>
        </div>
        <span className="ribbon-group-label">Grid</span>
      </div>

      <div className="ribbon-separator" />

      <div className="ribbon-group">
        <div className="ribbon-group-buttons">
          <button className="ribbon-btn ribbon-btn--accent" onClick={() => autoLayout()} title="Re-layout all unlocked entities">
            <span className="ribbon-btn-icon"><LayoutGrid size={20} /></span>
            <span className="ribbon-btn-label">Auto Layout</span>
          </button>
        </div>
        <span className="ribbon-group-label">Arrange</span>
      </div>
    </>
  );
};
