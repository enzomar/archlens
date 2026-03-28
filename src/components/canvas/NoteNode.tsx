import React from 'react';
import type { DiagramNote, NodePosition } from '../../domain/types';

type ResizeHandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_CURSOR: Record<ResizeHandleType, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', e: 'e-resize',
  se: 'se-resize', s: 's-resize', sw: 'sw-resize', w: 'w-resize',
};

const HS = 8;
const HW = 4;

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

interface NoteNodeProps {
  note: DiagramNote;
  attachedPos?: NodePosition;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string, startX: number, startY: number) => void;
  onResizeStart: (id: string, handle: ResizeHandleType, clientX: number, clientY: number) => void;
}

export const NoteNode: React.FC<NoteNodeProps> = ({
  note, attachedPos, selected, onSelect, onDragStart, onResizeStart,
}) => {
  const { x, y, width, height, style } = note;
  const fold = 14;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(note.id);
    onDragStart(note.id, e.clientX, e.clientY);
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: 'pointer' }}
      onMouseDown={handleMouseDown}
      role="button"
      aria-label={`Note: ${note.text.slice(0, 40)}`}
    >
      {/* Connector line to attached entity */}
      {attachedPos && (
        <line
          x1={width / 2}
          y1={height / 2}
          x2={attachedPos.x + 80 - x}
          y2={attachedPos.y + 40 - y}
          stroke={style.borderColor}
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.5}
        />
      )}

      {/* Selection glow */}
      {selected && (
        <rect
          x={-4} y={-4}
          width={width + 8} height={height + 8}
          rx={4} fill="none"
          stroke={style.borderColor} strokeWidth={2.5} opacity={0.4}
        />
      )}

      {/* Note shape (folded corner) */}
      <path
        d={`M0,0 L${width - fold},0 L${width},${fold} L${width},${height} L0,${height} Z`}
        fill={style.fillColor}
        stroke={style.borderColor}
        strokeWidth={1.5}
      />
      <path
        d={`M${width - fold},0 L${width - fold},${fold} L${width},${fold}`}
        fill="none"
        stroke={style.borderColor}
        strokeWidth={1}
        opacity={0.5}
      />

      {/* Text content */}
      <foreignObject x={6} y={6} width={width - 12} height={height - 12}>
        <div
          style={{
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            color: style.textColor,
            lineHeight: '1.4',
            overflow: 'hidden',
            wordBreak: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: Math.floor((height - 12) / (style.fontSize * 1.4)),
            WebkitBoxOrient: 'vertical' as const,
          }}
        >
          {note.text}
        </div>
      </foreignObject>

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
            onResizeStart(note.id, handle, e.clientX, e.clientY);
          }}
        />
      ))}
    </g>
  );
};
