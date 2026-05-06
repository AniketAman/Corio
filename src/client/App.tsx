import { useState, useEffect } from 'react';
import { ReviewProvider, useReview } from './context/ReviewContext';
import { TabsProvider, useTabs } from './context/TabsContext';
import { TabBar } from './components/TabBar';
import { EmptyTab } from './components/EmptyTab';
import { FileTree } from './components/FileTree';
import { DiffViewer } from './components/DiffViewer';
import { ReviewPanelTabs } from './components/ReviewPanelTabs';
import { StatusBar } from './components/StatusBar';
import { ResizablePanel } from './components/ResizablePanel';
import { TooltipProvider } from './components/ui/tooltip';

function ErrorBanner() {
  const { error, setError } = useReview();
  if (!error) return null;

  return (
    <div className="px-4 py-2.5 bg-danger-muted border-b border-danger/30 text-danger text-sm flex items-center gap-2">
      <span className="flex-1">{error}</span>
      <button
        onClick={() => setError(null)}
        className="text-danger hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer text-base"
      >
        &times;
      </button>
    </div>
  );
}

function MainLayout() {
  const [fileTreeCollapsed, setFileTreeCollapsed] = useState(false);
  const [explanationCollapsed, setExplanationCollapsed] = useState(false);
  const { tabs, activeTabId, activeTab, addTab, closeTab, setActiveTab } = useTabs();

  // Keyboard shortcuts for tab navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && e.key === 't') {
        e.preventDefault();
        addTab();
      }
      if (isMeta && e.key === 'w') {
        e.preventDefault();
        closeTab(activeTabId);
      }
      if (isMeta && e.shiftKey && e.key === ']') {
        e.preventDefault();
        // Next tab
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        if (currentIndex < tabs.length - 1) {
          setActiveTab(tabs[currentIndex + 1].id);
        }
      }
      if (isMeta && e.shiftKey && e.key === '[') {
        e.preventDefault();
        // Previous tab
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        if (currentIndex > 0) {
          setActiveTab(tabs[currentIndex - 1].id);
        }
      }
      // Cmd+1 through Cmd+9
      if (isMeta && !e.shiftKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (index < tabs.length) {
          setActiveTab(tabs[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, addTab, closeTab, setActiveTab]);

  const showEmptyTab = activeTab && activeTab.prData === null && !activeTab.loading;

  return (
    <div className="h-screen flex flex-col bg-background">
      <TabBar />
      <ErrorBanner />

      {showEmptyTab ? (
        <EmptyTab />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <ResizablePanel
            defaultWidth={240}
            minWidth={160}
            maxWidth={500}
            side="left"
            collapsed={fileTreeCollapsed}
            onCollapse={() => setFileTreeCollapsed(c => !c)}
            label="Files"
          >
            <FileTree />
          </ResizablePanel>

          <div className="flex-1 bg-background overflow-hidden">
            <DiffViewer />
          </div>

          <ResizablePanel
            defaultWidth={400}
            minWidth={280}
            maxWidth={700}
            side="right"
            collapsed={explanationCollapsed}
            onCollapse={() => setExplanationCollapsed(c => !c)}
            label="Review"
          >
            <ReviewPanelTabs />
          </ResizablePanel>
        </div>
      )}

      <StatusBar />
    </div>
  );
}

export function App() {
  return (
    <TooltipProvider>
      <TabsProvider>
        <ReviewProvider>
          <MainLayout />
        </ReviewProvider>
      </TabsProvider>
    </TooltipProvider>
  );
}
