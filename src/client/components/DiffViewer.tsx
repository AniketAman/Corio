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
        const [baseRes, headRes] = await Promise.all([
          fetch(`/api/file-content?repo=${repo}&ref=${prData.baseRef}&path=${selectedFile}`),
          fetch(`/api/file-content?repo=${repo}&ref=${prData.headRef}&path=${selectedFile}`)
        ]);

        const baseData = await baseRes.json();
        const headData = await headRes.json();

        setOriginal(baseData.content || '');
        setModified(headData.content || '');

        // Detect language from file extension
        const ext = selectedFile.split('.').pop()?.toLowerCase() || '';
        const langMap: Record<string, string> = {
          ts: 'typescript',
          tsx: 'typescript',
          js: 'javascript',
          jsx: 'javascript',
          py: 'python',
          go: 'go',
          rs: 'rust',
          java: 'java',
          cpp: 'cpp',
          c: 'c',
          md: 'markdown',
          json: 'json',
          yaml: 'yaml',
          yml: 'yaml'
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
        Select a file to view diff
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
        fontSize: 13
      }}
    />
  );
}
