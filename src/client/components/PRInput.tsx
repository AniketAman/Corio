import { useState, useEffect, useRef } from 'react';
import { useReview } from '../context/ReviewContext';
import { PresetDropdown } from './PresetDropdown';
import { Button } from './ui/button';

export function PRInput() {
  const [prUrl, setPrUrl] = useState('');
  const { loading, triggerReview, isCachedReview } = useReview();
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

        {isCachedReview && (
          <span className="text-[11px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full font-medium">
            Cached
          </span>
        )}
      </div>
    </div>
  );
}
