import { useReview } from '../context/ReviewContext';
import { ChatPanel } from './ChatPanel';
import ReactMarkdown from 'react-markdown';

export function ExplanationPanel() {
  const { explanation, loading } = useReview();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', borderBottom: '1px solid #444' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#fff' }}>
          AI Explanation
        </h3>
        {loading && !explanation && (
          <div style={{ color: '#888', fontSize: '13px' }}>Loading...</div>
        )}
        {explanation && (
          <div style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.6' }}>
            <ReactMarkdown>{explanation}</ReactMarkdown>
          </div>
        )}
      </div>
      <div style={{ height: '300px' }}>
        <ChatPanel />
      </div>
    </div>
  );
}
