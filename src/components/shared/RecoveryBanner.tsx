import React from 'react';

interface RecoveryBannerProps {
  entityCount: number;
  savedAt: string;
  onRestore: () => void;
  onDiscard: () => void;
}

export const RecoveryBanner: React.FC<RecoveryBannerProps> = ({
  entityCount,
  savedAt,
  onRestore,
  onDiscard,
}) => (
  <div className="recovery-banner" role="alert" aria-live="assertive">
    <span className="recovery-banner-text">
      Autosave found from <strong>{savedAt}</strong> with {entityCount} {entityCount === 1 ? 'entity' : 'entities'}.
    </span>
    <div className="recovery-banner-actions">
      <button className="btn btn-sm btn-primary" onClick={onRestore}>Restore</button>
      <button className="btn btn-sm" onClick={onDiscard}>Discard</button>
    </div>
  </div>
);
