import { useState } from 'react';
import MINI from '../../../engine/src/mini_rates.json';
import { useStore } from '../ui.tsx';

// 랜딩 미니 체험: 성별·나이·키·몸무게만 받아 '결과 보기'를 누르면 보여준다.
// 모르는 답을 '없음'으로 가정하지 않고, 같은 성별·나이대·BMI 구간 사람들의 실제 비율(국민건강영양조사 2022–2024)을 쓴다.
type Cell = { pct: number; n: number; scope: string } | null;
const AGES = [19, 30, 40, 50, 60, 70];
const AGE_LABEL = ['20대', '30대', '40대', '50대', '60대', '70세 이상'];
const BMI_LABEL = ['BMI 23 미만', 'BMI 23–25', 'BMI 25–30', 'BMI 30 이상'];
const ITEMS = [
  { id: 'dm', name: '당뇨', who: '진단받지 않은 사람이 검사하면 당뇨로 나오는 비율' },
  { id: 'htn', name: '고혈압', who: '진단받지 않은 사람이 재면 고혈압 기준(140/90 이상)인 비율' },
  { id: 'nafld', name: '지방간', who: '같은 사람들의 지방간 가능성 평균 (점수표)' },
] as const;

export function miniError(age: string, h: string, w: string, sex: 'M' | 'F' | null): string | null {
  const a = Number(age), hh = Number(h), ww = Number(w);
  if (!sex) return '성별을 골라 주세요';
  if (age === '' || !Number.isInteger(a)) return '만 나이를 숫자로 넣어 주세요';
  if (a < 19 || a > 100) return '만 19–100세만 계산해요';
  if (!(hh >= 120 && hh <= 220)) return '키를 120–220cm로 넣어 주세요';
  if (!(ww >= 30 && ww <= 200)) return '몸무게를 30–200kg으로 넣어 주세요';
  return null;
}

export function miniResults(age: number, sex: 'M' | 'F', heightCm: number, weightKg: number) {
  const ai = AGES.reduce((k, a, j) => (age >= a ? j : k), 0), bmi = weightKg / (heightCm / 100) ** 2;
  const bi = bmi < 23 ? 0 : bmi < 25 ? 1 : bmi < 30 ? 2 : 3;
  const row = (MINI.table as unknown as Record<string, Record<string, Cell[]>>)[`${sex}${AGES[ai]}`];
  const group = `${AGE_LABEL[ai]} ${sex === 'F' ? '여성' : '남성'}`;
  return {
    bmi: Math.round(bmi * 10) / 10, group, bmiLabel: BMI_LABEL[bi],
    rows: ITEMS.map((it) => {
      const c = row[it.id][bi];
      const all = (row as unknown as Record<string, Cell>)[it.id + '_all'];
      const fmt = (v: number) => (v < 1 ? '1% 미만' : `${Math.round(v)}%`);
      return { ...it, pct: c ? c.pct : null, scope: c?.scope ?? '', text: c == null ? '–' : fmt(c.pct), approx: !!c && c.pct >= 1, avg: all ? `${group} 평균 ${fmt(all.pct)}` : '' };
    }),
  };
}

export function MiniTrial() {
  const { setDraft } = useStore();
  const [age, setAge] = useState(''), [sex, setSex] = useState<'M' | 'F' | null>(null), [h, setH] = useState(''), [w, setW] = useState('');
  const [res, setRes] = useState<ReturnType<typeof miniResults> | null>(null), [tried, setTried] = useState(false);
  const err = miniError(age, h, w, sex);
  // 값을 고치면 결과를 지우고 다시 누르게 한다 (입력할 때마다 숫자가 바뀌지 않게)
  const edit = (set: (s: string) => void) => (s: string) => { set(s.replace(/[^0-9.]/g, '')); setRes(null); };
  const show = () => { setTried(true); if (!err && sex) setRes(miniResults(Number(age), sex, Number(h), Number(w))); };
  const go = () => { setDraft((d) => ({ ...d, age, sex, height: h, weight: w })); location.hash = '#/info'; };
  const field = (label: string, v: string, set: (s: string) => void, unit: string, ph: string) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, height: 48, padding: '0 12px', borderRadius: 12, background: 'var(--bg)' }}>
        <input inputMode="decimal" value={v} placeholder={ph} aria-label={label} onChange={(e) => edit(set)(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') show(); }}
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
        {(['F', 'M'] as const).map((s) => <button key={s} type="button" onClick={() => { setSex(s); setRes(null); }} aria-pressed={sex === s}
          style={{ flex: 1, height: 44, borderRadius: 12, border: `2px solid ${sex === s ? 'var(--ink)' : 'var(--line)'}`, background: sex === s ? 'var(--lime)' : '#fff', color: 'var(--ink)', fontSize: 15, fontWeight: 700 }}>{s === 'F' ? '여성' : '남성'}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>{field('만 나이', age, setAge, '세', '45')}{field('키', h, setH, 'cm', '165')}{field('몸무게', w, setW, 'kg', '65')}</div>
      {!res && <button type="button" className="btn dark" onClick={show} style={{ border: 0, width: '100%' }}>결과 보기</button>}
      {!res && tried && err && <div role="alert" style={{ fontSize: 14, textAlign: 'center', color: 'var(--look)', fontWeight: 600 }}>{err}</div>}
      {res && (
        <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--charcoal)' }}><b style={{ color: 'var(--obsidian)' }}>{res.group} · {res.bmiLabel}</b> (내 BMI {res.bmi})인 사람 100명 중</span>
          {res.rows.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'var(--bg)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{p.name}</b>
                <span style={{ fontSize: 12, color: 'var(--slate)' }}>{p.who}</span>
              </div>
              <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <b style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--ink)', whiteSpace: 'nowrap' }}>{p.approx && <small style={{ fontSize: 12, fontWeight: 700, marginRight: 3, color: 'var(--slate)' }}>약</small>}{p.text}</b>
                {p.avg && <span style={{ fontSize: 11, color: 'var(--slate)', whiteSpace: 'nowrap' }}>{p.avg}</span>}
              </span>
            </div>
          ))}
          <p className="help" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>국민건강영양조사(2022–2024) 원시자료에서 나와 성별·나이대·BMI가 같은 사람들의 값이에요. 당뇨·고혈압은 실제 검사 결과 비율, 지방간은 점수표 평균이에요. 나에게 맞춘 값이 아니고 진단도 아니에요. 허리·혈압·흡연·가족력을 넣으면 나에게 맞게 계산해요.</p>
        </div>
      )}
      {res && <button type="button" className="btn lime" onClick={go} style={{ border: 0, width: '100%' }}>이어서 나에게 맞게 체크하기</button>}
    </div>
  );
}
