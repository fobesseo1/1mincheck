// shadcn Badge (Jeton 토큰 + 상태 색)
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-caption font-medium [&_svg]:size-3.5', {
  variants: {
    variant: {
      brand: 'bg-brand text-white', soft: 'bg-blush text-brand', ink: 'bg-ink text-white', muted: 'bg-sand-soft text-ink-soft', white: 'bg-white text-ink',
      good: 'bg-good-bg text-good', info: 'bg-info-bg text-info', warn: 'bg-warn-bg text-warn', risk: 'bg-risk-bg text-risk',
    },
  },
  defaultVariants: { variant: 'soft' },
});
export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
export function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
