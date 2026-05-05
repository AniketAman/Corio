import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const ScrollArea = forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root ref={ref} className={cn('relative overflow-hidden', className)} {...props}>
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.Scrollbar
      orientation="vertical"
      className="flex touch-none select-none transition-colors h-full w-2 border-l border-l-transparent p-px"
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border hover:bg-text-muted" />
    </ScrollAreaPrimitive.Scrollbar>
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = 'ScrollArea';
