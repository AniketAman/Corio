import { Router, Request, Response } from 'express';
import {
  getAllPresets,
  getPresetById,
  saveCustomPreset,
  deleteCustomPreset,
} from '../services/presets.js';
import { randomUUID } from 'crypto';

export const presetsRouter = Router();

// GET /api/presets — return all presets (built-in + custom)
presetsRouter.get('/presets', async (_req: Request, res: Response) => {
  const presets = await getAllPresets();
  res.json(presets);
});

// POST /api/presets — create a custom preset
presetsRouter.post('/presets', async (req: Request, res: Response) => {
  const { name, description, template, parseFileMarkers } = req.body;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required and must be a string' });
    return;
  }

  if (!template || typeof template !== 'string') {
    res.status(400).json({ error: 'template is required and must be a string' });
    return;
  }

  const preset = await saveCustomPreset({
    id: randomUUID(),
    name,
    description: description || '',
    template,
    parseFileMarkers: parseFileMarkers ?? false,
  });

  res.status(201).json({ preset });
});

// PUT /api/presets/:id — update a custom preset
presetsRouter.put('/presets/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const existing = await getPresetById(id);

  if (!existing) {
    res.status(404).json({ error: 'Preset not found' });
    return;
  }

  if (existing.builtIn) {
    res.status(403).json({ error: 'Cannot modify built-in presets' });
    return;
  }

  const { name, description, template, parseFileMarkers } = req.body;

  const updated = await saveCustomPreset({
    id: id as string,
    name: name ?? existing.name,
    description: description ?? existing.description,
    template: template ?? existing.template,
    parseFileMarkers: parseFileMarkers ?? existing.parseFileMarkers,
  });

  res.json({ preset: updated });
});

// DELETE /api/presets/:id — delete a custom preset
presetsRouter.delete('/presets/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const existing = await getPresetById(id);

  if (!existing) {
    res.status(404).json({ error: 'Preset not found' });
    return;
  }

  if (existing.builtIn) {
    res.status(403).json({ error: 'Cannot delete built-in presets' });
    return;
  }

  await deleteCustomPreset(id as string);
  res.json({ success: true });
});
