/**
 * 실측 보정 (보정 v1, 국민건강영양조사 제9기 2022–2024). engine.ts 의 식은 그대로 두고, 결과 확률만 실측에 맞춘다.
 *
 * 왜: 엔진의 고혈압·콜레스테롤 등은 '진단받은 사람까지 포함한 유병률'에서 출발하는데, 앱은 진단받지 않은 사람에게만
 * 확률을 보여준다. 진단받은 사람은 대부분 약으로 수치가 내려가 빠지므로 남은 사람의 실제 비율은 훨씬 낮다.
 * 방법: 로지스틱 재보정 logit(p′) = a[성별·연령대] + b · logit(p). 2022–2023으로 만들고 2024로 확인 (analysis/calibrate.ts).
 * 또래 평균 = 같은 성별·연령대에서 '진단받지 않은 사람'의 실측 비율(가중).
 */
import C from './calibration.json' with { type: 'json' };

export type CalId = 'dm' | 'htn' | 'chol' | 'osteo';
export const CAL_IDS: CalId[] = ['dm', 'htn', 'chol', 'osteo'];
export const BANDS = ['19–29', '30대', '40대', '50대', '60대', '70세↑'];
export const bandOf = (age: number) => (age < 30 ? 0 : age >= 70 ? 5 : Math.floor(age / 10) - 2);

interface CalItem { slope: number; a: Record<'M' | 'F', (number | null)[]>; peer: Record<'M' | 'F', (number | null)[]>; n: Record<'M' | 'F', number[]> }
const CAL = C as unknown as { version: string; items: Record<CalId, CalItem> };
export const calVersion = CAL.version;

const logit = (p: number) => Math.log(p / (1 - p));
const clamp = (p: number) => Math.min(0.995, Math.max(0.001, p));

/** 엔진 확률(%) → 보정 확률(%). 그 성별·연령대 보정값이 없으면 엔진값 그대로 */
export function calibrate(id: CalId, pct: number, sex: 'M' | 'F', age: number): number {
  const it = CAL.items[id], a = it?.a[sex][bandOf(age)];
  if (a == null) return pct;
  const z = a + it.slope * logit(clamp(pct / 100));
  return Math.round(1000 / (1 + Math.exp(-z))) / 10;
}
/** 같은 성별·연령대, 진단받지 않은 사람의 실측 비율(%) */
export function peerOf(id: CalId, sex: 'M' | 'F', age: number): number | null {
  return CAL.items[id]?.peer[sex][bandOf(age)] ?? null;
}
export function calInfo(id: CalId, sex: 'M' | 'F', age: number) {
  const it = CAL.items[id], b = bandOf(age);
  return { band: `${sex === 'M' ? '남' : '여'} ${BANDS[b]}`, n: it?.n[sex][b] ?? 0, a: it?.a[sex][b] ?? null, slope: it?.slope ?? 1 };
}
