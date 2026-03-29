import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { exportProject } from '../../export/exportService';
import { NODE_DIMENSIONS } from '../../domain/types';
import { Search, Zap, Layout, Download, Eye, Undo2, Redo2, Sun, Moon, ArrowRight } from 'lucide-react';

interface PaletteItem {
  id: string;
  label: string;
  category: 'action' | 'entity' | 'navigation';
  keywords?: string;
  icon?: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const entities = useStore((s) => s.entities);
  const selectEntity = useStore((s) => s.selectEntity);
  const autoLayout = useStore((s) => s.autoLayout);
  const setPan      = useStore((s) => s.setPan);
  const setScale    = useStore((s) => s.setScale);
  const setShowEntityForm  = useStore((s) => s.setShowEntityForm);
  const setShowExportPanel = useStore((s) => s.setShowExportPanel);
  const toggleLeftSidebar  = useStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useStore((s) => s.toggleRightSidebar);
  const setUiMode   = useStore((s) => s.setUiMode);
  const newProject  = useStore((s) => s.newProject);
  const setTheme    = useStore((s) => s.setTheme);

  const items = useMemo<PaletteItem[]>(() => {
    const actions: PaletteItem[] = [
      // Actions
      { id: 'new-entity', label: 'New Entity', category: 'action', keywords: 'create add', icon: <Zap size={14} />, action: () => { setShowEntityForm(true); onClose(); } },
      { id: 'auto-layout', label: 'Auto Layout', category: 'action', keywords: 'arrange organize', icon: <Layout size={14} />, action: () => { autoLayout(); onClose(); } },
      { id: 'export', label: 'Export Panel', category: 'action', keywords: 'save download', icon: <Download size={14} />, action: () => { setShowExportPanel(true); onClose(); } },
      { id: 'save-project', label: 'Save Project (JSON)', category: 'action', keywords: 'download export', icon: <Download size={14} />, action: () => { exportProject(useStore.getState().getProject()); onClose(); } },
      { id: 'undo', label: 'Undo', category: 'action', keywords: 'revert back', icon: <Undo2 size={14} />, action: () => { useStore.temporal.getState().undo(); onClose(); } },
      { id: 'redo', label: 'Redo', category: 'action', keywords: 'forward', icon: <Redo2 size={14} />, action: () => { useStore.temporal.getState().redo(); onClose(); } },
      { id: 'new-project', label: 'New Project', category: 'action', keywords: 'fresh clear reset', icon: <Zap size={14} />, action: () => { newProject(); onClose(); } },
      { id: 'toggle-left', label: 'Toggle Left Sidebar', category: 'action', keywords: 'palette panel', action: () => { toggleLeftSidebar(); onClose(); } },
      { id: 'toggle-right', label: 'Toggle Right Sidebar', category: 'action', keywords: 'detail panel', action: () => { toggleRightSidebar(); onClose(); } },
      { id: 'distraction-free', label: 'Distraction-Free Mode', category: 'action', keywords: 'zen focus fullscreen', icon: <Eye size={14} />, action: () => { setUiMode('distraction-free'); onClose(); } },
      { id: 'presentation', label: 'Presentation Mode', category: 'action', keywords: 'present slides', icon: <Eye size={14} />, action: () => { setUiMode('presentation'); onClose(); } },
      { id: 'theme-light', label: 'Theme: Light', category: 'action', keywords: 'dark mode', icon: <Sun size={14} />, action: () => { setTheme('light'); onClose(); } },
      { id: 'theme-dark', label: 'Theme: Dark', category: 'action', keywords: 'light mode', icon: <Moon size={14} />, action: () => { setTheme('dark'); onClose(); } },

      // Navigation
      { id: 'zoom-context',   label: 'Zoom: System Context', category: 'navigation', keywords: '1 zoom level', action: () => { useStore.getState().toggleActiveZoomLevel('context');   onClose(); } },
      { id: 'zoom-container', label: 'Zoom: Container',      category: 'navigation', keywords: '2 zoom level', action: () => { useStore.getState().toggleActiveZoomLevel('container'); onClose(); } },
      { id: 'zoom-component', label: 'Zoom: Component',      category: 'navigation', keywords: '3 zoom level', action: () => { useStore.getState().toggleActiveZoomLevel('component'); onClose(); } },
      { id: 'vp-business',    label: 'Viewpoint: Business',    category: 'navigation', keywords: 'layer', action: () => { useStore.getState().toggleActiveViewpoint('business');    onClose(); } },
      { id: 'vp-application', label: 'Viewpoint: Application', category: 'navigation', keywords: 'layer', action: () => { useStore.getState().toggleActiveViewpoint('application'); onClose(); } },
      { id: 'vp-technology',  label: 'Viewpoint: Technology',  category: 'navigation', keywords: 'layer', action: () => { useStore.getState().toggleActiveViewpoint('technology');  onClose(); } },
    ];

    // Entity search items
    const entityItems: PaletteItem[] = entities.map((e) => ({
      id: `entity-${e.id}`,
      label: e.name,
      category: 'entity' as const,
      keywords: `${e.kind} ${e.shortName} ${e.description ?? ''} ${e.metadata.technology ?? ''} ${e.metadata.owner ?? ''}`,
      icon: <ArrowRight size={14} />,
      action: () => {
        selectEntity(e.id);
        // Pan to entity position
        const pos = useStore.getState().positions.find((p) => p.entityId === e.id);
        if (pos) {
          const dims = NODE_DIMENSIONS[e.kind];
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          setPan(vw / 2 - pos.x - dims.width / 2, vh / 2 - pos.y - dims.height / 2);
          setScale(1);
        }
        onClose();
      },
    }));

    return [...actions, ...entityItems];
  }, [entities]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 20);
    const q = query.toLowerCase();
    return items
      .filter((item) => {
        const haystack = `${item.label} ${item.keywords ?? ''} ${item.category}`.toLowerCase();
        return q.split(/\s+/).every((word) => haystack.includes(word));
      })
      .slice(0, 20);
  }, [query, items]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runSelected = useCallback(() => {
    if (filtered[selectedIndex]) {
      filtered[selectedIndex].action();
    }
  }, [filtered, selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runSelected();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, runSelected, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const categoryLabel = (cat: string) => {
    if (cat === 'action') return 'Actions';
    if (cat === 'entity') return 'Entities';
    if (cat === 'navigation') return 'Navigation';
    return cat;
  };

  // Group by category
  let lastCategory = '';

  return (
    <>
      <div className="command-palette-backdrop" onClick={onClose} />
      <div className="command-palette" onKeyDown={handleKeyDown}>
        <div className="command-palette-input-row">
          <Search size={16} className="command-palette-search-icon" />
          <input
            ref={inputRef}
            className="command-palette-input"
            type="text"
            placeholder="Type a command or search entities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="command-palette-kbd">ESC</kbd>
        </div>
        <div className="command-palette-list" ref={listRef}>
          {filtered.map((item, i) => {
            const showHeader = item.category !== lastCategory;
            lastCategory = item.category;
            return (
              <React.Fragment key={item.id}>
                {showHeader && (
                  <div className="command-palette-category">{categoryLabel(item.category)}</div>
                )}
                <button
                  className={`command-palette-item${i === selectedIndex ? ' command-palette-item--selected' : ''}`}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  {item.icon && <span className="command-palette-item-icon">{item.icon}</span>}
                  <span className="command-palette-item-label">{item.label}</span>
                  {item.category === 'entity' && (
                    <span className="command-palette-item-hint">{
                      entities.find((e) => item.id === `entity-${e.id}`)?.kind ?? ''
                    }</span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
          {filtered.length === 0 && (
            <div className="command-palette-empty">No results found</div>
          )}
        </div>
      </div>
    </>
  );
};
