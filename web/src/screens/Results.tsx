import { useMemo, type ReactNode } from 'react';
import type { Input } from '../../../engine/src/engine.ts';
import { useStore, Nav, TabBar, Ring, Gauge, Icon, Crisis } from '../ui.tsx';
import { toInput, suggestScenario, saveRecords, today } from '../state.ts';
import { viewResults, INK, LOOK } from '../lib/view.ts';
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
    const text = '1분체크 · 1분이면 보는 내 몸의 확률 — 또래와 비교해 보세요.';
    try { if (navigator.share) await navigator.share({ title: '1분체크', text, url: location.href.split('#')[0] }); else { await navigator.clipboard.writeText(location.href.split('#')[0]); toast('앱 주소를 복사했어요'); } } catch { /* 취소 */ }
  };
  const missingMods = [...new Set([...r.prob, ...r.score].filter((x) => x.status === 'needs_input').map((x) => MODULE_OF[x.id as ItemId]).filter(Boolean))] as (keyof typeof MOD_ROUTE)[];
  const MODNAME = { sleep: '수면', mind: '마음', gerd: '소화', diet: '식생활' };
  const cols: { k: string; n: number; items: { id: ItemId; name: string }[]; big?: boolean; col: string }[] = [
    { k: '먼저 확인할 것', n: r.first.length, items: r.first.map((f) => ({ id: f.id, name: f.name === '이미 당뇨일 확률' ? '당뇨' : f.name })), col: r.first.length ? '#cfe2ef' : '#d8e8cf' },
    { k: '관리하면 줄어드는 것', n: r.improved.length, items: r.improved, big: true, col: 'var(--lime)' },
    { k: '또래보다 낮은 것', n: r.low.length, items: r.low, col: '#d8e8cf' },
  ];
  return (
    <div className="app">
      <div className="page fade">
        <Nav title="내 결과" sub={`${today()} · ${r.who}`} right={<button className="circle" aria-label="공유" onClick={share}>{Icon.share}</button>} />
        <button type="button" onClick={save} className="pill" style={{ alignSelf: 'center', marginTop: -8, height: 34, padding: '0 14px', border: 0, background: '#fff', boxShadow: 'var(--card-shadow)', gap: 6, color: 'var(--ink)' }}>{Icon.save} 이 기기에 기록 저장</button>
        {r.crisis && <Crisis />}

        {/* 한눈에 보기: 중요한 것부터 */}
        <div className="card" style={{ padding: '16px 18px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingBottom: 10 }}>
            <b style={{ fontSize: 16, color: 'var(--obsidian)' }}>한눈에 보기</b>
            <span style={{ fontSize: 12, color: 'var(--slate)' }}>{r.who} · 비교 기준 {r.group} (국민건강영양조사 2023–2025)</span>
          </div>
          {r.diagnosed.length > 0 && (
            <Group label="이미 진단받은 질환" col={INK}>
              {r.diagnosed.map((x) => <a key={x.id} href={`#/detail/${x.id}`} style={{ textDecoration: 'none', fontSize: 14, color: 'var(--obsidian)' }}><b>{x.name}</b> — 관리 중이에요. 처방과 정기 진료를 이어가세요.</a>)}
            </Group>
          )}
          {r.first.length > 0 && (
            <Group label="먼저 확인할 것" col={LOOK}>
              {r.first.map((f) => (
                <a key={f.id} href={`#/detail/${f.id}`} style={{ display: 'flex', gap: 10, textDecoration: 'none', color: 'inherit' }}>
                  <i style={{ width: 8, height: 8, marginTop: 7, flexShrink: 0, borderRadius: '50%', background: LOOK }} />
                  <div><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{f.name}</b> <span style={{ fontSize: 14, color: LOOK, fontWeight: 600 }}>{f.line}</span>
                    {f.action && <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 2 }}>→ {f.action}</div>}</div>
                </a>
              ))}
            </Group>
          )}
          {r.same.length > 0 && <Group label="또래와 비슷" col={INK}><Chips items={r.same} /></Group>}
          {r.low.length > 0 && <Group label="또래보다 낮음" col={INK}><Chips items={r.low} /></Group>}
          {r.watch.length > 0 && <Group label="점수로 챙겨볼 것" col={LOOK}><Chips items={r.watch} /></Group>}
          {r.best && (
            <Group label="관리하면" col={INK}>
              <span style={{ fontSize: 14, color: 'var(--obsidian)' }}>{r.scenarioText}{josa(r.scenarioText, '을', '를')} 줄이면 <b>{r.best.name}</b>{josa(r.best.name, '이', '가')} <b style={{ color: INK }}>{r.best.a}% → {r.best.b}%</b>로 줄어요.</span>
            </Group>
          )}
          {r.first.length === 0 && r.diagnosed.length === 0 && <Group label="결론" col={INK}><span style={{ fontSize: 14 }}>먼저 확인할 항목이 없어요. 지금처럼 관리하면서 정기 검진을 받으면 돼요.</span></Group>}
          <details style={{ padding: '10px 0 12px', borderTop: '1px solid var(--line)' }}>
            <summary style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', textDecoration: 'underline' }}>이 숫자 읽는 법</summary>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.65 }}>
              <li><b>앞으로 생길 확률이 아니라 지금 상태</b>예요. 예를 들어 ‘이미 당뇨일 확률 15%’는 검사하면 당뇨로 나올 가능성이에요.</li>
              <li><b>또래의 ○배</b>는 같은 나이대(10살 단위)·같은 성별 한국인 평균과 같은 기준으로 비교한 값이에요.</li>
              <li>{DISCLAIMER}</li>
            </ul>
          </details>
        </div>

        {/* 숫자 카드: 개수 + 항목 이름 */}
        <div className="dark3" style={{ alignItems: 'flex-start', padding: '18px 6px' }}>
          {cols.map((c, k) => (
            <div key={c.k} style={{ display: 'contents' }}>
              {k > 0 && <div className="sep" style={{ alignSelf: 'stretch' }} />}
              <div className={c.big ? 'mid' : ''} style={{ gap: 4 }}>
                <span className="k">{c.k}</span>
                <span className={c.big ? 'c' : 'v'} style={{ color: c.big ? 'var(--lime)' : '#fff' }}>{c.n}<small style={{ fontSize: c.big ? 20 : 14 }}>개</small></span>
                <span style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px 6px', fontSize: 11, lineHeight: 1.4 }}>
                  {c.items.length ? c.items.map((x) => <a key={x.id + x.name} href={`#/detail/${x.id}`} style={{ color: c.col, textDecoration: 'underline', textUnderlineOffset: 2 }}>{x.name}</a>) : <span style={{ color: '#9fb08f' }}>없음</span>}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>또래 평균과 비교하면 (몇 배)</b><span className="cap">{r.group}</span></div>
          <div className="grid3">
            {r.rings.map((g) => (
              <a key={g.id} href={`#/detail/${g.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                <span className="cap" style={{ color: 'var(--obsidian)' }}>{g.name}</span>
                <Ring f={g.f} label={g.idx} col={g.col} />
                <span style={{ fontSize: 12, fontWeight: 700, color: g.col, textAlign: 'center' }}>{g.label}</span>
              </a>
            ))}
          </div>
        </div>

        {r.hasManage ? (
          <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>관리하면 이만큼 줄어요</b><span className="tag" style={{ background: 'var(--linen)', color: INK }}>{r.scenarioText}</span></div>
            {r.manage.length > 0 && <div className="grid2">
              {r.manage.slice(0, 2).map((m) => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center' }}>
                  <span className="cap">{m.name}</span>
                  <span style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.05em', color: 'var(--obsidian)' }}>{m.b}<small style={{ fontSize: 16 }}>%</small></span>
                  <span style={{ fontSize: 12, color: 'var(--slate)' }}>지금 {m.a}%</span>
                </div>
              ))}
            </div>}
            <a className="cta" href="#/whatif" style={{ height: 50, fontSize: 16 }}>직접 바꿔보기</a>
          </div>
        ) : (
          <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 14, background: 'var(--linen)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK }}>{Icon.check}</span>
            <div className="grow"><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>체중은 지금처럼 유지하면 돼요</b><div style={{ fontSize: 13 }}>이미 정상 범위예요. 술·운동은 바꿔보기에서 확인해 보세요.</div></div>
            <a href="#/whatif" style={{ fontSize: 13, fontWeight: 700 }}>바꿔보기</a>
          </div>
        )}

        <h2 className="h2">지금 이 상태일 가능성</h2>
        <p className="lead" style={{ marginTop: -6, fontSize: 13, color: 'var(--slate)' }}>앞으로 생길 확률이 아니라 지금 상태예요. 같은 나이대·성별 평균과 같은 기준으로 비교했어요.</p>
        <div className="card" style={{ padding: '4px 18px' }}>
          {r.prob.map((c) => (
            <a key={c.id} className="row" href={`#/detail/${c.id}`} style={{ gap: 10 }}>
              <div>
                <b style={{ fontSize: 16, color: 'var(--obsidian)' }}>{c.title}</b> <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)' }}>{c.badge}</span>
                {c.meaning && <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--charcoal)', marginTop: 2 }}>{c.meaning}</div>}
              </div>
              {c.cmp ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                    <b style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', color: c.cmp.col }}>{c.cmp.headline}</b>
                    <span style={{ whiteSpace: 'nowrap' }}><b style={{ fontSize: 22, fontWeight: 900, color: 'var(--obsidian)' }}>{c.pct}</b><b style={{ fontSize: 13 }}>%</b></span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '58px 1fr 48px', alignItems: 'center', gap: '6px 8px', fontSize: 11 }}>
                    <span style={{ fontWeight: 700, color: c.cmp.col }}>나</span><div className="bar"><i style={{ width: `${c.meW}%`, background: c.cmp.col }} /></div><span style={{ textAlign: 'right', fontWeight: 700, color: c.cmp.col }}>{c.pct}%</span>
                    <span style={{ color: 'var(--slate)' }}>또래 평균</span><div className="bar"><i style={{ width: `${c.peerW}%`, background: '#c2c6be' }} /></div><span style={{ textAlign: 'right', color: 'var(--slate)' }}>{c.peerTxt}%</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--slate)' }}>또래 평균 = {c.cmp.who}{c.cmp.note ? ` · ${c.cmp.note}` : ''}</span>
                  {c.cmp.action && <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--look-bg)', color: LOOK, fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>→ {c.cmp.action}</div>}
                </>
              ) : (
                <div style={{ padding: '10px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.55, background: c.tone === 'look' ? 'var(--look-bg)' : 'var(--bg)', color: c.tone === 'look' ? LOOK : 'var(--charcoal)', fontWeight: c.tone === 'look' ? 600 : 400 }}>
                  {c.status === 'managed' && <b style={{ color: INK }}>진단받아 관리 중 · </b>}{c.note}
                </div>
              )}
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
