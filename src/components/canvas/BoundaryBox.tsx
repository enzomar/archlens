import React from 'react';
import type { DiagramBoundary } from '../../domain/types';

type ResizeHandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_CURSOR: Record<ResizeHandleType, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', e: 'e-resize',
  se: 'se-resize', s: 's-resize', sw: 'sw-resize', w: 'w-resize',
};

const HS = 8;  // handle size
const HW = 4;  // half handle

function getHandlePoints(w: number, h: number): { handle: ResizeHandleType; cx: number; cy: number }[] {
  return [
    { handle: 'nw', cx: 0,     cy: 0     },
    { handle: 'n',  cx: w / 2, cy: 0     },
    { handle: 'ne', cx: w,     cy: 0     },
    { handle: 'e',  cx: w,     cy: h / 2 },
    { handle: 'se', cx: w,     cy: h     },
    { handle: 's',  cx: w / 2, cy: h     },
    { handle: 'sw', cx: 0,     cy: h     },
    { handle: 'w',  cx: 0,     cy: h / 2 },
  ];
}

interface BoundaryBoxProps {
  boundary: DiagramBoundary;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string, startX: number, startY: number) => void;
  onResizeStart: (id: string, handle: ResizeHandleType, clientX: number, clientY: number) => void;
}

export const BoundaryBox: React.FC<BoundaryBoxProps> = ({
  boundary, selected, onSelect, onDragStart, onResizeStart,
}) => {
  const { x, y, width, height, style, label } = boundary;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(boundary.id);
    onDragStart(boundary.id, e.clientX, e.clientY);
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: 'pointer' }}
      onMouseDown={handleMouseDown}
      role="button"
      aria-label={`Boundary: ${label}`}
    >
      {/* Selection glow */}
      {selected && (
        <rect
          x={-4} y={-4}
          width={width + 8} height={height + 8}
          rx={8} fill="none"
          stroke={style.borderColor} strokeWidth={3} opacity={0.35}
        />
      )}

      {/* Boundary rectangle */}
      <rect
        x={0} y={0}
        width={width} height={height}
        rx={6} ry={6}
        fill={style.fillColor}
        stroke={style.borderColor}
        strokeWidth={2}
        strokeDasharray={style.borderDash}
      />

      {/* Label (top-left inside boundary) */}
      <text
        x={12}
        y={-6}
        fill={style.textColor}
        fontSize={style.fontSize}
        fontWeight={style.fontWeight}
      >
        {label}
      </text>

      {/* Resize handles (shown when selected) */}
      {selected && getHandlePoints(width, height).map(({ handle, cx, cy }) => (
        <rect
          key={handle}
          x={cx - HW} y={cy - HW}
          width={HS} height={HS}
          rx={1}
          fill="var(--surface, #fff)"
          stroke={style.borderColor}
          strokeWidth={1.5}
          style={{ cursor: HANDLE_CURSOR[handle] }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(boundary.id, handle, e.clientX, e.clientY);
          }}
        />
      ))}
    </g>
  );
};
