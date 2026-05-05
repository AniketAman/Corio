import { useState } from 'react';
import { useReview } from '../context/ReviewContext';
import { Button } from './ui/button';
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
    setStreamingMessage('');

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

      if (!response.ok) throw new Error('Failed to send message');

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
              setStreamingMessage(assistantMessage);
            } else if (event === 'done') {
              addChatMessage({
                role: 'assistant',
                content: assistantMessage,
                timestamp: Date.now()
              });
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
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3">
        {chatHistory.length === 0 && !streamingMessage ? (
          <div className="text-text-muted text-xs">
            Ask questions about the code changes...
          </div>
        ) : (
          <div className="space-y-3">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-[var(--radius-sm)] ${
                  msg.role === 'user'
                    ? 'bg-surface-elevated border border-border'
                    : 'bg-surface'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1 font-medium">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="text-[13px] text-text-secondary prose-review">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {streamingMessage && (
              <div className="p-2.5 rounded-[var(--radius-sm)] bg-surface opacity-90">
                <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1 font-medium flex items-center gap-1.5">
                  Assistant
                  <span className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                </div>
                <div className="text-[13px] text-text-secondary prose-review">
                  <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="p-3 border-t border-border-subtle">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={!sessionId || sending}
            className="flex-1 h-8 px-3 bg-surface-elevated text-text-primary border border-border rounded-[var(--radius-sm)] text-xs placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all disabled:opacity-50"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button
            onClick={handleSend}
            disabled={!sessionId || sending}
            size="sm"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
