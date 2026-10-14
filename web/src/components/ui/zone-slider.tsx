// 구간 막대 = 손잡이 (몸무게 · 허리 바꿔보기). 디자인: docs/DESIGN.md 「구간 막대」
// 막대 전체를 칠하지 않는다: 회녹색 바탕 위에 건강 구간만 초록, 손잡이가 건강 구간을 벗어난 만큼만 붉은 계열로 칠한다
// (위로 벗어나도, 아래로(너무 마름) 벗어나도). 칠 색은 자리마다 고정이고 손잡이 위치까지만 잘라 보인다.
// 손잡이 테두리 = 손잡이가 놓인 자리의 막대 색. 키보드(←→ · Home/End · PageUp/Down)로도 움직인다.
// 잡으면 막대가 ×1.7 두꺼워지고 손잡이가 살짝 커진다. 끝을 넘겨 끌면 고무줄처럼 늘어났다 돌아온다.
import { useEffect, useRef } from 'react';
import { Spring, SNAP, MORPH } from '@/lib/spring';
import { cn } from '@/lib/utils';

export type Stop = [value: number, color: string];
export const BAND = '#5cc98a';   // 건강 구간 초록

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => '#' + hex(a).map((x, i) => Math.round(x + (hex(b)[i] - x) * t).toString(16).padStart(2, '0')).join('');
export function colorAt(stops: Stop[], v: number) {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  return stops[stops.length - 1][1];
}
/** 막대 조각(a~b) 안에서의 % 위치로 그라데이션 → 색이 자리마다 고정된다 */
const grad = (stops: Stop[], a: number, b: number) => `linear-gradient(90deg, ${stops.map(([v, c]) => `${c} ${(((v - a) / (b - a)) * 100).toFixed(2)}%`).join(', ')})`;

export function ZoneSlider({ label, valueText, min, max, step = 1, value, onChange, healthy, bracket, overStops, underStops, tick, now, onGrab }: {
  label: string; valueText?: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void;
  /** 건강 구간 [아래, 위] (몸무게 = 표준 몸무게, 허리 = 기준선 아래) */
  healthy: [number, number];
  /** 건강 구간 위 괄호 이름 (몸무게 「표준」) */
  bracket?: string;
  /** 위로 벗어났을 때 · 아래로 벗어났을 때 칠 [값, 색] (값 오름차순) */
  overStops: Stop[]; underStops?: Stop[];
  /** 건강 구간 위 끝에 세로 눈금 (허리 기준선) */
  tick?: boolean;
  /** 처음 값 자리 표시 (바꾼 뒤에만 보인다) */
  now?: number;
  /** 막대를 잡았을 때 (자동 시연을 멈춘다) */
  onGrab?: () => void;
}) {
  const span = max - min, pct = (v: number) => (Math.min(max, Math.max(min, v)) - min) / span;
  const lo = pct(healthy[0]), hi = pct(healthy[1]);
  const host = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null), knob = useRef<HTMLDivElement>(null);
  const over = useRef<HTMLElement>(null), under = useRef<HTMLElement>(null);
  const dragging = useRef(false), pos = useRef<Spring>(), grab = useRef<Spring>(), stretch = useRef<Spring>(), stretchPx = useRef(0);
  const ringAt = (v: number) => (v > healthy[1] ? colorAt(overStops, v) : v < healthy[0] && underStops ? colorAt(underStops, v) : BAND);
  const paint = (p: number) => {
    if (!knob.current) return;
    knob.current.style.left = `calc(${p * 100}% + ${stretchPx.current}px)`;
    knob.current.style.setProperty('--ring', ringAt(min + p * span));
    if (over.current) over.current.style.clipPath = `inset(0 ${Math.min(100, Math.max(0, ((1 - p) / (1 - hi)) * 100))}% 0 0)`;
    if (under.current) under.current.style.clipPath = `inset(0 0 0 ${Math.min(100, Math.max(0, (p / lo) * 100))}%)`;
  };
  const paintRef = useRef(paint); paintRef.current = paint;
  pos.current ??= new Spring(pct(value), SNAP, (p) => paintRef.current(p));
  grab.current ??= new Spring(0, SNAP, (k) => {   // 잡으면 두꺼워진다 (×1.7) · 손잡이 테두리 +2px · 1.15배
    if (track.current) track.current.style.transform = k ? `scaleY(${1 + k * 0.7})` : '';
    if (knob.current) knob.current.style.setProperty('--grab', String(k));
  });
  stretch.current ??= new Spring(0, MORPH, (px) => { stretchPx.current = px; paintRef.current(pos.current!.value); });
  // 값이 밖에서 바뀌면(시연 · 처음 값으로) 스프링으로 따라가고, 끄는 중에는 손가락을 바로 따라간다
  useEffect(() => { const p = pct(value); if (dragging.current) pos.current!.set(p); else pos.current!.to(p); paint(pos.current!.value); });   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { pos.current?.stop(); grab.current?.stop(); stretch.current?.stop(); }, []);

  const snap = (v: number) => Math.min(max, Math.max(min, min + Math.round((v - min) / step) * step));
  const emit = (v: number) => { const s = Math.round(snap(v) * 100) / 100; if (s !== value) onChange(s); };
  const fromX = (x: number) => {
    const b = track.current!.getBoundingClientRect(), raw = (x - b.left) / b.width;
    // 고무줄: 끝을 넘어선 만큼 늘어나되, 멀리 끌수록 덜 늘어난다 — offset = (1 − 1/(x·0.55/26 + 1))·26px
    const out = (raw < 0 ? raw : raw > 1 ? raw - 1 : 0) * b.width, D = 26;
    stretch.current!.set(Math.sign(out) * (1 - 1 / ((Math.abs(out) * 0.55) / D + 1)) * D);
    return min + Math.min(1, Math.max(0, raw)) * span;
  };
  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragging.current = true; host.current?.setPointerCapture(e.pointerId); onGrab?.(); grab.current!.to(1);
    emit(fromX(e.clientX));
  };
  const move = (e: React.PointerEvent) => { if (dragging.current) emit(fromX(e.clientX)); };
  const up = () => { if (!dragging.current) return; dragging.current = false; grab.current!.to(0); stretch.current!.to(0); };
  const key = (e: React.KeyboardEvent) => {
    const d = ({ ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step, PageDown: -10 * step, PageUp: 10 * step } as Record<string, number>)[e.key];
    if (d == null && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault(); onGrab?.();
    emit(e.key === 'Home' ? min : e.key === 'End' ? max : value + d);
  };

  return (
    <div ref={host} role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={valueText}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}
      className="relative h-[52px] w-full cursor-pointer touch-pan-y select-none rounded-btn outline-none focus-visible:ring-4 focus-visible:ring-brand/20">
      {bracket && (
        <div className="pointer-events-none absolute top-2 h-3.5 rounded-t-[4px] border-[1.5px] border-b-0" style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%`, borderColor: BAND }}>
          <span className="absolute -top-[9px] left-1/2 -translate-x-1/2 bg-white px-1.5 text-[11px] leading-[14px] font-semibold whitespace-nowrap text-good">{bracket}</span>
        </div>
      )}
      <div ref={track} className="absolute inset-x-0 top-[34px] -mt-[5px] h-2.5 origin-center overflow-hidden rounded-full bg-sand">
        <i className="absolute inset-y-0" style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%`, background: BAND }} />
        {lo > 0 && underStops && <i ref={under} className="absolute inset-y-0 left-0" style={{ width: `${lo * 100}%`, background: grad(underStops, min, healthy[0]) }} />}
        {hi < 1 && <i ref={over} className="absolute inset-y-0" style={{ left: `${hi * 100}%`, width: `${(1 - hi) * 100}%`, background: grad(overStops, healthy[1], max) }} />}
      </div>
      {tick && hi < 1 && <i className="pointer-events-none absolute top-[22px] -ml-px h-6 w-0.5 rounded-[1px]" style={{ left: `${hi * 100}%`, background: BAND }} />}
      {now != null && now !== value && <i aria-hidden className="pointer-events-none absolute top-[34px] -mt-[7px] -ml-[7px] size-3.5 rounded-full bg-white shadow-[0_0_0_2px_#c9cdc5]" style={{ left: `${pct(now) * 100}%` }} />}
      <div ref={knob} aria-hidden className={cn('pointer-events-none absolute top-[34px] -mt-[15px] -ml-[15px] size-[30px] rounded-full bg-white [scale:calc(1+var(--grab,0)*.15)]',
        'shadow-[0_0_0_calc(5px+var(--grab,0)*2px)_var(--ring),0_8px_24px_rgba(22,51,0,.12),0_2px_8px_rgba(22,51,0,.06)]')} />
    </div>
  );
}
