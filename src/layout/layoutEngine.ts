import type { ArchEntity, Relationship, NodePosition, NodeDisplayMode, Viewpoint, ZoomLevel } from '../domain/types';
import { NODE_DIMENSIONS, NODE_DIMENSIONS_EXTENDED, KIND_TO_ZOOM, CONCRETE_VIEWPOINTS } from '../domain/types';

const PADDING = 80;
const LAYER_GAP_Y = 100; // vertical gap between layers
const NODE_GAP_X  = 70;  // horizontal gap between nodes in the same layer

export interface LayoutResult {
  positions: NodePosition[];
}

// Preferred left-to-right visual order for same-kind grouping within a layer
const KIND_ORDER: Record<string, number> = {
  person:    0,
  trigger:   1,
  system:    2,
  container: 3,
  component: 4,
  artifact:  5,
};

/**
 * Hierarchical (Sugiyama-inspired) layout:
 *
 *  1. Build a directed graph from relationships.
 *  2. Detect and break cycles (DFS back-edge removal) to produce a DAG.
 *  3. Assign each node a layer using "longest path from source" (Kahn's BFS):
 *       - Pure sources (no incoming edges) → layer 0 (top)
 *       - Pure sinks (no outgoing edges)   → last layer (bottom)
 *  4. Minimize edge crossings using the barycenter heuristic (3 sweeps).
 *     Within a layer, nodes with the same kind are kept adjacent as a
 *     secondary sort criterion.
 *  5. Center every layer horizontally relative to the widest layer.
 *  6. Respect locked positions (locked nodes are never moved).
 */
export function computeLayout(
  entities: ArchEntity[],
  existingPositions: NodePosition[],
  displayMode: NodeDisplayMode = 'standard',
  relationships: Relationship[] = [],
): LayoutResult {
  const DIMS = displayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;

  // ── Separate locked vs unlocked ──────────────────────────────

  const locked = new Map<string, NodePosition>();
  const unlocked: ArchEntity[] = [];

  for (const entity of entities) {
    const pos = existingPositions.find((p) => p.entityId === entity.id);
    if (pos?.locked) {
      locked.set(entity.id, pos);
    } else {
      unlocked.push(entity);
    }
  }

  if (unlocked.length === 0) {
    return { positions: [...locked.values()] };
  }

  const entityById = new Map<string, ArchEntity>();
  for (const e of unlocked) entityById.set(e.id, e);
  const entityIds = new Set(unlocked.map((e) => e.id));

  // ── Build adjacency (only for visible, unlocked nodes) ───────

  const outAdj = new Map<string, Set<string>>();
  const inAdj  = new Map<string, Set<string>>();
  for (const e of unlocked) {
    outAdj.set(e.id, new Set());
    inAdj.set(e.id, new Set());
  }
  for (const rel of relationships) {
    if (
      entityIds.has(rel.sourceId) &&
      entityIds.has(rel.targetId) &&
      rel.sourceId !== rel.targetId
    ) {
      outAdj.get(rel.sourceId)!.add(rel.targetId);
      inAdj.get(rel.targetId)!.add(rel.sourceId);
    }
  }

  // ── Step 1: Cycle breaking via DFS back-edge detection ───────

  const backEdgeKeys = new Set<string>();
  const visited  = new Set<string>();
  const onStack  = new Set<string>();

  function dfsCycles(id: string) {
    if (onStack.has(id)) return;
    if (visited.has(id)) return;
    visited.add(id);
    onStack.add(id);
    for (const next of outAdj.get(id) ?? []) {
      if (onStack.has(next)) {
        backEdgeKeys.add(`${id}=>${next}`);
      } else {
        dfsCycles(next);
      }
    }
    onStack.delete(id);
  }
  for (const e of unlocked) dfsCycles(e.id);

  // DAG adjacency (back-edges removed)
  const dagOut = new Map<string, Set<string>>();
  const dagIn  = new Map<string, Set<string>>();
  for (const e of unlocked) {
    dagOut.set(e.id, new Set());
    dagIn.set(e.id, new Set());
  }
  for (const rel of relationships) {
    if (
      entityIds.has(rel.sourceId) &&
      entityIds.has(rel.targetId) &&
      rel.sourceId !== rel.targetId &&
      !backEdgeKeys.has(`${rel.sourceId}=>${rel.targetId}`)
    ) {
      dagOut.get(rel.sourceId)!.add(rel.targetId);
      dagIn.get(rel.targetId)!.add(rel.sourceId);
    }
  }

  // ── Step 2: Layer assignment (longest-path / Kahn's BFS) ─────

  const layer = new Map<string, number>();
  const inDegreeMap = new Map<string, number>();
  for (const e of unlocked) inDegreeMap.set(e.id, dagIn.get(e.id)!.size);

  const queue: string[] = [];
  for (const e of unlocked) {
    if (inDegreeMap.get(e.id) === 0) {
      queue.push(e.id);
      layer.set(e.id, 0);
    }
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const next of dagOut.get(id)!) {
      const newLayer = (layer.get(id) ?? 0) + 1;
      if ((layer.get(next) ?? -1) < newLayer) layer.set(next, newLayer);
      const remaining = inDegreeMap.get(next)! - 1;
      inDegreeMap.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }
  // Fallback: nodes not reached (cycle remnants)
  for (const e of unlocked) if (!layer.has(e.id)) layer.set(e.id, 0);

  // ── Step 3: Build layers array ───────────────────────────────

  const maxLayer = Math.max(...layer.values());
  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const e of unlocked) layers[layer.get(e.id)!].push(e.id);

  // Initial intra-layer order: by parentId first (groups siblings), then by kind
  for (const row of layers) {
    row.sort((a, b) => {
      const pa = entityById.get(a)?.parentId ?? '';
      const pb = entityById.get(b)?.parentId ?? '';
      if (pa !== pb) return pa < pb ? -1 : 1;
      const ka = KIND_ORDER[entityById.get(a)?.kind ?? ''] ?? 99;
      const kb = KIND_ORDER[entityById.get(b)?.kind ?? ''] ?? 99;
      return ka - kb;
    });
  }

  // ── Step 4: Crossing minimisation (barycenter, 3 sweeps) ─────

  // Normalised position within a layer (0 = leftmost, 1 = rightmost)
  const xRank = new Map<string, number>();

  function refreshRanks() {
    for (const row of layers) {
      const n = row.length;
      row.forEach((id, i) => xRank.set(id, n > 1 ? i / (n - 1) : 0.5));
    }
  }
  refreshRanks();

  function barycenterSweep(dir: 'down' | 'up') {
    const start = dir === 'down' ? 1 : layers.length - 2;
    const end   = dir === 'down' ? layers.length : -1;
    const step  = dir === 'down' ? 1 : -1;
    const adj   = dir === 'down' ? dagIn : dagOut;
    const offset = dir === 'down' ? -1 : 1;

    for (let l = start; l !== end; l += step) {
      const prevSet = new Set(layers[l + offset]);
      layers[l].sort((a, b) => {
        const baryOf = (id: string): number => {
          const nbrs = [...(adj.get(id) ?? [])].filter((nb) => prevSet.has(nb));
          if (nbrs.length === 0) return 99; // isolated: push right, tiebreak by kind
          return nbrs.reduce((s, nb) => s + (xRank.get(nb) ?? 0), 0) / nbrs.length;
        };
        const ba = baryOf(a);
        const bb = baryOf(b);
        if (Math.abs(ba - bb) > 1e-9) return ba - bb;
        // Tiebreak: keep same-kind grouped
        const ka = KIND_ORDER[entityById.get(a)?.kind ?? ''] ?? 99;
        const kb = KIND_ORDER[entityById.get(b)?.kind ?? ''] ?? 99;
        return ka - kb;
      });
      refreshRanks();
    }
  }

  barycenterSweep('down');
  barycenterSweep('up');
  barycenterSweep('down'); // third pass usually removes another 10-15 % of crossings

  // ── Step 5: Compute pixel coordinates ────────────────────────
  //
  // When entities share a parentId, cluster them into groups so the
  // parent-frame rendering wraps them neatly.  Groups are laid out
  // left-to-right within each layer, with extra spacing between groups.

  const GROUP_GAP = 40; // extra horizontal gap between parent groups

  // Build a list of "group runs" for each layer.  A group run is a
  // consecutive sequence of entity ids that share the same parentId.
  // Orphans (no parentId) each get their own run.
  function groupedRow(row: string[]): string[][] {
    // Separate entities into parent-groups + orphans, preserving order
    const groups = new Map<string, string[]>();
    const orphans: string[] = [];
    for (const id of row) {
      const e = entityById.get(id);
      const pid = e?.parentId;
      if (pid) {
        const arr = groups.get(pid);
        if (arr) arr.push(id);
        else groups.set(pid, [id]);
      } else {
        orphans.push(id);
      }
    }
    // Emit groups in the order of their first appearance in the row
    const seen = new Set<string | null>();
    const runs: string[][] = [];
    for (const id of row) {
      const pid = entityById.get(id)?.parentId ?? null;
      if (seen.has(pid)) continue;
      seen.add(pid);
      if (pid && groups.has(pid)) {
        runs.push(groups.get(pid)!);
      } else if (!pid) {
        runs.push([id]);
      }
    }
    return runs;
  }

  function layerPixelWidth(row: string[]): number {
    const runs = groupedRow(row);
    let w = 0;
    for (let r = 0; r < runs.length; r++) {
      const run = runs[r];
      for (let i = 0; i < run.length; i++) {
        w += DIMS[entityById.get(run[i])?.kind ?? 'system'].width;
        if (i < run.length - 1) w += NODE_GAP_X;
      }
      if (r < runs.length - 1) w += NODE_GAP_X + GROUP_GAP;
    }
    return w;
  }

  const maxWidth = Math.max(...layers.map(layerPixelWidth));
  const canvasCenterX = PADDING + maxWidth / 2;

  const positions: NodePosition[] = [...locked.values()];
  let currentY = PADDING;

  for (const row of layers) {
    const runs = groupedRow(row);
    const rowW = layerPixelWidth(row);
    let x = canvasCenterX - rowW / 2;
    let rowH = 0;

    for (let r = 0; r < runs.length; r++) {
      const run = runs[r];
      for (let i = 0; i < run.length; i++) {
        const id = run[i];
        if (locked.has(id)) continue;
        const entity = entityById.get(id)!;
        const dims = DIMS[entity.kind];
        positions.push({ entityId: id, x, y: currentY, locked: false });
        x += dims.width + NODE_GAP_X;
        rowH = Math.max(rowH, dims.height);
      }
      if (r < runs.length - 1) x += GROUP_GAP;
    }

    currentY += rowH + LAYER_GAP_Y;
  }

  return { positions };
}

/**
 * Center the layout around a specific entity.
 * Returns pan offset.
 */
export function centerOnEntity(
  entityId: string,
  positions: NodePosition[],
  entities: ArchEntity[],
  viewportWidth: number,
  viewportHeight: number,
): { panX: number; panY: number } {
  const pos = positions.find((p) => p.entityId === entityId);
  const entity = entities.find((e) => e.id === entityId);
  if (!pos || !entity) return { panX: 0, panY: 0 };

  const dims = NODE_DIMENSIONS[entity.kind];
  const centerX = pos.x + dims.width / 2;
  const centerY = pos.y + dims.height / 2;

  return {
    panX: viewportWidth / 2 - centerX,
    panY: viewportHeight / 2 - centerY,
  };
}

// ─── GLOBAL FULL-VIEW LAYOUT ──────────────────────────────────────
// ArchiMate-style: rows = viewpoints (Business top → Application mid → Technical bottom),
// columns = C4 levels (context, container, component).
// Within each cell, entities are laid out left-to-right grouped by parent.

const GLOBAL_VP_ORDER: Viewpoint[] = ['business', 'application', 'technical'];
const GLOBAL_LEVEL_ORDER: ZoomLevel[] = ['context', 'container', 'component'];

export interface GlobalLayoutResult {
  positions: NodePosition[];
  /** Bounding rectangles for each viewpoint swim-lane (horizontal row) */
  vpLanes: { viewpoint: Viewpoint; x: number; y: number; width: number; height: number }[];
  /** Bounding rectangles for each C4 level column */
  levelRows: { level: ZoomLevel; x: number; y: number; width: number; height: number }[];
}

export function computeGlobalLayout(
  entities: ArchEntity[],
  existingPositions: NodePosition[],
  displayMode: NodeDisplayMode = 'standard',
): GlobalLayoutResult {
  const DIMS = displayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;
  const ROW_GAP = 100;  // gap between viewpoint rows
  const COL_GAP = 80;   // gap between level columns
  const CELL_PAD = 50;  // padding inside each cell
  const INTRA_GAP = 30; // gap between nodes in same cell
  const LEVEL_HEADER = 40;  // space for level header at top
  const VP_LABEL_WIDTH = 60; // space for viewpoint label on left

  // locked positions
  const locked = new Map<string, NodePosition>();
  for (const e of entities) {
    const pos = existingPositions.find((p) => p.entityId === e.id);
    if (pos?.locked) locked.set(e.id, pos);
  }

  // Bucket entities into (viewpoint, level)
  type Cell = ArchEntity[];
  const grid = new Map<string, Cell>();
  const cellKey = (vp: Viewpoint, lv: ZoomLevel) => `${vp}::${lv}`;

  for (const vp of GLOBAL_VP_ORDER) {
    for (const lv of GLOBAL_LEVEL_ORDER) {
      grid.set(cellKey(vp, lv), []);
    }
  }

  for (const e of entities) {
    const lv = KIND_TO_ZOOM[e.kind];
    if (!GLOBAL_LEVEL_ORDER.includes(lv)) continue;
    const vp = e.viewpoint;
    if (!GLOBAL_VP_ORDER.includes(vp as Viewpoint)) continue;
    const key = cellKey(vp, lv);
    grid.get(key)?.push(e);
  }

  // Compute cell dimensions: each cell is a vertical strip of nodes
  const cellDims = new Map<string, { w: number; h: number }>();
  for (const [key, cell] of grid) {
    let w = 0;
    let h = 0;
    for (let i = 0; i < cell.length; i++) {
      const d = DIMS[cell[i].kind] ?? { width: 120, height: 60 };
      w = Math.max(w, d.width);
      h += d.height + (i > 0 ? INTRA_GAP : 0);
    }
    cellDims.set(key, { w: w + CELL_PAD * 2, h: h + CELL_PAD * 2 });
  }

  // Column widths = max cell width per level (levels are columns now)
  const colWidths = new Map<ZoomLevel, number>();
  for (const lv of GLOBAL_LEVEL_ORDER) {
    let maxW = 200; // minimum column width
    for (const vp of GLOBAL_VP_ORDER) {
      const d = cellDims.get(cellKey(vp, lv))!;
      maxW = Math.max(maxW, d.w);
    }
    colWidths.set(lv, maxW);
  }

  // Row heights = max cell height per viewpoint (viewpoints are rows now)
  const rowHeights = new Map<Viewpoint, number>();
  for (const vp of GLOBAL_VP_ORDER) {
    let maxH = 100; // minimum row height
    for (const lv of GLOBAL_LEVEL_ORDER) {
      const d = cellDims.get(cellKey(vp, lv))!;
      maxH = Math.max(maxH, d.h);
    }
    rowHeights.set(vp, maxH);
  }

  // Compute column x-offsets (levels) and row y-offsets (viewpoints)
  const colX = new Map<ZoomLevel, number>();
  let cx = PADDING + VP_LABEL_WIDTH;
  for (const lv of GLOBAL_LEVEL_ORDER) {
    colX.set(lv, cx);
    cx += colWidths.get(lv)! + COL_GAP;
  }
  const totalWidth = cx - COL_GAP + PADDING;

  const rowY = new Map<Viewpoint, number>();
  let ry = PADDING + LEVEL_HEADER;
  for (const vp of GLOBAL_VP_ORDER) {
    rowY.set(vp, ry);
    ry += rowHeights.get(vp)! + ROW_GAP;
  }
  const totalHeight = ry - ROW_GAP + PADDING;

  // Place entities within their cells
  const positions: NodePosition[] = [...locked.values()];

  for (const vp of GLOBAL_VP_ORDER) {
    for (const lv of GLOBAL_LEVEL_ORDER) {
      const cell = grid.get(cellKey(vp, lv))!;
      if (cell.length === 0) continue;

      const cellX = colX.get(lv)!;
      const cellY = rowY.get(vp)! + CELL_PAD;
      const cellW = colWidths.get(lv)!;

      // Center nodes horizontally within the cell, stack vertically
      let nodeY = cellY;
      for (const e of cell) {
        if (locked.has(e.id)) continue;
        const d = DIMS[e.kind] ?? { width: 120, height: 60 };
        const nodeX = cellX + (cellW - d.width) / 2;
        positions.push({ entityId: e.id, x: nodeX, y: nodeY, locked: false });
        nodeY += d.height + INTRA_GAP;
      }
    }
  }

  // Build lane & row metadata
  // vpLanes are now horizontal rows (viewpoint swim-lanes)
  const vpLanes = GLOBAL_VP_ORDER.map((vp) => ({
    viewpoint: vp,
    x: PADDING,
    y: rowY.get(vp)!,
    width: totalWidth - PADDING * 2,
    height: rowHeights.get(vp)!,
  }));

  // levelRows are now vertical columns
  const levelRows = GLOBAL_LEVEL_ORDER.map((lv) => ({
    level: lv,
    x: colX.get(lv)!,
    y: PADDING,
    width: colWidths.get(lv)!,
    height: totalHeight - PADDING * 2,
  }));

  return { positions, vpLanes, levelRows };
}
