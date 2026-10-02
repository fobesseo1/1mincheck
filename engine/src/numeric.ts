/**
 * BMI·허리 연속 보정 (보정 v1 위에 덧붙임, engine.ts 식은 그대로). 계수: numeric_adj.json (analysis/fit_numeric.ts)
 * 왜: 엔진 점수는 BMI·허리를 한두 칸(예: BMI 25, 허리 90)으로만 나눠, 그보다 커져도 위험이 그대로였다.
 * 원칙: BMI·허리가 커질수록 위험이 내려가지 않는다. 사람이 적은 끝(BMI 35↑, 허리 남 110·여 105↑)은 경계 값을 그대로 쓴다.
 * 2022–23으로 맞추고 2024로 평가해 좋아진 칸만 쓴다(나빠진 칸은 계수 0).
 */
import A from './numeric_adj.json' with { type: 'json' };
import type { Input } from './engine.ts';

export const TERMS = ['bmiLow', 'bmi25', 'bmi30', 'wLow', 'wT', 'wT10'] as const;
export const CAP_BMI = 35, CAP_W = 20;
/** BMI 항은 kg/m² 그대로, 허리 항은 5cm 단위 */
export function terms(sex: 'M' | 'F', bmi: number, waist: number | null): number[] {
  const b = Math.min(bmi, CAP_BMI), T = sex === 'M' ? 90 : 85;
  const w = waist == null ? null : Math.min(waist, T + CAP_W);
  return [Math.max(0, 23 - Math.max(bmi, 17)), Math.max(0, b - 25), Math.max(0, b - 30),
    w == null ? 0 : Math.max(0, T - 10 - w) / 5, w == null ? 0 : Math.max(0, w - T) / 5, w == null ? 0 : Math.max(0, w - T - 10) / 5];
}
const COEF = (A as unknown as { coef: Record<string, Record<'M' | 'F', number[]>> }).coef;
export type NumId = 'dm' | 'htn' | 'chol';
export const isNum = (id: string): id is NumId => id in COEF;
/** 보정 확률(%) → BMI·허리 반영 확률(%). 허리를 모르면 허리 항은 0 */
export function adjustNumeric(id: NumId, pct: number, i: Pick<Input, 'sex' | 'heightCm' | 'weightKg' | 'waistCm'>): number {
  const c = COEF[id]?.[i.sex]; if (!c) return pct;
  const x = terms(i.sex, i.weightKg / (i.heightCm / 100) ** 2, i.waistCm);
  const p = Math.min(0.995, Math.max(0.001, pct / 100));
  const z = Math.log(p / (1 - p)) + x.reduce((a, v, k) => a + v * c[k], 0);
  return Math.round(1000 / (1 + Math.exp(-z))) / 10;
}
