import React from 'react';
import { useStore } from '../../store/useStore';
import {
  FileSearch, LayoutPanelLeft, Terminal, PanelRight,
  Search, Settings, GitBranch, List,
} from 'lucide-react';

interface ActivityBarProps {
  side: 'left' | 'right';
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ side }) => {
  const leftSidebarOpen = useStore((s) => s.leftSidebarOpen);
  const rightSidebarOpen = useStore((s) => s.rightSidebarOpen);
  const logPanelOpen = useStore((s) => s.logPanelOpen);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const toggleLeftSidebar = useStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useStore((s) => s.toggleRightSidebar);
  const toggleLogPanel = useStore((s) => s.toggleLogPanel);

  if (side === 'left') {
    return (
      <div className="activity-bar activity-bar--left" role="toolbar" aria-label="Left activity bar">
        <div className="activity-bar-top">
          <button
            className={`activity-bar-btn ${leftSidebarOpen ? 'activity-bar-btn--active' : ''}`}
            onClick={toggleLeftSidebar}
            title="Explorer"
            aria-label="Toggle explorer panel"
            aria-pressed={leftSidebarOpen}
          >
            <FileSearch size={22} />
          </button>
          <button
            className="activity-bar-btn"
            title="Search (coming soon)"
            aria-label="Search"
            disabled
          >
            <Search size={22} />
          </button>
          <button
            className="activity-bar-btn"
            title="Source Control (coming soon)"
            aria-label="Source Control"
            disabled
          >
            <GitBranch size={22} />
          </button>
          <button
            className={`activity-bar-btn ${viewMode === 'list' ? 'activity-bar-btn--active' : ''}`}
            onClick={() => setViewMode(viewMode === 'list' ? 'architecture' : 'list')}
            title="Entity List View"
            aria-label="Toggle entity list view"
            aria-pressed={viewMode === 'list'}
          >
            <List size={22} />
          </button>
        </div>
        <div className="activity-bar-bottom">
          <button
            className={`activity-bar-btn ${logPanelOpen ? 'activity-bar-btn--active' : ''}`}
            onClick={toggleLogPanel}
            title="Toggle log panel"
            aria-label="Toggle log panel"
            aria-pressed={logPanelOpen}
          >
            <Terminal size={22} />
          </button>
        </div>
      </div>
    );
  }

  // Right activity bar
  return (
    <div className="activity-bar activity-bar--right" role="toolbar" aria-label="Right activity bar">
      <div className="activity-bar-top">
        <button
          className={`activity-bar-btn ${rightSidebarOpen ? 'activity-bar-btn--active' : ''}`}
          onClick={toggleRightSidebar}
          title="Properties"
          aria-label="Toggle properties panel"
          aria-pressed={rightSidebarOpen}
        >
          <PanelRight size={22} />
        </button>
        <button
          className={`activity-bar-btn ${leftSidebarOpen ? 'activity-bar-btn--active' : ''}`}
          onClick={toggleLeftSidebar}
          title="Layout"
          aria-label="Toggle layout panel"
          aria-pressed={leftSidebarOpen}
        >
          <LayoutPanelLeft size={22} />
        </button>
      </div>
      <div className="activity-bar-bottom">
        <button
          className="activity-bar-btn"
          title="Settings (coming soon)"
          aria-label="Settings"
          disabled
        >
          <Settings size={22} />
        </button>
      </div>
    </div>
  );
};
