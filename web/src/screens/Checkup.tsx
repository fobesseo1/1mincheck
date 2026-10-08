// 검진 수치 입력 칸 (검진 풀이·생활 화면에서 함께 쓴다). 화면 자체는 Labs.tsx(#/labs)
import { useStore, optCls } from '../ui.tsx';
import type { LabDef } from '../lib/labs.ts';

/** 숫자 칸 하나 (검진 수치) */
export function LabField({ l }: { l: LabDef }) {
  const { draft: d, setDraft } = useStore();
  const v = d.lab?.[l.key] ?? '';
  const set = (s: string) => setDraft((x) => ({ ...x, lab: { ...x.lab, [l.key]: s } }));
  if (l.options) return (
    <div role="group" aria-label={l.label} className="flex flex-col gap-2 border-t border-sand-soft py-3">
      <span><b className="text-body font-medium">{l.label}</b>{l.help && <span className="text-caption text-ink-soft"> · {l.help}</span>}</span>
      <div className="grid grid-cols-4 gap-1.5">
        {l.options.map(([n, t]) => <button key={n} type="button" className={optCls(v === String(n), 'sm')} aria-pressed={v === String(n)} onClick={() => set(v === String(n) ? '' : String(n))}>{t}</button>)}
      </div>
    </div>
  );
  return (
    <label htmlFor={`lab-${l.key}`} className="flex items-center gap-3 border-t border-sand-soft py-3 first-of-type:border-t-0">
      <span className="flex-1"><b className="text-body font-medium">{l.label}</b>{l.help && <span className="block text-caption text-ink-soft">{l.help}</span>}</span>
      <input id={`lab-${l.key}`} inputMode="decimal" placeholder="–" value={v} onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ''))}
        className="h-12 w-[4.6em] rounded-btn bg-blush/70 px-3 text-right text-[22px] font-medium text-ink outline-none placeholder:text-ash focus:ring-2 focus:ring-brand/30" />
      <span className="w-14 text-caption text-ink-soft">{l.unit}</span>
    </label>
  );
}
