import { useState } from 'react';
import { Preset } from '../hooks/useTauriApi';
import { Button } from './ui/button';
import { useTheme } from '../hooks/useTheme';
import Editor from '@monaco-editor/react';

interface PresetEditorProps {
  preset: Preset;
  onSave: (preset: Preset) => void;
  onCancel: () => void;
}

export function PresetEditor({ preset, onSave, onCancel }: PresetEditorProps) {
  const { resolved } = useTheme();
  const [name, setName] = useState(preset.name);
  const [description, setDescription] = useState(preset.description);
  const [template, setTemplate] = useState(preset.template);
  const [parseFileMarkers, setParseFileMarkers] = useState(preset.parseFileMarkers);

  const handleSave = () => {
    onSave({
      ...preset,
      name,
      description,
      template,
      parseFileMarkers,
      builtIn: false,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-base font-semibold text-text-primary">
          {preset.id ? 'Edit Preset' : 'New Preset'}
        </h2>
        <div className="flex gap-2">
          <Button onClick={onCancel} size="sm" variant="ghost">Cancel</Button>
          <Button onClick={handleSave} size="sm">Save</Button>
        </div>
      </div>

      <div className="p-4 space-y-3 border-b border-border">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-text-secondary mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 bg-surface-elevated text-text-primary border border-border rounded-[var(--radius-sm)] text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-text-secondary mb-1 block">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 bg-surface-elevated text-text-primary border border-border rounded-[var(--radius-sm)] text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="parseFileMarkers"
            checked={parseFileMarkers}
            onChange={(e) => setParseFileMarkers(e.target.checked)}
            className="w-3.5 h-3.5"
          />
          <label htmlFor="parseFileMarkers" className="text-xs text-text-secondary">
            Parse per-file markers (### FILE: path)
          </label>
        </div>
        <p className="text-[11px] text-text-muted">
          Available placeholders: {'{{title}}'}, {'{{author}}'}, {'{{fileCount}}'}, {'{{additions}}'}, {'{{deletions}}'}, {'{{body}}'}, {'{{diff}}'}, {'{{fileInstructions}}'}, {'{{repoContext}}'}, {'{{repoToolHint}}'}
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="markdown"
          value={template}
          onChange={(value) => setTemplate(value || '')}
          theme={resolved === 'light' ? 'vs' : 'vs-dark'}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            wordWrap: 'on',
            lineNumbers: 'off',
            scrollBeyondLastLine: false,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
}
