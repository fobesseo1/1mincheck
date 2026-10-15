// 한 줄 고르기 (성별 · 네/아니요 · 술 양 등): 고른 칸 표시가 물방울처럼 움직인다 — 가는 쪽 끝이 먼저, 반대쪽 끝이 늦게.
// 누르면 칸이 살짝(1.04배) 부푼다. 아직 고르지 않았으면 표시가 없다.
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useDroplet, usePress } from '@/lib/motion';
import { cn } from '@/lib/utils';

function Opt({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  const b = useRef<HTMLButtonElement>(null);
  usePress(b, 1.04);
  return (
    <button ref={b} type="button" aria-pressed={on} onClick={onClick} data-on={on || undefined}
      className={cn('relative z-[1] flex min-h-11 flex-1 cursor-pointer flex-col items-center justify-center rounded-[9px] px-1.5 py-1.5 text-center leading-tight font-semibold transition-colors duration-200', on ? 'text-white' : 'text-ink-soft hover:text-ink', className)}>
      {children}
    </button>
  );
}

export function Segmented<T>({ options, value, onChange, label, tone = 'brand', className, optClassName }: {
  options: { v: T; t: ReactNode; s?: string }[]; value: T | null | undefined; onChange: (v: T) => void; label?: string;
  /** 고른 칸 색: 잉크(기본) · 흰색 */
  tone?: 'brand' | 'white'; className?: string; optClassName?: string;
}) {
  const box = useRef<HTMLDivElement>(null), ind = useRef<HTMLSpanElement>(null), shown = useRef(false);
  const d = useDroplet(ind);
  const k = options.findIndex((o) => o.v === value);
  useLayoutEffect(() => {
    const el = box.current?.querySelectorAll<HTMLElement>(':scope > button')[k];
    if (!el) { shown.current = false; if (ind.current) ind.current.style.opacity = '0'; return; }
    d.go(el, !shown.current);   // 처음 고를 때는 그 자리에 바로, 그다음부터는 물방울처럼
    shown.current = true; if (ind.current) ind.current.style.opacity = '1';
  }, [k]);   // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => { const el = box.current?.querySelectorAll<HTMLElement>(':scope > button')[k]; if (el) d.go(el, true); });
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [k]);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={box} role="group" aria-label={label} className={cn('relative isolate flex gap-1 rounded-[12px] bg-[#f0f0ed] p-1', className)}>
      <span ref={ind} aria-hidden style={{ opacity: 0 }}
        className={cn('pointer-events-none absolute inset-y-1 rounded-[9px]', tone === 'brand' ? 'bg-ink' : 'bg-white')} />
      {options.map((o) => (
        <Opt key={String(o.v)} on={o.v === value} onClick={() => onChange(o.v)} className={cn(tone === 'white' && o.v === value && 'text-ink', optClassName)}>
          {o.t}{o.s && <small className="mt-0.5 text-[11px] font-normal opacity-80">{o.s}</small>}
        </Opt>
      ))}
    </div>
  );
}
