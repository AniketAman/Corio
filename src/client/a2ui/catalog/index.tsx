import { cn } from '../../lib/utils';
import { AcknowledgeCheckbox } from '../components/AcknowledgeCheckbox';
import { BeforeAfterCode } from '../components/BeforeAfterCode';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { CommentDraft } from '../components/CommentDraft';
import { CopyButton } from '../components/CopyButton';
import { DiffSnippet } from '../components/DiffSnippet';
import { FileHeatmap } from '../components/FileHeatmap';
import { FilterBar } from '../components/FilterBar';
import { InteractiveCard } from '../components/InteractiveCard';
import { ProgressTracker } from '../components/ProgressTracker';
import { SeverityGauge } from '../components/SeverityGauge';
import { SummaryStatsRow } from '../components/SummaryStatsRow';
import { TagPills } from '../components/TagPills';
import { ToastFeedback } from '../components/ToastFeedback';
import { VoteButtons } from '../components/VoteButtons';
import type { A2UICatalog, ComponentRenderer } from './types';

// --- Primitive renderers ---

const TextRenderer: ComponentRenderer = ({ component, children }) => {
  const { text, variant, style } = component as typeof component & {
    text?: string;
    variant?: string;
    style?: string;
  };

  const content = text ?? '';

  if (variant === 'heading' || style === 'heading') {
    return (
      <h3 className="text-sm font-semibold text-text-primary">
        {content}
        {children}
      </h3>
    );
  }

  if (variant === 'caption' || style === 'caption') {
    return (
      <span className="text-xs text-text-muted">
        {content}
        {children}
      </span>
    );
  }

  if (variant === 'code' || style === 'code') {
    return (
      <code className="font-mono text-xs bg-surface-elevated px-1.5 py-0.5 rounded text-accent">
        {content}
        {children}
      </code>
    );
  }

  return (
    <span className="text-sm text-text-secondary">
      {content}
      {children}
    </span>
  );
};

const RowRenderer: ComponentRenderer = ({ component, children }) => {
  const { gap, align } = component as typeof component & {
    gap?: string;
    align?: string;
  };

  return (
    <div
      className={cn(
        'flex flex-row',
        gap ? `gap-${gap}` : 'gap-2',
        align === 'center' && 'items-center',
        align === 'end' && 'items-end',
        align === 'stretch' && 'items-stretch'
      )}
    >
      {children}
    </div>
  );
};

const ColumnRenderer: ComponentRenderer = ({ component, children }) => {
  const { gap } = component as typeof component & { gap?: string };

  return (
    <div className={cn('flex flex-col', gap ? `gap-${gap}` : 'gap-2')}>
      {children}
    </div>
  );
};

const CardRenderer: ComponentRenderer = ({ children }) => {
  return (
    <div className="bg-surface-elevated border border-border rounded-[var(--radius)] p-4">
      {children}
    </div>
  );
};

const BadgeRenderer: ComponentRenderer = ({ component }) => {
  const { text, variant } = component as typeof component & {
    text?: string;
    variant?: string;
  };

  const variantClasses: Record<string, string> = {
    default: 'bg-accent-muted text-accent border-accent/30',
    success: 'bg-success-muted text-success border-success/30',
    danger: 'bg-danger-muted text-danger border-danger/30',
    warning: 'bg-warning-muted text-warning border-warning/30',
    info: 'bg-info-muted text-info border-info/30',
    outline: 'text-text-secondary border-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
        variantClasses[variant ?? 'default'] ?? variantClasses.default
      )}
    >
      {text ?? ''}
    </span>
  );
};

const ButtonRenderer: ComponentRenderer = ({ component, onAction }) => {
  const { text, label, variant, actionType, actionPayload } =
    component as typeof component & {
      text?: string;
      label?: string;
      variant?: string;
      actionType?: string;
      actionPayload?: Record<string, unknown>;
    };

  const variantClasses: Record<string, string> = {
    default: 'bg-accent text-white hover:bg-accent-hover',
    secondary:
      'bg-surface-elevated text-text-secondary border border-border hover:bg-surface-hover hover:text-text-primary',
    ghost: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
    danger: 'bg-danger text-white hover:bg-danger/90',
    success: 'bg-success text-white hover:bg-success/90',
  };

  return (
    <button
      type="button"
      onClick={() => {
        if (actionType) {
          onAction({ type: actionType, payload: actionPayload });
        }
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-sm)] text-sm font-medium transition-colors h-9 px-4 cursor-pointer',
        variantClasses[variant ?? 'default'] ?? variantClasses.default
      )}
    >
      {text ?? label ?? 'Button'}
    </button>
  );
};

const CheckBoxRenderer: ComponentRenderer = ({ component, onAction }) => {
  const { label, checked, fieldId } = component as typeof component & {
    label?: string;
    checked?: boolean;
    fieldId?: string;
  };

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        defaultChecked={checked ?? false}
        onChange={(e) =>
          onAction({
            type: 'change',
            payload: {
              fieldId: fieldId ?? component.id,
              value: e.target.checked,
            },
          })
        }
        className="w-4 h-4 rounded border-border bg-surface accent-accent"
      />
      <span className="text-sm text-text-secondary">{label ?? ''}</span>
    </label>
  );
};

const DividerRenderer: ComponentRenderer = () => {
  return <hr className="border-none border-t border-border my-2" />;
};

const ProgressBarRenderer: ComponentRenderer = ({ component }) => {
  const { value, max, label, color } = component as typeof component & {
    value?: number;
    max?: number;
    label?: string;
    color?: string;
  };

  const percentage =
    max && max > 0 ? Math.min(100, ((value ?? 0) / max) * 100) : 0;
  const barColor = color ?? 'bg-accent';

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>{label}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all rounded-full', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const TabsRenderer: ComponentRenderer = ({ component, children, onAction }) => {
  const { tabs, activeTab } = component as typeof component & {
    tabs?: Array<{ id: string; label: string }>;
    activeTab?: string;
  };

  const tabList = tabs ?? [];

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-border">
        {tabList.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() =>
              onAction({ type: 'tabChange', payload: { tabId: tab.id } })
            }
            className={cn(
              'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab.id === activeTab
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
};

const TextFieldRenderer: ComponentRenderer = ({ component, onAction }) => {
  const { placeholder, label, value, fieldId } =
    component as typeof component & {
      placeholder?: string;
      label?: string;
      value?: string;
      fieldId?: string;
    };

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-xs font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        type="text"
        defaultValue={(value as string) ?? ''}
        placeholder={placeholder ?? ''}
        onChange={(e) =>
          onAction({
            type: 'change',
            payload: {
              fieldId: fieldId ?? component.id,
              value: e.target.value,
            },
          })
        }
        className="w-full h-9 px-3 text-sm bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
};

const ChoicePickerRenderer: ComponentRenderer = ({
  component,
  onAction,
}) => {
  const { choices, selected, fieldId } = component as typeof component & {
    choices?: Array<{ id: string; label: string }>;
    selected?: string;
    fieldId?: string;
  };

  const choiceList = choices ?? [];

  return (
    <div className="flex flex-wrap gap-2">
      {choiceList.map((choice) => (
        <button
          key={choice.id}
          type="button"
          onClick={() =>
            onAction({
              type: 'choice',
              payload: {
                fieldId: fieldId ?? component.id,
                value: choice.id,
              },
            })
          }
          className={cn(
            'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors',
            choice.id === selected
              ? 'bg-accent-muted text-accent border-accent/30'
              : 'bg-surface text-text-secondary border-border hover:bg-surface-hover'
          )}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
};

// --- Domain renderers (delegate to components) ---

const InteractiveCardRenderer: ComponentRenderer = (props) => {
  return InteractiveCard(props);
};

const AcknowledgeCheckboxRenderer: ComponentRenderer = (props) => {
  return AcknowledgeCheckbox(props);
};

const ProgressTrackerRenderer: ComponentRenderer = (props) => {
  return ProgressTracker(props);
};

const FilterBarRenderer: ComponentRenderer = (props) => {
  return FilterBar(props);
};

const CopyButtonRenderer: ComponentRenderer = (props) => {
  return CopyButton(props);
};

const CollapsibleSectionRenderer: ComponentRenderer = (props) => {
  return CollapsibleSection(props);
};

const VoteButtonsRenderer: ComponentRenderer = (props) => {
  return VoteButtons(props);
};

const CommentDraftRenderer: ComponentRenderer = (props) => {
  return CommentDraft(props);
};

const TagPillsRenderer: ComponentRenderer = (props) => {
  return TagPills(props);
};

const ToastFeedbackRenderer: ComponentRenderer = (props) => {
  return ToastFeedback(props);
};

const DiffSnippetRenderer: ComponentRenderer = (props) => {
  return DiffSnippet(props);
};

const SeverityGaugeRenderer: ComponentRenderer = (props) => {
  return SeverityGauge(props);
};

const FileHeatmapRenderer: ComponentRenderer = (props) => {
  return FileHeatmap(props);
};

const BeforeAfterCodeRenderer: ComponentRenderer = (props) => {
  return BeforeAfterCode(props);
};

const SummaryStatsRowRenderer: ComponentRenderer = (props) => {
  return SummaryStatsRow(props);
};

// --- Default catalog ---

const defaultRenderers: Record<string, ComponentRenderer> = {
  Text: TextRenderer,
  Row: RowRenderer,
  Column: ColumnRenderer,
  Card: CardRenderer,
  Badge: BadgeRenderer,
  Button: ButtonRenderer,
  CheckBox: CheckBoxRenderer,
  Divider: DividerRenderer,
  ProgressBar: ProgressBarRenderer,
  Tabs: TabsRenderer,
  TextField: TextFieldRenderer,
  ChoicePicker: ChoicePickerRenderer,
  InteractiveCard: InteractiveCardRenderer,
  AcknowledgeCheckbox: AcknowledgeCheckboxRenderer,
  ProgressTracker: ProgressTrackerRenderer,
  FilterBar: FilterBarRenderer,
  CopyButton: CopyButtonRenderer,
  CollapsibleSection: CollapsibleSectionRenderer,
  VoteButtons: VoteButtonsRenderer,
  CommentDraft: CommentDraftRenderer,
  TagPills: TagPillsRenderer,
  ToastFeedback: ToastFeedbackRenderer,
  DiffSnippet: DiffSnippetRenderer,
  SeverityGauge: SeverityGaugeRenderer,
  FileHeatmap: FileHeatmapRenderer,
  BeforeAfterCode: BeforeAfterCodeRenderer,
  SummaryStatsRow: SummaryStatsRowRenderer,
};

export function createCatalog(
  overrides?: Record<string, ComponentRenderer>
): A2UICatalog {
  return {
    renderers: overrides
      ? { ...defaultRenderers, ...overrides }
      : defaultRenderers,
  };
}
