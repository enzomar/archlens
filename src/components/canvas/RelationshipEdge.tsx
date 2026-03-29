import React from 'react';
import type { Relationship, NodePosition, ArchEntity, EdgeAnimationMode, NodeDisplayMode } from '../../domain/types';
import { EDGE_VISUALS, NODE_DIMENSIONS, NODE_DIMENSIONS_EXTENDED } from '../../domain/types';

interface RelationshipEdgeProps {
  rel: Relationship;
  sourcePos: NodePosition;
  targetPos: NodePosition;
  sourceEntity: ArchEntity;
  targetEntity: ArchEntity;
  selected: boolean;
  animateEdges: EdgeAnimationMode;
  maxTps: number;
  nodeDisplayMode: NodeDisplayMode;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  /** Index of this edge among all edges between the same pair of entities */
  siblingIndex: number;
  /** Total edges between the same unordered pair */
  siblingCount: number;
}

/** Compute the point where a line from inside a rect to an outside point exits the rect border */
function rectEdgePoint(
  cx: number, cy: number, w: number, h: number,
  targetX: number, targetY: number,
): { x: number; y: number } {
  const dx = targetX - cx;
  const dy = targetY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const hw = w / 2;
  const hh = h / 2;

  // Scale to reach the rect edge
  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return { x: cx + dx * scale, y: cy + dy * scale };
}

const SIBLING_SEPARATION = 28;

export const RelationshipEdge: React.FC<RelationshipEdgeProps> = ({
  rel, sourcePos, targetPos, sourceEntity, targetEntity, selected, animateEdges, maxTps, nodeDisplayMode, onSelect, onEdit, siblingIndex, siblingCount,
}) => {
  const visual = EDGE_VISUALS[rel.type];
  const dimsMap = nodeDisplayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;
  const sDims = dimsMap[sourceEntity.kind];
  const tDims = dimsMap[targetEntity.kind];

  // Center points
  const sCx = sourcePos.x + sDims.width / 2;
  const sCy = sourcePos.y + sDims.height / 2;
  const tCx = targetPos.x + tDims.width / 2;
  const tCy = targetPos.y + tDims.height / 2;

  // Edge points on border of source/target rects
  const sp = rectEdgePoint(sCx, sCy, sDims.width, sDims.height, tCx, tCy);
  const tp = rectEdgePoint(tCx, tCy, tDims.width, tDims.height, sCx, sCy);

  // Perpendicular offset to separate sibling edges between the same pair
  const edgeDx = tp.x - sp.x;
  const edgeDy = tp.y - sp.y;
  const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1;
  // Perpendicular unit vector (rotated 90°)
  const nx = -edgeDy / edgeLen;
  const ny = edgeDx / edgeLen;

  // Center the offsets: index 0 gets -(count-1)/2, last gets +(count-1)/2
  const offsetFactor = siblingCount > 1
    ? (siblingIndex - (siblingCount - 1) / 2) * SIBLING_SEPARATION
    : 0;

  // Curve control point: base midpoint + perpendicular offset
  const mx = (sp.x + tp.x) / 2 + nx * offsetFactor;
  const my = (sp.y + tp.y) / 2 + ny * offsetFactor;
  const path = `M${sp.x},${sp.y} Q${mx},${my} ${tp.x},${tp.y}`;

  const showAnimation = animateEdges !== 'off' && visual.animated;

  // In dynamic mode, derive animation speed from source entity TPS relative to maxTps.
  // Higher TPS → faster animation (shorter duration). Range: 0.5s (max TPS) to 4s (lowest/no TPS).
  const baseDur = visual.animationType === 'pulse' ? 2 : 3;
  let animDur = `${baseDur}s`;
  if (animateEdges === 'dynamic' && showAnimation) {
    const tps = sourceEntity.metadata.tps ?? 0;
    const ratio = maxTps > 0 ? tps / maxTps : 0;
    // Lerp between 4s (idle) and 0.5s (max throughput)
    const dur = 4 - ratio * 3.5;
    animDur = `${dur.toFixed(2)}s`;
  }

  return (
    <g
      className={`edge ${selected ? 'edge--selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(rel.id); }}
      onDoubleClick={(e) => { e.stopPropagation(); onEdit(rel.id); }}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`${rel.type} relationship: ${rel.label}, from ${sourceEntity.name} to ${targetEntity.name}${selected ? ' (selected)' : ''}`}
    >
      {/* Hit area (invisible wider path for easier clicking) */}
      <path d={path} fill="none" stroke="transparent" strokeWidth={14} />

      {/* Visible line */}
      <path
        d={path}
        fill="none"
        stroke={selected ? 'var(--canvas-edge-selected, #D63031)' : visual.stroke}
        strokeWidth={selected ? visual.strokeWidth + 1 : visual.strokeWidth}
        strokeDasharray={visual.dashArray}
        markerEnd="url(#arrowhead)"
        opacity={selected ? 1 : 0.7}
        style={{ transition: 'd 0.35s ease' }}
      />

      {/* Animated element */}
      {showAnimation && (
        <circle r={animateEdges === 'dynamic' ? Math.max(2, 2 + ((sourceEntity.metadata.tps ?? 0) / (maxTps || 1)) * 3) : 3} fill={visual.stroke} opacity={0.8}>
          <animateMotion dur={animDur} repeatCount="indefinite" path={path} />
        </circle>
      )}

      {/* Label — C4: description + [technology/protocol] on same line */}
      <text
        x={mx}
        y={my - 8}
        textAnchor="middle"
        fill="var(--canvas-text, #2D3436)"
        fontSize={10}
        fontWeight={selected ? 600 : 400}
        className="edge-label"
      >
        {rel.label}
      </text>

      {/* Technology/protocol on line below label */}
      {rel.protocol && (
        <text
          x={mx}
          y={my + 5}
          textAnchor="middle"
          fill="var(--canvas-text-secondary, #636E72)"
          fontSize={9}
          fontStyle="italic"
        >
          [{rel.protocol}]
        </text>
      )}
    </g>
  );
};

// Arrow marker (define once in SVG defs)
export const EdgeDefs: React.FC = () => (
  <defs>
    <marker
      id="arrowhead"
      viewBox="0 0 10 10"
      refX={8} refY={5}
      markerWidth={8} markerHeight={8}
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--canvas-edge-arrow, #636E72)" />
    </marker>
  </defs>
);
