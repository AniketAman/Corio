import { useState } from 'react';
import { ExplanationPanel } from './ExplanationPanel';
import { ReviewActionsPanel } from './ReviewActionsPanel';
import { useReview } from '../context/ReviewContext';

type PanelTab = 'review' | 'actions';

export function ReviewPanelTabs() {
  const [activeTab, setActiveTab] = useState<PanelTab>('review');
  const { pendingReview } = useReview();

  const pendingCount = pendingReview.comments.length;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border-subtle shrink-0">
        <button
          onClick={() => setActiveTab('review')}
          className={`flex-1 px-3 py-2 text-[12px] font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'review'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          AI Review
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`flex-1 px-3 py-2 text-[12px] font-medium transition-colors border-b-2 -mb-px flex items-center justify-center gap-1.5 ${
            activeTab === 'actions'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          Actions
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-accent text-white">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Panel content — both stay mounted to preserve state */}
      <div className="flex-1 overflow-hidden">
        <div className={activeTab === 'review' ? 'h-full' : 'hidden'}>
          <ExplanationPanel />
        </div>
        <div className={activeTab === 'actions' ? 'h-full' : 'hidden'}>
          <ReviewActionsPanel />
        </div>
      </div>
    </div>
  );
}
