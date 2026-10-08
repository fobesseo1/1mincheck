// shadcn 스타일 구간 슬라이더 (Radix Slider): 막대 자체가 구간 색이고, 손잡이를 끌면 내 구간 색으로 바뀐다.
// 몸무게·허리 '이대로면 vs 바꾸면'에서 쓴다. 표준 구간은 막대 위 괄호, 기준선은 막대 위 세로선.
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
import { trackBg } from '@/components/viz';

export type ZTone = 'low' | 'ok' | 'mid' | 'high' | 'urgent';
export const THUMB: Record<ZTone, string> = { low: 'bg-warn-dot', ok: 'bg-good-dot', mid: 'bg-warn-dot', high: 'bg-risk-dot', urgent: 'bg-risk' };

export function ZoneSlider({ min, max, value, onChange, zones, now, normal, cut, label, tone, valueText }: {
  min: number; max: number; value: number; onChange: (v: number) => void; label: string; tone: ZTone; valueText?: string;
  zones: { from: number; to: number; tone: ZTone }[]; now: number; normal?: [number, number]; cut?: number;
}) {
  const pct = (v: number) => `${((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100}%`;
  const at = (v: number) => (Math.min(max, Math.max(min, v)) - min) / (max - min);
  const bg = trackBg(zones.map((z) => ({ from: at(z.from), to: at(z.to), tone: z.tone })));
  return (
    <div className="relative pt-6">
      {normal && (
        <div className="pointer-events-none absolute top-0 flex flex-col items-center" style={{ left: pct(normal[0]), width: `calc(${pct(normal[1])} - ${pct(normal[0])})` }}>
          <span className="whitespace-nowrap text-caption font-medium text-good">표준 {normal[0]}–{normal[1]}kg</span>
          <i className="h-1.5 w-full rounded-t-sm border-x-2 border-t-2 border-good-dot" />
        </div>
      )}
      {cut != null && <span className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap text-caption font-medium text-risk" style={{ left: pct(cut) }}>기준 {cut}cm</span>}
      <SliderPrimitive.Root aria-label={label} min={min} max={max} step={1} value={[value]} onValueChange={([v]) => onChange(v)} className="relative flex h-11 w-full touch-pan-y select-none items-center">
        <SliderPrimitive.Track className="relative h-4 w-full grow overflow-hidden rounded-full" style={{ background: bg }}>
          <SliderPrimitive.Range className="absolute h-full bg-transparent" />
          {cut != null && <i className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-white" style={{ left: pct(cut) }} />}
        </SliderPrimitive.Track>
        {now !== value && <i className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink/50 bg-white" style={{ left: pct(now) }} aria-hidden />}
        <SliderPrimitive.Thumb aria-label={label} aria-valuetext={valueText} className={cn('block size-8 cursor-grab rounded-full border-4 border-white shadow-float transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 active:cursor-grabbing', THUMB[tone])} />
      </SliderPrimitive.Root>
    </div>
  );
}
