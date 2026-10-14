// 바꿔보기의 체형 캐릭터 · 구간 막대 색 · 허리 단위. 화면에 보이는 방식만 정하고, 위험 계산은 lines.ts(엔진)를 그대로 쓴다.
import type { Stop } from '@/components/ui/zone-slider';

// ── 체형 단계: 그림마다 그린 BMI 1=17 · 2=21 · 3=24 · 4=27.7 · 5=32, 사이는 직선으로 이어 소수 단계(3.4 등) ──
// 단계는 몸무게(BMI)로만 정한다. 허리는 몸 전체가 아니라 배만 바꾼다(bellyMix).
const ANCHORS = [16.5, 21, 24, 27.7, 32];
export function bodyStage(heightCm: number, weightKg: number) {
  const b = weightKg / (heightCm / 100) ** 2;
  if (b <= ANCHORS[0]) return 1;
  if (b >= ANCHORS[4]) return 5;
  const i = ANCHORS.findIndex((_, j) => b < ANCHORS[j + 1]);
  return 1 + i + (b - ANCHORS[i]) / (ANCHORS[i + 1] - ANCHORS[i]);
}
/** 허리 → 배 (0 = 보통 그림, 1 = 배 나온 그림). 기준선 −3cm ~ +3cm 사이에서 서서히 */
export const bellyMix = (waistCm: number, cutCm: number) => Math.max(0, Math.min(1, (waistCm - (cutCm - 3)) / 6));

// ── 막대 칠 색: 건강 구간에서 벗어날수록 진해지는 붉은 계열 (뚱뚱한 쪽 · 마른 쪽 모두, 마른 쪽은 조금 덜 진하게) ──
/** 몸무게: BMI 23 → 25 → 30 → 35 → 끝 / 마른 쪽 BMI 18.5 → 17 → 15 → 끝 */
export function weightStops(heightCm: number): { over: Stop[]; under: Stop[] } {
  const h2 = (heightCm / 100) ** 2;
  return {
    over: [[23 * h2, '#ffc9d3'], [25 * h2, '#fb8aa0'], [30 * h2, '#fb2d54'], [35 * h2, '#c8173c'], [40 * h2, '#9c0f2e']],
    under: [[13 * h2, '#d81e44'], [15 * h2, '#fb2d54'], [17 * h2, '#fb9db0'], [18.5 * h2, '#ffd3db']],
  };
}
/** 허리: 기준선 → +5 → +10 → +20cm → 끝 */
export const waistStops = (cut: number): Stop[] => [[cut, '#ffc9d3'], [cut + 5, '#fb8aa0'], [cut + 10, '#fb2d54'], [cut + 20, '#c8173c'], [cut + 30, '#9c0f2e']];

// ── 허리 단위: 기본은 인치. 인치는 1인치 단위 정수만(소수 금지), cm 는 1cm 단위. 계산은 늘 cm ──
export type WaistUnit = 'in' | 'cm';
export const IN = 2.54;
const per = (u: WaistUnit) => (u === 'cm' ? 1 : IN);
/** cm → 그 단위의 눈금 (정수) */
export const toUnit = (cm: number, u: WaistUnit) => Math.round(cm / per(u));
/** 그 단위의 눈금 → cm (인치 36 = 91.44cm) */
export const toCm = (v: number, u: WaistUnit) => v * per(u);
const UKEY = '1mincheck.waistUnit';
/** 처음 보여 줄 허리 단위: 바꿔보기에서 고른 단위 > 입력 화면에서 직접 고른 단위 > 인치(한국에서 익숙한 단위) */
export function initialWaistUnit(d: { waistUnit: WaistUnit; waistUnitChosen?: boolean }): WaistUnit {
  try { const s = sessionStorage.getItem(UKEY); if (s === 'in' || s === 'cm') return s; } catch { /* 저장소 없음 */ }
  return d.waistUnitChosen ? d.waistUnit : 'in';
}
export const saveWaistUnit = (u: WaistUnit) => { try { sessionStorage.setItem(UKEY, u); } catch { /* 무시 */ } };
export const unitLabel = (u: WaistUnit) => (u === 'cm' ? 'cm' : '인치');
/** 기준선은 cm 로 정해진 값이라 인치로는 소수(90cm = 35.4인치) → cm 기준과 정상인 정수 인치를 함께 */
export const cutLabel = (cut: number, u: WaistUnit) => (u === 'cm' ? `기준 ${cut}cm` : `기준 ${cut}cm (${Math.ceil(cut / IN) - 1}인치까지 정상)`);
