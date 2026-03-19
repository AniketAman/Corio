import { useReview } from '../context/ReviewContext';

export function FileTree() {
  const { prData, selectedFile, setSelectedFile } = useReview();

  if (!prData) {
    return (
      <div style={{ padding: '16px', color: '#888' }}>
        No PR loaded
      </div>
    );
  }

  return (
    <div style={{ padding: '8px', overflowY: 'auto' }}>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
        Changed Files ({prData.files.length})
      </div>
      {prData.files.map((file) => (
        <div
          key={file.path}
          onClick={() => setSelectedFile(file.path)}
          style={{
            padding: '8px',
            marginBottom: '4px',
            background: selectedFile === file.path ? '#37373d' : 'transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            color: selectedFile === file.path ? '#fff' : '#ccc'
          }}
        >
          <div style={{ marginBottom: '4px' }}>{file.path.split('/').pop()}</div>
          <div style={{ fontSize: '11px', color: '#888' }}>
            <span style={{ color: '#4ec9b0' }}>+{file.additions}</span>
            {' '}
            <span style={{ color: '#f48771' }}>-{file.deletions}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
