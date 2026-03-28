import React from 'react';
import type { ArchEntity, Relationship, DiagramNote, DiagramBoundary, NodePosition } from '../../domain/core';

// ─── Target union ────────────────────────────────────────────────

export type InspectTarget =
  | { kind: 'entity'; entity: ArchEntity; position: NodePosition; relationships: Relationship[] }
  | { kind: 'relationship'; rel: Relationship; source: ArchEntity; target: ArchEntity }
  | { kind: 'note'; note: DiagramNote }
  | { kind: 'boundary'; boundary: DiagramBoundary };

interface Props {
  target: InspectTarget | null;
  mouseX: number;
  mouseY: number;
}

// ─── Key/value row ────────────────────────────────────────────────

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="inspect-row">
    <span className="inspect-row-label">{label}</span>
    <span className="inspect-row-value">{value}</span>
  </div>
);

// ─── Section divider ─────────────────────────────────────────────

const Section: React.FC<{ title: string }> = ({ title }) => (
  <div className="inspect-section-title">{title}</div>
);

// ─── Overlay panel ───────────────────────────────────────────────

export const InspectOverlay: React.FC<Props> = ({ target, mouseX, mouseY }) => {
  if (!target) return null;

  // Offset from cursor so it doesn't obscure the hovered element
  const GAP = 16;
  const PANEL_W = 280;

  // Flip to left if too close to right edge
  const flipX = mouseX + GAP + PANEL_W > window.innerWidth - 20;
  const left = flipX ? mouseX - GAP - PANEL_W : mouseX + GAP;
  const top = Math.min(mouseY - 8, window.innerHeight - 400);

  let content: React.ReactNode;

  if (target.kind === 'entity') {
    const { entity, position, relationships } = target;
    const meta = entity.metadata;
    content = (
      <>
        <div className="inspect-header">
          <span className="inspect-kind-badge" data-kind={entity.kind}>{entity.kind.toUpperCase()}</span>
          <span className="inspect-title">{entity.name}</span>
        </div>
        <Section title="Identity" />
        <Row label="ID" value={<code className="inspect-code">{entity.id.slice(0, 8)}…</code>} />
        {entity.identificationId && <Row label="Ext ID" value={entity.identificationId} />}
        {entity.shortName && <Row label="Short" value={entity.shortName} />}
        <Section title="Placement" />
        <Row label="Viewpoint" value={entity.viewpoint} />
        {entity.zoomLevel && <Row label="Zoom level" value={entity.zoomLevel} />}
        {entity.parentId && <Row label="Parent ID" value={<code className="inspect-code">{entity.parentId.slice(0, 8)}…</code>} />}
        <Row label="Position" value={`(${Math.round(position.x)}, ${Math.round(position.y)})`} />
        {position.locked && <Row label="Locked" value="yes" />}
        {entity.description && (
          <>
            <Section title="Description" />
            <p className="inspect-desc">{entity.description}</p>
          </>
        )}
        {entity.responsibilities.length > 0 && (
          <>
            <Section title="Responsibilities" />
            <ul className="inspect-list">
              {entity.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </>
        )}
        <Section title="Metadata" />
        {meta.maturity && <Row label="Maturity" value={meta.maturity} />}
        {meta.deploymentStage && <Row label="Stage" value={meta.deploymentStage} />}
        {meta.tps != null && <Row label="TPS" value={meta.tps} />}
        {meta.tags && meta.tags.length > 0 && <Row label="Tags" value={meta.tags.join(', ')} />}
        <Section title="Relationships" />
        <Row label="Connected" value={relationships.length} />
        {relationships.length > 0 && (
          <ul className="inspect-list">
            {relationships.slice(0, 5).map((r) => (
              <li key={r.id}>
                <span className="inspect-rel-type">{r.type}</span>
                {r.label ? ` "${r.label}"` : ''}
                <span className="inspect-rel-arrow"> → {r.targetId === entity.id ? r.sourceId.slice(0, 6) : r.targetId.slice(0, 6)}…</span>
              </li>
            ))}
            {relationships.length > 5 && <li className="inspect-more">+{relationships.length - 5} more</li>}
          </ul>
        )}
      </>
    );
  } else if (target.kind === 'relationship') {
    const { rel, source, target: tgt } = target;
    content = (
      <>
        <div className="inspect-header">
          <span className="inspect-kind-badge" data-kind="relationship">REL</span>
          <span className="inspect-title">{rel.type}</span>
        </div>
        <Section title="Identity" />
        <Row label="ID" value={<code className="inspect-code">{rel.id.slice(0, 8)}…</code>} />
        <Row label="Type" value={rel.type} />
        {rel.label && <Row label="Label" value={rel.label} />}
        {rel.protocol && <Row label="Protocol" value={rel.protocol} />}
        {rel.description && (
          <>
            <Section title="Description" />
            <p className="inspect-desc">{rel.description}</p>
          </>
        )}
        <Section title="Endpoints" />
        <Row label="Source" value={<><span className="inspect-kind-mini" data-kind={source.kind}>{source.kind}</span> {source.name}</>} />
        <Row label="Target" value={<><span className="inspect-kind-mini" data-kind={tgt.kind}>{tgt.kind}</span> {tgt.name}</>} />
      </>
    );
  } else if (target.kind === 'note') {
    const { note } = target;
    content = (
      <>
        <div className="inspect-header">
          <span className="inspect-kind-badge" data-kind="note">NOTE</span>
          <span className="inspect-title">Sticky note</span>
        </div>
        <Section title="Content" />
        <p className="inspect-desc">{note.text}</p>
        <Section title="Layout" />
        <Row label="Position" value={`(${Math.round(note.x)}, ${Math.round(note.y)})`} />
        <Row label="Size" value={`${Math.round(note.width)} × ${Math.round(note.height)}`} />
        {note.attachedToId && <Row label="Attached to" value={<code className="inspect-code">{note.attachedToId.slice(0, 8)}…</code>} />}
        <Section title="Style" />
        <Row label="Fill" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: note.style.fillColor, border: '1px solid #ccc', display: 'inline-block' }} />{note.style.fillColor}</span>} />
        <Row label="Font size" value={`${note.style.fontSize}px`} />
      </>
    );
  } else {
    const { boundary } = target;
    content = (
      <>
        <div className="inspect-header">
          <span className="inspect-kind-badge" data-kind="boundary">BNDRY</span>
          <span className="inspect-title">{boundary.label}</span>
        </div>
        <Section title="Layout" />
        <Row label="Position" value={`(${Math.round(boundary.x)}, ${Math.round(boundary.y)})`} />
        <Row label="Size" value={`${Math.round(boundary.width)} × ${Math.round(boundary.height)}`} />
        <Section title="Style" />
        <Row label="Fill" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: boundary.style.fillColor, border: '1px solid #ccc', display: 'inline-block' }} />{boundary.style.fillColor}</span>} />
        <Row label="Border" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: boundary.style.borderColor, border: '1px solid #ccc', display: 'inline-block' }} />{boundary.style.borderColor}</span>} />
      </>
    );
  }

  return (
    <div
      className="inspect-overlay"
      style={{ left, top }}
      role="tooltip"
      aria-live="polite"
    >
      <div className="inspect-overlay-inner">
        {content}
      </div>
    </div>
  );
};
