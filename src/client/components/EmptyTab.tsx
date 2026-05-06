import { useState } from 'react';
import { useReview } from '../context/ReviewContext';
import { PresetDropdown } from './PresetDropdown';
import { Button } from './ui/button';

export function EmptyTab() {
  const [prUrl, setPrUrl] = useState('');
  const { triggerReview } = useReview();

  const handleSubmit = () => {
    if (!prUrl.trim()) return;
    triggerReview(prUrl.trim());
    setPrUrl('');
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="w-full max-w-xl px-6">
        <img
          src="/home-icon.png"
          alt=""
          className="w-70 h-70 mx-auto mb-4 select-none pointer-events-none"
          draggable={false}
        />
        <h2 className="text-lg font-medium text-text-primary text-center mb-6">
          Start a Code Review
        </h2>
        <div className="flex items-center gap-3">
          <PresetDropdown />
          <input
            type="text"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="Paste a GitHub PR URL to start reviewing"
            className="flex-1 h-10 px-4 bg-surface-elevated text-text-primary border border-border rounded-[var(--radius)] text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          <Button onClick={handleSubmit} variant="default">
            Review
          </Button>
        </div>
      </div>
    </div>
  );
}
