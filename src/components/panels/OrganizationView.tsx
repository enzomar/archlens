import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import {
  KIND_COLORS,
  VIEWPOINT_COLORS,
  VIEWPOINT_BG_COLORS,
  VIEWPOINT_LABELS,
} from '../../domain/types';
import type { ArchEntity, Viewpoint } from '../../domain/types';
import {
  ChevronDown, ChevronRight, Search, Users, Layers, Network,
  Pencil, Building2,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────

const UNASSIGNED = 'Unassigned';

function groupByOwner(entities: ArchEntity[]): Map<string, ArchEntity[]> {
  const map = new Map<string, ArchEntity[]>();
  for (const e of entities) {
    const owner = e.metadata.owner?.trim() || UNASSIGNED;
    const list = map.get(owner);
    if (list) list.push(e);
    else map.set(owner, [e]);
  }
  return map;
}

function groupByViewpoint(entities: ArchEntity[]): Map<Viewpoint, ArchEntity[]> {
  const map = new Map<Viewpoint, ArchEntity[]>();
  for (const e of entities) {
    const list = map.get(e.viewpoint);
    if (list) list.push(e);
    else map.set(e.viewpoint, [e]);
  }
  return map;
}

/** Build parent→children index. */
function buildChildIndex(entities: ArchEntity[]): Map<string, ArchEntity[]> {
  const map = new Map<string, ArchEntity[]>();
  for (const e of entities) {
    if (!e.parentId) continue;
    const list = map.get(e.parentId);
    if (list) list.push(e);
    else map.set(e.parentId, [e]);
  }
  return map;
}

function kindLabel(kind: string): string {
  return kind
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Sub-components ───────────────────────────────────────────────

type TabId = 'ownership' | 'domains' | 'hierarchy';

const KindBadge: React.FC<{ kind: string }> = ({ kind }) => (
  <span
    className="org-kind-badge"
    style={{ borderColor: KIND_COLORS[kind as keyof typeof KIND_COLORS] ?? 'var(--border)' }}
  >
    {kindLabel(kind)}
  </span>
);

/** A single entity row (clickable). */
const EntityRow: React.FC<{
  entity: ArchEntity;
  onEdit: (id: string) => void;
}> = ({ entity, onEdit }) => (
  <div className="org-entity-row" onClick={() => onEdit(entity.id)}>
    <span
      className="org-entity-dot"
      style={{ background: KIND_COLORS[entity.kind] ?? 'var(--border)' }}
    />
    <span className="org-entity-name">{entity.name}</span>
    <KindBadge kind={entity.kind} />
    {entity.metadata.technology && (
      <span className="org-entity-tech">{entity.metadata.technology}</span>
    )}
    <button
      className="org-edit-btn"
      title="Edit entity"
      onClick={(ev) => { ev.stopPropagation(); onEdit(entity.id); }}
    >
      <Pencil size={12} />
    </button>
  </div>
);

/** Collapsible section with count badge. */
const Section: React.FC<{
  title: string;
  count: number;
  defaultOpen?: boolean;
  accent?: string;
  bgTint?: string;
  children: React.ReactNode;
}> = ({ title, count, defaultOpen = true, accent, bgTint, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="org-section" style={bgTint ? { background: bgTint } : undefined}>
      <button
        className="org-section-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="org-section-title" style={accent ? { color: accent } : undefined}>
          {title}
        </span>
        <span className="org-section-count">{count}</span>
      </button>
      {open && <div className="org-section-body">{children}</div>}
    </div>
  );
};

// ─── Tree renderer for hierarchy tab ──────────────────────────────

const HierarchyNode: React.FC<{
  entity: ArchEntity;
  childIndex: Map<string, ArchEntity[]>;
  depth: number;
  onEdit: (id: string) => void;
}> = ({ entity, childIndex, depth, onEdit }) => {
  const children = childIndex.get(entity.id) ?? [];
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = children.length > 0;

  return (
    <div className="org-tree-node" style={{ paddingLeft: depth * 16 }}>
      <div className="org-tree-row">
        {hasChildren ? (
          <button className="org-tree-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="org-tree-spacer" />
        )}
        <span
          className="org-entity-dot"
          style={{ background: KIND_COLORS[entity.kind] ?? 'var(--border)' }}
        />
        <span className="org-entity-name org-tree-label" onClick={() => onEdit(entity.id)}>
          {entity.name}
        </span>
        <KindBadge kind={entity.kind} />
        {hasChildren && <span className="org-section-count">{children.length}</span>}
      </div>
      {open && hasChildren && (
        <div className="org-tree-children">
          {children.map((c) => (
            <HierarchyNode key={c.id} entity={c} childIndex={childIndex} depth={depth + 1} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────

export const OrganizationView: React.FC = () => {
  const entities = useStore((s) => s.entities);
  const setShowEntityForm = useStore((s) => s.setShowEntityForm);

  const [tab, setTab] = useState<TabId>('ownership');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return entities;
    const q = search.toLowerCase();
    return entities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.shortName.toLowerCase().includes(q) ||
        (e.metadata.owner ?? '').toLowerCase().includes(q) ||
        e.kind.toLowerCase().includes(q),
    );
  }, [entities, search]);

  const ownerGroups = useMemo(() => groupByOwner(filtered), [filtered]);
  const viewpointGroups = useMemo(() => groupByViewpoint(filtered), [filtered]);
  const childIndex = useMemo(() => buildChildIndex(filtered), [filtered]);

  const roots = useMemo(
    () => filtered.filter((e) => !e.parentId),
    [filtered],
  );

  // Sort owners: Unassigned last, then alphabetical
  const sortedOwners = useMemo(() => {
    const keys = Array.from(ownerGroups.keys());
    return keys.sort((a, b) => {
      if (a === UNASSIGNED) return 1;
      if (b === UNASSIGNED) return -1;
      return a.localeCompare(b);
    });
  }, [ownerGroups]);

  const viewpointOrder: Viewpoint[] = ['business', 'application', 'technology', 'global'];

  const onEdit = (id: string) => setShowEntityForm(true, id);

  return (
    <div className="org-view">
      {/* Header */}
      <div className="org-header">
        <div className="org-tabs">
          <button
            className={`org-tab ${tab === 'ownership' ? 'org-tab--active' : ''}`}
            onClick={() => setTab('ownership')}
          >
            <Users size={14} /> Ownership
          </button>
          <button
            className={`org-tab ${tab === 'domains' ? 'org-tab--active' : ''}`}
            onClick={() => setTab('domains')}
          >
            <Layers size={14} /> Domains
          </button>
          <button
            className={`org-tab ${tab === 'hierarchy' ? 'org-tab--active' : ''}`}
            onClick={() => setTab('hierarchy')}
          >
            <Network size={14} /> Hierarchy
          </button>
        </div>
        <div className="org-search-wrap">
          <Search size={14} />
          <input
            className="org-search"
            type="text"
            placeholder="Filter entities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="org-summary">
        <span>{filtered.length} entities</span>
        <span className="org-summary-sep">·</span>
        <span>{ownerGroups.size} teams</span>
        <span className="org-summary-sep">·</span>
        <span>{viewpointGroups.size} domains</span>
      </div>

      {/* Content */}
      <div className="org-content">
        {tab === 'ownership' && (
          <>
            {sortedOwners.map((owner) => {
              const group = ownerGroups.get(owner)!;
              // Sub-group by viewpoint within each owner
              const byVp = groupByViewpoint(group);
              return (
                <Section
                  key={owner}
                  title={owner}
                  count={group.length}
                  accent={owner === UNASSIGNED ? 'var(--text-tertiary)' : undefined}
                >
                  {viewpointOrder.map((vp) => {
                    const items = byVp.get(vp);
                    if (!items) return null;
                    return (
                      <div key={vp} className="org-sub-group">
                        <div
                          className="org-sub-group-header"
                          style={{ borderLeftColor: VIEWPOINT_COLORS[vp] }}
                        >
                          <span className="org-sub-group-label">{VIEWPOINT_LABELS[vp]}</span>
                          <span className="org-section-count">{items.length}</span>
                        </div>
                        {items.map((e) => (
                          <EntityRow key={e.id} entity={e} onEdit={onEdit} />
                        ))}
                      </div>
                    );
                  })}
                </Section>
              );
            })}
            {sortedOwners.length === 0 && (
              <div className="org-empty">
                <Building2 size={32} strokeWidth={1} />
                <p>No entities match the current filter.</p>
              </div>
            )}
          </>
        )}

        {tab === 'domains' && (
          <>
            {viewpointOrder.map((vp) => {
              const items = viewpointGroups.get(vp);
              if (!items) return null;
              // Sub-group by owner within each domain
              const byOwner = groupByOwner(items);
              const owners = Array.from(byOwner.keys()).sort((a, b) => {
                if (a === UNASSIGNED) return 1;
                if (b === UNASSIGNED) return -1;
                return a.localeCompare(b);
              });
              return (
                <Section
                  key={vp}
                  title={VIEWPOINT_LABELS[vp]}
                  count={items.length}
                  accent={VIEWPOINT_COLORS[vp]}
                  bgTint={VIEWPOINT_BG_COLORS[vp] + '18'}
                >
                  {owners.map((owner) => {
                    const ents = byOwner.get(owner)!;
                    return (
                      <div key={owner} className="org-sub-group">
                        <div className="org-sub-group-header">
                          <Users size={12} />
                          <span className="org-sub-group-label">{owner}</span>
                          <span className="org-section-count">{ents.length}</span>
                        </div>
                        {ents.map((e) => (
                          <EntityRow key={e.id} entity={e} onEdit={onEdit} />
                        ))}
                      </div>
                    );
                  })}
                </Section>
              );
            })}
            {viewpointGroups.size === 0 && (
              <div className="org-empty">
                <Layers size={32} strokeWidth={1} />
                <p>No entities match the current filter.</p>
              </div>
            )}
          </>
        )}

        {tab === 'hierarchy' && (
          <>
            {roots.length > 0 ? (
              roots.map((r) => (
                <HierarchyNode key={r.id} entity={r} childIndex={childIndex} depth={0} onEdit={onEdit} />
              ))
            ) : (
              <div className="org-empty">
                <Network size={32} strokeWidth={1} />
                <p>No root entities match the current filter.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
