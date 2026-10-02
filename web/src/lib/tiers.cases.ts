/**
 * 고객 상황 정답지 (docs/action-tiers.md) — 가상 고객별로 첫 화면에 나와야 할 단계와 핵심 말.
 * 지금은 점검용(analysis/scenarios/action_check.ts). 첫 화면을 단계 중심으로 고친 뒤 자동 테스트로 바꾼다.
 */
import type { AppInput } from '../state.ts';
import { bpOf } from './labs.ts';

/** ① 지금 바로 병원 ② 병원 확인 ⑤ 관리 중 ③ 습관 바꾸기 ④ 지금처럼 유지 (우선순위 ① > ② > ⑤ > ③ > ④) */
export type Tier = 1 | 2 | 5 | 3 | 4;
export const TIER_NAME: Record<Tier, string> = { 1: '① 지금 바로 병원', 2: '② 병원 확인', 5: '⑤ 관리 중', 3: '③ 습관 바꾸기', 4: '④ 지금처럼 유지' };

export interface Case {
  id: string;
  who: string;
  inp: AppInput;
  tier: Tier;
  /** 첫 화면(제목·한 줄·할 일)에 꼭 있어야 할 말 — 하나라도 없으면 실패 */
  must: string[];
  /** 첫 화면에 있으면 안 되는 말 */
  not?: string[];
}

// 45세 여성 160cm 54kg 허리 70, 비흡연·비음주·운동함·가족력 없음·진단 없음 (좋은 습관 기준 사람)
const good: AppInput = {
  age: 45, sex: 'F', heightCm: 160, weightKg: 54, waistCm: 70, smoke: 'never', alcohol: 'none', famDM: false,
  dx: { htn: false, dm: false, chol: false }, bp: 'normal', exercise: true, meno: false,
};
const man: AppInput = { ...good, sex: 'M', heightCm: 173, weightKg: 68, waistCm: 82, meno: null };
const mk = (b: AppInput, o: Partial<AppInput>, lab?: AppInput['lab']): AppInput => {
  const i = { ...b, ...o, ...(lab ? { lab } : {}) };
  if (lab?.sbp != null && lab.dbp != null) i.bp = bpOf(lab.sbp, lab.dbp);
  return i;
};
const NO_CMP_ONLY = ['또래보다 높은 항목이 없어요'];

export const CASES: Case[] = [
  // ── ① 지금 바로 병원 ──
  { id: 'u1', who: '혈압 190/125', inp: mk(good, {}, { sbp: 190, dbp: 125 }), tier: 1, must: ['지금 바로 병원'], not: ['119', '응급실'] },
  { id: 'u2', who: '혈압 180/95 (경계)', inp: mk(good, {}, { sbp: 180, dbp: 95 }), tier: 1, must: ['지금 바로 병원'] },
  { id: 'u3', who: '혈압 150/120 (이완기 경계)', inp: mk(man, { age: 55 }, { sbp: 150, dbp: 120 }), tier: 1, must: ['지금 바로 병원'] },
  { id: 'u4', who: '혈압 200/110 + 당뇨 진단', inp: mk(man, { age: 62, dx: { htn: false, dm: true, chol: false } }, { sbp: 200, dbp: 110 }), tier: 1, must: ['지금 바로 병원'] },

  // ── ② 병원 확인 ──
  { id: 'c1', who: '혈압 179/119 (응급 바로 아래)', inp: mk(good, {}, { sbp: 179, dbp: 119 }), tier: 2, must: ['혈압', '진료'], not: ['지금 바로'] },
  { id: 'c2', who: '혈압 140/85 (기준 경계)', inp: mk(man, { age: 50 }, { sbp: 140, dbp: 85 }), tier: 2, must: ['혈압', '진료'] },
  { id: 'c3', who: '혈압 160/100 + 공복혈당 150', inp: mk(man, { age: 52 }, { sbp: 160, dbp: 100, glu: 150 }), tier: 2, must: ['혈압', '혈당'] },
  { id: 'c4', who: '공복혈당 126 (경계)', inp: mk(good, { age: 50 }, { glu: 126 }), tier: 2, must: ['혈당'] },
  { id: 'c5', who: '총콜레스테롤 250', inp: mk(good, { age: 55, meno: true }, { tc: 250 }), tier: 2, must: ['콜레스테롤'] },
  { id: 'c6', who: 'eGFR 50', inp: mk(man, { age: 63 }, { egfr: 50 }), tier: 2, must: ['콩팥'] },
  { id: 'c7', who: '요단백 1+', inp: mk(good, { age: 48 }, { upro: 2 }), tier: 2, must: ['콩팥'] },
  { id: 'c8', who: '하루 5잔 이상 음주 (지방간 판단 불가)', inp: mk(man, { age: 47, alcohol: 'd5' }), tier: 2, must: ['간'] },
  { id: 'c9', who: '우울 PHQ-9 15점', inp: mk(good, { mind: { phq: [2, 2, 2, 2, 2, 2, 2, 1, 0], gad: [1, 1] } }), tier: 2, must: ['상담'] },
  { id: 'c10', who: '혈압 145/92 + 흡연 (병원이 먼저)', inp: mk(man, { age: 51, smoke: 'current' }, { sbp: 145, dbp: 92 }), tier: 2, must: ['혈압', '담배'] },
  { id: 'c11', who: '검진 수치 없이 "잰 혈압 140/90 이상"이라고 답함', inp: mk(good, { age: 56, meno: true, bp: 'high' }), tier: 2, must: ['혈압', '진료'] },

  // 기존 진단 + 새 이상 수치 → 새 이상이 먼저(②), 기존 질환은 관리 이어가기를 함께
  { id: 'x1', who: '당뇨 진단 + 검진 혈압 150/95', inp: mk(man, { age: 60, dx: { htn: false, dm: true, chol: false } }, { sbp: 150, dbp: 95 }), tier: 2, must: ['혈압', '당뇨', '관리'] },
  { id: 'x2', who: '고혈압 진단 + 공복혈당 135', inp: mk(good, { age: 58, meno: true, dx: { htn: true, dm: false, chol: false } }, { glu: 135 }), tier: 2, must: ['혈당', '고혈압'] },
  { id: 'x3', who: '고혈압 진단 + 검진 혈압 152/94 (조절 안 됨)', inp: mk(man, { age: 64, dx: { htn: true, dm: false, chol: false } }, { sbp: 152, dbp: 94 }), tier: 2, must: ['혈압', '목표'] },
  { id: 'x4', who: '고지혈증 진단 + eGFR 52', inp: mk(good, { age: 66, meno: true, dx: { htn: false, dm: false, chol: true } }, { egfr: 52 }), tier: 2, must: ['콩팥'] },

  // ── ⑤ 관리 중 ──
  { id: 'm1', who: '당뇨 진단, 그 외 양호', inp: mk(man, { age: 58, dx: { htn: false, dm: true, chol: false } }), tier: 5, must: ['관리'], not: NO_CMP_ONLY },
  { id: 'm2', who: '당뇨 진단 + 흡연 + 운동 안 함', inp: mk(man, { age: 58, smoke: 'current', exercise: false, dx: { htn: false, dm: true, chol: false } }), tier: 5, must: ['관리', '담배'], not: NO_CMP_ONLY },
  { id: 'm3', who: '고혈압·고지혈증 진단', inp: mk(good, { age: 63, meno: true, dx: { htn: true, dm: false, chol: true } }), tier: 5, must: ['관리'], not: NO_CMP_ONLY },
  { id: 'm4', who: '고혈압 진단 + 검진 혈압 132/84', inp: mk(man, { age: 60, dx: { htn: true, dm: false, chol: false } }, { sbp: 132, dbp: 84 }), tier: 5, must: ['관리'], not: NO_CMP_ONLY },

  // ── ③ 습관 바꾸기 ──
  { id: 'h1', who: '흡연 + 운동 안 함 (체형 정상)', inp: mk(good, { smoke: 'current', exercise: false, famDM: true, bp: 'unknown' }), tier: 3, must: ['담배', '운동'], not: NO_CMP_ONLY },
  { id: 'h2', who: '흡연만', inp: mk(man, { smoke: 'current' }), tier: 3, must: ['담배'], not: NO_CMP_ONLY },
  { id: 'h3', who: '운동 안 함만', inp: mk(good, { exercise: false }), tier: 3, must: ['운동'], not: NO_CMP_ONLY },
  { id: 'h4', who: 'BMI 28·허리 95 (남)', inp: mk(man, { weightKg: 84, waistCm: 95 }), tier: 3, must: ['체중'], not: NO_CMP_ONLY },
  { id: 'h5', who: '복부비만만 (여 허리 88, BMI 23)', inp: mk(good, { weightKg: 59, waistCm: 88 }), tier: 3, must: ['허리'], not: NO_CMP_ONLY },
  { id: 'h6', who: '공복혈당 110 (공복혈당장애)', inp: mk(man, { age: 50 }, { glu: 110 }), tier: 3, must: ['혈당'] },
  { id: 'h7', who: '혈압 132/84 (전단계)', inp: mk(man, { age: 44 }, { sbp: 132, dbp: 84 }), tier: 3, must: ['혈압'] },
  { id: 'h8', who: '비만 + 흡연 + 운동 안 함 (가장 큰 것 1–2개만)', inp: mk(man, { age: 52, weightKg: 90, waistCm: 98, smoke: 'current', exercise: false }), tier: 3, must: ['담배'], not: NO_CMP_ONLY },
  { id: 'h9', who: '주 1–4회 음주 + 운동 안 함', inp: mk(man, { age: 40, alcohol: 'd1_4', exercise: false }), tier: 3, must: ['운동'] },

  // 정상 체중 + 공복혈당장애 → ③, 체중 대신 혈당 확인·생활습관
  { id: 'x5', who: '정상 체중·운동함 + 공복혈당 112', inp: mk(good, { age: 47 }, { glu: 112 }), tier: 3, must: ['혈당', '당화혈색소'], not: ['체중을 줄이세요'] },
  { id: 'x6', who: '정상 체중·운동 안 함 + 공복혈당 118', inp: mk(man, { age: 42, exercise: false }, { glu: 118 }), tier: 3, must: ['운동', '혈당'], not: ['체중을 줄이세요'] },

  // ── ④ 지금처럼 유지 ──
  { id: 'k1', who: '좋은 습관 45세 여성', inp: good, tier: 4, must: ['잘', '유지'] },
  { id: 'k2', who: '좋은 습관 30세 남성', inp: mk(man, { age: 30 }), tier: 4, must: ['잘', '유지'] },
  { id: 'k3', who: '좋은 습관 + 검진 정상 (혈압 112/72·혈당 88·총콜 180)', inp: mk(good, { age: 52, meno: true }, { sbp: 112, dbp: 72, glu: 88, tc: 180 }), tier: 4, must: ['잘', '유지'] },
  { id: 'k4', who: '좋은 습관 68세 여성', inp: mk(good, { age: 68, meno: true }), tier: 4, must: ['잘'] },
  { id: 'k5', who: '과거 흡연자, 지금은 좋은 습관', inp: mk(man, { age: 55, smoke: 'past' }), tier: 4, must: ['잘'] },
  // 좋은 습관 + 정기검진 필요 → ④ 칭찬이 먼저, 할 일에 검진
  { id: 'x7', who: '좋은 습관 66세 여성 (골밀도 검진 대상)', inp: mk(good, { age: 66, meno: true }), tier: 4, must: ['잘', '골밀도'] },
  { id: 'x8', who: '좋은 습관 71세 남성 (골밀도 검진 대상)', inp: mk(man, { age: 71 }), tier: 4, must: ['잘', '골밀도'] },
  { id: 'x9', who: '좋은 습관 54세 여성 (국가검진 골밀도)', inp: mk(good, { age: 54, meno: true }), tier: 4, must: ['잘', '골밀도'] },
];
