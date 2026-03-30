import React, { useState } from 'react';
import { Heart, X, Layers, Zap, GitBranch, Box } from 'lucide-react';

interface ToolbarDialogsProps {
  showHelp: boolean;
  onCloseHelp: () => void;
  showAbout: boolean;
  onCloseAbout: () => void;
  showSupport: boolean;
  onCloseSupport: () => void;
  showContact: boolean;
  onCloseContact: () => void;
}

export const ToolbarDialogs: React.FC<ToolbarDialogsProps> = ({
  showHelp, onCloseHelp,
  showAbout, onCloseAbout,
  showSupport, onCloseSupport,
  showContact, onCloseContact,
}) => {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setContactSending(true);
    try {
      const res = await fetch('https://formspree.io/f/xpwdgkjq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: contactName, email: contactEmail, message: contactMessage }),
      });
      if (res.ok) {
        setContactSent(true);
        setContactName(''); setContactEmail(''); setContactMessage('');
      } else {
        alert('Failed to send. Please try again.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setContactSending(false);
    }
  }

  return (
    <>
      {/* Help dialog */}
      {showHelp && (
        <div className="modal-overlay" onClick={onCloseHelp} role="presentation">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="help-title">
            <div className="modal-header">
              <h2 id="help-title">ArchLens — Help</h2>
              <button className="btn-icon" onClick={onCloseHelp} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="help-content">
              <h3>Keyboard Shortcuts</h3>

              <h4 className="help-shortcut-group">Canvas</h4>
              <div className="help-shortcuts">
                <div className="help-shortcut"><kbd>Scroll</kbd> <span>Zoom in / out</span></div>
                <div className="help-shortcut"><kbd>Space + Drag</kbd> <span>Pan canvas</span></div>
                <div className="help-shortcut"><kbd>Click + Drag</kbd> <span>Pan canvas (background)</span></div>
                <div className="help-shortcut"><kbd>Double-click</kbd> <span>Drill into entity</span></div>
                <div className="help-shortcut"><kbd>Delete / Backspace</kbd> <span>Delete selected</span></div>
              </div>

              <h4 className="help-shortcut-group">Navigation</h4>
              <div className="help-shortcuts">
                <div className="help-shortcut"><kbd>1</kbd> <span>Select System Context abstraction</span></div>
                <div className="help-shortcut"><kbd>2</kbd> <span>Select Container abstraction</span></div>
                <div className="help-shortcut"><kbd>3</kbd> <span>Select Component abstraction</span></div>
                <div className="help-shortcut"><kbd>Shift 1/2/3</kbd> <span>Add abstraction to multi-view</span></div>
                <div className="help-shortcut"><kbd>B</kbd> <span>Select Business layer</span></div>
                <div className="help-shortcut"><kbd>A</kbd> <span>Select Application layer</span></div>
                <div className="help-shortcut"><kbd>T</kbd> <span>Select Technology layer</span></div>
                <div className="help-shortcut"><kbd>Shift B/A/T</kbd> <span>Add layer to multi-view</span></div>
                <div className="help-shortcut"><kbd>Escape</kbd> <span>Close dialog / exit immersive</span></div>
              </div>

              <h4 className="help-shortcut-group">Editing</h4>
              <div className="help-shortcuts">
                <div className="help-shortcut"><kbd>N</kbd> <span>New entity</span></div>
                <div className="help-shortcut"><kbd>Ctrl Z</kbd> <span>Undo</span></div>
                <div className="help-shortcut"><kbd>Ctrl Y</kbd> <span>Redo</span></div>
                <div className="help-shortcut"><kbd>Ctrl S</kbd> <span>Save / export project</span></div>
                <div className="help-shortcut"><kbd>Ctrl Shift P</kbd> <span>Command palette</span></div>
              </div>

              <h4 className="help-shortcut-group">Modes</h4>
              <div className="help-shortcuts">
                <div className="help-shortcut"><kbd>F5</kbd> <span>Presentation mode</span></div>
                <div className="help-shortcut"><kbd>F11</kbd> <span>Distraction-free mode</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About dialog */}
      {showAbout && (
        <div className="modal-overlay" onClick={onCloseAbout} role="presentation">
          <div className="modal-content modal-content--about" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="about-title">
            <div className="modal-header">
              <h2 id="about-title">About ArchLens</h2>
              <button className="btn-icon" onClick={onCloseAbout} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="about-content">
              <div className="about-hero">
                <span className="about-logo-icon">◈</span>
                <div className="about-title-block">
                  <h3 className="about-product-name">ArchLens</h3>
                  <span className="about-tagline">Visual Architecture Design Tool</span>
                </div>
              </div>
              <p className="about-version">Version 1.0.0</p>
              <p className="about-description">
                Model your software architecture once and explore it through multiple
                lenses. Switch between C4 containment hierarchy and ArchiMate layered
                swimlanes — same model, different projections.
              </p>
              <div className="about-features">
                <div className="about-feature">
                  <Layers size={16} className="about-feature-icon" />
                  <span>C4 Model &amp; ArchiMate diagrams</span>
                </div>
                <div className="about-feature">
                  <Zap size={16} className="about-feature-icon" />
                  <span>Auto-layout powered by ELK</span>
                </div>
                <div className="about-feature">
                  <GitBranch size={16} className="about-feature-icon" />
                  <span>Multi-layer architecture</span>
                </div>
                <div className="about-feature">
                  <Box size={16} className="about-feature-icon" />
                  <span>Export to SVG, PNG &amp; JSON</span>
                </div>
              </div>
              <div className="about-built-with">
                <span className="about-built-label">Built with</span>
                <div className="about-tech-chips">
                  <span className="about-tech-chip">React</span>
                  <span className="about-tech-chip">TypeScript</span>
                  <span className="about-tech-chip">ELK</span>
                  <span className="about-tech-chip">Zustand</span>
                  <span className="about-tech-chip">Vite</span>
                </div>
              </div>
              <p className="about-copyright">© {new Date().getFullYear()} ArchLens. Open-source, free forever.</p>
            </div>
          </div>
        </div>
      )}

      {/* Support dialog */}
      {showSupport && (
        <div className="modal-overlay" onClick={onCloseSupport} role="presentation">
          <div className="modal-content modal-content--support" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="support-title">
            <div className="modal-header">
              <h2 id="support-title">Support ArchLens</h2>
              <button className="btn-icon" onClick={onCloseSupport} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="support-content">
              <div className="support-hero">
                <Heart size={40} className="support-heart-icon" />
              </div>
              <h3 className="support-heading">Why your support matters</h3>
              <p className="support-text">
                ArchLens is a free, open-source tool built with passion to help teams
                visualize and communicate software architecture effectively.
              </p>
              <ul className="support-reasons">
                <li>Keep ArchLens free and ad-free for everyone</li>
                <li>Fund new features: collaboration, import/export, cloud sync</li>
                <li>Cover hosting, infrastructure, and development costs</li>
                <li>Support an independent developer — not a corporation</li>
              </ul>
              <p className="support-text">
                Every contribution, no matter how small, helps keep this project alive
                and growing. Thank you for being part of the journey.
              </p>
              <button
                className="support-btn"
                onClick={() => window.open('https://www.paypal.com/donate/?hosted_button_id=ARCHLENS', '_blank', 'noopener,noreferrer')}
              >
                <Heart size={16} />
                Support via PayPal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact dialog */}
      {showContact && (
        <div className="modal-overlay" onClick={onCloseContact} role="presentation">
          <div className="modal-content modal-content--contact" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="contact-title">
            <div className="modal-header">
              <h2 id="contact-title">Contact</h2>
              <button className="btn-icon" onClick={onCloseContact} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="contact-content">
              {contactSent ? (
                <div className="contact-success">
                  <p>Message sent! We'll get back to you soon.</p>
                  <button className="btn btn-sm" onClick={onCloseContact}>Close</button>
                </div>
              ) : (
                <form className="contact-form" onSubmit={handleContactSubmit}>
                  <label className="contact-label">
                    Name
                    <input
                      className="contact-input"
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                      placeholder="Your name"
                    />
                  </label>
                  <label className="contact-label">
                    Email
                    <input
                      className="contact-input"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                    />
                  </label>
                  <label className="contact-label">
                    Message
                    <textarea
                      className="contact-input contact-textarea"
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      required
                      rows={4}
                      placeholder="How can we help?"
                    />
                  </label>
                  <button className="contact-submit" type="submit" disabled={contactSending}>
                    {contactSending ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
