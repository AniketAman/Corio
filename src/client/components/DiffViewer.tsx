import { DiffEditor, DiffOnMount } from '@monaco-editor/react';
import { useReview } from '../context/ReviewContext';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { tauriApi } from '../hooks/useTauriApi';
import type { editor } from 'monaco-editor';
import { createRoot } from 'react-dom/client';
import { DiffCommentWidget } from './DiffCommentWidget';

export function DiffViewer() {
  const { prData, selectedFile, annotations, scrollToAnnotation, addPendingComment, pendingReview } = useReview();
  const { resolved } = useTheme();
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [language, setLanguage] = useState('plaintext');

  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const pendingDecorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const widgetRef = useRef<editor.IContentWidget | null>(null);
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetRootRef = useRef<ReturnType<typeof createRoot> | null>(null);

  const getPrefillForLine = useCallback((line: number): string | undefined => {
    if (!selectedFile) return undefined;
    const lines = annotations[selectedFile] || [];
    if (lines.includes(line)) {
      return `Consider reviewing this line as it was referenced in the AI analysis.`;
    }
    return undefined;
  }, [selectedFile, annotations]);

  const removeWidget = useCallback(() => {
    if (widgetRef.current && editorRef.current) {
      const modifiedEditor = editorRef.current.getModifiedEditor();
      modifiedEditor.removeContentWidget(widgetRef.current);
      widgetRef.current = null;
    }
    if (widgetRootRef.current) {
      widgetRootRef.current.unmount();
      widgetRootRef.current = null;
    }
    if (widgetContainerRef.current) {
      widgetContainerRef.current = null;
    }
  }, []);

  const showCommentWidget = useCallback((line: number) => {
    if (!editorRef.current || !selectedFile) return;

    removeWidget();

    const modifiedEditor = editorRef.current.getModifiedEditor();
    const container = document.createElement('div');
    widgetContainerRef.current = container;

    const prefill = getPrefillForLine(line);

    const root = createRoot(container);
    widgetRootRef.current = root;

    root.render(
      <DiffCommentWidget
        line={line}
        filePath={selectedFile}
        prefill={prefill}
        onSubmit={(body) => {
          addPendingComment({
            body,
            type: 'inline',
            path: selectedFile,
            line,
            source: prefill ? 'finding' : 'manual',
          });
          removeWidget();
        }}
        onCancel={() => {
          removeWidget();
        }}
      />
    );

    const widget: editor.IContentWidget = {
      getId: () => 'diff-comment-widget',
      getDomNode: () => container,
      getPosition: () => ({
        position: { lineNumber: line, column: 1 },
        preference: [1], // BELOW
      }),
    };

    widgetRef.current = widget;
    modifiedEditor.addContentWidget(widget);
  }, [selectedFile, addPendingComment, getPrefillForLine, removeWidget]);

  useEffect(() => {
    if (!prData || !selectedFile) {
      setOriginal('');
      setModified('');
      return;
    }

    let cancelled = false;

    const fetchContents = async () => {
      try {
        let repoRoot: string | null = null;
        try {
          repoRoot = await tauriApi.getRepoPath(prData.owner, prData.repo);
        } catch {
          // No repo registered — will use gh api fallback
        }

        const [baseContent, headContent] = await Promise.all([
          tauriApi.fetchFileContent(prData.owner, prData.repo, prData.baseRef, selectedFile, repoRoot),
          tauriApi.fetchFileContent(prData.owner, prData.repo, prData.headRef, selectedFile, repoRoot),
        ]);

        if (cancelled) return;

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
    return () => { cancelled = true; };
  }, [prData, selectedFile]);

  const handleMount: DiffOnMount = (editor) => {
    editorRef.current = editor;

    const modifiedEditor = editor.getModifiedEditor();
    modifiedEditor.onMouseDown((e) => {
      if (!selectedFile) return;
      const lineNumber = e.target.position?.lineNumber;
      if (!lineNumber) return;

      // Handle glyph margin clicks (type 2 = GUTTER_GLYPH_MARGIN)
      if (e.target.type === 2) {
        showCommentWidget(lineNumber);
        return;
      }

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

  useEffect(() => {
    if (!editorRef.current || !selectedFile) return;

    const modifiedEditor = editorRef.current.getModifiedEditor();
    const inlineComments = pendingReview.comments.filter(
      (c) => c.type === 'inline' && c.path === selectedFile && c.line
    );

    if (pendingDecorationsRef.current) {
      pendingDecorationsRef.current.clear();
    }

    if (inlineComments.length === 0) return;

    const decorations: editor.IModelDeltaDecoration[] = inlineComments.map((comment) => ({
      range: {
        startLineNumber: comment.line!,
        startColumn: 1,
        endLineNumber: comment.line!,
        endColumn: 1,
      },
      options: {
        isWholeLine: true,
        className: 'pending-comment-highlight',
        glyphMarginClassName: 'pending-comment-glyph',
        glyphMarginHoverMessage: { value: 'Pending review comment' },
      },
    }));

    pendingDecorationsRef.current = modifiedEditor.createDecorationsCollection(decorations);
  }, [selectedFile, pendingReview.comments]);

  // Cleanup widget when file changes
  useEffect(() => {
    removeWidget();
  }, [selectedFile, removeWidget]);

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
