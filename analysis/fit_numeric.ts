/**
 * BMI·허리 연속 보정 (보정 v1 위에 덧붙임). engine.ts 의 식은 그대로.
 * logit(p″) = logit(p′) + Σ c·항,  p′ = 지금 보정 확률(calibrate)
 * 항(성별마다): BMI (23−b)+ · (b−25)+ · (b−30)+, 허리 (T−10−w)+ · (w−T)+ · (w−T−10)+   (T = 남 90·여 85)
 * 원칙: BMI·허리가 커질수록 위험이 내려가지 않는다(구간 기울기 ≥ 0). 골다공증은 반대(마를수록 위험이 커지는 방향만).
 * 7번째 항 bmiLowU60: 60세 미만에서 마른 체형 효과를 따로 (마른 40–50대 남성 고혈압이 높게 나오던 것).
 * 공복혈당을 넣은 경우: 혈당 모형 확률에 나이 항(gluAge)을 더함 (고령 여성이 낮게 나오던 것). 사람이 적은 끝(BMI 35↑, 허리 T+20↑)은 그 경계 값을 그대로(더 내려가지도 오르지도 않음).
 * 2022–23으로 맞추고 2024로 평가 → 좋아질 때만 engine/src/numeric_adj.json 에 저장 (집계 계수만).
 * 실행: PYTHONPATH=… npx tsx analysis/fit_numeric.ts [--write]
 */
import { writeFileSync } from 'node:fs';
import { runAll, type Input } from '../engine/src/engine.ts';
import { calibrate, type CalId } from '../engine/src/calibrate.ts';
import { loadPeople, type Person } from './people.ts';

import { TERMS, terms, CAP_BMI, CAP_W, gluAgeTerms } from '../engine/src/numeric.ts';
import { glucoseProb } from '../web/src/lib/view.ts';
/** 기울기 제약 (dir 1: 커질수록 위험 비감소, dir −1: 골다공증처럼 커질수록 위험 비증가). 낮은 쪽 항(bmiLow, wLow, bmiLowU60)은 반대 부호 */
function project(c: number[], dir = 1) {
  const x = c.map((v) => v * dir);
  x[0] = Math.min(0, x[0]); x[3] = Math.min(0, x[3]); x[6] = Math.min(0, x[6]);
  x[1] = Math.max(0, x[1]); if (x[1] + x[2] < 0) x[2] = -x[1];
  x[4] = Math.max(0, x[4]); if (x[4] + x[5] < 0) x[5] = -x[4];
  return x.map((v) => v * dir);
}

const IDS: CalId[] = ['dm', 'htn', 'chol', 'osteo'];
const DIR: Record<string, number> = { dm: 1, htn: 1, chol: 1, osteo: -1 };
const logit = (p: number) => Math.log(p / (1 - p)), expit = (z: number) => 1 / (1 + Math.exp(-z));
const clamp = (p: number) => Math.min(0.995, Math.max(0.001, p));

type Row = { off: number; x: number[]; y: number; w: number; year: number; psu: string };
function rowsFor(ppl: Person[], id: CalId, sex: 'M' | 'F'): Row[] {
  const out: Row[] = [];
  for (const p of ppl) {
    if (p.inp.sex !== sex || (id !== 'osteo' && p.inp.dx[id as 'dm']) || p.out[id] == null) continue;
    const r = runAll(p.inp as Input).find((x) => x.id === id)!;
    if (r.status !== 'ok') continue;
    const v = r.value ?? (r.range ? (r.range[0] + r.range[1]) / 2 : null);
    if (v == null) continue;
    const pc = calibrate(id, v, sex, p.inp.age) / 100;
    out.push({ off: logit(clamp(pc)), x: terms(sex, p.inp.weightKg / (p.inp.heightCm / 100) ** 2, p.inp.waistCm, p.inp.age), y: p.out[id], w: p.w, year: p.year, psu: p.psu });
  }
  return out;
}
/** 가중 로지스틱 (offset, 능선 λ), 투영 경사로 제약 */
function fit(rows: Row[], dir = 1, lambda = 2, k0 = TERMS.length, free = false): number[] {
  let c = new Array(k0).fill(0);
  const W = rows.reduce((a, r) => a + r.w, 0);
  for (let it = 0; it < 4000; it++) {
    const g = new Array(c.length).fill(0);
    for (const r of rows) { const p = expit(r.off + r.x.reduce((a, x, k) => a + x * c[k], 0)); for (let k = 0; k < c.length; k++) g[k] += (r.w / W) * (p - r.y) * r.x[k]; }
    for (let k = 0; k < c.length; k++) g[k] += (lambda / rows.length) * c[k];
    const step = c.map((v, k) => v - 0.08 * g[k]);
    c = free ? step : project(step, dir);
  }
  return c;
}
const score = (rows: Row[], c: number[]) => {
  let ll = 0, br = 0, W = 0;
  for (const r of rows) { const p = clamp(expit(r.off + r.x.reduce((a, x, k) => a + x * c[k], 0))); ll += r.w * -(r.y * Math.log(p) + (1 - r.y) * Math.log(1 - p)); br += r.w * (p - r.y) ** 2; W += r.w; }
  return { logloss: ll / W, brier: br / W };
};

const ppl = loadPeople('checked').filter((p) => p.inp.age >= 19);
const res: Record<string, Record<string, number[]>> = {};
const report: string[] = [];
let allBetter = true;
for (const id of IDS) for (const sex of ['M', 'F'] as const) {
  const rows = rowsFor(ppl, id, sex);
  // 평가: 2022–23으로 맞추고 2024로 확인. 골밀도처럼 한 해(2024)만 있으면 조사구(PSU)를 반으로 나눠 확인
  const oneYear = new Set(rows.map((r) => r.year)).size === 1;
  const half = (r: Row) => [...r.psu].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 997, 7) % 2 === 0;
  const tr = oneYear ? rows.filter(half) : rows.filter((r) => r.year < 2024), te = oneYear ? rows.filter((r) => !half(r)) : rows.filter((r) => r.year === 2024);
  const ty = oneYear ? '2024 조사구 절반' : '2024';
  const cTr = fit(tr, DIR[id]), zero = new Array(TERMS.length).fill(0);
  const b0 = score(te, zero), b1 = score(te, cTr);
  const better = b1.logloss < b0.logloss;
  if (!better) allBetter = false;
  const cAll = better ? fit(rows, DIR[id]) : zero;   // 2024 평가에서 나빠지면 보정하지 않음
  (res[id] ??= {})[sex] = cAll.map((v) => Math.round(v * 10000) / 10000);
  report.push(`${id} ${sex}: n=${rows.length} ${ty} 평가 logloss ${b0.logloss.toFixed(4)} → ${b1.logloss.toFixed(4)}, Brier ${b0.brier.toFixed(5)} → ${b1.brier.toFixed(5)} ${better ? '개선 → 적용' : '악화 → 적용 안 함(계수 0)'} | 계수 ${cAll.map((v) => v.toFixed(3)).join(' ')}`);
}
// ── 공복혈당을 넣은 경우: 혈당 모형 확률 + 나이 항 ──
const gluAge: Record<string, number[]> = {};
for (const sex of ['M', 'F'] as const) {
  const rows: Row[] = [];
  for (const p of ppl) {
    if (p.inp.sex !== sex || p.inp.dx.dm || p.out.dm == null || p.lab.glu == null || p.lab.glu >= 126) continue;
    const r = runAll(p.inp as Input).find((x) => x.id === 'dm')!;
    if (r.status !== 'ok' || r.value == null) continue;
    const pg = glucoseProb(calibrate('dm', r.value, sex, p.inp.age), p.lab.glu) / 100;
    rows.push({ off: logit(clamp(pg)), x: gluAgeTerms(p.inp.age), y: p.out.dm, w: p.w, year: p.year, psu: p.psu });
  }
  const tr = rows.filter((r) => r.year < 2024), te = rows.filter((r) => r.year === 2024), zero = [0, 0];
  const cTr = fit(tr, 1, 2, 2, true), b0 = score(te, zero), b1 = score(te, cTr), better = b1.logloss < b0.logloss;
  const cAll = better ? fit(rows, 1, 2, 2, true) : zero;
  gluAge[sex] = cAll.map((v) => Math.round(v * 10000) / 10000);
  report.push(`혈당 입력 dm ${sex} 나이 항: n=${rows.length} 2024 평가 logloss ${b0.logloss.toFixed(4)} → ${b1.logloss.toFixed(4)}, Brier ${b0.brier.toFixed(5)} → ${b1.brier.toFixed(5)} ${better ? '개선 → 적용' : '악화 → 적용 안 함'} | 계수 ${cAll.map((v) => v.toFixed(3)).join(' ')}`);
}
console.log(report.join('\n'));
if (process.argv.includes('--write')) {
  const meta = { source: '국민건강영양조사 제9기(2022–2024) 원시자료 — 계수만', generated: new Date().toISOString().slice(0, 10), terms: TERMS, capBmi: CAP_BMI, capWaistAboveT: CAP_W, T: { M: 90, F: 85 },
    rule: '보정 v1 확률에 logit 가산. BMI·허리가 커질수록 위험 비감소(골다공증은 비증가) 제약, BMI 35·허리 T+20 넘으면 경계 값 유지. gluAge = 공복혈당 입력 시 혈당 모형 확률에 더하는 나이 항 [(나이−50)/10, (나이−65)+/10]', eval: report };
  writeFileSync(new URL('../engine/src/numeric_adj.json', import.meta.url), JSON.stringify({ meta, coef: res, gluAge }, null, 1));
  console.log('저장: engine/src/numeric_adj.json', allBetter ? '(모든 칸 개선)' : '(일부 칸 악화 — 확인 필요)');
}
