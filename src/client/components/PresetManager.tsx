import { useState, useEffect } from 'react';
import { tauriApi, Preset } from '../hooks/useTauriApi';
import { Button } from './ui/button';
import { PresetEditor } from './PresetEditor';

export function PresetManager({ onClose }: { onClose: () => void }) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);

  useEffect(() => { loadPresets(); }, []);

  const loadPresets = async () => {
    const data = await tauriApi.getAllPresets();
    setPresets(data);
  };

  const handleDuplicate = (preset: Preset) => {
    setEditingPreset({
      ...preset,
      id: '',
      name: `${preset.name} (Copy)`,
      builtIn: false,
    });
  };

  const handleEdit = (preset: Preset) => {
    setEditingPreset(preset);
  };

  const handleNew = () => {
    setEditingPreset({
      id: '',
      name: 'New Preset',
      description: '',
      template: 'You are reviewing a GitHub PR{{repoContext}}.\n\n## PR Information\n- **Title:** {{title}}\n- **Author:** {{author}}\n\n## Diff\n{{diff}}\n\n## Instructions\n\nYour review instructions here.\n\n{{repoToolHint}}',
      builtIn: false,
      parseFileMarkers: false,
    });
  };

  const handleSave = async (preset: Preset) => {
    await tauriApi.savePreset(preset);
    await loadPresets();
    setEditingPreset(null);
  };

  const handleDelete = async (id: string) => {
    await tauriApi.deletePreset(id);
    await loadPresets();
  };

  if (editingPreset) {
    return (
      <PresetEditor
        preset={editingPreset}
        onSave={handleSave}
        onCancel={() => setEditingPreset(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-base font-semibold text-text-primary">Review Presets</h2>
        <div className="flex gap-2">
          <Button onClick={handleNew} size="sm">New Preset</Button>
          <Button onClick={onClose} size="sm" variant="ghost">Close</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="p-3 border border-border rounded-[var(--radius-md)] bg-surface hover:bg-surface-elevated transition-colors"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-text-primary">{preset.name}</h3>
                  {preset.builtIn && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded">
                      Built-in
                    </span>
                  )}
                  {preset.parseFileMarkers && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-surface-elevated text-text-muted rounded">
                      Per-file
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">{preset.description}</p>
              </div>
              <div className="flex gap-1">
                {preset.builtIn ? (
                  <Button onClick={() => handleDuplicate(preset)} size="sm" variant="ghost">
                    Duplicate
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => handleEdit(preset)} size="sm" variant="ghost">
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(preset.id)}
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:text-danger"
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-text-muted hover:text-text-secondary">
                View template
              </summary>
              <pre className="mt-2 p-2 bg-background rounded text-[11px] text-text-secondary overflow-x-auto max-h-40 overflow-y-auto">
                {preset.template}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
