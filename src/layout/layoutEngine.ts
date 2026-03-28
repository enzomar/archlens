import type { ArchEntity, Relationship, NodePosition, NodeDisplayMode, Viewpoint, ZoomLevel, EntityKind } from '../domain/types';
import { NODE_DIMENSIONS, NODE_DIMENSIONS_EXTENDED, KIND_TO_ZOOM } from '../domain/types';

// ─── LAYOUT DIRECTION ─────────────────────────────────────────────

export type LayoutDirection = 'TD' | 'LR';

/**
 * C4 / ArchiMate / Mermaid-inspired direction resolution:
 *  - Technical viewpoint      → LR  (infrastructure reads left → right: LB → App → DB)
 *  - Component / Code zoom    → LR  (module internals, like Mermaid `graph LR`)
 *  - Context / Container      → TD  (actors at top, systems below — classic C4)
 */
function resolveDirection(viewpoint?: Viewpoint, zoomLevel?: ZoomLevel): LayoutDirection {
  if (viewpoint === 'technical') return 'LR';
  if (zoomLevel === 'component' || zoomLevel === 'code') return 'LR';
  return 'TD';
}

/**
 * Zoom-adaptive spacing constants:
 *  - Context:   generous (few high-level actors / systems — need breathing room)
 *  - Container: standard C4 spacing
 *  - Component: tight (many fine-grained nodes, like a class diagram)
 *  - Code:      densest
 */
function resolveSpacing(zoomLevel?: ZoomLevel): {
  mainGap: number;   // gap between layers (Y in TD, X in LR)
  crossGap: number;  // gap between nodes within a layer (X in TD, Y in LR)
  padding: number;   // canvas-edge padding
  groupGap: number;  // extra gap between parent-group clusters
} {
  switch (zoomLevel) {
    case 'context':   return { mainGap: 140, crossGap: 100, padding: 100, groupGap: 60 };
    case 'container': return { mainGap: 100, crossGap: 70,  padding: 80,  groupGap: 40 };
    case 'component': return { mainGap: 80,  crossGap: 50,  padding: 60,  groupGap: 30 };
    case 'code':      return { mainGap: 60,  crossGap: 40,  padding: 50,  groupGap: 24 };
    default:          return { mainGap: 100, crossGap: 70,  padding: 80,  groupGap: 40 };
  }
}

// Padding used by the global (multi-viewpoint) layout
const PADDING = 80;

export type LayoutStrategy = 'nested' | 'flat' | 'pure-layers';

export interface EdgeRoute {
  relationshipId: string;
  points: Array<{ x: number; y: number }>;
}

export interface LayoutResult {
  positions: NodePosition[];
  edgeRoutes?: EdgeRoute[];
  strategy?: LayoutStrategy;
}

// Kind priority within a layer (lower number = placed first / leftmost / topmost)
const KIND_ORDER: Record<string, number> = {
  person:      0,
  trigger:     1,
  system:      2,
  container:   3,
  aimodel:     4,
  vectorstore: 5,
  component:   6,
  retriever:   7,
  evaluation:  8,
  artifact:    9,
};

/** External actor / initiator kinds — semantically pinned to layer 0 in Context and Container views */
const ACTOR_KINDS = new Set(['person', 'trigger']);

/**
 * Sugiyama-inspired hierarchical layout with C4 / ArchiMate / Mermaid adaptations.
 *
 * Direction (TD vs LR):
 *   Technical viewpoint or Component/Code zoom  →  Left-to-Right (Mermaid-style `graph LR`)
 *   All other viewpoint/zoom combinations       →  Top-Down (classic C4 context / container)
 *
 * Spacing scales with zoom level:
 *   Context: generous  |  Container: standard  |  Component: tight  |  Code: densest
 *
 * Semantic layer pinning:
 *   Context / Container zoom: person + trigger are forced to layer 0
 *   (external actors always at the periphery, matching C4 context diagram convention)
 *
 * Algorithm:
 *   1. Build directed graph from visible relationships
 *   2. Break cycles (DFS back-edge removal) → DAG
 *   3. Assign layers (Kahn's BFS longest-path)
 *   4. Semantic layer pinning (zoom-aware actor placement)
 *   5. Minimise edge crossings (barycenter heuristic, 3 sweeps)
 *   6. Assign pixel coordinates (TD or LR, centred, parent-groups clustered)
 *   7. Preserve locked node positions
 */
function computeSugiyamaLayout(
  entities: ArchEntity[],
  existingPositions: NodePosition[],
  displayMode: NodeDisplayMode = 'standard',
  relationships: Relationship[] = [],
  viewpoint?: Viewpoint,
  zoomLevel?: ZoomLevel,
): LayoutResult {
  const DIMS = displayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;
  const direction = resolveDirection(viewpoint, zoomLevel);
  const { mainGap, crossGap, padding, groupGap } = resolveSpacing(zoomLevel);

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

  // ── Step 3: Semantic layer pinning ───────────────────────────
  //
  // C4 Context / Container: person + trigger are external actors.
  // Force them to layer 0 so they appear at the top (TD) or left (LR),
  // creating the classic C4 "actors at periphery" pattern.
  // Non-actors that ended at layer 0 (isolated systems / containers) are
  // bumped to layer 1 so they appear below / after the actor row.
  if (zoomLevel === 'context' || zoomLevel === 'container') {
    const hasActors = unlocked.some((e) => ACTOR_KINDS.has(e.kind));
    if (hasActors) {
      for (const e of unlocked) {
        if (ACTOR_KINDS.has(e.kind)) layer.set(e.id, 0);
      }
      for (const e of unlocked) {
        if (!ACTOR_KINDS.has(e.kind) && layer.get(e.id) === 0) {
          layer.set(e.id, 1);
        }
      }
    }
  }

  // ── Step 4: Build layers array ───────────────────────────────

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
  barycenterSweep('down'); // third pass removes another 10-15 % of crossings

  // ── Step 6: Pixel coordinate assignment ─────────────────────
  //
  // Parent groups (nodes sharing a parentId) are clustered with an extra
  // `groupGap` between clusters to visually delineate container families.
  //
  // TD mode: layers are horizontal rows — nodes spread left → right.
  // LR mode: layers are vertical columns — nodes stack top → bottom.

  // Group-runs: consecutive siblings sharing the same parentId.
  function groupedRow(row: string[]): string[][] {
    const groups = new Map<string, string[]>();
    for (const id of row) {
      const pid = entityById.get(id)?.parentId;
      if (pid) {
        const arr = groups.get(pid);
        if (arr) arr.push(id);
        else groups.set(pid, [id]);
      }
    }
    const seen = new Set<string | null>();
    const runs: string[][] = [];
    for (const id of row) {
      const pid = entityById.get(id)?.parentId ?? null;
      if (seen.has(pid)) continue;
      seen.add(pid);
      if (pid && groups.has(pid)) runs.push(groups.get(pid)!);
      else if (!pid) runs.push([id]);
    }
    return runs;
  }

  // Total span of a layer in the CROSS dimension:
  //   TD mode → X span (sum of node widths + gaps)
  //   LR mode → Y span (sum of node heights + gaps)
  function layerCrossSpan(row: string[]): number {
    const runs = groupedRow(row);
    let span = 0;
    for (let r = 0; r < runs.length; r++) {
      const run = runs[r];
      for (let i = 0; i < run.length; i++) {
        const d = DIMS[entityById.get(run[i])?.kind ?? 'system'];
        span += direction === 'LR' ? d.height : d.width;
        if (i < run.length - 1) span += crossGap;
      }
      if (r < runs.length - 1) span += crossGap + groupGap;
    }
    return span;
  }

  const maxCrossSpan = Math.max(...layers.map(layerCrossSpan), 60);
  const canvasCrossCenter = padding + maxCrossSpan / 2;

  const positions: NodePosition[] = [...locked.values()];
  let mainOffset = padding;

  for (const row of layers) {
    const runs = groupedRow(row);
    const crossSpan = layerCrossSpan(row);

    // Max dimension in the MAIN direction (drives the step between layers):
    //   TD → max node height  |  LR → max node width
    let layerMainSize = 0;
    for (const id of row) {
      const d = DIMS[entityById.get(id)?.kind ?? 'system'];
      layerMainSize = Math.max(layerMainSize, direction === 'LR' ? d.width : d.height);
    }

    // Start position in the cross dimension, centred relative to the widest layer
    let cross = canvasCrossCenter - crossSpan / 2;

    for (let r = 0; r < runs.length; r++) {
      const run = runs[r];
      for (let i = 0; i < run.length; i++) {
        const id = run[i];
        if (locked.has(id)) continue;
        const entity = entityById.get(id)!;
        const d = DIMS[entity.kind];
        positions.push({
          entityId: id,
          x: direction === 'LR' ? mainOffset : cross,
          y: direction === 'LR' ? cross       : mainOffset,
          locked: false,
        });
        cross += (direction === 'LR' ? d.height : d.width) + crossGap;
      }
      if (r < runs.length - 1) cross += groupGap;
    }

    mainOffset += layerMainSize + mainGap;
  }

  return { positions };
}

// ─── ADAPTIVE MULTI-FILTER LAYOUT ────────────────────────────────────────────

// Swimlane layout constants
const SWIM_OUTER_PAD   = 60;
const SWIM_LANE_HEADER = 44;
const SWIM_LANE_PAD_X  = 50;
const SWIM_LANE_PAD_Y  = 36;
const SWIM_LANE_GAP    = 80;
const SWIM_GROUP_GAP_X = 60;
const SWIM_NODE_GAP_X  = 30;
const SWIM_NODE_GAP_Y  = 30;
const SWIM_INNER_PAD   = 16;

// Viewpoint display order for swimlanes
const SWIM_LANE_ORDER: Viewpoint[] = ['business', 'application', 'technical'];

/** Returns the visible hierarchy depth: 0 = flat, 1 = one parent level, 2 = two levels (capped). */
function detectHierarchyDepth(entities: ArchEntity[]): number {
  const idSet = new Set(entities.map((e) => e.id));
  const memo  = new Map<string, number>();
  function depthOf(id: string): number {
    if (memo.has(id)) return memo.get(id)!;
    const e = entities.find((x) => x.id === id);
    if (!e || !e.parentId || !idSet.has(e.parentId)) { memo.set(id, 0); return 0; }
    const d = 1 + depthOf(e.parentId);
    memo.set(id, d);
    return d;
  }
  let maxD = 0;
  for (const e of entities) maxD = Math.max(maxD, depthOf(e.id));
  return Math.min(maxD, 2);
}

/**
 * Layout a single cluster: optional root → children row → optional grandchildren.
 * Returns computed (x, y) for every node plus the cluster bounding box.
 */
function layoutCluster(
  root: ArchEntity | null,
  children: ArchEntity[],
  grandchildren: Map<string, ArchEntity[]>,
  startX: number,
  startY: number,
  DIMS: Record<EntityKind, { width: number; height: number }>,
  strategy: LayoutStrategy,
): { width: number; height: number; positions: Array<{ id: string; x: number; y: number }> } {
  const out: Array<{ id: string; x: number; y: number }> = [];

  // Compute per-child column widths (max of child width vs its grandchild row width)
  type Col = { ent: ArchEntity; colW: number; gcs: ArchEntity[] };
  const cols: Col[] = [];
  let childRowW = 0;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const cd = DIMS[child.kind];
    const gcs = (strategy === 'nested' ? grandchildren.get(child.id) : undefined) ?? [];
    let gcW = 0;
    for (let j = 0; j < gcs.length; j++) gcW += DIMS[gcs[j].kind].width + (j > 0 ? SWIM_NODE_GAP_X : 0);
    const colW = Math.max(cd.width, gcW);
    cols.push({ ent: child, colW, gcs });
    childRowW += colW + (i > 0 ? SWIM_NODE_GAP_X : 0);
  }

  const childAreaW = cols.length > 0 ? childRowW + SWIM_INNER_PAD * 2 : 0;
  const rootW      = root ? DIMS[root.kind].width : 0;
  const clusterW   = Math.max(rootW, childAreaW);
  let curY = startY;

  // Root centred at top of cluster
  if (root) {
    out.push({ id: root.id, x: startX + (clusterW - rootW) / 2, y: curY });
    curY += DIMS[root.kind].height + SWIM_NODE_GAP_Y;
  }

  // Children + grandchildren
  if (cols.length > 0) {
    let colX = startX + SWIM_INNER_PAD;
    let maxChildH = 0;
    let maxGcH    = 0;
    for (const col of cols) {
      const cd = DIMS[col.ent.kind];
      out.push({ id: col.ent.id, x: colX + (col.colW - cd.width) / 2, y: curY });
      maxChildH = Math.max(maxChildH, cd.height);
      if (col.gcs.length > 0) {
        let gcX = colX;
        const gcY = curY + cd.height + SWIM_NODE_GAP_Y;
        for (const gc of col.gcs) {
          out.push({ id: gc.id, x: gcX, y: gcY });
          gcX += DIMS[gc.kind].width + SWIM_NODE_GAP_X;
          maxGcH = Math.max(maxGcH, DIMS[gc.kind].height);
        }
      }
      colX += col.colW + SWIM_NODE_GAP_X;
    }
    curY += maxChildH + (maxGcH > 0 ? SWIM_NODE_GAP_Y + maxGcH : 0) + SWIM_INNER_PAD;
  }

  return { width: clusterW, height: curY - startY, positions: out };
}

/** Orthogonal (L-shaped) edge routing for positioned nodes. */
function routeEdgesOrthogonal(
  relationships: Relationship[],
  posMap: Map<string, { x: number; y: number; width: number; height: number }>,
  visibleIds: Set<string>,
): EdgeRoute[] {
  const routes: EdgeRoute[] = [];
  for (const rel of relationships) {
    if (!visibleIds.has(rel.sourceId) || !visibleIds.has(rel.targetId)) continue;
    const src = posMap.get(rel.sourceId);
    const tgt = posMap.get(rel.targetId);
    if (!src || !tgt) continue;
    const srcCX = src.x + src.width  / 2;
    const srcCY = src.y + src.height / 2;
    const tgtCX = tgt.x + tgt.width  / 2;
    const tgtCY = tgt.y + tgt.height / 2;
    if (Math.abs(tgtCY - srcCY) >= Math.abs(tgtCX - srcCX)) {
      // Vertically dominant: exit bottom/top, route via mid Y
      const sx = srcCX, tx = tgtCX;
      const sy = srcCY < tgtCY ? src.y + src.height : src.y;
      const ty = srcCY < tgtCY ? tgt.y : tgt.y + tgt.height;
      const midY = (sy + ty) / 2;
      routes.push({ relationshipId: rel.id, points: [{ x: sx, y: sy }, { x: sx, y: midY }, { x: tx, y: midY }, { x: tx, y: ty }] });
    } else {
      // Horizontally dominant: exit right/left, route via mid X
      const sy = srcCY, ty = tgtCY;
      const sx = srcCX < tgtCX ? src.x + src.width  : src.x;
      const tx = srcCX < tgtCX ? tgt.x               : tgt.x + tgt.width;
      const midX = (sx + tx) / 2;
      routes.push({ relationshipId: rel.id, points: [{ x: sx, y: sy }, { x: midX, y: sy }, { x: midX, y: ty }, { x: tx, y: ty }] });
    }
  }
  return routes;
}

/**
 * Adaptive swimlane layout for multi-filter views (multiple viewpoints or zoom levels).
 *
 * Lanes correspond to viewpoints stacked top-to-bottom: Business → Application → Technical.
 * Within each lane, related entities are grouped into clusters by their visible root parent.
 *
 * Strategy:
 *   nested     (hierarchy depth ≥ 2): root → children row → grandchildren
 *   flat       (hierarchy depth = 1): root → children row
 *   pure-layers (depth = 0):           flat row of ungrouped nodes per lane
 */
function computeAdaptiveLayout(
  entities: ArchEntity[],
  existingPositions: NodePosition[],
  displayMode: NodeDisplayMode,
  relationships: Relationship[],
  activeViewpoints: Viewpoint[],
  activeZoomLevels: ZoomLevel[],
): LayoutResult {
  const DIMS = displayMode === 'extended' ? NODE_DIMENSIONS_EXTENDED : NODE_DIMENSIONS;

  // Separate locked / unlocked
  const locked   = new Map<string, NodePosition>();
  const unlocked: ArchEntity[] = [];
  for (const entity of entities) {
    const pos = existingPositions.find((p) => p.entityId === entity.id);
    if (pos?.locked) locked.set(entity.id, pos);
    else             unlocked.push(entity);
  }
  if (unlocked.length === 0) return { positions: [...locked.values()] };

  // Cap nesting depth for fine-grained zoom levels (component/code → max 1 level)
  const isFineGrained = activeZoomLevels.length > 0 &&
    activeZoomLevels.every((z) => z === 'component' || z === 'code');
  const rawDepth = detectHierarchyDepth(unlocked);
  const depth    = isFineGrained ? Math.min(rawDepth, 1) : rawDepth;
  const strategy: LayoutStrategy = depth >= 2 ? 'nested' : depth >= 1 ? 'flat' : 'pure-layers';

  // Determine which lanes to render (selected viewpoints in display order)
  const effectiveLanes = SWIM_LANE_ORDER.filter((vp) =>
    activeViewpoints.includes(vp) || activeViewpoints.includes('global' as Viewpoint),
  );
  const lanes = effectiveLanes.length > 0 ? effectiveLanes : SWIM_LANE_ORDER;

  // Bucket entities into lanes; entities with no matching lane go to the first lane
  const laneMap = new Map<Viewpoint, ArchEntity[]>();
  for (const vp of lanes) laneMap.set(vp, []);
  for (const e of unlocked) {
    const vp = e.viewpoint as Viewpoint;
    laneMap.get(laneMap.has(vp) ? vp : lanes[0])!.push(e);
  }

  const idSet     = new Set(unlocked.map((e) => e.id));
  const positions: NodePosition[] = [...locked.values()];
  const posMap    = new Map<string, { x: number; y: number; width: number; height: number }>();
  let laneY = SWIM_OUTER_PAD;

  for (const vp of lanes) {
    const lane = laneMap.get(vp)!;
    laneY += SWIM_LANE_HEADER;
    if (lane.length === 0) { laneY += SWIM_LANE_GAP; continue; }

    const nodeAreaY = laneY + SWIM_LANE_PAD_Y;
    const laneIds   = new Set(lane.map((e) => e.id));

    // Cluster roots: entities with no same-lane visible parent
    const roots     = lane.filter((e) => !e.parentId || !laneIds.has(e.parentId));
    const clustered = new Set<string>();
    const clusters: Array<{
      root: ArchEntity | null;
      children: ArchEntity[];
      grandchildren: Map<string, ArchEntity[]>;
    }> = [];

    for (const root of roots) {
      clustered.add(root.id);
      const children = lane.filter((e) => e.parentId === root.id);
      const gcMap    = new Map<string, ArchEntity[]>();
      for (const child of children) {
        clustered.add(child.id);
        if (strategy === 'nested') {
          const gcs = lane.filter((e) => e.parentId === child.id);
          for (const gc of gcs) clustered.add(gc.id);
          gcMap.set(child.id, gcs);
        }
      }
      clusters.push({ root, children, grandchildren: gcMap });
    }

    // Orphaned entities (cross-lane parent or unmatched) form a flat trailing cluster
    const orphans = lane.filter((e) => !clustered.has(e.id));
    if (orphans.length > 0) clusters.push({ root: null, children: orphans, grandchildren: new Map() });

    // Place clusters left-to-right within the lane
    let clusterX = SWIM_OUTER_PAD + SWIM_LANE_PAD_X;
    let maxH     = 0;

    for (const cluster of clusters) {
      const { width, height, positions: cpos } = layoutCluster(
        cluster.root, cluster.children, cluster.grandchildren,
        clusterX, nodeAreaY, DIMS, strategy,
      );
      for (const { id, x, y } of cpos) {
        if (!locked.has(id)) {
          positions.push({ entityId: id, x, y, locked: false });
          const ent = unlocked.find((u) => u.id === id);
          if (ent) posMap.set(id, { x, y, width: DIMS[ent.kind].width, height: DIMS[ent.kind].height });
        }
      }
      clusterX += width + SWIM_GROUP_GAP_X;
      maxH = Math.max(maxH, height);
    }
    laneY = nodeAreaY + maxH + SWIM_LANE_PAD_Y + SWIM_LANE_GAP;
  }

  const edgeRoutes = routeEdgesOrthogonal(relationships, posMap, idSet);
  return { positions, edgeRoutes, strategy };
}

/**
 * Adaptive layout dispatcher.
 *
 * Single viewpoint + single zoom level → Sugiyama hierarchical layout (fast path).
 * Multiple viewpoints or zoom levels   → adaptive swimlane layout.
 */
export function computeLayout(
  entities: ArchEntity[],
  existingPositions: NodePosition[],
  displayMode: NodeDisplayMode = 'standard',
  relationships: Relationship[] = [],
  activeViewpoints: Viewpoint[] = [],
  activeZoomLevels: ZoomLevel[] = [],
): LayoutResult {
  if (activeViewpoints.length <= 1 && activeZoomLevels.length <= 1) {
    return computeSugiyamaLayout(
      entities, existingPositions, displayMode, relationships,
      activeViewpoints[0], activeZoomLevels[0],
    );
  }
  return computeAdaptiveLayout(
    entities, existingPositions, displayMode, relationships,
    activeViewpoints, activeZoomLevels,
  );
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
// Four C4 zoom levels — a 'code' column appears when code-level entities exist
const GLOBAL_LEVEL_ORDER: ZoomLevel[] = ['context', 'container', 'component', 'code'];

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
    // Prefer the entity's explicitly-set zoomLevel; fall back to kind inference
    const lv: ZoomLevel = (e.zoomLevel && GLOBAL_LEVEL_ORDER.includes(e.zoomLevel))
      ? e.zoomLevel
      : KIND_TO_ZOOM[e.kind];
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
