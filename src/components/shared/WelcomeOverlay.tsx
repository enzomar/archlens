import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'archlens-welcomed';

export const WelcomeOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const steps = [
    {
      title: 'Model once',
      body: 'Create entities, relationships, and metadata in a single source of truth. No duplication across views.',
      icon: '📐',
    },
    {
      title: 'View through different lenses',
      body: 'Switch between C4 Abstraction and ArchiMate Layers — same model, different projections. Use the Projection toggle in the control bar.',
      icon: '🔀',
    },
    {
      title: 'Ready to start',
      body: 'Drag shapes from the palette, use the Insert tab, or right-click the canvas. Press Ctrl+Shift+P for the command palette.',
      icon: '🚀',
    },
  ];

  const current = steps[step];

  return (
    <div className="welcome-overlay" role="dialog" aria-modal="true" aria-label="Welcome to ArchLens">
      <div className="welcome-card">
        <button className="welcome-close btn-icon" onClick={dismiss} aria-label="Close">
          <X size={18} />
        </button>

        <div className="welcome-icon">{current.icon}</div>
        <h2 className="welcome-title">{current.title}</h2>
        <p className="welcome-body">{current.body}</p>

        <div className="welcome-dots">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`welcome-dot${i === step ? ' welcome-dot--active' : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <div className="welcome-actions">
          {step < steps.length - 1 ? (
            <>
              <button className="btn btn-sm" onClick={dismiss}>Skip</button>
              <button className="btn btn-sm btn-primary" onClick={() => setStep(step + 1)}>Next</button>
            </>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={dismiss}>Get started</button>
          )}
        </div>
      </div>
    </div>
  );
};
