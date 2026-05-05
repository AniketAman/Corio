import { useState, useEffect, useRef } from 'react';
import { useReview } from '../context/ReviewContext';
import { SettingsModal } from './SettingsModal';
import { PresetDropdown } from './PresetDropdown';
import { Button } from './ui/button';

export function PRInput() {
  const [prUrl, setPrUrl] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { loading, triggerReview } = useReview();
  const autoTriggered = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prParam = params.get('pr');
    if (prParam && !autoTriggered.current) {
      autoTriggered.current = true;
      setPrUrl(prParam);
      triggerReview(prParam);
    }
  }, [triggerReview]);

  const handleReview = () => triggerReview(prUrl);

  return (
    <div className="px-4 py-3 border-b border-border bg-surface">
      <div className="flex items-center gap-3">
        <PresetDropdown />

        <input
          type="text"
          value={prUrl}
          onChange={(e) => setPrUrl(e.target.value)}
          placeholder="Enter PR URL or org/repo#123"
          className="flex-1 h-9 px-3 bg-surface-elevated text-text-primary border border-border rounded-[var(--radius-sm)] text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
          onKeyDown={(e) => e.key === 'Enter' && handleReview()}
        />

        <Button
          onClick={handleReview}
          disabled={loading}
          variant="default"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Reviewing...
            </span>
          ) : (
            'Review'
          )}
        </Button>

        <Button
          onClick={() => setSettingsOpen(true)}
          variant="ghost"
          size="icon"
          title="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6.5 1.75a.75.75 0 011.5 0V3h-1.5V1.75zM8 13h-1.5v1.25a.75.75 0 001.5 0V13zM14.25 7.5a.75.75 0 010 1.5H13v-1.5h1.25zM3 8H1.75a.75.75 0 000 1.5H3V8zM8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" fill="currentColor"/>
            <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM5.5 8a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0z" fill="currentColor"/>
          </svg>
        </Button>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
