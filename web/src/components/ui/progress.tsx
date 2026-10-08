// shadcn Progress (Radix): 채워지는 막대
import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

export function Progress({ className, indicatorClassName, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }) {
  return (
    <ProgressPrimitive.Root data-slot="progress" className={cn('relative h-2 w-full overflow-hidden rounded-full bg-sand', className)} value={value} {...props}>
      <ProgressPrimitive.Indicator className={cn('h-full w-full flex-1 rounded-full bg-brand transition-transform duration-500', indicatorClassName)} style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }} />
    </ProgressPrimitive.Root>
  );
}
