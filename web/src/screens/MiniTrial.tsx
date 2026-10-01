import { useState } from 'react';
import type { Input } from '../../../engine/src/engine.ts';
import { viewResults } from '../lib/view.ts';
import { useStore } from '../ui.tsx';

// 랜딩 미니 체험: 나이·성별·키·몸무게만으로 고혈압·당뇨·지방간. 나머지 답은 '없음/모름'으로 두고 화면에 밝힌다.
const REST = { waistCm: null, smoke: 'never', alcohol: 'none', famDM: false, dx: { htn: false, dm: false, chol: false }, bp: 'unknown', exercise: null, meno: null } as const;
const IDS = ['htn', 'dm', 'nafld'] as const;
const SHORT: Record<string, string> = { htn: '고혈압', dm: '이미 당뇨일 확률', nafld: '지방간' };

export function miniError(age: string, h: string, w: string): string | null {
  const a = Number(age), hh = Number(h), ww = Number(w);
  if (age === '' || !Number.isInteger(a)) return '만 나이를 숫자로 넣어 주세요';
  if (a < 19 || a > 100) return '만 19–100세만 계산해요';
  if (!(hh >= 120 && hh <= 220)) return '키는 120–220cm';
  if (!(ww >= 30 && ww <= 200)) return '몸무게는 30–200kg';
  return null;
}

export function miniResults(age: number, sex: 'M' | 'F', heightCm: number, weightKg: number) {
  const inp = { ...REST, age, sex, heightCm, weightKg } as unknown as Input;
  return viewResults(inp, {} as never).prob.filter((p) => (IDS as readonly string[]).includes(p.id))
    .sort((a, b) => IDS.indexOf(a.id as never) - IDS.indexOf(b.id as never));
}

export function MiniTrial() {
  const { setDraft } = useStore();
  const [age, setAge] = useState('45'), [sex, setSex] = useState<'M' | 'F'>('F'), [h, setH] = useState('160'), [w, setW] = useState('62');
  const err = miniError(age, h, w);
  const rows = err ? [] : miniResults(Number(age), sex, Number(h), Number(w));
  const go = () => {
    setDraft((d) => ({ ...d, age, sex, height: h, weight: w }));
    location.hash = '#/info';
  };
  const field = (label: string, v: string, set: (s: string) => void, unit: string) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, height: 48, padding: '0 12px', borderRadius: 12, background: 'var(--bg)' }}>
        <input inputMode="numeric" value={v} aria-label={label} onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ''))}
          style={{ width: '100%', minWidth: 0, border: 0, background: 'transparent', fontSize: 20, fontWeight: 800, color: 'var(--obsidian)', lineHeight: '48px', outline: 'none' }} />
        <small style={{ fontSize: 13, color: 'var(--slate)' }}>{unit}</small>
      </span>
    </label>
  );
  return (
    <div className="card mini" style={{ borderRadius: 24, boxShadow: '0 6px 20px rgba(0,0,0,.06)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <b style={{ fontSize: 18, color: 'var(--obsidian)' }}>10초 미니 체험</b>
        <span className="cap">4개만 넣어 보세요</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['F', 'M'] as const).map((s) => <button key={s} type="button" onClick={() => setSex(s)} aria-pressed={sex === s}
          style={{ flex: 1, height: 44, borderRadius: 12, border: `2px solid ${sex === s ? 'var(--ink)' : 'var(--line)'}`, background: sex === s ? 'var(--lime)' : '#fff', color: 'var(--ink)', fontSize: 15, fontWeight: 700 }}>{s === 'F' ? '여성' : '남성'}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>{field('만 나이', age, setAge, '세')}{field('키', h, setH, 'cm')}{field('몸무게', w, setW, 'kg')}</div>
      {err
        ? <div role="status" style={{ padding: 16, borderRadius: 14, background: 'var(--bg)', fontSize: 14, textAlign: 'center' }}>{err}</div>
        : <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((p) => {
            const range = p.pct.includes('–');
            return <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'var(--bg)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{SHORT[p.id]}</b>
                <span style={{ fontSize: 12, color: 'var(--slate)' }}>{p.cmp ? `${p.cmp.who} ${p.peerTxt}% · ${p.cmp.headline}` : range ? '허리둘레를 넣으면 범위가 좁아져요' : p.meaning}</span>
              </div>
              <b style={{ flexShrink: 0, fontSize: range ? 18 : 24, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--ink)' }}>{p.pct}%</b>
            </div>;
          })}
        </div>}
      <p className="help" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>허리·혈압은 모름, 흡연·음주·가족력은 없음으로 계산한 대략값이에요. 지금 상태일 가능성이며 진단이 아니에요.</p>
      <button type="button" className="btn lime" onClick={go} disabled={!!err} style={{ border: 0, width: '100%' }}>이어서 정확하게 체크하기</button>
    </div>
  );
}
