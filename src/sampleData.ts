/**
 * 1분체크 디자인 캔버스용 예시 데이터 — 화면에 나오는 모든 예시 값은 이 파일에서만 온다.
 * 이 파일을 고친 뒤 `node design/build-bundle.mjs` 로 design/onemin.js 를 다시 만들고
 * 캔버스의 project/onemin.js 로 올리면 모든 화면(입력 답변·결과·상세·what-if·기록·랜딩)이 바뀐다.
 * 결과 숫자는 여기 적지 않는다. 화면이 engine 의 runAll()·whatIf() 로 매번 계산한다.
 */
import type { Input } from '../engine/src/engine';

export interface Sample {
  id: string;
  label: string;        // 전환 버튼에 보이는 이름
  desc: string;         // 한 줄 설명
  date: string;         // 이번 체크 날짜
  input: Input;         // 이번 답변 (기본정보 + 모듈)
  /** 결과·상세 화면의 "관리하면 이만큼 줄어요"와 what-if 첫 화면에 쓰는 변화량. 0이면 '유지' 안내 */
  scenario: { weightKg: number; waistCm: number };
  /** 기록 비교 화면의 이전 기록. 없으면 기록 1개 상태로 보인다 */
  previous?: { date: string; input: Input };
}

// 공통: 49세 여성, 160cm, 비흡연·비음주·운동함·폐경 전
const base49F: Input = {
  age: 49, sex: 'F', heightCm: 160, weightKg: 62, waistCm: 81.3,
  smoke: 'never', alcohol: 'none', famDM: false,
  dx: { htn: false, dm: false, chol: false }, bp: 'unknown',
  exercise: true, meno: false,
};

// ── A: 기본 예시 (기획 요청 사용자) ─────────────────────────
const aModules = {
  sleep: { snore: false, tired: true, apnea: false, neck: false, insGate: true, isi: [2, 1, 2, 2, 1, 2, 1] }, // ISI 11
  mind: { phq: [1, 1], gad: [1, 1] },                  // PHQ-2 2, GAD-2 2
  gerd: { gate: true, gq: [1, 0, 0, 0, 0, 0] },        // GerdQ 7 (gq3·gq4 역채점)
  diet: [2, 1, 1, 1, 0, 1, 2],                         // 57점
};

// ── B: 증상 있음 (ISI 18 · PHQ-2 4 · GerdQ 10). 기본정보는 A와 같다 ──
const bModules = {
  sleep: { snore: false, tired: true, apnea: false, neck: false, insGate: true, isi: [3, 3, 2, 3, 2, 3, 2] }, // ISI 18
  mind: { phq: [2, 2], gad: [1, 1] },                  // PHQ-2 4 (PHQ-9 나머지 7문항은 답하지 않음)
  gerd: { gate: true, gq: [2, 2, 0, 1, 1, 0] },        // GerdQ 2+2+3+2+1+0 = 10
  diet: [2, 1, 1, 1, 0, 1, 2],
};

// ── C: 모두 양호 ─────────────────────────────────────────
const cInput: Input = {
  ...base49F, weightKg: 54, waistCm: 72, bp: 'normal',
  sleep: { snore: false, tired: false, apnea: false, neck: false, insGate: false },
  mind: { phq: [0, 0], gad: [0, 0] },
  gerd: { gate: false },
  diet: [2, 2, 2, 2, 2, 2, 2],
};

export const samples: Sample[] = [
  {
    id: 'A', label: 'A · 기본', desc: '49세 여성 · 요청하신 예시 사용자', date: '2026.09.30',
    input: { ...base49F, ...aModules },
    scenario: { weightKg: -4, waistCm: -5 },
    previous: { date: '2026.06.30', input: { ...base49F, ...aModules, weightKg: 65, waistCm: 85.5, exercise: false } },
  },
  {
    id: 'B', label: 'B · 증상 있음', desc: '49세 여성 · 불면·우울 선별·역류 양성', date: '2026.09.30',
    input: { ...base49F, ...bModules },
    scenario: { weightKg: -4, waistCm: -5 },
    previous: { date: '2026.06.30', input: { ...base49F, ...bModules, weightKg: 65, waistCm: 85.5, exercise: false } },
  },
  {
    id: 'C', label: 'C · 모두 양호', desc: '49세 여성 · 모든 항목 정상 범위', date: '2026.09.30',
    input: cInput,
    scenario: { weightKg: 0, waistCm: 0 },
    previous: { date: '2026.06.30', input: { ...cInput, weightKg: 55, waistCm: 73.5 } },
  },
];

/** 랜딩페이지와 첫 화면 기본값 */
export const defaultSampleId = 'A';
