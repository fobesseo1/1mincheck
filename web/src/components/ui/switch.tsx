// 켜고 끄기: 누르고 있으면 손잡이가 투명한 렌즈로 커지고, 넘어갈 때 앞쪽으로 늘어났다 따라붙는다. 키보드(스페이스 · 엔터)도 된다.
import { useEffect, useRef } from 'react';
import { Spring, TRAIL, LEAD, SNAP, MORPH } from '@/lib/spring';
import { cn } from '@/lib/utils';

const W = 64, H = 36, K = 30, P = 3;   // 바탕 64×36, 손잡이 30, 여백 3
type St = { L: number; R: number; lensK: number; left: Spring; right: Spring; lens: Spring; fill: Spring };
const rest = (on: boolean): [number, number] => (on ? [W - P - K, W - P] : [P, P + K]);

export function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  const knob = useRef<HTMLSpanElement>(null), fill = useRef<HTMLSpanElement>(null);
  const st = useRef<St | null>(null);
  const onRef = useRef(on); onRef.current = on;
  if (!st.current) {
    const o = { L: rest(on)[0], R: rest(on)[1], lensK: 0 } as St;
    const draw = () => {
      const el = knob.current; if (!el) return;
      const g = o.lensK * 8;   // 렌즈가 되면 위아래로도 커진다
      el.style.left = `${o.L - g / 2}px`; el.style.width = `${o.R - o.L + g}px`;
      el.style.height = `${K + g}px`; el.style.top = `${P - g / 2}px`;
      el.dataset.lens = o.lensK > 0.3 ? '1' : '';
    };
    o.left = new Spring(o.L, TRAIL, (v) => { o.L = v; draw(); });
    o.right = new Spring(o.R, TRAIL, (v) => { o.R = v; draw(); });
    o.lens = new Spring(0, SNAP, (v) => { o.lensK = v; draw(); });
    o.fill = new Spring(on ? 1 : 0, MORPH, (v) => { if (fill.current) fill.current.style.opacity = String(v); });
    st.current = o;
  }
  useEffect(() => () => { const o = st.current!; o.left.stop(); o.right.stop(); o.lens.stop(); o.fill.stop(); }, []);
  // 값이 바뀌면(눌러서든 밖에서든) 새 자리로: 가는 쪽 끝이 먼저
  useEffect(() => {
    const o = st.current!, [a, b] = rest(on);
    (on ? o.right : o.left).params(LEAD); (on ? o.left : o.right).params(TRAIL);
    o.left.to(a); o.right.to(b); o.fill.to(on ? 1 : 0); o.lens.to(0);
  }, [on]);
  const pressed = useRef(false), skipClick = useRef(false);
  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pressed.current = true;
    const o = st.current!; o.lens.to(1); o.left.params(TRAIL); o.right.params(TRAIL);
    if (onRef.current) { o.left.to(W - P - K - 8); } else { o.right.to(P + K + 8); }   // 누르면 렌즈 + 살짝 늘어남
  };
  const release = () => {
    if (!pressed.current) return;
    pressed.current = false; skipClick.current = true;
    onChange(!onRef.current);
  };
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      onPointerDown={down} onPointerUp={release} onPointerLeave={release}
      onClick={() => { if (skipClick.current) { skipClick.current = false; return; } onChange(!on); }}
      className="relative shrink-0 cursor-pointer touch-none rounded-full bg-sand" style={{ width: W, height: H }}>
      <span ref={fill} aria-hidden className="absolute inset-0 rounded-full bg-brand" style={{ opacity: on ? 1 : 0 }} />
      <span ref={knob} aria-hidden style={{ left: rest(on)[0], width: K, height: K, top: P }}
        className={cn('absolute rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.18)]',
          'data-[lens=1]:bg-white/25 data-[lens=1]:shadow-[inset_0_1px_1px_#fff,inset_0_-1px_1px_rgba(255,255,255,.5),0_6px_16px_rgba(0,0,0,.14)] data-[lens=1]:backdrop-blur-[2px] data-[lens=1]:backdrop-saturate-[1.8]')} />
    </button>
  );
}
