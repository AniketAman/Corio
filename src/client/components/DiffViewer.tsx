import { DiffEditor } from '@monaco-editor/react';
import { useReview } from '../context/ReviewContext';
import { useEffect, useState } from 'react';

export function DiffViewer() {
  const { prData, selectedFile } = useReview();
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [language, setLanguage] = useState('plaintext');

  useEffect(() => {
    if (!prData || !selectedFile) {
      setOriginal('');
      setModified('');
      return;
    }

    const fetchContents = async () => {
      const repo = `${prData.owner}/${prData.repo}`;

      try {
        const params = (ref: string) => new URLSearchParams({ repo, ref, path: selectedFile }).toString();
        const [baseRes, headRes] = await Promise.all([
          fetch(`/api/file-content?${params(prData.baseRef)}`),
          fetch(`/api/file-content?${params(prData.headRef)}`)
        ]);

        const baseData = await baseRes.json();
        const headData = await headRes.json();

        setOriginal(baseData.content || '');
        setModified(headData.content || '');

        const ext = selectedFile.split('.').pop()?.toLowerCase() || '';
        const langMap: Record<string, string> = {
          ts: 'typescript', tsx: 'typescript',
          js: 'javascript', jsx: 'javascript',
          py: 'python', go: 'go', rs: 'rust',
          java: 'java', cpp: 'cpp', c: 'c',
          md: 'markdown', json: 'json',
          yaml: 'yaml', yml: 'yaml',
          css: 'css', html: 'html', sql: 'sql',
        };
        setLanguage(langMap[ext] || 'plaintext');
      } catch (error) {
        console.error('Failed to fetch file contents:', error);
      }
    };

    fetchContents();
  }, [prData, selectedFile]);

  if (!prData || !selectedFile) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        <div className="text-center">
          <div className="text-2xl mb-2 opacity-30">&#8644;</div>
          <div>Select a file to view diff</div>
        </div>
      </div>
    );
  }

  return (
    <DiffEditor
      original={original}
      modified={modified}
      language={language}
      theme="vs-dark"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 20,
        padding: { top: 12 },
        scrollBeyondLastLine: false,
        renderSideBySide: true,
        stickyScroll: { enabled: false },
      }}
    />
  );
}
