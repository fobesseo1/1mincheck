// 체형 캐릭터 (바꿔보기). 그림: public/characters/ (lib/characters.ts 가 고른 세트 10장)
//  · 키는 절대 바뀌지 않는다 — 그림 10장은 머리 꼭대기 · 발바닥을 같은 픽셀에 맞춰 두었고, 움직임은 모두 가로로만.
//  · 막대를 움직이는 동안만 이웃한 두 장을 섞고, 0.35초 동안 값이 안 바뀌면 가장 가까운 한 장으로 자리 잡는다(멈춘 화면에 겹침 없음).
//  · 섞을 때 두 장의 폭을 맞춘다(widths · bellyWidths) — 넓은 그림의 어깨 · 팔이 반투명 잔상으로 남지 않게.
//  · 몸무게 = 체형 단계, 허리 = 배만 (멈추면 기준선 이상은 배 나온 그림, 미만은 보통 그림).
//  · 뒤에는 원 · 빛 · 색을 두지 않는다. 발밑 그림자만.
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Spring, MORPH, PRESS, reducedMotion } from '@/lib/spring';
import type { CharSet } from '@/lib/characters';
import { cn } from '@/lib/utils';

export interface Bubble { label: string; value: string; better: boolean; up: boolean }
export interface BodyCharacterHandle { say: (b: Bubble) => void }

const SETTLE_MS = 350, BUBBLE_MS = 2800;

export const BodyCharacter = forwardRef<BodyCharacterHandle, { set: CharSet | null; stage: number; belly: number; className?: string }>(
  function BodyCharacter({ set, stage, belly, className }, ref) {
    const host = useRef<HTMLDivElement>(null), body = useRef<HTMLDivElement>(null), bub = useRef<HTMLDivElement>(null);
    const imgs = useRef<(HTMLImageElement | null)[]>([]), bellyImgs = useRef<(HTMLImageElement | null)[]>([]);
    const setRef = useRef(set); setRef.current = set;

    // 이웃한 두 장만 보인다: 단계 3.4 → 3번 그림(불투명) 위에 4번 그림 40%.
    // 아래 그림은 scaleX(1 + (r − 1)·f), 위 그림은 scaleX(1/r + (1 − 1/r)·f) 로 서로의 폭에 맞춘다 (r = 위 폭 ÷ 아래 폭)
    const paint = () => {
      const P = setRef.current; if (!P || !sp.current) return;
      const s = sp.current.stage.value, bl = sp.current.belly.value;
      let i = Math.min(3, Math.floor(s - 1)), f = s - 1 - i;
      // 거의 다음 장이면 그 한 장만 (5단계는 i = 3, f = 1 이 되므로 아래 장을 지우고 위 장만 남긴다)
      if (f > 0.995) { if (i < 3) { i += 1; f = 0; } else f = 1; }
      if (f < 0.005) f = 0;
      const top = f === 1;   // 5단계: 4번 그림은 숨기고 5번 한 장만
      const b = bl < 0.005 ? 0 : bl > 0.995 ? 1 : bl;
      const lay = (els: (HTMLImageElement | null)[], w: number[], alpha: number) => {
        const r = w[i + 1] / w[i];
        els.forEach((im, j) => {
          if (!im) return;
          im.style.opacity = String(j === i ? (top ? 0 : alpha) : j === i + 1 ? alpha * f : 0);
          im.style.transform = j === i && !top ? `scaleX(${1 + (r - 1) * f})` : j === i + 1 && !top ? `scaleX(${1 / r + (1 - 1 / r) * f})` : 'none';
        });
      };
      lay(imgs.current, P.widths, b === 1 ? 0 : 1);   // 배 그림이 완전히 덮으면 아래층은 숨긴다
      lay(bellyImgs.current, P.bellyWidths, b);
    };
    const paintRef = useRef(paint); paintRef.current = paint;

    const sp = useRef<{ stage: Spring; belly: Spring; pop: Spring; bub: Spring } | null>(null);
    if (!sp.current) {
      const p = () => paintRef.current();
      sp.current = {
        stage: new Spring(Math.round(stage), MORPH, p),
        belly: new Spring(belly >= 0.5 ? 1 : 0, MORPH, p),
        // 바뀔 때 반응은 가로로만 (세로로 늘이면 키가 출렁여 보인다)
        pop: new Spring(1, PRESS, (v) => { if (body.current) body.current.style.transform = `scaleX(${v})`; }),
        bub: new Spring(0, PRESS, (v) => { const el = bub.current; if (el) { el.style.transform = `scale(${Math.max(0, v)})`; el.style.opacity = String(Math.min(1, Math.max(0, v * 1.4))); } }),
      };
    }
    useEffect(() => () => { const s = sp.current!; s.stage.stop(); s.belly.stop(); s.pop.stop(); s.bub.stop(); }, []);

    // 움직이는 동안은 소수 단계 · 배를 섞고, 0.35초 멈추면 가장 가까운 한 장으로
    const first = useRef(true), settle = useRef(0);
    useEffect(() => {
      const s = sp.current!;
      if (first.current) { first.current = false; return; }
      const before = Math.round(s.stage.target * 10);
      s.stage.to(stage); s.belly.to(belly);
      if (Math.round(stage * 10) !== before) s.pop.kick((stage < s.stage.value ? -1 : 1) * 0.18);
      clearTimeout(settle.current);
      settle.current = window.setTimeout(() => { s.stage.to(Math.round(stage)); s.belly.to(belly >= 0.5 ? 1 : 0); }, reducedMotion() ? 0 : SETTLE_MS);
    }, [stage, belly]);
    useEffect(() => () => clearTimeout(settle.current), []);
    // 세트(성별 · 나이대)가 바뀌면 새 그림에 지금 단계를 바로 칠한다
    useLayoutEffect(() => { paint(); });   // eslint-disable-line react-hooks/exhaustive-deps

    // 말풍선: 머리 옆 빈 곳 중 넓은 쪽에 톡 튀어나왔다 2.8초 뒤 사라진다
    const [msg, setMsg] = useState<Bubble & { side: 'left' | 'right'; n: number }>();
    const hide = useRef(0);
    useImperativeHandle(ref, () => ({
      say(b) {
        const h = host.current; if (!h) return;
        const card = (h.closest('[data-slot="card"]') ?? h.parentElement!).getBoundingClientRect(), r = h.getBoundingClientRect();
        const bw = bub.current?.offsetWidth || 150, gap = r.width * 0.16, mid = r.left + r.width / 2;
        const right = card.right - (mid + gap), left = mid - gap - card.left;
        setMsg((m) => ({ ...b, n: (m?.n ?? 0) + 1,
          side: right >= bw && left >= bw ? (m?.side === 'right' ? 'left' : 'right') : right >= left ? 'right' : 'left' }));
      },
    }), []);
    useEffect(() => {
      if (!msg) return;
      const s = sp.current!.bub;
      s.set(0.6); s.to(1);
      clearTimeout(hide.current);
      hide.current = window.setTimeout(() => s.to(0), BUBBLE_MS);
    }, [msg?.n]);   // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => () => clearTimeout(hide.current), []);

    return (
      <div ref={host} className={cn('relative aspect-[2/3]', className)}>
        <div aria-hidden className="absolute bottom-[3.5%] left-1/2 h-[4%] w-[46%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(22,51,0,.16),rgba(22,51,0,0))]" />
        <div ref={body} aria-hidden className="absolute inset-0 origin-[50%_96%] motion-safe:animate-[breathe_4.2s_ease-in-out_infinite]">
          {set && set.files.map((src, i) => <img key={src} ref={(e) => { imgs.current[i] = e; }} src={src} alt="" draggable={false} style={{ zIndex: i + 1, opacity: 0 }} className="pointer-events-none absolute inset-0 size-full object-contain select-none" />)}
          {set && set.bellyFiles.map((src, i) => <img key={src} ref={(e) => { bellyImgs.current[i] = e; }} src={src} alt="" draggable={false} style={{ zIndex: i + 11, opacity: 0 }} className="pointer-events-none absolute inset-0 size-full object-contain select-none" />)}
        </div>
        {/* 흰 바탕 + 옅은 그림자, 작은 이름 + 큰 값. 값만 상태 색. 꼬리 쪽 모서리가 머리를 향한다 */}
        <div ref={bub} aria-hidden style={{ opacity: 0 }}
          className={cn('pointer-events-none absolute top-[3%] z-20 flex flex-col gap-0.5 rounded-2xl bg-white px-3.5 pt-2.5 pb-[11px] whitespace-nowrap shadow-float',
            msg?.side === 'left' ? 'right-[64%] origin-bottom-right rounded-br-[4px]' : 'left-[64%] origin-bottom-left rounded-bl-[4px]')}>
          {msg && <>
            <span className="text-caption text-ink-soft">{msg.label}</span>
            <b className={cn('inline-flex items-center gap-1.5 text-[20px] font-semibold tabular-nums', msg.better ? 'text-good' : 'text-risk')}>
              {msg.value}
              {/* 삼각형은 글자 기호가 아니라 도형 */}
              <i aria-hidden className={cn('size-0 border-x-[6px] border-x-transparent', msg.up ? 'border-b-[9px] border-b-current' : 'border-t-[9px] border-t-current')} />
            </b>
          </>}
        </div>
      </div>
    );
  });
