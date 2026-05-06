import { useState } from 'react';
import { Button } from './ui/button';
import { tauriApi } from '../hooks/useTauriApi';
import { open } from '@tauri-apps/plugin-dialog';

interface RepoPathPickerProps {
  owner: string;
  repo: string;
  onSelected: (path: string) => void;
  onSkip: () => void;
}

export function RepoPathPicker({ owner, repo, onSelected, onSkip }: RepoPathPickerProps) {
  const [selectedPath, setSelectedPath] = useState('');
  const [error, setError] = useState('');

  const handleBrowse = async () => {
    const selected = await open({ directory: true, multiple: false, title: `Select local repo for ${owner}/${repo}` });
    if (selected && typeof selected === 'string') {
      setSelectedPath(selected);
      setError('');
    }
  };

  const handleSave = async () => {
    if (!selectedPath) { setError('Please select a directory'); return; }
    try {
      await tauriApi.saveRepoPath(owner, repo, selectedPath);
      onSelected(selectedPath);
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : 'Invalid repository path');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-[var(--radius-md)] p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Repository Not Found</h3>
        <p className="text-xs text-text-secondary mb-4">
          Select the local clone for <span className="font-mono text-text-primary">{owner}/{repo}</span> to enable repo mode (full codebase access for deeper reviews).
        </p>
        <div className="space-y-3">
          <Button onClick={handleBrowse} variant="outline" className="w-full">
            Browse for Repository...
          </Button>
          {selectedPath && (
            <p className="text-[12px] text-text-muted break-all bg-background rounded p-2">{selectedPath}</p>
          )}
          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onSkip} size="sm" variant="ghost">Skip (Standalone)</Button>
          <Button onClick={handleSave} size="sm" disabled={!selectedPath}>Save &amp; Continue</Button>
        </div>
      </div>
    </div>
  );
}
