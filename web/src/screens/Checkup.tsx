// 검진 수치 입력 칸 (검진 풀이·생활 화면에서 함께 쓴다). 화면 자체는 Labs.tsx(#/labs)
// 2026-10-15 캔버스 'LabsInput': 이름 15px + 작은 설명, 오른쪽 128px 칸에 숫자 22px + 단위 12px(붙여서). 쓰는 중이면 흰 바탕 + 잉크 2px 테두리
import { useStore } from '../ui.tsx';
import type { LabDef } from '../lib/labs.ts';
import { cn } from '@/lib/utils';

/** '수축기 혈압 (높은 값)' → 이름 '수축기 혈압' + 설명 '높은 값' */
const split = (l: LabDef) => { const m = /^(.*?) \((.*)\)$/.exec(l.label); return m ? [m[1], l.help ?? m[2]] : [l.label, l.help]; };

/** 숫자 칸 하나 (검진 수치) */
export function LabField({ l }: { l: LabDef }) {
  const { draft: d, setDraft } = useStore();
  const v = d.lab?.[l.key] ?? '';
  const set = (s: string) => setDraft((x) => ({ ...x, lab: { ...x.lab, [l.key]: s } }));
  const [name, sub] = split(l);
  if (l.options) return (
    <div role="group" aria-label={l.label} className="flex flex-col gap-2 border-t border-hair py-3">
      <b className="text-[15px] font-medium">{name}</b>
      <div className="grid grid-cols-4 gap-1 rounded-[12px] bg-[#f0f0ed] p-1">
        {l.options.map(([n, t]) => {
          const on = v === String(n);
          return <button key={n} type="button" aria-pressed={on} onClick={() => set(on ? '' : String(n))}
            className={cn('h-10 cursor-pointer rounded-[9px] text-[14px]', on ? 'bg-ink font-semibold text-white' : 'text-ink-soft')}>{t}</button>;
        })}
      </div>
    </div>
  );
  return (
    <label htmlFor={`lab-${l.key}`} className="flex items-center justify-between gap-3 border-t border-hair py-3 first-of-type:border-t-0">
      <span className="flex flex-col gap-0.5"><b className="text-[15px] font-medium">{name}</b>{sub && <span className="text-[12px] text-mute">{sub}</span>}</span>
      <span className="flex h-12 w-32 flex-none items-baseline justify-end gap-0.5 rounded-[12px] bg-paper px-3 pt-3 focus-within:bg-white focus-within:shadow-[inset_0_0_0_2px_var(--color-ink)]">
        <input id={`lab-${l.key}`} inputMode="decimal" placeholder="–" value={v} onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ''))}
          className="w-full min-w-0 border-0 bg-transparent p-0 text-right text-[22px] leading-none font-semibold text-ink tabular-nums outline-none placeholder:text-[#c4c4c0]" />
        {l.unit && <span className="flex-none text-[12px] text-ink-soft">{l.unit.replace('mL/min', 'mL/분')}</span>}
      </span>
    </label>
  );
}
