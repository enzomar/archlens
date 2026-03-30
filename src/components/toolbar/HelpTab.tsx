import React from 'react';
import { Keyboard, BookOpen, Info, Heart, Mail } from 'lucide-react';

interface HelpTabProps {
  onShowHelp: () => void;
  onShowAbout?: () => void;
  onShowSupport?: () => void;
  onShowContact?: () => void;
}

export const HelpTab: React.FC<HelpTabProps> = ({ onShowHelp, onShowAbout, onShowSupport, onShowContact }) => (
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
        <button className="ribbon-btn" onClick={() => window.open('https://pubs.opengroup.org/architecture/archimate31-doc/', '_blank', 'noopener,noreferrer')} title="Open ArchiMate specification" aria-label="ArchiMate docs">
          <span className="ribbon-btn-icon"><BookOpen size={20} /></span>
          <span className="ribbon-btn-label">ArchiMate</span>
        </button>
        <button className="ribbon-btn" onClick={onShowAbout} title="About ArchLens" aria-label="About ArchLens">
          <span className="ribbon-btn-icon"><Info size={20} /></span>
          <span className="ribbon-btn-label">About</span>
        </button>
      </div>
      <span className="ribbon-group-label">Resources</span>
    </div>

    <div className="ribbon-separator" />

    <div className="ribbon-group">
      <div className="ribbon-group-buttons">
        {onShowSupport && (
          <button className="ribbon-btn ribbon-btn--heart" onClick={onShowSupport} title="Support ArchLens" aria-label="Support ArchLens">
            <span className="ribbon-btn-icon"><Heart size={20} /></span>
            <span className="ribbon-btn-label">Support</span>
          </button>
        )}
        {onShowContact && (
          <button className="ribbon-btn" onClick={onShowContact} title="Contact us" aria-label="Contact">
            <span className="ribbon-btn-icon"><Mail size={20} /></span>
            <span className="ribbon-btn-label">Contact</span>
          </button>
        )}
      </div>
      <span className="ribbon-group-label">Feedback</span>
    </div>
  </>
);
