import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { KIND_COLORS, MATURITY_COLORS } from '../../domain/types';
import type { ArchEntity, EntityKind, Maturity, Relationship } from '../../domain/types';
import { exportEntitiesCsv, exportExcel } from '../../export/exportService';
import { ConfirmDialog } from '../shared/ConfirmDialog';
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

const truncName = (n: string, max = 80) => n.length > max ? `${n.slice(0, max)}…` : n;

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

function isSafeUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:';
  } catch { return false; }
}

function renderCell(entity: ArchEntity, col: ColKey, parentName: string): React.ReactNode {
  switch (col) {
    case 'name':             return <span className="entity-list-name" title={entity.name}>{entity.name}</span>;
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
    case 'url':              return entity.metadata.url && isSafeUrl(entity.metadata.url) ? <a href={entity.metadata.url} target="_blank" rel="noopener noreferrer" className="entity-list-link" title={entity.metadata.url}>↗</a> : null;
    case 'codeRepository':   return entity.metadata.codeRepository && isSafeUrl(entity.metadata.codeRepository) ? <a href={entity.metadata.codeRepository} target="_blank" rel="noopener noreferrer" className="entity-list-link" title={entity.metadata.codeRepository}>↗</a> : null;
    case 'adrUrl':           return entity.metadata.adrUrl && isSafeUrl(entity.metadata.adrUrl) ? <a href={entity.metadata.adrUrl} target="_blank" rel="noopener noreferrer" className="entity-list-link" title={entity.metadata.adrUrl}>↗</a> : null;
    case 'notes':            return <span className="entity-list-trunc-cell" title={entity.metadata.notes ?? ''}>{entity.metadata.notes ?? ''}</span>;
  }
}

export const EntityListView: React.FC = () => {
  const entities        = useStore((s) => s.entities);
  const relationships   = useStore((s) => s.relationships);
  const setShowEntityForm = useStore((s) => s.setShowEntityForm);
  const duplicateEntity = useStore((s) => s.duplicateEntity);
  const deleteEntity    = useStore((s) => s.deleteEntity);
  const setViewMode     = useStore((s) => s.setViewMode);

  const [search,        setSearch]        = useState('');
  const [deferredSearch, setDeferredSearch] = useState('');
  const [sortField,     setSortField]     = useState<ColKey>('name');
  const [sortDir,       setSortDir]       = useState<SortDir>('asc');
  const [expandedIds,   setExpandedIds]   = useState<Set<string>>(new Set());
  const [checkedIds,    setCheckedIds]    = useState<Set<string>>(new Set());
  const [visibleCols,   setVisibleCols]   = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE));
  const [colWidths,     setColWidths]     = useState<Record<ColKey, number>>(DEFAULT_WIDTHS);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [colFilters,    setColFilters]    = useState<Partial<Record<ColKey, string>>>({});
  const [confirmState, setConfirmState]   = useState<{ message: string; detail?: string; onConfirm: () => void } | null>(null);

  const activeColFilterCount = useMemo(
    () => Object.values(colFilters).filter(v => v && v.trim()).length,
    [colFilters],
  );

  const resizingRef     = useRef<{ key: ColKey; startX: number; startW: number } | null>(null);
  const colPickerRef    = useRef<HTMLDivElement>(null);
  const colPickerBtnRef = useRef<HTMLButtonElement>(null);

  // Column resize
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { key, startX, startW } = resizingRef.current;
      setColWidths(prev => ({ ...prev, [key]: Math.max(50, startW + (e.clientX - startX)) }));
    };
    const onUp = () => { resizingRef.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  // Close column picker on outside click
  useEffect(() => {
    if (!colPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (!colPickerRef.current?.contains(e.target as Node) &&
          !colPickerBtnRef.current?.contains(e.target as Node)) setColPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colPickerOpen]);

  // Debounce filtering for large entity lists
  useEffect(() => {
    const t = setTimeout(() => setDeferredSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const startResize = (e: React.MouseEvent, key: ColKey) => {
    e.preventDefault(); e.stopPropagation();
    resizingRef.current = { key, startX: e.clientX, startW: colWidths[key] };
  };

  const toggleColVisibility = (key: ColKey) => {
    const col = ALL_COLUMNS.find(c => c.key === key);
    if (col?.alwaysVisible) return;
    setVisibleCols(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };

  const entityMap = useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  );

  const toggleSort = (field: ColKey) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase();
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
    // Per-column filters
    const activeColFilters = (Object.entries(colFilters) as [ColKey, string][]).filter(([, v]) => v && v.trim());
    if (activeColFilters.length > 0) {
      list = list.filter(e =>
        activeColFilters.every(([col, val]) =>
          getCellText(e, col, entityMap).toLowerCase().includes(val.toLowerCase())
        )
      );
    }

    return [...list].sort((a, b) => {
      const va = getCellText(a, sortField, entityMap).toLowerCase();
      const vb = getCellText(b, sortField, entityMap).toLowerCase();
      const cmp = va.localeCompare(vb, undefined, { sensitivity: 'base', numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [entities, deferredSearch, sortField, sortDir, entityMap, colFilters]);

  // O(1) relationship lookup
  const relIndex = useMemo(() => {
    const idx = new Map<string, { out: typeof relationships; in: typeof relationships }>();
    for (const r of relationships) {
      if (!idx.has(r.sourceId)) idx.set(r.sourceId, { out: [], in: [] });
      if (!idx.has(r.targetId)) idx.set(r.targetId, { out: [], in: [] });
      idx.get(r.sourceId)!.out.push(r);
      idx.get(r.targetId)!.in.push(r);
    }
    return idx;
  }, [relationships]);

  const visibleColDefs = useMemo(
    () => ALL_COLUMNS.filter(c => visibleCols.has(c.key)),
    [visibleCols],
  );

  const TOTAL_COLS = visibleColDefs.length + 3; // chevron + checkbox + visible + actions

  const allChecked  = filtered.length > 0 && filtered.every((e) => checkedIds.has(e.id));
  const someChecked = filtered.some((e) => checkedIds.has(e.id));

  const toggleCheckAll = () =>
    setCheckedIds(allChecked ? new Set() : new Set(filtered.map((e) => e.id)));

  const toggleCheck = useCallback((id: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    }), []);

  const toggleExpand = useCallback((id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    }), []);

  const handleEdit  = useCallback((id: string) => setShowEntityForm(true, id), [setShowEntityForm]);
  const handleClone = useCallback((id: string) => duplicateEntity(id), [duplicateEntity]);

  const handleDelete = useCallback((id: string, name: string) => {
    setConfirmState({
      message: `Delete "${truncName(name)}"?`,
      detail: 'This will also remove all its relationships.',
      onConfirm: () => {
        deleteEntity(id);
        setCheckedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
        setConfirmState(null);
      },
    });
  }, [deleteEntity]);

  const handleBulkDelete = () => {
    const ids   = [...checkedIds];
    const names = ids.map((id) => truncName(entityMap.get(id)?.name ?? id, 40));
    const preview = names.slice(0, 5).join(', ') + (names.length > 5 ? '…' : '');
    setConfirmState({
      message: `Delete ${ids.length} ${ids.length === 1 ? 'entity' : 'entities'}?`,
      detail: preview,
      onConfirm: () => {
        ids.forEach((id) => deleteEntity(id));
        setCheckedIds(new Set());
        setConfirmState(null);
      },
    });
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
      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          detail={confirmState.detail}
          confirmLabel="Delete"
          danger
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

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
            maxLength={200}
          />
          {search && (
            <button
              className="entity-list-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              tabIndex={-1}
            >
              <X size={11} />
            </button>
          )}
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

          {activeColFilterCount > 0 && (
            <button
              className="elv-btn elv-btn--filter-active"
              onClick={() => setColFilters({})}
              title="Clear all column filters"
            >
              <X size={13} /> Filters ({activeColFilterCount})
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

          {/* ── Column picker ──────────────────────────────────── */}
          <div style={{ position: 'relative' }}>
            <button
              ref={colPickerBtnRef}
              className={`elv-btn${colPickerOpen ? ' elv-btn--active' : ''}`}
              onClick={() => setColPickerOpen(o => !o)}
              title="Choose visible columns"
              aria-label="Choose visible columns"
              aria-expanded={colPickerOpen}
            >
              <Columns size={13} /> Columns
            </button>
            {colPickerOpen && (
              <div ref={colPickerRef} className="elv-col-picker">
                {ALL_COLUMNS.map(col => (
                  <label key={col.key} className="elv-col-picker-item">
                    <input
                      type="checkbox"
                      checked={visibleCols.has(col.key)}
                      disabled={col.alwaysVisible}
                      onChange={() => toggleColVisibility(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          className="entity-list-close-btn"
          onClick={() => setViewMode('architecture')}
          title="Back to diagram"
          aria-label="Close list view"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="entity-list-table-wrap">
        <table className="entity-list-table">
          <colgroup>
            <col style={{ width: 32 }} />
            <col style={{ width: 36 }} />
            {visibleColDefs.map(col => (
              <col key={col.key} style={{ width: colWidths[col.key] }} />
            ))}
            <col style={{ width: 88 }} />
          </colgroup>
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
              {visibleColDefs.map((col) => (
                <th
                  key={col.key}
                  className={`elv-th${sortField === col.key ? ` sorted sorted--${sortDir}` : ''}${colFilters[col.key] ? ' elv-th--filtered' : ''}`}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="th-label">
                    {col.label}
                    <ArrowUpDown size={11} className="sort-icon" />
                  </span>
                  <div
                    className="elv-resize-handle"
                    onMouseDown={(e) => startResize(e, col.key)}
                  />
                </th>
              ))}
              <th className="actions-col">Actions</th>
            </tr>

            {/* ── Per-column filter row ─────────────────────── */}
            <tr className="elv-filter-row">
              <th className="col-chevron" />
              <th className="col-check" />
              {visibleColDefs.map(col => (
                <th key={col.key} className="elv-filter-cell">
                  <div className="elv-filter-cell-inner">
                    <input
                      type="text"
                      className={`elv-filter-input${colFilters[col.key] ? ' elv-filter-input--active' : ''}`}
                      value={colFilters[col.key] ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        setColFilters(prev => {
                          const next = { ...prev };
                          if (val) next[col.key] = val;
                          else delete next[col.key];
                          return next;
                        });
                      }}
                      placeholder="filter…"
                      aria-label={`Filter ${col.label}`}
                    />
                    {colFilters[col.key] && (
                      <button
                        className="elv-filter-clear"
                        onClick={() => setColFilters(prev => { const next = { ...prev }; delete next[col.key]; return next; })}
                        aria-label={`Clear ${col.label} filter`}
                        tabIndex={-1}
                      >
                        <X size={9} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="actions-col" />
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={TOTAL_COLS} className="entity-list-empty">
                  {entities.length === 0
                    ? 'No entities yet \u2014 click Add to create one'
                    : `No entities match \u201c${deferredSearch.length > 50 ? deferredSearch.slice(0, 50) + '\u2026' : deferredSearch}\u201d`
                  }
                </td>
              </tr>
            )}

            {filtered.map((entity) => {
              const isExpanded = expandedIds.has(entity.id);
              const isChecked  = checkedIds.has(entity.id);
              const parentName = entity.parentId
                ? (entityMap.get(entity.parentId)?.name ?? entity.parentName ?? '')
                : (entity.parentName ?? '');
              const rels     = relIndex.get(entity.id);
              const outgoing = rels?.out ?? [];
              const incoming = rels?.in ?? [];
              return (
                <EntityRow
                  key={entity.id}
                  entity={entity}
                  isChecked={isChecked}
                  isExpanded={isExpanded}
                  parentName={parentName}
                  outgoing={outgoing}
                  incoming={incoming}
                  entityMap={entityMap}
                  visibleColDefs={visibleColDefs}
                  totalCols={TOTAL_COLS}
                  onToggleCheck={toggleCheck}
                  onToggleExpand={toggleExpand}
                  onEdit={handleEdit}
                  onClone={handleClone}
                  onDelete={handleDelete}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ── Memoized row ─────────────────────────────────────────────── */

interface EntityRowProps {
  entity:         ArchEntity;
  isChecked:      boolean;
  isExpanded:     boolean;
  parentName:     string;
  outgoing:       Relationship[];
  incoming:       Relationship[];
  entityMap:      Map<string, ArchEntity>;
  visibleColDefs: ColDef[];
  totalCols:      number;
  onToggleCheck:  (id: string) => void;
  onToggleExpand: (id: string) => void;
  onEdit:         (id: string) => void;
  onClone:        (id: string) => void;
  onDelete:       (id: string, name: string) => void;
}

const EntityRow = React.memo(function EntityRow({
  entity, isChecked, isExpanded, parentName, outgoing, incoming, entityMap,
  visibleColDefs, totalCols, onToggleCheck, onToggleExpand, onEdit, onClone, onDelete,
}: EntityRowProps) {
  const hasDetail =
    !!entity.description                         ||
    entity.responsibilities.length > 0           ||
    (entity.metadata.tags?.length ?? 0) > 0     ||
    outgoing.length > 0                          ||
    incoming.length > 0                          ||
    !!(entity.metadata.size || entity.metadata.appType || entity.metadata.url ||
       entity.metadata.codeRepository || entity.metadata.adrUrl);

  return (
    <React.Fragment>
      <tr
        className={`entity-list-row${isChecked ? ' entity-list-row--checked' : ''}`}
        onDoubleClick={() => onEdit(entity.id)}
        style={{ cursor: 'default' }}
      >
        <td className="col-chevron">
          {hasDetail && (
            <button
              className="entity-list-expand-btn"
              onClick={() => onToggleExpand(entity.id)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
            >
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          )}
        </td>

        <td className="col-check" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggleCheck(entity.id)}
            aria-label={`Select ${entity.name.length > 60 ? entity.name.slice(0, 60) + '…' : entity.name}`}
          />
        </td>

        {visibleColDefs.map(col => (
          <td key={col.key}>{renderCell(entity, col.key, parentName)}</td>
        ))}

        <td className="entity-list-actions" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          <button
            className="entity-list-action-btn"
            title="Edit"
            aria-label={`Edit ${entity.name}`}
            onClick={() => onEdit(entity.id)}
          >
            <Pencil size={13} />
          </button>
          <button
            className="entity-list-action-btn"
            title="Clone"
            aria-label={`Clone ${entity.name}`}
            onClick={() => onClone(entity.id)}
          >
            <Copy size={13} />
          </button>
          <button
            className="entity-list-action-btn entity-list-action-btn--danger"
            title="Delete"
            aria-label={`Delete ${entity.name}`}
            onClick={() => onDelete(entity.id, entity.name)}
          >
            <Trash2 size={13} />
          </button>
        </td>
      </tr>

      {isExpanded && (
        <tr className="entity-list-detail-row">
          <td colSpan={totalCols}>
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
});

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
    {isUrl && isSafeUrl(value) ? (
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
