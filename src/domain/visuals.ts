import type { EntityKind, Maturity, Viewpoint, EdgeType } from './core';

// ─── COLOR PALETTES ──────────────────────────────────────────────

export const KIND_COLORS: Record<EntityKind, string> = {
  // C4 core
  person: 'var(--kind-person, #5B8DEF)',
  system: 'var(--kind-system, #6C5CE7)',
  container: 'var(--kind-container, #00B894)',
  component: 'var(--kind-component, #FDCB6E)',
  artifact: 'var(--kind-artifact, #E17055)',
  trigger: 'var(--kind-trigger, #FD79A8)',
  // AI / ML
  aimodel: 'var(--kind-aimodel, #7C3AED)',
  vectorstore: 'var(--kind-vectorstore, #0EA5E9)',
  retriever: 'var(--kind-retriever, #8B5CF6)',
  evaluation: 'var(--kind-evaluation, #F59E0B)',
  // ArchiMate — Business (gold/amber family)
  'business-actor': 'var(--kind-business-actor, #C49A2A)',
  'business-role': 'var(--kind-business-role, #D4A73A)',
  'business-process': 'var(--kind-business-process, #E5B84C)',
  'business-service': 'var(--kind-business-service, #D4A017)',
  'business-object': 'var(--kind-business-object, #B8860B)',
  'business-event': 'var(--kind-business-event, #DAA520)',
  'business-interface': 'var(--kind-business-interface, #CD9B1D)',
  contract: 'var(--kind-contract, #A67C00)',
  // ArchiMate — Application (blue family)
  'application-component': 'var(--kind-application-component, #3B7DD8)',
  'application-service': 'var(--kind-application-service, #4A8DE8)',
  'application-function': 'var(--kind-application-function, #5A9DF8)',
  'application-interface': 'var(--kind-application-interface, #2B6DC8)',
  'application-process': 'var(--kind-application-process, #6AADF8)',
  'data-object': 'var(--kind-data-object, #1B5DB8)',
  // ArchiMate — Technology (green family)
  node: 'var(--kind-node, #5BA37E)',
  device: 'var(--kind-device, #4B936E)',
  'system-software': 'var(--kind-system-software, #6BB38E)',
  'technology-service': 'var(--kind-technology-service, #7BC39E)',
  'communication-network': 'var(--kind-communication-network, #3B835E)',
  'technology-interface': 'var(--kind-technology-interface, #8BD3AE)',
  // ArchiMate — Strategy / Motivation
  capability: 'var(--kind-capability, #E67E22)',
  stakeholder: 'var(--kind-stakeholder, #9B59B6)',
  goal: 'var(--kind-goal, #27AE60)',
  requirement: 'var(--kind-requirement, #E74C3C)',
};

export const MATURITY_COLORS: Record<Maturity, string> = {
  DEV: 'var(--maturity-dev, #A29BFE)',
  INTRO: 'var(--maturity-intro, #74B9FF)',
  GROW: 'var(--maturity-grow, #55EFC4)',
  MATURE: 'var(--maturity-mature, #FFEAA7)',
  DECLINE: 'var(--maturity-decline, #FAB1A0)',
};

// ─── VIEWPOINT COLORS ────────────────────────────────────────────

/** ArchiMate-standard border / stroke color per viewpoint. */
export const VIEWPOINT_COLORS: Record<Viewpoint, string> = {
  business:    'var(--viewpoint-business, #C49A2A)',
  application: 'var(--viewpoint-application, #3B7DD8)',
  technology:  'var(--viewpoint-technology, #5BA37E)',
  global:      'var(--viewpoint-global, #8B5CF6)',
};

/** ArchiMate-standard light fill / background color per viewpoint. */
export const VIEWPOINT_BG_COLORS: Record<Viewpoint, string> = {
  business:    'var(--viewpoint-business-bg, #FFFFB5)',
  application: 'var(--viewpoint-application-bg, #B5D8FF)',
  technology:  'var(--viewpoint-technology-bg, #C9E9C9)',
  global:      '#EDE9FE',
};

export const VIEWPOINT_LABELS: Record<Viewpoint, string> = {
  business: 'Business',
  application: 'Application',
  technology: 'Technology',
  global: 'Global',
};

// ─── FIELD HELP DESCRIPTIONS ─────────────────────────────────────

export const FIELD_HELP: Record<string, string> = {
  kind: 'C4 or ArchiMate element type. C4: Person, System, Container, Component, Artifact, Trigger. AI: AI Model, Vector Store, Retriever, Evaluation. ArchiMate Business: Actor, Role, Process, Service, Object, Event, Interface, Contract. ArchiMate Application: Component, Service, Function, Interface, Process, Data Object. ArchiMate Technology: Node, Device, System Software, Service, Network, Interface. Strategy/Motivation: Capability, Stakeholder, Goal, Requirement.',
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
  viewpoint: 'The architectural viewpoint this entity belongs to: Business (processes & actors), Application (software & APIs), Technology (infrastructure & deployment), Global (cross-cutting).',
  zoomLevel: 'The C4 zoom level (abstraction level) of this entity: Context (systems & actors), Container (deployable units), Component (internal modules), Code (classes & functions).',
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
  // C4 core
  person: { width: 160, height: 110 },
  system: { width: 220, height: 160 },
  container: { width: 200, height: 140 },
  component: { width: 180, height: 120 },
  artifact: { width: 150, height: 110 },
  trigger: { width: 110, height: 110 },
  // AI / ML
  aimodel: { width: 200, height: 140 },
  vectorstore: { width: 200, height: 140 },
  retriever: { width: 180, height: 120 },
  evaluation: { width: 180, height: 120 },
  // ArchiMate — Business
  'business-actor': { width: 160, height: 110 },
  'business-role': { width: 160, height: 110 },
  'business-process': { width: 200, height: 130 },
  'business-service': { width: 200, height: 130 },
  'business-object': { width: 170, height: 110 },
  'business-event': { width: 160, height: 110 },
  'business-interface': { width: 170, height: 110 },
  contract: { width: 170, height: 110 },
  // ArchiMate — Application
  'application-component': { width: 200, height: 140 },
  'application-service': { width: 200, height: 130 },
  'application-function': { width: 180, height: 120 },
  'application-interface': { width: 180, height: 120 },
  'application-process': { width: 200, height: 130 },
  'data-object': { width: 170, height: 110 },
  // ArchiMate — Technology
  node: { width: 200, height: 140 },
  device: { width: 200, height: 140 },
  'system-software': { width: 200, height: 140 },
  'technology-service': { width: 200, height: 130 },
  'communication-network': { width: 200, height: 100 },
  'technology-interface': { width: 180, height: 120 },
  // ArchiMate — Strategy / Motivation
  capability: { width: 180, height: 120 },
  stakeholder: { width: 160, height: 110 },
  goal: { width: 180, height: 110 },
  requirement: { width: 180, height: 110 },
};

export const NODE_DIMENSIONS_EXTENDED: Record<EntityKind, { width: number; height: number }> = {
  // C4 core
  person: { width: 260, height: 220 },
  system: { width: 340, height: 280 },
  container: { width: 320, height: 260 },
  component: { width: 300, height: 240 },
  artifact: { width: 280, height: 220 },
  trigger: { width: 260, height: 220 },
  // AI / ML
  aimodel: { width: 320, height: 260 },
  vectorstore: { width: 320, height: 260 },
  retriever: { width: 300, height: 240 },
  evaluation: { width: 300, height: 240 },
  // ArchiMate — Business
  'business-actor': { width: 260, height: 220 },
  'business-role': { width: 260, height: 220 },
  'business-process': { width: 320, height: 250 },
  'business-service': { width: 320, height: 250 },
  'business-object': { width: 280, height: 220 },
  'business-event': { width: 260, height: 220 },
  'business-interface': { width: 280, height: 220 },
  contract: { width: 280, height: 220 },
  // ArchiMate — Application
  'application-component': { width: 320, height: 260 },
  'application-service': { width: 320, height: 250 },
  'application-function': { width: 300, height: 240 },
  'application-interface': { width: 300, height: 240 },
  'application-process': { width: 320, height: 250 },
  'data-object': { width: 280, height: 220 },
  // ArchiMate — Technology
  node: { width: 320, height: 260 },
  device: { width: 320, height: 260 },
  'system-software': { width: 320, height: 260 },
  'technology-service': { width: 320, height: 250 },
  'communication-network': { width: 320, height: 220 },
  'technology-interface': { width: 300, height: 240 },
  // ArchiMate — Strategy / Motivation
  capability: { width: 300, height: 240 },
  stakeholder: { width: 260, height: 220 },
  goal: { width: 300, height: 220 },
  requirement: { width: 300, height: 220 },
};
