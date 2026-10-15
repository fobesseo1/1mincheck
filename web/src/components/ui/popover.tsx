// shadcn Popover (Radix): 점수·이유 칩을 누르면(PC는 마우스를 올리면) 짧은 설명
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export function PopoverContent({ className, align = 'start', sideOffset = 6, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content data-slot="popover-content" align={align} sideOffset={sideOffset} collisionPadding={16}
        className={cn('z-50 w-[min(300px,calc(100vw-32px))] rounded-card bg-white p-4 text-body-sm text-ink shadow-float outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95', className)} {...props} />
    </PopoverPrimitive.Portal>
  );
}
