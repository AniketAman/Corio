import { DiffEditor, DiffOnMount } from '@monaco-editor/react';
import { useReview } from '../context/ReviewContext';
import { useEffect, useState, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { tauriApi } from '../hooks/useTauriApi';
import type { editor } from 'monaco-editor';

export function DiffViewer() {
  const { prData, selectedFile, annotations, scrollToAnnotation } = useReview();
  const { resolved } = useTheme();
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [language, setLanguage] = useState('plaintext');

  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);

  useEffect(() => {
    if (!prData || !selectedFile) {
      setOriginal('');
      setModified('');
      return;
    }

    const fetchContents = async () => {
      try {
        const repoPath = await tauriApi.getRepoPath(prData.owner, prData.repo);

        const [baseContent, headContent] = await Promise.all([
          tauriApi.fetchFileContent(prData.owner, prData.repo, prData.baseRef, selectedFile, repoPath),
          tauriApi.fetchFileContent(prData.owner, prData.repo, prData.headRef, selectedFile, repoPath),
        ]);

        setOriginal(baseContent || '');
        setModified(headContent || '');

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

  const handleMount: DiffOnMount = (editor) => {
    editorRef.current = editor;

    const modifiedEditor = editor.getModifiedEditor();
    modifiedEditor.onMouseDown((e) => {
      if (!selectedFile) return;
      const lineNumber = e.target.position?.lineNumber;
      if (!lineNumber) return;

      const lines = annotations[selectedFile] || [];
      if (lines.includes(lineNumber)) {
        scrollToAnnotation(selectedFile, lineNumber);
      }
    });
  };

  useEffect(() => {
    if (!editorRef.current || !selectedFile) return;

    const modifiedEditor = editorRef.current.getModifiedEditor();
    const lines = annotations[selectedFile] || [];

    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }

    if (lines.length === 0) return;

    const decorations: editor.IModelDeltaDecoration[] = lines.map(line => ({
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
      options: {
        isWholeLine: true,
        className: 'annotation-highlight',
        glyphMarginClassName: 'annotation-glyph',
        glyphMarginHoverMessage: { value: 'Referenced in review' },
        overviewRuler: {
          color: '#8b5cf6',
          position: 1,
        },
      },
    }));

    decorationsRef.current = modifiedEditor.createDecorationsCollection(decorations);
  }, [selectedFile, annotations]);

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
      theme={resolved === 'light' ? 'vs' : 'vs-dark'}
      onMount={handleMount}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 20,
        padding: { top: 12 },
        scrollBeyondLastLine: false,
        renderSideBySide: true,
        stickyScroll: { enabled: false },
        glyphMargin: true,
      }}
    />
  );
}
