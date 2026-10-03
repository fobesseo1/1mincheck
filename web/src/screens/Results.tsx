import { useMemo, type ReactNode } from 'react';
import type { Input } from '../../../engine/src/engine.ts';
import { useStore, Nav, TabBar, Ring, Gauge, Icon, Crisis } from '../ui.tsx';
import type { AppInput } from '../state.ts';
import { probB, reasonOf, scopeOf, goodHabits, verdictB, B_NAME, type ProbRow } from '../lib/b.ts';
import { toInput, suggestScenario, saveRecords, today, drinkOf } from '../state.ts';
import { runExtras } from '../../../engine/src/extras.ts';
import { ExtraCards } from './Extras.tsx';
import { DevNote } from './DevNote.tsx';
import { viewResults, labOf, xfmt, INK, LOOK } from '../lib/view.ts';
/** 또래의 2배 이상·기준 이상 같은 강한 위험 신호 색 */
const RED = '#cb272f';   // 디자인 Alarm Red
import { labCount } from '../lib/labs.ts';
import { MODULE_OF, DISCLAIMER, MEANING, type ItemId } from '../lib/content.ts';
import { verdict, type Verdict } from '../lib/verdict.ts';
import { riskView, SEV_COLOR } from '../lib/risk.ts';

const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);

const MOD_ROUTE = { sleep: '/sleep', mind: '/mind', gerd: '/digest', diet: '/diet' };
/** 마지막 글자 받침에 맞는 조사 */
export const josa = (w: string, a: string, b: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };

/** 결과가 필요한 화면 공통: 기본정보가 없으면 안내 */
export function useInput(): Input | null { const { draft } = useStore(); return useMemo(() => toInput(draft), [draft]); }
export function NeedInput() {
  return (
    <div className="page fade" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <h1 className="h1">아직 답한 내용이<b>없어요</b></h1>
      <p className="lead">기본정보 12문항에 답하면 결과를 볼 수 있어요. 약 1분이면 돼요.</p>
      <a className="cta" href="#/start" style={{ marginTop: 20 }}>체크 시작하기</a>
      <a className="link" href="#/record">저장한 기록 보기</a>
    </div>
  );
}

/** 한눈에 보기의 한 줄 묶음 */
function Group({ label, col, children }: { label: string; col: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 0', borderTop: '1px solid var(--line)' }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: col }}>{label}</span>
      {children}
    </div>
  );
}
const Chips = ({ items }: { items: { id: ItemId; name: string }[] }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
    {items.map((x) => <a key={x.id + x.name} href={`#/detail/${x.id}`} className="pill" style={{ background: 'var(--bg)', color: 'var(--obsidian)', textDecoration: 'none' }}>{x.name}</a>)}
  </div>
);


/**
 * 단계별 색: 위험은 빨강(Alarm Red), 관리·습관은 차분한 회색·연초록, 건강은 라임.
 * 숲색(진한 초록)은 '잘 관리되고 있다'로 읽혀 위험 표시에 쓰지 않는다.
 *  ① 지금 바로·오늘 확인 = 빨강 꽉 찬 카드, ② 병원 확인 = 흰 카드 + 빨강 띠·제목
 */
type Tone = { bg: string; fg: string; sub: string; tagBg: string; tagFg: string; numBg: string; numFg: string; top?: string };
const TONE: Record<Verdict['tier'], Tone> = {
  1: { bg: RED, fg: '#fff', sub: 'rgba(255,255,255,.88)', tagBg: '#fff', tagFg: RED, numBg: RED, numFg: '#fff' },
  2: { bg: '#fff', fg: RED, sub: 'var(--charcoal)', tagBg: RED, tagFg: '#fff', numBg: RED, numFg: '#fff', top: `6px solid ${RED}` },
  5: { bg: 'var(--fog)', fg: 'var(--obsidian)', sub: 'var(--charcoal)', tagBg: 'var(--charcoal)', tagFg: '#fff', numBg: 'var(--charcoal)', numFg: '#fff' },
  3: { bg: 'var(--linen)', fg: 'var(--ink)', sub: 'var(--charcoal)', tagBg: 'var(--ink)', tagFg: 'var(--lime)', numBg: 'var(--ink)', numFg: 'var(--lime)' },
  4: { bg: 'var(--lime)', fg: 'var(--ink)', sub: 'var(--ink)', tagBg: 'var(--ink)', tagFg: 'var(--lime)', numBg: 'var(--ink)', numFg: 'var(--lime)' },
};
function VerdictCard({ v }: { v: Verdict }) {
  const t = TONE[v.tier];
  return (
    <section className="card" aria-label="지금 내 상태" style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 12, background: t.bg, borderTop: t.top, boxShadow: 'var(--card-shadow)' }}>
      <span className="tag" style={{ alignSelf: 'flex-start', background: t.tagBg, color: t.tagFg }}>{v.tag}</span>
      <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.3, fontWeight: 900, letterSpacing: '-0.03em', color: t.fg }}>{v.title}</h2>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: t.sub }}>{v.sub}</p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {v.actions.map((a, k) => {
          const body = (<>
            <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 9, background: t.numBg, color: t.numFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{k + 1}</span>
            <span><b style={{ fontSize: 16, color: 'var(--obsidian)' }}>{a.t}</b>{a.d && <span style={{ display: 'block', fontSize: 13, lineHeight: 1.5, marginTop: 2, color: 'var(--charcoal)' }}>{a.d}</span>}</span>
          </>);
          const st = { display: 'flex', gap: 12, padding: '12px 12px', borderRadius: 14, background: '#fff', textDecoration: 'none', color: 'inherit', border: v.tier === 1 ? 0 : '1px solid var(--line2)' } as const;
          return <li key={a.t}>{a.href ? <a href={a.href} style={st}>{body}</a> : <div style={st}>{body}</div>}</li>;
        })}
      </ol>
      {v.also && <span style={{ fontSize: 13, color: t.sub }}>{v.also}</span>}
    </section>
  );
}

/** ②–⑤ 단계의 상태 안내(할 일은 아래 '지금 할 일'에). ① 긴급은 VerdictCard 로 할 일까지 맨 위에 */
function StatusCard({ v }: { v: Verdict }) {
  const t = TONE[v.tier];
  return (
    <section className="card" aria-label="지금 내 상태" style={{ padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 8, background: t.bg, borderTop: t.top, boxShadow: 'var(--card-shadow)' }}>
      <span className="tag" style={{ alignSelf: 'flex-start', background: t.tagBg, color: t.tagFg }}>{v.tag}</span>
      <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.32, fontWeight: 800, letterSpacing: '-0.02em', color: t.fg }}>{v.title}</h2>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: t.sub }}>{v.sub}</p>
    </section>
  );
}

/** 확률 항목 한 줄: 이름 → 현재 가능성 추정 % → 100명 중 몇 명 → 또래 평균 비교 → (필요하면) 확인 안내 */
function ProbRowB({ p, inp }: { p: ProbRow; inp: Input }) {
  const b = probB(p, inp as AppInput), reason = reasonOf(p.id, inp as AppInput, p), L = labOf(inp);
  const small = b.kind === 'estimate' && p.cmp!.me < 1;   // 배수는 커도 가능성 자체가 1% 미만이면 빨간 강조를 하지 않는다(판정은 그대로)
  const warn = (b.kind === 'estimate' && b.high && p.cmp!.me >= 1) || b.kind === 'criteria' || b.kind === 'excluded';
  const glu = p.id === 'dm' && b.kind === 'estimate' && L.glu != null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 0', borderTop: '1px solid var(--line)' }}>
      <a href={`#/detail/${p.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 4, textDecoration: 'none', color: 'inherit' }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <b style={{ fontSize: 16, color: 'var(--obsidian)' }}>{B_NAME[p.id] ?? p.title}</b>
          <span style={{ fontSize: 12, color: 'var(--slate)', textAlign: 'right' }}>{glu ? '현재 가능성 추정 · 공복혈당 반영' : b.label}</span>
        </span>
        <b style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.02em', color: warn ? RED : 'var(--obsidian)' }}>{b.big}</b>
        {(b.kind === 'estimate' || b.kind === 'range') && <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--obsidian)' }}>{b.freq}</span>}
        {b.kind === 'estimate' && <span style={{ fontSize: 13, lineHeight: 1.5, color: b.high && !small ? RED : 'var(--charcoal)', fontWeight: b.high && !small ? 700 : 500 }}>{b.peer}</span>}
        {b.kind === 'range' && <span style={{ fontSize: 13, lineHeight: 1.5 }}>{b.note}</span>}
        {b.kind !== 'estimate' && b.kind !== 'range' && b.note && <span style={{ fontSize: 13, lineHeight: 1.55, color: warn ? RED : 'var(--charcoal)' }}>{b.note}</span>}
        {glu && <span style={{ fontSize: 13, lineHeight: 1.5, padding: '8px 10px', borderRadius: 10, background: 'var(--bg)' }}>입력한 공복혈당 {L.glu}mg/dL · {L.glu! >= 100 ? '공복혈당장애 범위(100–125)예요' : '정상 범위(100 미만)예요. 당뇨는 당화혈색소로도 진단해서 공복혈당만으로 없다고 할 수는 없어요'}</span>}
        {b.kind === 'estimate' && b.high && p.cmp?.action && <span style={{ fontSize: 13, lineHeight: 1.5, fontWeight: 700, color: 'var(--obsidian)' }}>→ {p.cmp.action}</span>}
      </a>
      {reason && (
        <details>
          <summary style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', cursor: 'pointer' }}>왜 이렇게 나왔나요?</summary>
          <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--charcoal)' }}>{reason}. 계산에 들어간 정보이며, 각 정보가 얼마나 영향을 줬는지는 따로 계산하지 않았어요.</p>
        </details>
      )}
    </div>
  );
}

const MODNAME = { sleep: '수면', mind: '마음', gerd: '소화', diet: '식생활' } as const;
const FUTURE = ['dm10', 'htn4', 'chd10'];

export function Results() {
  const { records, setRecords, toast, setDraft } = useStore();
  const inp = useInput();
  if (!inp) return <NeedInput />;
  const sc = suggestScenario(inp), r = viewResults(inp, sc), extras = runExtras(inp, drinkOf(inp), labOf(inp));
  const v = verdictB(inp, r, sc), scope = scopeOf(inp), good = goodHabits(inp);
  const save = () => {
    const next = [...records, { id: String(Date.now()), date: today(), input: inp }];
    if (saveRecords(next)) { setRecords(next); toast(`이 기기에 저장했어요 (기록 ${next.length}개)`); } else toast('이 브라우저에서는 저장할 수 없어요');
  };
  // 서비스 소개와 앱 주소만 공유한다(개인 결과는 보내지 않음)
  const share = async () => {
    const url = location.href.split('#')[0], text = '간단한 몸 정보로 지금 건강을 가늠해 보는 1분체크예요.';
    try { if (navigator.share) await navigator.share({ title: '1분체크', text, url }); else { await navigator.clipboard.writeText(url); toast('1분체크 주소를 복사했어요'); } } catch { /* 취소 */ }
  };
  const ob = r.score.find((x) => x.id === 'obesity')!;
  const doneScores = r.score.filter((x) => x.id !== 'obesity' && x.status === 'ok' && x.v !== '–');
  const future = extras.filter((x) => FUTURE.includes(x.id)), checks = extras.filter((x) => !FUTURE.includes(x.id));
  const probs = r.prob.filter((p) => p.status !== 'na');
  const osteoNa = r.prob.some((p) => p.id === 'osteo' && p.status === 'na');
  return (
    <div className="app">
      <div className="page fade">
        <Nav title="내 결과" sub={`${today()} · ${r.who}`} />
        {r.crisis && <Crisis />}

        {/* 1. 상태 안내 (기존 판정 그대로). 긴급은 할 일까지 맨 위에 */}
        {v.tier === 1 ? <VerdictCard v={v} /> : <StatusCard v={v} />}

        {/* 2. 주요 결과의 숫자와 뜻 */}
        <section className="card" aria-label="주요 결과" style={{ padding: '6px 18px 14px' }}>
          <div style={{ padding: '12px 0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <b style={{ fontSize: 17, color: 'var(--obsidian)' }}>주요 결과</b>
            <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--slate)' }}>지금 이 상태일 가능성을 추정한 값이에요. 앞으로 생길 확률이 아니에요. 또래 평균은 {r.group} 기준이에요.</span>
          </div>
          {probs.map((p) => <ProbRowB key={p.id} p={p} inp={inp} />)}
          <a href="#/detail/obesity" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '14px 0', borderTop: '1px solid var(--line)', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><b style={{ fontSize: 16, color: 'var(--obsidian)' }}>체형</b><span style={{ fontSize: 12, color: 'var(--slate)' }}>입력한 키·몸무게·허리로 계산</span></span>
            <span style={{ fontSize: 15, color: 'var(--obsidian)' }}><b>BMI {ob.v}</b> · {ob.cat}{inp.waistCm != null ? (inp.waistCm >= (inp.sex === 'F' ? 85 : 90) ? ' · 복부비만 기준 해당' : ' · 허리둘레 기준 아래') : ' · 허리둘레 모름'}</span>
          </a>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0 4px', borderTop: '1px solid var(--line)' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><b style={{ fontSize: 16, color: 'var(--obsidian)' }}>설문 결과</b><span style={{ fontSize: 12, color: 'var(--slate)' }}>점수와 등급 · 확률이 아니에요</span></span>
            {doneScores.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {doneScores.map((x) => <a key={x.id} href={`#/detail/${x.id}`} className="pill" style={{ background: x.col === LOOK ? '#fdecea' : 'var(--bg)', color: x.col === LOOK ? RED : 'var(--charcoal)', fontWeight: 700, textDecoration: 'none' }}>{x.name} · {x.cat}</a>)}
              </div>
            ) : <span style={{ fontSize: 13 }}>선택 설문은 아직 하지 않았어요.</span>}
            {scope.mods.some((m) => !m.done) && (
              <span style={{ fontSize: 13, lineHeight: 1.7 }}>아직 체크하지 않음: {scope.mods.filter((m) => !m.done).map((m, k) => (
                <span key={m.k}>{k ? ' · ' : ''}<a href={'#' + MOD_ROUTE[m.k]} onClick={() => setDraft((x) => ({ ...x, modules: { ...x.modules, [m.k]: true } }))}>{MODNAME[m.k]}</a></span>))}
                <span style={{ display: 'block', fontSize: 12, color: 'var(--slate)' }}>체크하지 않은 분야는 낮거나 정상이라는 뜻이 아니에요.</span></span>
            )}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, lineHeight: 1.55, color: 'var(--slate)' }}>추정 가능성이 낮아도 질환이 없다는 뜻은 아니에요.{osteoNa ? ' 골다공증은 50세 이상부터 계산해요.' : ''}</p>
        </section>

        {/* 3. 이번 결과에 반영한 정보 */}
        <section className="card" aria-label="이번 결과에 반영한 정보" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <b style={{ fontSize: 16, color: 'var(--obsidian)' }}>이번 결과에 반영한 정보</b>
          <span style={{ fontSize: 13, lineHeight: 1.6 }}>{scope.body}</span>
          <span style={{ fontSize: 13, lineHeight: 1.6 }}>{scope.life}{scope.dx.length ? ` · 진단받은 질환 ${scope.dx.join('·')}` : ''}</span>
          <span style={{ fontSize: 13, lineHeight: 1.6 }}><b style={{ color: 'var(--obsidian)' }}>{scope.labLine}</b> · {scope.restLine}</span>
          <a href="#/checkup" style={{ fontSize: 13, fontWeight: 700 }}>{scope.labs.length ? '검진 수치 고치기·더 넣기' : '검진 수치 넣기 (선택)'} →</a>
          {!scope.labs.length && <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--slate)' }}>검진 수치가 없어도 괜찮아요. 넣으면 혈압·공복혈당·총콜레스테롤은 측정값 기준과 함께 보여드려요.</span>}
        </section>

        {/* 4. 필요한 행동 (긴급이면 위 카드에 이미 있음) */}
        {v.tier !== 1 && (
          <section className="card" aria-label="지금 할 일" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <b style={{ fontSize: 16, color: 'var(--obsidian)' }}>지금 할 일</b>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {v.actions.map((a, k) => {
                const body = (<><span style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 8, background: 'var(--ink)', color: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{k + 1}</span>
                  <span><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{a.t}</b>{a.d && <span style={{ display: 'block', fontSize: 13, lineHeight: 1.5, marginTop: 2 }}>{a.d}</span>}</span></>);
                const st = { display: 'flex', gap: 10, textDecoration: 'none', color: 'inherit' } as const;
                return <li key={a.t}>{a.href ? <a href={a.href} style={st}>{body}</a> : <div style={st}>{body}</div>}</li>;
              })}
            </ol>
            {v.also && <span style={{ fontSize: 13, color: 'var(--charcoal)' }}>{v.also}</span>}
            {v.tier !== 4 && good.length > 0 && <span style={{ fontSize: 13, lineHeight: 1.55, padding: '8px 10px', borderRadius: 10, background: 'var(--linen)', color: 'var(--ink)' }}><b>잘하고 있는 점</b> · {good.join(' · ')}</span>}
          </section>
        )}

        {/* 5. 저장 · 진료용 요약 · 알려주기 */}
        <section className="card" aria-label="저장" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" className="cta" onClick={save} style={{ height: 52 }}>{Icon.save} 이 결과 저장하기</button>
          <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--slate)', textAlign: 'center' }}>이 기기(브라우저)에만 저장해 두고, 다음 체크와 비교할 수 있어요. 기록 화면에서 언제든 지울 수 있어요.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <a className="cta outline" href="#/summary" style={{ flex: 1, height: 46, fontSize: 14 }}>진료용 결과 요약 저장</a>
            <button type="button" className="cta outline" onClick={share} style={{ flex: 1, height: 46, fontSize: 14 }}>1분체크 알려주기</button>
          </div>
          <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--slate)' }}>진료용 요약은 인쇄하거나 PDF로 저장할 수 있어요. ‘알려주기’는 내 결과가 아니라 1분체크 소개와 주소만 보내요.</span>
        </section>

        {/* 6. 상세 비교 · 나머지 항목 · 근거 */}
        <details className="more">
          <summary className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer', listStyle: 'none' }}>
            <span><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>자세히 보기</b><span style={{ display: 'block', fontSize: 12, color: 'var(--slate)' }}>또래 비교 · 바꿔보기 · 앞으로의 발생 위험 · 생활·검진 체크 · 점수 · 읽는 법</span></span>
            <span style={{ color: INK }}>{Icon.down}</span>
          </summary>
          <div className="more-body" style={{ marginTop: 14 }}>
            <div className="card" style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>또래 평균과 비교 (몇 배)</b><span className="cap">{r.group}</span></div>
              <div className="grid3">
                {r.rings.map((g) => (
                  <a key={g.id} href={`#/detail/${g.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                    <span className="cap" style={{ color: 'var(--obsidian)' }}>{g.name}</span>
                    <Ring f={g.f} label={g.idx} col={g.col} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: g.col, textAlign: 'center' }}>{g.label}</span>
                  </a>
                ))}
              </div>
              <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--slate)' }}>배수는 내 추정값과 또래 평균을 함께 볼 때 의미가 있어요. 예를 들어 0.3%와 0.1%도 3배예요.</span>
            </div>
            {r.hasManage ? (
              <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>바꿔 입력하면 추정이 이렇게 달라져요</b><span className="tag" style={{ background: 'var(--linen)', color: INK }}>{r.scenarioText}</span></div>
                {r.manage.slice(0, 2).map((m) => <span key={m.id} style={{ fontSize: 14 }}>{B_NAME[m.id] ?? m.name}: 현재 가능성 추정 {m.a}% → <b>{m.b}%</b></span>)}
                <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--slate)' }}>입력을 바꿨을 때의 계산이에요. 실제 치료 효과나 질병 감소를 보장하지 않아요.</span>
                <a className="cta" href="#/whatif" style={{ height: 48, fontSize: 15 }}>직접 바꿔보기</a>
              </div>
            ) : (
              <a className="card" href="#/whatif" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
                <span className="grow"><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>바꿔보기</b><span style={{ display: 'block', fontSize: 13 }}>몸 정보나 생활습관을 바꿔 입력하면 추정 결과가 어떻게 달라지는지 볼 수 있어요.</span></span>{Icon.right}
              </a>
            )}
            <ExtraCards xs={future} title="앞으로 N년 안의 발생 위험" lead="위의 ‘현재 가능성’과 다른 값이에요. 연구에서 추적한 기간(4년·10년) 그대로 보여드려요. 40–69세 연구로 만든 계산식이에요." />
            <ExtraCards xs={checks} />
            <h2 className="h2">설문 점수</h2>
            <p className="lead" style={{ marginTop: -6, fontSize: 13, color: 'var(--slate)' }}>검증된 설문 점수와 등급이에요. 확률로 바꾸지 않았어요.</p>
            <div className="grid2">
              {r.score.map((s) => (
                <a key={s.id} href={`#/detail/${s.id}`} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '16px 14px 18px', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: '50%', background: s.col }} /><span className="cap" style={{ color: 'var(--obsidian)' }}>{s.name}</span></div>
                  <div style={{ marginTop: 6 }}><Gauge f={s.frac} v={s.v} col={s.col} /></div>
                  <span style={{ fontSize: 11, color: 'var(--slate)' }}>{s.unit}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: s.col, textAlign: 'center' }}>{s.status === 'needs_input' ? '아직 체크하지 않음' : s.cat}</span>
                  <span style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--slate)', textAlign: 'center' }}>{s.note}</span>
                </a>
              ))}
            </div>
            <div className="card" style={{ padding: '14px 18px' }}>
              <b style={{ fontSize: 14, color: 'var(--obsidian)' }}>결과를 읽는 법</b>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.65 }}>
                <li><b>현재 가능성 추정</b>: 지금 검사하면 기준에 해당할 가능성이에요. 예를 들어 ‘15%’는 비슷한 조건의 100명 중 약 15명이 검사에서 기준에 해당한다는 뜻이에요.</li>
                <li><b>앞으로 N년 안의 발생 위험</b>: 지금은 아니지만 정해진 기간 안에 새로 생길 가능성이에요.</li>
                <li><b>검진 수치</b>: 입력한 측정값이 기준 범위 어디에 있는지예요. 입력한 그날의 값이에요.</li>
                <li><b>설문 점수</b>: 검증된 설문의 점수와 등급이에요.</li>
                <li><b>또래 평균</b>: 같은 나이대(10살 단위)·같은 성별 한국인의 같은 기준 값이에요.</li>
              </ul>
            </div>
          </div>
        </details>
        <p className="help" style={{ margin: '8px 4px 0' }}>{DISCLAIMER} 모든 계산은 이 기기 안에서만 했어요.</p>
      </div>
      <TabBar at="result" />
    </div>
  );
}
