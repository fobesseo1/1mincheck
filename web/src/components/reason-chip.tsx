// 이유 칩 (결과 화면 '왜?'): 누르면 열리고, PC에서는 마우스를 올리기만 해도 짧은 설명이 뜬다 (shadcn Popover)
import { useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Chip } from '@/lib/overview';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function ReasonChip({ c, quiet }: { c: Chip; quiet?: boolean }) {
  const [open, setOpen] = useState(false);
  const timer = useRef(0);
  const hover = (v: boolean) => (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') return; clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(v), v ? 120 : 160); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger onPointerEnter={hover(true)} onPointerLeave={hover(false)}
        className={cn(quiet ? 'cursor-pointer text-body-sm text-ink underline decoration-ink/30 decoration-dotted underline-offset-4 hover:decoration-ink'
          : cn('inline-flex h-6 cursor-pointer items-center rounded-full px-2.5 text-caption font-medium',
            c.tone === 'up' ? 'bg-risk-bg text-risk' : c.tone === 'ok' ? 'bg-good-bg text-good' : 'bg-sand-soft text-ink-soft'))}>{c.t}</PopoverTrigger>
      <PopoverContent onPointerEnter={hover(true)} onPointerLeave={hover(false)}>
        <b className="mb-1 block text-body-sm font-semibold">{c.t}</b>
        <p className="leading-relaxed text-ink-soft">{c.why}</p>
        {c.href && <a href={c.href} className="mt-2 inline-flex items-center gap-1 font-medium text-brand">넣으러 가기 <ChevronRight className="size-4" /></a>}
      </PopoverContent>
    </Popover>
  );
}
