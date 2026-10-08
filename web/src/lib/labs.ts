// 선택 입력: 최근 건강검진 수치. 항목을 빼려면 이 목록에서 한 줄만 지우면 화면·저장·계산에서 함께 빠진다.
// 값이 없으면 지금처럼 추정·범주로 계산하고, 있으면 실제 수치를 먼저 보여준다(엔진 숫자는 그대로).
import type { Bp } from '../../../engine/src/engine.ts';
import type { Lab as EngineLab, LabKey as EngineLabKey } from '../../../engine/src/extras.ts';

/** 엔진이 계산에 쓰는 항목 + 검진 풀이에만 쓰는 항목(혈색소·LDL·간 수치·크레아티닌). 엔진은 모르는 항목을 쓰지 않는다 */
export type LabKey = EngineLabKey | 'ldl' | 'hb' | 'ast' | 'alt' | 'ggt' | 'cr';
export type Lab = EngineLab & Partial<Record<Exclude<LabKey, EngineLabKey>, number>>;
/** 검진 풀이 입력 화면의 묶음 (결과지 칸 이름) */
export const LAB_GROUPS = [['life', '혈압 · 혈당', '결과지 ‘고혈압’·‘당뇨병’ 칸'], ['lipid', '콜레스테롤', '결과지 ‘이상지질혈증’ 칸 · 4년마다'], ['blood', '빈혈', '결과지 ‘빈혈’ 칸'], ['liver', '간 수치', '결과지 ‘간장 질환’ 칸'], ['kidney', '콩팥 · 소변', '결과지 ‘신장 질환’·‘요검사’ 칸']] as const;

export interface LabDef {
  key: LabKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  /** life = 생활 화면에서 바로(혈압·혈당), checkup = '검진 결과 넣기' 화면 */
  where: 'life' | 'checkup';
  /** 검진 풀이 화면의 묶음 */
  group: (typeof LAB_GROUPS)[number][0];
  /** 고르는 항목이면 선택지 (값 = 저장되는 숫자) */
  options?: [number, string][];
  help?: string;
}

export const LABS: LabDef[] = [
  { key: 'sbp', label: '수축기 혈압 (높은 값)', unit: 'mmHg', min: 70, max: 250, where: 'life', group: 'life' },
  { key: 'dbp', label: '이완기 혈압 (낮은 값)', unit: 'mmHg', min: 40, max: 150, where: 'life', group: 'life' },
  { key: 'glu', label: '공복혈당', unit: 'mg/dL', min: 50, max: 500, where: 'life', group: 'life', help: '8시간 이상 금식한 뒤 측정한 값' },
  { key: 'tc', label: '총콜레스테롤', unit: 'mg/dL', min: 80, max: 500, where: 'checkup', group: 'lipid' },
  { key: 'hdl', label: 'HDL 콜레스테롤', unit: 'mg/dL', min: 10, max: 150, where: 'checkup', group: 'lipid' },
  { key: 'tg', label: '중성지방', unit: 'mg/dL', min: 20, max: 2000, where: 'checkup', group: 'lipid' },
  { key: 'ldl', label: 'LDL 콜레스테롤', unit: 'mg/dL', min: 20, max: 400, where: 'checkup', group: 'lipid' },
  { key: 'hb', label: '혈색소', unit: 'g/dL', min: 3, max: 25, where: 'checkup', group: 'blood' },
  { key: 'ast', label: 'AST (SGOT)', unit: 'U/L', min: 1, max: 3000, where: 'checkup', group: 'liver' },
  { key: 'alt', label: 'ALT (SGPT)', unit: 'U/L', min: 1, max: 3000, where: 'checkup', group: 'liver' },
  { key: 'ggt', label: '감마지티피 (γ-GTP)', unit: 'U/L', min: 1, max: 3000, where: 'checkup', group: 'liver' },
  { key: 'cr', label: '혈청 크레아티닌', unit: 'mg/dL', min: 0.1, max: 20, where: 'checkup', group: 'kidney' },
  { key: 'egfr', label: 'eGFR (신사구체여과율)', unit: 'mL/min', min: 5, max: 150, where: 'checkup', group: 'kidney' },
  { key: 'upro', label: '요단백', unit: '', min: 0, max: 3, where: 'checkup', group: 'kidney', options: [[0, '음성'], [1, '±'], [2, '1+'], [3, '2+ 이상']] },
];

export type LabDraft = Partial<Record<LabKey, string>>;
const def = (k: LabKey) => LABS.find((l) => l.key === k);

/** 입력 중인 문자열 → 저장할 숫자 (빈 칸·범위 밖은 빼고) */
export function parseLab(d: LabDraft): Lab {
  const out: Lab = {};
  for (const l of LABS) {
    const s = d[l.key];
    if (s == null || s === '') continue;
    const v = Number(s);
    if (Number.isFinite(v) && v >= l.min && v <= l.max) out[l.key] = v;
  }
  if (out.sbp == null || out.dbp == null) { delete out.sbp; delete out.dbp; }   // 혈압은 두 값이 다 있어야
  return out;
}
/** 입력 오류 (해당 화면 칸만). 빈 칸은 괜찮다 */
export function labError(d: LabDraft, where: LabDef['where']): string | null {
  for (const l of LABS.filter((x) => x.where === where && !x.options)) {
    const s = d[l.key];
    if (s == null || s === '') continue;
    const v = Number(s);
    if (!Number.isFinite(v) || v < l.min || v > l.max) return `${l.label}은 ${l.min}–${l.max} 사이로 넣어 주세요`;
  }
  if (where === 'life' && def('sbp') && !!d.sbp !== !!d.dbp) return '혈압은 두 숫자를 모두 넣어 주세요';
  return null;
}
/** 혈압 숫자 → 엔진의 혈압 범주 (정상 120/80 미만, 주의 120–139/80–89, 높음 140/90 이상) */
export const bpOf = (sbp: number, dbp: number): Bp => (sbp >= 140 || dbp >= 90 ? 'high' : sbp >= 120 || dbp >= 80 ? 'elevated' : 'normal');
export const labCount = (l?: Lab) => (l ? Object.keys(l).length - (l.sbp != null ? 1 : 0) : 0);   // 혈압 두 값은 1개로
