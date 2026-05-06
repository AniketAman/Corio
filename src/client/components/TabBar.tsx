import { useTabs } from '../context/TabsContext';

interface TabProps {
  id: string;
  prUrl: string | null;
  prData: { title: string; number: number; repo: string } | null;
  loading: boolean;
  isActive: boolean;
  onClose: () => void;
  onClick: () => void;
  style?: React.CSSProperties;
}

function Tab({ id: _id, prUrl, prData, loading, isActive, onClose, onClick, style }: TabProps) {
  const getTabTitle = () => {
    if (prData) return prData.title;
    if (prUrl && !prData) return 'Loading...';
    return 'New Tab';
  };

  const getTabTooltip = () => {
    if (prData) return prData.title;
    return getTabTitle();
  };

  return (
    <div
      className={`h-8 flex items-center gap-1.5 px-3 rounded-t-lg text-xs font-medium cursor-pointer transition-colors relative group ${
        isActive
          ? 'bg-[var(--color-tab-active)] text-[var(--color-tab-text)]'
          : 'bg-[var(--color-tab-bar-bg)] text-[var(--color-tab-text-muted)] hover:bg-[var(--color-tab-inactive-hover)]'
      }`}
      onClick={onClick}
      title={getTabTooltip()}
      style={style}
    >
      {loading && (
        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      )}
      <span className="flex-1 truncate min-w-0">
        {getTabTitle()}
      </span>
      <button
        className={`w-4 h-4 rounded-sm flex items-center justify-center hover:bg-white/10 transition-opacity ${
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

  return (
    <div
      className="h-9 flex items-end px-2 pt-2 bg-[var(--color-tab-bar-bg)]"
      data-tauri-drag-region
    >
      <div className="flex items-end gap-0.5 flex-1 min-w-0 overflow-hidden">
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
            style={{ maxWidth: '220px', minWidth: '100px', flex: '1 1 0' }}
          />
        ))}
      </div>
      <button
        className="w-6 h-6 rounded-full flex items-center justify-center ml-1 text-[var(--color-tab-text-muted)] hover:bg-[var(--color-tab-inactive-hover)] transition-colors flex-shrink-0"
        onClick={() => addTab()}
        aria-label="New tab"
        title="New tab"
      >
        +
      </button>
    </div>
  );
}
