import { Router, Request, Response } from 'express';
import { convertToA2UI } from '../services/a2ui/index.js';

export const a2uiRouter = Router();

a2uiRouter.post('/a2ui/render', async (req: Request, res: Response) => {
  const { reviewText, presetId } = req.body;

  if (!reviewText || typeof reviewText !== 'string') {
    res.status(400).json({ error: 'reviewText is required' });
    return;
  }

  try {
    const payload = await convertToA2UI(reviewText, presetId || 'review');
    if (!payload) {
      res.status(422).json({ error: 'Failed to convert to A2UI format', fallback: true });
      return;
    }
    res.json({ payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message, fallback: true });
  }
});
