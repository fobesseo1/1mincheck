// 랜딩 아래쪽 장면들. 모두 실제 앱 부품·계산 함수를 그대로 쓰고, 스크롤 진행도로 transform 만 바꾼다(매 프레임 React 렌더 없음).
// ① 비교하고·바꿔보고·알아보고: 하나가 크게 나왔다가 다음이 나오면 앞의 것이 줄어들며 제자리로 → 셋이 한 구도
// ② 바꿔보기: 실제 '줄이면' 카드가 화면에 들어오면 허리·몸무게를 차례로 줄여 보여 주고, 손대면 멈춘다
// ③ 인물: 영상 속 예시 인물 9명이 크기·시점을 달리해 나타나고, 누르면 그 사람의 4가지 정보로 간단 체험 결과
// ④ 검진 수치: 검진표(일러스트)의 숫자가 입력칸으로 → 구간 → 뜻과 할 일 (실제 검진 풀이 카드)
// ⑤ 1분 동안: 실제 앱 화면(기본정보 → 생활 → 결과)이 시계와 함께 넘어간다
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Input } from '../../../engine/src/engine.ts';
import { peerCards, standing } from '../lib/peer.ts';
import { waistTrack, toneAt, futureEffects } from '../lib/lines.ts';
import { labCards } from '../lib/labZones.ts';
import { LABS } from '../lib/labs.ts';
import { Dots } from '@/components/viz';
import { CountTo } from '@/components/viz';
import { ZoneSlider } from '@/components/ui/zone-slider';
import { ChangeCard } from './Results.tsx';
import { LabCardView } from './Labs.tsx';
import { MiniTrial } from './MiniTrial.tsx';
import { cn } from '@/lib/utils';
import './landing-scenes.css';

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 붙잡는 장면의 진행도(0–1)를 매 프레임 넘긴다. 좁은 화면·동작 줄이기면 wide=false, p=1 */
function useScroll(ref: React.RefObject<HTMLElement>, draw: (p: number, wide: boolean) => void, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    let f = 0;
    const run = () => {
      f = 0;
      const wide = innerWidth >= 1024 && innerHeight >= 620 && !reduced();
      el.dataset.mode = wide ? 'wide' : 'narrow';
      const r = el.getBoundingClientRect();
      draw(wide ? clamp(-r.top / Math.max(1, r.height - innerHeight)) : 1, wide);
    };
    const go = () => { if (!f) f = requestAnimationFrame(run); };
    run(); addEventListener('scroll', go, { passive: true }); addEventListener('resize', go);
    return () => { cancelAnimationFrame(f); removeEventListener('scroll', go); removeEventListener('resize', go); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ───────── ① 비교하고 · 바꿔보고 · 알아보고 ───────── */
function PeerBit({ ex }: { ex: Input }) {
  const c = peerCards(ex).find((x) => x.id === 'htn');
  if (!c || c.kind !== 'rank') return null;
  const st = standing(c.rank);
  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-col gap-1"><span className="text-body text-ink-soft">또래 100명 중,</span>
        <b className="text-[24px] leading-[1.3] font-semibold">{c.name} 위험성이<br /><span className={st.dir === '높아요' ? 'text-risk' : 'text-good'}>{st.n}번째로 {st.dir}</span></b></p>
      <Dots rank={c.rank} hot={c.high} tone={st.dir === '높아요' ? 'high' : 'ok'} />
      <div className="-mt-1 flex justify-between text-caption text-ink-soft"><span>위험 낮은 쪽</span><span>위험 높은 쪽</span></div>
    </div>
  );
}
/** 허리 막대: 진행도에 따라 허리가 줄고, 10년 당뇨 위험이 바뀐다(값은 lines.ts 점수표 그대로) */
function ChangeBit({ ex, dwa }: { ex: Input; dwa: number }) {
  const t = waistTrack(ex)!, v = (ex.waistCm ?? 0) + dwa, z = toneAt(t, v);
  const e = futureEffects(ex, 0, dwa).effects.find((x) => x.id === 'dm10');
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1"><span className="text-body-sm text-ink-soft">허리둘레</span>
          <b className="text-[30px] leading-none font-semibold tabular-nums">{v}<small className="ml-0.5 text-body font-normal text-ink-soft">cm</small>{dwa !== 0 && <span className="ml-2 text-body font-semibold text-good">−{-dwa}cm</span>}</b></div>
        <span className={cn('text-body font-semibold', z.tone === 'ok' ? 'text-good' : 'text-risk')}>{z.name}</span>
      </div>
      <ZoneSlider label="허리둘레 예시" valueText={`${v}cm`} min={t.min} max={t.max} value={v} onChange={() => {}} zones={t.zones} now={ex.waistCm!} cut={t.cut} tone={z.tone} />
      {e && <div className="flex items-center justify-between gap-3 rounded-btn bg-brand px-4 py-3 text-white">
        <span className="text-body-sm leading-snug text-white/80">10년 안에 당뇨가<br />생길 위험</span>
        <span className="flex items-baseline gap-2 tabular-nums">{dwa !== 0 && e.before !== e.after && <s className="text-body-sm text-white/45">{e.before}</s>}
          <CountTo text={e.after} className={cn('text-[22px] font-semibold', e.before !== e.after ? 'text-lime' : 'text-white')} /></span>
      </div>}
    </div>
  );
}

export function TrioScene({ ex, id }: { ex: Input; id?: string }) {
  const root = useRef<HTMLElement>(null), cards = useRef<(HTMLDivElement | null)[]>([]);
  const [dwa, setDwa] = useState(0);
  const lab = useMemo(() => labCards({ glu: 108 }, ex.sex)[0], [ex]);
  const items: { word: string; sub: string; node: ReactNode }[] = [
    { word: '비교하고.', sub: '또래 100명 사이, 내 자리', node: <PeerBit ex={ex} /> },
    { word: '바꿔보고.', sub: '허리를 줄이면 달라지는 위험', node: <ChangeBit ex={ex} dwa={dwa} /> },
    { word: '알아보고.', sub: '검진표 숫자의 뜻과 할 일', node: <LabCardView c={lab} k={0} /> },
  ];
  useScroll(root, (p, wide) => {
    const H = innerHeight, W = innerWidth;
    const s = wide ? 0.3 + clamp(p / 0.88) * 2.7 : 3;   // 0.3–3: 첫 카드는 시작부터 크게, 하나씩
    // 바꿔보고 차례에 허리를 92 → 89cm로 줄인다(정수일 때만 다시 그림)
    const want = -Math.round(3 * clamp((s - 1.15) / 0.55));
    setDwa((v) => (v === want ? v : want));
    cards.current.forEach((c, k) => {
      if (!c) return;
      if (!wide) { c.style.transform = ''; c.style.opacity = ''; return; }
      const a = ease(clamp((s - k) / 0.3)), b = ease(clamp((s - k - 0.62) / 0.33));   // a: 나타남, b: 제자리로
      // 자리(레이아웃 좌표)에서 화면 가운데까지
      const row = c.parentElement!, ox = row.getBoundingClientRect().left;
      const cx = c.offsetLeft + c.offsetWidth / 2, cy = c.offsetTop + c.offsetHeight / 2;
      // 앞 카드들이 앉은 자리의 오른쪽 빈 곳 가운데 (첫 카드는 화면 가운데)
      const prev = k > 0 ? cards.current[k - 1] : null;
      const freeL = prev ? ox + prev.offsetLeft + prev.offsetWidth + 40 : 0;
      const free = W - freeL - 40;
      const big = Math.min(1.45, (H * 0.74) / c.offsetHeight, (free * 0.88) / c.offsetWidth);
      const tx = freeL + free / 2 - ox, ty = row.offsetHeight / 2 + (H / 2 - (row.getBoundingClientRect().top + row.offsetHeight / 2));
      const dx = tx - cx, dy = ty - cy;
      const sc = lerp(big, 1, b);
      c.style.transform = `translate(${lerp(dx, 0, b)}px, ${lerp(dy + 60 * (1 - a), 0, b)}px) scale(${sc})`;
      c.style.opacity = String(a);
      c.style.zIndex = String(b < 1 ? 5 : 1);
    });
  }, [ex]);
  return (
    <section id={id} ref={root} className="ls-trio" aria-label="비교하고, 바꿔보고, 알아보고">
      <div className="ls-trio-stage">
        <div className="ls-trio-row">
          {items.map((it, k) => (
            <div key={it.word} ref={(e) => { cards.current[k] = e; }} className="ls-trio-col">
              <h2 className="ls-word">{it.word}</h2>
              <span className="ls-word-sub">{it.sub}</span>
              <div className="ls-frag" aria-hidden {...{ inert: '' }}>{it.node}</div>
            </div>
          ))}
        </div>
        <span className="ls-sample">예시 · 52세 남성 · 172cm · 82kg · 허리 92cm</span>
      </div>
    </section>
  );
}

/* ───────── ② 바꿔보기 ───────── */
export function ChangeLive({ ex, id }: { ex: Input; id?: string }) {
  const demo = useMemo<[number, number][]>(() => [[0, 0], [0, -1], [0, -2], [0, -3], [-2, -3], [-4, -4]], []);
  return (
    <section id={id} className="ls-change">
      <div className="ls-wrap ls-change-grid">
        <div className="ls-change-copy">
          <span className="ls-eyebrow">바꿔보기</span>
          <h2 className="ls-h2">조금 줄이면,<br /><em>얼마나 달라질까요?</em></h2>
          <p className="ls-lead">몸무게와 허리둘레를 직접 움직여 보세요.<br />같은 조건에서 다시 계산한 위험이 바로 바뀌어요.</p>
          <p className="ls-note">화면에 보이면 허리부터 차례로 줄여 보여 드려요.<br />막대를 잡으면 시연이 멈추고, 직접 바꿔 볼 수 있어요.</p>
        </div>
        <div className="ls-change-card"><ChangeCard inp={ex} anchor={null} example="예시 · 52세 남성" demo={demo} /></div>
      </div>
    </section>
  );
}

/* ───────── ③ 인물 → 4가지 정보 → 간단 결과 ───────── */
const PEOPLE = Object.entries(import.meta.glob('../assets/landing/people-v2/*.webp', { eager: true, import: 'default' }) as Record<string, string>)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, src]) => { const [, sx, age, h, w] = /p\d-(M|F)-(\d+)-(\d+)-(\d+)\.webp$/.exec(k)!; return { src, sex: sx as 'M' | 'F', age: +age, h: +h, w: +w }; });
/** 화면 위 자리(가운데 기준 %)·크기·나타나는 순서 */
const SPOTS = [
  { x: -36, y: -18, size: 150, at: 0.00 }, { x: 33, y: -20, size: 132, at: 0.06 }, { x: -18, y: 26, size: 112, at: 0.12 },
  { x: 40, y: 16, size: 146, at: 0.18 }, { x: -42, y: 20, size: 118, at: 0.24 }, { x: 16, y: -26, size: 100, at: 0.30 },
  { x: 22, y: 28, size: 118, at: 0.36 }, { x: -22, y: -28, size: 96, at: 0.42 }, { x: 0, y: 34, size: 96, at: 0.48 },
];
const PICK = 1;   // 마지막에 고르는 예시 인물(여성 · 49세)
export function PeopleScene({ id }: { id?: string }) {
  const root = useRef<HTMLElement>(null), dots = useRef<(HTMLButtonElement | null)[]>([]);
  const [preset, setPreset] = useState<{ sex: 'M' | 'F'; age: number; h: number; w: number; n: number }>();
  const pick = (k: number) => { const p = PEOPLE[k]; setPreset({ ...p, n: Date.now() }); document.getElementById('ls-try')?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); };
  useScroll(root, (p, wide) => {
    const W = innerWidth, H = innerHeight;
    dots.current.forEach((d, k) => {
      if (!d) return;
      if (!wide) { d.style.transform = ''; d.style.opacity = ''; return; }
      const sp = SPOTS[k], a = ease(clamp((p - 0.04 - sp.at * 0.7) / 0.14)), h = ease(clamp((p - 0.7) / 0.16));
      const drift = (p - 0.5) * (24 + (k % 3) * 18) * (k % 2 ? 1 : -1);   // 사람마다 다른 속도로 떠오른다
      const x = W / 2 + (sp.x / 100) * W - sp.size / 2;
      const y = Math.max(96, Math.min(H - sp.size - 76, H / 2 + (sp.y / 100) * H - sp.size / 2 + drift));
      const on = k === PICK;
      d.style.transform = `translate(${x}px, ${y + 40 * (1 - a)}px) scale(${lerp(0.6, 1, a) * (on ? lerp(1, 1.18, h) : 1)})`;
      d.style.opacity = String(a * (on ? 1 : lerp(1, 0.35, h)));
      d.classList.toggle('is-pick', on && h > 0.5);
    });
  });
  return (
    <>
      <section id={id} ref={root} className="ls-people" aria-labelledby="ls-people-title">
        <div className="ls-people-stage">
          <div className="ls-people-head">
            <h2 id="ls-people-title" className="ls-h1">누구나,<br /><em>4가지 정보로</em><br />시작해요</h2>
            <p className="ls-lead">성별·나이·키·몸무게.<br />사진을 누르면 그 사람 정보로 바로 해 볼 수 있어요.</p>
          </div>
          {PEOPLE.map((p, k) => (
            <button key={p.src} ref={(e) => { dots.current[k] = e; }} type="button" className="ls-person" style={{ '--size': SPOTS[k].size + 'px' } as CSSProperties}
              onClick={() => pick(k)} aria-label={`${p.sex === 'F' ? '여성' : '남성'} ${p.age}세 ${p.h}cm ${p.w}kg 예시로 간단 결과 보기`}>
              <img src={p.src} alt="" loading="lazy" />
              <span className="ls-person-tag"><b>{p.sex === 'F' ? '여성' : '남성'} · {p.age}세</b>{p.h}cm · {p.w}kg</span>
              {k === PICK && <span className="ls-person-go">이 분 정보로 해 보기 <ArrowRight size={14} /></span>}
            </button>
          ))}
        </div>
      </section>
      <section id="ls-try" className="ls-try">
        <div className="ls-wrap ls-try-grid">
          <div>
            <span className="ls-eyebrow">간단 체험</span>
            <h2 className="ls-h2">성별·나이·키·몸무게,<br /><em>4가지 정보</em></h2>
            <p className="ls-lead">10초면 간단 결과를 볼 수 있어요.<br />허리둘레와 생활습관까지 넣는 1분 체크는 더 정확해요.</p>
            <div className="ls-try-people" role="group" aria-label="예시 인물로 채워 보기">
              {PEOPLE.slice(0, 5).map((p, k) => (
                <button key={p.src} type="button" onClick={() => pick(k)} className={cn('ls-try-chip', preset && preset.age === p.age && preset.w === p.w && 'is-on')}>
                  <img src={p.src} alt="" /><span>{p.sex === 'F' ? '여성' : '남성'} {p.age}세</span>
                </button>
              ))}
            </div>
          </div>
          <MiniTrial preset={preset} />
        </div>
      </section>
    </>
  );
}

/* ───────── ④ 검진 수치: 검진표(일러스트) → 숫자를 넣으면 → 구간 → 뜻 ───────── */
/** 일러스트 검진표 줄(예시 값). 공식 양식·기관 표시는 넣지 않는다. 줄마다 눌러서 풀이를 볼 수 있다 */
type SheetKey = 'bp' | 'glu' | 'tc' | 'hdl' | 'tg' | 'ldl' | 'hb' | 'ast' | 'alt' | 'ggt' | 'cr' | 'egfr';
// 분야마다 하나씩, 6줄만 (나머지 항목은 실제 검진 풀이 화면에서)
const SHEET: { k: SheetKey; name: string; v: string; unit: string; sec?: string }[] = [
  { k: 'bp', name: '혈압', v: '132/84', unit: 'mmHg' }, { k: 'glu', name: '공복혈당', v: '108', unit: 'mg/dL' },
  { k: 'tc', name: '총콜레스테롤', v: '245', unit: 'mg/dL' }, { k: 'hb', name: '혈색소', v: '14.8', unit: 'g/dL' },
  { k: 'alt', name: 'ALT (간 수치)', v: '41', unit: 'U/L' }, { k: 'egfr', name: 'eGFR (콩팥)', v: '82', unit: 'mL/min' },
];
const toLab = (k: SheetKey, v: string): Record<string, number> | null => {
  if (k === 'bp') { const [a, b] = v.split('/').map(Number); return a > 0 && b > 0 ? { sbp: a, dbp: b } : null; }
  const n = Number(v); return v !== '' && Number.isFinite(n) && n > 0 ? { [k]: n } : null;
};
export function LabsLive({ id, sex }: { id?: string; sex: 'M' | 'F' }) {
  const [key, setKey] = useState<SheetKey>('glu');
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(SHEET.map((r) => [r.k, r.v])));
  const rows = useRef<Record<string, HTMLSpanElement | null>>({}), field = useRef<HTMLInputElement>(null), root = useRef<HTMLElement>(null);
  const row = SHEET.find((r) => r.k === key)!, def = LABS.find((l) => l.key === key);
  const lab = toLab(key, vals[key]);
  const card = lab ? labCards(lab, sex)[0] ?? null : null;
  /** 검진표의 숫자가 입력칸으로 날아간다 */
  const fly = (k: SheetKey) => {
    const a = rows.current[k], b = field.current;
    if (!a || !b || reduced()) return;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const f = document.createElement('span');
    f.className = 'ls-fly'; f.textContent = a.textContent;
    f.style.left = ra.left + 'px'; f.style.top = ra.top + 'px';
    document.body.appendChild(f);
    f.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${rb.right - ra.right}px, ${rb.top - ra.top + (rb.height - ra.height) / 2}px) scale(1.5)`, opacity: 1 }],
      { duration: 650, easing: 'cubic-bezier(.3,.7,.2,1)' }).finished.then(() => f.remove());
  };
  const choose = (k: SheetKey) => { setKey(k); setVals((v) => ({ ...v, [k]: SHEET.find((r) => r.k === k)!.v })); fly(k); };
  // 처음 화면에 들어올 때 한 번 날려 보여 준다
  useEffect(() => {
    const el = root.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { fly('glu'); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el); return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section id={id} ref={root} className="ls-labs">
      <div className="ls-wrap ls-labs-grid">
        <div className="ls-labs-copy">
          <span className="ls-eyebrow">검진 수치</span>
          <h2 className="ls-h2">검진표 속 숫자,<br /><em>무슨 뜻일까요?</em></h2>
          <ol className="ls-steps">
            <li><b>1</b>숫자를 넣으면</li>
            <li><b>2</b>어느 구간인지 보여 주고</li>
            <li><b>3</b>뜻과 할 일을 알려 드려요</li>
          </ol>
          <a className="ls-btn" href="#/labs">검진 수치 확인하기 <ArrowRight size={18} /></a>
        </div>
        <div className="ls-sheet" role="group" aria-label="검진표 예시 (그림)">
          <div className="ls-sheet-head"><b>건강검진 결과</b><span>예시 그림</span></div>
          <div className="ls-sheet-meta"><span>검사 항목</span><span>결과</span></div>
          {SHEET.map((r) => {
            const on = r.k === key;
            return <div key={r.k} className="contents">
              {r.sec && <span className="ls-sheet-sec">{r.sec}</span>}
              <button type="button" className={cn('ls-sheet-row is-pick', on && 'is-on')} aria-pressed={on} onClick={() => choose(r.k)}>
                <span className="ls-sheet-name">{r.name}</span><span className="ls-sheet-v"><span ref={(e) => { rows.current[r.k] = e; }}>{r.v}</span><small>{r.unit}</small></span>
              </button>
            </div>;
          })}
          <span className="ls-sheet-hint">줄을 누르면 그 숫자를 풀어 드려요</span>
          <span className="ls-sheet-more">나머지 항목은 검진 풀이에서 볼 수 있어요</span>
        </div>
        <div className="ls-labs-try">
          <label className="ls-lab-input">
            <span>{key === 'bp' ? '혈압' : def?.label ?? row.name}<small>{key === 'bp' ? '높은 값/낮은 값' : def?.help}</small></span>
            <span className="ls-lab-field"><input ref={field} inputMode="decimal" value={vals[key]} aria-label={`${row.name} 예시 값`}
              onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.value.replace(key === 'bp' ? /[^0-9/]/g : /[^0-9.]/g, '') }))} /><small>{row.unit}</small></span>
          </label>
          {card ? <LabCardView key={key + card.zone} c={card} k={0} /> : <p className="ls-note">숫자를 넣어 보세요.</p>}
        </div>
      </div>
    </section>
  );
}

/* ───────── ⑤ 1분 동안: 실제 앱 화면이 시계와 함께 넘어간다 ───────── */
const FLOW = Object.fromEntries(Object.entries(import.meta.glob('../assets/landing/flow-*.webp', { eager: true, import: 'default' }) as Record<string, string>)
  .map(([k, v]) => [/flow-(\w+)\.webp$/.exec(k)![1], v]));
const STEPS = [
  { key: 'info', t: '몸 정보', d: '성별·나이·키·몸무게·허리둘레', from: 0, to: 0.22 },
  { key: 'life', t: '생활 질문', d: '담배·술·운동·가족력·혈압', from: 0.22, to: 0.74 },
  { key: 'result', t: '내 결과', d: '지금 내 상태, 또래 비교, 바꿔보기', from: 0.74, to: 1 },
];
export function MinuteScene({ id }: { id?: string }) {
  const root = useRef<HTMLElement>(null), clock = useRef<HTMLSpanElement>(null);
  const shots = useRef<(HTMLImageElement | null)[]>([]), bars = useRef<(HTMLElement | null)[]>([]), items = useRef<(HTMLLIElement | null)[]>([]);
  useScroll(root, (p, wide) => {
    const q = wide ? clamp((p - 0.06) / 0.86) : 1;
    if (clock.current) { const s = Math.round(q * 60); clock.current.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
    STEPS.forEach((st, k) => {
      const img = shots.current[k], bar = bars.current[k], li = items.current[k];
      const local = clamp((q - st.from) / (st.to - st.from));
      if (bar) bar.style.transform = `scaleX(${local})`;
      if (li) li.classList.toggle('is-on', q >= st.from && (q < st.to || k === STEPS.length - 1));
      if (!img) return;
      // 그 차례 동안 화면을 위에서 아래로 훑고, 다음 화면이 겹쳐 나타난다
      const box = img.parentElement!, over = Math.max(0, img.offsetHeight - box.offsetHeight);
      const show = k === 0 ? 1 : ease(clamp((q - st.from) / 0.05));
      img.style.opacity = String(wide ? show : k === STEPS.length - 1 ? 1 : 0);
      const reach = !wide || st.key === 'result' ? 0 : 1;   // 결과는 맨 위(지금 내 상태)를 그대로 보여 준다
      img.style.transform = `translateY(${-over * reach * ease(clamp((local - 0.12) / 0.8))}px)`;
    });
  });
  return (
    <section id={id} ref={root} className="ls-minute" aria-labelledby="ls-minute-title">
      <div className="ls-minute-stage ls-wrap">
        <div className="ls-minute-copy">
          <span className="ls-eyebrow">1분 체크</span>
          <h2 id="ls-minute-title" className="ls-h2">딱 1분,<br /><em>이렇게 지나가요</em></h2>
          <span className="ls-clock" ref={clock} aria-hidden>0:00</span>
          <ol className="ls-flow">
            {STEPS.map((st, k) => (
              <li key={st.key} ref={(e) => { items.current[k] = e; }}>
                <b>{st.t}</b><span>{st.d}</span><i><em ref={(e) => { bars.current[k] = e; }} /></i>
              </li>
            ))}
          </ol>
          <a className="ls-btn" href="#/start">1분 건강 체크하기 <ArrowRight size={18} /></a>
        </div>
        <div className="ls-phone" aria-hidden>
          <div className="ls-phone-screen">
            {STEPS.map((st, k) => <img key={st.key} ref={(e) => { shots.current[k] = e; }} src={FLOW[st.key]} alt="" loading="lazy" />)}
          </div>
        </div>
      </div>
    </section>
  );
}
