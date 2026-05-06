import { useReview } from '../context/ReviewContext';
import { A2UIPanel } from '../a2ui';
import type { A2UIAction, A2UIMessage } from '../a2ui';
import { Badge } from './ui/badge';

interface A2UIViewProps {
  onSwitchToClassic: () => void;
}

export function A2UIView({ onSwitchToClassic }: A2UIViewProps) {
  const { a2uiPayload, a2uiLoading, a2uiError, addChatMessage, sessionId } = useReview();

  const handleAction = (action: A2UIAction) => {
    switch (action.type) {
      case 'ask-followup': {
        const question = action.payload?.question as string || 'Tell me more about this finding';
        if (sessionId) {
          addChatMessage({ role: 'user', content: question, timestamp: Date.now() });
        }
        break;
      }
      case 'copy': {
        const text = action.payload?.text as string;
        if (text) navigator.clipboard.writeText(text);
        break;
      }
      default:
        break;
    }
  };

  if (a2uiError) {
    return (
      <div className="mb-4 p-3 bg-warning-muted border border-warning/30 rounded-[var(--radius)] text-xs text-warning flex items-center justify-between">
        <span>Interactive view unavailable: {a2uiError}</span>
        <button
          onClick={onSwitchToClassic}
          className="text-xs text-text-secondary hover:text-text-primary underline bg-transparent border-none cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="default" className="text-[11px]">Experimental</Badge>
        <span className="text-[12px] text-text-muted">Interactive View</span>
        <button
          onClick={onSwitchToClassic}
          className="ml-auto text-[12px] text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer"
        >
          Switch to Classic
        </button>
      </div>
      <A2UIPanel
        payload={a2uiPayload as A2UIMessage[] | null}
        loading={a2uiLoading}
        onAction={handleAction}
        onFallback={onSwitchToClassic}
      />
    </div>
  );
}
