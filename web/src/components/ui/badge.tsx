// shadcn Badge: 11px 600 알약. 색은 상태에만(빨강 위험 · 초록 좋음 · 회색 그 밖) (2026-10-15)
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] leading-[1.5] font-semibold [&_svg]:size-3', {
  variants: {
    variant: {
      brand: 'bg-brand text-lime', lime: 'bg-lime text-brand', soft: 'bg-hair text-ink-2', ink: 'bg-ink text-white', muted: 'bg-sand-soft text-ink-soft', white: 'bg-white text-ink',
      good: 'bg-good-bg text-good', info: 'bg-info-bg text-info', warn: 'bg-warn-bg text-ink-2', risk: 'bg-risk-bg text-risk',
    },
  },
  defaultVariants: { variant: 'soft' },
});
export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
export function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
