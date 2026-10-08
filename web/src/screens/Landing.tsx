// 랜딩: jeton.com 메인의 '붙잡힌 장면' 구조를 1분체크로 (docs/jeton-analysis-2026-10-08.md · docs/DESIGN.md)
// 화면이 고정된 채 스크롤 진행도(0–1)로 장면이 움직인다. 부드러운 스크롤은 Lenis, 움직임은 motion.
// 움직임 줄이기 설정이면 고정 없이 완성된 모습만 보여준다. 예시 숫자는 앱과 같은 함수로 계산한다.
import type React from 'react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Lenis from 'lenis';
import { motion, useScroll, useTransform, useReducedMotion, useMotionValue, useMotionValueEvent, type MotionValue } from 'motion/react';
import { ArrowRight, Check, FileText, Users, TrendingDown, MessageCircleQuestion, Play, Tv, MessageSquare, ClipboardList } from 'lucide-react';
import { useStore } from '../ui.tsx';
import { MiniTrial, loadMini, miniDraft, MINI_CTA } from './MiniTrial.tsx';
import { toInput, type AppInput } from '../state.ts';
import { ChangeCard } from './Results.tsx';
import { LabCardView } from './Labs.tsx';
import { peerCards, standing } from '../lib/peer.ts';
import { futureEffects } from '../lib/lines.ts';
import { labCards } from '../lib/labZones.ts';
import { PRIVACY_LINE } from '../lib/share.ts';
import { NOT_DIAGNOSIS } from '../lib/content.ts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Dots } from '@/components/viz';
import { cn } from '@/lib/utils';

// ── 이미지 (src/assets/landing/ 에 넣으면 그걸 쓰고, 없으면 자리 표시) ──
const ART = import.meta.glob('../assets/landing/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' }) as Record<string, string>;
const art = (name: string) => Object.entries(ART).find(([k]) => k.includes(`/${name}.`))?.[1];

// ── 예시 (영상과 같은 장면). 52세 남성 · 172cm · 82kg · 허리 92cm · 혈압 정상 · 운동 안 함 ──
const EX: AppInput = { age: 52, sex: 'M', heightCm: 172, weightKg: 82, waistCm: 92, smoke: 'never', alcohol: 'lt1', famDM: false, dx: { htn: false, dm: false, chol: false }, bp: 'normal', exercise: false, meno: null };
const EX_PEER = peerCards(EX).find((c) => c.id === 'htn')!;
const EX_ST = EX_PEER.kind === 'rank' ? standing(EX_PEER.rank) : { n: 3, side: '위험' as const };
const EX_FX = futureEffects(EX, -4, -3).effects.find((e) => e.id === 'dm10')!;
const EX_LAB = labCards({ glu: 108 }, 'M')[0];
const FAQ = [
  ['검사 없이 건강 상태를 알 수 있나요?', `간단한 몸 정보와 생활습관으로 지금 건강을 가늠해 볼 수 있어요. 국가 건강통계와 한국인 연구로 계산한 예측이에요. ${NOT_DIAGNOSIS} 실제 질환 여부는 검사와 진료로 확인해요.`],
  ['입력한 정보는 저장되나요?', '입력한 건강정보는 서버로 보내지 않고 이 기기 안에서만 계산해요. 결과는 ‘기록 저장’을 눌렀을 때만 이 기기에 보관되고, 언제든 지울 수 있어요.'],
  ['‘100명 중 몇 번째’는 어떻게 계산하나요?', '국민건강영양조사(2022–2024)에서 나와 성별이 같고 나이가 ±5세인, 아직 진단받지 않은 사람들에게 같은 계산을 해 본 분포예요. 그 100명 안에서 위험한 쪽(또는 좋은 쪽)으로 몇 번째인지 보여드려요.'],
  ['몸무게나 허리를 바꾸면 왜 숫자가 계단처럼 바뀌나요?', '한국인 추적 연구의 점수표가 BMI 25·30, 허리 남 90·여 85cm 같은 기준선으로 점수를 매기기 때문이에요. 그래서 기준선을 넘는지를 먼저 보여드려요. 기간도 연구 그대로(10년·4년) 써요.'],
  ['앱을 설치해야 하나요?', '설치 없이 웹에서 바로 쓸 수 있어요. 휴대폰 홈 화면에 추가하면 다음에 더 편하게 열 수 있어요.'],
];

/** 미니 체험 결과(탭 세션)를 구독: 없으면 null */
function useMini() {
  const [m, setM] = useState(loadMini);
  useEffect(() => { const on = () => setM(loadMini()); window.addEventListener('mini-change', on); return () => window.removeEventListener('mini-change', on); }, []);
  return m;
}
/** '체크 시작' 버튼. 미니에 넣은 값이 있으면 그 값을 가지고 이어서. 이미 결과가 있으면 결과로 */
function StartBtn({ kind, className, label, variant = 'default', size = 'lg' }: { kind: 'nav' | 'main' | 'text'; className?: string; label: string; variant?: 'default' | 'white' | 'outline' | 'brand'; size?: 'lg' | 'sm' | 'pill' }) {
  const m = useMini(), { setDraft, draft } = useStore();
  if (kind === 'text' && toInput(draft)) return <Button asChild variant={variant} size={size} className={className}><a href="#/result">내 결과 보기 <ArrowRight /></a></Button>;
  const set = !m ? null : m.tone != null ? MINI_CTA[m.tone] : MINI_CTA.partial;
  const text = !set ? label : set[kind === 'nav' ? 'nav' : 'main'];
  const go = (e: React.MouseEvent) => { if (!m) return; e.preventDefault(); setDraft((d) => ({ ...d, ...miniDraft(m) })); location.hash = '#/info'; };
  return <Button asChild variant={variant} size={size} className={cn('h-auto min-h-12 whitespace-normal text-center', className)}><a href="#/start" onClick={go}>{text} {kind !== 'nav' && <ArrowRight />}</a></Button>;
}

/** 붙잡힌 장면: 높이(h)만큼 스크롤하는 동안 화면을 고정하고, 진행도(0–1)를 넘긴다. 움직임 줄이기면 고정 없이 still 시점 */
/** 화면 폭 조건 (pcOnly 장면: 휴대폰에서는 고정하지 않는다) */
function useWide() {
  const q = '(min-width: 768px)', [w, setW] = useState(() => typeof matchMedia === 'undefined' || matchMedia(q).matches);
  useEffect(() => { const m = matchMedia(q), f = () => setW(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  return w;
}
function Pinned({ h, still = 1, className, inner, pcOnly, children }: { h: string; still?: number; className?: string; inner?: string; pcOnly?: boolean; children: (p: MotionValue<number>) => ReactNode }) {
  const ref = useRef<HTMLElement>(null), wide = useWide(), reduce = useReducedMotion() || (pcOnly && !wide);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  // 진행도를 한 번 거쳐서 쓴다: 스크롤에 바로 묶인 투명도는 브라우저 가속 경로로 넘어가 실제 스크롤을 따라오지 않는 경우가 있다
  const prog = useTransform(scrollYProgress, (v) => v);
  const fixed = useMotionValue(still);
  return (
    <section ref={ref} className={cn('relative', className)} style={{ height: reduce ? undefined : h }}>
      <div className={cn(reduce ? 'relative min-h-svh' : 'sticky top-0 h-svh', 'overflow-hidden', inner)}>{children(reduce ? fixed : prog)}</div>
    </section>
  );
}

// ── 결과 조각 (실제 앱 화면을 작게) ──
const Frag = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn('rounded-card bg-white p-4 text-ink shadow-float', className)}>{children}</div>;
const FRAGS: { x: number; y: number; fx: number; fy: number; w: string; body: ReactNode }[] = [
  { x: -62, y: -40, fx: -30, fy: -24, w: 'w-[220px]', body: <><Badge variant="warn">비만 전단계</Badge><b className="mt-2 block text-[26px] font-semibold">BMI 24.2</b><span className="text-caption text-ink-soft">표준 몸무게 55–67kg</span></> },
  { x: 60, y: -44, fx: 28, fy: -26, w: 'w-[250px]', body: <><span className="text-caption text-ink-soft">고혈압 · 100명 중</span><b className="block text-[26px] font-semibold text-risk">{EX_ST.n}번째로 {EX_ST.side}</b>{EX_PEER.kind === 'rank' && <Dots rank={EX_PEER.rank} hot tone="high" cols={20} />}</> },
  { x: -66, y: 34, fx: -28, fy: 22, w: 'w-[270px]', body: <div className="-m-4 rounded-card bg-brand p-4 text-white"><b className="text-body-sm font-semibold">만약 <span className="rounded-full bg-lime px-2 text-brand">허리 −3cm</span> 줄이면?</b><div className="mt-2 flex justify-between text-body-sm"><span className="text-white/80">10년 안에 당뇨</span><span><s className="mr-1.5 text-white/50">{EX_FX.before}</s><b className="font-semibold text-lime">{EX_FX.after}</b></span></div></div> },
  { x: 64, y: 40, fx: 30, fy: 24, w: 'w-[230px]', body: <><span className="text-caption text-ink-soft">공복혈당</span><b className="block text-[26px] font-semibold text-warn">108 <small className="text-body-sm font-normal">당뇨 전 단계</small></b><div className="mt-2 h-2 rounded-full bg-[linear-gradient(90deg,#bfeccd_0_33%,#f8e2a6_33%_66%,#fcc4cf_66%)]" /></> },
  { x: 0, y: -62, fx: -4, fy: -36, w: 'w-[200px]', body: <><Badge variant="good"><Check /> 잘하고 있어요</Badge><b className="mt-2 block text-body font-semibold">운동을 꾸준히 해요</b></> },
  { x: 4, y: 64, fx: 6, fy: 35, w: 'w-[210px]', body: <><span className="text-caption text-ink-soft">허리둘레</span><b className="block text-[26px] font-semibold">89cm <small className="text-body-sm font-normal text-good">기준 아래</small></b></> },
];
function FlyFrag({ f, p }: { f: (typeof FRAGS)[number]; p: MotionValue<number> }) {
  // 바깥에서 날아와 제목 둘레에 자리 잡고 그대로 머문다 (단위 vw·vh)
  const xv = useTransform(p, [0, 0.55], [f.x, f.fx]), yv = useTransform(p, [0, 0.55], [f.y, f.fy]);
  const x = useTransform(xv, (v) => `${v}vw`), y = useTransform(yv, (v) => `${v}vh`);
  const o = useTransform(p, [0, 0.3], [0, 1]);
  const s = useTransform(p, [0, 0.55], [0.85, 1]);
  return <motion.div style={{ x, y, opacity: o, scale: s }} className={cn('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:block', f.w)}><Frag>{f.body}</Frag></motion.div>;
}

/** 큰 낱말 하나: 자기 차례에 가운데 크게, 마지막엔 목록처럼 겹쳐 쌓인다 */
const WORDS = [
  { icon: Users, word: '또래 중 나', color: '#163300', sub: '같은 나이·성별 100명 중 몇 번째로 위험·좋음', href: '#peer' },
  { icon: TrendingDown, word: '줄이면?', color: '#477ee9', sub: '몸무게·허리를 끌면 앞으로의 위험이 바로 바뀌어요', href: '#change' },
  { icon: FileText, word: '검진 풀이', color: '#c98a12', sub: '결과지 숫자 하나하나를 쉬운 말로', href: '#labs' },
];
function Word({ w, i, p }: { w: (typeof WORDS)[number]; i: number; p: MotionValue<number> }) {
  const a = i * 0.24, b = a + 0.22;   // 내 차례 [a, b]
  const c = (v: number) => Math.max(0, Math.min(1, v));   // 스크롤 진행도는 0–1 밖을 쓸 수 없다
  const yv = useTransform(p, [c(a - 0.08), a + 0.04, b - 0.04, b + 0.04, 0.8, 0.92], [i ? 55 : 0, 0, 0, -55, -55, (i - 1) * 10]), y = useTransform(yv, (v) => `${v}vh`);
  const o = useTransform(p, [c(a - 0.06), a + 0.02, b - 0.02, b + 0.04, 0.8, 0.9], [i ? 0 : 1, 1, 1, 0, 0, 1]);
  const s = useTransform(p, [0.8, 0.92], [1, 0.62]);
  const so = useTransform(p, [a, a + 0.04, b - 0.04, b], [0, 1, 1, 0]);
  const Ic = w.icon;
  return (
    <motion.a href={w.href} style={{ y, opacity: o, scale: s }} className="kr-word absolute flex items-center gap-[0.3em] whitespace-nowrap no-underline" aria-label={w.word}>
      <span className="flex size-[0.9em] items-center justify-center rounded-[0.22em] text-white" style={{ background: w.color }}><Ic className="size-[0.55em]" /></span>
      <span style={{ color: w.color }}>{w.word}</span>
      <motion.span style={{ opacity: so }} className="kr-lead absolute top-full left-1/2 mt-4 -translate-x-1/2 whitespace-nowrap text-ink-soft">{w.sub}</motion.span>
    </motion.a>
  );
}

// ── 휴대폰과 단계별 화면 (실제 앱 화면을 축소) ──
function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative w-[290px] rounded-[46px] border-[9px] border-[#0b1a00] bg-white p-3 shadow-[0_40px_90px_rgba(10,40,0,.45)]', className)}>
      <i className="mx-auto mb-3 block h-6 w-24 rounded-full bg-[#0b1a00]" />
      <div className="flex h-[480px] flex-col gap-2.5 overflow-hidden text-left text-ink">{children}</div>
    </div>
  );
}
const MiniCard = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn('rounded-[14px] bg-white p-3 shadow-card', className)}>{children}</div>;
const SCREENS: { t: string; d: string; body: ReactNode }[] = [
  { t: '기본정보', d: '성별·나이·키·몸무게·허리', body: <><b className="text-[18px] font-semibold">몸에 대한 숫자부터<br />알려주세요</b><div className="grid grid-cols-2 gap-2">{[['만 나이', '52'], ['키', '172']].map(([k, v]) => <MiniCard key={k}><span className="text-[11px] text-ink-soft">{k}</span><b className="block text-[26px] font-semibold">{v}</b></MiniCard>)}</div><MiniCard className="flex justify-around"><span><span className="block text-[11px] text-ink-soft">몸무게</span><b className="text-[28px] font-semibold">82</b>kg</span><span><span className="block text-[11px] text-ink-soft">허리둘레</span><b className="text-[28px] font-semibold">92</b>cm</span></MiniCard><div className="flex items-center justify-between rounded-[14px] bg-brand p-3 text-white"><span className="text-[12px]">1단계 비만</span><b className="text-[22px] font-semibold">BMI 27.7</b></div></> },
  { t: '생활', d: '흡연·음주·운동·가족력·혈압', body: <><b className="text-[18px] font-semibold">요즘 생활은<br />어떠세요?</b>{[['담배를 피우나요?', ['안 피움', '예전에', '지금']], ['운동하나요?', ['네', '아니요']], ['최근 혈압은요?', ['모름', '정상', '높음']]].map(([q, o]) => <MiniCard key={q as string}><b className="text-[13px] font-semibold">{q as string}</b><div className="mt-2 flex gap-1.5">{(o as string[]).map((x, k) => <span key={x} className={cn('flex-1 rounded-lg py-2 text-center text-[12px]', k === 0 ? 'bg-ink text-white' : 'bg-sand-soft')}>{x}</span>)}</div></MiniCard>)}</> },
  { t: '결과', d: '지금 내 상태 한 줄과 할 일 하나', body: <><MiniCard className="border-t-4 border-risk-dot"><Badge variant="risk">병원 확인</Badge><b className="mt-2 block text-[20px] leading-tight font-semibold text-risk">혈압 확인이<br />필요해요</b><span className="mt-1 block text-[11px] text-ink-soft">고혈압 가능성이 같은 나이·성별 평균보다 높아요</span></MiniCard><MiniCard className="flex gap-2.5"><span className="flex size-6 items-center justify-center rounded-md bg-risk-dot text-[12px] text-white">1</span><span className="text-[13px] font-semibold">가까운 내과에서 혈압 진료를 받으세요</span></MiniCard></> },
  { t: '또래 중 나', d: '100명 중 몇 번째로 위험·좋음', body: <MiniCard><span className="text-[11px] text-ink-soft">고혈압 · 50대 남성 100명 중</span><b className="block text-[30px] leading-tight font-semibold text-risk">{EX_ST.n}번째로 {EX_ST.side}</b>{EX_PEER.kind === 'rank' && <Dots rank={EX_PEER.rank} hot tone="high" />}</MiniCard> },
  { t: '줄이면?', d: '몸무게·허리를 끌면 바로 바뀌어요', body: <div className="flex flex-col gap-2 rounded-[14px] bg-brand p-3 text-white"><b className="text-[15px] font-semibold">만약 <span className="rounded-full bg-lime px-2 text-brand">허리 −3cm</span> 줄이면?</b>{[['체형', '1단계 비만', '1단계 비만'], ['복부비만', '해당', '아님'], ['10년 안에 당뇨', EX_FX.before, EX_FX.after]].map(([k, b, a]) => <div key={k} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2.5 text-[12px]"><span className="text-white/80">{k}</span><span>{b !== a && <s className="mr-1.5 text-white/45">{b}</s>}<b className={cn('text-[17px] font-semibold', b !== a ? 'text-lime' : '')}>{a}</b></span></div>)}</div> },
];

function PhoneSteps({ p }: { p: MotionValue<number> }) {
  const [at, setAt] = useState(0);
  useMotionValueEvent(p, 'change', (v) => setAt(Math.min(SCREENS.length - 1, Math.max(0, Math.floor((v - 0.05) / 0.18)))));
  return (
    <div className="mx-auto grid h-full max-w-[1200px] items-center gap-10 px-6 md:grid-cols-[1fr_auto] md:px-12">
      <div className="flex flex-col gap-6 text-white">
        <h2 className="kr-h2">1분이면 끝나는<br /><span className="text-lime">다섯 걸음</span></h2>
        <ol className="flex flex-col gap-1">
          {SCREENS.map((s, k) => (
            <li key={s.t} className={cn('flex items-baseline gap-4 rounded-btn px-4 py-3 transition-colors duration-300', k === at ? 'bg-white/12' : 'opacity-55')}>
              <b className={cn('kr-h3 tabular-nums', k === at ? 'text-lime' : 'text-white')}>{String(k + 1).padStart(2, '0')}</b>
              <span><b className="kr-h3 block">{s.t}</b>{k === at && <span className="kr-lead text-white/80">{s.d}</span>}</span>
            </li>
          ))}
        </ol>
      </div>
      <PhoneFrame className="hidden md:block">
        <motion.div key={at} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex flex-col gap-2.5">{SCREENS[at].body}</motion.div>
      </PhoneFrame>
    </div>
  );
}

// ── 장면들 ──
/** 1 첫 화면: 꽉 찬 이미지 + 왼쪽 아래 제목 + 오른쪽 아래 설명·버튼. 아래 장면이 올라와 덮는다 */
function Hero() {
  const img = art('hero'), imgM = art('hero-m');
  return (
    <section className="sticky top-0 h-svh overflow-hidden bg-brand text-white">
      {img ? <picture><source media="(max-width: 767px)" srcSet={imgM ?? img} /><img src={img} alt="" className="absolute inset-0 size-full object-cover" /></picture>
        : <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_70%_at_78%_28%,#9fe870_0%,#4caf2a_28%,#1f5408_58%,#163300_100%)]" />}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1d00] via-[#0b1d00]/75 via-45% to-transparent to-75% md:bg-gradient-to-tr md:from-[#0d2200]/85 md:via-[#0d2200]/15 md:to-transparent" />
      <header className="absolute inset-x-0 top-0 z-10 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 md:px-10">
        <a href="#/" className="flex items-center gap-2 no-underline"><span className="flex size-8 items-center justify-center rounded-[10px] bg-lime"><i className="size-3 rounded-full bg-brand" /></span><b className="text-[21px] font-semibold text-white">1분체크</b></a>
        <div className="flex items-center gap-1"><a href="#/record" className="hidden rounded-full px-3 py-2 text-body-sm text-white/85 no-underline hover:bg-white/10 sm:block">지난 결과</a><StartBtn kind="nav" variant="white" size="sm" className="min-h-9 rounded-full px-4" label="시작하기" /></div>
      </header>
      <div className="absolute inset-x-0 bottom-0 mx-auto grid max-w-[1440px] gap-6 px-5 pb-24 md:grid-cols-[1.4fr_1fr] md:items-end md:px-10 md:pb-16">
        <h1 className="kr-display">내 몸이 궁금할 때<br /><span className="text-lime">딱 1분.</span></h1>
        <div className="flex flex-col gap-4 md:pb-2">
          <p className="kr-lead text-white/95">숫자 몇 개면 또래 100명 중 내 자리가 보여요. 몸무게·허리를 줄이면 어떻게 되는지도요.</p>
          <div className="flex flex-wrap gap-2.5">
            <StartBtn kind="main" label="1분 건강 체크하기" />
            <Button asChild variant="outline" size="lg" className="border-white/70 bg-transparent text-white hover:bg-white/10"><a href="#/labs"><FileText /> 검진 결과지 풀어보기</a></Button>
          </div>
          <span className="flex items-center gap-1.5 text-body-sm text-white/75"><Check className="size-4 text-lime" />설치·가입 없이 · {PRIVACY_LINE}</span>
        </div>
      </div>
    </section>
  );
}

/** 2 '숫자 몇 개면 충분해요' 붙잡고, 결과 조각이 바깥에서 모여든다 */
function Gather() {
  return (
    <Pinned h="220vh" still={1} className="z-10 rounded-t-[32px] bg-white" inner="rounded-t-[32px] bg-white">
      {(p) => <GatherInner p={p} />}
    </Pinned>
  );
}
function GatherInner({ p }: { p: MotionValue<number> }) {
  const ho = useTransform(p, [0, 0.15], [0.4, 1]), hs = useTransform(p, [0, 0.55], [0.9, 1]);
  const photo = art('photo');
  return (
    <div className="relative h-full">
      {FRAGS.map((f, k) => <FlyFrag key={k} f={f} p={p} />)}
      {photo && <PhotoFrag src={photo} p={p} />}
      <motion.h2 style={{ opacity: ho, scale: hs }} className="kr-h1 absolute inset-0 flex items-center justify-center text-center text-brand">숫자 몇 개면<br />충분해요</motion.h2>
    </div>
  );
}
function PhotoFrag({ src, p }: { src: string; p: MotionValue<number> }) {
  const xv = useTransform(p, [0, 0.55], [70, 38]), yv = useTransform(p, [0, 0.55], [-4, -1]), o = useTransform(p, [0, 0.3], [0, 1]);
  const x = useTransform(xv, (v) => `${v}vw`), y = useTransform(yv, (v) => `${v}vh`);
  return <motion.img src={src} alt="" style={{ x, y, opacity: o }} className="absolute top-1/2 left-1/2 hidden h-[200px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-card object-cover shadow-float md:block" />;
}

/** 3 큰 낱말 셋 */
function Words() {
  return (
    <Pinned h="320vh" still={0.95} className="z-10 bg-white" inner="flex items-center justify-center bg-white">
      {(p) => <div className="relative flex h-full w-full items-center justify-center">{WORDS.map((w, i) => <Word key={w.word} w={w} i={i} p={p} />)}</div>}
    </Pinned>
  );
}

/** 4 초록이 아래에서 차오르며 '숫자 4개' → '10초면' + 미니 체험 */
function GreenRise() {
  return (
    <Pinned h="200vh" still={1} pcOnly className="z-10 bg-white" inner="bg-white">
      {(p) => <GreenRiseInner p={p} />}
    </Pinned>
  );
}
function GreenRiseInner({ p }: { p: MotionValue<number> }) {
  const cv = useTransform(p, [0, 0.35], [100, 0]), clip = useTransform(cv, (v) => `inset(${v}% 0% 0% 0% round ${Math.min(32, v)}px)`);
  const t1 = useTransform(p, [0.25, 0.4, 0.55, 0.62], [0, 1, 1, 0]), t2 = useTransform(p, [0.6, 0.72], [0, 1]);
  const card = useTransform(p, [0.62, 0.8], [60, 0]), co = useTransform(p, [0.62, 0.78], [0, 1]);
  return (
    <motion.div id="try" style={{ clipPath: clip }} className="h-full min-h-svh bg-brand text-white">
      <div className="mx-auto grid h-full min-h-svh max-w-[1200px] items-center gap-8 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:px-12 md:py-0">
        <div className="relative h-[2.5em] kr-h1">
          <motion.h2 style={{ opacity: t1 }} className="absolute inset-0">숫자 4개면<br />충분해요</motion.h2>
          <motion.h2 style={{ opacity: t2 }} className="absolute inset-0"><span className="text-lime">10초면</span><br />먼저 볼 수 있어요</motion.h2>
        </div>
        <motion.div style={{ y: card, opacity: co }}><MiniTrial /></motion.div>
      </div>
    </motion.div>
  );
}

/** 5 휴대폰 + 01–05 단계 (초록 바탕 그대로 이어진다) */
function Steps() {
  return <Pinned h="320vh" still={0.6} className="z-10 bg-brand" inner="bg-brand">{(p) => <PhoneSteps p={p} />}</Pinned>;
}

/** 6 원형 터널이 커지며 휴대폰(결과 카드 3장)이 떠오른다 */
function Tunnel() {
  return <Pinned h="240vh" still={0.85} className="z-10 bg-white" inner="bg-[#0f2a1c]">{(p) => <TunnelInner p={p} />}</Pinned>;
}
function TunnelInner({ p }: { p: MotionValue<number> }) {
  const ring = art('ring');
  // 원형 터널은 커지면서 사라지고(밝은 가운데가 글자를 덮지 않게), 진초록 바탕 위에 휴대폰과 글이 남는다
  const rs = useTransform(p, [0, 0.6], [0.7, 2.6]), ro = useTransform(p, [0.35, 0.6], [1, 0]);
  const ps = useTransform(p, [0.2, 0.6], [0.5, 1]), po = useTransform(p, [0.2, 0.4], [0, 1]), py = useTransform(p, [0.2, 0.6], [160, 0]);
  const to = useTransform(p, [0.55, 0.72], [0, 1]), tx = useTransform(p, [0.55, 0.72], [-40, 0]);
  return (
    <div className="relative h-full overflow-hidden text-white">
      <motion.div style={{ scale: rs, opacity: ro }} className="absolute top-1/2 left-1/2 size-[min(120vw,1100px)] -translate-x-1/2 -translate-y-1/2">
        {ring ? <img src={ring} alt="" className="size-full rounded-full object-cover" />
          : <div aria-hidden className="size-full rounded-full bg-[repeating-radial-gradient(circle_at_center,#163300_0_22px,#2f6b12_22px_30px,#9fe870_30px_33px,#163300_33px_44px)] [mask-image:radial-gradient(circle,transparent_0_18%,#000_19%)]" />}
      </motion.div>
      <div className="relative mx-auto grid h-full max-w-[1200px] items-center gap-8 px-6 md:grid-cols-2 md:px-12">
        <motion.div style={{ opacity: to, x: tx }} className="flex flex-col gap-5">
          <h2 className="kr-h2">내 결과,<br /><span className="text-lime">카드 3장으로.</span></h2>
          <p className="kr-lead text-white/85">지금 내 상태 한 줄 · 또래 100명 중 내 자리 · 줄이면 어떻게 되는지. 길게 읽지 않아도 돼요.</p>
          <StartBtn kind="text" className="self-start" label="1분 건강 체크하기" />
        </motion.div>
        <motion.div style={{ scale: ps, opacity: po, y: py }} className="hidden justify-center md:flex"><PhoneFrame>{SCREENS[2].body}{SCREENS[3].body}</PhoneFrame></motion.div>
      </div>
    </div>
  );
}

/** 7 '확인.' 문장 + 3D 오브젝트 + 실제 '이대로면 vs 바꾸면' (직접 끌어볼 수 있다) */
function Check3() {
  const obj = art('object'), ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const s = useTransform(scrollYProgress, (v) => 0.7 + 0.3 * v);
  return (
    <section id="change" className="relative z-10 scroll-mt-10 bg-white px-5 py-28 md:py-40">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-14 text-center">
        <h2 className="kr-h2 text-brand">또래 중 몇 번째? 확인.<br />허리를 줄이면 어떻게? 확인.<br />검진 숫자 뜻? 이것도 확인.</h2>
        {obj && <motion.img ref={ref as never} src={obj} alt="" style={{ scale: s }} className="w-[min(560px,80vw)]" />}
        {!obj && <div ref={ref} />}
        <div className="grid w-full items-start gap-10 text-left md:grid-cols-[1fr_440px] md:gap-16">
          <div className="flex flex-col gap-4 md:pt-6">
            <Badge variant="soft" className="self-start"><TrendingDown /> 이대로면 vs 바꾸면</Badge>
            <h3 className="kr-h2">직접 끌어 보세요</h3>
            <p className="kr-lead text-ink-soft">예시는 52세 남성이에요. 허리를 90cm 아래로 줄이는 순간, 10년 안에 당뇨가 생길 가능성이 {EX_FX.before}에서 {EX_FX.after}로 바뀌어요. 기간은 한국인 추적 연구 그대로예요.</p>
          </div>
          <ChangeCard inp={EX} />
        </div>
      </div>
    </section>
  );
}

/** 8 검진 풀이 */
function Labs() {
  return (
    <section id="labs" className="relative z-10 scroll-mt-10 bg-white px-5 pb-28 md:pb-40">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-5">
          <Badge variant="soft" className="self-start"><FileText /> 검진 풀이</Badge>
          <h2 className="kr-h2">검진 결과지,<br /><span className="text-brand">숫자만 있고 뜻은 모르겠다면</span></h2>
          <p className="kr-lead text-ink-soft">혈압·혈당·콜레스테롤·콩팥 수치를 넣으면 하나씩 ‘어느 구간인지 · 무슨 뜻인지 · 무엇을 하면 되는지’로 풀어 드려요.</p>
          <Button asChild variant="brand" size="lg" className="self-start"><a href="#/labs">결과지 풀어보기 <ArrowRight /></a></Button>
        </div>
        <div className="rounded-[28px] bg-blush p-6 md:p-10"><LabCardView c={EX_LAB} k={0} /></div>
      </div>
    </section>
  );
}

/** 9 100명 점이 가운데에서 흩어지며 '100명 중 나는 몇 번째?'가 드러난다 (jeton 의 국기 장면) */
const SCAT = Array.from({ length: 64 }, (_, k) => { const a = (k / 64) * Math.PI * 2 * 3.1, r = 30 + ((k * 37) % 60); return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.75, s: 26 + ((k * 13) % 34), c: ['#9fe870', '#34c771', '#163300', '#cdf5b2', '#477ee9', '#e0a526', '#fb2d54', '#bcffbb'][k % 8] }; });
function Scatter() {
  return <Pinned h="220vh" still={0.9} className="z-10 bg-white" inner="bg-white">{(p) => <ScatterInner p={p} />}</Pinned>;
}
function ScatterDot({ d, p }: { d: (typeof SCAT)[number]; p: MotionValue<number> }) {
  const xv = useTransform(p, [0.05, 0.6], [0, d.x]), yv = useTransform(p, [0.05, 0.6], [0, d.y]), sc = useTransform(p, [0.05, 0.3], [0.3, 1]);
  const x = useTransform(xv, (v) => `${v}vw`), y = useTransform(yv, (v) => `${v}vh`);
  return <motion.i aria-hidden style={{ x, y, scale: sc, width: d.s, height: d.s, background: d.c }} className="absolute top-1/2 left-1/2 -mt-4 -ml-4 block rounded-full" />;
}
function ScatterInner({ p }: { p: MotionValue<number> }) {
  const co = useTransform(p, [0.35, 0.6], [0, 1]), cs = useTransform(p, [0.35, 0.6], [0.85, 1]);
  return (
    <div id="peer" className="relative flex h-full items-center justify-center px-5">
      {SCAT.map((d, k) => <ScatterDot key={k} d={d} p={p} />)}
      <motion.div style={{ opacity: co, scale: cs }} className="relative flex w-full max-w-[560px] flex-col items-center gap-6 rounded-[32px] bg-white/85 px-5 py-8 text-center backdrop-blur-md md:px-10">
        <h2 className="kr-h2">100명 중,<br /><span className="text-brand">나는 몇 번째?</span></h2>
        <div className="w-full rounded-card bg-white p-6 text-left shadow-float">
          <span className="text-body-sm text-ink-soft">예시 · {EX_PEER.name} · {EX_PEER.group} 100명 중</span>
          <b className="block text-[clamp(30px,3vw,40px)] leading-tight font-semibold text-risk">{EX_ST.n}번째로 {EX_ST.side}</b>
          {EX_PEER.kind === 'rank' && <Dots rank={EX_PEER.rank} hot tone="high" />}
        </div>
        <StartBtn kind="text" variant="brand" label="내 자리 보기" />
      </motion.div>
    </div>
  );
}

/** 10 사진 위 유리 카드 (후기 대신 '이럴 때 써요') */
const SCENES: [typeof ClipboardList, string, string][] = [
  [ClipboardList, '검진 결과지를 받은 날', '숫자만 가득한 결과지, 하나씩 쉬운 말로 풀어 봐요.'],
  [Tv, 'TV 건강 프로를 보다가', '나도 해당될까 궁금할 때, 숫자 몇 개로 바로 가늠해요.'],
  [MessageSquare, '단톡방에 링크가 왔을 때', '설치·가입 없이 눌러서 1분이면 끝나요.'],
];
function UseCases() {
  const photo = art('photo'), ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, (v) => 120 - 240 * v);
  return (
    <section ref={ref} className="relative z-10 bg-white px-3 md:px-6">
      <div className="relative mx-auto flex min-h-[90vh] max-w-[1440px] items-end overflow-hidden rounded-[32px] bg-[#2b4a2a]">
        {photo ? <img src={photo} alt="" className="absolute inset-0 size-full object-cover" /> : <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_80%_at_30%_30%,#5e8c4f_0%,#2b4a2a_60%,#163300_100%)]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="relative grid w-full gap-6 p-6 md:grid-cols-[1fr_420px] md:items-end md:p-12">
          <h2 className="kr-h2 text-white">이럴 때<br />써요</h2>
          <motion.div style={{ y }} className="flex flex-col gap-3">
            {SCENES.map(([Ic, t, d]) => (
              <div key={t} className="flex gap-3 rounded-card bg-white/14 p-4 text-white backdrop-blur-xl">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-lime text-brand"><Ic className="size-5" /></span>
                <span><b className="block text-body font-semibold">{t}</b><span className="text-body-sm text-white/85">{d}</span></span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** 11 소개 영상 · 자주 묻는 질문 · 비스듬한 초록 띠 · 큰 글자 바닥글 */
function Closing() {
  const base = import.meta.env.BASE_URL, ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const wy = useTransform(scrollYProgress, (v) => `${30 - 30 * v}%`);
  return (
    <div className="relative z-10 bg-white">
      <section className="mx-auto grid max-w-[1200px] gap-8 px-5 py-28 md:grid-cols-[1fr_1.4fr] md:items-center md:gap-16 md:py-40">
        <div className="flex flex-col gap-4"><h2 className="kr-h2">45초로 보는<br />1분체크</h2><p className="kr-lead text-ink-soft">숫자 몇 개 넣고, 100명 중 내 자리를 보고, 줄이면 어떻게 되는지까지.</p></div>
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" aria-label="1분체크 소개 영상 45초 보기 (소리 있음)" className="group relative block aspect-video w-full cursor-pointer overflow-hidden rounded-[24px] bg-brand shadow-float">
              <img src={`${base}video/promo-poster.jpg`} alt="" loading="lazy" className="block size-full object-cover" />
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-4 pl-1.5 text-body-sm font-semibold text-ink shadow-card">
                <span className="flex size-9 items-center justify-center rounded-full bg-lime text-brand transition-transform group-hover:scale-105"><Play className="size-4" fill="currentColor" /></span>소개 영상 보기 · 소리 있음
              </span>
            </button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle className="sr-only">1분체크 소개 영상 45초</DialogTitle>
            <video className="block aspect-video w-full rounded-[20px] bg-black" src={`${base}video/promo-45s.mp4`} poster={`${base}video/promo-poster.jpg`} controls autoPlay playsInline preload="none" />
          </DialogContent>
        </Dialog>
      </section>

      <section id="faq" className="mx-auto grid max-w-[1200px] scroll-mt-10 gap-8 px-5 pb-28 md:grid-cols-[1fr_1.6fr] md:gap-16 md:pb-40">
        <h2 className="kr-h2">자주 묻는 질문</h2>
        <Accordion type="single" collapsible className="flex flex-col gap-3">
          {FAQ.map(([q, a]) => <AccordionItem key={q} value={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}
        </Accordion>
      </section>

      <section className="bg-brand pt-24 pb-28 text-center text-white [clip-path:polygon(0_10%,50%_0,100%_10%,100%_100%,0_100%)] md:pt-40 md:pb-36">
        <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-6 px-5">
          <h2 className="kr-display">1분이면,<br /><span className="text-lime">내 몸이 보여요.</span></h2>
          <p className="kr-lead text-white/85">몸 정보와 생활 질문 2쪽이면 끝나요.</p>
          <StartBtn kind="main" label="1분 건강 체크하기" />
        </div>
      </section>

      <footer ref={ref} className="overflow-hidden bg-white px-5 pt-14 pb-24 md:px-10">
        <div className="mx-auto grid max-w-[1440px] gap-8 md:grid-cols-4">
          <div className="flex flex-col gap-2 text-body-sm"><span className="text-caption text-ink-soft">시작</span><a href="#/start" className="text-ink no-underline">1분 건강 체크하기</a><a href="#/labs" className="text-ink no-underline">검진 풀이</a></div>
          <div className="flex flex-col gap-2 text-body-sm"><span className="text-caption text-ink-soft">내 기록</span><a href="#/record" className="text-ink no-underline">지난 결과 비교</a><a href="#/result" className="text-ink no-underline">내 결과</a></div>
          <div className="flex flex-col gap-2 text-body-sm"><span className="text-caption text-ink-soft">알아두기</span><a href="#faq" className="text-ink no-underline">자주 묻는 질문</a><a href="https://www.kdca.go.kr" target="_blank" rel="noreferrer" className="text-ink no-underline">질병관리청</a></div>
          <p className="text-caption text-ink-soft">1분체크는 국가 건강통계와 연구를 바탕으로 한 예측 서비스예요. {NOT_DIAGNOSIS} 질환 여부는 검사와 진료로 확인해 주세요. © 2026 1분체크</p>
        </div>
        <motion.div aria-hidden style={{ y: wy }} className="mx-auto mt-12 max-w-[1440px] select-none text-center text-[23vw] leading-[0.85] font-semibold text-brand">1분체크</motion.div>
      </footer>
    </div>
  );
}

/** 아래 가운데 떠 있는 메뉴 알약 + 오른쪽 아래 '자주 묻는 질문' (jeton 의 Menu · Support) */
function FloatingNav() {
  return (
    <>
      <nav aria-label="주요 메뉴" className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-nav bg-brand/95 p-1.5 pl-2 text-white shadow-float backdrop-blur">
        <a href="#/" aria-label="1분체크 처음으로" className="mr-1 flex size-9 items-center justify-center rounded-full bg-lime"><i className="size-3 rounded-full bg-brand" /></a>
        {[['#peer', '또래 중 나'], ['#change', '줄이면?'], ['#labs', '검진 풀이']].map(([h, t]) => <a key={h} href={h} className="hidden rounded-full px-3.5 py-2 text-body-sm font-medium text-white no-underline hover:bg-white/10 sm:block">{t}</a>)}
        <StartBtn kind="nav" size="sm" className="min-h-9 rounded-full px-4" label="1분 체크 시작" />
      </nav>
      <a href="#faq" className="fixed right-5 bottom-5 z-40 hidden items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-body-sm font-medium text-ink no-underline shadow-float backdrop-blur md:flex"><MessageCircleQuestion className="size-4 text-brand" />자주 묻는 질문</a>
    </>
  );
}

/** 부드러운 스크롤 (랜딩에서만). 앱 화면으로 가면 끈다 */
function useLenis() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    let raf = 0; const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, [reduce]);
}

export function Landing() {
  useLenis();
  return (
    <div className="bg-white text-ink">
      <FloatingNav />
      <div className="relative">
        <Hero />
        <Gather />
      </div>
      <Words />
      <GreenRise />
      <Steps />
      <Tunnel />
      <Check3 />
      <Labs />
      <Scatter />
      <UseCases />
      <Closing />
    </div>
  );
}
