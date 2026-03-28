// ─── CORE ENUMERATIONS ───────────────────────────────────────────

export type EntityKind = 'person' | 'system' | 'container' | 'component' | 'artifact' | 'trigger' | 'aimodel' | 'vectorstore' | 'retriever' | 'evaluation';

export type Maturity = 'INTRO' | 'GROW' | 'MATURE' | 'DECLINE' | 'DEV';

export type TShirtSize = 'S' | 'M' | 'L' | 'XL';

export type AppType = 'CNQ' | 'OBE' | 'WEB' | 'FaaS' | 'Other';

export type DeploymentStage = 'LOCAL' | 'TESTING' | 'PRODUCTION';

export type TechConvergency = 1 | 2 | 3;

export type PredefinedTag =
  | 'EDA' | 'SOA' | 'REST' | 'EDI' | 'BATCH' | 'OLTP'
  | 'R/O' | 'RDMS' | 'NoSQL' | 'Stateless'
  | 'Java' | 'C/C++' | 'Python' | 'GO'
  | 'BigData' | 'ML' | 'FastData' | 'PII';

export type EdgeType = 'sync' | 'async' | 'dataflow' | 'dependency' | 'trigger' | 'retrieves' | 'augments' | 'generates' | 'retrieves_from' | 'queries_model' | 'evaluates';

// ─── VIEWPOINTS ──────────────────────────────────────────────────

export type Viewpoint = 'business' | 'application' | 'technical' | 'global';

export const ALL_VIEWPOINTS: Viewpoint[] = ['business', 'application', 'technical', 'global'];

/** The three concrete viewpoints (excludes the synthetic 'global' aggregate). */
export const CONCRETE_VIEWPOINTS: Viewpoint[] = ['business', 'application', 'technical'];

export type ZoomLevel = 'context' | 'container' | 'component' | 'code';

/**
 * Controls how many hierarchy levels are visible at once.
 * - 'focused': only the current zoom level (default behaviour).
 * - 'inclusive': current level + all parent levels (e.g. at container, also show context entities).
 * - 'full': every entity is rendered, each nested inside its parent frame.
 */
export type DiagramMode = 'focused' | 'inclusive' | 'full';

export const ALL_PREDEFINED_TAGS: PredefinedTag[] = [
  'EDA', 'SOA', 'REST', 'EDI', 'BATCH', 'OLTP',
  'R/O', 'RDMS', 'NoSQL', 'Stateless',
  'Java', 'C/C++', 'Python', 'GO',
  'BigData', 'ML', 'FastData', 'PII',
];

export const ALL_ENTITY_KINDS: EntityKind[] = ['person', 'system', 'container', 'component', 'artifact', 'trigger', 'aimodel', 'vectorstore', 'retriever', 'evaluation'];
export const ALL_MATURITIES: Maturity[] = ['INTRO', 'GROW', 'MATURE', 'DECLINE', 'DEV'];
export const ALL_TSHIRT_SIZES: TShirtSize[] = ['S', 'M', 'L', 'XL'];
export const ALL_APP_TYPES: AppType[] = ['CNQ', 'OBE', 'WEB', 'FaaS', 'Other'];
export const ALL_DEPLOYMENT_STAGES: DeploymentStage[] = ['LOCAL', 'TESTING', 'PRODUCTION'];
export const ALL_EDGE_TYPES: EdgeType[] = ['sync', 'async', 'dataflow', 'dependency', 'trigger', 'retrieves', 'augments', 'generates', 'retrieves_from', 'queries_model', 'evaluates'];
export const ALL_ZOOM_LEVELS: ZoomLevel[] = ['context', 'container', 'component', 'code'];

/** Ordered from coarsest to finest — used for inclusive-mode accumulation. */
export const ZOOM_LEVEL_ORDER: ZoomLevel[] = ['context', 'container', 'component', 'code'];

// ─── ENTITY METADATA ─────────────────────────────────────────────

export interface EntityMetadata {
  maturity?: Maturity;
  size?: TShirtSize;
  appType?: AppType;
  deploymentStage?: DeploymentStage;
  techConvergency?: TechConvergency;
  tags: PredefinedTag[];
  technology?: string;
  owner?: string;
  url?: string;
  notes?: string;
  tps?: number;
  compute?: TShirtSize;
  codeRepository?: string;
  pii?: boolean;
  pciDss?: boolean;
  adrUrl?: string;
}

// ─── RELATIONSHIP ────────────────────────────────────────────────

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  label: string;
  protocol?: string;
  description?: string;
}

// ─── ENTITY ──────────────────────────────────────────────────────

export interface ArchEntity {
  id: string;
  name: string;
  shortName: string;
  identificationId?: string;
  description: string;
  parentName?: string;
  kind: EntityKind;
  /** The viewpoint this entity instance belongs to. */
  viewpoint: Viewpoint;
  parentId: string | null;
  metadata: EntityMetadata;
  responsibilities: string[];
}

// ─── TRACEABILITY LINK ───────────────────────────────────────────
// Links two entity instances of the same concept across viewpoints.

export type TraceabilityType = 'represents' | 'implements';

export interface TraceabilityLink {
  id: string;
  sourceId: string;
  targetId: string;
  type: TraceabilityType;
  label?: string;
}

// ─── LAYOUT POSITION ─────────────────────────────────────────────

export interface NodePosition {
  entityId: string;
  x: number;
  y: number;
  locked: boolean;
}

// ─── DIAGRAM NOTE ────────────────────────────────────────────────

export interface NoteStyle {
  fillColor: string;
  borderColor: string;
  textColor: string;
  fontSize: number;
  fontWeight: number;
}

export const DEFAULT_NOTE_STYLE: NoteStyle = {
  fillColor: '#FFF9C4',
  borderColor: '#F9A825',
  textColor: '#333333',
  fontSize: 12,
  fontWeight: 400,
};

export interface DiagramNote {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  attachedToId: string | null; // entity id or null for free-floating
  style: NoteStyle;
}

// ─── DIAGRAM BOUNDARY ────────────────────────────────────────────

export interface BoundaryStyle {
  fillColor: string;
  borderColor: string;
  borderDash: string;
  textColor: string;
  fontSize: number;
  fontWeight: number;
}

export const DEFAULT_BOUNDARY_STYLE: BoundaryStyle = {
  fillColor: '#E3F2FD20',
  borderColor: '#1565C0',
  borderDash: '8 4',
  textColor: '#1565C0',
  fontSize: 14,
  fontWeight: 600,
};

export interface DiagramBoundary {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: BoundaryStyle;
}

// ─── SAVED VIEW ──────────────────────────────────────────────────

export interface SavedView {
  id: string;
  name: string;
  zoomLevel: ZoomLevel;
  focusEntityId: string | null;
  filters: ViewFilters;
}

export interface ViewFilters {
  kinds?: EntityKind[];
  maturities?: Maturity[];
  tags?: PredefinedTag[];
  deploymentStages?: DeploymentStage[];
}

// ─── PROJECT FILE FORMAT ─────────────────────────────────────────

export interface ArchLensProject {
  version: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  // v2 format: per-tab isolated diagrams
  tabs?: DiagramTab[];
  activeTabId?: string | null;
  // v1 backward-compat fields (flat / single-diagram format)
  entities?: ArchEntity[];
  relationships?: Relationship[];
  positions?: NodePosition[];
  views?: SavedView[];
  notes?: DiagramNote[];
  boundaries?: DiagramBoundary[];
  traceabilityLinks?: TraceabilityLink[];
}

// ─── VISUAL CONFIG ───────────────────────────────────────────────

export type EdgeAnimationMode = 'off' | 'on' | 'dynamic';

export type NodeDisplayMode = 'standard' | 'extended';

export interface VisualConfig {
  colorBy: 'kind' | 'maturity' | 'viewpoint';
  animateEdges: EdgeAnimationMode;
  nodeDisplayMode: NodeDisplayMode;
  showGrid: boolean;
  snapToGrid: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';

// ─── DIAGRAM TAB ─────────────────────────────────────────────────
// A DiagramTab is a fully-isolated C4 diagram. It stores all diagram
// data (entities, relationships, positions, notes, boundaries, views)
// plus all navigation/display state. The global Zustand store mirrors
// the active tab's data into its top-level fields for zero-change
// component compatibility; switchTab saves/restores everything here.

export interface DiagramTab {
  id: string;
  name: string;
  // Diagram data
  entities: ArchEntity[];
  relationships: Relationship[];
  positions: NodePosition[];
  notes: DiagramNote[];
  boundaries: DiagramBoundary[];
  traceabilityLinks: TraceabilityLink[];
  views: SavedView[];
  // Navigation
  zoomLevel: ZoomLevel;
  viewpoint: Viewpoint;
  focusEntityId: string | null;
  breadcrumb: { id: string; name: string; level: ZoomLevel }[];
  diagramMode: DiagramMode;
  panX: number;
  panY: number;
  scale: number;
  // Filters & display
  filters: ViewFilters;
  visualConfig: VisualConfig;
  // Selection
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  selectedNoteId: string | null;
  selectedBoundaryId: string | null;
}

// ─── KIND MATRIX (SOURCE OF TRUTH) ───────────────────────────────
// Maps every (level, viewpoint) pair to the entity kinds that are valid
// in that combination. This is the canonical definition of the modeling
// language — palette, validation, and rendering all derive from it.

export interface KindMatrixEntry {
  kind: EntityKind;
  level: ZoomLevel;
  viewpoints: Viewpoint[];
  category: 'core' | 'ai' | 'support';
}

export const KIND_MATRIX: KindMatrixEntry[] = [
  // ── System Level ──
  { kind: 'person',      level: 'context',   viewpoints: ['business'],                   category: 'core' },
  { kind: 'system',      level: 'context',   viewpoints: ['application'],                category: 'core' },
  // ── Container Level ──
  { kind: 'container',   level: 'container',  viewpoints: ['application', 'technical'],  category: 'core' },
  { kind: 'aimodel',     level: 'container',  viewpoints: ['application', 'technical'],  category: 'ai' },
  { kind: 'vectorstore', level: 'container',  viewpoints: ['technical'],                 category: 'ai' },
  // ── Component Level ──
  { kind: 'component',   level: 'component',  viewpoints: ['application', 'technical'],  category: 'core' },
  { kind: 'retriever',   level: 'component',  viewpoints: ['application', 'technical'],  category: 'ai' },
  { kind: 'evaluation',  level: 'component',  viewpoints: ['application', 'business'],   category: 'ai' },
  // ── Cross-Level Support ──
  { kind: 'trigger',     level: 'context',   viewpoints: ['business', 'application', 'technical'], category: 'support' },
  { kind: 'artifact',    level: 'component', viewpoints: ['application', 'technical'],   category: 'support' },
];

/**
 * Returns the entity kinds that are valid for a given (viewpoint, level) pair.
 * Support nodes (trigger, artifact) that are allowed at all levels are always
 * included when their viewpoints match.
 */
export function getKindsForViewpointLevel(viewpoint: Viewpoint, level: ZoomLevel): EntityKind[] {
  const kinds: EntityKind[] = [];
  for (const entry of KIND_MATRIX) {
    // Global viewpoint: include kinds from ALL concrete viewpoints
    if (viewpoint !== 'global' && !entry.viewpoints.includes(viewpoint)) continue;
    if (entry.category === 'support') {
      // Support nodes are cross-level: always available when viewpoint matches
      kinds.push(entry.kind);
    } else if (entry.level === level) {
      kinds.push(entry.kind);
    }
  }
  return kinds;
}

/**
 * Returns ALL viewpoints in which the given kind is allowed at the given level.
 */
export function getViewpointsForKindLevel(kind: EntityKind, level: ZoomLevel): Viewpoint[] {
  for (const entry of KIND_MATRIX) {
    if (entry.kind === kind) {
      if (entry.category === 'support' || entry.level === level) {
        return entry.viewpoints;
      }
    }
  }
  return [];
}

/**
 * Returns the default viewpoint for a kind — used for migration when
 * a node has no viewpoint assigned.
 */
export function inferViewpoint(kind: EntityKind): Viewpoint {
  const entry = KIND_MATRIX.find((e) => e.kind === kind);
  if (!entry) return 'application';
  if (entry.viewpoints.includes('application')) return 'application';
  return entry.viewpoints[0];
}

// ─── ENTITY KIND → ZOOM LEVEL MAPPING ────────────────────────────

export const KIND_TO_ZOOM: Record<EntityKind, ZoomLevel> = {
  person: 'context',
  system: 'context',
  container: 'container',
  component: 'component',
  artifact: 'component',
  trigger: 'context',
  aimodel: 'container',
  vectorstore: 'container',
  retriever: 'component',
  evaluation: 'component',
};

/**
 * Which entity kinds can be drilled into, and which zoom level they open.
 * Exported so UI components (EntityNode, DetailPanel) derive drillability
 * from a single source of truth instead of hardcoding kind strings.
 */
export const DRILLABLE_KINDS: Partial<Record<EntityKind, ZoomLevel>> = {
  system: 'container',
  container: 'component',
  component: 'code',
  aimodel: 'component',
};

// ─── ZOOM LEVEL → VALID ENTITY KINDS ───────────────────────────
export const ZOOM_VISIBLE_KINDS: Record<ZoomLevel, EntityKind[]> = {
  context:   ['person', 'system', 'trigger', 'artifact'],
  container: ['person', 'system', 'container', 'trigger', 'artifact', 'aimodel', 'vectorstore'],
  component: ['person', 'container', 'component', 'trigger', 'artifact', 'retriever', 'evaluation'],
  code:      ['component', 'artifact'],
};

// ─── COLOR PALETTES ──────────────────────────────────────────────
// These map to CSS custom properties defined in App.css.
// In SVG context, we read them from getComputedStyle at render time
// or fall back to these defaults.

export const KIND_COLORS: Record<EntityKind, string> = {
  person: 'var(--kind-person, #5B8DEF)',
  system: 'var(--kind-system, #6C5CE7)',
  container: 'var(--kind-container, #00B894)',
  component: 'var(--kind-component, #FDCB6E)',
  artifact: 'var(--kind-artifact, #E17055)',
  trigger: 'var(--kind-trigger, #FD79A8)',
  aimodel: 'var(--kind-aimodel, #7C3AED)',
  vectorstore: 'var(--kind-vectorstore, #0EA5E9)',
  retriever: 'var(--kind-retriever, #8B5CF6)',
  evaluation: 'var(--kind-evaluation, #F59E0B)',
};

export const MATURITY_COLORS: Record<Maturity, string> = {
  DEV: 'var(--maturity-dev, #A29BFE)',
  INTRO: 'var(--maturity-intro, #74B9FF)',
  GROW: 'var(--maturity-grow, #55EFC4)',
  MATURE: 'var(--maturity-mature, #FFEAA7)',
  DECLINE: 'var(--maturity-decline, #FAB1A0)',
};

// ─── VIEWPOINT COLORS ────────────────────────────────────────────

export const VIEWPOINT_COLORS: Record<Viewpoint, string> = {
  business:    'var(--viewpoint-business, #F59E0B)',
  application: 'var(--viewpoint-application, #3B82F6)',
  technical:   'var(--viewpoint-technical, #10B981)',
  global:      'var(--viewpoint-global, #8B5CF6)',
};

export const VIEWPOINT_LABELS: Record<Viewpoint, string> = {
  business: 'Business',
  application: 'Application',
  technical: 'Technical',
  global: 'Global',
};

// ─── FIELD HELP DESCRIPTIONS ─────────────────────────────────────

export const FIELD_HELP: Record<string, string> = {
  kind: 'The C4 model element type: Person (user/actor), System (top-level software), Container (deployable unit), Component (module within a container), Artifact (document/spec), Trigger (event), AI Model (LLM/ML inference), Vector Store (embeddings database), Retriever (RAG search layer), or Evaluation (feedback/scoring).',
  name: 'The full display name of this entity. Shown on the diagram and in all references.',
  shortName: 'A short abbreviated name (e.g. "OrdSvc"). Used on the diagram node when space is limited.',
  identificationId: 'A human-readable identifier for cross-referencing (e.g. "SYS-001", "COMP-042"). Not the internal UUID.',
  description: 'An optional text description of what this entity does, its purpose, and scope.',
  parentName: 'A human-readable label for the parent context (e.g. "Finance Domain"). Informational only — the actual parent is set via the Parent dropdown.',
  parent: 'The structural parent in the C4 model hierarchy. Containers belong to Systems, Components belong to Containers.',
  responsibilities: 'A list of key responsibilities this entity fulfills. Each item should be a concise statement.',
  maturity: 'Lifecycle stage: DEV (in development), INTRO (just introduced), GROW (scaling up), MATURE (stable), DECLINE (being phased out).',
  size: 'Business size estimate as a T-shirt size (S / M / L / XL). Represents relative scope or complexity.',
  appType: 'Application archetype: CNQ (Conquer/batch), OBE (Online Backend), WEB (Web-facing), FaaS (Function-as-a-Service), Other.',
  deployment: 'Current deployment stage: LOCAL (dev machine), TESTING (staging/QA), PRODUCTION (live).',
  technology: 'Primary technology stack (e.g. "Java / Spring Boot", "React / TypeScript").',
  techConvergency: "How well this entity aligns with the org's standard tech stack. 1 = Low, 2 = Medium, 3 = High.",
  tps: 'Transactions Per Second — the expected or measured throughput of this entity.',
  compute: 'Compute resource allocation as a T-shirt size (S / M / L / XL).',
  codeRepository: 'URL or path to the source code repository (e.g. a GitHub URL).',
  pii: 'Personally Identifiable Information — check if this entity processes or stores PII data.',
  pciDss: 'PCI-DSS compliance — check if this entity is subject to Payment Card Industry Data Security Standards.',
  owner: 'The team or person responsible for this entity.',
  tags: 'Predefined categorical tags for filtering and classification.',
  notes: 'Free-form notes and additional context.',
};

// ─── EDGE VISUAL CONFIG ─────────────────────────────────────────

export interface EdgeVisual {
  stroke: string;
  strokeWidth: number;
  dashArray?: string;
  animated: boolean;
  animationType?: 'pulse' | 'flow' | 'burst';
}

export const EDGE_VISUALS: Record<EdgeType, EdgeVisual> = {
  sync: { stroke: 'var(--canvas-edge-arrow, #636E72)', strokeWidth: 2, animated: true, animationType: 'pulse' },
  async: { stroke: 'var(--canvas-link, #0984E3)', strokeWidth: 2, dashArray: '8 4', animated: true, animationType: 'flow' },
  dataflow: { stroke: 'var(--kind-system, #6C5CE7)', strokeWidth: 3, animated: true, animationType: 'flow' },
  dependency: { stroke: 'var(--canvas-text-muted, #B2BEC3)', strokeWidth: 1.5, dashArray: '4 2', animated: false },
  trigger: { stroke: 'var(--kind-trigger, #FD79A8)', strokeWidth: 2, dashArray: '2 4', animated: true, animationType: 'burst' },
  retrieves: { stroke: 'var(--kind-retriever, #8B5CF6)', strokeWidth: 2, dashArray: '6 3', animated: true, animationType: 'flow' },
  augments: { stroke: 'var(--kind-aimodel, #7C3AED)', strokeWidth: 2, dashArray: '10 4', animated: true, animationType: 'flow' },
  generates: { stroke: 'var(--kind-aimodel, #7C3AED)', strokeWidth: 2.5, animated: true, animationType: 'pulse' },
  retrieves_from: { stroke: 'var(--kind-retriever, #8B5CF6)', strokeWidth: 2, dashArray: '6 3', animated: true, animationType: 'flow' },
  queries_model: { stroke: 'var(--kind-aimodel, #7C3AED)', strokeWidth: 2, dashArray: '8 4', animated: true, animationType: 'pulse' },
  evaluates: { stroke: 'var(--kind-evaluation, #F59E0B)', strokeWidth: 2, dashArray: '5 3', animated: true, animationType: 'flow' },
};

// ─── NODE DIMENSIONS ─────────────────────────────────────────────

export const NODE_DIMENSIONS: Record<EntityKind, { width: number; height: number }> = {
  person: { width: 160, height: 110 },
  system: { width: 220, height: 160 },
  container: { width: 200, height: 140 },
  component: { width: 180, height: 120 },
  artifact: { width: 150, height: 110 },
  trigger: { width: 110, height: 110 },
  aimodel: { width: 200, height: 140 },
  vectorstore: { width: 200, height: 140 },
  retriever: { width: 180, height: 120 },
  evaluation: { width: 180, height: 120 },
};

export const NODE_DIMENSIONS_EXTENDED: Record<EntityKind, { width: number; height: number }> = {
  person: { width: 260, height: 220 },
  system: { width: 340, height: 280 },
  container: { width: 320, height: 260 },
  component: { width: 300, height: 240 },
  artifact: { width: 280, height: 220 },
  trigger: { width: 260, height: 220 },
  aimodel: { width: 320, height: 260 },
  vectorstore: { width: 320, height: 260 },
  retriever: { width: 300, height: 240 },
  evaluation: { width: 300, height: 240 },
};
