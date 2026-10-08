// v2 결과: 카드 3장 — ① 지금 내 상태(판정) ② 또래 100명 중 나 ③ 이대로면 vs 바꾸면(기준선).
// 나머지 자세한 내용은 '모든 항목 보기'(All.tsx). 계산·판정은 view.ts·verdict.ts·lines.ts·peer.ts 그대로.
import { useMemo, useState, type CSSProperties } from 'react';
import type { Input } from '../../../engine/src/engine.ts';
import { useStore, Nav, TabBar, Icon, Crisis } from '../ui.tsx';
import { toInput, suggestScenario, saveRecords, today, type AppInput } from '../state.ts';
import { viewResults } from '../lib/view.ts';
import { verdict, type Verdict } from '../lib/verdict.ts';
import { DISCLAIMER } from '../lib/content.ts';
import { peerCards, type PeerCard } from '../lib/peer.ts';
import { bmiGauge, waistGauge, futureEffects, kgToLowerZone, cmToWaistOk, minWeightDelta, waistCut, type Gauge, type Tone } from '../lib/lines.ts';
import { shareApp } from '../lib/share.ts';

/** 또래의 2배 이상·기준 이상 같은 강한 위험 신호 색 */
const RED = '#cb272f';   // 디자인 Alarm Red

/** 마지막 글자 받침에 맞는 조사 */
export const josa = (w: string, a: string, b: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };

/** 결과가 필요한 화면 공통: 기본정보가 없으면 안내 */
export function useInput(): Input | null { const { draft } = useStore(); return useMemo(() => toInput(draft), [draft]); }
export function NeedInput() {
  return (
    <div className="page fade" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <h1 className="h1">아직 답한 내용이<b>없어요</b></h1>
      <p className="lead">몸 정보와 생활 질문에 답하면 결과를 볼 수 있어요. 약 1분이면 돼요.</p>
      <a className="cta" href="#/start" style={{ marginTop: 20 }}>체크 시작하기</a>
      <a className="link" href="#/record">저장한 기록 보기</a>
    </div>
  );
}

/**
 * 단계별 색: 위험은 빨강(Alarm Red), 관리·습관은 차분한 회색·연초록, 건강은 라임.
 *  ① 지금 바로·오늘 확인 = 빨강 꽉 찬 카드, ② 병원 확인 = 흰 카드 + 빨강 띠·제목
 */
type ToneSet = { bg: string; fg: string; sub: string; tagBg: string; tagFg: string; numBg: string; numFg: string; top?: string };
const TONE: Record<Verdict['tier'], ToneSet> = {
  1: { bg: RED, fg: '#fff', sub: 'rgba(255,255,255,.88)', tagBg: '#fff', tagFg: RED, numBg: RED, numFg: '#fff' },
  2: { bg: '#fff', fg: RED, sub: 'var(--charcoal)', tagBg: RED, tagFg: '#fff', numBg: RED, numFg: '#fff', top: `6px solid ${RED}` },
  5: { bg: 'var(--fog)', fg: 'var(--obsidian)', sub: 'var(--charcoal)', tagBg: 'var(--charcoal)', tagFg: '#fff', numBg: 'var(--charcoal)', numFg: '#fff' },
  3: { bg: 'var(--linen)', fg: 'var(--ink)', sub: 'var(--charcoal)', tagBg: 'var(--ink)', tagFg: 'var(--lime)', numBg: 'var(--ink)', numFg: 'var(--lime)' },
  4: { bg: 'var(--lime)', fg: 'var(--ink)', sub: 'var(--ink)', tagBg: 'var(--ink)', tagFg: 'var(--lime)', numBg: 'var(--ink)', numFg: 'var(--lime)' },
};
const scrollToChange = () => document.getElementById('change')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

/** ① 지금 내 상태: 한 줄 + 할 일. 급한 안내(①)와 병원 확인(②)은 할 일을 모두, 나머지는 하나만 */
function VerdictCard({ v, gap }: { v: Verdict; gap: string }) {
  const t = TONE[v.tier];
  const acts = (v.tier === 1 || v.tier === 2 ? v.actions : v.actions.slice(0, 1))
    // 체중·허리 할 일은 아래 '이대로면 vs 바꾸면' 카드로 (지금 가능성 % 변화 대신 기준선까지 거리)
    .map((a) => (a.href === '#/whatif' ? { ...a, d: gap, href: undefined, change: true } : { ...a, change: false }));
  return (
    <section className="card" aria-label="지금 내 상태" style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 12, background: t.bg, borderTop: t.top, boxShadow: 'var(--card-shadow)' }}>
      <span className="tag" style={{ alignSelf: 'flex-start', background: t.tagBg, color: t.tagFg }}>{v.tag}</span>
      <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.3, fontWeight: 900, letterSpacing: '-0.03em', color: t.fg }}>{v.title}</h2>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: t.sub }}>{v.sub}</p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {acts.map((a, k) => {
          const body = (<>
            <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 9, background: t.numBg, color: t.numFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{k + 1}</span>
            <span className="grow" style={{ textAlign: 'left' }}><b style={{ fontSize: 16, color: 'var(--obsidian)' }}>{a.t}</b>{a.d && <span style={{ display: 'block', fontSize: 13, lineHeight: 1.5, marginTop: 2, color: 'var(--charcoal)' }}>{a.d}</span>}</span>
            {(a.href || a.change) && <span style={{ alignSelf: 'center', color: 'var(--ink)' }}>{a.change ? Icon.down : Icon.right}</span>}
          </>);
          const st: CSSProperties = { display: 'flex', gap: 12, width: '100%', padding: '12px 12px', borderRadius: 14, background: '#fff', textDecoration: 'none', color: 'inherit', font: 'inherit', border: v.tier === 1 ? 0 : '1px solid var(--line2)' };
          return <li key={a.t}>{a.change ? <button type="button" onClick={scrollToChange} style={st}>{body}</button> : a.href ? <a href={a.href} style={st}>{body}</a> : <div style={st}>{body}</div>}</li>;
        })}
      </ol>
      {v.also && <span style={{ fontSize: 13, color: t.sub }}>{v.also}</span>}
    </section>
  );
}

/** 100명 점 그림. rank 가 있으면 낮은 순서로 세운 줄에서 내 자리, 없으면 n명 칠하기 */
function Dots({ rank, n, hot }: { rank?: number; n?: number; hot: boolean }) {
  return (
    <div className="dots100" aria-hidden="true">
      {Array.from({ length: 100 }, (_, k) => {
        const me = rank != null && k === rank - 1, on = n != null && k < n;
        return <i key={k} className={me ? 'me' : on ? 'on' : ''} style={{ animationDelay: `${Math.min(k, rank ?? n ?? 0) * 8}ms`, ...(me && hot ? { background: RED } : {}) } as CSSProperties} />;
      })}
    </div>
  );
}

/** ② 또래 100명 중 나 */
function PeerCardView({ cs }: { cs: PeerCard[] }) {
  const [at, setAt] = useState(0);
  const c = cs[at];
  return (
    <section className="card" aria-label="또래 100명 중 나" style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <b style={{ fontSize: 17, color: 'var(--obsidian)' }}>또래 100명 중 나</b>
        <span className="cap">{c.group}</span>
      </div>
      <div className="seg" role="tablist" aria-label="항목">
        {cs.map((x, k) => <button key={x.id} type="button" role="tab" aria-selected={k === at} aria-pressed={k === at} onClick={() => setAt(k)}>{x.name}</button>)}
      </div>
      <div key={c.id} className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <b style={{ fontSize: 24, lineHeight: 1.25, fontWeight: 900, letterSpacing: '-0.03em', color: c.kind !== 'status' && c.high ? RED : 'var(--ink)' }}>{c.name} · {c.word}</b>
        {c.kind === 'rank' && (<>
          <Dots rank={c.rank} hot={c.high} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate)' }}><span>← 위험 낮은 사람부터</span><span>위험 높은 사람까지 →</span></div>
          <span style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--obsidian)' }}>{c.group} 100명을 위험이 낮은 순서로 세우면 <b>나는 {c.rank}번째</b>예요.</span>
        </>)}
        {c.kind === 'count' && (<>
          <Dots n={c.n} hot={c.high} />
          <span style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--obsidian)' }}>나와 비슷한 조건 100명 중 <b>약 {c.n}명</b>이 해당하는 수준이에요.</span>
        </>)}
        {c.kind === 'status' && <span style={{ fontSize: 14, lineHeight: 1.55 }}>{c.note}</span>}
        {c.kind !== 'status' && (
          <a href={`#/detail/${c.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--bg)', textDecoration: 'none', color: 'var(--charcoal)', fontSize: 13, lineHeight: 1.45 }}>
            <span>지금 {c.name} 가능성 추정 <b style={{ color: 'var(--obsidian)' }}>{c.pct}%</b> · 또래 평균 {c.peer}%<span style={{ display: 'block', fontSize: 11, color: 'var(--slate)' }}>앞으로가 아니라 지금 검사하면 기준에 해당할 가능성 · {c.who} 기준</span></span>
            <span style={{ color: 'var(--ink)' }}>{Icon.right}</span>
          </a>
        )}
        {c.kind === 'status' && <a href={`#/detail/${c.id}`} style={{ fontSize: 13, fontWeight: 700 }}>자세히 보기 →</a>}
      </div>
    </section>
  );
}

const ZONE_BG: Record<Tone, string> = { low: '#e3edf3', ok: 'var(--linen)', mid: '#fbeec9', high: '#fbe1df' };
const ZONE_FG: Record<Tone, string> = { low: 'var(--look)', ok: 'var(--ink)', mid: '#7a5a00', high: RED };
/** 기준선 막대: 구간 색 + 기준선 + 지금(빈 점) → 바꾸면(채운 점). 점은 부드럽게 미끄러진다 */
export function LineBar({ g, changed }: { g: Gauge; changed: boolean }) {
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - g.min) / (g.max - g.min)) * 100))}%`;
  const fmt = (v: number) => (g.key === 'bmi' ? v.toFixed(1) : `${v}cm`);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <b style={{ fontSize: 14, color: 'var(--obsidian)' }}>{g.title}</b>
        <span style={{ fontSize: 13, textAlign: 'right' }}>
          <span style={{ color: changed ? 'var(--slate)' : ZONE_FG[g.nowZone.tone], fontWeight: 700 }}>{fmt(g.now)} {g.nowZone.name}</span>
          {changed && <> → <b style={{ color: ZONE_FG[g.afterZone.tone] }}>{fmt(g.after)} {g.afterZone.name}</b></>}
        </span>
      </div>
      <div className="linebar">
        {g.zones.map((z) => <i key={z.name} className="zone" style={{ left: pos(z.from), width: `calc(${pos(Math.min(z.to, g.max))} - ${pos(z.from)})`, background: ZONE_BG[z.tone] }} />)}
        {g.lines.filter((l) => l > g.min && l < g.max).map((l) => <s key={l} style={{ left: pos(l) }} />)}
        {changed && <b className="dot now" style={{ left: pos(g.now) }} />}
        <b className="dot after" style={{ left: pos(changed ? g.after : g.now) }} />
      </div>
      <div style={{ position: 'relative', height: 14 }}>
        {g.lines.filter((l) => l > g.min && l < g.max).map((l) => <span key={l} style={{ position: 'absolute', left: pos(l), transform: 'translateX(-50%)', fontSize: 10, color: 'var(--slate)' }}>{l}</span>)}
      </div>
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
  return (
    <section id="change" className="card" aria-label="이대로면 vs 바꾸면" style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 14, scrollMarginTop: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <b style={{ fontSize: 17, color: 'var(--obsidian)' }}>이대로면 vs 바꾸면</b>
        <span style={{ fontSize: 12, color: 'var(--slate)' }}>몸무게·허리를 움직이면 기준선을 넘는지 바로 보여드려요</span>
      </div>
      <LineBar g={bg} changed={dw !== 0} />
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>몸무게 <b style={{ color: 'var(--obsidian)' }}>{Math.round((inp.weightKg + dw) * 10) / 10}kg</b></span><span style={{ color: 'var(--slate)' }}>{sign(dw, 'kg')}</span></span>
        <input type="range" aria-label="몸무게 바꿔보기" min={minW} max={5} step={1} value={dw} onChange={(e) => setDw(Number(e.target.value))} />
      </label>
      {wg ? (<>
        <LineBar g={wg} changed={dwa !== 0} />
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>허리 <b style={{ color: 'var(--obsidian)' }}>{wg.after}cm</b></span><span style={{ color: 'var(--slate)' }}>{sign(dwa, 'cm')}</span></span>
          <input type="range" aria-label="허리둘레 바꿔보기" min={-15} max={5} step={1} value={dwa} onChange={(e) => setDwa(Number(e.target.value))} />
        </label>
      </>) : <a href="#/info" style={{ fontSize: 13, fontWeight: 700 }}>허리둘레를 넣으면 복부비만 기준선도 볼 수 있어요 →</a>}
      {(chips.length > 0 || changed) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {chips.map(([t, f]) => <button key={t} type="button" className="chip" onClick={f}>{t}</button>)}
          {changed && <button type="button" className="chip ghost" onClick={() => { setDw(0); setDwa(0); }}>처음 값으로</button>}
        </div>
      )}
      {!changed && <span style={{ fontSize: 13, lineHeight: 1.5, padding: '10px 12px', borderRadius: 12, background: 'var(--bg)' }}>{[bg.gap, wg?.gap].filter(Boolean).join(' · ')}</span>}
      {effects.map((e) => (
        <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', borderRadius: 14, background: e.dir === 'down' ? 'var(--linen)' : e.dir === 'up' ? '#fdecea' : 'var(--bg)' }}>
          <b style={{ fontSize: 14, color: 'var(--obsidian)' }}>{e.title}</b>
          <span style={{ fontSize: 15 }}>이대로면 <b style={{ color: 'var(--obsidian)' }}>{e.before}</b>{changed && <> → 바꾸면 <b style={{ fontSize: 20, color: e.dir === 'down' ? 'var(--ink)' : e.dir === 'up' ? RED : 'var(--obsidian)' }}>{e.after}</b></>}</span>
          <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--slate)' }}>{changed ? e.note : e.id === 'dm10' ? `비슷한 위험 점수였던 사람 중 10년 안에 당뇨가 생긴 비율이에요. 허리 ${waistCut(inp.sex)}cm 기준선에서 바뀌어요.` : '비슷한 점수였던 사람 중 4년 안에 고혈압이 생긴 비율이에요. BMI 25·30 기준선에서 바뀌어요.'}</span>
        </div>
      ))}
      {hints.map((h) => <span key={h} style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--slate)' }}>· {h}</span>)}
      <span style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--slate)' }}>기준선은 대한비만학회 기준, 미래 위험은 한국인 추적 연구의 점수표(기간 그대로)예요. 참고값이며 실제로 줄였을 때의 치료 효과를 보장하지 않아요.</span>
    </section>
  );
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
    <div className="app">
      <div className="page fade">
        <Nav title="내 결과" sub={`${today()} · ${r.who}`} right={<button className="circle" aria-label="친구에게 알려주기" onClick={() => shareApp(toast)}>{Icon.share}</button>} />
        {r.crisis && <Crisis />}
        <VerdictCard v={v} gap={gap} />
        <PeerCardView cs={peerCards(inp)} />
        <ChangeCard inp={inp} />

        <a className="card" href="#/labs" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit', background: 'var(--ink)' }}>
          <span className="grow"><b style={{ fontSize: 16, color: '#fff' }}>검진 결과지가 있나요?</b><span style={{ display: 'block', fontSize: 13, lineHeight: 1.5, color: '#d8e8cf' }}>숫자를 넣으면 하나씩 쉽게 풀어 드려요. 결과도 더 정확해져요.</span></span>
          <span style={{ color: 'var(--lime)' }}>{Icon.right}</span>
        </a>
        <div className="card" style={{ padding: '4px 18px' }}>
          {([['#/all', '모든 항목 보기', '콜레스테롤·골다공증·생활 체크·근거'], ['#/summary', '진료용 요약 저장', '인쇄하거나 PDF로 저장']] as const).map(([h, t, s]) => (
            <a key={h} href={h} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 60, borderBottom: '1px solid var(--line)', textDecoration: 'none', color: 'inherit' }}>
              <span className="grow"><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{t}</b><span style={{ display: 'block', fontSize: 12, color: 'var(--slate)' }}>{s}</span></span><span style={{ color: 'var(--ink)' }}>{Icon.right}</span>
            </a>
          ))}
          <button type="button" onClick={save} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 60, border: 0, background: 'transparent', padding: 0, textAlign: 'left', font: 'inherit', color: 'inherit' }}>
            <span className="grow"><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>이 기기에 기록 저장</b><span style={{ display: 'block', fontSize: 12, color: 'var(--slate)' }}>몇 달 뒤 다시 체크하면 달라진 만큼 비교해요</span></span><span style={{ color: 'var(--ink)' }}>{Icon.save}</span>
          </button>
        </div>
        <button type="button" className="cta outline" onClick={() => shareApp(toast)}>{Icon.share} 친구에게도 알려주기</button>
        <p className="help" style={{ margin: '4px 4px 0' }}>{DISCLAIMER} 모든 계산은 이 기기 안에서만 했어요.</p>
      </div>
      <TabBar at="result" />
    </div>
  );
}
