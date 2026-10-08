/**
 * '이대로면 vs 바꾸면' (v2 결과 3번째 카드): 몸무게·허리를 바꿨을 때 기준선을 넘는지와, 그때 달라지는 미래 위험.
 * 확률을 새로 만들지 않는다. 기준선은 공식 기준 그대로, 미래 위험은 engine/src/extras.ts 의 원문 점수표 그대로 쓴다.
 *  - BMI: 대한비만학회 2022 (18.5 / 23 / 25 / 30 / 35)
 *  - 허리: 대한비만학회 복부비만 (남 90cm·여 85cm 이상)
 *  - 10년 당뇨: Oh 2021 KDR (40–69세, 허리 필수). 몸무게는 계산에 없고 허리 기준선을 넘나들 때만 점수가 바뀐다.
 *    점수표의 구간별 비율이 단조롭지 않아 점수가 내려가도 비율이 같거나 오를 수 있다 → 그때는 점수 변화만 말한다.
 *  - 4년 고혈압: Lim 2013 (40–69세, 검진 혈압 숫자 필요, 140/90 미만). BMI 25·30에서 점수가 바뀐다.
 * 기간은 계산식 그대로(10년·4년). 늘리거나 줄이지 않는다.
 */
import type { Input } from '../../../engine/src/engine.ts';
import { dm10Calc, htn4Score, htn4Risk } from '../../../engine/src/extras.ts';
import { labOf } from './view.ts';

export type Tone = 'low' | 'ok' | 'mid' | 'high';
export interface Zone { from: number; to: number; name: string; tone: Tone }
export const BMI_ZONES: Zone[] = [
  { from: 0, to: 18.5, name: '저체중', tone: 'low' }, { from: 18.5, to: 23, name: '정상', tone: 'ok' }, { from: 23, to: 25, name: '비만 전단계', tone: 'mid' },
  { from: 25, to: 30, name: '1단계 비만', tone: 'high' }, { from: 30, to: 35, name: '2단계 비만', tone: 'high' }, { from: 35, to: Infinity, name: '3단계 비만', tone: 'high' },
];
export const waistCut = (sex: 'M' | 'F') => (sex === 'F' ? 85 : 90);
export const waistZones = (sex: 'M' | 'F'): Zone[] => [{ from: 0, to: waistCut(sex), name: '정상', tone: 'ok' }, { from: waistCut(sex), to: Infinity, name: '복부비만', tone: 'high' }];
export const zoneOf = (zs: Zone[], v: number) => zs.find((z) => v >= z.from && v < z.to)!;

const r1 = (x: number) => Math.round(x * 10) / 10;
export const bmiOf = (heightCm: number, weightKg: number) => weightKg / (heightCm / 100) ** 2;

export interface Gauge {
  key: 'bmi' | 'waist'; title: string; unit: string; min: number; max: number; zones: Zone[];
  /** 막대에 그을 기준선 */
  lines: number[];
  now: number; after: number; nowZone: Zone; afterZone: Zone;
  /** 지금 값 기준 한 줄: 다음 기준선까지 거리 */
  gap: string;
}

/** 바로 위 단계 기준선 아래로 내려가려면 줄여야 하는 kg (정수, 올림). BMI 23 미만이면 null */
export function kgToLowerZone(heightCm: number, weightKg: number): { kg: number; line: number; zone: string } | null {
  const b = bmiOf(heightCm, weightKg), hm2 = (heightCm / 100) ** 2;
  const line = [35, 30, 25, 23].find((l) => b >= l);
  if (line == null) return null;
  const kg = Math.ceil(weightKg - line * hm2 + 0.05);
  return { kg, line, zone: zoneOf(BMI_ZONES, line - 0.01).name };
}
/** 허리가 기준 이상이면 기준 아래로 가려면 줄여야 하는 cm (정수, 올림) */
export function cmToWaistOk(sex: 'M' | 'F', waistCm: number): number | null {
  const c = waistCut(sex);
  return waistCm >= c ? Math.ceil(waistCm - c + 0.1) : null;
}
/** 몸무게를 줄일 수 있는 하한: BMI 18.5 아래로는 권하지 않는다 */
export const minWeightDelta = (heightCm: number, weightKg: number, floor = -15) =>
  Math.max(floor, Math.min(0, Math.ceil(18.5 * (heightCm / 100) ** 2 - weightKg))) || 0;   // -0 → 0

export function bmiGauge(i: Input, dw: number): Gauge {
  const now = r1(bmiOf(i.heightCm, i.weightKg)), after = r1(bmiOf(i.heightCm, i.weightKg + dw));
  const nz = zoneOf(BMI_ZONES, now), hm2 = (i.heightCm / 100) ** 2, k = kgToLowerZone(i.heightCm, i.weightKg);
  const AFTER: Record<number, string> = { 35: '2단계 비만으로 내려가요', 30: '1단계 비만으로 내려가요', 25: '비만에서 벗어나요', 23: '정상 체중이 돼요' };
  const gap = k ? `${k.kg}kg을 빼면\n${AFTER[k.line]}`
    : now >= 18.5 ? `정상 체중이에요.\n${r1(23 * hm2 - i.weightKg)}kg 더 늘면 비만 전단계예요.`
    : `저체중이에요.\n${r1(18.5 * hm2 - i.weightKg)}kg 늘면 정상 체중이 돼요.`;
  return { key: 'bmi', title: '몸무게 (BMI)', unit: 'BMI', min: 16, max: 36, zones: BMI_ZONES, lines: [18.5, 23, 25, 30, 35], now, after, nowZone: nz, afterZone: zoneOf(BMI_ZONES, after), gap };
}
export function waistGauge(i: Input, dwa: number): Gauge | null {
  if (i.waistCm == null) return null;
  const c = waistCut(i.sex), zs = waistZones(i.sex), now = i.waistCm, after = r1(i.waistCm + dwa), need = cmToWaistOk(i.sex, now);
  const gap = need != null ? `허리를 ${need}cm 줄이면\n복부비만에서 벗어나요` : `복부비만은 아니에요.\n${c}cm까지 ${r1(c - now)}cm 남았어요.`;
  return { key: 'waist', title: '허리둘레', unit: 'cm', min: c - 25, max: c + 20, zones: zs, lines: [c], now, after, nowZone: zoneOf(zs, now), afterZone: zoneOf(zs, after), gap };
}

export type Dir = 'down' | 'up' | 'same';
export interface Effect { id: 'dm10' | 'htn4'; title: string; before: string; after: string; dir: Dir; note: string }

const rangeText = (xs: number[]) => { const lo = Math.min(...xs), hi = Math.max(...xs); return lo === hi ? `${lo}%` : `${lo}–${hi}%`; };
const dirOf = (b: number[], a: number[]): Dir => { const d = Math.max(...a) - Math.max(...b) + Math.min(...a) - Math.min(...b); return d < 0 ? 'down' : d > 0 ? 'up' : 'same'; };

/** 바꿨을 때 달라지는 미래 위험 (원문 점수표가 적용되는 사람만) + 아직 볼 수 없는 이유 */
export function futureEffects(i: Input, dw: number, dwa: number): { effects: Effect[]; hints: string[] } {
  const L = labOf(i), a: Input = { ...i, weightKg: r1(i.weightKg + dw), waistCm: i.waistCm == null ? null : r1(i.waistCm + dwa) };
  const effects: Effect[] = [], hints: string[] = [];
  const ageOk = i.age >= 40 && i.age <= 69;
  const d0 = dm10Calc(i, L), d1 = dm10Calc(a, L);
  if (d0 && d1) {
    const ds = d1.ss[0] - d0.ss[0], dir = dirOf(d0.rs, d1.rs);
    const note = ds === 0 ? `허리 ${waistCut(i.sex)}cm 기준선을 넘나들 때만 바뀌어요. 몸무게는 이 계산에 들어가지 않아요.`
      : dir === 'down' ? `허리가 기준선 아래로 내려가 위험 점수가 ${-ds}점 낮아져요.`
      : ds < 0 ? `위험 점수는 ${-ds}점 낮아지지만, 원 연구 점수표에서 이 구간의 비율이 비슷해요.`
      : `허리가 기준선을 넘어 위험 점수가 ${ds}점 높아져요.`;
    effects.push({ id: 'dm10', title: '10년 안에 당뇨가 생길 가능성', before: rangeText(d0.rs), after: rangeText(d1.rs), dir, note: d0.rs.length > 1 ? `${note} 혈압을 몰라 범위로 보여드려요.` : note });
  } else if (ageOk && !i.dx.dm && i.waistCm == null) hints.push('허리둘레를 넣으면 10년 안에 당뇨가 생길 가능성도 볼 수 있어요.');
  if (L.sbp != null && L.dbp != null && L.sbp < 140 && L.dbp < 90 && ageOk && !i.dx.htn) {
    const b = htn4Risk(htn4Score(i, L.sbp, L.dbp, 0)), x = htn4Risk(htn4Score(a, L.sbp, L.dbp, 0));
    effects.push({ id: 'htn4', title: '4년 안에 고혈압이 생길 가능성', before: `${b}%`, after: `${x}%`, dir: x < b ? 'down' : x > b ? 'up' : 'same',
      note: x === b ? 'BMI 25·30 기준선을 넘나들 때 바뀌어요.' : `BMI가 ${x < b ? '기준선 아래로 내려가' : '기준선을 넘어'} 점수가 바뀌었어요.` });
  } else if (ageOk && !i.dx.htn && L.sbp == null) hints.push('검진 혈압 숫자를 넣으면 4년 안에 고혈압이 생길 가능성도 볼 수 있어요.');
  if (!ageOk) hints.push('미래 위험 계산식은 40–69세 연구로 만들어서, 지금은 기준선만 보여드려요.');
  return { effects, hints };
}

// ── v2.1 끌어서 바꾸는 막대 (몸무게는 kg, 허리는 cm 그대로) ──
export interface Track { min: number; max: number; zones: { from: number; to: number; name: string; tone: Tone }[]; normal?: [number, number]; cut?: number }
/** 몸무게 막대: BMI 구간을 내 키에 맞춰 kg 로. 표준 몸무게 = BMI 18.5–22.9 */
export function weightTrack(i: Input): Track {
  const hm2 = (i.heightCm / 100) ** 2;
  const min = Math.max(30, Math.min(Math.floor(16.5 * hm2), Math.floor(i.weightKg - 5))), max = Math.max(Math.ceil(35 * hm2), Math.ceil(i.weightKg + 10));
  return { min, max, zones: BMI_ZONES.map((z) => ({ from: Math.max(min, z.from * hm2), to: Math.min(max, z.to * hm2), name: z.name, tone: z.tone })).filter((z) => z.to > z.from),
    normal: [Math.ceil(18.5 * hm2), Math.floor(23 * hm2 - 0.05)] };
}
/** 허리 막대: 복부비만 기준(남 90·여 85cm) 앞뒤 */
export function waistTrack(i: Input): Track | null {
  if (i.waistCm == null) return null;
  const c = waistCut(i.sex), min = Math.floor(Math.min(c - 20, i.waistCm - 8)), max = Math.ceil(Math.max(c + 20, i.waistCm + 8));
  return { min, max, cut: c, zones: waistZones(i.sex).map((z) => ({ from: Math.max(min, z.from), to: Math.min(max, z.to), name: z.name, tone: z.tone })) };
}
export const toneAt = (t: Track, v: number) => (t.zones.find((z) => v >= z.from && v < z.to) ?? (v < t.min ? t.zones[0] : t.zones[t.zones.length - 1]));
