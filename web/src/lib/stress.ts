/** 화면 깨짐 확인용 극단 예시 (개발 모드 버튼·e2e 전용, 배포 화면에는 나오지 않음) */
import type { Input } from '../../../engine/src/engine.ts';

const worstMods = {
  sleep: { snore: true, tired: true, apnea: true, neck: true, insGate: true, isi: [4, 4, 4, 4, 4, 4, 4] },
  mind: { phq: [3, 3], gad: [3, 3] },
  gerd: { gate: true, gq: [3, 3, 3, 3, 3, 3] },
  diet: [0, 0, 0, 0, 0, 0, 0],
};
const goodMods = {
  sleep: { snore: false, tired: false, apnea: false, neck: false, insGate: false },
  mind: { phq: [0, 0], gad: [0, 0] },
  gerd: { gate: false },
  diet: [2, 2, 2, 2, 2, 2, 2],
};

export const stressSamples: { id: string; label: string; input: Input }[] = [
  // 먼저 확인할 것 9개 (간 과음 + 확률 4 + 점수 4)
  { id: 'X1', label: 'X1 · 확인 최대', input: { age: 25, sex: 'M', heightCm: 165, weightKg: 70, waistCm: 70, smoke: 'never', alcohol: 'd5', famDM: true,
    dx: { htn: false, dm: false, chol: false }, bp: 'normal', exercise: false, meno: null, ...worstMods } },
  // 진단 질환 3개 + 나쁜 생활
  { id: 'X2', label: 'X2 · 진단 3개', input: { age: 67, sex: 'F', heightCm: 155, weightKg: 75, waistCm: 98, smoke: 'current', alcohol: 'd1_4', famDM: true,
    dx: { htn: true, dm: true, chol: true }, bp: 'high', exercise: false, meno: true, ...worstMods } },
  // 또래보다 낮은 것 최대, 관리하면 줄어드는 것 없음
  { id: 'X3', label: 'X3 · 낮음 최대', input: { age: 25, sex: 'M', heightCm: 175, weightKg: 62, waistCm: 72, smoke: 'never', alcohol: 'none', famDM: false,
    dx: { htn: false, dm: false, chol: false }, bp: 'normal', exercise: true, meno: null, ...goodMods } },
  // 혈압 기준 이상 + 고도비만·흡연
  { id: 'X4', label: 'X4 · 혈압 기준', input: { age: 58, sex: 'M', heightCm: 170, weightKg: 98, waistCm: 108, smoke: 'current', alcohol: 'd1_4', famDM: true,
    dx: { htn: false, dm: false, chol: false }, bp: 'high', exercise: false, meno: null, ...worstMods } },
];
