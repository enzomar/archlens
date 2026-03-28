import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Trash2, Info, AlertTriangle, CircleX, Bug, Maximize2, Minimize2, ChevronUp, ChevronDown, Search } from 'lucide-react';
import type { LogEntry } from '../../store/useStore';

type LogLevel = LogEntry['level'];
type FilterLevel = 'all' | LogLevel;

const LEVEL_ICON: Record<LogLevel, React.ReactNode> = {
  debug: <Bug size={12} />,
  info: <Info size={12} />,
  warn: <AlertTriangle size={12} />,
  error: <CircleX size={12} />,
};

const FILTER_LEVELS: { key: FilterLevel; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'debug', label: 'Debug' },
  { key: 'info', label: 'Info' },
  { key: 'warn', label: 'Warn' },
  { key: 'error', label: 'Error' },
];

interface LogPanelProps {
  fullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const LogPanel: React.FC<LogPanelProps> = ({ fullScreen = false, onToggleFullScreen }) => {
  const logEntries = useStore((s) => s.logEntries);
  const clearLog = useStore((s) => s.clearLog);
  const logPanelOpen = useStore((s) => s.logPanelOpen);
  const toggleLogPanel = useStore((s) => s.toggleLogPanel);
  const listRef = useRef<HTMLDivElement>(null);
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let entries = logEntries;
    if (filterLevel !== 'all') {
      entries = entries.filter((e) => e.level === filterLevel);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      entries = entries.filter((e) => e.message.toLowerCase().includes(q));
    }
    return entries;
  }, [logEntries, filterLevel, search]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [filtered.length]);

  return (
    <div className="log-panel">
      <div className="log-panel-header" onClick={toggleLogPanel} style={{ cursor: 'pointer' }}>
        {logPanelOpen ? <ChevronDown size={12} className="log-panel-chevron" /> : <ChevronUp size={12} className="log-panel-chevron" />}
        <span className="log-panel-title">Log</span>
        <span className="log-panel-count">{logEntries.length}</span>
        {logPanelOpen && onToggleFullScreen && (
          <button
            className="btn-icon"
            onClick={(e) => { e.stopPropagation(); onToggleFullScreen(); }}
            aria-label={fullScreen ? 'Restore log panel' : 'Expand log to full screen'}
            title={fullScreen ? 'Restore' : 'Full screen'}
          >
            {fullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
        {logPanelOpen && (
          <button
            className="btn-icon"
            onClick={(e) => { e.stopPropagation(); clearLog(); }}
            aria-label="Clear log"
            title="Clear log"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {logPanelOpen && (
        <>
          <div className="log-filter-bar" onClick={(e) => e.stopPropagation()}>
            <div className="log-filter-levels">
              {FILTER_LEVELS.map(({ key, label }) => (
                <button
                  key={key}
                  className={`log-filter-btn ${filterLevel === key ? 'log-filter-btn--active' : ''} ${key !== 'all' ? `log-filter-btn--${key}` : ''}`}
                  onClick={() => setFilterLevel(key)}
                  title={`Show ${label.toLowerCase()} entries`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="log-search">
              <Search size={12} className="log-search-icon" />
              <input
                className="log-search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search logs…"
                aria-label="Search log entries"
              />
            </div>
          </div>
          <div className="log-panel-body" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="log-panel-empty">
                {logEntries.length === 0 ? 'No log entries yet.' : 'No matching entries.'}
              </div>
            ) : (
              filtered.map((entry) => (
                <div key={entry.id} className={`log-entry log-entry--${entry.level}`}>
                  <span className="log-entry-icon">{LEVEL_ICON[entry.level]}</span>
                  <span className="log-entry-time">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="log-entry-message">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
