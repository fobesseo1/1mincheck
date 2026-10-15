/**
 * 결과 맨 위 '한눈 요약' (docs/plan-2026-10-15-result-redesign.md §5): 당뇨·고혈압·지방간 세 줄을 늘 같은 틀로.
 * 줄 하나 = 막대 단계(0–4) · 한 단어 · 오른쪽 작은 근거 · 이유 칩(누르면 짧은 설명).
 * 숫자는 지금 계산(view.ts runAll·cmpOf, engine percentile rankOf, viewDetail 점수 내역) 그대로. 새 확률을 만들지 않는다.
 */
import type { Input } from '../../../engine/src/engine.ts';
import { rankOf } from '../../../engine/src/percentile.ts';
import { runAll, byId, cmpOf, labOf, xfmt, f1 } from './view.ts';
import { drinkOf } from '../state.ts';
import WT from '../../../engine/src/waist_typical.json';

/** 허리를 모를 때의 '보통 허리'(cm): 같은 성별·나이·BMI 사람의 평균 (국민건강영양조사 2022–2024, analysis/waist_typical.py, 2024 평균 오차 약 3cm) */
export function typicalWaist(sex: 'M' | 'F', age: number, bmi: number): number {
  const c = (WT as { coef: Record<'M' | 'F', number[]> }).coef[sex], t = (age - 50) / 10;
  return c[0] + c[1] * bmi + c[2] * Math.max(0, bmi - 25) + c[3] * t + c[4] * t * t;
}
import type { ItemId } from './content.ts';

export type Level = 0 | 1 | 2 | 3 | 4;
export const LEVEL_WORD = ['낮은 편', '또래와 비슷', '조금 높은 편', '높은 편', '매우 높음'] as const;
/** 칩: tone up = 위험을 올린 것, ok = 좋은 것, plain = 안내. why = 누르면 뜨는 짧은 설명 */
export interface Chip { t: string; tone: 'up' | 'ok' | 'plain'; why: string; href?: string }
export interface Row {
  id: ItemId; name: string;
  /** prob = 또래 비교 단계, managed = 진단 관리 중, alert = 확인 필요(검진 수치·술), range = 범위, gray = 상태 안내(전 단계·측정 혈압·대상 아님) */
  kind: 'prob' | 'managed' | 'alert' | 'range' | 'gray';
  level: Level | null; word: string; side: string; chips: Chip[];
  /** range 일 때 막대에 칠할 칸 [시작, 끝] (0–4) */
  span?: [number, number];
  /** 카드의 큰 숫자 (예: 19.1 + %) 와 그 아래 비교 한 줄 */
  big: { n: string; unit?: string }; sub: string;
  /** 문장용 숫자: 내 가능성·또래 평균(%), 또래 순위(1–99, 낮은 쪽부터), 범위, 주당 알코올 g */
  num?: { me?: number; peer?: number; rank?: number | null; lo?: number; hi?: number; grams?: number };
  /** 허리 모름일 때 보통 허리로 계산한 단계 (예상 뱃지) */
  guess?: Level;
}

const ROW_IDS: ItemId[] = ['dm', 'htn', 'nafld'];
const NAME: Record<string, string> = { dm: '당뇨', htn: '고혈압', nafld: '지방간' };
const IN = 2.54;
const inch = (cm: number) => Math.round(cm / IN);
const bmi = (i: Input) => i.weightKg / (i.heightCm / 100) ** 2;

/** 순위·배수 중 더 경고가 되는 쪽. 낮은 편은 둘 다 낮을 때만 */
export function levelOf(rank: number | null, x: number): Level {
  const byRank: Level = rank == null ? 1 : rank >= 96 ? 4 : rank >= 80 ? 3 : rank >= 65 ? 2 : rank <= 20 ? 0 : 1;
  const byX: Level = x >= 2 ? 4 : x >= 1.25 ? 2 : x < 0.8 ? 0 : 1;
  if (rank == null) return byX;
  return Math.max(byRank, byX) as Level;
}
function sideOf(level: Level, rank: number | null, x: number): string {
  if (rank != null && level >= 3 && rank >= 80) return `또래 100명 중 ${101 - rank}번째로 높음`;
  if (level >= 2 && x >= 1.25) return `또래 평균의 ${xfmt(x)}배`;
  if (rank != null && level === 0) return `또래 100명 중 ${rank}번째로 낮음`;
  if (rank != null && level === 2) return `또래 100명 중 ${101 - rank}번째로 높은 쪽`;
  return '또래와 비슷';
}

/** 지금 값에서 한 가지만 건강한 값으로 바꿨을 때 줄어드는 정도(%p). 이유 칩 고르기에 쓴다 */
function drop(id: ItemId, i: Input, alt: Input): number {
  const a = byId(runAll(i))[id], b = byId(runAll(alt))[id];
  return a.value != null && b.value != null ? a.value - b.value : 0;
}

/** 이유 칩: 당뇨는 점수표(한국형 당뇨 선별점수) 항목 그대로, 고혈압·지방간은 '그것만 건강한 값이면 얼마나 낮아지는지' */
function chipsOf(id: ItemId, i: Input, value: number): Chip[] {
  const R = byId(runAll(i))[id], cut = i.sex === 'F' ? 85 : 90, cutIn = i.sex === 'F' ? 33 : 35, b = bmi(i), w = i.waistCm;
  const out: (Chip & { v: number })[] = [];
  if (id === 'dm' && R.score != null) {
    const s0 = (x: Input) => byId(runAll(x)).dm.score ?? 0, tot = R.score;
    const tail = `합계 ${tot}점 / 11점. 5점부터 혈당 검사를 권해요.`;
    const add = (t: string, v: number, why: string) => v > 0 && out.push({ t: `${t} +${v}`, tone: 'up', why: `${why} 그래서 +${v}점이에요. ${tail}`, v });
    add(`나이 ${i.age}`, tot - s0({ ...i, age: 30 }), `한국형 당뇨 선별점수는 35–44세 +2점, 45세 이상 +3점이에요.`);
    if (w != null) add(`허리 ${inch(w)}인치`, tot - s0({ ...i, waistCm: 60 }), `허리가 ${i.sex === 'F' ? '77' : '84'}cm 이상이면 +2점, ${i.sex === 'F' ? '84' : '90'}cm 이상이면 +3점이에요.`);
    add('가족력', tot - s0({ ...i, famDM: false }), '부모·형제 중 당뇨가 있으면 +1점이에요.');
    add('고혈압', tot - s0({ ...i, dx: { ...i.dx, htn: false }, bp: 'normal' }), '고혈압이 있으면 +1점이에요.');
    add('흡연', tot - s0({ ...i, smoke: 'never' }), '지금 담배를 피우면 +1점이에요.');
    add('술', tot - s0({ ...i, alcohol: 'none' }), '하루 평균 1잔 이상 마시면 +1점, 5잔 이상이면 +2점이에요.');
    if (w != null && tot - s0({ ...i, waistCm: 60 }) === 0) out.push({ t: `허리 ${inch(w)}인치`, tone: 'ok', why: `허리가 기준보다 가늘어서 점수가 없어요. ${tail}`, v: -1 });
    return out.sort((a, b2) => b2.v - a.v).slice(0, 3).map(({ v: _, ...c }) => c);
  }
  // 고혈압·지방간: 한 가지씩 건강한 값으로 바꿔 다시 계산
  const lever = (t: string, alt: Input | null, why: (d: number, after: number) => string) => {
    if (!alt) return;
    const d = drop(id, i, alt);
    if (d >= 0.5) out.push({ t, tone: 'up', why: why(d, value - d), v: d });
  };
  const healthyW = Math.round(22 * (i.heightCm / 100) ** 2);
  if (w != null && w >= cut) lever(`허리 ${inch(w)}인치`, { ...i, waistCm: cut - 6 }, (_, a) => `허리가 기준(${cutIn}인치)보다 ${inch(w) - cutIn}인치 커요. 다른 건 그대로 두고 허리만 기준 아래면 ${f1(value)}% → ${f1(a)}%로 계산돼요.`);
  if (b >= 23) lever(`BMI ${Math.round(b)}`, { ...i, weightKg: healthyW, waistCm: w == null ? null : Math.min(w, cut - 6) }, (_, a) => `키에 비해 몸무게가 많은 편이에요(BMI ${f1(b)}). 표준 체중(약 ${healthyW}kg)이면 ${f1(value)}% → ${f1(a)}%로 계산돼요.`);
  if (i.exercise === false) lever('운동 안 함', { ...i, exercise: true }, (_, a) => `주 2회·30분 운동을 하면 ${f1(value)}% → ${f1(a)}%로 계산돼요.`);
  if (i.alcohol !== 'none') lever('술', { ...i, alcohol: 'none' }, (_, a) => `술을 마시지 않으면 ${f1(value)}% → ${f1(a)}%로 계산돼요.`);
  if (i.dx.dm && id === 'nafld') out.push({ t: '당뇨', tone: 'up', why: '당뇨가 있으면 지방간 점수가 2점 올라가요.', v: 0.4 });
  if (!out.length) {
    if (w != null && w < cut) out.push({ t: `허리 ${inch(w)}인치`, tone: 'ok', why: `허리가 기준(${cutIn}인치)보다 가늘어요. 이 점이 위험을 낮춰요.`, v: 0 });
    if (b < 23 && b >= 18.5) out.push({ t: `BMI ${Math.round(b)}`, tone: 'ok', why: `키에 맞는 표준 체중이에요(BMI ${f1(b)}).`, v: 0 });
    if (i.exercise) out.push({ t: '운동함', tone: 'ok', why: '규칙적으로 운동해서 위험이 낮게 계산돼요.', v: 0 });
  }
  return out.sort((a, b2) => b2.v - a.v).slice(0, 3).map(({ v: _, ...c }) => c);
}

const CARE: Record<string, Chip> = {
  dm: { t: '매년 눈·콩팥·발 검사', tone: 'plain', why: '당뇨를 진단받았으면 진단 때부터 매년 눈(안저)·콩팥(eGFR·소변 알부민)·발 검사를 받아요.' },
  htn: { t: '집에서 혈압 재기', tone: 'plain', why: '아침·저녁으로 집에서 잰 혈압을 기록해 진료 때 가져가면 약 조절에 도움이 돼요.' },
  nafld: { t: '술 줄이기', tone: 'plain', why: '간에는 술을 줄이는 게 먼저예요.' },
};

export function overviewRows(i: Input): Row[] {
  const R = byId(runAll(i)), L = labOf(i);
  return ROW_IDS.map((id): Row => {
    const r = R[id], name = NAME[id];
    if (r.status === 'managed') return { id, name, kind: 'managed', level: null, word: '진단·관리 중', side: id === 'dm' ? '약 · 혈당 재기' : '약 · 정기 진료', chips: [CARE[id]], big: { n: '관리 중' }, sub: '진단받아 치료하고 있어요' };
    if (r.status === 'excluded') {
      const g = drinkOf(i)?.gramsPerWeek;
      return { id, name, kind: 'alert', level: 4, word: '간 검사 필요', side: '술 양이 지방간 점수 범위 밖', big: { n: g ? `${Math.round(g / 10) * 10}` : '5잔+', unit: g ? 'g / 주' : '/ 하루' }, sub: '술 양이 지방간 점수로 볼 수 있는 범위를 넘어요', num: { grams: g }, chips: [{ t: '간 수치 검사', tone: 'up', why: `지방간 점수는 술을 주 ${i.sex === 'M' ? '140' : '70'}g 이하로 마시는 사람으로 만든 도구예요. 그보다 많이 마시면 간 수치(AST·ALT·감마지티피) 검사로 확인해요.` }] };
    }
    if (r.status === 'criteria') {
      const side = id === 'dm' && L.glu != null ? `공복혈당 ${L.glu} (126 이상)` : id === 'htn' && L.sbp != null ? `검진 혈압 ${L.sbp}/${L.dbp} (140/90 이상)` : '측정값이 기준 이상';
      return { id, name, kind: 'alert', level: 4, word: '기준 이상', side, big: id === 'dm' && L.glu != null ? { n: String(L.glu), unit: 'mg/dL' } : id === 'htn' && L.sbp != null ? { n: `${L.sbp}/${L.dbp}`, unit: 'mmHg' } : { n: '확인' }, sub: side, chips: [{ t: '검진 수치', tone: 'up', why: '넣은 검진 수치가 기준을 넘어요. 한 번의 검사로 진단하지 않으니 다시 재거나 추가 검사를 받아요.' }] };
    }
    if (r.status === 'ok' && r.flags?.includes('GLU_PRE')) return { id, name, kind: 'gray', level: 2, word: '당뇨 전 단계', side: `공복혈당 ${L.glu} (100–125)`, big: { n: String(L.glu), unit: 'mg/dL' }, sub: '공복혈당 100–125는 당뇨 전 단계예요', chips: [{ t: '당화혈색소 확인', tone: 'plain', why: '공복혈당 100–125는 당뇨 전 단계예요. 당화혈색소 검사로 한 번 더 확인해요.' }] };
    if (r.status === 'ok' && r.range) {
      const lo = Math.round(r.range[0]), hi = Math.round(r.range[1]), pk = (v: number) => Math.min(4, Math.floor(v / 15));
      const tw = typicalWaist(i.sex, i.age, bmi(i)), ti = { ...i, waistCm: Math.round(tw) }, tr = byId(runAll(ti))[id], tc = tr.value != null ? cmpOf(id, tr, ti) : null;
      const guess = tc && tr.value != null ? levelOf(rankOf(id, i.sex, i.age, tr.value) ?? null, tc.x) : undefined;
      return { id, name, kind: 'range', level: null, word: '범위', side: '허리를 몰라 범위로', span: [pk(lo), pk(hi)], guess, big: { n: `${lo}–${hi}`, unit: '%' }, sub: `또래 평균 ${r.peer != null ? f1(r.peer) + '%' : '–'} · 허리를 넣으면 정확해져요`, num: { lo, hi, peer: r.peer ?? undefined },
        chips: [{ t: '허리 넣으면 정확해져요', tone: 'plain', why: '허리둘레를 모르면 가능한 범위로만 계산해요. 줄자로 배꼽 높이를 재서 넣어 보세요.', href: '#/info' }] };
    }
    const c = r.status === 'ok' && r.value != null ? cmpOf(id, r, i) : null;
    if (c && r.value != null) {
      const rank = rankOf(id, i.sex, i.age, r.value) ?? null, lv = levelOf(rank, c.x);
      return { id, name, kind: 'prob', level: lv, word: LEVEL_WORD[lv], side: sideOf(lv, rank, c.x), chips: chipsOf(id, i, r.value), big: { n: r.value < 0.1 ? '0.1' : f1(r.value), unit: '%' }, sub: `또래 평균 ${f1(c.peer)}%`, num: { me: r.value, peer: c.peer, rank } };
    }
    if (r.status === ('measured' as typeof r.status) || (id === 'htn' && L.sbp != null)) return { id, name, kind: 'gray', level: null, word: r.category ?? '검진 혈압 반영', side: L.sbp != null ? `검진 혈압 ${L.sbp}/${L.dbp}` : '', chips: [], big: L.sbp != null ? { n: `${L.sbp}/${L.dbp}`, unit: 'mmHg' } : { n: '–' }, sub: '검진 혈압으로 본 지금 상태' };
    return { id, name, kind: 'gray', level: null, word: '계산 대상 아님', side: r.notes?.[0]?.slice(0, 24) ?? '', chips: [], big: { n: '–' }, sub: r.notes?.[0] ?? '' };
  });
}

/** 상세 화면 '몸무게와 허리가 줄어든다면?': 한 가지만 건강한 값으로 바꿨을 때 가능성(%)이 얼마가 되는지 (다른 건 그대로).
 *  chipsOf 와 같은 기준값(허리 = 기준보다 6cm 아래, 몸무게 = BMI 22, 운동 = 주 2회, 술 = 안 마심).
 *  name = 무엇(몸무게), from → to = 지금 값 → 바꾼 값(92kg → 70kg), now → after = 가능성 % */
export interface Lever { key: 'weight' | 'waist' | 'exercise' | 'alcohol'; name: string; from: string; to: string; now: number; after: number }
export function leversOf(id: ItemId, i: Input): Lever[] {
  const r = byId(runAll(i))[id];
  if (r.status !== 'ok' || r.value == null) return [];
  const cut = i.sex === 'F' ? 85 : 90, cutIn = i.sex === 'F' ? 33 : 35, b = bmi(i), w = i.waistCm, now = r.value;
  const healthyW = Math.round(22 * (i.heightCm / 100) ** 2);
  const out: Lever[] = [];
  const lever = (key: Lever['key'], name: string, from: string, to: string, alt: Input) => { const d = drop(id, i, alt); if (d >= 0.5) out.push({ key, name, from, to, now, after: now - d }); };
  if (b >= 23) lever('weight', '몸무게', `${i.weightKg}kg`, `${healthyW}kg`, { ...i, weightKg: healthyW, waistCm: w == null ? null : Math.min(w, cut - 6) });
  if (w != null && w >= cut) lever('waist', '허리둘레', `${inch(w)}인치`, `${cutIn}인치 미만`, { ...i, waistCm: cut - 6 });
  if (i.exercise === false) lever('exercise', '운동', '안 함', '주 2회·30분', { ...i, exercise: true });
  if (i.alcohol !== 'none') lever('alcohol', '술', '지금처럼', '안 마심', { ...i, alcohol: 'none' });
  return out.slice(0, 3);   // 몸무게 → 허리 → 운동 → 술 순서 그대로
}
