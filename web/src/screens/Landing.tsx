// v2 랜딩 (Jeton 스타일 · docs/DESIGN.md): 따뜻한 주황 첫 화면 → 또래 100명 중 나 → 줄이면? → 검진 풀이 → 영상 → FAQ.
// 예시 숫자는 모두 앱과 같은 함수(lines.ts·peer.ts·labZones.ts)로 계산한다.
import type React from 'react';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, FileText, Users, TrendingDown, Play } from 'lucide-react';
import { useStore } from '../ui.tsx';
import { MiniTrial, loadMini, miniDraft, MINI_CTA } from './MiniTrial.tsx';
import { toInput, type AppInput } from '../state.ts';
import { LineBar } from './Results.tsx';
import { LabCardView } from './Labs.tsx';
import { peerCards } from '../lib/peer.ts';
import { bmiGauge, waistGauge, futureEffects } from '../lib/lines.ts';
import { labCards } from '../lib/labZones.ts';
import { PRIVACY_LINE } from '../lib/share.ts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Dots } from '@/components/viz';
import { cn } from '@/lib/utils';

/** 미니 체험 결과(탭 세션)를 구독: 없으면 null */
function useMini() {
  const [m, setM] = useState(loadMini);
  useEffect(() => { const on = () => setM(loadMini()); window.addEventListener('mini-change', on); return () => window.removeEventListener('mini-change', on); }, []);
  return m;
}
/** '체크 시작' 버튼. 미니에 넣은 값이 있으면 그 값을 가지고 이어서(문구도 미니 결과 단계에 맞춤). 이미 결과가 있으면 결과로 */
function StartBtn({ kind, className, label, variant = 'default', size = 'lg' }: { kind: 'nav' | 'main' | 'text'; className?: string; label: string; variant?: 'default' | 'white' | 'outline' | 'ink'; size?: 'lg' | 'sm' | 'pill' }) {
  const m = useMini(), { setDraft, draft } = useStore();
  if (kind === 'text' && toInput(draft)) return <Button asChild variant={variant} size={size} className={className}><a href="#/result">내 결과 보기 <ArrowRight /></a></Button>;
  const set = !m ? null : m.tone != null ? MINI_CTA[m.tone] : MINI_CTA.partial;
  const text = !set ? label : set[kind === 'nav' ? 'nav' : 'main'];
  // 미니에 한 칸이라도 넣었으면 넣은 값을 채운 채 기본정보로
  const go = (e: React.MouseEvent) => { if (!m) return; e.preventDefault(); setDraft((d) => ({ ...d, ...miniDraft(m) })); location.hash = '#/info'; };
  return <Button asChild variant={variant} size={size} className={cn('h-auto min-h-12 whitespace-normal text-center', className)}><a href="#/start" onClick={go}>{text} {kind !== 'nav' && <ArrowRight />}</a></Button>;
}

// ── 예시 (영상과 같은 장면). 52세 남성 · 172cm · 82kg · 허리 92cm · 혈압 정상 · 운동 안 함 ──
const EX: AppInput = { age: 52, sex: 'M', heightCm: 172, weightKg: 82, waistCm: 92, smoke: 'never', alcohol: 'lt1', famDM: false, dx: { htn: false, dm: false, chol: false }, bp: 'normal', exercise: false, meno: null };
const EX_PEER = peerCards(EX).find((c) => c.id === 'htn')!;
const EX_DW = -4, EX_DWA = -3;
const EX_FX = futureEffects(EX, EX_DW, EX_DWA).effects.find((e) => e.id === 'dm10')!;
const EX_LAB = labCards({ glu: 108 }, 'M')[0];
const FAQ = [
  ['검사 없이 건강 상태를 알 수 있나요?', '간단한 몸 정보와 생활습관으로 지금 건강을 가늠해 볼 수 있어요. 국가 건강통계와 한국인 연구로 계산한 참고 정보이고, 실제 질환 여부는 검사와 진료로 확인해요.'],
  ['입력한 정보는 저장되나요?', '입력한 건강정보는 서버로 보내지 않고 이 기기 안에서만 계산해요. 결과는 ‘기록 저장’을 눌렀을 때만 이 기기에 보관되고, 언제든 지울 수 있어요.'],
  ['‘또래 100명 중 나’는 어떻게 계산하나요?', '국민건강영양조사(2022–2024)에서 나와 성별이 같고 나이가 ±5세인, 아직 진단받지 않은 사람들에게 같은 계산을 해 본 분포예요. 그 100명을 위험이 낮은 순서로 세웠을 때 내 자리를 보여드려요.'],
  ['몸무게나 허리를 바꾸면 왜 숫자가 계단처럼 바뀌나요?', '한국인 추적 연구의 점수표가 BMI 25·30, 허리 남 90·여 85cm 같은 기준선으로 점수를 매기기 때문이에요. 그래서 기준선을 넘는지를 먼저 보여드려요. 기간도 연구 그대로(10년·4년) 써요.'],
  ['앱을 설치해야 하나요?', '설치 없이 웹에서 바로 쓸 수 있어요. 휴대폰 홈 화면에 추가하면 다음에 더 편하게 열 수 있어요.'],
];

/** 소개 영상: 처음엔 그림만(가볍게), 누르면 받아서 소리와 함께 재생 */
function VideoButton() {
  const base = import.meta.env.BASE_URL;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label="1분체크 소개 영상 45초 보기 (소리 있음)" className="group relative block aspect-video w-full cursor-pointer overflow-hidden rounded-[24px] bg-white shadow-float">
          <img src={`${base}video/promo-poster.jpg`} alt="" loading="lazy" className="block size-full object-cover" />
          <span className="absolute bottom-4 left-4 inline-flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-4 pl-1.5 text-body-sm font-medium text-ink shadow-card">
            <span className="flex size-9 items-center justify-center rounded-full bg-brand text-white transition-transform group-hover:scale-105"><Play className="size-4" fill="currentColor" /></span>소개 영상 보기 · 45초 · 소리 있음
          </span>
        </button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle className="sr-only">1분체크 소개 영상 45초</DialogTitle>
        <video className="block aspect-video w-full rounded-[20px] bg-black" src={`${base}video/promo-45s.mp4`} poster={`${base}video/promo-poster.jpg`} controls autoPlay playsInline preload="none" />
      </DialogContent>
    </Dialog>
  );
}

/** '줄이면?' 예시: 이대로면 ↔ 바꾸면을 번갈아 보여준다(움직임 줄이기면 바꾼 뒤 그대로) */
function ChangeDemo() {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [on, setOn] = useState(reduce);
  useEffect(() => { if (reduce) return; const t = setInterval(() => setOn((x) => !x), 2600); return () => clearInterval(t); }, [reduce]);
  const wg = waistGauge(EX, on ? EX_DWA : 0)!, bg = bmiGauge(EX, on ? EX_DW : 0);
  return (
    <Card className="flex w-full max-w-[460px] flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <b className="text-body font-medium"><span className="mr-1.5 text-caption text-ink-soft">예시</span>52세 남성</b>
        <Badge variant={on ? 'brand' : 'muted'} className="transition-colors">{on ? `허리 ${EX_DWA}cm · 체중 ${EX_DW}kg` : '이대로면'}</Badge>
      </div>
      <LineBar g={wg} changed={on} />
      <LineBar g={bg} changed={on} />
      <div className={cn('rounded-btn px-4 py-3.5 transition-colors', on ? 'bg-good-bg' : 'bg-sand-soft')}>
        <b className="text-body-sm font-medium">{EX_FX.title}</b>
        <div className="mt-0.5 text-body">이대로면 <b>{EX_FX.before}</b> <ArrowRight className="inline size-4 text-ink-soft" /> 바꾸면 <b className={cn('text-subheading font-medium', on ? 'text-good' : 'text-ash')}>{on ? EX_FX.after : '?'}</b></div>
      </div>
    </Card>
  );
}

const Kicker = ({ icon: Ic, children, className }: { icon: typeof Users; children: React.ReactNode; className?: string }) => (
  <span className={cn('inline-flex items-center gap-2 text-body-sm font-medium text-brand', className)}><Ic className="size-4" />{children}</span>
);
const H2 = ({ children, className }: { children: React.ReactNode; className?: string }) => <h2 className={cn('text-[40px] leading-[1.05] font-medium md:text-heading-lg', className)}>{children}</h2>;

export function Landing() {
  return (
    <div className="bg-white text-ink">
      {/* 떠 있는 상단 메뉴 (Jeton: 둥근 알약 모양 + 흐림) */}
      <header className="fixed inset-x-0 top-3 z-40 px-3">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between rounded-nav bg-white/80 pr-2 pl-5 shadow-card backdrop-blur-xl">
          <a href="#/" className="flex items-center gap-2 no-underline"><span className="flex size-8 items-center justify-center rounded-[10px] bg-brand"><i className="size-3 rounded-full bg-white" /></span><b className="text-[20px] font-medium text-ink">1분체크</b></a>
          <nav className="hidden items-center gap-1 md:flex">
            {[['#peer', '또래 중 나'], ['#change', '줄이면?'], ['#labs', '검진 풀이'], ['#faq', '자주 묻는 질문']].map(([h, t]) => <a key={h} href={h} className="rounded-full px-3.5 py-2 text-body-sm text-ink no-underline hover:bg-sand-soft">{t}</a>)}
          </nav>
          <StartBtn kind="nav" size="sm" className="min-h-10 rounded-full px-4" label="1분 건강 체크하기" />
        </div>
      </header>

      {/* 첫 화면: 따뜻한 주황 그라데이션 위 큰 흰 글씨 */}
      <section className="relative overflow-hidden bg-[radial-gradient(120%_90%_at_85%_10%,#ff9a7a_0%,#f9603f_38%,#f73b20_62%,#d92a12_100%)] text-white">
        <div className="pointer-events-none absolute -right-32 -bottom-40 size-[620px] rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-5 pt-28 pb-16 md:grid-cols-[1.1fr_1fr] md:gap-14 md:px-6 md:pt-36 md:pb-24">
          <div className="flex flex-col gap-7">
            <h1 className="text-[64px] leading-[0.95] font-medium md:text-display">내 몸이<br />궁금할 때<br />딱 1분.</h1>
            <p className="max-w-[480px] text-subheading text-white/95">숫자 몇 개면 또래 100명 중 내 자리가 보여요. 몸무게·허리를 줄이면 어떻게 되는지도요.</p>
            <div className="flex flex-wrap gap-3">
              <StartBtn kind="main" variant="white" className="px-6" label="1분 건강 체크하기" />
              <Button asChild variant="outline" size="lg" className="border-white/70 bg-transparent text-white hover:bg-white/10"><a href="#/labs"><FileText /> 검진 결과지 풀어보기</a></Button>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-body-sm text-white/90">
              {['설치·가입 없이', '국가 건강통계와 한국인 연구로 계산', PRIVACY_LINE].map((t) => <span key={t} className="inline-flex items-center gap-1.5"><Check className="size-4" />{t}</span>)}
            </div>
          </div>
          <div id="try" className="scroll-mt-24"><MiniTrial /></div>
        </div>
      </section>

      {/* 또래 100명 중 나 */}
      <section id="peer" className="mx-auto grid max-w-[1200px] scroll-mt-20 items-center gap-10 px-5 py-20 md:grid-cols-2 md:gap-16 md:px-6 md:py-32">
        <div className="flex flex-col gap-5">
          <Kicker icon={Users}>또래 100명 중 나</Kicker>
          <H2>100명을 줄 세우면,<br /><span className="text-brand">나는 몇 번째?</span></H2>
          <p className="max-w-[480px] text-[18px] leading-relaxed text-ink-soft">‘몇 %’보다 쉽게. 나와 성별이 같고 나이가 비슷한 한국인 100명을 위험이 낮은 순서로 세웠을 때 내 자리를 점 하나로 보여드려요.</p>
          <StartBtn kind="text" variant="outline" className="self-start" label="내 자리 보기" />
        </div>
        <div className="rounded-[24px] bg-blush p-6 md:p-10">
          <Card className="flex flex-col gap-3 p-6">
            <span className="text-caption text-ink-soft">예시 · {EX_PEER.group}</span>
            <b className="text-subheading font-medium text-risk">{EX_PEER.name} · {EX_PEER.word}</b>
            {EX_PEER.kind === 'rank' && <><Dots rank={EX_PEER.rank} hot /><span className="text-body">100명을 위험이 낮은 순서로 세우면 <b className="text-risk">{EX_PEER.rank}번째</b></span></>}
          </Card>
        </div>
      </section>

      {/* 줄이면? */}
      <section id="change" className="scroll-mt-20 px-3 md:px-6">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 rounded-[32px] bg-ink px-6 py-14 text-white md:grid-cols-2 md:gap-16 md:px-14 md:py-24">
          <div className="flex flex-col gap-5">
            <Kicker icon={TrendingDown} className="text-brand-tint">이대로면 vs 바꾸면</Kicker>
            <H2 className="text-white">만약 허리를<br /><span className="text-brand-tint">줄이면?</span></H2>
            <p className="text-[18px] leading-relaxed text-white/85">결과 화면에서 몸무게·허리를 직접 움직여 보세요. 기준선(BMI 23·25, 허리 남 90·여 85cm)을 넘는 순간, 한국인 추적 연구 점수표로 앞으로의 위험이 어떻게 바뀌는지 보여드려요.</p>
            <span className="text-body-sm text-white/60">연구 기간 그대로(10년·4년) 보여드려요. 참고값이며 치료 효과를 보장하지 않아요.</span>
          </div>
          <div className="flex justify-center"><ChangeDemo /></div>
        </div>
      </section>

      {/* 검진 풀이 */}
      <section id="labs" className="mx-auto grid max-w-[1200px] scroll-mt-20 items-center gap-10 px-5 py-20 md:grid-cols-2 md:gap-16 md:px-6 md:py-32">
        <div className="order-2 rounded-[24px] bg-citrus/70 p-6 md:order-1 md:p-10"><LabCardView c={EX_LAB} k={0} /></div>
        <div className="order-1 flex flex-col gap-5 md:order-2">
          <Kicker icon={FileText}>검진 풀이</Kicker>
          <H2>검진 결과지,<br /><span className="text-brand">숫자만 있고 뜻은 모르겠다면</span></H2>
          <p className="max-w-[480px] text-[18px] leading-relaxed text-ink-soft">혈압·혈당·콜레스테롤·콩팥 수치를 넣으면 하나씩 ‘어느 구간인지 · 무슨 뜻인지 · 무엇을 하면 되는지’로 풀어 드려요.</p>
          <Button asChild variant="outline" size="lg" className="self-start"><a href="#/labs">결과지 풀어보기 <ArrowRight /></a></Button>
        </div>
      </section>

      {/* 영상 */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-8 px-5 md:grid-cols-[1fr_1.3fr] md:gap-16 md:px-6">
        <div className="flex flex-col gap-3">
          <H2 className="text-[34px] md:text-heading">45초로 보는 1분체크</H2>
          <p className="text-[18px] leading-relaxed text-ink-soft">숫자 몇 개 넣고, 100명 중 내 자리를 보고, 줄이면 어떻게 되는지까지.</p>
        </div>
        <VideoButton />
      </section>

      {/* 자주 묻는 질문 */}
      <section id="faq" className="mx-auto grid max-w-[1200px] scroll-mt-20 gap-8 px-5 py-20 md:grid-cols-[1fr_1.6fr] md:gap-16 md:px-6 md:py-32">
        <H2 className="text-[34px] md:text-heading">자주 묻는 질문</H2>
        <Accordion type="single" collapsible className="flex flex-col gap-3">
          {FAQ.map(([q, a]) => <AccordionItem key={q} value={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}
        </Accordion>
      </section>

      {/* 마지막 띠 */}
      <section className="px-3 md:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 rounded-[32px] bg-brand px-6 py-16 text-center text-white md:py-24">
          <h2 className="text-[40px] leading-[1.05] font-medium md:text-heading-lg">지금 내 건강,<br className="md:hidden" /> 1분만 살펴보세요</h2>
          <p className="text-[18px] text-white/90">몸 정보와 생활 질문 2쪽이면 끝나요.</p>
          <StartBtn kind="main" variant="white" label="1분 건강 체크하기" />
        </div>
      </section>

      <footer className="mx-auto mt-16 max-w-[1200px] border-t border-sand-soft px-5 pt-12 pb-10 md:px-6">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div><a href="#/" className="flex items-center gap-2 no-underline"><span className="flex size-8 items-center justify-center rounded-[10px] bg-brand"><i className="size-3 rounded-full bg-white" /></span><b className="text-[20px] font-medium text-ink">1분체크</b></a><p className="mt-2 text-body-sm text-ink-soft">내 몸이 궁금할 때 딱 1분.</p></div>
          <div className="flex flex-col gap-2 text-body-sm"><span className="text-caption text-ink-soft">서비스</span><a href="#/start" className="text-ink no-underline">1분 건강 체크하기</a><a href="#/labs" className="text-ink no-underline">검진 풀이</a><a href="#/record" className="text-ink no-underline">지난 결과 비교</a></div>
          <div className="flex flex-col gap-2 text-body-sm"><span className="text-caption text-ink-soft">알아두기</span><a href="#faq" className="text-ink no-underline">자주 묻는 질문</a><a href="https://www.kdca.go.kr" target="_blank" rel="noreferrer" className="text-ink no-underline">질병관리청</a></div>
        </div>
        <p className="mt-8 max-w-[820px] text-caption text-ink-soft">1분체크는 국가 건강통계와 연구를 바탕으로 건강 상태를 추정하는 참고 서비스예요. 의료 진단을 대신하지 않으며, 질환 여부는 검사와 진료로 확인해 주세요. © 2026 1분체크</p>
      </footer>
    </div>
  );
}
