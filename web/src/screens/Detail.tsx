import type { ReactNode, CSSProperties } from 'react';
import { useStore, Nav, Icon, People, Gauge, Crisis } from '../ui.tsx';
import { suggestScenario } from '../state.ts';
import { viewDetail, f1, pctText, statusText, flagOf, severeBp, INK, LOOK, type ViewResult } from '../lib/view.ts';
import { DevNote } from './DevNote.tsx';
import { NAMES, TITLE, TOOL, BADGE, WHAT, WHY, HOW, NEXT, NEXT_SPECIAL, SRC, KNHANES, MODULE_OF, MEANING, DISCLAIMER, type ItemId } from '../lib/content.ts';
import { useInput, NeedInput } from './Results.tsx';

const MOD_ROUTE = { sleep: '/sleep', mind: '/mind', gerd: '/digest', diet: '/diet' };
const SCALE: Partial<Record<ItemId, [number, number, string]>> = {
  obesity: [15, 35, 'BMI'], isi: [0, 28, 'ISI / 28점'], diet: [0, 100, '참고 지표 / 100점'], osa: [0, 8, 'STOP-Bang / 8점'], gad: [0, 6, 'GAD-2 / 6점'], gerd: [0, 18, 'GerdQ / 18점'],
};

export function Detail({ id }: { id: ItemId }) {
  const { setDraft } = useStore();
  const inp = useInput();
  if (!inp) return <NeedInput />;
  if (!NAMES[id]) return <NeedInput />;
  const d = viewDetail(id, inp, suggestScenario(inp)), r = d.r;
  const flag = flagOf(r, inp), col = flag ? LOOK : INK;
  const sc: [number, number, string] | undefined = id === 'dep' ? (inp.mind?.phq.length === 9 ? [0, 27, 'PHQ-9 / 27점'] : [0, 6, 'PHQ-2 / 6점']) : SCALE[id];
  const mod = MODULE_OF[id];
  const sources = [...SRC[id], KNHANES];
  const card = (children: ReactNode, style?: CSSProperties) => <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, ...style }}>{children}</div>;
  return (
    <div className="page fade">
      <Nav back="/result" title={TITLE[id]} sub={TOOL[id]} />
      {d.crisis && <Crisis />}

      {/* 핵심 숫자 */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '26px 20px 22px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="pill" style={{ background: INK, color: 'var(--lime)' }}>{BADGE[r.type]} · {r.type}</span>
          {d.ratioTag && <span className="pill" style={{ background: d.ratioBg, color: d.ratioFg }}>{d.ratioTag}</span>}
        </div>
        {r.status === 'ok' && d.isProb && r.value != null && (<>
          {MEANING[id] && <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--obsidian)', marginTop: 10 }}>{MEANING[id]}</div>}
          {d.cmp && <div style={{ fontSize: 30, lineHeight: 1.2, fontWeight: 900, letterSpacing: '-0.04em', color: d.cmp.col, marginTop: 4 }}>{d.cmp.headline}</div>}
          <div><span style={{ fontSize: r.value < 0.1 ? 40 : 72, lineHeight: 1, fontWeight: 900, letterSpacing: '-0.06em', color: 'var(--obsidian)' }}>{pctText(r.value)}</span><b style={{ fontSize: 22, color: 'var(--obsidian)' }}>%</b></div>
          <div style={{ fontSize: 14, color: 'var(--charcoal)' }}>나와 같은 조건인 사람 100명 중 약 <b>{d.n}명</b>{id === 'dm' ? ' · 상대 오차 ±약 25%' : ''}</div>
          {d.cmp && <div style={{ fontSize: 13, color: 'var(--slate)' }}>또래 평균 {f1(d.cmp.peer)}% ({d.cmp.who})</div>}
          {d.rank != null && <div style={{ marginTop: 4, padding: '8px 14px', borderRadius: 12, background: 'var(--bg)', fontSize: 13, lineHeight: 1.5 }}>
            같은 나이(±5세)·성별 100명을 줄 세우면 <b>낮은 쪽에서 약 {d.rank}번째</b>예요
          </div>}
          <div style={{ width: '100%', marginTop: 6 }}><DevNote id={id} raw={(r as ViewResult).raw} value={r.value} rawPeer={(r as ViewResult).rawPeer} peer={d.cmp?.peer} sex={inp.sex} age={inp.age} /></div>
          {d.cmp?.action && <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 14, background: 'var(--look-bg)', color: LOOK, fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>→ {d.cmp.action}</div>}
          <div style={{ marginTop: 14, width: '100%' }}><People cells={d.people} /></div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12, color: 'var(--obsidian)', marginTop: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: '50%', background: INK }} />{d.removed ? `관리해도 남는 ${d.m}명` : `100명 중 ${d.n}명`}</span>
            {d.removed > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--lime)', boxShadow: `inset 0 0 0 1.5px ${INK}` }} />{d.scenarioText}이면 빠지는 {d.removed}명</span>}
          </div>
        </>)}
        {r.status === 'ok' && d.isProb && r.value == null && r.range && (<>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>나와 같은 조건인 사람 100명 중</div>
          <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-0.05em', color: 'var(--obsidian)' }}>{Math.round(r.range[0])}–{Math.round(r.range[1])}<small style={{ fontSize: 22 }}>명</small></div>
          <div style={{ fontSize: 14 }}>허리둘레·운동 등 ‘모름’이 있어 범위로 보여드려요. 입력하면 하나의 값으로 좁혀져요.</div>
          <a className="cta outline" href="#/info" style={{ marginTop: 10 }}>기본정보 고치기</a>
        </>)}
        {r.status === 'ok' && !d.isProb && sc && r.value != null && (<>
          <div style={{ marginTop: 14 }}><Gauge f={(r.value - sc[0]) / (sc[1] - sc[0])} v={id === 'obesity' ? f1(r.value) : String(r.value)} col={col} w={200} /></div>
          <div style={{ fontSize: 13, color: 'var(--slate)' }}>{sc[2]}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: col }}>{r.category}</div>
        </>)}
        {r.status === 'ok' && !d.isProb && r.value == null && <div style={{ fontSize: 26, fontWeight: 800, color: INK, marginTop: 14 }}>{r.category}</div>}
        {r.status === 'managed' && <><div style={{ fontSize: 26, fontWeight: 800, color: INK, marginTop: 14 }}>진단받아 관리 중</div><p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{d.statusNote}</p></>}
        {r.status === 'criteria' && <><div style={{ fontSize: 24, fontWeight: 800, color: LOOK, marginTop: 14 }}>{({ dm: '당뇨 기준에 해당하는 수치, 확인 필요', chol: '총콜레스테롤이 기준 이상이에요' } as Partial<Record<ItemId, string>>)[id] ?? '측정 혈압이 고혈압 기준이에요'}</div><p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{d.statusNote}</p></>}
        {(r.status as string) === 'measured' && <><div style={{ fontSize: 24, fontWeight: 800, color: INK, marginTop: 14 }}>검진 수치를 반영했어요</div><p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{d.statusNote}</p></>}
        {d.screen && <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 14, background: 'var(--bg)', color: 'var(--charcoal)', fontSize: 13, lineHeight: 1.5 }}>{d.screen}</div>}
        {d.measured && <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 14, background: 'var(--linen)', color: INK, fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{d.measured}</div>}
        {r.status === 'excluded' && <><div style={{ fontSize: 24, fontWeight: 800, color: LOOK, marginTop: 14 }}>{id === 'nafld' ? '술 때문에 간 검사가 필요해요' : statusText[r.status]}</div><p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: LOOK }}>{d.statusNote}</p></>}
        {r.status === 'na' && <><div style={{ fontSize: 24, fontWeight: 800, color: INK, marginTop: 14 }}>{statusText[r.status]}</div><p style={{ margin: 0, fontSize: 14 }}>{d.statusNote}</p></>}
        {r.status === 'needs_input' && mod && <><div style={{ fontSize: 22, fontWeight: 800, color: INK, marginTop: 14 }}>답하면 볼 수 있어요</div>
          <a className="cta" href={'#' + MOD_ROUTE[mod]} onClick={() => setDraft((x) => ({ ...x, modules: { ...x.modules, [mod]: true } }))} style={{ marginTop: 10 }}>질문 답하기</a></>}
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.55 }}>{WHAT[id]}</p>
      </div>

      {WHY[id] && card(<>
        <b style={{ fontSize: 15, color: 'var(--obsidian)' }}>왜 중요할까요</b>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{WHY[id]}</p>
        <span className="help">대한골대사학회·국민건강보험공단 팩트시트 2023 (50세 이상, 2002–2022 건강보험 자료)</span>
      </>)}

      {/* 동년배 */}
      {r.peer != null && r.status === 'ok' && card(<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{d.bands.length ? '또래 곡선' : '또래와 비교'}</b><span className="cap">{d.group}</span></div>
        {d.bands.length > 0 ? (<>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150, borderBottom: '1px solid var(--line2)' }}>
            {(() => { const top = Math.max(30, Math.ceil(Math.max(...d.bands.map((b) => b.v), r.value ?? 0) * 1.1 / 10) * 10); return d.bands.map((b) => (
              <div key={b.l} style={{ position: 'relative', flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: '8px 8px 0 0', background: b.mine ? '#eef6e8' : 'transparent' }}>
                <div style={{ height: `${(b.v / top) * 100}%`, borderRadius: '6px 6px 0 0', background: b.mine ? INK : '#c2c6be' }} />
                {b.mine && r.value != null && <i style={{ position: 'absolute', left: '50%', bottom: `${(r.value / top) * 100}%`, transform: 'translate(-50%, 50%)', width: 16, height: 16, borderRadius: '50%', background: 'var(--lime)', border: `3px solid ${INK}`, boxSizing: 'border-box' }} />}
              </div>)); })()}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>{d.bands.map((b) => <div key={b.l} style={{ flex: 1, textAlign: 'center', fontSize: 11 }}><b style={{ color: 'var(--obsidian)', fontWeight: b.mine ? 800 : 500 }}>{f1(b.v)}</b><div style={{ color: 'var(--slate)' }}>{b.l}</div></div>)}</div>
        </>) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['나', r.unit === '%' ? r.value : null, INK], [r.unit === '%' ? '또래 평균' : '또래 중 기준 이상', d.cmp?.peer ?? r.peer, '#c2c6be']].map(([k, v, c]) => (
              <div key={k as string}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>{k as string}</span><b>{v == null ? (r.unit === '%' ? '–' : `${r.score ?? r.value}점`) : `${f1(v as number)}%`}</b></div>
                {v != null && <div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${Math.min(100, ((v as number) / Math.max(30, r.peer! * 1.3, (r.value ?? 0) * 1.3)) * 100)}%`, background: c as string }} /></div>}</div>
            ))}
          </div>
        )}
        <p className="help" style={{ margin: 0 }}>{id === 'dm' ? '막대는 각 연령대에서 진단받지 않은 사람 중 당뇨인 비율(유병률에서 이미 진단받은 사람을 뺀 값), 점은 내 값이에요.' : r.notes?.find((n) => n.includes('동년배'))?.replace('동년배', '또래') ?? (id === 'isi' ? '또래 값은 ISI 10점 이상 비율이에요.' : id === 'dep' ? '또래 값은 같은 나이·성별에서 PHQ-9 10점 이상인 비율이에요(2024).' : id === 'osa' ? '또래 값은 40–69세 수면다원검사 기준 수면호흡장애(AHI 5 이상) 비율이에요(2004).' : id === 'nafld' ? '또래 값은 간지방지수 기준 성인 전체 비율이에요.' : '같은 나이대·성별 한국인 통계예요.')}</p>
      </>)}

      {/* 당뇨 점수 내역 */}
      {d.parts.length > 0 && card(<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>점수는 이렇게 나왔어요</b><span className="cap">한국형 당뇨 선별점수</span></div>
        <div><b style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.05em', color: 'var(--obsidian)' }}>{r.score}</b> <span style={{ fontSize: 14, color: 'var(--slate)' }}>/ 11점</span></div>
        {d.parts.map((p) => <div key={p.k} style={{ display: 'flex', justifyContent: 'space-between', minHeight: 34, alignItems: 'center', borderTop: '1px solid var(--line)', fontSize: 14 }}><span>{p.k}</span><b style={{ color: p.v > 0 ? 'var(--obsidian)' : 'var(--slate)' }}>{p.v > 0 ? '+' + p.v : '0'}</b></div>)}
        <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--bg)', fontSize: 13, lineHeight: 1.5, color: 'var(--obsidian)' }}>{(r.score ?? 0) >= 5 ? '5점부터는 검진에서 혈당을 한 번 확인해 보길 권하는 구간이에요.' : '선별 기준(5점)보다 낮아요.'}</div>
      </>)}

      {/* 관리하면 */}
      {d.afterV != null && r.value != null && d.afterV < r.value && (
        <div className="dark" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><b style={{ fontSize: 15 }}>관리하면 이만큼 줄어요</b><span className="tag" style={{ background: 'var(--spruce)', color: 'var(--lime)' }}>{d.scenarioText}</span></div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: 11, fontWeight: 700, color: '#d8e8cf' }}>지금</div><b style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.05em' }}>{f1(r.value)}</b><small>{d.isProb ? '%' : ''}</small></div>
            <span style={{ color: 'var(--lime)' }}>{Icon.right}</span>
            <div style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: 11, fontWeight: 700, color: '#d8e8cf' }}>바꾼 후</div><b style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.05em', color: 'var(--lime)' }}>{f1(d.afterV)}</b><small style={{ color: 'var(--lime)' }}>{d.isProb ? '%' : ''}</small></div>
          </div>
          <a className="cta white" href="#/whatif" style={{ height: 50, fontSize: 16 }}>다른 습관도 바꿔보기</a>
        </div>
      )}

      {/* 엔진 메모 */}
      {(() => { const extra = (r.notes ?? []).filter((n) => !n.includes('동년배') && !n.includes('상대 오차') && !(r.status !== 'ok' && n === r.notes?.[0]));
        return extra.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px' }}>{extra.map((n) => <span key={n} className="help">· {n}</span>)}</div>; })()}

      {card(<>
        <b style={{ fontSize: 15, color: 'var(--obsidian)' }}>다음에 할 일</b>
        {(NEXT_SPECIAL[id === 'htn' && r.status === 'criteria' && severeBp(inp) ? 'htn:severe' : `${id}:${r.status}`] ?? NEXT[id]).map((t, k) => (
          <div key={t.t} style={{ display: 'flex', gap: 14, padding: '12px 0', borderTop: '1px solid var(--line)' }}>
            <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 10, background: 'var(--linen)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: INK }}>{k + 1}</span>
            <div><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{t.t}</b><div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>{t.d}</div></div>
          </div>
        ))}
        {id === 'diet' && (r.flags?.length ?? 0) > 0 && <div style={{ fontSize: 13, color: 'var(--look)' }}>지금 보완하면 좋은 점: {r.flags!.join(', ')}</div>}
      </>)}

      {card(<>
        <b style={{ fontSize: 15, color: 'var(--obsidian)' }}>근거</b>
        {sources.map((s) => (
          <a key={s.u} href={s.u} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 56, borderTop: '1px solid var(--line)', textDecoration: 'none' }}>
            <span><b style={{ fontSize: 14, color: 'var(--obsidian)' }}>{s.t}</b><div style={{ fontSize: 12, color: 'var(--slate)' }}>{s.d}</div></span>{Icon.ext}
          </a>
        ))}
        <details style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg)' }}>
          <summary style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: 'var(--obsidian)' }}>계산 방법 보기 {Icon.down}</summary>
          <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.6 }}>{HOW[id]} 이 계산은 기기 안에서만 해요.</p>
        </details>
      </>)}
      <p className="help" style={{ margin: '0 4px' }}>{DISCLAIMER}</p>
    </div>
  );
}
