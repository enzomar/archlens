// ─── VALIDATION ENGINE ────────────────────────────────────────────
// Centralised helpers for zoom-level + viewpoint filtering.

import type { EntityKind, ZoomLevel, Viewpoint } from '../domain/types';
import { ZOOM_VISIBLE_KINDS, getKindsForViewpointLevel } from '../domain/types';

/**
 * Returns the entity kinds that are valid at the given zoom level
 * (viewpoint-agnostic — backward-compatible).
 */
export function getValidKinds(zoom: ZoomLevel): EntityKind[] {
  return ZOOM_VISIBLE_KINDS[zoom];
}

/**
 * Returns true when the given entity kind is allowed at the specified zoom level
 * (viewpoint-agnostic — backward-compatible).
 */
export function isValidEntityKind(kind: EntityKind, zoom: ZoomLevel): boolean {
  return ZOOM_VISIBLE_KINDS[zoom].includes(kind);
}

/**
 * Returns the entity kinds valid for a (viewpoint, level) pair — the
 * matrix-aware version used by palette & entity forms.
 */
export function getValidKindsForViewpoint(viewpoint: Viewpoint, zoom: ZoomLevel): EntityKind[] {
  return getKindsForViewpointLevel(viewpoint, zoom);
}

/**
 * Returns true when the (kind, viewpoint, level) is a valid combination.
 */
export function isValidKindForViewpoint(kind: EntityKind, viewpoint: Viewpoint, level: ZoomLevel): boolean {
  return getKindsForViewpointLevel(viewpoint, level).includes(kind);
}

/**
 * Validates a relationship between two entities. Cross-viewpoint edges
 * are NOT allowed as regular relationships — they must be traceability links.
 */
export function isValidRelationship(
  sourceViewpoint: Viewpoint,
  targetViewpoint: Viewpoint,
): { valid: boolean; reason?: string } {
  if (sourceViewpoint !== targetViewpoint) {
    return { valid: false, reason: 'Cross-viewpoint edges must be traceability links (represents/implements), not regular relationships.' };
  }
  return { valid: true };
}

/**
 * Validate that a relationship type is semantically valid for the source/target kinds.
 */
export function isValidRelationshipType(
  type: string,
  sourceKind: EntityKind,
  targetKind: EntityKind,
): { valid: boolean; reason?: string } {
  // AI-specific relationship validations
  if (type === 'retrieves_from' && sourceKind !== 'retriever') {
    return { valid: false, reason: 'retrieves_from must originate from a retriever' };
  }
  if (type === 'retrieves_from' && targetKind !== 'vectorstore') {
    return { valid: false, reason: 'retrieves_from must target a vectorstore' };
  }
  if (type === 'queries_model' && targetKind !== 'aimodel') {
    return { valid: false, reason: 'queries_model must target an aimodel' };
  }
  if (type === 'evaluates' && sourceKind !== 'evaluation') {
    return { valid: false, reason: 'evaluates must originate from an evaluation' };
  }
  return { valid: true };
}
