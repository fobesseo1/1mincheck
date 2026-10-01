/**
 * 또래 중 내 위치 (로드맵 3단계). 국민건강영양조사 제9기(2022–2024)에서 같은 성별·나이 ±5세,
 * 진단받지 않은 사람에게 엔진(보정값)을 돌린 확률 분포의 5–95% 분위수 (analysis/validate.ts 가 만든다).
 */
import T from './percentiles.json' with { type: 'json' };

type Table = Record<string, Record<'M' | 'F', Record<string, number[]>>>;
const TAB = T as unknown as Table & { meta: { quantiles: number[] } };

/** 내 값이 또래 100명 중 낮은 쪽에서 몇 번째쯤인지 (1–99). 표가 없으면 null */
export function rankOf(id: string, sex: 'M' | 'F', age: number, value: number): number | null {
  const q = TAB[id]?.[sex]?.[String(Math.min(80, Math.max(19, Math.round(age))))];
  if (!q) return null;
  const Q = TAB.meta.quantiles;
  if (value <= q[0]) return Math.max(1, Math.round(Q[0] / 2));
  if (value >= q[q.length - 1]) return Math.min(99, Math.round((Q[Q.length - 1] + 100) / 2));
  for (let k = 1; k < q.length; k++) {
    if (value <= q[k]) {
      const lo = q[k - 1], hi = q[k], t = hi > lo ? (value - lo) / (hi - lo) : 0.5;
      return Math.round(Q[k - 1] + t * (Q[k] - Q[k - 1]));
    }
  }
  return null;
}
