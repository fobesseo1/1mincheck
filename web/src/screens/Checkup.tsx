// 검진 수치 입력 칸 (검진 풀이·생활 화면에서 함께 쓴다). 화면 자체는 Labs.tsx(#/labs)
// 2026-10-15 캔버스 'LabsInput': 이름 15px + 작은 설명, 오른쪽 128px 칸에 숫자 22px + 단위 12px(붙여서). 쓰는 중이면 흰 바탕 + 잉크 2px 테두리
import { useState } from 'react';
import { useStore } from '../ui.tsx';
import { type LabDef, labFieldError } from '../lib/labs.ts';
import { cleanNum } from '../lib/numInput.ts';
import { cn } from '@/lib/utils';
import { onRadioKeys, radioTab } from '@/lib/radio';

/** '수축기 혈압 (높은 값)' → 이름 '수축기 혈압' + 설명 '높은 값' */
const split = (l: LabDef) => { const m = /^(.*?) \((.*)\)$/.exec(l.label); return m ? [m[1], l.help ?? m[2]] : [l.label, l.help]; };

/** 숫자 칸 하나 (검진 수치) */
export function LabField({ l }: { l: LabDef }) {
  const { draft: d, setDraft } = useStore();
  const v = d.lab?.[l.key] ?? '';
  const set = (s: string) => setDraft((x) => ({ ...x, lab: { ...x.lab, [l.key]: s } }));
  const [left, setLeft] = useState(false);
  const err = left ? labFieldError(l, v) : null;   // 칸을 떠난 뒤부터 그 칸에 범위 안내
  const [name, sub] = split(l);
  if (l.options) return (
    <div role="group" aria-label={l.label} className="flex flex-col gap-2 border-t border-hair py-3">
      <b className="text-[15px] font-medium">{name}</b>
      <div role="radiogroup" aria-label={l.label} onKeyDown={(e) => onRadioKeys(e, l.options!.map(([n]) => String(n)), v, set)} className="grid grid-cols-4 gap-1 rounded-[12px] bg-[#f0f0ed] p-1">
        {l.options.map(([n, t], i) => {
          const on = v === String(n);
          return <button key={n} type="button" role="radio" aria-checked={on} tabIndex={radioTab(on, i, v !== '')} onClick={() => set(on ? '' : String(n))}
            className={cn('h-10 cursor-pointer rounded-[9px] text-[14px]', on ? 'bg-ink font-semibold text-white' : 'text-ink-soft')}>{t}</button>;
        })}
      </div>
    </div>
  );
  return (
    <label htmlFor={`lab-${l.key}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-hair py-3 first-of-type:border-t-0">
      <span className="flex min-w-0 flex-1 basis-24 flex-col gap-0.5"><b className="text-[15px] font-medium">{name}</b>{sub && <span className="text-[12px] text-mute">{sub}</span>}{err && <span id={`lab-${l.key}-err`} role="alert" className="text-[12px] leading-snug font-medium text-risk">{err}</span>}</span>
      <span className="ml-auto flex h-12 w-32 flex-none items-baseline justify-end gap-0.5 rounded-[12px] bg-paper px-3 pt-3 focus-within:bg-white focus-within:shadow-[inset_0_0_0_2px_var(--color-ink)]">
        <input id={`lab-${l.key}`} inputMode="decimal" placeholder="–" value={v} onChange={(e) => set(cleanNum(e.target.value))} onBlur={() => setLeft(true)} aria-invalid={!!err || undefined} aria-describedby={err ? `lab-${l.key}-err` : undefined}
          className="w-full min-w-0 border-0 bg-transparent p-0 text-right text-[22px] leading-none font-semibold text-ink tabular-nums outline-none placeholder:text-[#c4c4c0]" />
        {l.unit && <span className="flex-none text-[12px] text-ink-soft">{l.unit.replace('mL/min', 'mL/분')}</span>}
      </span>
    </label>
  );
}
