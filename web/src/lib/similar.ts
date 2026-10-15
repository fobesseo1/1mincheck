/**
 * '나 같은 한국인 100명 중' (docs/spec.md §6-17 ①): 국민건강영양조사 2022–2024 실측으로 맞춘 가중 로지스틱 곡선.
 * 원인이 아니라 '이런 체형·습관의 같은 또래 중에서는'이라는 단면 관계다. 계수: engine/src/similar.json (analysis/similar.py)
 * 흡연 계수는 단면이라 방향이 섞여서, 바꿔보기에서는 흡연을 움직이지 않는다(지금 값 그대로 둔다).
 */
import S from '../../../engine/src/similar.json';
import type { Input } from '../../../engine/src/engine.ts';
import { drinkOf } from '../state.ts';

export type Outcome = 'bp' | 'dm' | 'alt' | 'tg';
export const OUTCOME_NAME: Record<Outcome, string> = { bp: '혈압이 높은 사람', dm: '당뇨인 사람', alt: '간 수치(ALT)가 높은 사람', tg: '중성지방이 높은 사람' };
const M = S as unknown as { features: string[]; models: Record<string, { coef: Record<string, number> }> };

export interface Body { age: number; sex: 'M' | 'F'; waistCm: number; bmi: number; glassesPerDay: number; smoke: Input['smoke']; noExercise: boolean }

function features(b: Body): number[] {
  const T = b.sex === 'M' ? 90 : 85, w = Math.min(b.waistCm, T + 20), bm = Math.min(b.bmi, 35), g = Math.min(b.glassesPerDay, 10);
  return [(b.age - 50) / 10, Math.max(0, b.age - 40) / 10, Math.max(0, b.age - 65) / 10,
    Math.max(0, T - 10 - w) / 5, Math.max(0, w - T) / 5, Math.max(0, w - T - 10) / 5,
    Math.max(0, bm - 23), Math.max(0, bm - 25), Math.max(0, bm - 30),
    g, Math.max(0, g - 2), b.smoke === 'current' ? 1 : 0, b.smoke === 'past' ? 1 : 0, b.noExercise ? 1 : 0,
    Math.max(0, w - T) / 5 * (b.age - 50) / 10];
}
/** 100명 중 몇 명 (반올림 정수) */
export function per100(o: Outcome, b: Body): number {
  const c = M.models[`${o}.${b.sex}`].coef, x = features(b);
  const z = c.intercept + M.features.reduce((a, n, k) => a + c[n] * x[k], 0);
  return Math.round(100 / (1 + Math.exp(-z)));
}
/** 하루 평균 잔(소주잔 기준) = 한 번에 마시는 잔 × 주당 횟수 ÷ 7 */
export const glassesOf = (i: Input) => { const d = drinkOf(i); return d ? (d.perOccasion * d.timesPerWeek) / 7 : 0; };
/** 허리를 모르면 같은 성별 기준선 바로 아래로 둔다(화면에서 '허리를 넣으면 정확해져요'를 함께 보여준다) */
export const bodyOf = (i: Input): Body => ({ age: i.age, sex: i.sex, waistCm: i.waistCm ?? (i.sex === 'M' ? 86 : 80), bmi: i.weightKg / (i.heightCm / 100) ** 2,
  glassesPerDay: glassesOf(i), smoke: i.smoke, noExercise: i.exercise === false });
