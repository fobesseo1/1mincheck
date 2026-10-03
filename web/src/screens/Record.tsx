import { useState } from 'react';
import { useStore, Nav, TabBar, Icon } from '../ui.tsx';
import { saveRecords, fromInput } from '../state.ts';
import { viewRecord, labOf } from '../lib/view.ts';
import { LABS } from '../lib/labs.ts';
import { go } from '../ui.tsx';

export function Record() {
  const { records, setRecords, setDraft, toast } = useStore();
  const n = records.length;
  const [pi, setPi] = useState(Math.max(0, n - 2));
  const [ci, setCi] = useState(Math.max(0, n - 1));
  const clear = () => { if (confirm('이 B버전에 저장된 기록을 모두 지울까요? 현재 버전(A)의 기록은 그대로예요. 되돌릴 수 없어요.')) { saveRecords([]); setRecords([]); toast('기록을 지웠어요'); } };
  const open = (k: number) => { setDraft(() => fromInput(records[k].input)); go('/result'); };
  if (n < 2) {
    return (
      <div className="app">
        <div className="page fade">
          <Nav title="기록 비교" sub="이 기기에 저장된 기록" />
          <div className="card" style={{ padding: '32px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <b style={{ fontSize: 17, color: 'var(--obsidian)' }}>{n === 0 ? '아직 저장한 기록이 없어요' : '아직 기록이 하나예요'}</b>
            <span style={{ fontSize: 14, lineHeight: 1.55 }}>결과 화면에서 ‘이 결과 저장하기’를 누르면 이 기기(브라우저)에 남아요. 다음에 다시 체크해 저장하면 지난번과 달라진 결과를 나란히 보여드려요.</span>
            {n === 1 && <button className="cta outline" onClick={() => open(0)} style={{ marginTop: 8 }}>{records[0].date} 결과 다시 보기</button>}
          </div>
          <a className="cta" href="#/start">체크 시작하기</a>
          <div className="grow" />
          {n > 0 && <button className="link" onClick={clear} style={{ fontSize: 13 }}>기록 지우기</button>}
        </div>
        <TabBar at="record" />
      </div>
    );
  }
  const p = records[Math.min(pi, n - 1)], c = records[Math.min(ci, n - 1)];
  const v = viewRecord(p.input, c.input), sameInput = JSON.stringify(p.input) === JSON.stringify(c.input);
  const Lp = labOf(p.input), Lc = labOf(c.input);
  const labRows = LABS.filter((l) => Lp[l.key] != null || Lc[l.key] != null).map((l) => ({ k: l.key, name: l.label, b: Lp[l.key] ?? '–', a: Lc[l.key] ?? '–', unit: l.unit }));
  const toSummary = () => { setDraft(() => fromInput(c.input)); go('/summary'); };
  const sel = (val: number, set: (x: number) => void, label: string, dark?: boolean) => (
    <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: 10, borderRadius: 14, background: dark ? 'var(--ink)' : 'var(--bg)' }}>
      <span className="cap" style={{ color: dark ? '#d8e8cf' : undefined }}>{label}</span>
      <select value={val} onChange={(e) => set(Number(e.target.value))} style={{ border: 0, background: 'transparent', fontSize: 15, fontWeight: 700, color: dark ? '#fff' : 'var(--obsidian)', textAlign: 'center' }}>
        {records.map((r, k) => <option key={r.id} value={k} style={{ color: '#000' }}>{r.date}{k === n - 1 ? ' (최근)' : ''}</option>)}
      </select>
    </label>
  );
  return (
    <div className="app">
      <div className="page fade">
        <Nav title="기록 비교" sub={`이 기기에 저장된 기록 ${n}개`} />
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8 }}>
          {sel(pi, setPi, '이전')}<span style={{ color: 'var(--ink)' }}>{Icon.right}</span>{sel(ci, setCi, '지금', true)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 4px' }}>
          <b style={{ fontSize: 17, color: 'var(--obsidian)' }}>지난번과 비교해 달라진 결과</b>
          <span style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--charcoal)' }}>{sameInput ? '두 기록의 입력이 같아서 추정 결과도 같아요.' : '입력한 몸 정보와 답변이 바뀌면서 추정 결과가 다시 계산됐어요. 실제 질환이 좋아지거나 나빠졌다는 진단은 아니에요.'}</span>
        </div>
        <div className="dark3">
          <div><span className="k">체중</span><span className="v" style={{ fontSize: 22 }}>{v.weight.v}</span><span className="s">{v.weight.s}</span></div>
          <div className="sep" />
          <div className="mid"><span className="k">추정이 낮아진 항목</span><span className="c">{v.down}<small style={{ fontSize: 20 }}>개</small></span><span className="s">{v.habit}</span></div>
          <div className="sep" />
          <div><span className="k">허리</span><span className="v" style={{ fontSize: 22 }}>{v.waist.v}</span><span className="s">{v.waist.s}</span></div>
        </div>
        <h2 className="h2">달라진 추정 결과</h2>
        <div className="card" style={{ padding: '4px 18px' }}>
          {v.rows.length === 0 && <div style={{ padding: '16px 0', fontSize: 14 }}>달라진 추정 결과가 없어요.</div>}
          {v.rows.map((r) => (
            <div key={r.id} className="row">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{r.name}</b>
                <span className="tag" style={{ background: r.better ? 'var(--lime)' : 'var(--look-bg)', color: r.better ? 'var(--ink)' : 'var(--look)' }}>{r.delta}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 56, fontSize: 15, fontWeight: 600, color: 'var(--slate)' }}>{r.b}</span>
                <svg width="100%" height="28" viewBox="0 0 200 28" preserveAspectRatio="none" aria-hidden="true" style={{ flex: 1 }}><line x1="6" y1={r.y1} x2="194" y2={r.y2} stroke="var(--ink)" strokeWidth="2" strokeDasharray="4 4" /><circle cx="6" cy={r.y1} r="5" fill="#c2c6be" /><circle cx="194" cy={r.y2} r="6" fill="var(--ink)" /></svg>
                <span style={{ width: 64, textAlign: 'right', fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--obsidian)' }}>{r.a}</span>
              </div>
              {r.why && <span style={{ fontSize: 12, color: 'var(--slate)' }}>{r.why}</span>}
            </div>
          ))}
          <details style={{ padding: '14px 0' }}>
            <summary style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: 'var(--obsidian)' }}>그대로인 항목 {v.same.length}개 {Icon.down}</summary>
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.8 }}>{v.same.join(' · ')}</div>
          </details>
        </div>
        {labRows.length > 0 && (<>
          <h2 className="h2">입력한 검진 수치 변화</h2>
          <div className="card" style={{ padding: '4px 18px' }}>
            {labRows.map((x) => <div key={x.k} className="row" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ fontSize: 14, color: 'var(--obsidian)' }}>{x.name}</b><span style={{ fontSize: 14 }}>{x.b} → <b>{x.a}</b> <small style={{ color: 'var(--slate)' }}>{x.unit}</small></span></div>)}
            <div className="help" style={{ padding: '10px 0', fontSize: 12 }}>측정값은 입력한 그대로예요. 위의 추정 결과 변화와는 다른 값이에요.</div>
          </div>
        </>)}
        <button className="cta outline" onClick={toSummary}>{Icon.save} {c.date} 결과로 진료용 결과 요약 저장</button>
        <button className="link" onClick={() => window.print()} style={{ fontSize: 13 }}>이 비교 화면 인쇄하기</button>
        <button className="cta outline" onClick={() => open(Math.min(ci, n - 1))}>{c.date} 결과 자세히 보기</button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 4px' }}>
          <span className="help">기록은 이 기기(브라우저)에만 있어요. 브라우저 데이터를 지우면 함께 사라져요. 이 비교용 B버전의 기록은 현재 버전과 따로 저장돼요.</span>
          <button className="link" onClick={clear} style={{ fontSize: 13, flexShrink: 0 }}>기록 지우기</button>
        </div>
      </div>
      <TabBar at="record" />
    </div>
  );
}
