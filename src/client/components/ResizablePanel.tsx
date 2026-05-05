import { useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { cn } from '../lib/utils';

interface ResizablePanelProps {
  children: ReactNode;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  side: 'left' | 'right';
  collapsed?: boolean;
  onCollapse?: () => void;
  label?: string;
}

export function ResizablePanel({
  children,
  defaultWidth,
  minWidth = 100,
  maxWidth = 800,
  side,
  collapsed = false,
  onCollapse,
  label,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = side === 'left'
        ? e.clientX - startX.current
        : startX.current - e.clientX;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [side, minWidth, maxWidth]);

  if (collapsed) {
    return (
      <div
        className={cn(
          'w-7 bg-surface flex items-center justify-center shrink-0',
          side === 'right' ? 'border-l border-border' : 'border-r border-border'
        )}
      >
        <button
          onClick={onCollapse}
          title={`Expand ${label || 'panel'}`}
          className="bg-transparent border-none text-text-muted hover:text-accent cursor-pointer text-xs [writing-mode:vertical-lr] py-2 px-0.5 whitespace-nowrap transition-colors"
        >
          {side === 'left' ? '▶' : '◀'} {label}
        </button>
      </div>
    );
  }

  const handle = (
    <div
      onMouseDown={onMouseDown}
      className="w-1 cursor-col-resize shrink-0 relative z-10 hover:bg-accent transition-colors group"
    />
  );

  return (
    <div className="flex shrink-0" style={{ width: `${width}px` }}>
      {side === 'right' && handle}
      <div
        className={cn(
          'flex-1 overflow-hidden bg-surface flex flex-col',
          side === 'right' ? 'border-l border-border' : 'border-r border-border'
        )}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
          <span className="text-[11px] uppercase tracking-wider text-text-muted font-medium">{label}</span>
          <button
            onClick={onCollapse}
            title={`Collapse ${label || 'panel'}`}
            className="bg-transparent border-none text-text-muted hover:text-accent cursor-pointer text-xs p-0.5 transition-colors"
          >
            {side === 'left' ? '◀' : '▶'}
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
      {side === 'left' && handle}
    </div>
  );
}
