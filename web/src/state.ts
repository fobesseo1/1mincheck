// 사용자가 답하는 중인 값(Draft)과, 그것을 engine 의 Input 으로 바꾸는 규칙 (docs/spec.md §5)
import type { Input, Alcohol, Bp } from '../../engine/src/engine.ts';

type YN = boolean | null;
type Pick4 = number | null;

// ── 음주: '얼마나 자주' × '한 번에 무엇을 얼마나' → 하루 평균 잔 수 → 엔진의 4단계 (spec §5-1 계산기) ──
// 잔 기준은 spec §5-1: 소주 1잔(약 40–50mL)·맥주 250mL = 1잔, 소주 1병 ≈ 7잔. 와인은 와인잔 1잔 = 1잔.
export const ALC_FREQ = [
  { v: 'none', t: '안 마심', perWeek: 0 }, { v: 'm1', t: '월 1회 이하', perWeek: 0.25 }, { v: 'm2_4', t: '월 2–4회', perWeek: 0.7 },
  { v: 'w1_2', t: '주 1–2회', perWeek: 1.5 }, { v: 'w3_4', t: '주 3–4회', perWeek: 3.5 }, { v: 'daily', t: '거의 매일', perWeek: 6.5 },
] as const;
export type AlcFreq = (typeof ALC_FREQ)[number]['v'];
export const DRINKS = [
  { k: 'soju', t: '소주', unit: '병', step: 0.5, glasses: 7, hint: '1병 ≈ 7잔' },
  { k: 'beer', t: '맥주', unit: '캔·500cc', step: 1, glasses: 2, hint: '500mL ≈ 2잔' },
  { k: 'wine', t: '와인', unit: '잔', step: 1, glasses: 1, hint: '1잔 = 1잔' },
] as const;
export type DrinkKey = (typeof DRINKS)[number]['k'];
export const emptyAmt = (): Record<DrinkKey, number> => ({ soju: 0, beer: 0, wine: 0 });
export function alcCalc(freq: AlcFreq | null, amt: Record<DrinkKey, number>) {
  const per = DRINKS.reduce((s, d) => s + (amt[d.k] || 0) * d.glasses, 0);
  const pw = ALC_FREQ.find((f) => f.v === freq)?.perWeek ?? 0;
  const daily = (pw * per) / 7;
  const cat: Alcohol | null = freq == null ? null : freq === 'none' ? 'none' : per === 0 ? null : daily < 1 ? 'lt1' : daily < 5 ? 'd1_4' : 'd5';
  return { per, daily, cat };
}
export const ALC_LABEL: Record<Alcohol, string> = { none: '안 마심', lt1: '하루 평균 1잔 미만', d1_4: '하루 평균 1–4.9잔', d5: '하루 평균 5잔 이상' };

export interface Draft {
  age: string; sex: 'M' | 'F' | null; height: string; weight: string; waist: string; waistUnknown: boolean; waistUnit: 'cm' | 'in';
  smoke: 'never' | 'past' | 'current' | null; alcFreq: AlcFreq | null; alcAmt: Record<DrinkKey, number>; exercise: YN; meno: YN | 'unknown';
  famDM: YN; dx: { htn: boolean; dm: boolean; chol: boolean; none: boolean }; bp: Bp | null;
  modules: { sleep: boolean; mind: boolean; gerd: boolean; diet: boolean };
  sleep: { snore: YN; tired: YN; apnea: YN; neck: YN; insGate: YN; isi: Pick4[] };
  mind: { phq: Pick4[]; gad: Pick4[] };
  gerd: { gate: YN; gq: Pick4[] };
  diet: Pick4[];
}

export const emptyDraft = (): Draft => ({
  age: '', sex: null, height: '', weight: '', waist: '', waistUnknown: false, waistUnit: 'in',
  smoke: null, alcFreq: null, alcAmt: emptyAmt(), exercise: null, meno: null, famDM: null,
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
  if (!d.waistUnknown && d.waistUnit === 'cm' && !(wa >= 50 && wa <= 150)) return '허리둘레를 50–150cm 사이로 입력해 주세요';
  if (!d.waistUnknown && d.waistUnit === 'in' && !(wa >= 20 && wa <= 60)) return '허리둘레를 20–60인치 사이로 입력해 주세요';
  return null;
}
/** 화면의 허리 입력 → cm (인치면 ×2.54, 소수 첫째 자리) */
export const waistCmOf = (d: Draft) => (d.waistUnknown || d.waist === '' ? null : d.waistUnit === 'in' ? Math.round(num(d.waist) * 2.54 * 10) / 10 : num(d.waist));
export function lifeError(d: Draft): string | null {
  if (!d.smoke) return '흡연 여부를 골라 주세요';
  if (!d.alcFreq) return '술을 얼마나 자주 마시는지 골라 주세요';
  if (!alcCalc(d.alcFreq, d.alcAmt).cat) return '한 번 마실 때 마시는 양을 넣어 주세요';
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
    waistCm: waistCmOf(d),
    smoke: d.smoke!, alcohol: alcCalc(d.alcFreq, d.alcAmt).cat!, famDM: !!d.famDM,
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
    waist: i.waistCm == null ? '' : String(i.waistCm), waistUnknown: i.waistCm == null, waistUnit: 'cm',
    smoke: i.smoke, exercise: i.exercise, famDM: i.famDM, bp: i.bp,
    // 엔진 4단계를 같은 단계로 돌아오는 대표 답으로 (예: 하루 1–4.9잔 = 주 1–2회 × 소주 1병)
    alcFreq: ({ none: 'none', lt1: 'm2_4', d1_4: 'w1_2', d5: 'daily' } as const)[i.alcohol],
    alcAmt: { ...emptyAmt(), soju: i.alcohol === 'none' ? 0 : 1 },
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
