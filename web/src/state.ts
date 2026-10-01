// 사용자가 답하는 중인 값(Draft)과, 그것을 engine 의 Input 으로 바꾸는 규칙 (docs/spec.md §5)
import type { Input, Alcohol, Bp } from '../../engine/src/engine.ts';

type YN = boolean | null;
type Pick4 = number | null;

export interface Draft {
  age: string; sex: 'M' | 'F' | null; height: string; weight: string; waist: string; waistUnknown: boolean;
  smoke: 'never' | 'past' | 'current' | null; alcohol: Alcohol | null; exercise: YN; meno: YN | 'unknown';
  famDM: YN; dx: { htn: boolean; dm: boolean; chol: boolean; none: boolean }; bp: Bp | null;
  modules: { sleep: boolean; mind: boolean; gerd: boolean; diet: boolean };
  sleep: { snore: YN; tired: YN; apnea: YN; neck: YN; insGate: YN; isi: Pick4[] };
  mind: { phq: Pick4[]; gad: Pick4[] };
  gerd: { gate: YN; gq: Pick4[] };
  diet: Pick4[];
}

export const emptyDraft = (): Draft => ({
  age: '', sex: null, height: '', weight: '', waist: '', waistUnknown: false,
  smoke: null, alcohol: null, exercise: null, meno: null, famDM: null,
  dx: { htn: false, dm: false, chol: false, none: false }, bp: null,
  modules: { sleep: true, mind: true, gerd: true, diet: true },
  sleep: { snore: null, tired: null, apnea: null, neck: null, insGate: null, isi: Array(7).fill(null) },
  mind: { phq: Array(9).fill(null), gad: [null, null] },
  gerd: { gate: null, gq: Array(6).fill(null) },
  diet: Array(7).fill(null),
});

const num = (s: string) => (s.trim() === '' ? NaN : Number(s));
const done = (xs: Pick4[]) => xs.every((x) => x != null);

// ── 화면별 완료 조건 ──
export const menoShown = (d: Draft) => d.sex === 'F' && num(d.age) >= 40;
export function basicError(d: Draft): string | null {
  const age = num(d.age), h = num(d.height), w = num(d.weight), wa = num(d.waist);
  if (d.age === '' || !Number.isInteger(age)) return '만 나이를 숫자로 입력해 주세요';
  if (age < 19) return 'under19';
  if (age > 100) return '만 나이는 100세까지 입력할 수 있어요';
  if (!d.sex) return '성별을 골라 주세요';
  if (!(h >= 120 && h <= 220)) return '키는 120–220cm 사이로 입력해 주세요';
  if (!(w >= 30 && w <= 200)) return '몸무게는 30–200kg 사이로 입력해 주세요';
  if (!d.waistUnknown && !(wa >= 50 && wa <= 150)) return '허리둘레를 입력하거나 ‘모름’을 눌러 주세요';
  return null;
}
export function lifeError(d: Draft): string | null {
  if (!d.smoke) return '흡연 여부를 골라 주세요';
  if (!d.alcohol) return '음주 정도를 골라 주세요';
  if (d.exercise == null) return '운동 여부를 골라 주세요';
  if (menoShown(d) && d.meno == null) return '폐경 여부를 골라 주세요';
  if (d.famDM == null) return '가족력을 골라 주세요';
  if (!d.dx.htn && !d.dx.dm && !d.dx.chol && !d.dx.none) return '진단받은 질환을 고르거나 ‘없음’을 눌러 주세요';
  if (!d.bp) return '최근 혈압을 골라 주세요(모르면 ‘모름’)';
  return null;
}
export function sleepError(d: Draft): string | null {
  const s = d.sleep;
  if ([s.snore, s.tired, s.apnea, s.neck, s.insGate].some((x) => x == null)) return '모든 질문에 답해 주세요';
  if (s.insGate && !done(s.isi)) return '열린 질문 7개에 모두 답해 주세요';
  return null;
}
export function mindError(d: Draft): string | null {
  const m = d.mind;
  if (m.phq[0] == null || m.phq[1] == null || !done(m.gad)) return '모든 질문에 답해 주세요';
  const more = m.phq.slice(2);
  if (more.some((x) => x != null) && !done(more)) return '‘더 정확히 보기’ 7문항은 모두 답하거나 모두 비워 주세요';
  return null;
}
export function gerdError(d: Draft): string | null {
  if (d.gerd.gate == null) return '질문에 답해 주세요';
  if (d.gerd.gate && !done(d.gerd.gq)) return '열린 질문 6개에 모두 답해 주세요';
  return null;
}
export const dietError = (d: Draft) => (done(d.diet) ? null : '7문항에 모두 답해 주세요');
export const phq2Sum = (d: Draft) => (d.mind.phq[0] ?? 0) + (d.mind.phq[1] ?? 0);

/** Draft → engine Input. 기본정보가 덜 됐으면 null */
export function toInput(d: Draft): Input | null {
  if (basicError(d) || lifeError(d)) return null;
  const inp: Input = {
    age: num(d.age), sex: d.sex!, heightCm: num(d.height), weightKg: num(d.weight),
    waistCm: d.waistUnknown ? null : num(d.waist),
    smoke: d.smoke!, alcohol: d.alcohol!, famDM: !!d.famDM,
    dx: { htn: d.dx.htn, dm: d.dx.dm, chol: d.dx.chol }, bp: d.bp!,
    exercise: d.exercise, meno: menoShown(d) ? (d.meno === 'unknown' ? null : (d.meno as boolean)) : null,
  };
  if (d.modules.sleep && !sleepError(d)) {
    const s = d.sleep;
    inp.sleep = { snore: !!s.snore, tired: !!s.tired, apnea: !!s.apnea, neck: !!s.neck, insGate: !!s.insGate, ...(s.insGate ? { isi: s.isi as number[] } : {}) };
  }
  if (d.modules.mind && !mindError(d)) {
    const full = done(d.mind.phq);
    inp.mind = { phq: (full ? d.mind.phq : d.mind.phq.slice(0, 2)) as number[], gad: d.mind.gad as number[] };
  }
  if (d.modules.gerd && !gerdError(d)) inp.gerd = d.gerd.gate ? { gate: true, gq: d.gerd.gq as number[] } : { gate: false };
  if (d.modules.diet && !dietError(d)) inp.diet = d.diet as number[];
  return inp;
}

/** Input → Draft (기록·예시 불러오기용) */
export function fromInput(i: Input): Draft {
  const d = emptyDraft();
  Object.assign(d, {
    age: String(i.age), sex: i.sex, height: String(i.heightCm), weight: String(i.weightKg),
    waist: i.waistCm == null ? '' : String(i.waistCm), waistUnknown: i.waistCm == null,
    smoke: i.smoke, alcohol: i.alcohol, exercise: i.exercise, famDM: i.famDM, bp: i.bp,
    meno: i.sex === 'F' && i.age >= 40 ? (i.meno == null ? 'unknown' : i.meno) : null,
    dx: { ...i.dx, none: !i.dx.htn && !i.dx.dm && !i.dx.chol },
    modules: { sleep: !!i.sleep, mind: !!i.mind, gerd: !!i.gerd, diet: !!i.diet },
  });
  if (i.sleep) d.sleep = { ...i.sleep, isi: i.sleep.isi ? [...i.sleep.isi] : Array(7).fill(null) };
  if (i.mind) d.mind = { phq: i.mind.phq.length === 9 ? [...i.mind.phq] : [...i.mind.phq, ...Array(7).fill(null)], gad: [...i.mind.gad] };
  if (i.gerd) d.gerd = { gate: i.gerd.gate, gq: i.gerd.gq ? [...i.gerd.gq] : Array(6).fill(null) };
  if (i.diet) d.diet = [...i.diet];
  return d;
}

/** 결과 화면 '관리하면' 제안: BMI 23 이상이면 체중 −4kg(BMI 18.5 아래로는 내리지 않음), 허리를 알면 −5cm */
export function suggestScenario(i: Input): { weightKg: number; waistCm: number } {
  const bmi = i.weightKg / (i.heightCm / 100) ** 2;
  if (bmi < 23) return { weightKg: 0, waistCm: 0 };
  const floor = 18.5 * (i.heightCm / 100) ** 2;
  const dw = -Math.min(4, Math.max(0, Math.floor(i.weightKg - floor)));
  return { weightKg: dw, waistCm: i.waistCm == null ? 0 : -5 };
}

// ── 저장: 답하는 중인 값은 sessionStorage, 기록은 사용자가 저장할 때만 localStorage (모두 이 기기 안) ──
const DKEY = '1mincheck.draft', RKEY = '1mincheck.records';
export function loadDraft(): Draft {
  try { const s = sessionStorage.getItem(DKEY); if (s) return { ...emptyDraft(), ...JSON.parse(s) }; } catch { /* 저장소 없음 */ }
  return emptyDraft();
}
export function saveDraft(d: Draft) { try { sessionStorage.setItem(DKEY, JSON.stringify(d)); } catch { /* 무시 */ } }

export interface RecordItem { id: string; date: string; input: Input }
export function loadRecords(): RecordItem[] {
  try { const s = localStorage.getItem(RKEY); return s ? (JSON.parse(s) as RecordItem[]) : []; } catch { return []; }
}
export function saveRecords(r: RecordItem[]) { try { localStorage.setItem(RKEY, JSON.stringify(r)); return true; } catch { return false; } }
export const today = () => { const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };
