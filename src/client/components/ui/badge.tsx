import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-accent-muted text-accent border border-accent/30',
        success: 'bg-success-muted text-success border border-success/30',
        danger: 'bg-danger-muted text-danger border border-danger/30',
        warning: 'bg-warning-muted text-warning border border-warning/30',
        info: 'bg-info-muted text-info border border-info/30',
        outline: 'text-text-secondary border border-border',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
