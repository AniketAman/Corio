import { useState } from 'react';
import { ReviewProvider, useReview } from './context/ReviewContext';
import { PRInput } from './components/PRInput';
import { FileTree } from './components/FileTree';
import { DiffViewer } from './components/DiffViewer';
import { ExplanationPanel } from './components/ExplanationPanel';
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

  return (
    <div className="h-screen flex flex-col bg-background">
      <PRInput />
      <ErrorBanner />

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
          label="AI Review"
        >
          <ExplanationPanel />
        </ResizablePanel>
      </div>

      <StatusBar />
    </div>
  );
}

export function App() {
  return (
    <TooltipProvider>
      <ReviewProvider>
        <MainLayout />
      </ReviewProvider>
    </TooltipProvider>
  );
}
