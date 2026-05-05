import { Router, Request, Response } from 'express';
import { streamChatResponse } from '../services/claude.js';
import { ReviewMode } from '../types.js';

export const chatRouter = Router();

chatRouter.post('/chat', (req: Request, res: Response) => {
  const { question, sessionId, mode, modelId = 'opus' } = req.body;

  if (!question || !sessionId) {
    res.status(400).json({ error: 'Missing question or sessionId' });
    return;
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function sendEvent(event: string, data: any) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  const reviewMode: ReviewMode = mode || { type: 'standalone' };

  streamChatResponse(question, sessionId, reviewMode, modelId, {
    onToken: (token) => {
      sendEvent('message', { chunk: token });
    },
    onError: (error) => {
      sendEvent('error', { message: error.message });
      res.end();
    },
    onComplete: () => {
      sendEvent('done', {});
      res.end();
    }
  });
});
