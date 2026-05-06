import { useReview } from '../context/ReviewContext';
import { cn } from '../lib/utils';

export function FileTree() {
  const { prData, selectedFile, setSelectedFile } = useReview();

  if (!prData) {
    return (
      <div className="p-4 text-text-muted text-sm">
        No PR loaded
      </div>
    );
  }

  return (
    <div className="p-2 overflow-y-auto h-full">
      <div className="text-[12px] uppercase tracking-wider text-text-muted font-medium px-2 py-1 mb-1">
        Changed ({prData.files.length})
      </div>
      {prData.files.map((file) => {
        const isSelected = selectedFile === file.path;
        const fileName = file.path.split('/').pop();
        const dirPath = file.path.split('/').slice(0, -1).join('/');

        return (
          <button
            key={file.path}
            onClick={() => setSelectedFile(file.path)}
            className={cn(
              'w-full text-left px-2.5 py-2 mb-0.5 rounded-[var(--radius-sm)] cursor-pointer transition-all border-none',
              isSelected
                ? 'bg-accent-muted text-text-primary'
                : 'bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium truncate">{fileName}</span>
              <div className="flex gap-1.5 text-[12px] shrink-0 ml-2">
                <span className="text-success">+{file.additions}</span>
                <span className="text-danger">-{file.deletions}</span>
              </div>
            </div>
            {dirPath && (
              <div className="text-[12px] text-text-muted mt-0.5 truncate font-mono">
                {dirPath}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
