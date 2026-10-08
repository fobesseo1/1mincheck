// v2 결과: 카드 3장 — ① 지금 내 상태(판정) ② 또래 100명 중 나 ③ 이대로면 vs 바꾸면(기준선).
// 나머지 자세한 내용은 '모든 항목 보기'(All.tsx). 계산·판정은 view.ts·verdict.ts·lines.ts·peer.ts 그대로. 디자인: docs/DESIGN.md
import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, FileText, Bookmark, Share2, ClipboardList, LayoutList, RotateCcw } from 'lucide-react';
import type { Input } from '../../../engine/src/engine.ts';
import { useStore, Nav, Crisis, AppShell, Help } from '../ui.tsx';
import { toInput, suggestScenario, saveRecords, today, type AppInput } from '../state.ts';
import { viewResults } from '../lib/view.ts';
import { verdict, type Verdict } from '../lib/verdict.ts';
import { DISCLAIMER } from '../lib/content.ts';
import { peerCards, type PeerCard } from '../lib/peer.ts';
import { bmiGauge, waistGauge, futureEffects, kgToLowerZone, cmToWaistOk, minWeightDelta, waistCut, type Gauge } from '../lib/lines.ts';
import { shareApp } from '../lib/share.ts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ZoneGauge, Dots, TONE_TEXT, type Tone } from '@/components/viz';
import { cn } from '@/lib/utils';

export { Dots };
/** 마지막 글자 받침에 맞는 조사 */
export const josa = (w: string, a: string, b: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };

/** 결과가 필요한 화면 공통: 기본정보가 없으면 안내 */
export function useInput(): Input | null { const { draft } = useStore(); return useMemo(() => toInput(draft), [draft]); }
export function NeedInput() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center gap-4 px-5 text-center">
      <h1 className="text-heading-sm text-ink-soft">아직 답한 내용이<b className="block text-ink">없어요</b></h1>
      <p className="text-body-sm text-ink-soft">몸 정보와 생활 질문에 답하면 결과를 볼 수 있어요. 약 1분이면 돼요.</p>
      <Button asChild size="lg" className="mt-4"><a href="#/start">체크 시작하기</a></Button>
      <Button asChild variant="link"><a href="#/record">저장한 기록 보기</a></Button>
    </div>
  );
}

/** 판정 단계별 모양: ① 지금 바로 = 위험색 꽉 찬 카드, ② 병원 확인 = 흰 카드 + 위험색 띠, ⑤ 관리 중 = 모래색, ③ 습관 = 따뜻한 분홍, ④ 유지 = 좋음 초록 */
const TIER: Record<Verdict['tier'], { card: string; title: string; sub: string; badge: 'white' | 'risk' | 'ink' | 'brand' | 'good'; num: string }> = {
  1: { card: 'bg-risk text-white', title: 'text-white', sub: 'text-white/90', badge: 'white', num: 'bg-risk text-white' },
  2: { card: 'bg-white border-t-[6px] border-risk-dot', title: 'text-risk', sub: 'text-ink-soft', badge: 'risk', num: 'bg-risk-dot text-white' },
  5: { card: 'bg-sand-soft', title: 'text-ink', sub: 'text-ink-soft', badge: 'ink', num: 'bg-ink text-white' },
  3: { card: 'bg-blush', title: 'text-ink', sub: 'text-ink-soft', badge: 'brand', num: 'bg-brand text-white' },
  4: { card: 'bg-good-bg', title: 'text-good', sub: 'text-ink-soft', badge: 'good', num: 'bg-good-dot text-white' },
};
const scrollToChange = () => document.getElementById('change')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

/** ① 지금 내 상태: 한 줄 + 할 일. 급한 안내(①)와 병원 확인(②)은 할 일을 모두, 나머지는 하나만 */
function VerdictCard({ v, gap }: { v: Verdict; gap: string }) {
  const t = TIER[v.tier];
  const acts = (v.tier === 1 || v.tier === 2 ? v.actions : v.actions.slice(0, 1))
    // 체중·허리 할 일은 아래 '이대로면 vs 바꾸면' 카드로 (지금 가능성 % 변화 대신 기준선까지 거리)
    .map((a) => (a.href === '#/whatif' ? { ...a, d: gap, href: undefined, change: true } : { ...a, change: false }));
  return (
    <section aria-label="지금 내 상태" className={cn('flex flex-col gap-3 rounded-card p-5 shadow-card', t.card)}>
      <Badge variant={t.badge} className="self-start">{v.tag}</Badge>
      <h2 className={cn('text-heading-sm', t.title)}>{v.title}</h2>
      <p className={cn('text-body-sm', t.sub)}>{v.sub}</p>
      <ol className="flex flex-col gap-2">
        {acts.map((a, k) => {
          const body = (<>
            <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-[9px] text-body-sm font-medium', t.num)}>{k + 1}</span>
            <span className="flex-1 text-left"><b className="text-body font-medium text-ink">{a.t}</b>{a.d && <span className="mt-0.5 block text-body-sm text-ink-soft">{a.d}</span>}</span>
            {a.change ? <ChevronDown className="size-5 self-center text-brand" /> : a.href ? <ChevronRight className="size-5 self-center text-brand" /> : null}
          </>);
          const cls = 'flex w-full gap-3 rounded-btn bg-white p-3 text-ink no-underline';
          return <li key={a.t}>{a.change ? <button type="button" onClick={scrollToChange} className={cn(cls, 'cursor-pointer')}>{body}</button> : a.href ? <a href={a.href} className={cls}>{body}</a> : <div className={cls}>{body}</div>}</li>;
        })}
      </ol>
      {v.also && <span className={cn('text-body-sm', t.sub)}>{v.also}</span>}
    </section>
  );
}

/** 또래 결과의 뜻 색: 높음(또래 평균의 1.25배 이상) 위험 · 위쪽 1/3 주의 · 아래쪽 1/3 좋음 · 가운데 잉크 */
const peerTone = (c: PeerCard): Tone | null => (c.kind === 'status' ? null : c.high ? 'high' : c.kind === 'rank' ? (c.rank >= 67 ? 'mid' : c.rank <= 33 ? 'ok' : null) : null);

/** ② 또래 100명 중 나 */
function PeerCardView({ cs }: { cs: PeerCard[] }) {
  return (
    <Card aria-label="또래 100명 중 나" className="p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[19px] font-medium">또래 100명 중 나</h2>
        <span className="text-caption text-ink-soft">{cs[0].group}</span>
      </div>
      <Tabs defaultValue={cs[0].id}>
        <TabsList aria-label="항목">{cs.map((x) => <TabsTrigger key={x.id} value={x.id}>{x.name}</TabsTrigger>)}</TabsList>
        {cs.map((c) => (
          <TabsContent key={c.id} value={c.id} className="flex flex-col gap-3">
            <b className="text-subheading font-medium text-ink">{c.name} · <span className={peerTone(c) ? TONE_TEXT[peerTone(c)!] : 'text-ink'}>{c.word}</span></b>
            {c.kind === 'rank' && (<>
              <Dots rank={c.rank} hot={c.high} tone={peerTone(c) ?? undefined} />
              <div className="flex justify-between text-[11px] text-ink-soft"><span>위험 낮은 사람부터</span><span>위험 높은 사람까지</span></div>
              <span className="text-body">{c.group} 100명을 위험이 낮은 순서로 세우면 <b className="text-brand">나는 {c.rank}번째</b>예요.</span>
            </>)}
            {c.kind === 'count' && (<>
              <Dots n={c.n} hot={c.high} tone={peerTone(c) ?? undefined} />
              <span className="text-body">나와 비슷한 조건 100명 중 <b className="text-brand">약 {c.n}명</b>이 해당하는 수준이에요.</span>
            </>)}
            {c.kind === 'status' && <span className="text-body-sm text-ink-soft">{c.note}</span>}
            {c.kind !== 'status' ? (
              <a href={`#/detail/${c.id}`} className="flex items-center justify-between gap-3 rounded-btn bg-blush/70 px-3.5 py-3 text-body-sm text-ink-soft no-underline">
                <span>지금 {c.name} 가능성 추정 <b className="text-ink">{c.pct}%</b> · 또래 평균 {c.peer}%<span className="mt-0.5 block text-[11px]">앞으로가 아니라 지금 검사하면 기준에 해당할 가능성 · {c.who} 기준</span></span>
                <ChevronRight className="size-5 shrink-0 text-brand" />
              </a>
            ) : <a href={`#/detail/${c.id}`} className="text-body-sm font-medium text-brand">자세히 보기</a>}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}

/** 기준선 막대 (shadcn Progress 위에 기준선): 지금(빈 점) → 바꾸면(채운 점) */
export function LineBar({ g, changed, delay }: { g: Gauge; changed: boolean; delay?: number }) {
  const p = (v: number) => Math.max(0, Math.min(1, (v - g.min) / (g.max - g.min)));
  const fmt = (v: number) => (g.key === 'bmi' ? v.toFixed(1) : `${v}cm`);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <b className="text-body-sm font-medium">{g.title}</b>
        <span className="text-right text-body-sm">
          <span className={changed ? 'text-ink-soft' : cn('font-medium', TONE_TEXT[g.nowZone.tone])}>{fmt(g.now)} {g.nowZone.name}</span>
          {changed && <> <ChevronRight className="inline size-4 text-ink-soft" /> <b className={cn('font-medium', TONE_TEXT[g.afterZone.tone])}>{fmt(g.after)} {g.afterZone.name}</b></>}
        </span>
      </div>
      <ZoneGauge label={g.title} pos={p(changed ? g.after : g.now)} now={changed ? p(g.now) : undefined} tone={(changed ? g.afterZone : g.nowZone).tone} delay={delay}
        ticks={g.lines.filter((l) => l > g.min && l < g.max).map((l) => ({ at: p(l), text: String(l) }))} />
    </div>
  );
}

/** ③ 이대로면 vs 바꾸면: 몸무게·허리 슬라이더 → 기준선 막대와 미래 위험(원문 점수표·기간 그대로) */
function ChangeCard({ inp }: { inp: Input }) {
  const [dw, setDw] = useState(0), [dwa, setDwa] = useState(0);
  const minW = minWeightDelta(inp.heightCm, inp.weightKg);
  const bg = bmiGauge(inp, dw), wg = waistGauge(inp, dwa), { effects, hints } = futureEffects(inp, dw, dwa);
  const changed = dw !== 0 || dwa !== 0;
  const k = kgToLowerZone(inp.heightCm, inp.weightKg), cm = inp.waistCm != null ? cmToWaistOk(inp.sex, inp.waistCm) : null;
  const chips: [string, () => void][] = [];
  if (k && -k.kg >= minW) chips.push([`BMI ${k.line} 아래로 (−${k.kg}kg)`, () => setDw(-k.kg)]);
  if (cm != null && cm <= 15) chips.push([`허리 ${waistCut(inp.sex)}cm 아래로 (−${cm}cm)`, () => setDwa(-cm)]);
  const sign = (n: number, u: string) => (n === 0 ? '그대로' : `${n > 0 ? '+' : '−'}${Math.abs(n)}${u}`);
  const dirText = { down: 'text-good', up: 'text-risk', same: 'text-ink' } as const;
  const dirBg = { down: 'bg-good-bg', up: 'bg-risk-bg', same: 'bg-sand-soft' } as const;
  return (
    <Card id="change" aria-label="이대로면 vs 바꾸면" className="flex scroll-mt-3 flex-col gap-4 p-5">
      <div>
        <h2 className="text-[19px] font-medium">이대로면 <span className="text-brand">vs</span> 바꾸면</h2>
        <span className="text-caption text-ink-soft">몸무게·허리를 움직이면 기준선을 넘는지 바로 보여드려요</span>
      </div>
      <LineBar g={bg} changed={dw !== 0} />
      <div>
        <div className="flex justify-between text-body-sm"><span>몸무게 <b className="text-ink">{Math.round((inp.weightKg + dw) * 10) / 10}kg</b></span><span className="text-ink-soft">{sign(dw, 'kg')}</span></div>
        <Slider fill={false} aria-label="몸무게 바꿔보기" min={minW} max={5} step={1} value={[dw]} onValueChange={([x]) => setDw(x)} />
      </div>
      {wg ? (<>
        <LineBar g={wg} changed={dwa !== 0} />
        <div>
          <div className="flex justify-between text-body-sm"><span>허리 <b className="text-ink">{wg.after}cm</b></span><span className="text-ink-soft">{sign(dwa, 'cm')}</span></div>
          <Slider fill={false} aria-label="허리둘레 바꿔보기" min={-15} max={5} step={1} value={[dwa]} onValueChange={([x]) => setDwa(x)} />
        </div>
      </>) : <a href="#/info" className="text-body-sm font-medium text-brand">허리둘레를 넣으면 복부비만 기준선도 볼 수 있어요</a>}
      {(chips.length > 0 || changed) && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map(([t, f]) => <Button key={t} variant="outline" size="sm" className="rounded-full" onClick={f}>{t}</Button>)}
          {changed && <Button variant="ghost" size="sm" className="rounded-full text-ink-soft" onClick={() => { setDw(0); setDwa(0); }}><RotateCcw /> 처음 값으로</Button>}
        </div>
      )}
      {!changed && <span className="rounded-btn bg-sand-soft px-3.5 py-3 text-body-sm">{[bg.gap, wg?.gap].filter(Boolean).join(' · ')}</span>}
      {effects.map((e) => (
        <div key={e.id} className={cn('flex flex-col gap-1 rounded-btn px-4 py-3.5', dirBg[e.dir])}>
          <b className="text-body-sm font-medium">{e.title}</b>
          <span className="text-body">이대로면 <b className="text-ink">{e.before}</b>{changed && <> <ChevronRight className="inline size-4 text-ink-soft" /> 바꾸면 <b className={cn('text-subheading font-medium', dirText[e.dir])}>{e.after}</b></>}</span>
          <span className="text-caption text-ink-soft">{changed ? e.note : e.id === 'dm10' ? `비슷한 위험 점수였던 사람 중 10년 안에 당뇨가 생긴 비율이에요. 허리 ${waistCut(inp.sex)}cm 기준선에서 바뀌어요.` : '비슷한 점수였던 사람 중 4년 안에 고혈압이 생긴 비율이에요. BMI 25·30 기준선에서 바뀌어요.'}</span>
        </div>
      ))}
      {hints.map((h) => <span key={h} className="text-caption text-ink-soft">{h}</span>)}
      <span className="text-[11px] leading-normal text-ink-soft">기준선은 대한비만학회 기준, 미래 위험은 한국인 추적 연구의 점수표(기간 그대로)예요. 참고값이며 실제로 줄였을 때의 치료 효과를 보장하지 않아요.</span>
    </Card>
  );
}

function LinkRow({ href, onClick, icon, title, sub }: { href?: string; onClick?: () => void; icon: ReactNode; title: string; sub: string }) {
  const body = (<>
    <span className="flex size-10 shrink-0 items-center justify-center rounded-btn bg-blush text-brand [&_svg]:size-5">{icon}</span>
    <span className="flex-1 text-left"><b className="text-body font-medium text-ink">{title}</b><span className="block text-caption text-ink-soft">{sub}</span></span>
    <ChevronRight className="size-5 text-ink-soft" />
  </>);
  const cls = 'flex w-full items-center gap-3 py-3.5 text-ink no-underline';
  return href ? <a href={href} className={cls}>{body}</a> : <button type="button" onClick={onClick} className={cn(cls, 'cursor-pointer')}>{body}</button>;
}

export function Results() {
  const { records, setRecords, toast } = useStore();
  const inp = useInput();
  if (!inp) return <NeedInput />;
  const sc = suggestScenario(inp), r = viewResults(inp, sc), v = verdict(inp as AppInput, r, sc);
  const bg = bmiGauge(inp, 0), wg = waistGauge(inp, 0);
  const gap = (v.actions.find((a) => a.href === '#/whatif')?.t.includes('허리') ? wg?.gap : bg.gap) ?? bg.gap;
  const save = () => {
    const next = [...records, { id: String(Date.now()), date: today(), input: inp }];
    if (saveRecords(next)) { setRecords(next); toast('이 기기에 기록을 저장했어요'); } else toast('이 브라우저에서는 저장할 수 없어요');
  };
  return (
    <AppShell tab="result">
      <Nav title="내 결과" sub={`${today()} · ${r.who}`} right={<Button variant="soft" size="icon" aria-label="친구에게 알려주기" onClick={() => shareApp(toast)}><Share2 /></Button>} />
      {r.crisis && <Crisis />}
      <VerdictCard v={v} gap={gap} />
      <PeerCardView cs={peerCards(inp)} />
      <ChangeCard inp={inp} />

      <a href="#/labs" className="flex items-center gap-3 rounded-card bg-brand p-5 text-white no-underline shadow-float">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-btn bg-white/15"><FileText className="size-6" /></span>
        <span className="flex-1"><b className="text-[17px] font-medium">검진 결과지가 있나요?</b><span className="block text-body-sm text-white/85">숫자를 넣으면 하나씩 쉽게 풀어 드려요. 결과도 더 정확해져요.</span></span>
        <ChevronRight className="size-6" />
      </a>
      <Card className="divide-y divide-sand-soft px-4">
        <LinkRow href="#/all" icon={<LayoutList />} title="모든 항목 보기" sub="콜레스테롤·골다공증·생활 체크·근거" />
        <LinkRow href="#/summary" icon={<ClipboardList />} title="진료용 요약 저장" sub="인쇄하거나 PDF로 저장" />
        <LinkRow onClick={save} icon={<Bookmark />} title="이 기기에 기록 저장" sub="몇 달 뒤 다시 체크하면 달라진 만큼 비교해요" />
      </Card>
      <Button variant="outline" size="lg" className="w-full" onClick={() => shareApp(toast)}><Share2 /> 친구에게도 알려주기</Button>
      <Help className="mt-1">{DISCLAIMER} 모든 계산은 이 기기 안에서만 했어요.</Help>
    </AppShell>
  );
}
