import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import type {
  EntityKind, Maturity, TShirtSize, AppType, DeploymentStage, TechConvergency, EntityMetadata, EdgeType,
} from '../../domain/types';
import {
  ALL_ENTITY_KINDS, ALL_MATURITIES, ALL_TSHIRT_SIZES, ALL_APP_TYPES,
  ALL_DEPLOYMENT_STAGES, ALL_EDGE_TYPES, FIELD_HELP,
} from '../../domain/types';
import { getValidKindsForViewpoint } from '../../utils/validation';
import { X, HelpCircle, Plus, Trash2, Copy } from 'lucide-react';

// ─── Field label with ? help popover ──────────────────────────────

const FieldLabel: React.FC<{
  htmlFor?: string;
  id?: string;
  required?: boolean;
  helpKey: string;
  children: React.ReactNode;
}> = ({ htmlFor, id, required, helpKey, children }) => {
  const [showHelp, setShowHelp] = useState(false);
  const helpText = FIELD_HELP[helpKey];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showHelp) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowHelp(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showHelp]);

  return (
    <div className="field-label-wrap" ref={ref}>
      <label htmlFor={htmlFor} id={id}>{children}{required && ' *'}</label>
      {helpText && (
        <button
          type="button"
          className="field-help-btn"
          onClick={() => setShowHelp(!showHelp)}
          aria-label={`Help for ${String(children)}`}
        >
          <HelpCircle size={13} />
        </button>
      )}
      {showHelp && helpText && (
        <div className="field-help-popover" role="tooltip">
          {helpText}
        </div>
      )}
    </div>
  );
};

export const EntityForm: React.FC = () => {
  const showForm = useStore((s) => s.showEntityForm);
  const editingId = useStore((s) => s.editingEntityId);
  const entities = useStore((s) => s.entities);
  const relationships = useStore((s) => s.relationships);
  const addEntity = useStore((s) => s.addEntity);
  const updateEntity = useStore((s) => s.updateEntity);
  const addRelationship = useStore((s) => s.addRelationship);
  const updateRelationship = useStore((s) => s.updateRelationship);
  const deleteRelationship = useStore((s) => s.deleteRelationship);
  const setShowEntityForm = useStore((s) => s.setShowEntityForm);
  const zoomLevel = useStore((s) => s.zoomLevel);
  const storeViewpoint = useStore((s) => s.viewpoint);

  // Derive allowed kinds from current viewpoint + zoom level.
  const contextKinds = getValidKindsForViewpoint(storeViewpoint, zoomLevel);
  const allowedKinds: EntityKind[] = contextKinds.length > 0 ? contextKinds : ALL_ENTITY_KINDS;

  const editing = editingId ? entities.find((e) => e.id === editingId) : null;

  // Core fields
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [identificationId, setIdentificationId] = useState('');
  const [description, setDescription] = useState('');
  const [parentName, setParentName] = useState('');
  const [kind, setKind] = useState<EntityKind>('system');
  const [parentId, setParentId] = useState<string>('');
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [newResponsibility, setNewResponsibility] = useState('');

  // Metadata fields
  const [maturity, setMaturity] = useState<Maturity | ''>('');
  const [size, setSize] = useState<TShirtSize | ''>('');
  const [appType, setAppType] = useState<AppType | ''>('');
  const [deploymentStage, setDeploymentStage] = useState<DeploymentStage | ''>('');
  const [techConvergency, setTechConvergency] = useState<TechConvergency | 0>(0);
  const [technology, setTechnology] = useState('');
  const [owner, setOwner] = useState('');

  const [notes, setNotes] = useState('');
  const [tps, setTps] = useState<string>('');
  const [compute, setCompute] = useState<TShirtSize | ''>('');
  const [codeRepository, setCodeRepository] = useState('');
  const [pii, setPii] = useState(false);
  const [pciDss, setPciDss] = useState(false);
  const [adrUrl, setAdrUrl] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'identity' | 'classification' | 'compliance' | 'relationships'>('identity');

  // Relationship inline editing state
  interface RelDraft { direction: 'outgoing' | 'incoming'; targetId: string; type: EdgeType; label: string; protocol: string; description: string; existingId?: string; }
  const [relDrafts, setRelDrafts] = useState<RelDraft[]>([]);
  const [deletedRelIds, setDeletedRelIds] = useState<string[]>([]);
  const [showAddRel, setShowAddRel] = useState(false);
  const [newRelDirection, setNewRelDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [newRelTargetId, setNewRelTargetId] = useState('');
  const [newRelType, setNewRelType] = useState<EdgeType>('sync');
  const [newRelLabel, setNewRelLabel] = useState('');
  const [newRelProtocol, setNewRelProtocol] = useState('');
  const [newRelDesc, setNewRelDesc] = useState('');

  const [errors, setErrors] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap + Escape handler
  useEffect(() => {
    if (!showForm) return;
    const el = modalRef.current;
    if (el) {
      const firstFocusable = el.querySelector<HTMLElement>('input, select, textarea, button');
      firstFocusable?.focus();
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEntityForm(false);
        return;
      }
      if (e.key === 'Tab' && el) {
        const focusable = el.querySelectorAll<HTMLElement>('input, select, textarea, button, [tabindex]');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setShortName(editing.shortName);
      setIdentificationId(editing.identificationId ?? '');
      setDescription(editing.description);
      setParentName(editing.parentName ?? '');
      setKind(editing.kind);
      setParentId(editing.parentId ?? '');
      setResponsibilities([...editing.responsibilities]);
      setMaturity(editing.metadata.maturity ?? '');
      setSize(editing.metadata.size ?? '');
      setAppType(editing.metadata.appType ?? '');
      setDeploymentStage(editing.metadata.deploymentStage ?? '');
      setTechConvergency((editing.metadata.techConvergency as TechConvergency) ?? 0);
      setTechnology(editing.metadata.technology ?? '');
      setOwner(editing.metadata.owner ?? '');
      // tags field removed
      setNotes(editing.metadata.notes ?? '');
      setTps(editing.metadata.tps != null ? String(editing.metadata.tps) : '');
      setCompute(editing.metadata.compute ?? '');
      setCodeRepository(editing.metadata.codeRepository ?? '');
      setPii(editing.metadata.pii ?? false);
      setPciDss(editing.metadata.pciDss ?? false);
      setAdrUrl(editing.metadata.adrUrl ?? '');
      // Load existing relationships for this entity
      const entityRels = relationships.filter((r) => r.sourceId === editing.id || r.targetId === editing.id);
      setRelDrafts(entityRels.map((r) => ({
        direction: r.sourceId === editing.id ? 'outgoing' : 'incoming',
        targetId: r.sourceId === editing.id ? r.targetId : r.sourceId,
        type: r.type,
        label: r.label,
        protocol: r.protocol ?? '',
        description: r.description ?? '',
        existingId: r.id,
      })));
      setDeletedRelIds([]);
    } else {
      resetForm();
    }
  }, [editing]);

  function resetForm() {
    setName(''); setShortName(''); setIdentificationId(''); setDescription(''); setParentName('');
    setKind('system'); setParentId(''); setResponsibilities([]); setNewResponsibility('');
    setMaturity(''); setSize(''); setAppType(''); setDeploymentStage('');
    setTechConvergency(0); setTechnology(''); setOwner(''); setNotes('');
    setTps(''); setCompute(''); setCodeRepository('');
    setPii(false); setPciDss(false); setErrors([]);
    setRelDrafts([]); setDeletedRelIds([]);
    setShowAddRel(false); resetNewRel();
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Name is required');
    if (!shortName.trim()) errs.push('Short Name is required');
    if (kind === 'component' && !parentId) errs.push('Components must have a parent container');
    setErrors(errs);
    return errs.length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const metadata: EntityMetadata = {
      tags: [],
      ...(maturity && { maturity: maturity as Maturity }),
      ...(size && { size: size as TShirtSize }),
      ...(appType && { appType: appType as AppType }),
      ...(deploymentStage && { deploymentStage: deploymentStage as DeploymentStage }),
      ...(techConvergency && { techConvergency: techConvergency as TechConvergency }),
      ...(technology && { technology }),
      ...(owner && { owner }),
      ...(notes && { notes }),
      ...(tps && { tps: Number(tps) }),
      ...(compute && { compute: compute as TShirtSize }),
      ...(codeRepository && { codeRepository }),
      ...(pii && { pii }),
      ...(pciDss && { pciDss }),
    };

    const entityData = {
      name,
      shortName,
      description,
      kind,
      viewpoint: storeViewpoint,
      parentId: parentId || null,
      metadata,
      responsibilities,
      ...(identificationId && { identificationId }),
      ...(parentName && { parentName }),
    };

    if (editing) {
      updateEntity(editing.id, entityData);
      // Commit relationship changes
      for (const id of deletedRelIds) deleteRelationship(id);
      for (const draft of relDrafts) {
        const relData = {
          sourceId: draft.direction === 'outgoing' ? editing.id : draft.targetId,
          targetId: draft.direction === 'outgoing' ? draft.targetId : editing.id,
          type: draft.type,
          label: draft.label,
          ...(draft.protocol && { protocol: draft.protocol }),
          ...(draft.description && { description: draft.description }),
        };
        if (draft.existingId) {
          updateRelationship(draft.existingId, relData);
        } else {
          addRelationship(relData);
        }
      }
    } else {
      const newId = addEntity(entityData);
      // Create relationships for newly created entity
      for (const draft of relDrafts) {
        addRelationship({
          sourceId: draft.direction === 'outgoing' ? newId : draft.targetId,
          targetId: draft.direction === 'outgoing' ? draft.targetId : newId,
          type: draft.type,
          label: draft.label,
          ...(draft.protocol && { protocol: draft.protocol }),
          ...(draft.description && { description: draft.description }),
        });
      }
    }

    setShowEntityForm(false);
    resetForm();
  }

  function addResponsibility() {
    if (newResponsibility.trim()) {
      setResponsibilities((prev) => [...prev, newResponsibility.trim()]);
      setNewResponsibility('');
    }
  }

  function removeResponsibility(idx: number) {
    setResponsibilities((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Relationship helpers ──────────────────────────────────────

  function resetNewRel() {
    setNewRelDirection('outgoing'); setNewRelTargetId(''); setNewRelType('sync');
    setNewRelLabel(''); setNewRelProtocol(''); setNewRelDesc('');
  }

  function addRelDraft() {
    if (!newRelTargetId || !newRelLabel.trim()) return;
    setRelDrafts((prev) => [...prev, {
      direction: newRelDirection,
      targetId: newRelTargetId,
      type: newRelType,
      label: newRelLabel,
      protocol: newRelProtocol,
      description: newRelDesc,
    }]);
    resetNewRel();
    setShowAddRel(false);
  }

  function removeRelDraft(idx: number) {
    const draft = relDrafts[idx];
    if (draft.existingId) setDeletedRelIds((prev) => [...prev, draft.existingId!]);
    setRelDrafts((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRelDraft(idx: number, updates: Partial<RelDraft>) {
    setRelDrafts((prev) => prev.map((d, i) => i === idx ? { ...d, ...updates } : d));
  }

  const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
    sync: '⟶ Sync', async: '⇢ Async', dataflow: '⟹ Data Flow', dependency: '⟶ Dep', trigger: '⚡ Trigger',
    retrieves: '🔍 Retrieves', augments: '🧠 Augments', generates: '✨ Generates',
    retrieves_from: '🔍 Retrieves From', queries_model: '🤖 Queries Model', evaluates: '📊 Evaluates',
  };

  if (!showForm) return null;

  const potentialParents = entities.filter((e) => {
    if (kind === 'container') return e.kind === 'system';
    if (kind === 'component') return e.kind === 'container';
    if (kind === 'artifact') return e.kind === 'container' || e.kind === 'component';
    if (kind === 'aimodel') return e.kind === 'system' || e.kind === 'container';
    if (kind === 'vectorstore') return e.kind === 'system' || e.kind === 'container';
    if (kind === 'retriever') return e.kind === 'container' || e.kind === 'aimodel';
    if (kind === 'evaluation') return e.kind === 'container' || e.kind === 'aimodel';
    return false;
  });

  const showParent = ['container', 'component', 'artifact', 'aimodel', 'vectorstore', 'retriever', 'evaluation'].includes(kind);
  const showAppType = ['container', 'system'].includes(kind);
  const showDeployment = ['container', 'system', 'vectorstore'].includes(kind);

  // ── Kind-adaptive field visibility ──────────────────────────────
  const isSoftware = ['system', 'container', 'component', 'aimodel', 'vectorstore', 'retriever', 'evaluation'].includes(kind);
  const showResponsibilities = kind !== 'artifact' && kind !== 'trigger';
  const showMaturitySize = isSoftware;
  const showTechFields = isSoftware;               // technology, techConvergency
  const showTpsCompute = isSoftware;
  const showCodeRepo = ['container', 'component'].includes(kind);
  const showCompliance = isSoftware;                // PII, PCI-DSS
  const showOwner = kind !== 'artifact' && kind !== 'trigger';
  const showRelationships = kind !== 'artifact';

  return (
    <div className="modal-overlay" onClick={() => setShowEntityForm(false)} role="presentation">
      <div
        className="modal-content entity-form"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entity-form-title"
      >
        <div className="modal-header">
          <h2 id="entity-form-title">{editing ? 'Edit Entity' : 'Create Entity'}</h2>
          <button className="btn-icon" onClick={() => setShowEntityForm(false)} aria-label="Close"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {errors.length > 0 && (
            <div className="form-errors" role="alert" aria-live="assertive">
              {errors.map((err, i) => <div key={i} className="form-error">{err}</div>)}
            </div>
          )}

          {/* ── UUID display (read-only) ─────────────────── */}
          {editing && (
            <div className="form-uuid-row">
              <span className="form-uuid-label">UUID</span>
              <code className="form-uuid-value">{editing.id}</code>
              <button
                type="button"
                className="btn-icon"
                onClick={() => navigator.clipboard.writeText(editing.id)}
                aria-label="Copy UUID"
                title="Copy UUID"
              >
                <Copy size={13} />
              </button>
            </div>
          )}

          {/* ── Kind + Name + Short Name ─────────────────── */}
          <div className="form-row">
            <div className="form-group">
              <FieldLabel htmlFor="entity-kind" required helpKey="kind">Kind</FieldLabel>
              <select id="entity-kind" value={kind} onChange={(e) => setKind(e.target.value as EntityKind)}>
                {allowedKinds.map((k) => <option key={k} value={k}>{k}</option>)}
                {/* If editing an entity whose kind is no longer in context, keep it visible */}
                {editing && !allowedKinds.includes(editing.kind) && (
                  <option key={editing.kind} value={editing.kind}>{editing.kind} (current)</option>
                )}
              </select>
            </div>
            <div className="form-group flex-2">
              <FieldLabel htmlFor="entity-name" required helpKey="name">Name</FieldLabel>
              <input id="entity-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full entity name" />
            </div>
            <div className="form-group">
              <FieldLabel htmlFor="entity-shortname" required helpKey="shortName">Short Name</FieldLabel>
              <input id="entity-shortname" type="text" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="e.g. OrdSvc" maxLength={12} />
            </div>
          </div>

          {/* ── Identification ID + Parent Name ──────────── */}
          <div className="form-row">
            <div className="form-group">
              <FieldLabel htmlFor="entity-identid" helpKey="identificationId">Identification ID</FieldLabel>
              <input id="entity-identid" type="text" value={identificationId} onChange={(e) => setIdentificationId(e.target.value)} placeholder="e.g. SYS-001" />
            </div>
            <div className="form-group">
              <FieldLabel htmlFor="entity-parentname" helpKey="parentName">Parent Name</FieldLabel>
              <input id="entity-parentname" type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g. Finance Domain" />
            </div>
          </div>

          {/* ── Description (optional) ───────────────────── */}
          <div className="form-group">
            <FieldLabel htmlFor="entity-desc" helpKey="description">Description</FieldLabel>
            <textarea id="entity-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What does this entity do?" />
          </div>

          {/* ── Responsibilities list ────────────────────── */}
          {showResponsibilities && (
          <div className="form-group">
            <FieldLabel helpKey="responsibilities">Responsibilities</FieldLabel>
            {responsibilities.length > 0 && (
              <ul className="responsibilities-list">
                {responsibilities.map((r, i) => (
                  <li key={i} className="responsibility-item">
                    <span>{r}</span>
                    <button type="button" className="btn-icon btn-danger-icon" onClick={() => removeResponsibility(i)} aria-label="Remove responsibility">
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="responsibility-add">
              <input
                type="text"
                value={newResponsibility}
                onChange={(e) => setNewResponsibility(e.target.value)}
                placeholder="Add a responsibility..."
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addResponsibility(); } }}
              />
              <button type="button" className="btn btn-sm" onClick={addResponsibility} disabled={!newResponsibility.trim()}>
                <Plus size={14} />
              </button>
            </div>
          </div>
          )}

          {/* ── Parent (structural) ──────────────────────── */}
          {showParent && (
            <div className="form-group">
              <FieldLabel htmlFor="entity-parent" required={kind === 'component'} helpKey="parent">Parent</FieldLabel>
              <select id="entity-parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">— None —</option>
                {potentialParents.map((p) => <option key={p.id} value={p.id}>{p.name} [{p.kind}]</option>)}
              </select>
            </div>
          )}

          {/* ── Maturity, Size, AppType, Deployment ──────── */}
          {(showMaturitySize || showAppType || showDeployment) && (
          <div className="form-row">
            <div className="form-group">
              <FieldLabel htmlFor="entity-maturity" helpKey="maturity">Maturity</FieldLabel>
              <select id="entity-maturity" value={maturity} onChange={(e) => setMaturity(e.target.value as Maturity | '')}>
                <option value="">—</option>
                {ALL_MATURITIES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <FieldLabel htmlFor="entity-size" helpKey="size">Size</FieldLabel>
              <select id="entity-size" value={size} onChange={(e) => setSize(e.target.value as TShirtSize | '')}>
                <option value="">—</option>
                {ALL_TSHIRT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {showAppType && (
              <div className="form-group">
                <FieldLabel htmlFor="entity-apptype" helpKey="appType">App Type</FieldLabel>
                <select id="entity-apptype" value={appType} onChange={(e) => setAppType(e.target.value as AppType | '')}>
                  <option value="">—</option>
                  {ALL_APP_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
            {showDeployment && (
              <div className="form-group">
                <FieldLabel htmlFor="entity-deploy" helpKey="deployment">Deployment</FieldLabel>
                <select id="entity-deploy" value={deploymentStage} onChange={(e) => setDeploymentStage(e.target.value as DeploymentStage | '')}>
                  <option value="">—</option>
                  {ALL_DEPLOYMENT_STAGES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
          </div>
          )}

          {/* ── Technology + Tech Convergency ─────────────── */}
          {showTechFields && (
          <div className="form-row">
            <div className="form-group flex-2">
              <FieldLabel htmlFor="entity-tech" helpKey="technology">Technology</FieldLabel>
              <input id="entity-tech" type="text" value={technology} onChange={(e) => setTechnology(e.target.value)} placeholder="e.g. Java / Spring Boot" />
            </div>
            <div className="form-group">
              <FieldLabel htmlFor="entity-convergency" helpKey="techConvergency">Tech Convergency</FieldLabel>
              <select id="entity-convergency" value={techConvergency} onChange={(e) => setTechConvergency(Number(e.target.value) as TechConvergency | 0)}>
                <option value={0}>—</option>
                <option value={1}>1 (Low)</option>
                <option value={2}>2 (Medium)</option>
                <option value={3}>3 (High)</option>
              </select>
            </div>
          </div>
          )}

          {/* ── TPS + Compute ────────────────────────────── */}
          {showTpsCompute && (
          <div className="form-row">
            <div className="form-group">
              <FieldLabel htmlFor="entity-tps" helpKey="tps">TPS</FieldLabel>
              <input id="entity-tps" type="number" min={0} value={tps} onChange={(e) => setTps(e.target.value)} placeholder="e.g. 1000" />
            </div>
            <div className="form-group">
              <FieldLabel htmlFor="entity-compute" helpKey="compute">Compute</FieldLabel>
              <select id="entity-compute" value={compute} onChange={(e) => setCompute(e.target.value as TShirtSize | '')}>
                <option value="">—</option>
                {ALL_TSHIRT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          )}

          {/* ── Code Repository ──────────────────────────── */}
          {showCodeRepo && (
          <div className="form-group">
            <FieldLabel htmlFor="entity-repo" helpKey="codeRepository">Code Repository</FieldLabel>
            <input id="entity-repo" type="text" value={codeRepository} onChange={(e) => setCodeRepository(e.target.value)} placeholder="e.g. https://github.com/org/repo" />
          </div>
          )}

          {/* ── PII + PCI-DSS checkboxes ─────────────────── */}
          {showCompliance && (
          <div className="form-row">
            <div className="form-group form-checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={pii} onChange={(e) => setPii(e.target.checked)} />
                PII
              </label>
              <button
                type="button"
                className="field-help-btn"
                onClick={() => {}}
                title={FIELD_HELP.pii}
                aria-label="Help for PII"
              >
                <HelpCircle size={13} />
              </button>
            </div>
            <div className="form-group form-checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={pciDss} onChange={(e) => setPciDss(e.target.checked)} />
                PCI-DSS
              </label>
              <button
                type="button"
                className="field-help-btn"
                onClick={() => {}}
                title={FIELD_HELP.pciDss}
                aria-label="Help for PCI-DSS"
              >
                <HelpCircle size={13} />
              </button>
            </div>
          </div>
          )}

          {/* ── Owner ────────────────────────────────────── */}
          {showOwner && (
          <div className="form-group">
            <FieldLabel htmlFor="entity-owner" helpKey="owner">Owner</FieldLabel>
            <input id="entity-owner" type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Team or person" />
          </div>
          )}

          {/* ── Notes ────────────────────────────────────── */}
          <div className="form-group">
            <FieldLabel htmlFor="entity-notes" helpKey="notes">Notes</FieldLabel>
            <textarea id="entity-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Additional notes" />
          </div>
          {/* ── Relationships ────────────────────────────── */}
          {showRelationships && (
          <div className="form-group">
            <div className="field-label-wrap">
              <label>Relationships</label>
            </div>

            {relDrafts.length > 0 && (
              <div className="rel-drafts-list">
                {relDrafts.map((draft, idx) => (
                  <div key={idx} className="rel-draft-item">
                    <div className="rel-draft-summary">
                      <span className="rel-draft-direction">{draft.direction === 'outgoing' ? '→' : '←'}</span>
                      <select
                        className="rel-draft-type"
                        value={draft.type}
                        onChange={(e) => updateRelDraft(idx, { type: e.target.value as EdgeType })}
                      >
                        {ALL_EDGE_TYPES.map((t) => (
                          <option key={t} value={t}>{EDGE_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                      <select
                        className="rel-draft-target"
                        value={draft.targetId}
                        onChange={(e) => updateRelDraft(idx, { targetId: e.target.value })}
                      >
                        <option value="">— Entity —</option>
                        {entities.filter((e) => e.id !== editing?.id).map((e) => (
                          <option key={e.id} value={e.id}>{e.name} [{e.kind}]</option>
                        ))}
                      </select>
                      <input
                        className="rel-draft-label"
                        type="text"
                        value={draft.label}
                        onChange={(e) => updateRelDraft(idx, { label: e.target.value })}
                        placeholder="Label"
                      />
                      <input
                        className="rel-draft-protocol"
                        type="text"
                        value={draft.protocol}
                        onChange={(e) => updateRelDraft(idx, { protocol: e.target.value })}
                        placeholder="Protocol"
                      />
                      <button type="button" className="btn-icon btn-danger-icon" onClick={() => removeRelDraft(idx)} aria-label="Remove relationship">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAddRel ? (
              <div className="rel-add-form">
                <div className="rel-add-row">
                  <select value={newRelDirection} onChange={(e) => setNewRelDirection(e.target.value as 'outgoing' | 'incoming')}>
                    <option value="outgoing">→ Outgoing</option>
                    <option value="incoming">← Incoming</option>
                  </select>
                  <select value={newRelType} onChange={(e) => setNewRelType(e.target.value as EdgeType)}>
                    {ALL_EDGE_TYPES.map((t) => (
                      <option key={t} value={t}>{EDGE_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <select value={newRelTargetId} onChange={(e) => setNewRelTargetId(e.target.value)}>
                    <option value="">— Target Entity —</option>
                    {entities.filter((e) => e.id !== editing?.id).map((e) => (
                      <option key={e.id} value={e.id}>{e.name} [{e.kind}]</option>
                    ))}
                  </select>
                </div>
                <div className="rel-add-row">
                  <input
                    type="text"
                    value={newRelLabel}
                    onChange={(e) => setNewRelLabel(e.target.value)}
                    placeholder="Label (e.g. Makes API calls) *"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRelDraft(); } }}
                  />
                  <input
                    type="text"
                    value={newRelProtocol}
                    onChange={(e) => setNewRelProtocol(e.target.value)}
                    placeholder="Protocol (e.g. HTTPS)"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRelDraft(); } }}
                  />
                </div>
                <div className="rel-add-actions">
                  <button type="button" className="btn btn-sm" onClick={addRelDraft} disabled={!newRelTargetId || !newRelLabel.trim()}>
                    <Plus size={14} /> Add
                  </button>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setShowAddRel(false); resetNewRel(); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-sm" onClick={() => setShowAddRel(true)}>
                <Plus size={14} /> Add Relationship
              </button>
            )}
          </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowEntityForm(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
