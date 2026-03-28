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

export type DiagramMode = 'focused' | 'inclusive' | 'full';

// ─── ENUM ARRAYS ─────────────────────────────────────────────────

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
  viewpoint: Viewpoint;
  zoomLevel?: ZoomLevel;
  parentId: string | null;
  metadata: EntityMetadata;
  responsibilities: string[];
}

// ─── TRACEABILITY LINK ───────────────────────────────────────────

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
  attachedToId: string | null;
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
  tabs?: DiagramTab[];
  activeTabId?: string | null;
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

export interface DiagramTab {
  id: string;
  name: string;
  entities: ArchEntity[];
  relationships: Relationship[];
  positions: NodePosition[];
  notes: DiagramNote[];
  boundaries: DiagramBoundary[];
  traceabilityLinks: TraceabilityLink[];
  views: SavedView[];
  zoomLevel: ZoomLevel;
  viewpoint: Viewpoint;
  focusEntityId: string | null;
  breadcrumb: { id: string; name: string; level: ZoomLevel }[];
  diagramMode: DiagramMode;
  panX: number;
  panY: number;
  scale: number;
  filters: ViewFilters;
  visualConfig: VisualConfig;
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  selectedNoteId: string | null;
  selectedBoundaryId: string | null;
}
