import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { KIND_COLORS, MATURITY_COLORS } from '../../domain/types';
import type { ArchEntity, EntityKind, Maturity } from '../../domain/types';
import { Pencil, Copy, Trash2, ArrowUpDown, X } from 'lucide-react';

type SortField = 'name' | 'shortName' | 'kind' | 'description' | 'technology' | 'maturity' | 'owner';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortField; label: string; width?: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'shortName', label: 'Short Name', width: '110px' },
  { key: 'kind', label: 'Kind', width: '100px' },
  { key: 'maturity', label: 'Maturity', width: '90px' },
  { key: 'technology', label: 'Technology', width: '130px' },
  { key: 'owner', label: 'Owner', width: '120px' },
];

function getCellValue(entity: ArchEntity, field: SortField): string {
  switch (field) {
    case 'name': return entity.name;
    case 'shortName': return entity.shortName;
    case 'kind': return entity.kind;
    case 'description': return entity.description;
    case 'technology': return entity.metadata.technology ?? '';
    case 'maturity': return entity.metadata.maturity ?? '';
    case 'owner': return entity.metadata.owner ?? '';
  }
}

export const EntityListView: React.FC = () => {
  const entities = useStore((s) => s.entities);
  const selectedEntityId = useStore((s) => s.selectedEntityId);
  const selectEntity = useStore((s) => s.selectEntity);
  const setShowEntityForm = useStore((s) => s.setShowEntityForm);
  const duplicateEntity = useStore((s) => s.duplicateEntity);
  const deleteEntity = useStore((s) => s.deleteEntity);
  const toggleListView = useStore((s) => s.toggleListView);

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return field;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = entities;
    if (q) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.shortName.toLowerCase().includes(q) ||
          e.kind.toLowerCase().includes(q) ||
          (e.metadata.technology ?? '').toLowerCase().includes(q) ||
          (e.metadata.owner ?? '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const va = getCellValue(a, sortField).toLowerCase();
      const vb = getCellValue(b, sortField).toLowerCase();
      const cmp = va.localeCompare(vb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [entities, search, sortField, sortDir]);

  const handleDelete = useCallback((id: string, name: string) => {
    if (confirm(`Delete "${name}"? This will also remove all its relationships.`)) {
      deleteEntity(id);
    }
  }, [deleteEntity]);

  return (
    <div className="entity-list-view">
      <div className="entity-list-header">
        <h3 className="entity-list-title">Entities ({entities.length})</h3>
        <div className="entity-list-search">
          <input
            type="text"
            placeholder="Filter entities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="entity-list-search-input"
          />
        </div>
        <button className="entity-list-close-btn" onClick={toggleListView} title="Close list view" aria-label="Close list view">
          <X size={16} />
        </button>
      </div>

      <div className="entity-list-table-wrap">
        <table className="entity-list-table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={sortField === col.key ? `sorted sorted--${sortDir}` : ''}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="th-label">
                    {col.label}
                    <ArrowUpDown size={12} className="sort-icon" />
                  </span>
                </th>
              ))}
              <th className="actions-col" style={{ width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 1} className="entity-list-empty">No entities found</td></tr>
            )}
            {filtered.map((entity) => (
              <tr
                key={entity.id}
                className={`entity-list-row ${entity.id === selectedEntityId ? 'entity-list-row--selected' : ''}`}
                onClick={() => selectEntity(entity.id)}
              >
                <td className="entity-list-name">{entity.name}</td>
                <td>{entity.shortName}</td>
                <td>
                  <KindBadge kind={entity.kind} />
                </td>
                <td>
                  {entity.metadata.maturity && <MaturityBadge maturity={entity.metadata.maturity} />}
                </td>
                <td className="entity-list-tech">{entity.metadata.technology ?? ''}</td>
                <td>{entity.metadata.owner ?? ''}</td>
                <td className="entity-list-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="entity-list-action-btn"
                    title="Edit"
                    aria-label={`Edit ${entity.name}`}
                    onClick={() => setShowEntityForm(true, entity.id)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="entity-list-action-btn"
                    title="Duplicate"
                    aria-label={`Duplicate ${entity.name}`}
                    onClick={() => duplicateEntity(entity.id)}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    className="entity-list-action-btn entity-list-action-btn--danger"
                    title="Delete"
                    aria-label={`Delete ${entity.name}`}
                    onClick={() => handleDelete(entity.id, entity.name)}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const KindBadge: React.FC<{ kind: EntityKind }> = ({ kind }) => (
  <span className="entity-list-badge" style={{ background: KIND_COLORS[kind] }}>
    {kind}
  </span>
);

const MaturityBadge: React.FC<{ maturity: Maturity }> = ({ maturity }) => (
  <span className="entity-list-badge entity-list-badge--maturity" style={{ background: MATURITY_COLORS[maturity] }}>
    {maturity}
  </span>
);
