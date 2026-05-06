import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { A2UIAction, A2UIComponent } from '../catalog/types';

interface TagPillsProps {
  component: A2UIComponent;
  children: ReactNode;
  onAction: (action: A2UIAction) => void;
}

type TagColor = 'accent' | 'success' | 'danger' | 'warning' | 'info';

interface Tag {
  id: string;
  label: string;
  color?: TagColor;
}

const colorClasses: Record<TagColor, string> = {
  accent: 'bg-accent-muted text-accent border-accent/30',
  success: 'bg-success-muted text-success border-success/30',
  danger: 'bg-danger-muted text-danger border-danger/30',
  warning: 'bg-warning-muted text-warning border-warning/30',
  info: 'bg-info-muted text-info border-info/30',
};

export function TagPills({
  component,
  onAction,
}: TagPillsProps): ReactNode {
  const { tags, selected } = component as A2UIComponent & {
    tags?: Tag[];
    selected?: string[];
  };

  const tagList = tags ?? [];
  const [selectedTags, setSelectedTags] = useState<string[]>(selected ?? []);

  const handleToggle = (tagId: string) => {
    const next = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(next);
    onAction({
      type: 'filter-tag',
      payload: { tags: next },
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tagList.map((tag) => {
        const isSelected = selectedTags.includes(tag.id);
        const color = tag.color ?? 'accent';

        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => handleToggle(tag.id)}
            className={cn(
              'rounded-full px-3 py-1 text-[12px] font-medium cursor-pointer transition-all border',
              isSelected
                ? colorClasses[color]
                : 'bg-surface-elevated border-border text-text-secondary hover:text-text-primary'
            )}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}
