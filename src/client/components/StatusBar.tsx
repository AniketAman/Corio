import { useReview } from '../context/ReviewContext';

export function StatusBar() {
  const { prData, mode } = useReview();

  if (!prData) {
    return (
      <div style={{
        padding: '8px 16px',
        background: '#1e1e1e',
        borderTop: '1px solid #444',
        fontSize: '12px',
        color: '#888'
      }}>
        No PR loaded
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '8px 16px',
      background: '#1e1e1e',
      borderTop: '1px solid #444',
      fontSize: '12px',
      color: '#ccc'
    }}>
      <span style={{ color: mode === 'repo' ? '#4ec9b0' : '#888' }}>
        {mode === 'repo' ? '● repo mode' : '○ standalone mode'}
      </span>
      <span>PR #{prData.number}</span>
      <span>{prData.files.length} files</span>
      <span>
        <span style={{ color: '#4ec9b0' }}>+{prData.additions}</span>
        {' '}
        <span style={{ color: '#f48771' }}>-{prData.deletions}</span>
      </span>
    </div>
  );
}
