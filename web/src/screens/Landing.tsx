// 랜딩 (jeton.com 메인 구성을 따라 · 1분체크 초록 · docs/DESIGN.md)
//  1 꽉 찬 첫 화면(입체 원반 + 왼쪽 아래 큰 제목 + 오른쪽 아래 버튼) · 아래 가운데 떠 있는 메뉴 알약
//  2 가운데 큰 문장 + 둘레에 떠다니는 작은 결과 카드  3 큰 낱말 세 개(또래 중 나 · 줄이면? · 검진 풀이)
//  4 진초록 꽉 찬 띠(미니 체험 + 01–05 단계)  5 휴대폰 화면  6 가운데 질문 문장 + 줄이면 예시
//  7 검진 풀이  8 100명 점 + 떠다니는 원  9 소개 영상  10 자주 묻는 질문  11 마지막 큰 문장 · 큰 글자 바닥글
// 예시 숫자는 모두 앱과 같은 함수(lines.ts·peer.ts·labZones.ts)로 계산한다.
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowDown, Check, FileText, Users, TrendingDown, Play, MessageCircleQuestion, Lock, Smartphone, BarChart3, LineChart } from 'lucide-react';
import { useStore } from '../ui.tsx';
import { MiniTrial, loadMini, miniDraft, MINI_CTA } from './MiniTrial.tsx';
import { toInput, type AppInput } from '../state.ts';
import { LineBar } from './Results.tsx';
import { LabCardView } from './Labs.tsx';
import { peerCards, standing } from '../lib/peer.ts';
import { bmiGauge, waistGauge, futureEffects } from '../lib/lines.ts';
import { labCards } from '../lib/labZones.ts';
import { PRIVACY_LINE } from '../lib/share.ts';
import { NOT_DIAGNOSIS } from '../lib/content.ts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Dots } from '@/components/viz';
import { cn } from '@/lib/utils';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 미니 체험 결과(탭 세션)를 구독: 없으면 null */
function useMini() {
  const [m, setM] = useState(loadMini);
  useEffect(() => { const on = () => setM(loadMini()); window.addEventListener('mini-change', on); return () => window.removeEventListener('mini-change', on); }, []);
  return m;
}
/** '체크 시작' 버튼. 미니에 넣은 값이 있으면 그 값을 가지고 이어서(문구도 미니 결과 단계에 맞춤). 이미 결과가 있으면 결과로 */
function StartBtn({ kind, className, label, variant = 'default', size = 'lg' }: { kind: 'nav' | 'main' | 'text'; className?: string; label: string; variant?: 'default' | 'white' | 'outline' | 'brand'; size?: 'lg' | 'sm' | 'pill' }) {
  const m = useMini(), { setDraft, draft } = useStore();
  if (kind === 'text' && toInput(draft)) return <Button asChild variant={variant} size={size} className={className}><a href="#/result">내 결과 보기 <ArrowRight /></a></Button>;
  const set = !m ? null : m.tone != null ? MINI_CTA[m.tone] : MINI_CTA.partial;
  const text = !set ? label : set[kind === 'nav' ? 'nav' : 'main'];
  const go = (e: React.MouseEvent) => { if (!m) return; e.preventDefault(); setDraft((d) => ({ ...d, ...miniDraft(m) })); location.hash = '#/info'; };
  return <Button asChild variant={variant} size={size} className={cn('h-auto min-h-12 whitespace-normal text-center', className)}><a href="#/start" onClick={go}>{text} {kind !== 'nav' && <ArrowRight />}</a></Button>;
}

/** 화면에 들어오면 한 번 true (나타나는 움직임용) */
function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null), [on, setOn] = useState(reduced());
  useEffect(() => {
    const el = ref.current; if (!el || on || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold });
    io.observe(el); return () => io.disconnect();
  }, [on, threshold]);
  return [ref, on] as const;
}
/** 요소가 화면을 지나가는 정도(-1 ~ 1): 떠다니는 카드의 시차 움직임 */
function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null), [p, setP] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    let raf = 0;
    const f = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const r = ref.current?.getBoundingClientRect(); if (r) setP(Math.max(-1, Math.min(1, (innerHeight / 2 - (r.top + r.height / 2)) / innerHeight))); }); };
    f(); addEventListener('scroll', f, { passive: true }); return () => { removeEventListener('scroll', f); cancelAnimationFrame(raf); };
  }, []);
  return [ref, p] as const;
}

// ── 예시 (영상과 같은 장면). 52세 남성 · 172cm · 82kg · 허리 92cm · 혈압 정상 · 운동 안 함 ──
const EX: AppInput = { age: 52, sex: 'M', heightCm: 172, weightKg: 82, waistCm: 92, smoke: 'never', alcohol: 'lt1', famDM: false, dx: { htn: false, dm: false, chol: false }, bp: 'normal', exercise: false, meno: null };
const EX_PEER = peerCards(EX).find((c) => c.id === 'htn')!;
const EX_ST = EX_PEER.kind === 'rank' ? standing(EX_PEER.rank) : null;
const EX_DW = -4, EX_DWA = -3;
const EX_FX = futureEffects(EX, EX_DW, EX_DWA).effects.find((e) => e.id === 'dm10')!;
const EX_LAB = labCards({ glu: 108 }, 'M')[0];
const FAQ = [
  ['검사 없이 건강 상태를 알 수 있나요?', `간단한 몸 정보와 생활습관으로 지금 건강을 가늠해 볼 수 있어요. 국가 건강통계와 한국인 연구로 계산한 예측이에요. ${NOT_DIAGNOSIS} 실제 질환 여부는 검사와 진료로 확인해요.`],
  ['입력한 정보는 저장되나요?', '입력한 건강정보는 서버로 보내지 않고 이 기기 안에서만 계산해요. 결과는 ‘기록 저장’을 눌렀을 때만 이 기기에 보관되고, 언제든 지울 수 있어요.'],
  ['‘100명 중 몇 번째’는 어떻게 계산하나요?', '국민건강영양조사(2022–2024)에서 나와 성별이 같고 나이가 ±5세인, 아직 진단받지 않은 사람들에게 같은 계산을 해 본 분포예요. 그 100명 안에서 위험한 쪽(또는 좋은 쪽)으로 몇 번째인지 보여드려요.'],
  ['몸무게나 허리를 바꾸면 왜 숫자가 계단처럼 바뀌나요?', '한국인 추적 연구의 점수표가 BMI 25·30, 허리 남 90·여 85cm 같은 기준선으로 점수를 매기기 때문이에요. 그래서 기준선을 넘는지를 먼저 보여드려요. 기간도 연구 그대로(10년·4년) 써요.'],
  ['앱을 설치해야 하나요?', '설치 없이 웹에서 바로 쓸 수 있어요. 휴대폰 홈 화면에 추가하면 다음에 더 편하게 열 수 있어요.'],
];

/** 첫 화면의 입체 원반 더미 (jeton 첫 화면의 겹친 원반을 초록으로). 천천히 떠오른다 */
function Discs({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute [perspective:1400px]', className)} aria-hidden>
      {Array.from({ length: 11 }, (_, k) => (
        <i key={k} className="absolute left-0 block size-[min(52vw,620px)] rounded-full motion-safe:animate-[float_7s_ease-in-out_infinite]"
          style={{ top: `${k * 5.2}%`, transform: `rotateX(68deg) rotateZ(-24deg) translateX(${k * 2.2}%)`, animationDelay: `${-k * 0.45}s`,
            background: `radial-gradient(circle at 35% 30%, #e9ffd8 0%, #b8f38f ${18 + k}%, #6fcf45 ${46 + k}%, #2f7a12 100%)`,
            boxShadow: '0 -6px 0 rgba(255,255,255,.55) inset, 0 30px 60px rgba(10,40,0,.35)' }} />
      ))}
    </div>
  );
}

/** 아래 가운데 떠 있는 메뉴 알약 + 오른쪽 아래 '자주 묻는 질문' (jeton 의 Menu · Support) */
function FloatingNav() {
  return (
    <>
      <nav aria-label="주요 메뉴" className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-nav bg-brand p-1.5 pl-2 text-white shadow-float">
        <a href="#/" aria-label="1분체크 처음으로" className="mr-1 flex size-9 items-center justify-center rounded-full bg-lime"><i className="size-3 rounded-full bg-brand" /></a>
        {[['#peer', '또래 중 나'], ['#change', '줄이면?'], ['#labs', '검진 풀이']].map(([h, t]) => <a key={h} href={h} className="hidden rounded-full px-3.5 py-2 text-body-sm text-white no-underline hover:bg-white/10 sm:block">{t}</a>)}
        <StartBtn kind="nav" size="sm" className="min-h-9 rounded-full px-4" label="1분 체크 시작" />
      </nav>
      <a href="#faq" className="fixed right-5 bottom-5 z-40 hidden items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-body-sm text-ink no-underline shadow-float backdrop-blur md:flex"><MessageCircleQuestion className="size-4 text-brand" />자주 묻는 질문</a>
    </>
  );
}

/** 2 가운데 큰 문장 + 둘레에 떠다니는 결과 조각 */
function FloatingCards() {
  const [ref, p] = useScrollProgress<HTMLElement>();
  const chips: [string, React.ReactNode, number][] = [
    ['left-[4%] top-[12%]', <><Badge variant="warn">비만 전단계</Badge><b className="mt-1 block text-subheading font-medium">BMI 24.2</b></>, -60],
    ['right-[6%] top-[8%]', <><span className="text-caption text-ink-soft">고혈압 · 100명 중</span><b className="block text-subheading font-medium text-risk">{EX_ST ? `${EX_ST.n}번째로 ${EX_ST.side}` : ''}</b></>, -90],
    ['left-[10%] bottom-[10%]', <><span className="text-caption text-ink-soft">10년 안에 당뇨</span><b className="block text-subheading font-medium"><s className="mr-1.5 text-body text-ash">{EX_FX.before}</s><span className="text-good">{EX_FX.after}</span></b></>, 70],
    ['right-[8%] bottom-[14%]', <><span className="text-caption text-ink-soft">공복혈당 108</span><b className="block text-subheading font-medium text-warn">당뇨 전 단계</b></>, 50],
  ];
  return (
    <section ref={ref} className="relative mx-auto flex min-h-[80vh] max-w-[1280px] items-center justify-center overflow-hidden px-5 py-24">
      {chips.map(([pos, body, k], i) => (
        <div key={i} className={cn('absolute hidden rounded-card bg-white px-4 py-3 shadow-float md:block', pos)} style={{ transform: `translateY(${p * k}px)` }}>{body}</div>
      ))}
      <h2 className="text-center text-[56px] leading-[0.95] font-medium text-brand md:text-[120px]">숫자 몇 개면<br />충분해요</h2>
    </section>
  );
}

/** 3 큰 낱말 하나 (화면에 들어오면 떠오른다) */
function BigWord({ icon: Ic, word, color, href, sub }: { icon: typeof Users; word: string; color: string; href: string; sub: string }) {
  const [ref, on] = useInView<HTMLAnchorElement>(0.5);
  return (
    <a ref={ref} href={href} className={cn('group flex min-h-[46vh] flex-col items-center justify-center gap-3 text-center no-underline transition-all duration-700', on ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0')}>
      <span className="flex items-center gap-4 text-[56px] leading-none font-medium md:text-[104px]" style={{ color }}>
        <span className="flex size-12 items-center justify-center rounded-[14px] text-white md:size-20 md:rounded-[22px]" style={{ background: color }}><Ic className="size-7 md:size-11" /></span>{word}
      </span>
      <span className="text-body text-ink-soft md:text-subheading">{sub}</span>
    </a>
  );
}

/** 4 진초록 띠의 01–05 단계 (자동으로 넘어가고, 누르면 그 단계) */
const STEPS = [['기본정보', '성별·나이·키·몸무게·허리'], ['생활', '흡연·음주·운동·가족력·혈압'], ['결과', '지금 내 상태 한 줄과 할 일 하나'], ['또래 중 나', '100명 중 몇 번째로 위험·좋음'], ['줄이면?', '몸무게·허리를 끌면 바로 바뀌어요']];
function Steps() {
  const [at, setAt] = useState(0);
  useEffect(() => { if (reduced()) return; const t = setInterval(() => setAt((x) => (x + 1) % STEPS.length), 2600); return () => clearInterval(t); }, []);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {STEPS.map(([t], k) => (
          <button key={t} type="button" onClick={() => setAt(k)} className={cn('flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-body-sm transition-colors', k === at ? 'bg-lime text-brand' : 'bg-white/10 text-white/80 hover:bg-white/15')}>
            <b className="font-medium">{String(k + 1).padStart(2, '0')}</b>{t}
          </button>
        ))}
      </div>
      <p key={at} className="text-subheading text-white animate-rise">{STEPS[at][1]}</p>
    </div>
  );
}

/** 5 휴대폰 화면 (결과 카드 모양을 그대로 축소) */
function Phone() {
  return (
    <div className="relative mx-auto w-[300px] rounded-[48px] border-[10px] border-[#0b1a00] bg-white p-3 shadow-[0_40px_80px_rgba(10,40,0,.45)]">
      <i className="mx-auto mb-3 block h-6 w-24 rounded-full bg-[#0b1a00]" />
      <div className="flex flex-col gap-2.5 text-left">
        <div className="rounded-[14px] border-t-4 border-risk-dot bg-white p-3 shadow-card"><Badge variant="risk">병원 확인</Badge><b className="mt-1.5 block text-[17px] leading-tight font-medium text-risk">혈압 확인이 필요해요</b><span className="text-[11px] text-ink-soft">고혈압 가능성이 같은 나이·성별 평균보다 높아요</span></div>
        <div className="rounded-[14px] bg-white p-3 shadow-card"><span className="text-[11px] text-ink-soft">고혈압 · 100명 중</span><b className="block text-[22px] leading-tight font-medium text-risk">{EX_ST ? `${EX_ST.n}번째로 ${EX_ST.side}` : ''}</b>{EX_PEER.kind === 'rank' && <Dots rank={EX_PEER.rank} hot tone="high" />}</div>
        <div className="rounded-[14px] bg-brand p-3 text-white"><b className="text-body-sm font-medium">만약 <span className="rounded-full bg-lime px-2 text-brand">허리 −3cm</span> 줄이면?</b><div className="mt-1.5 flex justify-between text-body-sm"><span className="text-white/80">10년 안에 당뇨</span><span><s className="mr-1 text-white/50">{EX_FX.before}</s><b className="font-medium text-lime">{EX_FX.after}</b></span></div></div>
      </div>
    </div>
  );
}

/** '줄이면?' 예시: 이대로면 ↔ 바꾸면을 번갈아 보여준다(움직임 줄이기면 바꾼 뒤 그대로) */
function ChangeDemo() {
  const [on, setOn] = useState(reduced());
  useEffect(() => { if (reduced()) return; const t = setInterval(() => setOn((x) => !x), 2600); return () => clearInterval(t); }, []);
  const wg = waistGauge(EX, on ? EX_DWA : 0)!, bg = bmiGauge(EX, on ? EX_DW : 0);
  return (
    <Card className="flex w-full max-w-[460px] flex-col gap-4 p-6 text-left">
      <div className="flex items-center justify-between gap-2">
        <b className="text-body font-medium"><span className="mr-1.5 text-caption text-ink-soft">예시</span>52세 남성</b>
        <Badge variant={on ? 'lime' : 'muted'} className="transition-colors">{on ? `허리 ${EX_DWA}cm · 체중 ${EX_DW}kg` : '이대로면'}</Badge>
      </div>
      <LineBar g={wg} changed={on} />
      <LineBar g={bg} changed={on} />
      <div className={cn('rounded-btn px-4 py-3.5 transition-colors', on ? 'bg-brand text-white' : 'bg-sand-soft')}>
        <b className="text-body-sm font-medium">10년 안에 당뇨가 생길 가능성</b>
        <div className="mt-0.5 text-body">{on ? <><s className="mr-1.5 opacity-60">{EX_FX.before}</s><b className="text-subheading font-medium text-lime">{EX_FX.after}</b></> : <b className="text-subheading font-medium">{EX_FX.before}</b>}</div>
      </div>
    </Card>
  );
}

/** 8 100명 점 + 둘레에 떠다니는 원 (jeton 의 국기 원들 자리) */
function FloatingDots() {
  const [ref, p] = useScrollProgress<HTMLElement>();
  const C = ['#9fe870', '#34c771', '#477ee9', '#e0a526', '#fb2d54', '#cdf5b2', '#163300', '#bcffbb'];
  const dots = Array.from({ length: 26 }, (_, k) => ({ x: (k * 37) % 100, y: (k * 53) % 100, s: 28 + ((k * 13) % 46), c: C[k % C.length], d: ((k % 5) - 2) * 40 }));
  return (
    <section ref={ref} id="peer" className="relative scroll-mt-10 overflow-hidden px-5 py-24 md:py-36">
      {dots.map((d, k) => <i key={k} aria-hidden className="absolute hidden rounded-full opacity-90 md:block" style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.s, height: d.s, background: d.c, transform: `translateY(${p * d.d}px)` }} />)}
      <div className="relative mx-auto flex max-w-[560px] flex-col items-center gap-6 text-center">
        <Badge variant="soft"><Users /> 또래 100명 중 나</Badge>
        <h2 className="text-[44px] leading-[1.02] font-medium md:text-heading-lg">100명 중,<br /><span className="text-brand">나는 몇 번째?</span></h2>
        <Card className="flex w-full flex-col gap-3 p-6 text-left">
          <span className="text-body-sm text-ink-soft">예시 · {EX_PEER.name} · {EX_PEER.group} 100명 중</span>
          <b className="text-heading font-medium text-risk">{EX_ST ? `${EX_ST.n}번째로 ${EX_ST.side}` : ''}</b>
          {EX_PEER.kind === 'rank' && <Dots rank={EX_PEER.rank} hot tone="high" />}
          <div className="flex justify-between text-[11px] text-ink-soft"><span>좋은 사람</span><span>위험한 사람</span></div>
        </Card>
        <StartBtn kind="text" variant="brand" label="내 자리 보기" />
      </div>
    </section>
  );
}

/** 9 소개 영상 (jeton 의 '고객 후기' 자리: 꽉 찬 그림 위 유리 카드) */
function VideoBand() {
  const base = import.meta.env.BASE_URL;
  return (
    <section className="px-3 md:px-6">
      <div className="relative mx-auto flex min-h-[70vh] max-w-[1280px] items-end overflow-hidden rounded-[32px] bg-brand p-6 md:p-12">
        <img src={`${base}video/promo-poster.jpg`} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand via-brand/40 to-transparent" />
        <div className="relative flex w-full flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <h2 className="text-[40px] leading-[1.02] font-medium text-white md:text-heading-lg">45초로 보는<br />1분체크</h2>
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="flex max-w-[380px] cursor-pointer items-center gap-4 rounded-card bg-white/15 p-4 text-left text-white backdrop-blur-xl">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-lime text-brand"><Play className="size-6" fill="currentColor" /></span>
                <span><b className="block text-body font-medium">소개 영상 보기</b><span className="text-body-sm text-white/80">숫자 몇 개 넣고, 100명 중 내 자리, 줄이면 어떻게 되는지까지 · 소리 있음</span></span>
              </button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogTitle className="sr-only">1분체크 소개 영상 45초</DialogTitle>
              <video className="block aspect-video w-full rounded-[20px] bg-black" src={`${base}video/promo-45s.mp4`} poster={`${base}video/promo-poster.jpg`} controls autoPlay playsInline preload="none" />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
}

export function Landing() {
  return (
    <div className="bg-white text-ink">
      <style>{'@keyframes float{0%,100%{translate:0 0}50%{translate:0 -14px}}'}</style>
      <FloatingNav />

      {/* 1 꽉 찬 첫 화면 */}
      <section className="relative flex min-h-[100svh] overflow-hidden bg-[radial-gradient(130%_100%_at_80%_0%,#3d8f1c_0%,#1f5408_45%,#163300_100%)] text-white">
        <Discs className="top-[-4%] right-[-38%] h-[46%] w-[95%] opacity-80 md:top-[-6%] md:right-[-4%] md:h-full md:w-[55%] md:opacity-100" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f2600]/85 via-transparent to-transparent" />
        <header className="absolute inset-x-0 top-0 z-10 mx-auto flex max-w-[1280px] items-center justify-between px-5 py-5 md:px-8">
          <a href="#/" className="flex items-center gap-2 no-underline"><span className="flex size-8 items-center justify-center rounded-[10px] bg-lime"><i className="size-3 rounded-full bg-brand" /></span><b className="text-[22px] font-medium text-white">1분체크</b></a>
          <div className="flex items-center gap-2"><a href="#/record" className="hidden px-3 text-body-sm text-white/85 no-underline sm:block">지난 결과</a><StartBtn kind="nav" variant="white" size="sm" className="min-h-9 rounded-full px-4" label="시작하기" /></div>
        </header>
        <div className="relative mx-auto mt-auto grid w-full max-w-[1280px] gap-8 px-5 pt-32 pb-28 md:grid-cols-[1.5fr_1fr] md:items-end md:px-8 md:pb-24">
          <h1 className="text-[64px] leading-[0.92] font-medium md:text-[clamp(88px,9vw,140px)]">내 몸이<br />궁금할 때<br /><span className="text-lime">딱 1분.</span></h1>
          <div className="flex flex-col gap-4 md:pb-3">
            <p className="text-subheading text-white/95">숫자 몇 개면 또래 100명 중 내 자리가 보여요. 몸무게·허리를 줄이면 어떻게 되는지도요.</p>
            <div className="flex flex-wrap gap-2.5">
              <StartBtn kind="main" label="1분 건강 체크하기" />
              <Button asChild variant="outline" size="lg" className="border-white/70 bg-transparent text-white hover:bg-white/10"><a href="#/labs"><FileText /> 검진 결과지 풀어보기</a></Button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-white/80">{['설치·가입 없이', PRIVACY_LINE].map((t) => <span key={t} className="inline-flex items-center gap-1.5"><Check className="size-4 text-lime" />{t}</span>)}</div>
          </div>
        </div>
        <span className="absolute bottom-7 left-5 hidden items-center gap-1.5 text-caption text-white/70 md:left-8 md:flex"><ArrowDown className="size-4 motion-safe:animate-bounce" />아래로</span>
      </section>

      {/* 2 큰 문장 + 떠다니는 조각 */}
      <FloatingCards />

      {/* 3 큰 낱말 세 개 */}
      <section className="mx-auto max-w-[1280px] px-5">
        <BigWord icon={Users} word="또래 중 나" color="#163300" href="#peer" sub="같은 나이·성별 100명 중 몇 번째로 위험·좋음" />
        <BigWord icon={TrendingDown} word="줄이면?" color="#477ee9" href="#change" sub="몸무게·허리를 끌면 앞으로의 위험이 바로 바뀌어요" />
        <BigWord icon={FileText} word="검진 풀이" color="#e0a526" href="#labs" sub="결과지 숫자 하나하나를 쉬운 말로" />
      </section>

      {/* 4 진초록 꽉 찬 띠: 직접 해보기 + 단계 */}
      <section id="try" className="scroll-mt-6 px-3 md:px-6">
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 rounded-[32px] bg-brand px-6 py-14 text-white md:grid-cols-[1.1fr_1fr] md:gap-16 md:px-14 md:py-24">
          <div className="flex flex-col gap-8">
            <h2 className="text-[48px] leading-[0.98] font-medium md:text-[88px]">숫자 4개,<br /><span className="text-lime">10초면</span></h2>
            <Steps />
            <div className="grid grid-cols-2 gap-4 text-body-sm text-white/85">
              {([[Smartphone, '설치·가입 없이 바로'], [Lock, '건강정보는 기기 안에서만'], [BarChart3, '국가 건강통계로 비교'], [LineChart, '한국인 추적 연구 점수표']] as const).map(([Ic, t]) => <span key={t} className="flex items-center gap-2"><Ic className="size-5 shrink-0 text-lime" />{t}</span>)}
            </div>
          </div>
          <MiniTrial />
        </div>
      </section>

      {/* 5 휴대폰 화면 */}
      <section className="px-3 pt-6 md:px-6">
        <div className="relative mx-auto grid max-w-[1280px] items-center gap-10 overflow-hidden rounded-[32px] bg-[radial-gradient(90%_120%_at_20%_100%,#0f6b5a_0%,#13423a_45%,#0e2a1f_100%)] px-6 py-14 text-white md:grid-cols-2 md:px-14 md:py-20">
          <Discs className="top-[30%] left-[-30%] h-full w-[90%] opacity-50" />
          <div className="relative flex flex-col gap-5">
            <h2 className="text-[44px] leading-[1.0] font-medium md:text-heading-lg">내 결과,<br />카드 3장으로.</h2>
            <p className="text-[18px] text-white/85">지금 내 상태 한 줄 · 또래 100명 중 내 자리 · 줄이면 어떻게 되는지. 길게 읽지 않아도 돼요.</p>
            <StartBtn kind="text" className="self-start" label="1분 건강 체크하기" />
          </div>
          <div className="relative"><Phone /></div>
        </div>
      </section>

      {/* 6 가운데 질문 문장 + 줄이면 예시 */}
      <section id="change" className="mx-auto flex max-w-[1280px] scroll-mt-10 flex-col items-center gap-12 px-5 py-24 text-center md:py-36">
        <Badge variant="soft"><TrendingDown /> 이대로면 vs 바꾸면</Badge>
        <h2 className="text-[30px] leading-[1.15] font-medium text-brand md:text-heading">또래 중 몇 번째? 확인.<br />허리를 줄이면 어떻게? 확인.<br />검진 숫자 뜻? 이것도 확인.</h2>
        <ChangeDemo />
        <p className="max-w-[560px] text-body text-ink-soft">기준선(BMI 23·25, 허리 남 90·여 85cm)을 넘는 순간, 한국인 추적 연구 점수표로 앞으로의 위험이 바뀌어요. 기간은 연구 그대로(10년·4년)예요.</p>
      </section>

      {/* 7 검진 풀이 */}
      <section id="labs" className="mx-auto grid max-w-[1280px] scroll-mt-10 items-center gap-10 px-5 pb-24 md:grid-cols-2 md:gap-16 md:px-8 md:pb-36">
        <div className="flex flex-col gap-5">
          <Badge variant="soft" className="self-start"><FileText /> 검진 풀이</Badge>
          <h2 className="text-[40px] leading-[1.02] font-medium md:text-heading-lg">검진 결과지,<br /><span className="text-brand">숫자만 있고 뜻은 모르겠다면</span></h2>
          <p className="max-w-[480px] text-[18px] leading-relaxed text-ink-soft">혈압·혈당·콜레스테롤·콩팥 수치를 넣으면 하나씩 ‘어느 구간인지 · 무슨 뜻인지 · 무엇을 하면 되는지’로 풀어 드려요.</p>
          <Button asChild variant="brand" size="lg" className="self-start"><a href="#/labs">결과지 풀어보기 <ArrowRight /></a></Button>
        </div>
        <div className="rounded-[28px] bg-blush p-6 md:p-10"><LabCardView c={EX_LAB} k={0} /></div>
      </section>

      {/* 8 100명 점 */}
      <FloatingDots />

      {/* 9 소개 영상 */}
      <VideoBand />

      {/* 10 자주 묻는 질문 */}
      <section id="faq" className="mx-auto grid max-w-[1280px] scroll-mt-10 gap-8 px-5 py-24 md:grid-cols-[1fr_1.6fr] md:gap-16 md:px-8 md:py-32">
        <h2 className="text-[36px] leading-[1.05] font-medium md:text-heading">자주 묻는 질문</h2>
        <Accordion type="single" collapsible className="flex flex-col gap-3">
          {FAQ.map(([q, a]) => <AccordionItem key={q} value={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}
        </Accordion>
      </section>

      {/* 11 마지막 큰 문장 */}
      <section className="mx-auto flex max-w-[1280px] flex-col items-center gap-6 px-5 pb-24 text-center">
        <h2 className="text-[52px] leading-[0.95] font-medium text-brand md:text-[140px]">1분이면,<br />내 몸이 보여요.</h2>
        <p className="text-[18px] text-ink-soft">몸 정보와 생활 질문 2쪽이면 끝나요.</p>
        <StartBtn kind="main" label="1분 건강 체크하기" />
      </section>

      <footer className="mx-auto max-w-[1280px] px-5 pt-12 pb-28 md:px-8">
        <div className="grid gap-8 border-t border-sand-soft pt-10 md:grid-cols-4">
          <div className="flex flex-col gap-2 text-body-sm"><span className="text-caption text-ink-soft">시작</span><a href="#/start" className="text-ink no-underline">1분 건강 체크하기</a><a href="#/labs" className="text-ink no-underline">검진 풀이</a></div>
          <div className="flex flex-col gap-2 text-body-sm"><span className="text-caption text-ink-soft">내 기록</span><a href="#/record" className="text-ink no-underline">지난 결과 비교</a><a href="#/result" className="text-ink no-underline">내 결과</a></div>
          <div className="flex flex-col gap-2 text-body-sm"><span className="text-caption text-ink-soft">알아두기</span><a href="#faq" className="text-ink no-underline">자주 묻는 질문</a><a href="https://www.kdca.go.kr" target="_blank" rel="noreferrer" className="text-ink no-underline">질병관리청</a></div>
          <p className="text-caption text-ink-soft">1분체크는 국가 건강통계와 연구를 바탕으로 한 예측 서비스예요. {NOT_DIAGNOSIS} 질환 여부는 검사와 진료로 확인해 주세요. © 2026 1분체크</p>
        </div>
        <div aria-hidden className="mt-10 select-none text-center text-[26vw] leading-[0.8] font-medium text-brand md:text-[22vw]">1분체크</div>
      </footer>
    </div>
  );
}
