// shadcn Tabs (Radix): 또래 100명 중 나의 항목 고르기
// 선택 표시는 물방울 렌즈: 가는 쪽 끝이 먼저 가고 반대쪽 끝이 늦게 따라와 움직일 때 늘어난다.
// 눌러도 되고 끌어도 된다(끄는 동안 렌즈 가운데 = 손가락, 렌즈 아래 글자가 최대 12% 커짐). 키보드는 Radix 그대로.
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import { useDroplet } from '@/lib/motion';

export function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-3', className)} {...props} />;
}

export function TabsList({ className, children, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  const list = React.useRef<HTMLDivElement>(null), drop = React.useRef<HTMLSpanElement>(null), dragging = React.useRef(false);
  const tabs = () => [...(list.current?.querySelectorAll<HTMLElement>('[role=tab]') ?? [])];
  // 렌즈와 겹친 만큼 글자를 키운다 (끄는 동안 최대 12%, 멈춰 있을 때는 살짝)
  const d = useDroplet(drop, (L, R) => tabs().forEach((t) => {
    const a = t.offsetLeft, b = a + t.offsetWidth, o = Math.max(0, Math.min(b, R) - Math.max(a, L)) / t.offsetWidth;
    t.style.setProperty('--mag', String(1 + 0.12 * o * (dragging.current ? 1 : 0.35)));
  }));
  const place = (instant = false) => d.go(list.current?.querySelector<HTMLElement>('[role=tab][data-state=active]'), instant);
  React.useLayoutEffect(() => {
    const el = list.current!; place(true);
    const mo = new MutationObserver(() => { if (!dragging.current) place(); });
    mo.observe(el, { subtree: true, attributes: true, attributeFilter: ['data-state'] });
    const ro = new ResizeObserver(() => place(true)); ro.observe(el);
    return () => { mo.disconnect(); ro.disconnect(); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const follow = (x: number) => {
    const el = list.current!, w = tabs()[0]?.offsetWidth ?? 0, r = el.getBoundingClientRect();
    const c = Math.max(4 + w / 2, Math.min(r.width - 4 - w / 2, x - r.left));
    d.span(c - w / 2, c + w / 2);
  };
  return (
    <TabsPrimitive.List ref={list} data-slot="tabs-list" {...props}
      onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); dragging.current = true;   /* preventDefault: 손으로 고를 때 초점 테두리가 남지 않게 */ list.current!.setPointerCapture(e.pointerId); follow(e.clientX); }}
      onPointerMove={(e) => { if (dragging.current) follow(e.clientX); }}
      onPointerUp={(e) => {
        if (!dragging.current) return;
        dragging.current = false;
        const x = e.clientX - list.current!.getBoundingClientRect().left;
        const near = tabs().reduce<HTMLElement | null>((best, t) => (!best || Math.abs(t.offsetLeft + t.offsetWidth / 2 - x) < Math.abs(best.offsetLeft + best.offsetWidth / 2 - x) ? t : best), null);
        // Radix 탭은 mousedown 으로 열린다 (초점을 옮기면 초점 테두리가 남으므로 누른 것처럼만)
        if (near && near.dataset.state !== 'active') near.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })); else place();
      }}
      onPointerCancel={() => { dragging.current = false; place(); }}
      className={cn('relative isolate inline-flex h-12 w-full touch-pan-y items-center rounded-full bg-sand-soft p-1 shadow-[inset_0_1px_2px_rgba(22,51,0,.06)] select-none', className)}>
      <span ref={drop} aria-hidden className="pointer-events-none absolute inset-y-1 -z-10 rounded-full bg-white/75 shadow-[inset_0_1px_1px_#fff,0_4px_14px_rgba(22,51,0,.12)] backdrop-blur-[2px] backdrop-saturate-[1.8]" />
      {children}
    </TabsPrimitive.List>
  );
}
export function TabsTrigger({ className, children, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn('inline-flex h-full flex-1 cursor-pointer items-center justify-center rounded-full px-3 text-body-sm font-semibold text-ink-soft transition-colors data-[state=active]:text-ink', className)} {...props}>
      <span className="inline-block" style={{ scale: 'var(--mag, 1)' }}>{children}</span>
    </TabsPrimitive.Trigger>
  );
}
export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('animate-rise outline-none', className)} {...props} />;
}
