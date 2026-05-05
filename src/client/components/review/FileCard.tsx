import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '../../lib/utils';

interface FileCardProps {
  filePath: string;
  additions?: number;
  deletions?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onFileClick?: (path: string) => void;
}

export function FileCard({
  filePath,
  additions,
  deletions,
  children,
  defaultOpen = false,
  onFileClick,
}: FileCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const segments = filePath.split('/');
  const fileName = segments[segments.length - 1];
  const directory = segments.length > 1 ? segments.slice(0, -1).join('/') + '/' : '';

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-surface-elevated border border-border-subtle rounded-[var(--radius)] overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full text-left px-3 py-2.5 flex items-center gap-2 bg-transparent border-none cursor-pointer hover:bg-surface-hover transition-colors">
            <svg
              className={cn(
                'w-4 h-4 shrink-0 text-text-muted transition-transform duration-200',
                open && 'rotate-90'
              )}
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06z" />
            </svg>

            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  'text-sm font-semibold text-text-primary block truncate',
                  onFileClick && 'hover:text-accent hover:underline cursor-pointer'
                )}
                onClick={(e) => {
                  if (onFileClick) {
                    e.stopPropagation();
                    onFileClick(filePath);
                  }
                }}
              >
                {fileName}
              </span>
              {directory && (
                <span className="text-[11px] text-text-muted font-mono block truncate">
                  {directory}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {additions != null && additions > 0 && (
                <span className="text-[11px] text-success font-mono">+{additions}</span>
              )}
              {deletions != null && deletions > 0 && (
                <span className="text-[11px] text-danger font-mono">-{deletions}</span>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-l-2 border-accent mx-3 mb-3 pl-3 pt-1">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
