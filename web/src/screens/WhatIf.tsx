import { useState } from 'react';
import type { Alcohol } from '../../../engine/src/engine.ts';
import { Nav, TabBar, Icon } from '../ui.tsx';
import { suggestScenario } from '../state.ts';
import { whatIfRows } from '../lib/view.ts';
import { useInput, NeedInput } from './Results.tsx';

const ALC: [Alcohol, string][] = [['none', '안 마심'], ['lt1', '1잔 미만'], ['d1_4', '1–4.9잔'], ['d5', '5잔+']];
const TONE = { down: ['var(--lime)', 'var(--ink)'], up: ['var(--look-bg)', 'var(--look)'], same: ['var(--bg)', 'var(--slate)'], na: ['var(--bg)', 'var(--charcoal)'] } as const;

export function WhatIf() {
  const inp = useInput();
  const sc0 = inp ? suggestScenario(inp) : { weightKg: 0, waistCm: 0 };
  const [dw, setDw] = useState(sc0.weightKg);
  const [dwa, setDwa] = useState(sc0.waistCm);
  const [alc, setAlc] = useState<Alcohol>(inp?.alcohol ?? 'none');
  const [ex, setEx] = useState<boolean>(inp?.exercise !== false);
  const [smoke, setSmoke] = useState<boolean>(inp?.smoke === 'current');
  if (!inp) return <NeedInput />;
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const after = { ...inp, weightKg: r1(inp.weightKg + dw), waistCm: inp.waistCm == null ? null : r1(inp.waistCm + dwa),
    smoke: smoke ? 'current' as const : inp.smoke === 'current' ? 'never' as const : inp.smoke, alcohol: alc, exercise: ex };
  const { rows, down, up } = whatIfRows(inp, after);
  const sign = (n: number, u: string) => (n === 0 ? '그대로' : `${n > 0 ? '+' : '−'}${Math.abs(n)}${u}`);
  const reset = () => { setDw(0); setDwa(0); setAlc(inp.alcohol); setEx(inp.exercise !== false); setSmoke(inp.smoke === 'current'); };
  return (
    <div className="app">
      <div className="page fade">
        <Nav title="바꿔보기" sub="바꾸면 바로 다시 계산해요" right={<button className="circle" aria-label="처음 값으로" onClick={reset}>{Icon.reset}</button>} />
        <div className="dark3">
          <div><span className="k">체중</span><span className="v" style={{ fontSize: 22 }}>{after.weightKg}kg</span><span className="s">{sign(dw, 'kg')}</span></div>
          <div className="sep" />
          <div className="mid"><span className="k">낮아지는 항목</span><span className="c" aria-live="polite">{down}<small style={{ fontSize: 20 }}>개</small></span><span className="s">{up ? `${up}개는 올라가요` : '올라가는 항목 없음'}</span></div>
          <div className="sep" />
          <div><span className="k">허리</span><span className="v" style={{ fontSize: 22 }}>{after.waistCm == null ? '모름' : after.waistCm + 'cm'}</span><span className="s">{after.waistCm == null ? '' : sign(dwa, 'cm')}</span></div>
        </div>

        <div className="card" style={{ padding: '4px 18px' }}>
          {rows.map((r) => (
            <div key={r.id} className="row">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{r.name}</b>
                <span style={{ whiteSpace: 'nowrap' }}><span style={{ fontSize: 13, color: 'var(--slate)' }}>{r.b} → </span><b style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--obsidian)' }}>{r.a}</b><span style={{ fontSize: 12 }}> {r.na ? '' : r.unit}</span></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="bar" style={{ flex: 1, overflow: 'hidden' }}><i style={{ width: `${r.wB}%`, background: '#c2c6be' }} /><i style={{ width: `${r.wA}%`, background: 'var(--ink)' }} /></div>
                <span className="tag" style={{ background: TONE[r.tone as keyof typeof TONE][0], color: TONE[r.tone as keyof typeof TONE][1] }}>{r.delta}</span>
              </div>
            </div>
          ))}
          <div className="help" style={{ padding: '12px 0', fontSize: 11 }}>회색 = 지금, 초록 = 바꾼 후 · 골다공증은 체중 증가를 권하는 것처럼 읽힐 수 있어 넣지 않았어요.</div>
        </div>

        <h2 className="h2">무엇을 바꿔볼까요?</h2>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><label htmlFor="wi-w"><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>체중</b></label><span><b>{after.weightKg}kg</b> <span style={{ color: 'var(--slate)' }}>{sign(dw, 'kg')}</span></span></div>
          <input id="wi-w" type="range" min={-20} max={10} step={1} value={dw} onChange={(e) => setDw(Number(e.target.value))} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate)' }}><span>−20kg</span><span>+10kg</span></div>
        </div>
        {inp.waistCm != null && (
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><label htmlFor="wi-wa"><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>허리둘레</b></label><span><b>{after.waistCm}cm</b> <span style={{ color: 'var(--slate)' }}>{sign(dwa, 'cm')}</span></span></div>
            <input id="wi-wa" type="range" min={-15} max={10} step={1} value={dwa} onChange={(e) => setDwa(Number(e.target.value))} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate)' }}><span>−15cm</span><span>+10cm</span></div>
          </div>
        )}
        <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <b style={{ fontSize: 15, color: 'var(--obsidian)' }}>음주 <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--slate)' }}>하루 평균</span></b>
          <div className="seg" role="group" aria-label="음주">{ALC.map(([v, t]) => <button key={v} type="button" aria-pressed={alc === v} onClick={() => setAlc(v)}>{t}</button>)}</div>
        </div>
        <div className="card" style={{ padding: '0 18px' }}>
          {([['운동', '주 2회 · 30분 이상', ex, setEx], ['흡연', '지금 피우는 경우', smoke, setSmoke]] as const).map(([t, s, v, f], k) => (
            <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 64, borderTop: k ? '1px solid var(--line)' : 0 }}>
              <span><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{t}</b><div style={{ fontSize: 12, color: 'var(--slate)' }}>{s}</div></span>
              <button type="button" role="switch" aria-checked={v} aria-label={t} className="switch" onClick={() => f(!v)}><i /></button>
            </div>
          ))}
        </div>
        <div className="help" style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>· 고혈압은 {inp.waistCm != null ? '허리' : '체중(BMI)'} 변화로 계산한 추정이에요(한국인 코호트).</span>
          <span>· 고콜레스테롤은 BMI 25를 넘나들 때만 바뀌어요. 체중 영향은 대략적이에요.</span>
        </div>
      </div>
      <TabBar at="whatif" />
    </div>
  );
}
