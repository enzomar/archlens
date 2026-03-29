import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { KIND_COLORS, NODE_DIMENSIONS } from '../../domain/types';
import type { ArchEntity } from '../../domain/types';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface TreeNodeProps {
  entity: ArchEntity;
  children: ArchEntity[];
  allEntities: ArchEntity[];
  depth: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ entity, children, allEntities, depth }) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const selectedEntityId = useStore((s) => s.selectedEntityId);
  const selectEntity = useStore((s) => s.selectEntity);
  const drillDown = useStore((s) => s.drillDown);
  const setPan = useStore((s) => s.setPan);
  const setScale = useStore((s) => s.setScale);
  const setViewMode = useStore((s) => s.setViewMode);

  const hasChildren = children.length > 0;
  const isSelected = selectedEntityId === entity.id;
  const color = KIND_COLORS[entity.kind];

  const handleClick = () => {
    selectEntity(entity.id);
    // Switch to architecture view if needed
    if (useStore.getState().viewMode !== 'architecture') {
      setViewMode('architecture');
    }
    const pos = useStore.getState().positions.find((p) => p.entityId === entity.id);
    if (pos) {
      const dims = NODE_DIMENSIONS[entity.kind];
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPan(vw / 2 - pos.x - dims.width / 2, vh / 2 - pos.y - dims.height / 2);
      setScale(1);
    }
  };

  return (
    <div className="nav-tree-node">
      <button
        className={`nav-tree-item ${isSelected ? 'nav-tree-item--selected' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={handleClick}
        onDoubleClick={() => drillDown(entity.id)}
        title={`${entity.name} [${entity.kind}]`}
      >
        {hasChildren ? (
          <span
            className="nav-tree-toggle"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        ) : (
          <span className="nav-tree-toggle nav-tree-toggle--spacer" />
        )}
        <span className="nav-tree-dot" style={{ backgroundColor: color }} />
        <span className="nav-tree-name">{entity.name}</span>
        <span className="nav-tree-kind">{entity.kind}</span>
      </button>
      {expanded && hasChildren && (
        <div className="nav-tree-children">
          {children.map((child) => {
            const grandchildren = allEntities.filter((e) => e.parentId === child.id);
            return (
              <TreeNode
                key={child.id}
                entity={child}
                children={grandchildren}
                allEntities={allEntities}
                depth={depth + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export const NavigatorPanel: React.FC = () => {
  const entities = useStore((s) => s.entities);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  // Build tree: root entities (no parent or parent not in list)
  const entityIds = new Set(entities.map((e) => e.id));
  const roots = entities.filter((e) => !e.parentId || !entityIds.has(e.parentId));

  const filtered = search.trim()
    ? entities.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  return (
    <div className="navigator-panel">
      <div className="navigator-header" onClick={() => setCollapsed((c) => !c)}>
        {collapsed ? <ChevronRight size={12} className="navigator-chevron" /> : <ChevronDown size={12} className="navigator-chevron" />}
        <span className="navigator-title">Navigator</span>
        <span className="navigator-count">{entities.length}</span>
      </div>
      {!collapsed && (
        <>
          <div className="navigator-search">
            <input
              type="text"
              placeholder="Search entities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="navigator-search-input"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="navigator-tree">
            {filtered ? (
              filtered.length === 0 ? (
                <div className="navigator-empty">No matches</div>
              ) : (
                filtered.map((entity) => (
                  <TreeNode
                    key={entity.id}
                    entity={entity}
                    children={[]}
                    allEntities={entities}
                    depth={0}
                  />
                ))
              )
            ) : (
              roots.map((entity) => {
                const children = entities.filter((e) => e.parentId === entity.id);
                return (
                  <TreeNode
                    key={entity.id}
                    entity={entity}
                    children={children}
                    allEntities={entities}
                    depth={0}
                  />
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
