import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { KIND_COLORS, NODE_DIMENSIONS, NODE_DIMENSIONS_EXTENDED } from '../../domain/types';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Map, ChevronDown, ChevronUp, Grid3x3, Magnet } from 'lucide-react';

const MIN_SCALE = 0.1;
const MAX_SCALE = 3;
const MINIMAP_W = 200;
const MINIMAP_H = 140;

export const CanvasControls: React.FC = () => {
  const scale = useStore((s) => s.scale);
  const panX = useStore((s) => s.panX);
  const panY = useStore((s) => s.panY);
  const setScale = useStore((s) => s.setScale);
  const setPan = useStore((s) => s.setPan);
  const positions = useStore((s) => s.positions);
  const visualConfig = useStore((s) => s.visualConfig);
  const setVisualConfig = useStore((s) => s.setVisualConfig);
  const getVisibleEntities = useStore((s) => s.getVisibleEntities);

  const [miniMapOpen, setMiniMapOpen] = useState(true);
  const miniMapRef = useRef<SVGSVGElement>(null);
  // State for dragging the viewport rect inside the minimap
  const [mmDrag, setMmDrag] = useState<{ startMx: number; startMy: number; startPanX: number; startPanY: number } | null>(null);

  const visibleEntities = getVisibleEntities();
  const isExtended = visualConfig.nodeDisplayMode === 'extended';
  const DIMS = isExtended ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;

  const zoomIn = useCallback(() => setScale(Math.min(MAX_SCALE, scale + 0.15)), [scale, setScale]);
  const zoomOut = useCallback(() => setScale(Math.max(MIN_SCALE, scale - 0.15)), [scale, setScale]);
  const zoomFit = useCallback(() => {
    if (visibleEntities.length === 0) return;
    // Compute bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of visibleEntities) {
      const pos = positions.find((p) => p.entityId === e.id);
      if (!pos) continue;
      const dims = DIMS[e.kind];
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + dims.width);
      maxY = Math.max(maxY, pos.y + dims.height);
    }
    if (minX === Infinity) return;
    const bw = maxX - minX + 120;
    const bh = maxY - minY + 120;
    // Assume ~900x600 viewport as rough estimate
    const vw = 900;
    const vh = 600;
    const newScale = Math.min(vw / bw, vh / bh, 1.5);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setScale(newScale);
    setPan(vw / 2 - cx * newScale, vh / 2 - cy * newScale);
  }, [visibleEntities, positions, DIMS, setScale, setPan]);
  const zoomReset = useCallback(() => { setScale(1); setPan(0, 0); }, [setScale, setPan]);

  // Bounding box for minimap
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const e of visibleEntities) {
      const pos = positions.find((p) => p.entityId === e.id);
      if (!pos) continue;
      const dims = DIMS[e.kind];
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + dims.width);
      maxY = Math.max(maxY, pos.y + dims.height);
    }
    if (minX === Infinity) return null;
    const pad = 60;
    return { minX: minX - pad, minY: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
  }, [visibleEntities, positions, DIMS]);

  // Viewport rect in world coordinates
  const viewport = useMemo(() => {
    if (!bounds) return null;
    const vw = 900;
    const vh = 600;
    return {
      x: -panX / scale,
      y: -panY / scale,
      width: vw / scale,
      height: vh / scale,
    };
  }, [panX, panY, scale, bounds]);

  const handleMiniMapClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Only teleport on plain click (no drag happened)
    if (mmDrag) return;
    if (!bounds) return;
    const svg = miniMapRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Convert minimap coords to world coords
    const worldX = bounds.minX + (mx / MINIMAP_W) * bounds.width;
    const worldY = bounds.minY + (my / MINIMAP_H) * bounds.height;
    // Center viewport on this point
    const vw = 900;
    const vh = 600;
    setPan(vw / 2 - worldX * scale, vh / 2 - worldY * scale);
  }, [bounds, scale, setPan, mmDrag]);

  // Minimap viewport drag — convert mouse delta in minimap pixels to world pan delta
  const handleMmMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMmDrag({ startMx: e.clientX, startMy: e.clientY, startPanX: panX, startPanY: panY });
  }, [panX, panY]);

  const handleMmMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!mmDrag || !bounds) return;
    const dx = e.clientX - mmDrag.startMx;
    const dy = e.clientY - mmDrag.startMy;
    // Scale from minimap pixels to world px, then negate (dragging rect right = panning right means world moves left)
    const worldDx = (dx / MINIMAP_W) * bounds.width;
    const worldDy = (dy / MINIMAP_H) * bounds.height;
    setPan(mmDrag.startPanX - worldDx * scale, mmDrag.startPanY - worldDy * scale);
  }, [mmDrag, bounds, scale, setPan]);

  const handleMmMouseUp = useCallback(() => {
    setMmDrag(null);
  }, []);

  const pct = Math.round(scale * 100);

  return (
    <div className="canvas-controls">
      {/* Mini-map */}
      <div className={`canvas-minimap ${miniMapOpen ? 'canvas-minimap--open' : ''}`}>
        <button
          className="canvas-minimap-toggle"
          onClick={() => setMiniMapOpen(!miniMapOpen)}
          title={miniMapOpen ? 'Collapse mini-map' : 'Expand mini-map'}
          aria-label={miniMapOpen ? 'Collapse mini-map' : 'Expand mini-map'}
          aria-expanded={miniMapOpen}
        >
          <Map size={13} />
          <span>Mini-map</span>
          {miniMapOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>

        {miniMapOpen && bounds && (
          <svg
            ref={miniMapRef}
            className="canvas-minimap-svg"
            width={MINIMAP_W}
            height={MINIMAP_H}
            viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
            preserveAspectRatio="xMidYMid meet"
            onClick={handleMiniMapClick}
            onMouseMove={handleMmMouseMove}
            onMouseUp={handleMmMouseUp}
            onMouseLeave={handleMmMouseUp}
            style={{ cursor: mmDrag ? 'grabbing' : 'default' }}
          >
            {/* Background */}
            <rect x={bounds.minX} y={bounds.minY} width={bounds.width} height={bounds.height}
              fill="var(--canvas-bg, #FAFBFC)" />

            {/* Entity rectangles */}
            {visibleEntities.map((e) => {
              const pos = positions.find((p) => p.entityId === e.id);
              if (!pos) return null;
              const dims = DIMS[e.kind];
              return (
                <rect
                  key={e.id}
                  x={pos.x}
                  y={pos.y}
                  width={dims.width}
                  height={dims.height}
                  rx={4}
                  fill={KIND_COLORS[e.kind]}
                  opacity={0.7}
                  stroke="none"
                />
              );
            })}

            {/* Viewport indicator — draggable */}
            {viewport && (
              <rect
                x={viewport.x}
                y={viewport.y}
                width={viewport.width}
                height={viewport.height}
                fill="var(--accent, #0984E3)"
                fillOpacity={0.08}
                stroke="var(--accent, #0984E3)"
                strokeWidth={Math.max(2, bounds.width / 100)}
                strokeOpacity={0.6}
                rx={2}
                style={{ cursor: mmDrag ? 'grabbing' : 'grab' }}
                onMouseDown={handleMmMouseDown}
              />
            )}
          </svg>
        )}
        {miniMapOpen && !bounds && (
          <div className="canvas-minimap-empty">No entities</div>
        )}
      </div>

      {/* Zoom buttons */}
      <div className="canvas-zoom-bar">
        <button className="canvas-zoom-btn" onClick={zoomIn} title="Zoom in" aria-label="Zoom in">
          <ZoomIn size={16} />
        </button>
        <span className="canvas-zoom-level" title="Current zoom level">{pct}%</span>
        <button className="canvas-zoom-btn" onClick={zoomOut} title="Zoom out" aria-label="Zoom out">
          <ZoomOut size={16} />
        </button>
        <div className="canvas-zoom-sep" />
        <button className="canvas-zoom-btn" onClick={zoomFit} title="Fit to screen" aria-label="Fit to screen">
          <Maximize size={15} />
        </button>
        <button className="canvas-zoom-btn" onClick={zoomReset} title="Reset view" aria-label="Reset view">
          <RotateCcw size={15} />
        </button>
        <div className="canvas-zoom-sep" />
        <button
          className={`canvas-zoom-btn ${visualConfig.showGrid ? 'canvas-zoom-btn--active' : ''}`}
          onClick={() => setVisualConfig({ ...visualConfig, showGrid: !visualConfig.showGrid })}
          title={visualConfig.showGrid ? 'Hide grid' : 'Show grid'}
          aria-label="Toggle grid"
          aria-pressed={visualConfig.showGrid}
        >
          <Grid3x3 size={15} />
        </button>
        <button
          className={`canvas-zoom-btn ${visualConfig.snapToGrid ? 'canvas-zoom-btn--active' : ''}`}
          onClick={() => setVisualConfig({ ...visualConfig, snapToGrid: !visualConfig.snapToGrid })}
          title={visualConfig.snapToGrid ? 'Disable snap to grid' : 'Enable snap to grid'}
          aria-label="Toggle snap to grid"
          aria-pressed={visualConfig.snapToGrid}
        >
          <Magnet size={15} />
        </button>
      </div>
    </div>
  );
};
