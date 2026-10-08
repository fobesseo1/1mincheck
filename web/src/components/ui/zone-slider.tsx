// shadcn 스타일 구간 슬라이더 (Radix Slider): 막대 자체가 구간 색이고, 손잡이를 끌면 내 구간 색으로 바뀐다.
// 몸무게·허리 '이대로면 vs 바꾸면'에서 쓴다. 표준 구간은 막대 위 괄호, 기준선은 막대 위 세로선.
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

export type ZTone = 'low' | 'ok' | 'mid' | 'high' | 'urgent';
const SOFT: Record<ZTone, string> = { low: '#cfe0fb', ok: '#bfeccd', mid: '#f8e2a6', high: '#fcc4cf', urgent: '#f99fb1' };
export const THUMB: Record<ZTone, string> = { low: 'bg-info', ok: 'bg-good-dot', mid: 'bg-[#e0a526]', high: 'bg-risk-dot', urgent: 'bg-risk' };

export function ZoneSlider({ min, max, value, onChange, zones, now, normal, cut, label, tone }: {
  min: number; max: number; value: number; onChange: (v: number) => void; label: string; tone: ZTone;
  zones: { from: number; to: number; tone: ZTone }[]; now: number; normal?: [number, number]; cut?: number;
}) {
  const pct = (v: number) => `${((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100}%`;
  const bg = `linear-gradient(to right, ${zones.map((z) => `${SOFT[z.tone]} ${pct(z.from)} ${pct(z.to)}`).join(', ')})`;
  return (
    <div className="relative pt-5">
      {normal && (
        <div className="pointer-events-none absolute top-0 flex flex-col items-center" style={{ left: pct(normal[0]), width: `calc(${pct(normal[1])} - ${pct(normal[0])})` }}>
          <span className="whitespace-nowrap text-[10.5px] font-medium text-good">표준 {normal[0]}–{normal[1]}kg</span>
          <i className="h-1.5 w-full rounded-t-sm border-x-2 border-t-2 border-good-dot" />
        </div>
      )}
      {cut != null && <span className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10.5px] font-medium text-risk" style={{ left: pct(cut) }}>기준 {cut}cm</span>}
      <SliderPrimitive.Root aria-label={label} min={min} max={max} step={1} value={[value]} onValueChange={([v]) => onChange(v)} className="relative flex h-10 w-full touch-none select-none items-center">
        <SliderPrimitive.Track className="relative h-4 w-full grow overflow-hidden rounded-full" style={{ background: bg }}>
          <SliderPrimitive.Range className="absolute h-full bg-transparent" />
          {cut != null && <i className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-risk" style={{ left: pct(cut) }} />}
        </SliderPrimitive.Track>
        {now !== value && <i className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink/50 bg-white" style={{ left: pct(now) }} aria-hidden />}
        <SliderPrimitive.Thumb aria-label={label} className={cn('block size-8 cursor-grab rounded-full border-4 border-white shadow-float transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 active:cursor-grabbing', THUMB[tone])} />
      </SliderPrimitive.Root>
    </div>
  );
}
