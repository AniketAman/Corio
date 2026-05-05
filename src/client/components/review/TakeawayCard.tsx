import ReactMarkdown from 'react-markdown';

interface TakeawayCardProps {
  text: string;
  filePath?: string;
  onFileClick?: (path: string) => void;
}

export function TakeawayCard({ text, filePath, onFileClick }: TakeawayCardProps) {
  return (
    <div className="border-l-3 border-accent bg-accent-subtle rounded-[var(--radius)] p-3 pl-4 mb-2 flex items-start gap-3">
      <span className="text-accent text-base leading-none mt-0.5 shrink-0" aria-hidden="true">
        &#9733;
      </span>
      <div className="min-w-0 flex-1">
        <div className="prose-review text-sm text-text-secondary">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
        {filePath && onFileClick && (
          <button
            type="button"
            onClick={() => onFileClick(filePath)}
            className="font-mono text-xs text-accent hover:underline cursor-pointer bg-transparent border-none p-0 mt-1"
          >
            {filePath}
          </button>
        )}
      </div>
    </div>
  );
}
