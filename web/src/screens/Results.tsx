// v2 결과: 카드 3장 — ① 지금 내 상태(판정) ② 또래 100명 중 나 ③ 이대로면 vs 바꾸면(기준선).
// 나머지 자세한 내용은 '모든 항목 보기'(All.tsx). 계산·판정은 view.ts·verdict.ts·lines.ts·peer.ts 그대로. 디자인: docs/DESIGN.md
import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, FileText, Bookmark, Share2, ClipboardList, LayoutList, RotateCcw, TriangleAlert, TrendingDown } from 'lucide-react';
import type { Input } from '../../../engine/src/engine.ts';
import { useStore, Nav, Crisis, AppShell, Help } from '../ui.tsx';
import { toInput, suggestScenario, saveRecords, today, type AppInput } from '../state.ts';
import { viewResults } from '../lib/view.ts';
import { verdict, type Verdict } from '../lib/verdict.ts';
import { DISCLAIMER } from '../lib/content.ts';
import { peerCards, standing, type PeerCard } from '../lib/peer.ts';
import { bmiGauge, waistGauge, futureEffects, weightTrack, waistTrack, toneAt, type Gauge, type Track } from '../lib/lines.ts';
import { shareApp } from '../lib/share.ts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoneSlider } from '@/components/ui/zone-slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ZoneGauge, Dots, CountTo, TONE_TEXT, type Tone } from '@/components/viz';
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

/** 또래 결과의 뜻 색: 위험한 쪽 1/3 = 위험(또래 평균보다 크게 높으면) 또는 주의, 좋은 쪽 1/3 = 좋음, 가운데 = 잉크 */
const peerTone = (c: PeerCard): Tone | null => {
  if (c.kind === 'status') return null;
  if (c.kind === 'count') return c.high ? 'high' : null;
  return c.rank >= 67 ? (c.high ? 'high' : 'mid') : c.rank <= 33 ? 'ok' : null;
};

/** ② 또래 100명 중 나: '100명 중'(작게) + 'N번째로 위험/좋음'(크게) */
function PeerCardView({ cs }: { cs: PeerCard[] }) {
  return (
    <Card aria-label="또래 100명 중 나" className="p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[19px] font-medium">또래 100명 중 나</h2>
        <span className="text-caption text-ink-soft">{cs[0].group}</span>
      </div>
      <Tabs defaultValue={cs[0].id}>
        <TabsList aria-label="항목">{cs.map((x) => <TabsTrigger key={x.id} value={x.id}>{x.name}</TabsTrigger>)}</TabsList>
        {cs.map((c) => {
          const t = peerTone(c), col = t ? TONE_TEXT[t] : 'text-ink';
          return (
            <TabsContent key={c.id} value={c.id} className="flex flex-col gap-3">
              {c.kind === 'rank' && (() => { const st = standing(c.rank); return (<>
                <div className="flex flex-col">
                  <span className="text-body-sm text-ink-soft">{c.name} · {c.group} 100명 중</span>
                  <b className={cn('text-heading font-medium', col)}>{st.n}번째로 {st.side}</b>
                </div>
                <Dots rank={c.rank} hot={c.high} tone={t ?? undefined} />
                <div className="flex justify-between text-[11px] text-ink-soft"><span>좋은 사람</span><span>위험한 사람</span></div>
              </>); })()}
              {c.kind === 'count' && (<>
                <div className="flex flex-col">
                  <span className="text-body-sm text-ink-soft">{c.name} · 나와 비슷한 조건 100명 중</span>
                  <b className={cn('text-heading font-medium', col)}>약 {c.n}명</b>
                </div>
                <Dots n={c.n} hot={c.high} tone={t ?? undefined} />
              </>)}
              {c.kind === 'status' && (<>
                <b className="text-subheading font-medium">{c.name} · {c.word}</b>
                <span className="text-body-sm text-ink-soft">{c.note}</span>
              </>)}
              {c.kind !== 'status' ? (
                <a href={`#/detail/${c.id}`} className="flex items-center justify-between gap-3 rounded-btn bg-sand-soft px-3.5 py-3 text-body-sm text-ink-soft no-underline">
                  <span>지금 {c.name} 가능성 <b className="text-ink">{c.pct}%</b> · 또래 평균 {c.peer}%<span className="mt-0.5 block text-[11px]">지금 검사하면 기준에 해당할 가능성 · {c.who} 기준</span></span>
                  <ChevronRight className="size-5 shrink-0 text-brand" />
                </a>
              ) : <a href={`#/detail/${c.id}`} className="text-body-sm font-medium text-brand">자세히 보기</a>}
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
}

/** 기준선 막대 (shadcn Progress 위에 기준선): 랜딩 예시 등에서 쓴다 */
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

const BADGE_OF = { ok: 'good', low: 'info', mid: 'warn', high: 'risk', urgent: 'risk' } as const;
/** 막대 하나 = 손잡이 하나. 큰 숫자(kg·cm)와 구간 이름이 내 구간 색으로 바뀐다 */
function DragBar({ title, unit, now, value, onChange, track, sub }: { title: string; unit: string; now: number; value: number; onChange: (v: number) => void; track: Track; sub?: string }) {
  const z = toneAt(track, value), d = Math.round((value - now) * 10) / 10;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-body-sm text-ink-soft">{title}</span>
          <b className="text-heading font-medium leading-none">{value}<small className="ml-0.5 text-body font-normal text-ink-soft">{unit}</small>
            {d !== 0 && <span className={cn('ml-2 text-body font-medium', d < 0 ? 'text-good' : 'text-risk')}>{d > 0 ? '+' : '−'}{Math.abs(d)}{unit}</span>}</b>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={BADGE_OF[z.tone]}>{z.name}</Badge>
          {sub && <span className="text-[11px] text-ink-soft">{sub}</span>}
        </div>
      </div>
      <ZoneSlider label={`${title} 바꿔보기`} min={track.min} max={track.max} value={value} onChange={onChange} zones={track.zones} now={now} normal={track.normal} cut={track.cut} tone={z.tone} />
    </div>
  );
}

type Row = { k: string; name: string; b: string; a: string; dir: 'down' | 'up' | 'same' };
/** 나쁜 정도: 정상 0 · 저체중 1 · 비만 전단계 2 · 1–3단계 비만 3–5 (색이 같아도 단계가 오르면 나빠짐) */
const ZRANK: Record<string, number> = { 정상: 0, '기준 아래': 0, 저체중: 1, '비만 전단계': 2, '1단계 비만': 3, '2단계 비만': 4, '3단계 비만': 5, 복부비만: 3 };
/** ③ 이대로면 vs 바꾸면 (홍보영상의 '만약 … 줄이면?' 장면): 막대를 끌면 아래 숫자가 이전 값 → 새 값으로 세어진다 */
export function ChangeCard({ inp }: { inp: Input }) {
  const [w, setW] = useState(inp.weightKg), [wa, setWa] = useState(inp.waistCm ?? 0);
  const wt = weightTrack(inp), wat = waistTrack(inp);
  const dw = Math.round((w - inp.weightKg) * 10) / 10, dwa = inp.waistCm == null ? 0 : Math.round((wa - inp.waistCm) * 10) / 10;
  const changed = dw !== 0 || dwa !== 0;
  const bg = bmiGauge(inp, dw), wg = waistGauge(inp, dwa), { effects, hints } = futureEffects(inp, dw, dwa);
  const parts = [dwa && `허리 ${dwa > 0 ? '+' : '−'}${Math.abs(dwa)}cm`, dw && `체중 ${dw > 0 ? '+' : '−'}${Math.abs(dw)}kg`].filter(Boolean) as string[];
  const verb = dw <= 0 && dwa <= 0 ? '줄이면?' : dw >= 0 && dwa >= 0 ? '늘리면?' : '바꾸면?';
  const zdir = (b: string, a: string): Row['dir'] => (ZRANK[a] < ZRANK[b] ? 'down' : ZRANK[a] > ZRANK[b] ? 'up' : 'same');
  // 영상처럼: 항목 이름 · 이전 값(줄 긋기) → 새 값(크게). 좋아지면 라임, 나빠지면 위험색
  const rows: Row[] = [
    { k: 'bmi', name: '체형', b: bg.nowZone.name, a: bg.afterZone.name, dir: zdir(bg.nowZone.name, bg.afterZone.name) },
    ...(wg ? [{ k: 'waist', name: '복부비만', b: wg.nowZone.tone === 'high' ? '해당' : '아님', a: wg.afterZone.tone === 'high' ? '해당' : '아님', dir: zdir(wg.nowZone.name, wg.afterZone.name) }] : []),
    ...effects.map((e): Row => ({ k: e.id, name: e.id === 'dm10' ? '10년 안에 당뇨' : '4년 안에 고혈압', b: e.before, a: e.after, dir: e.dir })),
  ];
  const worse = rows.some((r) => r.dir === 'up'), better = rows.some((r) => r.dir === 'down');
  const reset = () => { setW(inp.weightKg); setWa(inp.waistCm ?? 0); };
  return (
    <Card id="change" aria-label="이대로면 vs 바꾸면" className="flex scroll-mt-3 flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[19px] font-medium">이대로면 vs 바꾸면</h2>
          <span className="text-caption text-ink-soft">막대를 끌어 몸무게·허리를 바꿔 보세요</span>
        </div>
        {changed && <Button variant="ghost" size="icon" className="size-9 shrink-0 bg-sand-soft" aria-label="처음 값으로" onClick={reset}><RotateCcw /></Button>}
      </div>
      <DragBar title="몸무게" unit="kg" now={inp.weightKg} value={w} onChange={setW} track={wt} sub={`BMI ${bg.after.toFixed(1)}`} />
      {wat ? <DragBar title="허리둘레" unit="cm" now={inp.waistCm!} value={wa} onChange={setWa} track={wat} />
        : <a href="#/info" className="text-body-sm font-medium text-brand">허리둘레를 넣으면 복부비만 기준선도 볼 수 있어요</a>}

      <div className="flex flex-col gap-3 rounded-card bg-brand p-5 text-white">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[19px] font-medium">
          만약 <span className={cn('rounded-full px-3 py-0.5 text-body font-medium text-brand', verb === '늘리면?' ? 'bg-[#ff9db0]' : 'bg-lime')}>{parts.length ? parts.join(' · ') : '막대를 움직여 보세요'}</span> {verb}
        </div>
        {rows.map((r) => (
          <div key={r.k} className={cn('flex items-center justify-between gap-3 rounded-btn px-4 py-3 transition-colors', changed && r.dir === 'down' ? 'bg-white/15' : changed && r.dir === 'up' ? 'bg-risk-dot/30' : 'bg-white/5')}>
            <span className="text-body-sm text-white/85">{r.name}</span>
            <span className="flex items-baseline gap-2 whitespace-nowrap">
              {changed && r.b !== r.a && <><s className="text-body-sm text-white/45">{r.b}</s><ChevronRight className="size-4 self-center text-white/45" /></>}
              <CountTo text={changed ? r.a : r.b} className={cn('text-subheading font-medium', !changed || r.dir === 'same' ? 'text-white' : r.dir === 'down' ? 'text-lime' : 'text-[#ff9db0]')} />
            </span>
          </div>
        ))}
        {changed && worse && <span className="flex items-center gap-1.5 self-start rounded-full bg-risk px-3 py-1.5 text-body-sm font-medium text-white"><TriangleAlert className="size-4" /> 이렇게 되면 위험이 커져요</span>}
        {changed && !worse && better && <span className="flex items-center gap-1.5 self-start rounded-full bg-lime px-3 py-1.5 text-body-sm font-medium text-brand"><TrendingDown className="size-4" /> 기준선 안쪽으로 들어왔어요</span>}
        {changed && !worse && !better && <span className="text-caption text-white/70">아직 기준선을 넘지 않아 결과가 그대로예요. 조금 더 움직여 보세요.</span>}
        {effects.some((e) => e.before.includes('–')) && <span className="text-[11px] text-white/60">혈압을 몰라 당뇨 위험은 범위로 보여드려요.</span>}
      </div>
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
      <Help className="mt-1">{DISCLAIMER}</Help>
    </AppShell>
  );
}
