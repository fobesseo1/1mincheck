// 결과 시각 부품 (docs/DESIGN.md). 게이지는 shadcn Progress 위에 기준선·구간 이름을 얹는다.
import { useEffect, useState, type CSSProperties } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type Tone = 'low' | 'ok' | 'mid' | 'high' | 'urgent';
/** 상태 색: 좋음 초록 · 주의(저체중·전단계) 옅은 빨강 · 위험 빨강 · 급함 진한 빨강 */
export const TONE_FILL: Record<Tone, string> = { low: 'bg-warn-dot', ok: 'bg-good-dot', mid: 'bg-warn-dot', high: 'bg-risk-dot', urgent: 'bg-risk' };
export const TONE_TEXT: Record<Tone, string> = { low: 'text-warn', ok: 'text-good', mid: 'text-warn', high: 'text-risk', urgent: 'text-risk' };
const ME_RING: Record<Tone, string> = { low: 'ring-warn-dot', ok: 'ring-good-dot', mid: 'ring-warn-dot', high: 'ring-risk-dot', urgent: 'ring-risk' };
export const TONE_BG: Record<Tone, string> = { low: 'bg-warn-bg', ok: 'bg-good-bg', mid: 'bg-warn-bg', high: 'bg-risk-bg', urgent: 'bg-risk-bg' };

/**
 * 구간 막대 배경. segs = 0–1 위치의 구간들. 좋음(ok) 구간은 초록 그대로,
 * 그 밖은 좋음 구간에서 멀어질수록 빨강이 진해지는 이어진 그라데이션(구간 경계에서 끊기지 않는다).
 */
export function trackBg(segs: { from: number; to: number; tone: Tone }[]) {
  const ok = segs.filter((s) => s.tone === 'ok');
  const G = 'var(--color-good-dot)', red = (a: number) => `rgb(251 45 84 / ${Math.round(a * 100)}%)`, P = (x: number) => `${(x * 100).toFixed(2)}%`;
  if (!ok.length) return `linear-gradient(to right, ${red(0.25)}, ${red(1)})`;
  const a = Math.min(...ok.map((s) => s.from)), b = Math.max(...ok.map((s) => s.to));
  const st: string[] = [];
  if (a > 0) st.push(`${red(0.25 + 0.6 * Math.min(1, a / 0.35))} 0%`, `${red(0.22)} ${P(a)}`);
  st.push(`${G} ${P(a)}`, `${G} ${P(b)}`);
  if (b < 1) st.push(`${red(0.22)} ${P(b)}`, `${red(1)} 100%`);
  return `linear-gradient(to right, ${st.join(', ')})`;
}

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** 처음 보일 때 0에서 값까지 차오르게 (움직임 줄이기면 바로) */
function useRise(v: number, delay = 0) {
  const [x, setX] = useState(() => (reduced() ? v : 0));
  useEffect(() => { if (reduced()) { setX(v); return; } const t = setTimeout(() => setX(v), delay + 30); return () => clearTimeout(t); }, [v, delay]);
  return x;
}

/**
 * 구간 게이지: 막대가 내 자리(pos 0–1)까지 내 구간 색으로 차고, 기준선(ticks)이 그어진다.
 * now 를 주면 '지금' 자리에 빈 표시를 남긴다(바꾸면 비교). labels 를 주면 같은 폭 구간 이름을 아래에.
 */
export function ZoneGauge({ pos, tone, ticks = [], labels, at, now, delay = 0, label, segs }: {
  pos: number; tone: Tone; ticks?: { at: number; text?: string }[]; labels?: string[]; at?: number; now?: number; delay?: number; label: string;
  /** 주면 막대 전체를 구간 색(초록 → 빨강 진하기)으로 칠하고 내 자리에 점만 둔다 */
  segs?: { from: number; to: number; tone: Tone }[];
}) {
  const v = useRise(Math.max(2, Math.min(100, pos * 100)), delay);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative py-1.5">
        {segs ? <div role="meter" aria-label={label} aria-valuenow={Math.round(pos * 100)} aria-valuemin={0} aria-valuemax={100} className="h-3 w-full rounded-full" style={{ background: trackBg(segs) }} />
          : <Progress value={v} aria-label={label} className="h-3" indicatorClassName={cn(TONE_FILL[tone], 'duration-700 ease-out')} />}
        {ticks.map((t) => <i key={t.at} className={cn('absolute -translate-x-1/2 rounded-full', segs ? 'top-1.5 bottom-1.5 w-[3px] bg-white' : 'top-0 bottom-0 w-0.5 bg-ink/45')} style={{ left: `${t.at * 100}%` }} />)}
        {now != null && <i className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ash bg-white" style={{ left: `${now * 100}%` }} aria-hidden />}
        <i className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-ink shadow-float transition-[left] duration-700 ease-out" style={{ left: `${v}%` }} aria-hidden />
      </div>
      {ticks.some((t) => t.text) && (
        <div className="relative h-4">{ticks.filter((t) => t.text).map((t) => <span key={t.at} className="absolute -translate-x-1/2 text-caption text-ink-soft" style={{ left: `${t.at * 100}%` }}>{t.text}</span>)}</div>
      )}
      {labels && (
        <div className="flex">{labels.map((l, k) => <span key={k} className={cn('flex-1 text-center text-caption leading-tight', k === at ? cn('font-medium', TONE_TEXT[tone]) : 'text-ink-soft')}>{l}</span>)}</div>
      )}
    </div>
  );
}

/** 100명 점 그림: rank 가 있으면 낮은 순서로 세운 줄에서 내 자리, 없으면 n명 칠하기 */
/** tone: 내 점 색 (좋음 초록 · 보통 잉크 · 주의 호박 · 위험 Coral). 없으면 hot 여부로 */
export function Dots({ rank, n, hot, tone, cols = 20 }: { rank?: number; n?: number; hot: boolean; tone?: Tone; cols?: number }) {
  const me = tone ? cn(TONE_FILL[tone], ME_RING[tone]) : hot ? 'bg-risk-dot ring-risk-dot' : 'bg-brand ring-brand';
  return (
    <div className="grid gap-x-1 gap-y-[5px] px-1 py-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden="true">
      {Array.from({ length: 100 }, (_, k) => {
        const isMe = rank != null && k === rank - 1, on = n != null && k < n, meCls = me;
        return <i key={k} className={cn('block aspect-square rounded-full animate-dot-in', isMe ? cn('relative z-10 animate-dot-me ring-2 ring-offset-2', meCls) : on ? 'bg-brand' : 'bg-sand')}
          style={{ animationDelay: isMe ? undefined : `${Math.min(k, rank ?? n ?? 0) * 8}ms` } as CSSProperties} />;
      })}
    </div>
  );
}

/** 숫자가 이전 값에서 새 값으로 세어지며 바뀐다(영상의 '줄이면?' 장면). 'a–b%' 같은 범위나 글자는 그대로 */
export function CountTo({ text, className }: { text: string; className?: string }) {
  const m = /^(\d+(?:\.\d+)?)%$/.exec(text), target = m ? parseFloat(m[1]) : null;
  const [v, setV] = useState(target);
  useEffect(() => {
    if (target == null) return;
    if (reduced() || v == null) { setV(target); return; }
    const from = v, t0 = performance.now(), dur = 700;
    let raf = 0;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3; setV(from + (target - from) * e); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);   // eslint-disable-line react-hooks/exhaustive-deps
  return <span className={className}>{target == null || v == null ? text : `${(Math.round(v * 10) / 10).toFixed(1)}%`}</span>;
}
