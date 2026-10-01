/**
 * 1분체크(1mincheck) 계산 엔진 v0.3
 * - 모든 계수·통계는 prevalence.json(= 기획서 §8)에서만 읽는다.
 * - 순수 함수만 둔다. 네트워크·저장소 접근 없음.
 * - 각 함수 옆 주석의 §번호는 기획서(docs/spec.md = 1분체크_기획_근거_함수모형.md) 절 번호다.
 */
import P from './prevalence.json' with { type: 'json' };

// ───────────────────────── 타입 ─────────────────────────
export type Sex = 'M' | 'F';
export type Alcohol = 'none' | 'lt1' | 'd1_4' | 'd5';
export type Bp = 'unknown' | 'normal' | 'elevated' | 'high';
export type ResultType = 'A' | "A'" | 'B' | 'C' | 'D';

export interface Input {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  waistCm: number | null;          // null = 모름
  smoke: 'never' | 'past' | 'current';
  alcohol: Alcohol;
  famDM: boolean;
  dx: { htn: boolean; dm: boolean; chol: boolean };
  bp: Bp;
  exercise: boolean | null;        // 주 2회·30분 이상. null = 모름
  meno: boolean | null;            // 여성 40세 이상만. null = 모름/해당 없음
  sleep?: { snore: boolean; tired: boolean; apnea: boolean; neck: boolean; insGate: boolean; isi?: number[] };
  mind?: { phq: number[]; gad: number[] };       // phq 길이 2 또는 9
  gerd?: { gate: boolean; gq?: number[] };       // gq 길이 6 (응답 인덱스 0~3 = 0일/1일/2–3일/4–7일)
  diet?: number[];                                // 길이 7, 각 0~2
}

export interface Result {
  id: string;
  name: string;
  type: ResultType;
  status: 'ok' | 'managed' | 'criteria' | 'na' | 'excluded' | 'needs_input';
  value: number | null;            // 확률(%) 또는 점수
  range?: [number, number];        // 입력이 '모름'일 때 가능한 범위(%)
  unit: '%' | 'score' | 'bmi';
  score?: number;
  category?: string;
  peer?: number | null;            // 동년배 유병률(%)
  ratioLabel?: string;
  flags?: string[];
  notes?: string[];
}

// ───────────────────────── 공통 유틸 (§6 공통) ─────────────────────────
export const expit = (z: number) => 1 / (1 + Math.exp(-z));
export const logit = (p: number) => Math.log(p / (1 - p));
export const round1 = (x: number) => Math.round(x * 10) / 10;
export const bayes = (p: number, lr: number) => { const o = (p / (1 - p)) * lr; return o / (1 + o); };

export function band(age: number): number {
  if (age < 19) throw new Error('19세 이상만 계산합니다');
  return age < 30 ? 0 : age < 40 ? 1 : age < 50 ? 2 : age < 60 ? 3 : age < 70 ? 4 : 5;
}
export const bmiOf = (i: Pick<Input, 'heightCm' | 'weightKg'>) => i.weightKg / (i.heightCm / 100) ** 2;

export function ratioLabel(p1: number, p0: number): string {
  const r = p1 / p0;
  return r < 0.8 ? '낮음' : r < 1.25 ? '비슷' : r < 2 ? '높음' : '매우 높음';
}
const rng = (xs: number[]): [number, number] => [round1(Math.min(...xs)), round1(Math.max(...xs))];

// ───────────────────────── §6-1 당뇨 (숨은 당뇨) ─────────────────────────
const DMM = P.dmModel;
const alcCat = (a: Alcohol) => (a === 'd1_4' ? 1 : a === 'd5' ? 2 : 0);
const htnFlag = (i: Input) => i.dx.htn || i.bp === 'high';

function dmWaistCat(sex: Sex, waist: number): 0 | 1 | 2 {
  const [mid, high] = DMM.waist.cut[sex];
  return waist < mid ? 0 : waist < high ? 1 : 2;
}
function dmCalc(i: Input, wc: 0 | 1 | 2) {
  const ageB = i.age >= 45 ? DMM.age['45+'] : i.age >= 35 ? DMM.age['35-44'] : 0;
  const ageP = i.age >= 45 ? 3 : i.age >= 35 ? 2 : 0;
  const a = alcCat(i.alcohol);
  const lp = DMM.intercept + ageB + (i.famDM ? DMM.fam : 0) + (htnFlag(i) ? DMM.htn : 0)
    + [0, DMM.waist.mid, DMM.waist.high][wc] + (i.smoke === 'current' ? DMM.smoke : 0)
    + (a === 1 ? DMM.alc['1'] : a === 2 ? DMM.alc['2'] : 0);
  const pts = ageP + (i.famDM ? 1 : 0) + (htnFlag(i) ? 1 : 0) + [0, 2, 3][wc] + (i.smoke === 'current' ? 1 : 0) + a;
  return { p: 100 * expit(lp), pts };
}
export function diabetes(i: Input): Result {
  const b = band(i.age);
  const peer = P.dm.pooled[i.sex][b];
  const base = { id: 'dm', name: '숨은 당뇨', type: 'A' as const, unit: '%' as const, peer };
  if (i.dx.dm) return { ...base, status: 'managed', value: null };
  if (i.waistCm == null) {
    const all = ([0, 1, 2] as const).map(w => dmCalc(i, w));
    return { ...base, status: 'ok', value: null, range: rng(all.map(x => x.p)),
      notes: ['허리둘레를 입력하면 정확해져요'] };
  }
  const r = dmCalc(i, dmWaistCat(i.sex, i.waistCm));
  return { ...base, status: 'ok', value: round1(r.p), score: r.pts, category: r.pts >= 5 ? '고위험' : '저위험',
    ratioLabel: ratioLabel(r.p, peer),
    notes: ['동년배 값은 진단된 당뇨 포함 유병률, 내 값은 "진단 안 된 당뇨" 확률', '상대 오차 ±약 25%'] };
}

// ───────────────── §6-2·6-3 고혈압·고콜레스테롤 (보정 로지스틱) ─────────────────
function calibratedLogit(kind: 'htn' | 'chol', i: Input): number {
  const T = P[kind];
  const obese = bmiOf(i) >= 25;
  return T.intercept[i.sex][band(i.age)] + (obese ? T.lnOR_obese : 0);
}
export function hypertension(i: Input): Result {
  const peer = P.htn.pooled[i.sex][band(i.age)];
  const base = { id: 'htn', name: '고혈압', type: 'B' as const, unit: '%' as const, peer };
  if (i.dx.htn) return { ...base, status: 'managed', value: null };
  if (i.bp === 'high') return { ...base, status: 'criteria', value: null, notes: ['측정 혈압이 고혈압 기준에 해당해요. 재측정·진료 권장'] };
  const p = 100 * expit(calibratedLogit('htn', i));
  return { ...base, status: 'ok', value: round1(p), ratioLabel: ratioLabel(p, peer),
    flags: i.bp === 'elevated' ? ['주의 혈압'] : [] };
}
export function cholesterol(i: Input): Result {
  const peer = P.chol.pooled[i.sex][band(i.age)];
  const base = { id: 'chol', name: '고콜레스테롤혈증', type: 'B' as const, unit: '%' as const, peer };
  if (i.dx.chol) return { ...base, status: 'managed', value: null };
  const p = 100 * expit(calibratedLogit('chol', i));
  return { ...base, status: 'ok', value: round1(p), ratioLabel: ratioLabel(p, peer), notes: ['혈액검사로만 확인 가능 → 국가건강검진'] };
}
/** 고혈압 what-if: 연속형. 허리를 알면 허리, 모르면 BMI 변화 사용 (§6-2 ④) */
export function hypertensionWhatIf(before: Input, after: Input): number | null {
  const r = hypertension(before);
  if (r.status !== 'ok' || r.value == null) return null;
  const T = P.htn;
  const d = before.waistCm != null && after.waistCm != null
    ? T.betaWaistPerCm[before.sex] * (after.waistCm - before.waistCm)
    : T.betaBmiPerUnit[before.sex] * (bmiOf(after) - bmiOf(before));
  return round1(100 * expit(logit(r.value / 100) + d));
}

// ───────────────────────── §6-4 비만 ─────────────────────────
export function obesity(i: Input): Result {
  const bmi = bmiOf(i);
  const cat = bmi < 18.5 ? '저체중' : bmi < 23 ? '정상' : bmi < 25 ? '비만 전단계' : bmi < 30 ? '1단계 비만' : bmi < 35 ? '2단계 비만' : '3단계 비만';
  const abd = i.waistCm == null ? null : i.waistCm >= (i.sex === 'M' ? 90 : 85);
  const toBmi25 = 24.99 * (i.heightCm / 100) ** 2;
  return { id: 'obesity', name: '비만·복부비만', type: 'C', status: 'ok', unit: 'bmi', value: round1(bmi), category: cat,
    peer: P.obesityByAge.pooled[i.sex][band(i.age)],
    flags: abd == null ? ['허리 모름'] : abd ? ['복부비만'] : [],
    notes: [`BMI 25 미만 체중: ${round1(toBmi25)}kg 이하`] };
}

// ───────────────────────── §6-5 수면무호흡 STOP-Bang ─────────────────────────
export function stopBang(i: Input): Result {
  const base = { id: 'osa', name: '수면무호흡', type: 'C' as const, unit: 'score' as const };
  if (!i.sleep) return { ...base, status: 'needs_input', value: null };
  const s = i.sleep, bmi = bmiOf(i);
  const S = +s.snore, T = +s.tired, O = +s.apnea, Pp = +htnFlag(i);
  const B = +(bmi > 35), A = +(i.age > 50), N = +s.neck, G = +(i.sex === 'M');
  const score = S + T + O + Pp + B + A + N + G;
  let cat = score <= 2 ? '저위험' : score >= 5 ? '고위험' : (S + T + O + Pp >= 2 && (G || B || N)) ? '고위험' : '중위험';
  const peer = i.age >= 40 && i.age <= 69 ? P.sdb.ahi5[i.sex] : null;
  return { ...base, status: 'ok', value: score, score, category: cat, peer,
    notes: ['점수가 낮으면 안심에 유용, 높다고 확정은 아님(특이도 낮음)'] };
}

// ───────────────────────── §6-6 불면 ISI ─────────────────────────
export function insomnia(i: Input): Result {
  const base = { id: 'isi', name: '불면', type: 'C' as const, unit: 'score' as const };
  if (!i.sleep) return { ...base, status: 'needs_input', value: null };
  const I = P.insomnia, b = Math.min(band(i.age), 4);
  const peer = round1(I.age[b]! * (I.sex[i.sex] / I.overall));
  if (!i.sleep.insGate) return { ...base, status: 'ok', value: 0, score: 0, category: '뚜렷한 불면 증상 없음', peer };
  const isi = i.sleep.isi;
  if (!isi || isi.length !== 7) return { ...base, status: 'needs_input', value: null, peer };
  const sc = isi.reduce((a, b) => a + b, 0);
  const cat = sc <= 7 ? '해당 없음' : sc <= 14 ? '경계' : sc <= 21 ? '중등도' : '심함';
  return { ...base, status: 'ok', value: sc, score: sc, category: cat, peer, notes: i.age >= 70 ? ['70세 이상 동년배 값은 60대 값으로 추정'] : [] };
}

// ───────────────────────── §6-7 우울 PHQ ─────────────────────────
export function depression(i: Input): Result {
  const base = { id: 'dep', name: '우울', type: 'B' as const, unit: '%' as const };
  if (!i.mind) return { ...base, status: 'needs_input', value: null };
  const p0 = P.dep[i.sex][band(i.age)] / 100;
  const phq = i.mind.phq;
  const flags = phq.length === 9 && phq[8] >= 1 ? ['CRISIS'] : [];
  let post: number, score: number, category: string;
  if (phq.length === 9) {
    score = phq.reduce((a, b) => a + b, 0);
    post = bayes(p0, score >= 10 ? P.lr.phq9[0] : P.lr.phq9[1]);
    category = score <= 4 ? '최소' : score <= 9 ? '경도' : score <= 14 ? '중등도' : score <= 19 ? '중등도-중증' : '중증';
  } else {
    score = phq[0] + phq[1];
    post = bayes(p0, score >= 3 ? P.lr.phq2[0] : P.lr.phq2[1]);
    category = score >= 3 ? 'PHQ-2 양성' : 'PHQ-2 음성';
  }
  return { ...base, status: 'ok', value: round1(100 * post), score, category, peer: p0 * 100,
    ratioLabel: ratioLabel(post, p0), flags };
}

// ───────────────────────── §6-8 불안 GAD-2 ─────────────────────────
export function anxiety(i: Input): Result {
  const base = { id: 'gad', name: '불안', type: 'C' as const, unit: 'score' as const };
  if (!i.mind) return { ...base, status: 'needs_input', value: null };
  const sc = i.mind.gad[0] + i.mind.gad[1];
  return { ...base, status: 'ok', value: sc, score: sc, category: sc >= 3 ? '선별 양성' : '선별 음성',
    peer: P.anxiety1y[i.sex], notes: ['동년배 값은 불안장애 전체 1년 유병률(2016)'] };
}

// ───────────────────────── §6-9 골다공증 OSTA ─────────────────────────
export const osta = (weightKg: number, age: number) => Math.trunc((weightKg - age) * 0.2);
export function osteoporosis(i: Input): Result {
  const base = { id: 'osteo', name: '골다공증', type: 'B' as const, unit: '%' as const };
  if (i.age < 50) return { ...base, status: 'na', value: null, notes: ['50세 이상부터 계산'] };
  const b = i.age < 60 ? 0 : i.age < 70 ? 1 : 2;
  const p0 = P.osteo.pooled[i.sex][b] / 100;
  const o = osta(i.weightKg, i.age);
  const category = o > -1 ? '저위험' : o >= -4 ? '중간위험' : '고위험';
  if (i.sex === 'M') return { ...base, status: 'ok', value: round1(p0 * 100), score: o, category, peer: p0 * 100, notes: ['남성은 동년배 유병률만 표시'] };
  const post = bayes(p0, o <= -1 ? P.lr.osta[0] : P.lr.osta[1]);
  return { ...base, status: 'ok', value: round1(100 * post), score: o, category, peer: round1(p0 * 100), ratioLabel: ratioLabel(post, p0) };
}

// ───────────────────────── §6-10 지방간 ─────────────────────────
const NS = P.nafldScore;
function nafldScoreWith(i: Input, waist: number, exercise: boolean, meno: boolean): number {
  const S = NS[i.sex] as any;
  const bmi = bmiOf(i);
  const cut = (v: number, c: number[], pts: number[]) => pts[c.filter(x => v >= x).length];
  let s = (i.age >= 35 ? S.age35 : 0) + cut(waist, S.waist.cuts, S.waist.pts) + cut(bmi, S.bmi.cuts, S.bmi.pts)
    + (i.dx.dm ? S.dm : 0) + (i.dx.chol ? S.dys : 0) + (exercise ? 0 : S.noExercise);
  if (i.sex === 'M') s += i.alcohol !== 'none' ? S.alcohol : 0;
  else s += meno ? S.menopause : 0;
  return s;
}
export const nafldProb = (sex: Sex, score: number) =>
  NS.prevByScore[sex][Math.min(Math.max(score, 2), 12) - 2];
export function nafld(i: Input): Result {
  const base = { id: 'nafld', name: '지방간', type: "A'" as const, unit: '%' as const, peer: i.sex === 'M' ? P.nafldPeer.M.all : P.nafldPeer.F.all };
  if (i.alcohol === 'd5') return { ...base, status: 'excluded', value: null, notes: ['과음: 알코올성 간질환 가능성 → 이 도구 대상 아님, 진료 권장'] };
  const waists = i.waistCm != null ? [i.waistCm] : (i.sex === 'M' ? [70, 85, 95, 105] : [70, 80, 90, 100]);
  const exs = i.exercise == null ? [true, false] : [i.exercise];
  const menos = i.sex === 'F' ? (i.meno == null ? [false, true] : [i.meno]) : [false];
  const scores: number[] = [];
  for (const w of waists) for (const e of exs) for (const m of menos) scores.push(nafldScoreWith(i, w, e, m));
  if (scores.length === 1) {
    const s = scores[0], p = nafldProb(i.sex, s);
    return { ...base, status: 'ok', value: p, score: s, category: s >= 8 ? '고위험' : '저위험', ratioLabel: ratioLabel(p, base.peer) };
  }
  return { ...base, status: 'ok', value: null, range: rng(scores.map(s => nafldProb(i.sex, s))),
    notes: ['허리·운동·폐경 여부를 입력하면 하나의 값으로 좁혀져요'] };
}

// ───────────────────────── §6-11 위식도역류 GerdQ ─────────────────────────
export function gerd(i: Input): Result {
  const base = { id: 'gerd', name: '위식도역류', type: 'C' as const, unit: 'score' as const, peer: null };
  if (!i.gerd) return { ...base, status: 'needs_input', value: null };
  if (!i.gerd.gate) return { ...base, status: 'ok', value: null, category: '역류 증상 없음' };
  const g = i.gerd.gq;
  if (!g || g.length !== 6) return { ...base, status: 'needs_input', value: null };
  const rev = (x: number) => 3 - x;                 // gq3·gq4 역채점
  const sc = g[0] + g[1] + rev(g[2]) + rev(g[3]) + g[4] + g[5];
  return { ...base, status: 'ok', value: sc, score: sc, category: sc >= 8 ? '가능성 높음' : '가능성 낮음',
    notes: ['한국 성인 약 4~7%가 주 1회 이상 증상'] };
}
/** 역류 관련 위험의 상대 변화 배수 (after/before). 1보다 작으면 감소 */
export function gerdRelativeChange(before: Input, after: Input): number {
  const O = P.gerd.eeOR;
  const f = (i: Input) => (bmiOf(i) >= 25 ? O.bmi25 : 1) * (i.smoke === 'current' ? O.smoke : 1) * (i.alcohol !== 'none' ? O.alcohol : 1);
  return f(after) / f(before);
}

// ───────────────────────── §6-12 식생활 ─────────────────────────
export function diet(i: Input): Result {
  const base = { id: 'diet', name: '식생활', type: 'D' as const, unit: 'score' as const, peer: null };
  if (!i.diet || i.diet.length !== 7) return { ...base, status: 'needs_input', value: null };
  const v = Math.round((i.diet.reduce((a, b) => a + b, 0) / 14) * 100);
  const names = ['아침식사', '잡곡', '과일', '채소', '우유·유제품', '나트륨(짠 음식)', '당류·음료'];
  return { ...base, status: 'ok', value: v, score: v, category: v >= 75 ? '양호' : v >= 50 ? '보통' : '개선 필요',
    flags: i.diet.map((x, k) => (x === 0 ? names[k] : '')).filter(Boolean), notes: ['검증되지 않은 참고 지표'] };
}

// ───────────────────────── 전체 실행 & what-if ─────────────────────────
export function runAll(i: Input): Result[] {
  return [diabetes, hypertension, cholesterol, obesity, nafld, stopBang, insomnia, depression, anxiety, osteoporosis, gerd, diet].map(f => f(i));
}
export interface WhatIfRow { id: string; before: number | null; after: number | null }
/** 체중·허리·흡연·음주·운동 변경 시 영향 카드 재계산 (§7 what-if 패널). 골다공증은 제외 */
export function whatIf(before: Input, after: Input): WhatIfRow[] {
  const val = (r: Result) => r.value ?? null;
  return [
    { id: 'dm', before: val(diabetes(before)), after: val(diabetes(after)) },
    { id: 'htn', before: val(hypertension(before)), after: hypertensionWhatIf(before, after) },
    { id: 'chol', before: val(cholesterol(before)), after: val(cholesterol(after)) },
    { id: 'obesity', before: val(obesity(before)), after: val(obesity(after)) },
    { id: 'nafld', before: val(nafld(before)), after: val(nafld(after)) },
    { id: 'osa', before: val(stopBang(before)), after: val(stopBang(after)) },
  ];
}
