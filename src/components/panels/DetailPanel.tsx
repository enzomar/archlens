import React from 'react';
import { useStore } from '../../store/useStore';
import { KIND_COLORS, MATURITY_COLORS, DRILLABLE_KINDS } from '../../domain/types';
import { ArrowDownRight, Edit, Lock, Pin, Trash2, Copy, ShieldAlert, CreditCard, StickyNote, Square } from 'lucide-react';

export const DetailPanel: React.FC = () => {
  const selectedEntityId = useStore((s) => s.selectedEntityId);
  const selectedRelationshipId = useStore((s) => s.selectedRelationshipId);
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const selectedBoundaryId = useStore((s) => s.selectedBoundaryId);
  const entities = useStore((s) => s.entities);
  const relationships = useStore((s) => s.relationships);
  const notes = useStore((s) => s.notes);
  const boundaries = useStore((s) => s.boundaries);
  const deleteEntity = useStore((s) => s.deleteEntity);
  const deleteRelationship = useStore((s) => s.deleteRelationship);
  const deleteNote = useStore((s) => s.deleteNote);
  const deleteBoundary = useStore((s) => s.deleteBoundary);
  const setShowEntityForm = useStore((s) => s.setShowEntityForm);
  const setShowRelationshipForm = useStore((s) => s.setShowRelationshipForm);
  const setShowNoteForm = useStore((s) => s.setShowNoteForm);
  const setShowBoundaryForm = useStore((s) => s.setShowBoundaryForm);
  const lockPosition = useStore((s) => s.lockPosition);
  const positions = useStore((s) => s.positions);
  const drillDown = useStore((s) => s.drillDown);

  const entity = selectedEntityId ? entities.find((e) => e.id === selectedEntityId) : null;
  const relationship = selectedRelationshipId ? relationships.find((r) => r.id === selectedRelationshipId) : null;
  const note = selectedNoteId ? notes.find((n) => n.id === selectedNoteId) : null;
  const boundary = selectedBoundaryId ? boundaries.find((b) => b.id === selectedBoundaryId) : null;

  if (!entity && !relationship && !note && !boundary) {
    return (
      <aside className="detail-panel detail-panel--empty">
        <div className="detail-panel-placeholder">
          <p>Select an entity, relationship, note, or boundary to see details</p>
        </div>
      </aside>
    );
  }

  if (entity) {
    const parent = entity.parentId ? entities.find((e) => e.id === entity.parentId) : null;
    const children = entities.filter((e) => e.parentId === entity.id);
    const rels = relationships.filter((r) => r.sourceId === entity.id || r.targetId === entity.id);
    const pos = positions.find((p) => p.entityId === entity.id);
    const color = KIND_COLORS[entity.kind];
    const drillable = !!DRILLABLE_KINDS[entity.kind];

    return (
      <aside className="detail-panel">
        <div className="detail-panel-header" style={{ borderLeftColor: color }}>
          <div className="detail-kind-badge" style={{ background: color }}>{entity.kind}</div>
          <h3>{entity.name}</h3>
          {entity.shortName && <span className="detail-shortname">({entity.shortName})</span>}
        </div>

        {/* Identification ID + UUID */}
        <div className="detail-section detail-ids">
          {entity.identificationId && (
            <div className="meta-item">
              <label>ID</label>
              <span>{entity.identificationId}</span>
            </div>
          )}
          {entity.parentName && (
            <div className="meta-item">
              <label>Parent Name</label>
              <span>{entity.parentName}</span>
            </div>
          )}
          <details className="detail-uuid-details">
            <summary className="detail-uuid-summary">UUID</summary>
            <div className="detail-uuid-row">
              <code className="detail-uuid">{entity.id}</code>
              <button className="btn-icon" onClick={() => navigator.clipboard.writeText(entity.id)} aria-label="Copy UUID" title="Copy UUID">
                <Copy size={12} />
              </button>
            </div>
          </details>
        </div>

        {/* Compliance badges */}
        {(entity.metadata.pii || entity.metadata.pciDss) && (
          <div className="detail-section detail-compliance">
            {entity.metadata.pii && (
              <span className="compliance-badge compliance-badge--pii"><ShieldAlert size={12} /> PII</span>
            )}
            {entity.metadata.pciDss && (
              <span className="compliance-badge compliance-badge--pci"><CreditCard size={12} /> PCI-DSS</span>
            )}
          </div>
        )}

        <div className="detail-section">
          <p className="detail-description">{entity.description}</p>
        </div>

        {/* Responsibilities */}
        {entity.responsibilities && entity.responsibilities.length > 0 && (
          <div className="detail-section">
            <label>Responsibilities</label>
            <ul className="detail-responsibilities">
              {entity.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {entity.metadata.technology && (
          <div className="detail-section">
            <label>Technology</label>
            <p>{entity.metadata.technology}</p>
          </div>
        )}

        <div className="detail-section detail-meta-grid">
          {entity.metadata.maturity && (
            <div className="meta-item">
              <label>Maturity</label>
              <span className="meta-badge" style={{ background: MATURITY_COLORS[entity.metadata.maturity] }}>
                {entity.metadata.maturity}
              </span>
            </div>
          )}
          {entity.metadata.size && (
            <div className="meta-item">
              <label>Size</label>
              <span>{entity.metadata.size}</span>
            </div>
          )}
          {entity.metadata.appType && (
            <div className="meta-item">
              <label>App Type</label>
              <span>{entity.metadata.appType}</span>
            </div>
          )}
          {entity.metadata.deploymentStage && (
            <div className="meta-item">
              <label>Stage</label>
              <span>{entity.metadata.deploymentStage}</span>
            </div>
          )}
          {entity.metadata.organization && (
            <div className="meta-item">
              <label>Organization</label>
              <span>{entity.metadata.organization}</span>
            </div>
          )}
          {entity.metadata.owner && (
            <div className="meta-item">
              <label>Owner</label>
              <span>{entity.metadata.owner}</span>
            </div>
          )}
          {entity.metadata.sme && (
            <div className="meta-item">
              <label>SME</label>
              <span>{entity.metadata.sme}</span>
            </div>
          )}
          {entity.metadata.tps != null && (
            <div className="meta-item">
              <label>TPS</label>
              <span>{entity.metadata.tps.toLocaleString()}</span>
            </div>
          )}
          {entity.metadata.compute && (
            <div className="meta-item">
              <label>Compute</label>
              <span>{entity.metadata.compute}</span>
            </div>
          )}
        </div>

        {entity.metadata.codeRepository && (
          <div className="detail-section">
            <label>Code Repository</label>
            <p className="detail-repo">{entity.metadata.codeRepository}</p>
          </div>
        )}

        {entity.metadata.tags.length > 0 && (
          <div className="detail-section">
            <label>Tags</label>
            <div className="tag-list">
              {entity.metadata.tags.map((t) => (
                <span key={t} className="tag-chip tag-chip--small">{t}</span>
              ))}
            </div>
          </div>
        )}

        {parent && (
          <div className="detail-section">
            <label>Parent</label>
            <p className="detail-link">{parent.name} [{parent.kind}]</p>
          </div>
        )}

        {children.length > 0 && (
          <div className="detail-section">
            <label>Children ({children.length})</label>
            {children.map((c) => (
              <p key={c.id} className="detail-link">{c.name} [{c.kind}]</p>
            ))}
          </div>
        )}

        {rels.length > 0 && (
          <div className="detail-section">
            <label>Relationships ({rels.length})</label>
            {rels.map((r) => {
              const other = r.sourceId === entity.id
                ? entities.find((e) => e.id === r.targetId)
                : entities.find((e) => e.id === r.sourceId);
              const direction = r.sourceId === entity.id ? '→' : '←';
              return (
                <p key={r.id} className="detail-rel">
                  {direction} {r.label} <span className="detail-rel-target">{other?.name ?? '?'}</span>
                  <span className="detail-rel-type">[{r.type}]</span>
                </p>
              );
            })}
          </div>
        )}

        <div className="detail-actions">
          {drillable && (
            <button className="btn btn-sm btn-primary" onClick={() => drillDown(entity.id)}>
              <ArrowDownRight size={14} /> Expand Internals
            </button>
          )}
          <button className="btn btn-sm" onClick={() => setShowEntityForm(true, entity.id)}>
            <Edit size={14} /> Edit
          </button>
          {pos && (
            <button className="btn btn-sm" onClick={() => lockPosition(entity.id, !pos.locked)}>
              {pos.locked ? <><Lock size={14} /> Unlock</> : <><Pin size={14} /> Lock</>}
            </button>
          )}
          <button className="btn btn-sm btn-danger" onClick={() => deleteEntity(entity.id)}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </aside>
    );
  }

  if (relationship) {
    const source = entities.find((e) => e.id === relationship.sourceId);
    const target = entities.find((e) => e.id === relationship.targetId);

    return (
      <aside className="detail-panel">
        <div className="detail-panel-header">
          <h3>{relationship.label}</h3>
        </div>
        <div className="detail-section">
          <label>Type</label>
          <p>{relationship.type}</p>
        </div>
        <div className="detail-section">
          <label>From</label>
          <p>{source?.name ?? relationship.sourceId}</p>
        </div>
        <div className="detail-section">
          <label>To</label>
          <p>{target?.name ?? relationship.targetId}</p>
        </div>
        {relationship.protocol && (
          <div className="detail-section">
            <label>Protocol</label>
            <p>{relationship.protocol}</p>
          </div>
        )}
        {relationship.description && (
          <div className="detail-section">
            <label>Description</label>
            <p>{relationship.description}</p>
          </div>
        )}
        <div className="detail-actions">
          <button className="btn btn-sm" onClick={() => setShowRelationshipForm(true, relationship.id)}>
            <Edit size={14} /> Edit
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => deleteRelationship(relationship.id)}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </aside>
    );
  }

  if (note) {
    const attachedEntity = note.attachedToId ? entities.find((e) => e.id === note.attachedToId) : null;
    return (
      <aside className="detail-panel">
        <div className="detail-panel-header" style={{ borderLeftColor: note.style.borderColor }}>
          <StickyNote size={16} style={{ color: note.style.borderColor }} />
          <h3>Note</h3>
        </div>
        <div className="detail-section">
          <p className="detail-description">{note.text}</p>
        </div>
        {attachedEntity && (
          <div className="detail-section">
            <label>Attached to</label>
            <p className="detail-link">{attachedEntity.name} [{attachedEntity.kind}]</p>
          </div>
        )}
        <div className="detail-section detail-meta-grid">
          <div className="meta-item">
            <label>Size</label>
            <span>{note.width} × {note.height}</span>
          </div>
          <div className="meta-item">
            <label>Fill</label>
            <span className="color-swatch" style={{ background: note.style.fillColor }} />
          </div>
          <div className="meta-item">
            <label>Border</label>
            <span className="color-swatch" style={{ background: note.style.borderColor }} />
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-sm" onClick={() => setShowNoteForm(true, note.id)}>
            <Edit size={14} /> Edit
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => deleteNote(note.id)}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </aside>
    );
  }

  if (boundary) {
    return (
      <aside className="detail-panel">
        <div className="detail-panel-header" style={{ borderLeftColor: boundary.style.borderColor }}>
          <Square size={16} style={{ color: boundary.style.borderColor }} />
          <h3>{boundary.label}</h3>
        </div>
        <div className="detail-section detail-meta-grid">
          <div className="meta-item">
            <label>Size</label>
            <span>{boundary.width} × {boundary.height}</span>
          </div>
          <div className="meta-item">
            <label>Fill</label>
            <span className="color-swatch" style={{ background: boundary.style.fillColor }} />
          </div>
          <div className="meta-item">
            <label>Border</label>
            <span className="color-swatch" style={{ background: boundary.style.borderColor }} />
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-sm" onClick={() => setShowBoundaryForm(true, boundary.id)}>
            <Edit size={14} /> Edit
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => deleteBoundary(boundary.id)}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </aside>
    );
  }

  return null;
};
