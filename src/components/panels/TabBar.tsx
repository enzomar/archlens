import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, X } from 'lucide-react';

export const TabBar: React.FC = () => {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const addTab = useStore((s) => s.addTab);
  const closeTab = useStore((s) => s.closeTab);
  const switchTab = useStore((s) => s.switchTab);
  const renameTab = useStore((s) => s.renameTab);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  function handleDoubleClick(tabId: string, currentName: string) {
    setEditingId(tabId);
    setEditName(currentName);
  }

  function handleRenameSubmit(tabId: string) {
    if (editName.trim()) {
      renameTab(tabId, editName.trim());
    }
    setEditingId(null);
  }

  if (tabs.length === 0) {
    return (
      <div className="tab-bar">
        <button className="tab-bar-add" onClick={() => addTab()} title="Add diagram tab">
          <Plus size={14} /> New Diagram
        </button>
      </div>
    );
  }

  return (
    <div className="tab-bar">
      <div className="tab-bar-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab-bar-tab ${activeTabId === tab.id ? 'tab-bar-tab--active' : ''}`}
            onClick={() => switchTab(tab.id)}
          >
            {editingId === tab.id ? (
              <input
                className="tab-bar-rename"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRenameSubmit(tab.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(tab.id); if (e.key === 'Escape') setEditingId(null); }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="tab-bar-tab-name"
                onDoubleClick={() => handleDoubleClick(tab.id, tab.name)}
              >
                {tab.name}
              </span>
            )}
            <button
              className="tab-bar-close"
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              aria-label={`Close ${tab.name}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <button className="tab-bar-add" onClick={() => addTab()} title="Add diagram tab">
        <Plus size={14} />
      </button>
    </div>
  );
};
