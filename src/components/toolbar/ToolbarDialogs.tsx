import React, { useState } from 'react';
import { Heart, X } from 'lucide-react';

interface ToolbarDialogsProps {
  showHelp: boolean;
  onCloseHelp: () => void;
  showSupport: boolean;
  onCloseSupport: () => void;
  showContact: boolean;
  onCloseContact: () => void;
}

export const ToolbarDialogs: React.FC<ToolbarDialogsProps> = ({
  showHelp, onCloseHelp,
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
              <div className="help-shortcuts">
                <div className="help-shortcut"><kbd>Scroll</kbd> <span>Zoom in/out</span></div>
                <div className="help-shortcut"><kbd>Click + Drag</kbd> <span>Pan canvas</span></div>
                <div className="help-shortcut"><kbd>Double-click</kbd> <span>Drill into entity</span></div>
                <div className="help-shortcut"><kbd>Escape</kbd> <span>Close dialog</span></div>
                <div className="help-shortcut"><kbd>F5</kbd> <span>Presentation mode</span></div>
                <div className="help-shortcut"><kbd>F11</kbd> <span>Distraction-free mode</span></div>
              </div>
              <h3 style={{ marginTop: 16 }}>About</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                ArchLens is a C4-model compliant architecture modeling platform.
                It supports zoom levels (System Context, Container, Component, Code).
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Version 1.0.0
              </p>
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
