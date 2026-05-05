import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-[var(--radius-sm)] bg-surface-elevated border border-border px-3 py-1.5 text-xs text-text-secondary shadow-elevated',
      'animate-in fade-in-0 zoom-in-95',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = 'TooltipContent';
