import { useState, useEffect } from 'react';
import { useReview } from '../context/ReviewContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const TEMPLATE_VARS = [
  { name: '{{repoContext}}', desc: 'Repo mode context (auto-filled)' },
  { name: '{{title}}', desc: 'PR title' },
  { name: '{{author}}', desc: 'PR author' },
  { name: '{{fileCount}}', desc: 'Number of files changed' },
  { name: '{{additions}}', desc: 'Lines added' },
  { name: '{{deletions}}', desc: 'Lines deleted' },
  { name: '{{body}}', desc: 'PR description body' },
  { name: '{{diff}}', desc: 'Full PR diff' },
  { name: '{{fileInstructions}}', desc: 'Per-file section markers' },
  { name: '{{repoToolHint}}', desc: 'Hint to use codebase tools (repo mode)' },
];

interface CustomPreset {
  id?: string;
  name: string;
  description: string;
  template: string;
  parseFileMarkers: boolean;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { presets } = useReview();
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [editing, setEditing] = useState<CustomPreset | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCustomPresets(presets.filter(p => !p.builtIn));
  }, [open, presets]);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.template.trim()) {
      setStatus('Name and template are required');
      return;
    }

    try {
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id ? `/api/presets/${editing.id}` : '/api/presets';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editing.name,
          description: editing.description,
          template: editing.template,
          parseFileMarkers: editing.parseFileMarkers,
        })
      });

      if (res.ok) {
        setStatus('Saved');
        setEditing(null);
        const updated = await fetch('/api/presets').then(r => r.json());
        setCustomPresets(updated.filter((p: any) => !p.builtIn));
        setTimeout(() => setStatus(null), 2000);
      } else {
        setStatus('Failed to save');
      }
    } catch {
      setStatus('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/presets/${id}`, { method: 'DELETE' });
      setCustomPresets(prev => prev.filter(p => p.id !== id));
    } catch {
      setStatus('Failed to delete');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Custom Presets</DialogTitle>
        </DialogHeader>

        <DialogBody className="flex-1 overflow-auto">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Name</label>
                <input
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="w-full h-9 px-3 bg-surface-elevated text-text-primary border border-border rounded-[var(--radius-sm)] text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="My Custom Preset"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Description</label>
                <input
                  value={editing.description}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  className="w-full h-9 px-3 bg-surface-elevated text-text-primary border border-border rounded-[var(--radius-sm)] text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Short description..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Template</label>
                <Textarea
                  value={editing.template}
                  onChange={e => setEditing({ ...editing, template: e.target.value })}
                  className="h-[300px] text-xs leading-relaxed"
                  spellCheck={false}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.parseFileMarkers}
                  onChange={e => setEditing({ ...editing, parseFileMarkers: e.target.checked })}
                  className="accent-accent"
                  id="parseFileMarkers"
                />
                <label htmlFor="parseFileMarkers" className="text-xs text-text-secondary">
                  Parse ### FILE: markers for per-file view
                </label>
              </div>

              <details className="mt-3">
                <summary className="text-xs text-accent cursor-pointer">
                  Available template variables
                </summary>
                <div className="mt-2 p-3 bg-surface-elevated rounded-[var(--radius-sm)] text-xs space-y-1">
                  {TEMPLATE_VARS.map(v => (
                    <div key={v.name} className="flex gap-3">
                      <code className="text-warning min-w-[160px]">{v.name}</code>
                      <span className="text-text-muted">{v.desc}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ) : (
            <div className="space-y-3">
              {customPresets.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm">
                  No custom presets yet. Create one to get started.
                </div>
              ) : (
                customPresets.map(preset => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-3 bg-surface-elevated rounded-[var(--radius)] border border-border-subtle"
                  >
                    <div>
                      <div className="text-sm font-medium text-text-primary">{preset.name}</div>
                      <div className="text-xs text-text-muted mt-0.5">{preset.description}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(preset)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:text-danger"
                        onClick={() => preset.id && handleDelete(preset.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {status && (
            <span className={`text-xs ${status === 'Saved' ? 'text-success' : 'text-danger'}`}>
              {status}
            </span>
          )}
          {editing ? (
            <>
              <Button variant="secondary" onClick={() => setEditing(null)}>Back</Button>
              <Button onClick={handleSave}>Save Preset</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>Close</Button>
              <Button onClick={() => setEditing({ name: '', description: '', template: '', parseFileMarkers: true })}>
                New Preset
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
