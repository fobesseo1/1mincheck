// shadcn Button: 주 = 라임 바탕 진초록 글자(1분체크), 진초록 = 진초록 바탕 흰 글자, 보조 = 진초록 테두리, 그 밖에 옅은 바탕·고스트
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 aria-disabled:bg-sand aria-disabled:text-ink-soft [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer select-none no-underline',
  {
    variants: {
      variant: {
        default: 'bg-lime text-brand hover:bg-[#8fdc5e]',
        brand: 'bg-brand text-white hover:bg-brand-tint',
        outline: 'border-[1.5px] border-brand text-brand bg-white hover:bg-blush',
        ink: 'bg-ink text-white hover:bg-ink/90',
        soft: 'bg-blush text-ink hover:bg-brand/10',
        ghost: 'text-ink hover:bg-sand-soft',
        link: 'text-brand underline-offset-4 hover:underline',
        white: 'bg-white text-ink hover:bg-white/90',
      },
      size: {
        default: 'h-12 rounded-btn px-5 text-body [&_svg]:size-[18px]',
        lg: 'h-14 rounded-btn px-6 text-[17px] [&_svg]:size-5',
        sm: 'h-9 rounded-btn px-3.5 text-body-sm [&_svg]:size-4',
        pill: 'h-12 rounded-full px-6 text-body [&_svg]:size-[18px]',
        icon: 'size-11 rounded-full [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp ref={ref} data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
});
Button.displayName = 'Button';
export { buttonVariants };
