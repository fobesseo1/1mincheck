// 랜딩 '내 결과에서 볼 수 있는 것' 장면: 제목 묶음을 화면 가운데에 두고, 실제 결과 화면 조각 4개(같은 예시 입력)가
// 제목 뒤에서 나와 네 귀퉁이로 퍼진다(jeton.com 'Unify your finances' 구성). 위로 올리면 같은 길로 되돌아간다.
// 매 프레임 React 렌더 없이 transform만 바꾼다. 조각은 실제 컴포넌트를 그린 뒤 필요한 부분만 잘라 보여준다(crop).
// 좁은 화면: 가운데 제목 아래로 조각이 한 줄로 내려가며 앞 조각 밑에서 빠져나온다. 동작 줄이기 설정이면 마지막 구도만.
import { useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Input } from '../../../engine/src/engine.ts';
import { peerCards } from '../lib/peer.ts';
import { labCards } from '../lib/labZones.ts';
import { VerdictCard, PeerCardView, ChangeCard, verdictOf } from './Results.tsx';
import { LabCardView } from './Labs.tsx';
import './landing-spread.css';

const BW = 350; // 실제 앱 화면 폭(휴대폰)으로 그린 뒤 줄인다
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (t: number) => t * t * (3 - 2 * t);
const out3 = (t: number) => 1 - (1 - t) ** 3;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** side: 끝 구도의 자리(왼쪽 위·왼쪽 아래·오른쪽 위·오른쪽 아래). crop: 이 선택자 사이만 보여준다 */
type Slot = { key: string; label: string; n: number; side: 'tl' | 'bl' | 'tr' | 'br'; tilt: number; crop?: [string, string]; node: ReactNode };

export function SpreadScene({ ex, exLabel, id }: { ex: Input; exLabel: string; id?: string }) {
  const slots = useMemo<Slot[]>(() => {
    const { v, gap } = verdictOf(ex);
    const lab = labCards({ glu: 108 }, ex.sex)[0];
    // 아래에서 위 순서(마지막이 맨 위)
    return [
      { key: 'change', label: '바꿔보기', n: 3, side: 'br', tilt: 7, crop: ['[aria-live]', '[aria-live]'], node: <ChangeCard inp={ex} anchor={null} start={{ dwa: -3 }} /> },
      { key: 'peer', label: '또래 비교', n: 2, side: 'tr', tilt: -6, crop: ['[role=tabpanel][data-state=active] p', '[role=tabpanel][data-state=active] .grid-cols-2'], node: <PeerCardView cs={peerCards(ex)} initial="htn" /> },
      { key: 'lab', label: '검진 수치', n: 4, side: 'bl', tilt: 5, node: <LabCardView c={lab} k={0} /> },
      { key: 'verdict', label: '지금 내 상태', n: 1, side: 'tl', tilt: -4, node: <VerdictCard v={v} gap={gap} /> },
    ];
  }, [ex]);

  const root = useRef<HTMLElement>(null), stage = useRef<HTMLDivElement>(null), head = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]), labels = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    const el = root.current!, st = stage.current!, hd = head.current!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, hs: number[] = [];
    // 조각 높이(실제 화면 크기 기준)를 재고, 잘라 보여줄 자리로 안쪽을 올린다
    const measure = () => {
      hs = cards.current.map((c, i) => {
        const real = c?.firstElementChild as HTMLElement | null; if (!c || !real) return 0;
        const crop = slots[i].crop;
        if (!crop) { real.style.transform = ''; c.style.height = ''; return real.offsetHeight; }
        // 변형(회전·크기)에 영향받지 않게 레이아웃 좌표(offsetTop)로 잰다
        const a = real.querySelector<HTMLElement>(crop[0]), b = real.querySelector<HTMLElement>(crop[1]);
        if (!a || !b) return real.offsetHeight;
        const y = (e: HTMLElement) => { let v = 0, n: HTMLElement | null = e; while (n && n !== real) { v += n.offsetTop; n = n.offsetParent as HTMLElement | null; } return v; };
        const top = Math.max(0, y(a) - 18), bot = y(b) + b.offsetHeight + 18;
        real.style.transform = `translateY(${-top}px)`; c.style.height = `${bot - top}px`;
        return bot - top;
      });
    };
    const wide = () => innerWidth >= 1024 && innerHeight >= 620;

    const draw = () => {
      frame = 0;
      const W = innerWidth, H = innerHeight, isWide = wide();
      if (el.dataset.mode !== (isWide ? 'wide' : 'narrow')) { el.dataset.mode = isWide ? 'wide' : 'narrow'; measure(); }
      if (!isWide) return drawNarrow();
      cards.current.forEach((c) => { if (c?.parentElement) c.parentElement.style.transform = ''; });
      const r = el.getBoundingClientRect();
      const p = reduce.matches ? 1 : clamp(-r.top / Math.max(1, r.height - H));
      const t = clamp((p - 0.04) / 0.6); // 0.04–0.64 퍼짐, 그 뒤는 읽는 시간
      const top = 92, pad = 34, labH = 30;

      // 가운데 제목 묶음
      const hw = hd.offsetWidth, hh = hd.offsetHeight;
      const hx = (W - hw) / 2, hy = top + (H - top - hh) / 2;
      hd.style.transform = `translate(${hx}px, ${hy}px) scale(${lerp(1.06, 1, ease(t))})`;

      // 끝 구도: 제목 양옆 두 칸, 칸마다 위·아래 조각
      const zL0 = Math.max(32, (W - 1600) / 2 + 48), zL1 = hx - 36, zR0 = hx + hw + 36, zR1 = W - zL0;
      const zw = Math.min(zL1 - zL0, zR1 - zR0);
      const at = (side: Slot['side']) => slots.findIndex((s) => s.side === side);
      const colH = Math.max(hs[at('tl')] + hs[at('bl')], hs[at('tr')] + hs[at('br')]);
      const s = Math.min(1, zw / BW, Math.max(0.68, (H - top - pad * 2 - labH * 2 - 20) / colH));
      const cw = BW * s, slack = Math.max(0, zw - cw);
      const end = slots.map((sl, i) => {
        const h = hs[i] * s;
        const x = sl.side === 'tl' ? zL1 - cw - slack * 0.15 : sl.side === 'bl' ? zL0 + slack * 0.1 : sl.side === 'tr' ? zR0 + slack * 0.2 : zR1 - cw - slack * 0.05;
        const y = sl.side === 'tl' ? top + pad + labH : sl.side === 'tr' ? top + pad + labH + 26 : H - pad - h;
        return { x, y, h };
      });

      // 시작: 제목 뒤 가운데에 작게 모여 있다가(보이지 않음) 바깥으로 나오며 커진다
      const s0 = s * 0.45, q = out3(t), e = ease(t);
      slots.forEach((sl, i) => {
        const c = cards.current[i], lb = labels.current[i]; if (!c || !lb) return;
        const sx = W / 2 - (BW * s0) / 2 + (sl.side.endsWith('l') ? -40 : 40), sy = H / 2 + 20 - (hs[i] * s0) / 2 + (sl.side.startsWith('t') ? -30 : 30);
        const x = lerp(sx, end[i].x, q), y = lerp(sy, end[i].y, q), sc = lerp(s0, s, e), rot = lerp(sl.tilt, 0, e);
        c.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${sc})`;
        c.style.opacity = String(clamp((t - 0.2) / 0.22)); // 제목 뒤를 빠져나올 때 보이기 시작
        c.style.setProperty('--lift', String(1 - t));
        lb.style.transform = `translate(${end[i].x}px, ${end[i].y - labH + 4}px)`;
        lb.style.opacity = String(clamp((t - 0.78) / 0.22));
      });
    };

    const drawNarrow = () => {
      hd.style.transform = '';
      const H = innerHeight, base = st.getBoundingClientRect().top;
      slots.forEach((sl, i) => {
        const c = cards.current[i], lb = labels.current[i], box = c?.parentElement; if (!c || !lb || !box) return;
        lb.style.transform = ''; lb.style.opacity = '1'; c.style.transform = ''; c.style.opacity = '';
        // 첫 조각은 제자리. 나머지는 자리(변형 전)가 화면 아래쪽일수록 앞 조각 밑으로 겹쳐 있다가 올라오며 빠져나온다
        if (reduce.matches || sl.n === 1) { box.style.transform = ''; c.style.setProperty('--lift', '0'); return; }
        const y = base + box.offsetTop, k = ease(clamp((H * 1.02 - y) / (H * 0.6)));
        box.style.transform = `translateY(${(1 - k) * -Math.min(200, box.offsetHeight * 0.5)}px) rotate(${(1 - k) * sl.tilt * 0.5}deg) scale(${lerp(0.92, 1, k)})`;
        c.style.setProperty('--lift', String(1 - k));
      });
    };

    const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
    const ro = new ResizeObserver(() => { measure(); schedule(); });
    cards.current.forEach((c) => c?.firstElementChild && ro.observe(c.firstElementChild));
    ro.observe(hd);
    draw(); measure(); draw();
    addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule); reduce.addEventListener('change', schedule);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); removeEventListener('scroll', schedule); removeEventListener('resize', schedule); reduce.removeEventListener('change', schedule); };
  }, [slots]);

  // 좁은 화면 순서: 위에서부터 1–4
  const narrow = [...slots.keys()].sort((a, b) => slots[a].n - slots[b].n);
  return (
    <section id={id} ref={root} className="sp" aria-labelledby="sp-title">
      <div ref={stage} className="sp-stage">
        <div ref={head} className="sp-head">
          <h2 id="sp-title">내 건강을<br />한눈에</h2>
          <ul className="sr-only">{slots.map((sl) => <li key={sl.key}>{sl.n}. {sl.label} ({exLabel} 예시)</li>)}</ul>
          <a className="sp-cta" href="#/start">바로 체크하기 <ArrowRight size={20} /></a>
        </div>
        {slots.map((sl, i) => (
          <div key={sl.key} className="sp-slot" style={{ order: narrow.indexOf(i), zIndex: i + 1, '--zn': 10 - sl.n } as CSSProperties}>
            <span ref={(e) => { labels.current[i] = e; }} className="sp-label"><b>{sl.n}</b>{sl.label}</span>
            <div ref={(e) => { cards.current[i] = e; }} className="sp-card" aria-hidden {...{ inert: '' }}>
              <div className="sp-real">{sl.node}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
