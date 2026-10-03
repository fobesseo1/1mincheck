import { useEffect, useState, type CSSProperties } from 'react';
import MINI from '../../../engine/src/mini_rates.json';
import { useStore } from '../ui.tsx';
import { riskView, fracOf, SEV_COLOR } from '../lib/risk.ts';
import { freqOf, peerLine } from '../lib/b.ts';
import { f1 } from '../lib/view.ts';

// 랜딩 미니 체험: 성별·나이·키·몸무게만 받아 '결과 보기'를 누르면 보여준다.
// 모르는 답을 '없음'으로 가정하지 않고, 같은 성별·나이대·BMI 구간 사람들의 실제 비율(국민건강영양조사 2022–2024, 진단받은 사람 포함)을 쓴다.
// 크게는 '4명 중 1명'(절대)과 '또래의 몇 배' 중 더 경고가 되는 쪽, 작게는 나머지와 또래 평균.
type Cell = { pct: number; n: number; scope: string } | null;
const AGES = [19, 30, 40, 50, 60, 70];
const AGE_LABEL = ['20대', '30대', '40대', '50대', '60대', '70세 이상'];
const BMI_LABEL = ['BMI 23 미만', 'BMI 23–25', 'BMI 25–30', 'BMI 30 이상'];
const ITEMS = [
  { id: 'dm', name: '당뇨', who: '진단받은 사람 포함' },
  { id: 'htn', name: '고혈압', who: '진단받은 사람 포함' },
  { id: 'nafld', name: '지방간', who: '점수표 기준' },
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
      // 절대 비율과 또래 비교 중 더 경고가 되는 쪽을 크게 (lib/risk.ts)
      const v = c && all ? riskView(c.pct, all.pct, group) : null;
      return { ...it, pct: c ? c.pct : null, all: all ? all.pct : null, scope: c?.scope ?? '', sev: v?.sev ?? 0, big: v?.main ?? '–', small: v?.sub ?? '', frac: c && v && v.absSev >= v.relSev ? fracOf(c.pct) : null };
    }),
  };
}

// 미니 결과는 탭을 닫기 전까지만 이 기기 세션에 둔다(서버 전송 없음). 랜딩의 다른 '체크 시작' 버튼들이 같은 색·문구를 쓴다.
export const MINI_KEY = '1mincheck.mini';
/** 한 칸이라도 넣으면 저장(일부 입력). 결과까지 봤으면 tone·title 이 있다 */
export type MiniSaved = { tone?: 0 | 1 | 2; title?: string; age: string; sex: 'M' | 'F' | null; h: string; w: string };
export function loadMini(): MiniSaved | null { try { const s = sessionStorage.getItem(MINI_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function saveMini(v: MiniSaved | null) { try { if (v) sessionStorage.setItem(MINI_KEY, JSON.stringify(v)); else sessionStorage.removeItem(MINI_KEY); } catch { /* 저장소 없음 */ } window.dispatchEvent(new Event('mini-change')); }
/** 단계별 버튼 문구: nav = 상단 메뉴, main = 첫 화면·아래 띠 */
/** 미니에서 넣은 값(빈 칸 제외)을 기본정보 초안에 채운다 */
export const miniDraft = (m: MiniSaved) => ({ ...(m.age ? { age: m.age } : {}), ...(m.sex ? { sex: m.sex } : {}), ...(m.h ? { height: m.h } : {}), ...(m.w ? { weight: m.w } : {}) });
export const MINI_CTA = {
  none: { nav: '1분 건강 체크하기', main: '1분 건강 체크하기' },
  partial: { nav: '이어서 체크하기', main: '이어서 체크하기' },
  2: { nav: '내 위험 확인하기', main: '1분 더 입력하고 정확한 위험 확인하기' },
  1: { nav: '더 정확히 보기', main: '1분 더 입력하고 더 정확한 결과 보기' },
  0: { nav: '습관 확인하기', main: '1분 더 입력하고 내 건강 습관 확인하기' },
} as const;

/** 미니 결과 한 줄 결론: 세 항목을 종합해 '그래서 어떤가'를 먼저 말한다 */
export function miniHeadline(rows: { name: string; sev: number }[]) {
  const hi = rows.filter((r) => r.sev === 2), mid = rows.filter((r) => r.sev >= 1);
  if (hi.length >= 2) return { tone: 2, title: `${rows.length}가지 중 ${hi.length}가지가 위험한 쪽이에요`, sub: '같은 체형 평균만 봐도 이래요. 내 습관까지 넣어야 진짜 위험이 나와요.' };
  if (mid.length >= 1) { const last = mid[mid.length - 1].name, c = last.charCodeAt(last.length - 1) - 0xac00;
    return { tone: 1, title: `${mid.map((r) => r.name).join('·')}${c >= 0 && c % 28 ? '을' : '를'} 조심해야 하는 체형이에요`, sub: '체형만 본 결과예요. 허리·혈압·흡연·가족력에 따라 나는 더 높을 수도 있어요.' }; }
  return { tone: 0, title: '또래보다 괜찮은 체형이에요', sub: '체형만 본 결과예요. 허리·혈압·흡연·가족력까지 넣으면 더 정확해요.' };
}

/** 'd명 중 m명'을 사람 그림으로: m명이 차례로 채워진다 */
function People({ m, d, col }: { m: number; d: number; col: string }) {
  return (
    <span aria-hidden style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: d }, (_, k) => (
        <svg key={k} width="14" height="16" viewBox="0 0 14 16" className={k < m ? 'mini-on' : ''} style={{ ['--c' as string]: col, animationDelay: `${0.15 + k * 0.12}s` } as CSSProperties}>
          <circle cx="7" cy="4" r="3.2" /><path d="M1.5 15.5c0-3.6 2.5-6.2 5.5-6.2s5.5 2.6 5.5 6.2z" />
        </svg>
      ))}
    </span>
  );
}

export function MiniTrial() {
  const { setDraft } = useStore();
  const saved = loadMini();   // 새로고침해도 탭을 닫기 전까지는 결과를 다시 보여준다
  const [age, setAge] = useState(saved?.age ?? ''), [sex, setSex] = useState<'M' | 'F' | null>(saved?.sex ?? null), [h, setH] = useState(saved?.h ?? ''), [w, setW] = useState(saved?.w ?? '');
  const [res, setRes] = useState<ReturnType<typeof miniResults> | null>(() => (saved?.tone != null && saved.sex ? miniResults(Number(saved.age), saved.sex, Number(saved.h), Number(saved.w)) : null)), [tried, setTried] = useState(false);
  // 한 칸이라도 넣으면 이 탭 세션에 저장 → 랜딩의 다른 버튼이 '이어서'로 바뀌고 값을 가지고 간다
  useEffect(() => {
    const hd = res ? miniHeadline(res.rows) : null;
    saveMini(age || sex || h || w ? { tone: hd ? (hd.tone as 0 | 1 | 2) : undefined, title: hd?.title, age, sex, h, w } : null);
  }, [age, sex, h, w, res]);
  const err = miniError(age, h, w, sex);
  // 값을 고치면 결과를 지우고 다시 누르게 한다 (입력할 때마다 숫자가 바뀌지 않게)
  const edit = (set: (s: string) => void) => (s: string) => { set(s.replace(/[^0-9.]/g, '')); setRes(null); };
  const show = () => {
    setTried(true); if (err || !sex) return;
    setRes(miniResults(Number(age), sex, Number(h), Number(w)));
  };
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <b style={{ fontSize: 18, color: 'var(--obsidian)' }}>내 건강, 간단히 먼저 보기</b>
        <span className="cap">성별·나이·키·몸무게만 입력해 보세요</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['F', 'M'] as const).map((s) => <button key={s} type="button" onClick={() => { setSex(s); setRes(null); }} aria-pressed={sex === s}
          style={{ flex: 1, height: 44, borderRadius: 12, border: `2px solid ${sex === s ? 'var(--ink)' : 'var(--line)'}`, background: sex === s ? 'var(--lime)' : '#fff', color: 'var(--ink)', fontSize: 15, fontWeight: 700 }}>{s === 'F' ? '여성' : '남성'}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>{field('만 나이', age, setAge, '세', '45')}{field('키', h, setH, 'cm', '165')}{field('몸무게', w, setW, 'kg', '65')}</div>
      {!res && <button type="button" className="btn dark" onClick={show} style={{ border: 0, width: '100%' }}>간단 결과 보기</button>}
      {!res && tried && err && <div role="alert" style={{ fontSize: 14, textAlign: 'center', color: 'var(--look)', fontWeight: 600 }}>{err}</div>}
      {res && (() => {
        const hd = miniHeadline(res.rows);
        return (
          <div role="status" className="mini-res" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ padding: '14px 16px', borderRadius: 16, background: hd.tone === 2 ? '#cb272f' : hd.tone === 1 ? '#fdecea' : 'var(--lime)', color: hd.tone === 2 ? '#fff' : hd.tone === 1 ? '#cb272f' : 'var(--ink)' }}>
              <b style={{ display: 'block', fontSize: 19, lineHeight: 1.35, fontWeight: 900, letterSpacing: '-0.03em' }}>{hd.title}</b>
              <span style={{ display: 'block', marginTop: 4, fontSize: 13, lineHeight: 1.5, color: hd.tone === 1 ? 'var(--charcoal)' : undefined }}>{hd.sub}</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--slate)' }}>기본 정보로 보는 간단한 추정 결과예요. {res.group} · {res.bmiLabel} (내 BMI {res.bmi})인 사람들은</span>
            {res.rows.map((p) => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', borderRadius: 14, background: 'var(--bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                  <b style={{ fontSize: 16, color: 'var(--obsidian)' }}>{p.name} <small style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)' }}>같은 체형 비율 · {p.who}</small></b>
                  <b style={{ flexShrink: 0, fontSize: p.sev ? 19 : 15, fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap', color: SEV_COLOR[p.sev] }}>{p.pct != null ? freqOf(p.pct) : '–'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  {p.frac ? <People m={p.frac.m} d={p.frac.d} col={SEV_COLOR[p.sev]} /> : <span />}
                  {p.pct != null && p.all != null && <span style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--charcoal)', textAlign: 'right' }}>{f1(p.pct)}% · {peerLine(p.pct, p.all, f1(p.all))}</span>}
                </div>
              </div>
            ))}
            {/* 버튼도 결론 단계를 따른다: 위험 = 빨강(빠른 맥박·화살표), 조심 = 빨강 테두리, 괜찮음 = 라임(느린 빛) */}
            <button type="button" className={`btn mini-go mini-go-${hd.tone}`} onClick={go} style={{ width: '100%', marginTop: 6, fontSize: 16, height: 'auto', minHeight: 54, padding: '12px 20px', lineHeight: 1.35, textAlign: 'center' }}>
              {MINI_CTA[hd.tone as 0 | 1 | 2].main} <span className="mini-arrow" aria-hidden>→</span>
            </button>
            <span style={{ fontSize: 12, textAlign: 'center', color: 'var(--slate)' }}>허리·혈압·흡연·가족력 등 약 10문항 · 서버 저장 없음</span>
            <details style={{ fontSize: 12, color: 'var(--slate)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>어떻게 계산했나요?</summary>
              <p className="help" style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.5 }}>국민건강영양조사(2022–2024) 원시자료에서 나와 성별·나이대·BMI가 같은 사람들의 값이에요. 당뇨·고혈압은 진단받은 사람까지 포함한 실제 비율, 지방간은 점수표 평균이에요. 나에게 맞춘 값이 아니고 진단도 아니에요.</p>
            </details>
          </div>
        );
      })()}
    </div>
  );
}
