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
  Pencil, Building2, GitBranch,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────

const UNASSIGNED = 'Unassigned';

function groupByOwner(entities: ArchEntity[]): Map<string, ArchEntity[]> {
  const map = new Map<string, ArchEntity[]>();
  for (const e of entities) {
    const org = e.metadata.organization?.trim() || UNASSIGNED;
    const list = map.get(org);
    if (list) list.push(e);
    else map.set(org, [e]);
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

type TabId = 'chart' | 'domains' | 'hierarchy';

// ─── Org Chart: Owner Branch ──────────────────────────────────────

const OwnerBranch: React.FC<{
  owner: string;
  entities: ArchEntity[];
  onEdit: (id: string) => void;
  isHighlighted: boolean;
}> = ({ owner, entities, onEdit, isHighlighted }) => {
  const [collapsed, setCollapsed] = useState(false);

  const vpCounts = useMemo(() => {
    const map = new Map<Viewpoint, number>();
    for (const e of entities) map.set(e.viewpoint, (map.get(e.viewpoint) ?? 0) + 1);
    return Array.from(map.entries()).sort(([, a], [, b]) => b - a);
  }, [entities]);

  const dominant = vpCounts[0]?.[0];
  const accentColor = dominant ? VIEWPOINT_COLORS[dominant] : 'var(--accent)';

  const initials = owner === UNASSIGNED
    ? '?'
    : owner.split(/[\s._-]+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  // Risk indicator: entities missing organization metadata
  const missingInfo = entities.filter((e) => !e.description?.trim() || !e.metadata.organization?.trim()).length;

  // Collect unique manager and SME names for this org
  const managers = [...new Set(entities.map((e) => e.metadata.owner).filter(Boolean))] as string[];
  const smes = [...new Set(entities.map((e) => e.metadata.sme).filter(Boolean))] as string[];

  return (
    <div className={`oc-branch${isHighlighted ? ' oc-branch--highlight' : ''}`}>
      {/* Owner card */}
      <div
        className="oc-owner"
        style={{ borderTopColor: accentColor }}
        onClick={() => setCollapsed((c) => !c)}
        title={`${owner} — ${entities.length} entities`}
      >
        <div
          className="oc-avatar"
          style={{ background: accentColor + '1a', color: accentColor, borderColor: accentColor + '40' }}
        >
          {initials}
        </div>
        <div className="oc-owner-body">
          <div className="oc-owner-name">{owner}</div>
          {managers.length > 0 && (
            <div className="oc-owner-meta" title="Manager(s)">👤 {managers.join(', ')}</div>
          )}
          {smes.length > 0 && (
            <div className="oc-owner-meta oc-owner-meta--sme" title="Subject Matter Expert(s)">★ {smes.join(', ')}</div>
          )}
          <div className="oc-owner-stats">
            <span className="oc-stat-count">{entities.length} {entities.length === 1 ? 'entity' : 'entities'}</span>
            {missingInfo > 0 && (
              <span className="oc-stat-warn" title={`${missingInfo} entities with missing info`}>
                ⚠ {missingInfo}
              </span>
            )}
          </div>
          {/* Viewpoint distribution bar */}
          <div className="oc-vp-bar" title="Entities by layer">
            {vpCounts.map(([vp, count]) => (
              <div
                key={vp}
                className="oc-vp-segment"
                style={{ flex: count, background: VIEWPOINT_COLORS[vp] }}
                title={`${VIEWPOINT_LABELS[vp]}: ${count}`}
              />
            ))}
          </div>
        </div>
        <button
          className="oc-collapse-btn"
          onClick={(ev) => { ev.stopPropagation(); setCollapsed((c) => !c); }}
          aria-label={collapsed ? 'Expand' : 'Collapse'}
          title={collapsed ? 'Show entities' : 'Hide entities'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Connector stem */}
      {!collapsed && entities.length > 0 && <div className="oc-stem" style={{ borderColor: accentColor + '50' }} />}

      {/* Entity cards */}
      {!collapsed && (
        <div className="oc-entities">
          {entities.map((e) => (
            <div
              key={e.id}
              className="oc-entity-card"
              style={{ borderLeftColor: VIEWPOINT_COLORS[e.viewpoint] ?? 'var(--border)' }}
              onClick={() => onEdit(e.id)}
              title={`${e.description || e.name}\nLayer: ${VIEWPOINT_LABELS[e.viewpoint]}`}
            >
              <span
                className="oc-entity-dot"
                style={{ background: KIND_COLORS[e.kind] ?? 'var(--border)' }}
              />
              <span className="oc-entity-name">{e.name}</span>
              <span className="oc-entity-kind">{kindLabel(e.kind)}</span>
              {e.metadata.maturity && (
                <span className={`oc-entity-maturity oc-maturity--${e.metadata.maturity.toLowerCase()}`}>
                  {e.metadata.maturity}
                </span>
              )}
              <button
                className="oc-entity-edit"
                onClick={(ev) => { ev.stopPropagation(); onEdit(e.id); }}
                title="Edit entity"
              >
                <Pencil size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      {collapsed && (
        <div className="oc-collapsed-pill" style={{ borderColor: accentColor + '50', color: accentColor }}>
          {entities.length} hidden
        </div>
      )}
    </div>
  );
};

// ─── Org Chart: main chart tab ────────────────────────────────────

const OrgChartView: React.FC<{
  ownerGroups: Map<string, ArchEntity[]>;
  onEdit: (id: string) => void;
  search: string;
}> = ({ ownerGroups, onEdit, search }) => {
  const [focusedOwner, setFocusedOwner] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const entries = Array.from(ownerGroups.entries());
    return entries.sort((a, b) => {
      if (a[0] === UNASSIGNED) return 1;
      if (b[0] === UNASSIGNED) return -1;
      return b[1].length - a[1].length;
    });
  }, [ownerGroups]);

  if (sorted.length === 0) {
    return (
      <div className="oc-empty">
        <Building2 size={48} strokeWidth={1} />
        <p>{search ? 'No entities match your search.' : 'No entities yet — add entities and assign owners to see the org chart.'}</p>
      </div>
    );
  }

  const totalEntities = sorted.reduce((sum, [, ents]) => sum + ents.length, 0);

  return (
    <div className="oc-wrapper">
      {/* Summary strip */}
      <div className="oc-summary-strip">
        <span className="oc-summary-stat"><strong>{sorted.length}</strong> teams</span>
        <span className="oc-summary-sep">·</span>
        <span className="oc-summary-stat"><strong>{totalEntities}</strong> entities</span>
        {focusedOwner && (
          <>
            <span className="oc-summary-sep">·</span>
            <span className="oc-focus-badge">
              Highlighted: <strong>{focusedOwner}</strong>
              <button className="oc-focus-clear" onClick={() => setFocusedOwner(null)}>✕</button>
            </span>
          </>
        )}
      </div>

      {/* Chart */}
      <div className="oc-chart" role="tree" aria-label="Ownership org chart">
        {sorted.map(([owner, ents]) => (
          <div
            key={owner}
            className="oc-branch-wrapper"
            onClick={() => setFocusedOwner((prev) => prev === owner ? null : owner)}
          >
            <OwnerBranch
              owner={owner}
              entities={ents}
              onEdit={onEdit}
              isHighlighted={focusedOwner === null || focusedOwner === owner}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const KindBadge: React.FC<{ kind: string }> = ({ kind }) => (
  <span
    className="org-kind-badge"
    style={{ borderColor: KIND_COLORS[kind as keyof typeof KIND_COLORS] ?? 'var(--border)' }}
  >
    {kindLabel(kind)}
  </span>
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

// ─── People tree builder ──────────────────────────────────────────

interface PersonTreeNode {
  personKey: string;
  organization: string;
  isOwner: boolean;   // has at least one entity where they are the owner/manager
  isSme: boolean;     // has at least one entity where they are the SME
  entities: ArchEntity[];
  children: PersonTreeNode[];
}

/** Primary responsible person for an entity: owner first, fall back to sme. */
function getPrimaryPerson(e: ArchEntity): string {
  return e.metadata.owner?.trim() || e.metadata.sme?.trim() || UNASSIGNED;
}

function buildPeopleTree(entities: ArchEntity[]): PersonTreeNode[] {
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  // Accumulate per-person data
  const byPerson = new Map<string, { org: string; entities: ArchEntity[]; isOwner: boolean; isSme: boolean }>();
  for (const e of entities) {
    const key = getPrimaryPerson(e);
    if (!byPerson.has(key)) byPerson.set(key, { org: e.metadata.organization ?? '', entities: [], isOwner: false, isSme: false });
    const rec = byPerson.get(key)!;
    rec.entities.push(e);
    if (e.metadata.owner?.trim() === key) rec.isOwner = true;
    if (e.metadata.sme?.trim() === key) rec.isSme = true;
    if (e.metadata.organization && !rec.org) rec.org = e.metadata.organization;
  }

  // Derive person→person parent edges from entity parent-child
  const personChildren = new Map<string, Set<string>>();
  const personParents  = new Map<string, Set<string>>();
  for (const [key] of byPerson) {
    personChildren.set(key, new Set());
    personParents.set(key, new Set());
  }
  for (const e of entities) {
    if (!e.parentId) continue;
    const parentEntity = entityMap.get(e.parentId);
    if (!parentEntity) continue;
    const childPerson  = getPrimaryPerson(e);
    const parentPerson = getPrimaryPerson(parentEntity);
    if (childPerson === parentPerson) continue;
    personChildren.get(parentPerson)?.add(childPerson);
    personParents.get(childPerson)?.add(parentPerson);
  }

  // Root persons: no parent person
  const roots = [...byPerson.keys()].filter((p) => (personParents.get(p)?.size ?? 0) === 0);

  const buildNode = (key: string, visited: Set<string>): PersonTreeNode => {
    visited.add(key);
    const rec = byPerson.get(key)!;
    const childKeys = [...(personChildren.get(key) ?? [])].filter((c) => !visited.has(c));
    return {
      personKey: key,
      organization: rec.org,
      isOwner: rec.isOwner,
      isSme: rec.isSme,
      entities: rec.entities,
      children: childKeys.map((c) => buildNode(c, new Set(visited))),
    };
  };

  // UNASSIGNED last
  roots.sort((a, b) => {
    if (a === UNASSIGNED) return 1;
    if (b === UNASSIGNED) return -1;
    return a.localeCompare(b);
  });
  return roots.map((r) => buildNode(r, new Set()));
}

// ─── People Tree: person node ─────────────────────────────────────

const PersonTreeCard: React.FC<{
  node: PersonTreeNode;
  depth: number;
  onEdit: (id: string) => void;
}> = ({ node, depth, onEdit }) => {
  const [open, setOpen]         = useState(depth < 2);
  const [showEnts, setShowEnts] = useState(depth < 1);

  const initials = node.personKey === UNASSIGNED
    ? '?'
    : node.personKey.split(/[\s._-]+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const vpCounts = useMemo(() => {
    const map = new Map<Viewpoint, number>();
    for (const e of node.entities) map.set(e.viewpoint, (map.get(e.viewpoint) ?? 0) + 1);
    return Array.from(map.entries()).sort(([, a], [, b]) => b - a);
  }, [node.entities]);

  const dominant = vpCounts[0]?.[0];
  const accentColor = dominant ? VIEWPOINT_COLORS[dominant] : 'var(--accent)';
  const hasChildren = node.children.length > 0;

  return (
    <div className="pt-node" style={{ '--pt-depth': depth } as React.CSSProperties}>
      {/* Connector line to parent */}
      {depth > 0 && <div className="pt-connector" style={{ borderColor: accentColor + '60' }} />}

      {/* Person card */}
      <div className="pt-card" style={{ borderTopColor: accentColor }}>
        <div className="pt-card-main" onClick={() => setShowEnts((s) => !s)}>
          <div className="pt-avatar" style={{ background: accentColor + '1a', color: accentColor, borderColor: accentColor + '40' }}>
            {initials}
          </div>
          <div className="pt-person-body">
            <div className="pt-person-name">
              {node.personKey}
              {node.isOwner && <span className="pt-badge pt-badge--owner" title="Manager / Owner">MGR</span>}
              {node.isSme && !node.isOwner && <span className="pt-badge pt-badge--sme" title="Subject Matter Expert">SME</span>}
              {node.isSme && node.isOwner && <span className="pt-badge pt-badge--sme" title="Subject Matter Expert">SME</span>}
            </div>
            {node.organization && <div className="pt-org">{node.organization}</div>}
            <div className="pt-stats">
              <span>{node.entities.length} {node.entities.length === 1 ? 'entity' : 'entities'}</span>
              {hasChildren && <span>{node.children.length} sub-{node.children.length === 1 ? 'team' : 'teams'}</span>}
            </div>
            <div className="pt-vp-bar">
              {vpCounts.map(([vp, count]) => (
                <div key={vp} className="pt-vp-seg" style={{ flex: count, background: VIEWPOINT_COLORS[vp] }}
                  title={`${VIEWPOINT_LABELS[vp]}: ${count}`} />
              ))}
            </div>
          </div>
          <button className="pt-toggle-btn" onClick={(ev) => { ev.stopPropagation(); setShowEnts((s) => !s); }}
            title={showEnts ? 'Hide entities' : 'Show entities'}>
            {showEnts ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        </div>

        {/* Entity list */}
        {showEnts && (
          <div className="pt-entities">
            {node.entities.map((e) => (
              <div key={e.id} className="pt-entity-row"
                style={{ borderLeftColor: VIEWPOINT_COLORS[e.viewpoint] ?? 'var(--border)' }}
                onClick={() => onEdit(e.id)}>
                <span className="pt-entity-dot" style={{ background: KIND_COLORS[e.kind] ?? 'var(--border)' }} />
                <span className="pt-entity-name">{e.name}</span>
                <span className="pt-entity-kind">{kindLabel(e.kind)}</span>
                {e.metadata.sme && e.metadata.owner !== e.metadata.sme && (
                  <span className="pt-entity-sme" title={`SME: ${e.metadata.sme}`}>★ {e.metadata.sme}</span>
                )}
                <button className="pt-entity-edit" onClick={(ev) => { ev.stopPropagation(); onEdit(e.id); }} title="Edit">
                  <Pencil size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && (
        <div className="pt-children">
          <div className="pt-children-toggle" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            <span>{node.children.length} reporting {node.children.length === 1 ? 'team' : 'teams'}</span>
          </div>
          {open && (
            <div className="pt-children-body" style={{ borderLeftColor: accentColor + '50' }}>
              {node.children.map((child) => (
                <PersonTreeCard key={child.personKey} node={child} depth={depth + 1} onEdit={onEdit} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Tree renderer for hierarchy tab (REPLACED by people tree) ────

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

  const [tab, setTab] = useState<TabId>('chart');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return entities;
    const q = search.toLowerCase();
    return entities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.shortName.toLowerCase().includes(q) ||
        (e.metadata.organization ?? '').toLowerCase().includes(q) ||
        e.kind.toLowerCase().includes(q),
    );
  }, [entities, search]);

  const ownerGroups = useMemo(() => groupByOwner(filtered), [filtered]);
  const viewpointGroups = useMemo(() => groupByViewpoint(filtered), [filtered]);
  const childIndex = useMemo(() => buildChildIndex(filtered), [filtered]);
  const peopleTree = useMemo(() => buildPeopleTree(filtered), [filtered]);

  const roots = useMemo(
    () => filtered.filter((e) => !e.parentId),
    [filtered],
  );

  const viewpointOrder: Viewpoint[] = ['business', 'application', 'technology', 'global'];

  const onEdit = (id: string) => setShowEntityForm(true, id);

  return (
    <div className="org-view">
      {/* Header */}
      <div className="org-header">
        <div className="org-tabs">
          <button
            className={`org-tab ${tab === 'chart' ? 'org-tab--active' : ''}`}
            onClick={() => setTab('chart')}
          >
            <GitBranch size={14} /> Org Chart
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

      {/* Content */}
      <div className="org-content">
        {tab === 'chart' && (
          <OrgChartView ownerGroups={ownerGroups} onEdit={onEdit} search={search} />
        )}

        {tab === 'domains' && (
          <>
            {viewpointOrder.map((vp) => {
              const items = viewpointGroups.get(vp);
              if (!items) return null;
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
          <div className="pt-root">
            {peopleTree.length > 0 ? (
              <>
                <div className="pt-summary">
                  <span><strong>{peopleTree.length}</strong> root {peopleTree.length === 1 ? 'person' : 'people'}</span>
                  <span className="oc-summary-sep">·</span>
                  <span>tree derived from entity parent-child structure</span>
                </div>
                {peopleTree.map((node) => (
                  <PersonTreeCard key={node.personKey} node={node} depth={0} onEdit={onEdit} />
                ))}
              </>
            ) : (
              <div className="org-empty">
                <Network size={32} strokeWidth={1} />
                <p>No entities match the current filter.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
