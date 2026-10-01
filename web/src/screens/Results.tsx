import { useMemo } from 'react';
import type { Input } from '../../../engine/src/engine.ts';
import { useStore, Nav, TabBar, Ring, Gauge, Icon, Crisis } from '../ui.tsx';
import { toInput, suggestScenario, saveRecords, today } from '../state.ts';
import { viewResults, INK } from '../lib/view.ts';
import { MODULE_OF, type ItemId } from '../lib/content.ts';

const MOD_ROUTE = { sleep: '/sleep', mind: '/mind', gerd: '/digest', diet: '/diet' };

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
        <div className="dark3">
          <div><span className="k">동년배보다 낮음</span><span className="v">{r.lower}<small style={{ fontSize: 14 }}>개</small></span></div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>동년배 평균을 100으로 보면</b><span className="cap">{r.group}</span></div>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h2 className="h2">나와 비슷한 100명 중</h2><span className="cap">확률 6</span></div>
        <div className="card" style={{ padding: '4px 18px' }}>
          {r.prob.map((c) => (
            <a key={c.id} className="row" href={`#/detail/${c.id}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span><b style={{ fontSize: 16, color: 'var(--obsidian)' }}>{c.name}</b> <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)' }}>{c.badge}</span></span>
                <span style={{ whiteSpace: 'nowrap' }}><b style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--obsidian)' }}>{c.main}</b><b style={{ fontSize: 13, color: 'var(--obsidian)' }}>{c.unit}</b></span>
              </div>
              {c.ok ? (
                <>
                  <div className="bar"><i style={{ width: `${c.meW}%`, background: c.barC }} />{c.peerX != null && <s style={{ left: `${c.peerX}%` }} />}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate)' }}><span>나 {c.pct}% · 동년배 {c.peer}%</span>{c.tag && <span className="tag" style={{ background: c.tagBg, color: c.tagFg }}>{c.tag}</span>}</div>
                </>
              ) : <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate)' }}><span>{c.sub}</span><span className="tag" style={{ background: 'var(--bg)', color: 'var(--charcoal)' }}>{c.tag}</span></div>}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h2 className="h2">점수와 등급</h2><span className="cap">점수 6</span></div>
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
        <p className="help" style={{ margin: '8px 4px 0' }}>진단이 아니라 통계로 보는 참고 정보예요. 모든 계산은 이 기기 안에서만 했어요. 통계: 국민건강영양조사 2023–2025 평균 외.</p>
      </div>
      <TabBar at="result" />
    </div>
  );
}
