// shadcn Slider (Radix): 몸무게·허리 바꿔보기
import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

/** fill=false: '지금에서 얼마나 바꿀지' 슬라이더처럼 채움 막대가 뜻이 없을 때 */
export function Slider({ className, fill = true, ...props }: React.ComponentProps<typeof SliderPrimitive.Root> & { fill?: boolean }) {
  const n = (props.value ?? props.defaultValue ?? [0]).length;
  return (
    <SliderPrimitive.Root data-slot="slider" className={cn('relative flex w-full touch-none items-center select-none py-3 data-[disabled]:opacity-50', className)} {...props}>
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-sand">
        <SliderPrimitive.Range className={cn('absolute h-full', fill ? 'bg-brand' : 'bg-transparent')} />
      </SliderPrimitive.Track>
      {Array.from({ length: n }, (_, i) => (
        <SliderPrimitive.Thumb key={i} aria-label={props['aria-label']} className="block size-6 cursor-grab rounded-full border-[3px] border-brand bg-white shadow-float transition-[box-shadow] hover:ring-4 hover:ring-brand/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25" />
      ))}
    </SliderPrimitive.Root>
  );
}
