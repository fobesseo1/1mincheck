// v2 결과: 카드 3장 — ① 지금 내 상태(판정) ② 또래 100명 중 나 ③ 이대로면 vs 바꾸면(기준선).
// 나머지 자세한 내용은 '모든 항목 보기'(All.tsx). 계산·판정은 view.ts·verdict.ts·lines.ts·peer.ts 그대로. 디자인: docs/DESIGN.md
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, FileText, Bookmark, Share2, ClipboardList, LayoutList, RotateCcw, TriangleAlert, TrendingDown, TrendingUp, Equal } from 'lucide-react';
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
const TIER: Record<Verdict['tier'], { card: string; title: string; sub: string; num: string; row: string }> = {
  1: { card: 'bg-risk text-white', title: 'text-white', sub: 'text-white/90', num: 'bg-risk text-white', row: 'bg-white' },
  2: { card: 'bg-white', title: 'text-risk', sub: 'text-ink-soft', num: 'bg-risk-bg text-risk', row: 'bg-sand-soft' },
  5: { card: 'bg-sand-soft', title: 'text-ink', sub: 'text-ink-soft', num: 'bg-ink text-white', row: 'bg-white' },
  3: { card: 'bg-white', title: 'text-ink', sub: 'text-ink-soft', num: 'bg-brand text-white', row: 'bg-sand-soft' },
  4: { card: 'bg-good-bg', title: 'text-good', sub: 'text-ink-soft', num: 'bg-good text-white', row: 'bg-white' },
};
const scrollToChange = () => document.getElementById('change')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

/** ① 지금 내 상태: 작은 꼬리표 → 한 줄(크게) → 설명 → 할 일. 급한 안내(①)와 병원 확인(②)은 할 일을 모두, 나머지는 하나만 */
export function VerdictCard({ v, gap }: { v: Verdict; gap: string }) {
  const t = TIER[v.tier];
  const acts = (v.tier === 1 || v.tier === 2 ? v.actions : v.actions.slice(0, 1))
    // 체중·허리 할 일은 아래 '줄이면' 카드로 (지금 가능성 % 변화 대신 기준선까지 거리)
    .map((a) => (a.href === '#/whatif' ? { ...a, d: gap, href: undefined, change: true } : { ...a, change: false }));
  return (
    <section aria-label="지금 내 상태" className={cn('flex flex-col gap-4 rounded-card p-5 shadow-card', t.card)}>
      <div className="flex flex-col gap-2">
        <span className={cn('text-body-sm font-medium', t.sub)}>지금 내 상태 · {v.tag}</span>
        <h2 className={cn('text-[24px] leading-[1.3] font-semibold', t.title)}>{v.title}</h2>
        <p className={cn('whitespace-pre-line text-body', t.sub)}>{v.sub}</p>
      </div>
      <ol className="flex flex-col gap-2">
        {acts.map((a, k) => {
          const body = (<>
            <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-semibold', t.num)}>{k + 1}</span>
            <span className="flex-1 text-left"><b className="block text-body font-semibold text-ink">{a.t}</b>{a.d && <span className="mt-0.5 block whitespace-pre-line text-body-sm text-ink-soft">{a.d}</span>}</span>
            {a.change ? <ChevronDown className="size-5 shrink-0 self-center text-ink-soft" /> : a.href ? <ChevronRight className="size-5 shrink-0 self-center text-ink-soft" /> : null}
          </>);
          const cls = cn('flex w-full items-start gap-3 rounded-btn p-3.5 text-ink no-underline', t.row);
          return <li key={a.t}>{a.change ? <button type="button" onClick={scrollToChange} className={cn(cls, 'cursor-pointer')}>{body}</button> : a.href ? <a href={a.href} className={cls}>{body}</a> : <div className={cls}>{body}</div>}</li>;
        })}
      </ol>
      {v.also && <span className={cn('text-body-sm', t.sub)}>{v.also}</span>}
    </section>
  );
}

const LEVEL_TONE: Record<string, { tone?: Tone; text: string; Icon: typeof TrendingDown }> = {
  '또래보다 높은 편': { tone: 'high', text: 'text-risk', Icon: TrendingUp },
  '또래와 비슷한 편': { text: 'text-ink', Icon: Equal },
  '또래보다 낮은 편': { tone: 'ok', text: 'text-good', Icon: TrendingDown },
};

/**
 * 또래 비교 한 항목. 위계: ① 한 줄(또래 100명 중 몇 번째, 크게) ② 점 100개 ③ 내 추정·또래 평균 숫자 ④ 기준은 접어 둔다.
 * 점 100개는 '또래 중 위치'만 뜻한다(질환 가능성의 비율을 같은 그림으로 그리지 않는다). 순위가 없으면 또래 평균과 비교한 한 줄.
 */
export function PeerPanel({ c }: { c: PeerCard }) {
  if (c.kind === 'status') return (
    <div className="flex flex-col gap-2">
      <span className="text-body-sm text-ink-soft">{c.name}</span>
      <b className="text-[22px] leading-[1.3] font-semibold">{c.word}</b>
      <span className="text-body text-ink-soft">{c.note}</span>
      <a href={`#/detail/${c.id}`} className="text-body-sm font-medium text-brand">자세히 보기</a>
    </div>
  );
  const L = LEVEL_TONE[c.level] ?? LEVEL_TONE['또래와 비슷한 편'];
  const st = c.kind === 'rank' ? standing(c.rank) : null;
  return (
    <div className="flex flex-col gap-4">
      {st && c.kind === 'rank' ? (
        <div className="flex flex-col gap-3">
          <p className="flex flex-col gap-1">
            <span className="text-body text-ink-soft">또래 100명 중,</span>
            <b className="text-[24px] leading-[1.3] font-semibold">{c.name} 위험성이<br /><span className={cn('tabular-nums', st.dir === '높아요' ? 'text-risk' : 'text-good')}>{st.n}번째로 {st.dir}</span></b>
          </p>
          <Dots rank={c.rank} hot={c.high} tone={st.dir === '높아요' ? 'high' : 'ok'} />
          <div className="-mt-1 flex justify-between text-caption text-ink-soft"><span>위험 낮은 쪽</span><span>위험 높은 쪽</span></div>
        </div>
      ) : (
        <p className="flex flex-col gap-1">
          <span className="text-body text-ink-soft">{c.name} 가능성</span>
          <b className={cn('text-[24px] leading-[1.3] font-semibold', L.text)}>{c.level}</b>
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5 rounded-btn bg-sand-soft px-3.5 py-3"><span className="text-body-sm text-ink-soft">내 추정 가능성</span><b className="text-[22px] font-semibold tabular-nums">{c.pct}%</b></div>
        <div className="flex flex-col gap-0.5 rounded-btn bg-sand-soft px-3.5 py-3"><span className="text-body-sm text-ink-soft">또래 평균</span><b className="text-[22px] font-semibold tabular-nums text-ink-soft">{c.peer}%</b></div>
      </div>
      <details className="group text-body-sm text-ink-soft">
        <summary className="flex items-center gap-1 font-medium text-ink">이 숫자는 어떻게 계산했나요 <ChevronDown className="size-4 transition-transform group-open:rotate-180" /></summary>
        <p className="mt-2 leading-relaxed">{c.kind === 'rank' ? `같은 성별·나이(±5세)이고 아직 진단받지 않은 또래를 ${c.name} 위험성 순서로 세웠을 때의 위치예요. 실제로 100명을 검사한 결과가 아니에요. ` : ''}추정 가능성은 지금 검사하면 기준에 해당할 가능성이고, 또래 평균은 {c.who} 기준이에요.</p>
      </details>
    </div>
  );
}

/** ② 또래 비교 (결과 화면) */
export function PeerCardView({ cs, initial }: { cs: PeerCard[]; initial?: string }) {
  return (
    <Card aria-label="또래 비교" className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-[18px] font-semibold">또래 비교</h2>
        <span className="text-body-sm text-ink-soft">{cs[0].group}</span>
      </div>
      <Tabs defaultValue={initial ?? cs[0].id}>
        <TabsList aria-label="항목">{cs.map((x) => <TabsTrigger key={x.id} value={x.id}>{x.name}</TabsTrigger>)}</TabsList>
        {cs.map((c) => (
          <TabsContent key={c.id} value={c.id} className="flex flex-col gap-3 pt-2">
            <PeerPanel c={c} />
            {c.kind !== 'status' && <a href={`#/detail/${c.id}`} className="flex items-center gap-1 text-body-sm font-medium text-brand">{c.name} 자세히 보기 <ChevronRight className="size-4" /></a>}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}

/** 기준선 막대 (shadcn Progress 위에 기준선) */
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

/** 막대 하나 = 손잡이 하나. 큰 숫자(kg·cm) 옆에 바뀐 만큼, 오른쪽에 지금 구간(글자 색 하나) */
function DragBar({ title, unit, now, value, onChange, track, sub }: { title: string; unit: string; now: number; value: number; onChange: (v: number) => void; track: Track; sub?: string }) {
  const z = toneAt(track, value), d = Math.round((value - now) * 10) / 10;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-body-sm text-ink-soft">{title}</span>
          <b className="text-[30px] leading-none font-semibold tabular-nums">{value}<small className="ml-0.5 text-body font-normal text-ink-soft">{unit}</small>
            {d !== 0 && <span className={cn('ml-2 text-body font-semibold', d < 0 ? 'text-good' : 'text-risk')}>{`${d > 0 ? '+' : '−'}${Math.abs(d)}${unit}`}</span>}</b>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className={cn('text-body font-semibold', TONE_TEXT[z.tone])}>{z.name}</span>
          {sub && <span className="text-caption text-ink-soft">{sub}</span>}
        </div>
      </div>
      <ZoneSlider label={`${title} 바꿔보기`} valueText={`${value}${unit}`} min={track.min} max={track.max} value={value} onChange={onChange} zones={track.zones} now={now} normal={track.normal} cut={track.cut} tone={z.tone} />
    </div>
  );
}

type Row = { k: string; name: string; b: string; a: string; dir: 'down' | 'up' | 'same' };
/** 나쁜 정도: 정상 0 · 저체중 1 · 비만 전단계 2 · 1–3단계 비만 3–5 (색이 같아도 단계가 오르면 나빠짐) */
const ZRANK: Record<string, number> = { 정상: 0, 저체중: 1, '비만 전단계': 2, '1단계 비만': 3, '2단계 비만': 4, '3단계 비만': 5, 복부비만: 3 };
/** 두 확률의 차이(%p). '23.4%' 같은 한 값일 때만 (범위면 null) */
const ppDiff = (b: string, a: string) => { const x = /^(\d+(?:\.\d+)?)%$/.exec(b), y = /^(\d+(?:\.\d+)?)%$/.exec(a); return x && y ? Math.round((parseFloat(y[1]) - parseFloat(x[1])) * 10) / 10 : null; };

/**
 * ③ 몸무게·허리를 줄이면, 위험도는? — 몸무게·허리를 따로 움직이면, 같은 조건에서 바꾼 몸 정보로 계산한 예측값을 변경 전 → 변경 후로 보여준다.
 * 값은 lines.ts(원문 점수표) 그대로이고 보간하지 않는다. anchor: 결과 화면에서 할 일 버튼이 내려오는 자리(랜딩에서는 null)
 */
export function ChangeCard({ inp, anchor = 'change', example, heading = true, start, demo }: { inp: Input; anchor?: string | null; example?: string; heading?: boolean; start?: { dw?: number; dwa?: number };
  /** 랜딩 시연: 화면에 보이면 [몸무게 변화, 허리 변화]를 차례로 보여 주고, 사람이 손대면 멈춘다 */
  demo?: [number, number][] }) {
  const [w, setW0] = useState(inp.weightKg + (start?.dw ?? 0)), [wa, setWa0] = useState((inp.waistCm ?? 0) + (inp.waistCm == null ? 0 : start?.dwa ?? 0));
  const box = useRef<HTMLDivElement>(null), touched = useRef(false);
  const setW = (v: number) => { touched.current = true; setW0(v); }, setWa = (v: number) => { touched.current = true; setWa0(v); };
  useEffect(() => {
    const el = box.current; if (!demo || !el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0;
    const step = (k: number) => { setW0(inp.weightKg + demo[k][0]); if (inp.waistCm != null) setWa0(inp.waistCm + demo[k][1]); };
    const io = new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (!e.isIntersecting || touched.current) return;
      let k = 0; step(0);
      timer = window.setInterval(() => { k++; if (touched.current || k >= demo.length) { clearInterval(timer); return; } step(k); }, 1400);
    }, { threshold: 0.55 });
    io.observe(el);
    return () => { io.disconnect(); clearInterval(timer); };
  }, [demo, inp]);
  const wt = weightTrack(inp), wat = waistTrack(inp);
  const dw = Math.round((w - inp.weightKg) * 10) / 10, dwa = inp.waistCm == null ? 0 : Math.round((wa - inp.waistCm) * 10) / 10;
  const changed = dw !== 0 || dwa !== 0;
  const bg = bmiGauge(inp, dw), wg = waistGauge(inp, dwa), { effects, hints } = futureEffects(inp, dw, dwa);
  const down = dw <= 0 && dwa <= 0, up = dw >= 0 && dwa >= 0, verb = down ? '줄이면?' : up ? '늘리면?' : '바꾸면?';
  const amt = (d: number, u: string) => (down || up ? `${Math.abs(d)}${u}` : `${d > 0 ? '+' : '−'}${Math.abs(d)}${u}`);
  const title = !changed ? '막대를 움직여 보세요'
    : dw && dwa ? `허리둘레 ${amt(dwa, 'cm')}·몸무게 ${amt(dw, 'kg')}을 ${verb}` : dwa ? `허리둘레를 ${amt(dwa, 'cm')} ${verb}` : `몸무게를 ${amt(dw, 'kg')} ${verb}`;
  const zdir = (b: string, a: string): Row['dir'] => (ZRANK[a] < ZRANK[b] ? 'down' : ZRANK[a] > ZRANK[b] ? 'up' : 'same');
  const rows: Row[] = [
    { k: 'bmi', name: '비만도', b: bg.nowZone.name, a: bg.afterZone.name, dir: zdir(bg.nowZone.name, bg.afterZone.name) },
    ...(wg ? [{ k: 'waist', name: '복부비만', b: wg.nowZone.tone === 'high' ? '해당' : '아님', a: wg.afterZone.tone === 'high' ? '해당' : '아님', dir: zdir(wg.nowZone.name, wg.afterZone.name) }] : []),
    ...effects.map((e): Row => ({ k: e.id, name: e.id === 'dm10' ? '10년 안에 당뇨가\n생길 위험' : '4년 안에 고혈압이\n생길 위험', b: e.before, a: e.after, dir: e.dir })),
  ];
  const worse = rows.some((r) => r.dir === 'up'), better = rows.some((r) => r.dir === 'down');
  // 좋아진 것을 구체적으로: 복부비만 → 비만도 → 당뇨 → 고혈압 순서로 하나
  const won = ((d) => !d ? '' : d.k === 'waist' ? '복부비만에서 벗어났어요' : d.k === 'bmi' ? `${d.a}${josa(d.a, '으로', '로')} 내려왔어요` : d.k === 'dm10' ? '당뇨가 생길 위험이 줄었어요' : '고혈압이 생길 위험이 줄었어요')(
    ['waist', 'bmi', 'dm10', 'htn4'].map((k) => rows.find((r) => r.k === k && r.dir === 'down')).find(Boolean));
  const reset = () => { setW(inp.weightKg); setWa(inp.waistCm ?? 0); };
  return (
    <div ref={box}>
    <Card id={anchor ?? undefined} aria-label="몸무게·허리를 줄이면, 위험도는?" className="flex scroll-mt-20 flex-col gap-5 p-5 text-left">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          {example && <Badge variant="soft" className="self-start">{example}</Badge>}
          {heading && <h2 className="text-[18px] font-semibold">몸무게·허리를 줄이면, 위험도는?</h2>}
        </div>
        {changed && <Button variant="ghost" size="icon" className="size-9 shrink-0 bg-sand-soft" aria-label="처음 값으로" onClick={reset}><RotateCcw /></Button>}
      </div>
      <DragBar title="몸무게" unit="kg" now={inp.weightKg} value={w} onChange={setW} track={wt} sub={`BMI ${bg.after.toFixed(1)}`} />
      {wat ? <DragBar title="허리둘레" unit="cm" now={inp.waistCm!} value={wa} onChange={setWa} track={wat} />
        : <a href="#/info" className="text-body-sm font-medium text-brand">허리둘레를 넣으면 복부비만 기준선도 볼 수 있어요</a>}

      <div className="flex flex-col rounded-card bg-brand p-5 text-white" aria-live="polite">
        <b className="mb-2 text-[18px] leading-snug font-semibold">{title}</b>
        {rows.map((r) => {
          const pp = changed ? ppDiff(r.b, r.a) : null, moved = changed && r.b !== r.a;
          return (
            <div key={r.k} className="flex items-center justify-between gap-3 border-t border-white/10 py-3 first-of-type:border-t-0">
              <span className="whitespace-pre-line text-body leading-snug text-white/80">{r.name}</span>
              <span className="flex flex-col items-end">
                <span className="flex items-baseline gap-2 whitespace-nowrap tabular-nums">
                  {moved && <><s className="text-body-sm text-white/45">{r.b}</s><ChevronRight className="size-4 self-center text-white/45" /></>}
                  <CountTo text={changed ? r.a : r.b} className={cn('text-[22px] font-semibold', !moved ? 'text-white' : r.dir === 'down' ? 'text-lime' : r.dir === 'up' ? 'text-[#ff9db0]' : 'text-white')} />
                </span>
                {pp != null && pp !== 0 && <span className="text-caption text-white/60 tabular-nums">{pp > 0 ? '+' : '−'}{Math.abs(pp)}%p</span>}
              </span>
            </div>
          );
        })}
        {changed && worse && <span className="mt-2 flex items-center gap-1.5 self-start rounded-full bg-risk px-3 py-1.5 text-body-sm font-medium text-white"><TriangleAlert className="size-4" /> 위험이 높아져요</span>}
        {changed && !worse && better && <span className="mt-2 flex items-center gap-1.5 self-start rounded-full bg-lime px-3 py-1.5 text-body-sm font-medium text-brand"><TrendingDown className="size-4" /> {won}</span>}
        {changed && !worse && !better && <span className="mt-1 text-body-sm text-white/75">아직 기준을 넘지 않아서<br />결과는 그대로예요.</span>}
      </div>
      <details className="group text-body-sm text-ink-soft">
        <summary className="flex items-center gap-1 font-medium text-ink">이 값을 읽는 법 <ChevronDown className="size-4 transition-transform group-open:rotate-180" /></summary>
        <p className="mt-2 leading-relaxed">같은 조건에서 몸무게·허리둘레만 바꿔 계산한 예측값이에요. 개인의 실제 변화에는 생활습관과 건강 상태 등 여러 요인이 영향을 줘요. 향후 발생 위험은 한국인 추적 연구의 점수표라, 허리 기준선(남 90·여 85cm)이나 BMI 25·30을 넘을 때 계단처럼 바뀌어요. 기간은 연구 그대로(10년·4년)예요. 체형 구간은 대한비만학회 기준이에요.{effects.some((e) => e.before.includes('–')) ? ' 혈압을 몰라 당뇨 위험은 범위로 보여드려요.' : ''}</p>
        {hints.map((h) => <p key={h} className="mt-1.5 leading-relaxed">{h}</p>)}
      </details>
    </Card>
    </div>
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

/** 결과 화면 ①카드에 넣는 값 (랜딩 예시도 같은 함수) */
export function verdictOf(inp: Input) {
  const sc = suggestScenario(inp), r = viewResults(inp, sc), v = verdict(inp as AppInput, r, sc);
  const bg = bmiGauge(inp, 0), wg = waistGauge(inp, 0);
  const gap = (v.actions.find((a) => a.href === '#/whatif')?.t.includes('허리') ? wg?.gap : bg.gap) ?? bg.gap;
  return { r, v, gap };
}

export function Results() {
  const { records, setRecords, toast } = useStore();
  const inp = useInput();
  if (!inp) return <NeedInput />;
  const { r, v, gap } = verdictOf(inp);
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
        <LinkRow onClick={save} icon={<Bookmark />} title="이 기기에 기록 저장" sub="몇 달 뒤 다시 체크하면, 달라진 만큼 비교해 드려요" />
      </Card>
      <Button variant="outline" size="lg" className="w-full" onClick={() => shareApp(toast)}><Share2 /> 친구에게도 알려주기</Button>
      <Help className="mt-1">{DISCLAIMER}</Help>
    </AppShell>
  );
}
