/**
 * A/B 비교용 가상 프로필 (실제 사람이 아님). 두 버전에 같은 답을 넣을 수 있게 '화면에서 고르는 답' 그대로 적는다.
 * 결과 값은 여기에 적지 않는다 — 현재 엔진으로 계산한다(analysis/b_profiles.ts, bProfiles.test.ts).
 */
import { emptyDraft, type Draft } from '../state.ts';

type P = { id: string; title: string; note: string; d: Partial<Draft> };
const none = { htn: false, dm: false, chol: false, none: true };
const off = { sleep: false, mind: false, gerd: false, diet: false };
const soju = (n: number) => ({ soju: n, beer: 0, wine: 0 }), beer = (n: number) => ({ soju: 0, beer: n, wine: 0 }), wine = (n: number) => ({ soju: 0, beer: 0, wine: n });

export const B_PROFILES: P[] = [
  { id: 'P1', title: '좋은 습관 · 검진값 없음', note: '기록 없는 첫 이용(P11)에도 이 프로필을 써요.',
    d: { sex: 'F', age: '34', height: '162', weight: '54', waist: '70', waistUnit: 'cm', smoke: 'never', alcFreq: 'none', exercise: true, famDM: false, dx: none, bp: 'normal', modules: off } },
  { id: 'P2', title: '비만 · 복부비만 · 검진값 없음', note: '기록 비교(P12)에 이어서 써요.',
    d: { sex: 'M', age: '45', height: '170', weight: '88', waist: '98', waistUnit: 'cm', smoke: 'never', alcFreq: 'w1_2', alcAmt: soju(1), exercise: true, famDM: false, dx: none, bp: 'unknown', modules: off } },
  { id: 'P3', title: '흡연 · 운동 부족 · 가족력', note: '',
    d: { sex: 'M', age: '38', height: '175', weight: '72', waist: '84', waistUnit: 'cm', smoke: 'current', alcFreq: 'w3_4', alcAmt: soju(1), exercise: false, famDM: true, dx: none, bp: 'unknown', modules: off } },
  { id: 'P4', title: '정상 범위 공복혈당 입력', note: '',
    d: { sex: 'F', age: '48', height: '158', weight: '56', waist: '76', waistUnit: 'cm', smoke: 'never', alcFreq: 'none', exercise: true, meno: false, famDM: false, dx: none, bp: 'normal', modules: off, lab: { glu: '92' } } },
  { id: 'P5', title: '공복혈당 100–125 입력', note: '',
    d: { sex: 'M', age: '52', height: '172', weight: '78', waist: '92', waistUnit: 'cm', smoke: 'past', alcFreq: 'w1_2', alcAmt: beer(2), exercise: false, famDM: true, dx: none, bp: 'elevated', modules: off, lab: { glu: '112' } } },
  { id: 'P6', title: '높은 혈압 + 높은 혈당', note: '혈압 숫자를 넣으면 혈압 응답은 숫자로 정해져요.',
    d: { sex: 'M', age: '57', height: '168', weight: '80', waist: '95', waistUnit: 'cm', smoke: 'current', alcFreq: 'w1_2', alcAmt: soju(1), exercise: false, famDM: false, dx: none, bp: 'high', modules: off, lab: { sbp: '152', dbp: '96', glu: '138' } } },
  { id: 'P7', title: '이미 당뇨·고혈압 진단', note: '',
    d: { sex: 'F', age: '61', height: '155', weight: '63', waist: '88', waistUnit: 'cm', smoke: 'never', alcFreq: 'none', exercise: true, meno: true, famDM: true, dx: { htn: true, dm: true, chol: false, none: false }, bp: 'normal', modules: off } },
  { id: 'P8', title: '매우 높은 혈압 · 혈당 (긴급 안내)', note: '',
    d: { sex: 'M', age: '49', height: '174', weight: '82', waist: '94', waistUnit: 'cm', smoke: 'never', alcFreq: 'm2_4', alcAmt: beer(1), exercise: true, famDM: false, dx: none, bp: 'high', modules: off, lab: { sbp: '186', dbp: '112', glu: '310' } } },
  { id: 'P9', title: '일부 검진값만 (총콜레스테롤)', note: '',
    d: { sex: 'F', age: '44', height: '165', weight: '68', waist: '84', waistUnit: 'cm', smoke: 'never', alcFreq: 'm1', alcAmt: wine(1), exercise: false, meno: false, famDM: false, dx: none, bp: 'unknown', modules: off, lab: { tc: '228' } } },
  { id: 'P10', title: '수면 · 마음 설문 응답', note: '관심 분야에서 수면·마음만 고르고 아래 답을 넣어요.',
    d: { sex: 'M', age: '33', height: '178', weight: '74', waist: '86', waistUnit: 'cm', smoke: 'never', alcFreq: 'w1_2', alcAmt: beer(2), exercise: true, famDM: false, dx: none, bp: 'normal',
      modules: { sleep: true, mind: true, gerd: false, diet: false },
      sleep: { snore: true, tired: true, apnea: false, neck: false, insGate: true, isi: [2, 2, 1, 2, 2, 1, 2] },
      mind: { phq: [1, 2, null, null, null, null, null, null, null], gad: [2, 1] } } },
  { id: 'P13', title: '작은 절대 가능성 · 큰 또래 배수', note: '현재 판정(병원 확인)을 그대로 두고 표현 차이를 보는 사례예요.',
    d: { sex: 'F', age: '25', height: '162', weight: '75', waist: '90', waistUnit: 'cm', smoke: 'never', alcFreq: 'none', exercise: true, famDM: false, dx: none, bp: 'unknown', modules: off } },
];
export const draftOf = (p: P): Draft => ({ ...emptyDraft(), ...p.d, alcAmt: { ...emptyDraft().alcAmt, ...(p.d.alcAmt ?? {}) } });
