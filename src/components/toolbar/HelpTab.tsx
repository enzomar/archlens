import React from 'react';
import { Keyboard, BookOpen, Info } from 'lucide-react';

interface HelpTabProps {
  onShowHelp: () => void;
}

export const HelpTab: React.FC<HelpTabProps> = ({ onShowHelp }) => (
  <>
    <div className="ribbon-group">
      <div className="ribbon-group-buttons">
        <button className="ribbon-btn" onClick={onShowHelp} title="View keyboard shortcuts" aria-label="Keyboard shortcuts">
          <span className="ribbon-btn-icon"><Keyboard size={20} /></span>
          <span className="ribbon-btn-label">Shortcuts</span>
        </button>
        <button className="ribbon-btn" onClick={() => window.open('https://c4model.com', '_blank', 'noopener,noreferrer')} title="Open C4 Model documentation" aria-label="C4 Model docs">
          <span className="ribbon-btn-icon"><BookOpen size={20} /></span>
          <span className="ribbon-btn-label">C4 Model</span>
        </button>
        <button className="ribbon-btn" onClick={onShowHelp} title="About ArchLens" aria-label="About ArchLens">
          <span className="ribbon-btn-icon"><Info size={20} /></span>
          <span className="ribbon-btn-label">About</span>
        </button>
      </div>
      <span className="ribbon-group-label">Resources</span>
    </div>
  </>
);
