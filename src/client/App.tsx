import { ReviewProvider } from './context/ReviewContext';
import { PRInput } from './components/PRInput';
import { FileTree } from './components/FileTree';
import { DiffViewer } from './components/DiffViewer';
import { ExplanationPanel } from './components/ExplanationPanel';
import { StatusBar } from './components/StatusBar';
import './styles/app.css';

export function App() {
  return (
    <ReviewProvider>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <PRInput />

        {/* Main three-column layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: File tree */}
          <div style={{
            width: '220px',
            borderRight: '1px solid #444',
            background: '#252526',
            overflowY: 'auto'
          }}>
            <FileTree />
          </div>

          {/* Center: Monaco diff */}
          <div style={{ flex: 1, background: '#1e1e1e' }}>
            <DiffViewer />
          </div>

          {/* Right: AI explanation + chat */}
          <div style={{
            width: '350px',
            borderLeft: '1px solid #444',
            background: '#252526'
          }}>
            <ExplanationPanel />
          </div>
        </div>

        {/* Bottom status bar */}
        <StatusBar />
      </div>
    </ReviewProvider>
  );
}
