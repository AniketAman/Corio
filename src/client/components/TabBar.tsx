import { useTabs } from '../context/TabsContext';
import { useReview } from '../context/ReviewContext';

interface TabProps {
  id: string;
  prUrl: string | null;
  prData: { title: string; number: number; repo: string } | null;
  loading: boolean;
  isActive: boolean;
  onClose: () => void;
  onClick: () => void;
  onReReview: () => void;
  style?: React.CSSProperties;
}

function Tab({ id: _id, prUrl, prData, loading, isActive, onClose, onClick, onReReview, style }: TabProps) {
  const getTabTitle = () => {
    if (prData) return prData.title;
    if (prUrl && !prData) return 'Loading...';
    return 'New Tab';
  };

  const getTabTooltip = () => {
    if (prData) return prData.title;
    return getTabTitle();
  };

  const showReReview = prUrl && !loading;

  return (
    <div
      className={`tab-firefox h-9 flex items-center gap-1.5 px-3 text-xs font-medium cursor-pointer transition-all relative group ${
        isActive
          ? 'tab-firefox-active bg-[var(--color-surface)] text-[var(--color-tab-text)] z-10'
          : 'text-[var(--color-tab-text-muted)] hover:bg-[var(--color-tab-inactive-hover)]'
      }`}
      onClick={onClick}
      title={getTabTooltip()}
      style={style}
    >
      {loading && (
        <span className="w-2 h-2 rounded-full bg-current animate-pulse flex-shrink-0" />
      )}
      <span className="flex-1 truncate min-w-0">
        {getTabTitle()}
      </span>
      {showReReview && (
        <button
          className={`text-[10px] px-1.5 py-0.5 rounded text-accent hover:text-accent-hover hover:bg-accent-muted transition-all flex-shrink-0 ${
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onReReview();
          }}
          aria-label="Re-review"
          title="Re-review this PR"
        >
          ↻
        </button>
      )}
      <button
        className={`w-4 h-4 rounded-sm flex items-center justify-center hover:bg-white/10 transition-opacity flex-shrink-0 ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close tab"
      >
        ×
      </button>
    </div>
  );
}

export function TabBar() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab } = useTabs();
  const { forceReReview } = useReview();

  return (
    <div
      className="h-10 flex items-stretch bg-[var(--color-tab-bar-bg)] border-b border-[var(--color-tab-border)]"
      data-tauri-drag-region
    >
      <div className="flex items-stretch flex-1 min-w-0 overflow-hidden">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            id={tab.id}
            prUrl={tab.prUrl}
            prData={tab.prData}
            loading={tab.loading}
            isActive={tab.id === activeTabId}
            onClose={() => closeTab(tab.id)}
            onClick={() => setActiveTab(tab.id)}
            onReReview={forceReReview}
            style={{ maxWidth: '240px', minWidth: '120px', flex: '1 1 0' }}
          />
        ))}
        <button
          className="h-9 w-9 flex items-center justify-center self-center text-[var(--color-tab-text-muted)] hover:bg-[var(--color-tab-inactive-hover)] hover:text-[var(--color-tab-text)] rounded transition-colors flex-shrink-0 text-sm"
          onClick={() => addTab()}
          aria-label="New tab"
          title="New tab"
        >
          +
        </button>
      </div>
    </div>
  );
}
