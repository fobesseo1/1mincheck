import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { Activity, ArrowDown, ArrowRight, Check, ChevronDown, Droplets, Heart, Menu, MoveUpRight, Play, RotateCcw, ShieldCheck, SlidersHorizontal, Sparkles, UsersRound, X } from 'lucide-react';
import type { AppInput } from '../state.ts';
import { useStore } from '../ui.tsx';
import { MiniTrial, loadMini, miniDraft } from './MiniTrial.tsx';
import { peerCards, standing, type PeerCard } from '../lib/peer.ts';
import { bmiOf, futureEffects } from '../lib/lines.ts';
import { whatIfRows } from '../lib/view.ts';
import { labCards } from '../lib/labZones.ts';
import { NOT_DIAGNOSIS } from '../lib/content.ts';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import './landing-motion.css';
import { SpreadScene } from './SpreadScene.tsx';
import { TrioScene, ChangeLive, PeopleScene, LabsLive, MinuteScene } from './LandingScenes.tsx';

const ART = import.meta.glob('../assets/landing/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' }) as Record<string, string>;
const art = (name: string) => Object.entries(ART).find(([k]) => k.includes('/' + name + '.'))?.[1];
const EX: AppInput = { age: 52, sex: 'M', heightCm: 172, weightKg: 82, waistCm: 92, smoke: 'never', alcohol: 'lt1', famDM: false, dx: { htn: false, dm: false, chol: false }, bp: 'normal', exercise: false, meno: null };
const PEERS = peerCards(EX);
const NAV = [['peer', '또래 비교'], ['change', '바꿔보기'], ['labs', '검진 수치']] as const;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const phase = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const smooth = (p: number) => p * p * (3 - 2 * p);
const FAQ = [
  ['검사 없이 무엇을 알 수 있나요?', '몸 정보와 생활습관으로 현재 질환 가능성을 추정하고 또래와 비교해요. 몸무게·허리둘레를 바꿨을 때의 예측값도 볼 수 있어요. ' + NOT_DIAGNOSIS],
  ['또래 중 내 위치는 어떻게 계산하나요?', '국민건강영양조사(2022–2024)에서 성별이 같고 나이가 ±5세인, 아직 진단받지 않은 사람들에게 같은 계산을 적용한 분포와 비교해요. 실제로 100명을 모아 진단한 순위는 아니에요. 또래 평균은 항목별 기준이 달라 상세 결과에서 확인할 수 있어요.'],
  ['몸무게·허리를 바꾸면 왜 결과가 달라지나요?', '현재 질환 가능성은 몸무게·허리둘레를 반영해 다시 계산해요. 향후 10년 당뇨 발생 위험은 한국인 추적 연구의 점수표를 사용해서 허리 기준선을 넘을 때 계단처럼 바뀔 수 있어요. 같은 조건에서 입력값을 바꾼 예측이며, 개인의 실제 변화에는 생활습관과 건강 상태 등 여러 요인이 영향을 줘요.'],
  ['간단 체험과 1분 체크는 무엇이 다른가요?', '간단 체험은 성별·나이·키·몸무게, 4가지 정보로 같은 체형의 한국인 통계를 먼저 보여드려요. 기본 체크는 허리둘레와 생활습관까지 약 1분 동안 답하고 개인별 추정 결과를 확인하는 과정이에요. 검진 수치 입력과 추가 체험은 선택이에요.'],
  ['입력한 건강정보는 어디에 저장되나요?', '입력한 건강정보는 서버로 보내지 않고 이 기기 안에서 계산해요. 간단 체험 입력은 이 탭을 닫기 전까지 남고, 기본 체크의 작성 중인 답은 이 기기에 보관돼요. 결과 기록은 ‘기록 저장’을 눌렀을 때만 보관돼요.' + (__ANALYTICS__ ? ' 사이트 방문 수는 익명으로 집계해요.' : '')],
  ['누가 이용할 수 있나요?', '현재 만 19세 이상 성인을 대상으로 해요. 앱 설치 없이 웹에서 바로 이용할 수 있어요.'],
];
/** Scroll-scrubbed scenes without wheel interception or React renders each frame. */
function useScene() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)'); let frame = 0;
    const measure = () => {
      frame = 0; const r = el.getBoundingClientRect(), p = media.matches ? 1 : clamp(-r.top / Math.max(1, r.height - innerHeight));
      el.style.setProperty('--progress', String(p));
      el.style.setProperty('--gather', String(smooth(phase(p, .04, .30))));
      el.style.setProperty('--scatter-out', String(smooth(phase(p, .52, .66))));
      el.style.setProperty('--detail', String(smooth(phase(p, .64, .80))));
      el.style.setProperty('--grid', String(smooth(phase(p, .65, .87))));
      el.dataset.detail = String(media.matches || p > .64);
      const detail = el.querySelector<HTMLElement>('.lm-peer-detail');
      if (detail) detail.inert = !media.matches && p <= .64;
      el.style.setProperty('--hero-shift', Math.max(-80, Math.min(80, -r.top * .12)) + 'px');
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure(); addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule); media.addEventListener('change', schedule);
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', schedule); removeEventListener('resize', schedule); media.removeEventListener('change', schedule); };
  }, []);
  return ref;
}
function jump(e: MouseEvent<HTMLAnchorElement>, id: string) {
  const el = document.getElementById(id); if (!el) return; e.preventDefault();
  el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  history.replaceState(null, '', '#' + id);
}
function Start({ children = '1분 건강 체크하기', className = '' }: { children?: ReactNode; className?: string }) {
  const { setDraft } = useStore();
  const go = (e: MouseEvent<HTMLAnchorElement>) => { const m = loadMini(); if (m) { e.preventDefault(); setDraft((d) => ({ ...d, ...miniDraft(m) })); location.hash = '#/info'; } };
  return <a className={'lm-button lm-button-lime ' + className} href="#/start" onClick={go}>{children}<ArrowRight size={19} /></a>;
}
function Logo() { return <a className="lm-logo" href="#/" aria-label="1분체크 처음으로"><span className="lm-logo-mark"><i /></span><span>1분체크</span></a>; }
function Header() {
  const [solid, setSolid] = useState(false), [open, setOpen] = useState(false);
  useEffect(() => { const on = () => setSolid(scrollY > innerHeight - 110); on(); addEventListener('scroll', on, { passive: true }); return () => removeEventListener('scroll', on); }, []);
  return <header className={'lm-header ' + (solid || open ? 'is-solid' : '')}><div className="lm-header-inner"><Logo /><nav aria-label="주요 메뉴">{NAV.map(([id, t]) => <a key={id} href={'#' + id} onClick={(e) => jump(e, id)}>{t}</a>)}</nav><Start className="lm-header-start" /><button className="lm-menu" aria-label={open ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={open} aria-controls="lm-mobile-nav" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>
  {open && <nav className="lm-mobile-nav" id="lm-mobile-nav" aria-label="모바일 메뉴">{[...NAV, ['faq', '자주 묻는 질문']].map(([id, t]) => <a key={id} href={'#' + id} onClick={(e) => { setOpen(false); jump(e, id); }}>{t}<ArrowRight size={18} /></a>)}</nav>}</header>;
}
function Hero() {
  const ref = useScene();
  return <section className="lm-hero" ref={ref}><div className="lm-hero-art" aria-hidden><picture><source media="(max-width: 700px)" srcSet={art('hero-m')} /><img src={art('hero')} alt="" loading="eager" /></picture></div><div className="lm-hero-shade" />
    <div className="lm-hero-top"><span className="lm-live-dot" /> 내 몸을 이해하는 가장 가벼운 시작</div>
    <div className="lm-hero-bottom lm-wrap"><h1>내 몸이 궁금할 때<br /><span>딱 1분.</span></h1><div className="lm-hero-copy"><p>또래 속 내 위치를 알고,<br />바꿨을 때의 차이를 느껴보세요.</p><div className="lm-hero-actions"><Start /><a className="lm-text-link" href="#change" onClick={(e) => jump(e, 'change')}>먼저 바꿔보기 <MoveUpRight size={17} /></a></div><small>만 19세 이상 · 건강정보는 서버로 보내지 않아요</small></div></div>
    <a className="lm-scroll" href="#peer" onClick={(e) => jump(e, 'peer')}><ArrowDown size={16} /> 아래로, 내 몸을 더 가까이</a></section>;
}
function Finish() {
  return <><MinuteScene id="minute" />
    <section id="faq" className="lm-faq lm-section"><div className="lm-wrap lm-faq-grid"><div><span className="lm-eyebrow">궁금한 점이 있다면</span><h2>조금 더<br />알아두세요.</h2></div><Accordion type="single" collapsible>{FAQ.map(([q, a], i) => <AccordionItem key={q} value={String(i)}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}</Accordion></div></section>
    <section className="lm-closing"><div className="lm-closing-disc" aria-hidden /><div className="lm-wrap"><span className="lm-eyebrow">내 몸에 관심을 갖는 첫걸음</span><h2>내 몸이 궁금하다면,<br /><span>지금 확인해 보세요.</span></h2><Start /><p>내 기기 안에서만 계산해요 · 논문과 국가 통계 바탕 · 무료, 가입 없음</p></div></section>
    <footer className="lm-footer"><div className="lm-wrap"><div><Logo /><p>국가 건강통계와 한국인 연구를 바탕으로<br />내 건강을 가늠하는 서비스.</p><small>질환 여부는 검사와 진료로 확인해 주세요.</small></div><nav aria-label="바닥글 메뉴"><a href="#/start">1분 건강 체크하기</a><a href="#/labs">검진 수치 확인하기</a><a href="#/record">지난 결과 비교</a></nav><div className="lm-footer-source"><a href="https://www.kdca.go.kr/" target="_blank" rel="noreferrer">질병관리청 <MoveUpRight size={13} /></a><span>국민건강영양조사 · 한국인 추적 연구</span><small>© 2026 1분체크</small></div></div></footer></>;
}
export function Landing() { return <div className="lm-page"><Header /><main><Hero /><SpreadScene id="overview" ex={EX} exLabel="52세 남성 · 172cm · 82kg · 허리 92cm" /><TrioScene id="peer" ex={EX} /><ChangeLive id="change" ex={EX} /><PeopleScene id="try" /><LabsLive id="labs" sex="M" /><Finish /></main></div>; }
