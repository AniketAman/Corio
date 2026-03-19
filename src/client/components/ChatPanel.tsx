import { useState } from 'react';
import { useReview } from '../context/ReviewContext';
import ReactMarkdown from 'react-markdown';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const { chatHistory, addChatMessage, sessionId, mode } = useReview();
  const [sending, setSending] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');

  const handleSend = async () => {
    if (!input.trim() || !sessionId || sending) return;

    const question = input.trim();
    setInput('');
    setSending(true);
    setStreamingMessage(''); // Reset streaming message

    // Add user message
    addChatMessage({
      role: 'user',
      content: question,
      timestamp: Date.now()
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sessionId, mode: { type: mode } })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessage = '';

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

            if (event === 'message') {
              assistantMessage += data.chunk;
              // Update streaming message incrementally for live display
              setStreamingMessage(assistantMessage);
            } else if (event === 'done') {
              // Add final message to history
              addChatMessage({
                role: 'assistant',
                content: assistantMessage,
                timestamp: Date.now()
              });
              // Clear streaming message
              setStreamingMessage('');
            } else if (event === 'error') {
              console.error('Chat error:', data.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat failed:', error);
      setStreamingMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {chatHistory.length === 0 && !streamingMessage ? (
          <div style={{ color: '#888', fontSize: '13px' }}>
            Ask questions about the code changes...
          </div>
        ) : (
          <>
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                style={{
                  marginBottom: '12px',
                  padding: '8px',
                  background: msg.role === 'user' ? '#2b2b2b' : '#1e1e1e',
                  borderRadius: '4px'
                }}
              >
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div style={{ fontSize: '13px', color: '#ccc' }}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {streamingMessage && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '8px',
                  background: '#1e1e1e',
                  borderRadius: '4px',
                  opacity: 0.9
                }}
              >
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                  Assistant (streaming...)
                </div>
                <div style={{ fontSize: '13px', color: '#ccc' }}>
                  <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div style={{ padding: '12px', borderTop: '1px solid #444' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={!sessionId || sending}
            style={{
              flex: 1,
              padding: '8px',
              background: '#2b2b2b',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px'
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!sessionId || sending}
            style={{
              padding: '8px 16px',
              background: !sessionId || sending ? '#444' : '#0078d4',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: !sessionId || sending ? 'not-allowed' : 'pointer'
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
