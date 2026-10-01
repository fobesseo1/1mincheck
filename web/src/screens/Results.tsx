import { useMemo } from 'react';
import type { Input } from '../../../engine/src/engine.ts';
import { useStore, Nav, TabBar, Ring, Gauge, Icon, Crisis } from '../ui.tsx';
import { toInput, suggestScenario, saveRecords, today } from '../state.ts';
import { viewResults, INK } from '../lib/view.ts';
import { MODULE_OF, DISCLAIMER, type ItemId } from '../lib/content.ts';

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

export function Results() {
  const { records, setRecords, toast, setDraft } = useStore();
  const inp = useInput();
  if (!inp) return <NeedInput />;
  const sc = suggestScenario(inp), r = viewResults(inp, sc);
  const save = () => {
    const next = [...records, { id: String(Date.now()), date: today(), input: inp }];
    if (saveRecords(next)) { setRecords(next); toast('이 기기에 기록을 저장했어요'); } else toast('이 브라우저에서는 저장할 수 없어요');
  };
  const share = async () => {
    const text = '1분체크 · 1분이면 보는 내 몸의 확률 — 나와 비슷한 100명 중 몇 명인지 확인해 보세요.';
    try { if (navigator.share) await navigator.share({ title: '1분체크', text, url: location.href.split('#')[0] }); else { await navigator.clipboard.writeText(location.href.split('#')[0]); toast('앱 주소를 복사했어요'); } } catch { /* 취소 */ }
  };
  const missingMods = [...new Set([...r.prob, ...r.score].filter((x) => x.status === 'needs_input').map((x) => MODULE_OF[x.id as ItemId]).filter(Boolean))] as (keyof typeof MOD_ROUTE)[];
  const MODNAME = { sleep: '수면', mind: '마음', gerd: '소화', diet: '식생활' };
  return (
    <div className="app">
      <div className="page fade">
        <Nav title="내 결과" sub={`${today()} · ${r.who}`}
          right={<button className="circle" aria-label="공유" onClick={share}>{Icon.share}</button>} />
        <button type="button" onClick={save} className="pill" style={{ alignSelf: 'center', marginTop: -8, height: 34, padding: '0 14px', border: 0, background: '#fff', boxShadow: 'var(--card-shadow)', gap: 6, color: 'var(--ink)' }}>{Icon.save} 이 기기에 기록 저장</button>

        {r.crisis && <Crisis />}
        <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="pill" style={{ background: 'var(--ink)', color: 'var(--lime)' }}>비교 기준</span>
            <b style={{ fontSize: 14, color: 'var(--obsidian)' }}>{r.group} 평균</b>
            <span style={{ fontSize: 12, color: 'var(--slate)' }}>국민건강영양조사 2023–2025</span>
          </div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: 'var(--obsidian)' }}>
            {(() => {
              const s = r.summary, parts: JSX.Element[] = [];
              const grp = (xs: string[], tail: string, col: string) => <><b style={{ color: col }}>{xs.join('·')}</b>{josa(xs[xs.length - 1], '은', '는')} {tail}</>;
              if (s.low.length) parts.push(grp(s.low, '낮은 편', 'var(--ink)'));
              if (s.same.length) parts.push(grp(s.same, '비슷한 수준', 'var(--obsidian)'));
              if (s.high.length) parts.push(grp(s.high, '높은 편', 'var(--look)'));
              return <>
                {parts.length > 0 && <>{r.group} 평균과 비교하면 {parts.map((p, k) => <span key={k}>{k ? ', ' : ''}{p}</span>)}이에요. </>}
                {s.watch.length > 0 && <>점수로는 <b style={{ color: 'var(--look)' }}>{s.watch.join(', ')}</b> 항목을 챙겨보면 좋아요. </>}
                {s.best && <>관리했을 때 가장 많이 줄어드는 건 <b style={{ color: 'var(--ink)' }}>{s.best.name}</b>{josa(s.best.name, '이에요', '예요')}({s.best.a}% → {s.best.b}%).</>}
              </>;
            })()}
          </p>
          <details>
            <summary style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', textDecoration: 'underline' }}>이 숫자 읽는 법</summary>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.65 }}>
              <li><b>앞으로 생길 확률이 아니라 지금 상태</b>예요. ‘6%’는 지금 그 상태일 가능성이에요.</li>
              <li>‘100명 중 6명’은 <b>나와 같은 나이대·성별에 나와 같은 답을 한 사람 100명</b>이 있다면 그중 약 6명꼴이라는 뜻이에요.</li>
              <li><b>또래 평균</b>은 같은 나이대(10살 단위)·같은 성별 한국인의 실제 비율이에요.</li>
              <li>{DISCLAIMER}</li>
            </ul>
          </details>
        </div>
        <div className="dark3">
          <div><span className="k">또래 평균보다 낮음</span><span className="v">{r.lower}<small style={{ fontSize: 14 }}>개</small></span></div>
          <div className="sep" />
          <div className="mid">{r.hasManage
            ? <><span className="k">관리하면 낮아지는 항목</span><span className="c">{r.improvedN}<small style={{ fontSize: 20 }}>개</small></span></>
            : <><span className="k">지금 생활</span><span className="c" style={{ fontSize: 40 }}>유지</span></>}</div>
          <div className="sep" />
          <div><span className="k">챙겨볼 항목</span><span className="v">{r.look}<small style={{ fontSize: 14 }}>개</small></span></div>
        </div>

        {r.strong.length > 0 && (
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>먼저 챙겨볼 것</b><span className="tag" style={{ background: 'var(--look-bg)', color: 'var(--look)' }}>{r.strong.length}개</span></div>
            {r.strong.map((s) => (
              <a key={s.id} href={`#/detail/${s.id}`} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: '1px solid var(--line)', textDecoration: 'none', color: 'inherit' }}>
                <i style={{ width: 8, height: 8, marginTop: 7, flexShrink: 0, borderRadius: '50%', background: 'var(--look)' }} />
                <div><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{s.name}</b> <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--look)' }}>{s.what}</span>
                  <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>자세히 보고 다음에 할 일을 확인해 보세요 →</div></div>
              </a>
            ))}
            <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--bg)', fontSize: 12, lineHeight: 1.5 }}>선별 결과가 양성이라고 병이 확정되는 건 아니에요. 한 번 더 확인해 보자는 신호예요.</div>
          </div>
        )}

        <div className="card" style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>또래 평균을 100으로 보면</b><span className="cap">{r.group}</span></div>
          <div className="grid3">
            {r.rings.map((g) => (
              <a key={g.id} href={`#/detail/${g.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                <span className="cap" style={{ color: 'var(--obsidian)' }}>{g.name}</span>
                <Ring f={g.f} label={g.idx} col={g.col} />
                <span style={{ fontSize: 12, fontWeight: 700, color: g.col }}>{g.label}</span>
              </a>
            ))}
          </div>
        </div>

        {r.hasManage ? (
          <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>관리하면 이만큼 줄어요</b><span className="tag" style={{ background: 'var(--linen)', color: INK }}>{r.scenarioText}</span></div>
            <div className="grid2">
              {r.manage.map((m) => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span className="cap">{m.name}</span>
                  <span style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.05em', color: 'var(--obsidian)' }}>{m.b}<small style={{ fontSize: 16 }}>%</small></span>
                  <span style={{ fontSize: 12, color: 'var(--slate)' }}>지금 {m.a}%</span>
                </div>
              ))}
            </div>
            <a className="cta" href="#/whatif" style={{ height: 50, fontSize: 16 }}>직접 바꿔보기</a>
          </div>
        ) : (
          <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 14, background: 'var(--linen)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK }}>{Icon.check}</span>
            <div className="grow"><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>지금 생활을 유지하면 돼요</b><div style={{ fontSize: 13 }}>체중이 이미 정상 범위예요.</div></div>
            <a href="#/whatif" style={{ fontSize: 13, fontWeight: 700 }}>바꿔보기</a>
          </div>
        )}

        <h2 className="h2">지금 이 상태일 가능성</h2>
        <p className="lead" style={{ marginTop: -6, fontSize: 13, color: 'var(--slate)' }}>앞으로 생길 확률이 아니라 지금 상태예요. 나와 같은 조건인 사람 100명 중 몇 명꼴인지로도 보여드려요.</p>
        <div className="card" style={{ padding: '4px 18px' }}>
          {r.prob.map((c) => (
            <a key={c.id} className="row" href={`#/detail/${c.id}`} style={{ gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <b style={{ fontSize: 16, color: 'var(--obsidian)' }}>{c.name}</b> <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)' }}>{c.badge}</span>
                  {c.meaning && <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--charcoal)', marginTop: 2 }}>{c.meaning}</div>}
                </div>
                {c.ok
                  ? <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}><b style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--obsidian)' }}>{c.pct}<small style={{ fontSize: 14 }}>%</small></b><div style={{ fontSize: 11, color: 'var(--slate)' }}>100명 중 약 {c.main}명</div></div>
                  : <b style={{ fontSize: 22, color: 'var(--obsidian)' }}>{c.main === '–' ? '–' : c.main + c.unit}</b>}
              </div>
              {c.ok ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 44px', alignItems: 'center', gap: '6px 8px', fontSize: 11 }}>
                    <span style={{ fontWeight: 700, color: c.barC }}>나</span><div className="bar"><i style={{ width: `${c.meW}%`, background: c.barC }} /></div><span style={{ textAlign: 'right', fontWeight: 700, color: c.barC }}>{c.pct}%</span>
                    <span style={{ color: 'var(--slate)' }}>또래 평균</span><div className="bar"><i style={{ width: `${c.peerW}%`, background: '#c2c6be' }} /></div><span style={{ textAlign: 'right', color: 'var(--slate)' }}>{c.peer}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--obsidian)' }}>{c.peerWho} {c.peer}% 기준 · {c.compare}</span>
                    {c.tag && <span className="tag" style={{ background: c.tagBg, color: c.tagFg, flexShrink: 0 }}>{c.tag}</span>}
                  </div>
                  {c.peerNote && <span style={{ fontSize: 11, color: 'var(--slate)', marginTop: -4 }}>{c.peerNote}</span>}
                </>
              ) : <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate)' }}><span>{c.sub}</span><span className="tag" style={{ background: 'var(--bg)', color: 'var(--charcoal)' }}>{c.tag}</span></div>}
            </a>
          ))}
        </div>

        <h2 className="h2">점수로 보는 항목</h2>
        <p className="lead" style={{ marginTop: -6, fontSize: 13, color: 'var(--slate)' }}>검증된 설문 점수와 등급이에요. 근거가 부족해 확률로 바꾸지 않았어요.</p>
        <div className="grid2">
          {r.score.map((s) => (
            <a key={s.id} href={`#/detail/${s.id}`} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '16px 14px 18px', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: '50%', background: s.col }} /><span className="cap" style={{ color: 'var(--obsidian)' }}>{s.name}</span></div>
              <div style={{ marginTop: 6 }}><Gauge f={s.frac} v={s.v} col={s.col} /></div>
              <span style={{ fontSize: 11, color: 'var(--slate)' }}>{s.unit}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: s.col, textAlign: 'center' }}>{s.cat}</span>
              <span style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--slate)', textAlign: 'center' }}>{s.note}</span>
            </a>
          ))}
        </div>

        {missingMods.length > 0 && (
          <div className="closed" style={{ flexDirection: 'column' }}>
            <b style={{ color: 'var(--obsidian)' }}>답하면 더 볼 수 있어요</b>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{missingMods.map((m) => <a key={m} className="pill" href={'#' + MOD_ROUTE[m]} onClick={() => setDraft((x) => ({ ...x, modules: { ...x.modules, [m]: true } }))} style={{ background: '#fff', textDecoration: 'none' }}>{MODNAME[m]} 질문 답하기</a>)}</div>
          </div>
        )}
        <p className="help" style={{ margin: '8px 4px 0' }}>{DISCLAIMER} 모든 계산은 이 기기 안에서만 했어요.</p>
      </div>
      <TabBar at="result" />
    </div>
  );
}
