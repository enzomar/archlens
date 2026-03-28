import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { KIND_COLORS, MATURITY_COLORS } from '../../domain/types';
import type { ArchEntity, EntityKind, Maturity } from '../../domain/types';
import { exportEntitiesCsv, exportExcel } from '../../export/exportService';
import {
  Pencil, Copy, Trash2, ArrowUpDown, X,
  ChevronDown, ChevronRight, Plus, FileText, Table2, Columns,
} from 'lucide-react';

// ─── Column definitions ───────────────────────────────────────────

type ColKey =
  | 'name' | 'shortName' | 'kind' | 'viewpoint' | 'zoomLevel' | 'maturity'
  | 'technology' | 'owner' | 'deploymentStage' | 'parent'
  | 'identificationId' | 'description' | 'size' | 'appType' | 'techConvergency'
  | 'tps' | 'compute' | 'pii' | 'pciDss' | 'url' | 'codeRepository' | 'adrUrl' | 'notes';

type SortDir = 'asc' | 'desc';

interface ColDef {
  key: ColKey;
  label: string;
  defaultWidth: number;
  defaultVisible: boolean;
  alwaysVisible?: boolean;
}

const ALL_COLUMNS: ColDef[] = [
  { key: 'name',            label: 'Name',         defaultWidth: 200, defaultVisible: true,  alwaysVisible: true },
  { key: 'shortName',       label: 'Short Name',   defaultWidth: 110, defaultVisible: true  },
  { key: 'kind',            label: 'Kind',         defaultWidth: 110, defaultVisible: true  },
  { key: 'viewpoint',       label: 'Viewpoint',    defaultWidth: 100, defaultVisible: true  },
  { key: 'zoomLevel',       label: 'Zoom Level',   defaultWidth: 100, defaultVisible: false },
  { key: 'maturity',        label: 'Maturity',     defaultWidth: 90,  defaultVisible: true  },
  { key: 'technology',      label: 'Technology',   defaultWidth: 130, defaultVisible: true  },
  { key: 'owner',           label: 'Owner',        defaultWidth: 130, defaultVisible: true  },
  { key: 'deploymentStage', label: 'Stage',        defaultWidth: 90,  defaultVisible: true  },
  { key: 'parent',          label: 'Parent',       defaultWidth: 130, defaultVisible: true  },
  { key: 'identificationId',label: 'ID',           defaultWidth: 120, defaultVisible: false },
  { key: 'description',     label: 'Description',  defaultWidth: 220, defaultVisible: false },
  { key: 'size',            label: 'Size',         defaultWidth: 80,  defaultVisible: false },
  { key: 'appType',         label: 'App Type',     defaultWidth: 100, defaultVisible: false },
  { key: 'techConvergency', label: 'Tech Conv.',   defaultWidth: 90,  defaultVisible: false },
  { key: 'tps',             label: 'TPS',          defaultWidth: 70,  defaultVisible: false },
  { key: 'compute',         label: 'Compute',      defaultWidth: 80,  defaultVisible: false },
  { key: 'pii',             label: 'PII',          defaultWidth: 60,  defaultVisible: false },
  { key: 'pciDss',          label: 'PCI DSS',      defaultWidth: 70,  defaultVisible: false },
  { key: 'url',             label: 'URL',          defaultWidth: 140, defaultVisible: false },
  { key: 'codeRepository',  label: 'Repository',   defaultWidth: 130, defaultVisible: false },
  { key: 'adrUrl',          label: 'ADR',          defaultWidth: 100, defaultVisible: false },
  { key: 'notes',           label: 'Notes',        defaultWidth: 180, defaultVisible: false },
];

const DEFAULT_WIDTHS = Object.fromEntries(
  ALL_COLUMNS.map(c => [c.key, c.defaultWidth])) as Record<ColKey, number>;
const DEFAULT_VISIBLE = new Set<ColKey>(
  ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key));

// ─── Pure module-level helpers ────────────────────────────────────

function getCellText(entity: ArchEntity, field: ColKey, entityMap: Map<string, ArchEntity>): string {
  switch (field) {
    case 'name':             return entity.name;
    case 'shortName':        return entity.shortName;
    case 'kind':             return entity.kind;
    case 'viewpoint':        return entity.viewpoint;
    case 'zoomLevel':        return entity.zoomLevel ?? '';
    case 'maturity':         return entity.metadata.maturity ?? '';
    case 'technology':       return entity.metadata.technology ?? '';
    case 'owner':            return entity.metadata.owner ?? '';
    case 'deploymentStage':  return entity.metadata.deploymentStage ?? '';
    case 'parent':           return (entity.parentId ? entityMap.get(entity.parentId)?.name : entity.parentName) ?? '';
    case 'identificationId': return entity.identificationId ?? '';
    case 'description':      return entity.description;
    case 'size':             return entity.metadata.size ?? '';
    case 'appType':          return entity.metadata.appType ?? '';
    case 'techConvergency':  return entity.metadata.techConvergency != null ? String(entity.metadata.techConvergency) : '';
    case 'tps':              return entity.metadata.tps != null ? String(entity.metadata.tps) : '';
    case 'compute':          return entity.metadata.compute ?? '';
    case 'pii':              return entity.metadata.pii ? 'Yes' : '';
    case 'pciDss':           return entity.metadata.pciDss ? 'Yes' : '';
    case 'url':              return entity.metadata.url ?? '';
    case 'codeRepository':   return entity.metadata.codeRepository ?? '';
    case 'adrUrl':           return entity.metadata.adrUrl ?? '';
    case 'notes':            return entity.metadata.notes ?? '';
  }
}

function renderCell(entity: ArchEntity, col: ColKey, parentName: string): React.ReactNode {
  switch (col) {
    case 'name':             return <span className="entity-list-name">{entity.name}</span>;
    case 'shortName':        return entity.shortName;
    case 'kind':             return <KindBadge kind={entity.kind} />;
    case 'viewpoint':        return <span className="entity-list-viewpoint">{entity.viewpoint}</span>;
    case 'zoomLevel':        return entity.zoomLevel ?? '';
    case 'maturity':         return entity.metadata.maturity ? <MaturityBadge maturity={entity.metadata.maturity} /> : null;
    case 'technology':       return <span className="entity-list-tech">{entity.metadata.technology ?? ''}</span>;
    case 'owner':            return entity.metadata.owner ?? '';
    case 'deploymentStage':  return entity.metadata.deploymentStage ?? '';
    case 'parent':           return parentName;
    case 'identificationId': return <span className="entity-list-mono-cell">{entity.identificationId ?? ''}</span>;
    case 'description':      return <span className="entity-list-trunc-cell" title={entity.description}>{entity.description}</span>;
    case 'size':             return entity.metadata.size ?? '';
    case 'appType':          return entity.metadata.appType ?? '';
    case 'techConvergency':  return entity.metadata.techConvergency != null ? String(entity.metadata.techConvergency) : '';
    case 'tps':              return entity.metadata.tps != null ? String(entity.metadata.tps) : '';
    case 'compute':          return entity.metadata.compute ?? '';
    case 'pii':              return entity.metadata.pii  ? <span className="elv-flag elv-flag--danger">PII</span>  : null;
    case 'pciDss':           return entity.metadata.pciDss ? <span className="elv-flag elv-flag--warning">PCI</span> : null;
    case 'url':              return entity.metadata.url ? <a href={entity.metadata.url} target="_blank" rel="noopener noreferrer" className="entity-list-link" title={entity.metadata.url}>↗</a> : null;
    case 'codeRepository':   return entity.metadata.codeRepository ? <a href={entity.metadata.codeRepository} target="_blank" rel="noopener noreferrer" className="entity-list-link" title={entity.metadata.codeRepository}>↗</a> : null;
    case 'adrUrl':           return entity.metadata.adrUrl ? <a href={entity.metadata.adrUrl} target="_blank" rel="noopener noreferrer" className="entity-list-link" title={entity.metadata.adrUrl}>↗</a> : null;
    case 'notes':            return <span className="entity-list-trunc-cell" title={entity.metadata.notes ?? ''}>{entity.metadata.notes ?? ''}</span>;
  }
}

export const EntityListView: React.FC = () => {
  const entities        = useStore((s) => s.entities);
  const relationships   = useStore((s) => s.relationships);
  const setShowEntityForm = useStore((s) => s.setShowEntityForm);
  const duplicateEntity = useStore((s) => s.duplicateEntity);
  const deleteEntity    = useStore((s) => s.deleteEntity);
  const toggleListView  = useStore((s) => s.toggleListView);

  const [search,      setSearch]      = useState('');
  const [sortField,   setSortField]   = useState<SortField>('name');
  const [sortDir,     setSortDir]     = useState<SortDir>('asc');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [checkedIds,  setCheckedIds]  = useState<Set<string>>(new Set());

  const entityMap = useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  );

  const getCellVal = useCallback(
    (entity: ArchEntity, field: SortField): string => {
      switch (field) {
        case 'name':            return entity.name;
        case 'shortName':       return entity.shortName;
        case 'kind':            return entity.kind;
        case 'viewpoint':       return entity.viewpoint;
        case 'maturity':        return entity.metadata.maturity ?? '';
        case 'technology':      return entity.metadata.technology ?? '';
        case 'owner':           return entity.metadata.owner ?? '';
        case 'deploymentStage': return entity.metadata.deploymentStage ?? '';
        case 'parent':          return (entity.parentId ? entityMap.get(entity.parentId)?.name : entity.parentName) ?? '';
      }
    },
    [entityMap],
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = entities;
    if (q) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q)                         ||
          e.shortName.toLowerCase().includes(q)                    ||
          e.kind.toLowerCase().includes(q)                         ||
          e.description.toLowerCase().includes(q)                  ||
          (e.metadata.technology ?? '').toLowerCase().includes(q)  ||
          (e.metadata.owner ?? '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const va = getCellVal(a, sortField).toLowerCase();
      const vb = getCellVal(b, sortField).toLowerCase();
      const cmp = va.localeCompare(vb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [entities, search, sortField, sortDir, getCellVal]);

  const allChecked  = filtered.length > 0 && filtered.every((e) => checkedIds.has(e.id));
  const someChecked = filtered.some((e) => checkedIds.has(e.id));

  const toggleCheckAll = () =>
    setCheckedIds(allChecked ? new Set() : new Set(filtered.map((e) => e.id)));

  const toggleCheck = (id: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will also remove all its relationships.`)) return;
    deleteEntity(id);
    setCheckedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleBulkDelete = () => {
    const ids   = [...checkedIds];
    const names = ids.map((id) => entityMap.get(id)?.name ?? id);
    if (!confirm(`Delete ${ids.length} ${ids.length === 1 ? 'entity' : 'entities'}?\n${names.slice(0, 5).join(', ')}${names.length > 5 ? '…' : ''}`)) return;
    ids.forEach((id) => deleteEntity(id));
    setCheckedIds(new Set());
  };

  const selectedEntities = useMemo(
    () => entities.filter((e) => checkedIds.has(e.id)),
    [entities, checkedIds],
  );

  const handleExportCsv = () =>
    exportEntitiesCsv(checkedIds.size > 0 ? selectedEntities : entities);

  const handleExportExcel = () =>
    exportExcel(
      checkedIds.size > 0 ? selectedEntities : entities,
      relationships.filter(
        (r) => checkedIds.size === 0 || checkedIds.has(r.sourceId) || checkedIds.has(r.targetId),
      ),
    );

  return (
    <div className="entity-list-view">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="entity-list-header">
        <h3 className="entity-list-title">Entities ({entities.length})</h3>

        <div className="entity-list-search">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="entity-list-search-input"
            aria-label="Search entities"
          />
        </div>

        <div className="entity-list-toolbar">
          <button
            className="elv-btn elv-btn--accent"
            onClick={() => setShowEntityForm(true)}
            title="Add entity"
          >
            <Plus size={13} /> Add
          </button>

          {checkedIds.size > 0 && (
            <button
              className="elv-btn elv-btn--danger"
              onClick={handleBulkDelete}
              title={`Delete ${checkedIds.size} selected`}
            >
              <Trash2 size={13} /> Delete ({checkedIds.size})
            </button>
          )}

          <button className="elv-btn" onClick={handleExportCsv} title="Export to CSV">
            <FileText size={13} />
            {checkedIds.size > 0 ? `CSV (${checkedIds.size})` : 'CSV'}
          </button>
          <button className="elv-btn" onClick={handleExportExcel} title="Export to Excel/TSV">
            <Table2 size={13} />
            {checkedIds.size > 0 ? `Excel (${checkedIds.size})` : 'Excel'}
          </button>
        </div>

        <button
          className="entity-list-close-btn"
          onClick={toggleListView}
          title="Back to diagram"
          aria-label="Close list view"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="entity-list-table-wrap">
        <table className="entity-list-table">
          <thead>
            <tr>
              <th className="col-chevron" aria-label="Expand" />
              <th className="col-check">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                  onChange={toggleCheckAll}
                  aria-label="Select all"
                />
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={sortField === col.key ? `sorted sorted--${sortDir}` : ''}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="th-label">
                    {col.label}
                    <ArrowUpDown size={11} className="sort-icon" />
                  </span>
                </th>
              ))}
              <th className="actions-col" style={{ width: '88px' }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={TOTAL_COLS} className="entity-list-empty">No entities found</td>
              </tr>
            )}

            {filtered.map((entity) => {
              const isExpanded = expandedIds.has(entity.id);
              const isChecked  = checkedIds.has(entity.id);
              const parentName = entity.parentId
                ? (entityMap.get(entity.parentId)?.name ?? entity.parentName ?? '')
                : (entity.parentName ?? '');
              const outgoing = relationships.filter((r) => r.sourceId === entity.id);
              const incoming = relationships.filter((r) => r.targetId === entity.id);
              const hasDetail =
                !!entity.description                         ||
                entity.responsibilities.length > 0           ||
                (entity.metadata.tags?.length ?? 0) > 0     ||
                outgoing.length > 0                          ||
                incoming.length > 0                          ||
                !!(entity.metadata.size || entity.metadata.appType || entity.metadata.url ||
                   entity.metadata.codeRepository || entity.metadata.adrUrl);

              return (
                <React.Fragment key={entity.id}>
                  <tr className={`entity-list-row${isChecked ? ' entity-list-row--checked' : ''}`}>

                    <td className="col-chevron">
                      {hasDetail && (
                        <button
                          className="entity-list-expand-btn"
                          onClick={() => toggleExpand(entity.id)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                        >
                          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                      )}
                    </td>

                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCheck(entity.id)}
                        aria-label={`Select ${entity.name}`}
                      />
                    </td>

                    <td className="entity-list-name">{entity.name}</td>
                    <td>{entity.shortName}</td>
                    <td><KindBadge kind={entity.kind} /></td>
                    <td className="entity-list-viewpoint">{entity.viewpoint}</td>
                    <td>{entity.metadata.maturity && <MaturityBadge maturity={entity.metadata.maturity} />}</td>
                    <td className="entity-list-tech">{entity.metadata.technology ?? ''}</td>
                    <td>{entity.metadata.owner ?? ''}</td>
                    <td>{entity.metadata.deploymentStage ?? ''}</td>
                    <td>{parentName}</td>

                    <td className="entity-list-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="entity-list-action-btn"
                        title="Edit"
                        aria-label={`Edit ${entity.name}`}
                        onClick={() => setShowEntityForm(true, entity.id)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="entity-list-action-btn"
                        title="Clone"
                        aria-label={`Clone ${entity.name}`}
                        onClick={() => duplicateEntity(entity.id)}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        className="entity-list-action-btn entity-list-action-btn--danger"
                        title="Delete"
                        aria-label={`Delete ${entity.name}`}
                        onClick={() => handleDelete(entity.id, entity.name)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="entity-list-detail-row">
                      <td colSpan={TOTAL_COLS}>
                        <div className="entity-detail-panel">

                          {entity.description && (
                            <div className="entity-detail-section">
                              <span className="entity-detail-label">Description</span>
                              <p className="entity-detail-text">{entity.description}</p>
                            </div>
                          )}

                          {entity.responsibilities.length > 0 && (
                            <div className="entity-detail-section">
                              <span className="entity-detail-label">Responsibilities</span>
                              <ul className="entity-detail-list">
                                {entity.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          )}

                          {(entity.metadata.tags?.length ?? 0) > 0 && (
                            <div className="entity-detail-section">
                              <span className="entity-detail-label">Tags</span>
                              <div className="entity-detail-tags">
                                {entity.metadata.tags.map((tag) => (
                                  <span key={tag} className="entity-detail-tag">{tag}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {(entity.metadata.size || entity.metadata.appType || entity.metadata.techConvergency ||
                            entity.metadata.tps || entity.metadata.compute || entity.metadata.pii ||
                            entity.metadata.pciDss || entity.metadata.url || entity.metadata.codeRepository ||
                            entity.metadata.adrUrl) && (
                            <div className="entity-detail-section">
                              <span className="entity-detail-label">Metadata</span>
                              <div className="entity-detail-meta-grid">
                                {entity.metadata.size          && <MetaItem label="Size"      value={entity.metadata.size} />}
                                {entity.metadata.appType       && <MetaItem label="App Type"  value={entity.metadata.appType} />}
                                {entity.metadata.techConvergency && <MetaItem label="Tech Conv." value={String(entity.metadata.techConvergency)} />}
                                {entity.metadata.tps           && <MetaItem label="TPS"       value={String(entity.metadata.tps)} />}
                                {entity.metadata.compute       && <MetaItem label="Compute"   value={entity.metadata.compute} />}
                                {entity.metadata.pii           && <MetaItem label="PII"       value="Yes" highlight />}
                                {entity.metadata.pciDss        && <MetaItem label="PCI DSS"   value="Yes" highlight />}
                                {entity.metadata.url           && <MetaItem label="URL"        value={entity.metadata.url} isUrl />}
                                {entity.metadata.codeRepository && <MetaItem label="Repo"     value={entity.metadata.codeRepository} isUrl />}
                                {entity.metadata.adrUrl        && <MetaItem label="ADR"        value={entity.metadata.adrUrl} isUrl />}
                              </div>
                            </div>
                          )}

                          {(outgoing.length > 0 || incoming.length > 0) && (
                            <div className="entity-detail-section">
                              <span className="entity-detail-label">
                                Relationships ({outgoing.length + incoming.length})
                              </span>
                              <table className="entity-detail-rels-table">
                                <thead>
                                  <tr>
                                    <th>Dir</th>
                                    <th>Entity</th>
                                    <th>Type</th>
                                    <th>Label</th>
                                    <th>Protocol</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {outgoing.map((r) => (
                                    <tr key={r.id}>
                                      <td><span className="rel-dir rel-dir--out">→ out</span></td>
                                      <td>{entityMap.get(r.targetId)?.name ?? r.targetId}</td>
                                      <td><span className="rel-type">{r.type}</span></td>
                                      <td>{r.label}</td>
                                      <td>{r.protocol ?? '—'}</td>
                                    </tr>
                                  ))}
                                  {incoming.map((r) => (
                                    <tr key={r.id}>
                                      <td><span className="rel-dir rel-dir--in">← in</span></td>
                                      <td>{entityMap.get(r.sourceId)?.name ?? r.sourceId}</td>
                                      <td><span className="rel-type">{r.type}</span></td>
                                      <td>{r.label}</td>
                                      <td>{r.protocol ?? '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ── Sub-components ───────────────────────────────────────────── */

const KindBadge: React.FC<{ kind: EntityKind }> = ({ kind }) => (
  <span className="entity-list-badge" style={{ background: KIND_COLORS[kind] }}>{kind}</span>
);

const MaturityBadge: React.FC<{ maturity: Maturity }> = ({ maturity }) => (
  <span className="entity-list-badge entity-list-badge--maturity" style={{ background: MATURITY_COLORS[maturity] }}>
    {maturity}
  </span>
);

const MetaItem: React.FC<{ label: string; value: string; highlight?: boolean; isUrl?: boolean }> = ({
  label, value, highlight, isUrl,
}) => (
  <div className="entity-detail-meta-item">
    <span className="entity-detail-meta-key">{label}</span>
    {isUrl ? (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="entity-detail-meta-val entity-detail-meta-link"
      >
        {value}
      </a>
    ) : (
      <span className={`entity-detail-meta-val${highlight ? ' entity-detail-meta-val--highlight' : ''}`}>
        {value}
      </span>
    )}
  </div>
);
