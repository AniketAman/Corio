import { useState, useEffect } from 'react';
import { useReview } from '../context/ReviewContext';

export function PRInput() {
  const [prUrl, setPrUrl] = useState('');
  const { setLoading, setPrData, setExplanation, setMode, setSessionId } = useReview();

  // Read query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prParam = params.get('pr');
    if (prParam) {
      setPrUrl(prParam);
    }
  }, []);

  const handleReview = async () => {
    if (!prUrl.trim()) return;

    setLoading(true);
    setPrData(null);
    setExplanation('');

    // Read model from query params
    const params = new URLSearchParams(window.location.search);
    const modelId = params.get('model') || undefined;

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prUrl, modelId })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch review');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let explanationText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event: (.+)$/m);
          const dataMatch = line.match(/^data: (.+)$/m);

          if (eventMatch && dataMatch) {
            const event = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);

            if (event === 'pr-metadata') {
              setPrData(data.pr);
              setMode(data.mode);
            } else if (event === 'explanation') {
              explanationText += data.chunk;
              setExplanation(explanationText);
            } else if (event === 'done') {
              if (data.sessionId) {
                setSessionId(data.sessionId);
              }
            } else if (event === 'error') {
              console.error('Review error:', data.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Review failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', padding: '12px', borderBottom: '1px solid #444' }}>
      <input
        type="text"
        value={prUrl}
        onChange={(e) => setPrUrl(e.target.value)}
        placeholder="Enter PR URL or org/repo#123"
        style={{
          flex: 1,
          padding: '8px',
          background: '#2b2b2b',
          color: '#fff',
          border: '1px solid #444',
          borderRadius: '4px'
        }}
        onKeyDown={(e) => e.key === 'Enter' && handleReview()}
      />
      <button
        onClick={handleReview}
        style={{
          padding: '8px 16px',
          background: '#0078d4',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Review
      </button>
    </div>
  );
}
