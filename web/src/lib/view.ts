// 화면에 보여줄 값 만들기. 확률·점수 계산은 engine 의 runAll()·whatIf() 결과를 쓰고,
// 당뇨·고혈압·콜레스테롤·골다공증 확률은 실측 보정(engine/src/calibrate.ts, 국민건강영양조사 2022–2024)을 거친다.
// 또래 평균은 같은 성별·연령대에서 '진단받지 않은 사람'의 실측 비율이다. 엔진 식은 그대로.
import { runAll as engineRunAll, whatIf as engineWhatIf, ratioLabel, type Input, type Result } from '../../../engine/src/engine.ts';
import { drinkOf, type AppInput } from '../state.ts';
import type { Lab } from '../../../engine/src/extras.ts';
import { calibrate, peerOf, CAL_IDS, type CalId } from '../../../engine/src/calibrate.ts';
import { rankOf } from '../../../engine/src/percentile.ts';
import GM from '../../../engine/src/glucose_model.json';

/** 보정 전 엔진 값(개발자 모드에서 함께 보여준다) */
export type ViewResult = Result & { raw?: number; rawPeer?: number | null };
const isCal = (id: string): id is CalId => (CAL_IDS as string[]).includes(id);
function cal(r: Result, i: Input): ViewResult {
  if (!isCal(r.id) || r.status !== 'ok') return r;
  if (r.flags?.includes('GLU_MODEL')) return { ...r, peer: peerOf(r.id, i.sex, i.age) ?? r.peer };   // 이미 혈당 반영 모형으로 계산함
  const peer = peerOf(r.id, i.sex, i.age);
  return { ...r, raw: r.value ?? undefined, rawPeer: r.peer, value: r.value == null ? null : calibrate(r.id, r.value, i.sex, i.age),
    range: r.range ? [calibrate(r.id, r.range[0], i.sex, i.age), calibrate(r.id, r.range[1], i.sex, i.age)] : undefined, peer: peer ?? r.peer };
}

// ── 적용 범위 맞추기 (엔진 숫자는 그대로, 원 연구 대상이 아니면 보여주지 않는다) ──
/** 지방간 점수 원 연구(Lee 2014)는 주당 알코올 남 140g·여 70g 초과를 빼고 만들었다 */
export const NAFLD_ALC_MAX = { M: 140, F: 70 };
export const nafldOverAlcohol = (i: Input) => { const d = drinkOf(i); return !!d && d.gramsPerWeek > NAFLD_ALC_MAX[i.sex]; };
export const labOf = (i: Input): Lab => (i as AppInput).lab ?? {};
/** 공복혈당(126 미만) 반영 '현재 당뇨 가능성'(%): 규제 회귀 (analysis/scenarios/fit_glucose_final.ts) */
export function glucoseProb(pappPct: number, glu: number): number {
  const G = GM as { mu: number[]; sd: number[]; coef: number[] };
  const x = [Math.log(Math.min(0.995, Math.max(0.0005, pappPct / 100)) / (1 - Math.min(0.995, Math.max(0.0005, pappPct / 100)))), glu, Math.max(0, glu - 100), Math.max(0, glu - 110)];
  const z = G.coef[0] + x.reduce((a, v, k) => a + G.coef[k + 1] * ((v - G.mu[k]) / G.sd[k]), 0);
  return 100 / (1 + Math.exp(-z));
}
/** '현재 당뇨 가능성 추정 약 ○%' 문구용: 소수 한 자리, 0.1% 미만은 '추정 0.1% 미만' */
export const estText = (v: number) => (v < 0.1 ? '추정 0.1% 미만' : `추정 약 ${f1(v)}%`);
/** 확률 표시: 소수 한 자리, 0.1% 미만은 '0.1 미만' (0%라고 단정하지 않는다) */
export const pctText = (v: number) => (v < 0.1 ? '0.1 미만' : f1(v));
/** 'measured' = 검진 수치가 있어 추정 대신 실제 값을 보여주는 상태 (화면 전용) */
const MEASURED = 'measured' as Result['status'];
function fit(R: Result[], i: Input): Result[] {
  const L = labOf(i);
  return R.map((r): Result => {
    // 검진 수치가 있으면 추정보다 실제 수치가 우선
    if (r.id === 'dm' && L.glu != null && r.status !== 'managed') {
      if (L.glu >= 126) return { ...r, status: 'criteria', value: null, range: undefined, flags: [...(r.flags ?? []), 'MEASURED'],
        notes: [`검진 공복혈당 ${L.glu}mg/dL · 당뇨 기준(126 이상)에 해당하는 수치예요. 확인이 필요해요: 한 번의 검사로 진단하지 않으니 다른 날 다시 재거나 당화혈색소를 확인하고 진료를 받아 보세요.`] };
      // 공복혈당 126 미만: 앱 확률(혈당 미반영)과 연속 공복혈당을 함께 넣은 규제 회귀로 '현재 당뇨 가능성'을 다시 추정
      // (engine/src/glucose_model.json, 국민건강영양조사 2022–2024. 당화혈색소로만 당뇨인 경우가 있어 0이 되지 않는다)
      if (r.value == null) return r;
      const papp = calibrate('dm', r.value, i.sex, i.age), p = glucoseProb(papp, L.glu);
      return { ...r, value: p, range: undefined, flags: [...(r.flags ?? []), 'GLU_MODEL', L.glu >= 100 ? 'GLU_PRE' : 'GLU_OK'], raw: r.value, rawPeer: r.peer } as ViewResult;
    }
    // 혈압 숫자를 넣었고 고혈압 기준(140/90) 미만이면, '고혈압일 확률' 대신 측정값으로 지금 상태를 보여준다
    if (r.id === 'htn' && L.sbp != null && L.dbp != null && r.status === 'ok') {
      const s = L.sbp, d = L.dbp, band = s < 120 && d < 80 ? '정상' : s < 130 && d < 80 ? '주의혈압' : '고혈압 전단계';
      return { ...r, status: MEASURED, value: null, range: undefined, flags: [...(r.flags ?? []), 'MEASURED'],
        notes: [`검진 혈압 ${s}/${d} · 고혈압 기준(140/90) 미만, ${band}이에요(국민건강영양조사 정의). 한 번 잰 값이라 다른 날·집에서도 재 보세요.`] };
    }
    if (r.id === 'chol' && L.tc != null && r.status !== 'managed') {
      if (L.tc >= 240) return { ...r, status: 'criteria', value: null, range: undefined, flags: [...(r.flags ?? []), 'MEASURED'],
        notes: [`검진 총콜레스테롤 ${L.tc}mg/dL · 고콜레스테롤 기준(240 이상)이에요. 진료에서 LDL 등 자세한 수치를 확인하세요.`] };
      return { ...r, status: MEASURED, value: null, range: undefined, flags: [...(r.flags ?? []), 'MEASURED'],
        notes: [`검진 총콜레스테롤 ${L.tc}mg/dL · 기준(240) 미만이에요${L.tc >= 200 ? '. 200–239는 경계 범위라 관리가 필요해요' : ''}.`] };
    }
    if (r.id === 'nafld' && r.status !== 'excluded' && nafldOverAlcohol(i))
      return { ...r, status: 'excluded', value: null, range: undefined, flags: [...(r.flags ?? []), 'ALC_OVER_STUDY'] };
    // 우울: PHQ 점수로 'PHQ 10점 이상일 확률'을 다시 추정하지 않고 점수·선별 결과로 보여준다
    if (r.id === 'dep' && r.status === 'ok') return { ...r, unit: 'score', type: 'C', value: r.score ?? null };
    // 불면: 첫 질문 '아니요'는 ISI 0점이 아니라 '측정 안 함'
    if (r.id === 'isi' && r.status === 'ok' && i.sleep && !i.sleep.insGate) return { ...r, value: null, score: undefined, category: '불면 선별 음성' };
    return r;
  }).map((r) => cal(r, i));
}
export const runAll = (i: Input): ViewResult[] => fit(engineRunAll(i), i);
export const whatIf = (b: Input, a: Input) => engineWhatIf(b, a).map((w) => {
  if (w.id === 'nafld') return { ...w, before: nafldOverAlcohol(b) ? null : w.before, after: nafldOverAlcohol(a) ? null : w.after };
  // 검진 혈당·혈압을 넣었으면 모형 확률 대신 측정 결과를 쓰므로, 체중·허리를 바꿔도 같은 값이라 비교에서 뺀다
  if ((w.id === 'dm' && labOf(b).glu != null) || (w.id === 'htn' && labOf(b).sbp != null)) return { ...w, before: null, after: null };
  if (isCal(w.id)) return { ...w, before: w.before == null ? null : calibrate(w.id, w.before, b.sex, b.age), after: w.after == null ? null : calibrate(w.id, w.after, a.sex, a.age) };
  return w;
});
import { NAMES, TITLE, BADGE, PROB_IDS, MEANING, PEER_NOTE, ACTION, MANAGED, EXCLUDED_NAFLD, EXCLUDED_NAFLD_STUDY, CRITERIA_HTN, type ItemId } from './content.ts';

export type Scenario = { weightKg: number; waistCm: number };
export const INK = '#163300', LOOK = '#0b4c72', LOW_BG = '#e2f6d5', SAME_BG = '#f2f4f0', HIGH_BG = '#dfeaf1';
export const f1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
export const byId = (list: Result[]) => Object.fromEntries(list.map((r) => [r.id, r])) as Record<ItemId, Result>;
export const hasScenario = (s: Scenario) => !!(s.weightKg || s.waistCm);
export function applyScenario(i: Input, s: Scenario): Input {
  return { ...i, weightKg: Math.round((i.weightKg + s.weightKg) * 10) / 10, waistCm: i.waistCm == null ? null : Math.round((i.waistCm + s.waistCm) * 10) / 10 };
}
export function scenarioText(s: Scenario) {
  const p: string[] = [];
  if (s.waistCm) p.push(`허리 ${s.waistCm > 0 ? '+' : '−'}${Math.abs(s.waistCm)}cm`);
  if (s.weightKg) p.push(`체중 ${s.weightKg > 0 ? '+' : '−'}${Math.abs(s.weightKg)}kg`);
  return p.join(' · ');
}
export function groupLabel(i: Input) {
  const d = Math.min(70, Math.max(20, Math.floor(i.age / 10) * 10));
  return `${d === 70 ? '70대 이상' : d + '대'} ${i.sex === 'F' ? '여성' : '남성'}`;
}
export function ratioStyle(label?: string) {
  return label === '낮음' ? { bg: LOW_BG, fg: INK, col: INK } : label === '비슷' || !label ? { bg: SAME_BG, fg: INK, col: INK } : { bg: HIGH_BG, fg: LOOK, col: LOOK };
}
export const statusText: Record<string, string> = { managed: '진단받아 관리 중', criteria: '측정 수치가 기준 해당', measured: '검진 수치 반영', na: '대상 아님', excluded: '술 때문에 계산 안 함', needs_input: '답하면 볼 수 있어요' };
const xfmt = (x: number) => (x < 0.1 ? x.toFixed(2) : (Math.round(x * 10) / 10).toFixed(1));

/** 또래 비교: 같은 기준의 또래 값, 몇 배인지, 낮음/비슷/높음, 한 줄 결론, 다음 행동 */
export function cmpOf(id: ItemId, r: Result, inp: Input) {
  if (r.status !== 'ok' || r.unit !== '%' || r.value == null || r.peer == null) return null;
  const grp = groupLabel(inp);
  const peer = r.peer;
  let who = `${grp} 평균`, note = PEER_NOTE[id] ?? '';
  if (isCal(id)) {
    who = `${grp} 중 진단받지 않은 사람`;
    note = '국민건강영양조사(2022–2024)에서 아직 진단받지 않은 같은 또래가 실제로 검사에서 기준에 해당한 비율이에요.';
  }
  if (id === 'nafld') who = `성인 ${inp.sex === 'F' ? '여성' : '남성'} 평균`;
  const x = r.value / peer, label = ratioLabel(r.value, peer);
  const high = label === '높음' || label === '매우 높음';
  const headline = label === '낮음' ? `또래의 약 ${xfmt(x)}배로 낮아요` : label === '비슷' ? '또래와 비슷해요' : `또래의 약 ${xfmt(x)}배예요`;
  return { me: r.value, peer, x, label, high, who, note, headline, action: high ? ACTION[id] ?? '' : '', ...ratioStyle(label) };
}

/** 챙겨볼 항목: strong = '먼저 확인할 것', mild = 점수로 챙겨볼 것 */
export function flagOf(r: Result, inp: Input): 'strong' | 'mild' | null {
  if (r.status === 'criteria' || r.status === 'excluded') return 'strong';
  if (r.status !== 'ok') return null;
  if (r.unit === '%') return cmpOf(r.id as ItemId, r, inp)?.high ? 'strong' : null;
  switch (r.id) {
    case 'obesity': return r.category !== '정상' || (r.flags || []).includes('복부비만') ? 'mild' : null;
    case 'isi': return r.category === '중등도' || r.category === '심함' ? 'strong' : r.category === '경계' ? 'mild' : null;
    case 'osa': return r.category === '고위험' ? 'strong' : r.category === '중위험' ? 'mild' : null;
    case 'gad': return r.category === '선별 양성' ? 'strong' : null;
    case 'dep': return r.category === 'PHQ-2 양성' || (r.score ?? 0) >= 10 ? 'strong' : null;
    case 'gerd': return r.category === '가능성 높음' ? 'strong' : null;
    case 'diet': return r.category === '양호' ? null : 'mild';
  }
  return null;
}

/** 확률이 없는 상태의 안내 문구 */
export function statusNote(id: ItemId, r: Result, inp?: Input) {
  if (r.status === 'managed') return MANAGED[id] ?? '이미 진단받아 관리 중이에요.';
  if (r.status === 'excluded') return id === 'nafld' ? (r.flags?.includes('ALC_OVER_STUDY') ? EXCLUDED_NAFLD_STUDY(inp?.sex ?? 'M') : EXCLUDED_NAFLD) : r.notes?.[0] ?? '';
  if (r.status === 'criteria') return r.flags?.includes('MEASURED') ? r.notes?.[0] ?? '' : CRITERIA_HTN;
  if (r.status === MEASURED) return r.notes?.[0] ?? '';
  if (r.status === 'na') return r.notes?.[0] ?? '';
  if (r.status === 'needs_input') return '관련 질문에 답하면 볼 수 있어요.';
  if (r.range) return `허리둘레 등 일부를 몰라 약 ${r.range[0]}–${r.range[1]}% 범위로 보여드려요.`;
  return '';
}

/** 공복혈당을 넣었을 때의 설명: 측정 구간 + 같은 구간 실측 비율. 공복혈당만으로 당뇨를 배제하지 않는다 */
export function glucoseNote(id: string, r: Result, inp: Input) {
  if (id !== 'dm' || r.status !== 'ok' || !r.flags?.includes('GLU_MODEL') || r.value == null) return '';
  const g = labOf(inp).glu, est = `현재 당뇨 가능성 ${estText(r.value)}`;
  return r.flags.includes('GLU_PRE')
    ? `${est} · 검진 공복혈당 ${g}mg/dL은 공복혈당장애(100–125)예요. 당화혈색소 검사로 추가 확인하세요.`
    : `${est} · 검진 공복혈당 ${g}mg/dL은 정상 범위(100 미만)예요. 당뇨는 당화혈색소로도 진단해서 공복혈당만으로 없다고 할 수는 없어요.`;
}

/** 또래 비교와 별개인 검진 권고 (공식 기준). '또래와 비슷·낮음'이 '검사 안 해도 됨'으로 읽히지 않게 항상 따로 보여준다 */
export function screenAdvice(id: string, inp: Input, r?: Result): string {
  const a = inp.age, F = inp.sex === 'F', bmi = inp.weightKg / (inp.heightCm / 100) ** 2, L = labOf(inp);
  if (r?.status === 'managed') return '';
  switch (id) {
    case 'dm': {
      if (L.glu != null) return '검진: 공복혈당은 반영했어요. 당화혈색소도 함께 확인하면 더 정확해요.';
      const risk = bmi >= 23 || (inp.waistCm != null && inp.waistCm >= (F ? 85 : 90)) || inp.famDM || inp.dx.htn || inp.bp === 'high' || inp.dx.chol || inp.exercise === false;
      return a >= 35 || risk ? `검진: ${a >= 35 ? '35세 이상' : '위험요인이 있으면 19세 이상'}은 매년 공복혈당·당화혈색소 검사를 권해요(대한당뇨병학회).`
        : '검진: 일반건강검진(2년마다)의 공복혈당으로 확인해요.';
    }
    case 'htn': return L.sbp != null ? '' : '검진: 일반건강검진(2년마다)에서 혈압을 재요. 집에서도 가끔 재 보세요.';
    case 'chol': return L.tc != null ? '' : (a >= 24 && !F) || (a >= 40 && F)
      ? '검진: 콜레스테롤은 혈액검사로만 알 수 있어요. 국가검진에서 4년마다 받을 수 있어요.' : `검진: ${F ? '여성 40세' : '남성 24세'}부터 4년마다 콜레스테롤 혈액검사를 받아요(국가검진).`;
    case 'nafld': return '검진: 일반건강검진의 간 수치(AST·ALT·감마지티피)로 함께 확인해요.';
    case 'osteo':
      if ((F && a >= 65) || (!F && a >= 70)) return `검진: ${F ? '65세 이상 여성' : '70세 이상 남성'}은 골밀도 검사 대상이에요(건강보험 급여기준).`;
      if (F && [54, 60, 66].includes(a)) return `검진: ${a}세 여성 국가검진에 골밀도 검사가 있어요.`;
      if (F && inp.meno) return '검진: 폐경 후 저체중·골절 경험·40세 전 폐경이 있으면 골밀도 검사 대상이에요(건강보험 급여기준).';
      return a >= 50 ? '검진: 골절 경험 등 위험요인이 있으면 골밀도 검사를 상담해 보세요.' : '';
  }
  return '';
}

export function viewResults(inp: Input, sc: Scenario) {
  const R = runAll(inp), by = byId(R);
  const W = hasScenario(sc) ? whatIf(inp, applyScenario(inp, sc)) : [];
  const improvedW = W.filter((w) => w.before != null && w.after != null && w.after < w.before);
  const crisis = R.some((r) => (r.flags || []).includes('CRISIS'));
  const cmp = Object.fromEntries(R.map((r) => [r.id, cmpOf(r.id as ItemId, r, inp)])) as Record<ItemId, ReturnType<typeof cmpOf>>;

  // ── 묶음 ──
  const diagnosed = R.filter((r) => r.status === 'managed').map((r) => ({ id: r.id as ItemId, name: NAMES[r.id as ItemId] }));
  /** 먼저 확인할 것. tag = 오른쪽 짧은 표시(배수·등급), big = 상단 큰 결론 */
  type First = { id: ItemId; name: string; short: string; line: string; action: string; tag: string; big: string; c: ReturnType<typeof cmpOf> };
  const first: First[] = [];
  if (by.nafld.status === 'excluded') first.push(by.nafld.flags?.includes('ALC_OVER_STUDY')
    ? { id: 'nafld', name: '간', short: '간', line: `술이 주 ${NAFLD_ALC_MAX[inp.sex]}g을 넘어 지방간 점수로는 판단하지 않아요`, action: '간 수치(AST·ALT·감마지티피) 검사로 간 상태를 확인해 보세요.', tag: '음주', big: '간 수치 검사로 확인해요', c: null }
    : { id: 'nafld', name: '간', short: '간', line: '술을 하루 평균 5잔 이상 드셔서 지방간 점수로는 판단할 수 없어요', action: '간 수치 검사로 술 때문에 간이 상했는지 확인해 보세요.', tag: '과음', big: '간 검사가 필요해요', c: null });
  const L = labOf(inp);
  if (by.htn.status === 'criteria') first.push({ id: 'htn', name: '고혈압', short: '고혈압', line: L.sbp != null ? `검진 혈압 ${L.sbp}/${L.dbp} · 고혈압 기준(140/90 이상)이에요` : '측정 혈압이 고혈압 기준(140/90 이상)이에요', action: '며칠에 걸쳐 다시 재 보고 진료를 받아 보세요.', tag: '기준 이상', big: '혈압이 고혈압 기준이에요', c: null });
  if (by.dm.status === 'criteria') first.push({ id: 'dm', name: '혈당', short: '혈당', line: `검진 공복혈당 ${L.glu}mg/dL · 당뇨 기준(126 이상)이에요`, action: '다른 날 다시 재거나 당화혈색소를 확인하고 진료를 받아 보세요.', tag: '확인 필요', big: '당뇨 기준에 해당하는 수치, 확인 필요', c: null });
  if (by.chol.status === 'criteria') first.push({ id: 'chol', name: '콜레스테롤', short: '고콜레스테롤', line: `검진 총콜레스테롤 ${L.tc}mg/dL · 기준(240 이상)이에요`, action: '진료에서 LDL 등 자세한 수치를 확인하세요.', tag: '기준 이상', big: '총콜레스테롤이 기준 이상이에요', c: null });
  // 공복혈당 전단계(100–125)는 또래 비교와 관계없이 당화혈색소 확인을 먼저 안내
  const gluPre = by.dm.status !== 'criteria' && by.dm.flags?.includes('GLU_PRE');
  if (gluPre) first.push({ id: 'dm', name: '혈당', short: '혈당', line: `검진 공복혈당 ${L.glu}mg/dL · 공복혈당장애(100–125) · 현재 당뇨 가능성 ${by.dm.value != null ? estText(by.dm.value) : ''}`, action: '당화혈색소 검사로 추가 확인하세요. 매년 혈당을 확인하는 게 좋아요.', tag: '공복혈당장애', big: '공복혈당장애예요 · 추가 확인 필요', c: null });
  [...PROB_IDS, 'osteo' as ItemId].forEach((id) => {
    const c = cmp[id]; if (!c?.high || (id === 'dm' && gluPre)) return;
    first.push({ id, name: TITLE[id], short: NAMES[id], line: `${f1(c.me)}% · ${c.headline} (${c.who} ${id === 'dm' ? '약 ' : ''}${f1(c.peer)}%)`, action: c.action, tag: `${xfmt(c.x)}배`, big: c.headline, c });
  });
  R.filter((r) => r.unit !== '%' && flagOf(r, inp) === 'strong').forEach((r) => {
    const id = r.id as ItemId;
    first.push({ id, name: NAMES[id], short: NAMES[id], line: `${r.category}${r.score != null ? ` · ${r.score}점` : ''}`, action: ACTION[id] ?? '', tag: r.category ?? '', big: `${NAMES[id]} ${r.category}`, c: null });
  });
  // 상단 대표: 신체 항목(당뇨·고혈압·콜레스테롤·간·골다공증)을 먼저, 그 안에서 또래 대비 배수가 큰 것.
  // 신체 항목이 없을 때만 마음·수면·소화 항목이 올라간다.
  const BODY: ItemId[] = ['dm', 'htn', 'chol', 'nafld', 'osteo'];
  const rank = (f: First) => (BODY.includes(f.id) ? 0 : 2) + (f.c ? 0 : 1);
  first.sort((a, b) => rank(a) - rank(b) || (b.c?.x ?? 0) - (a.c?.x ?? 0));
  const hero = first[0] ?? null;
  const others = first.slice(1);
  const names = (f: (c: NonNullable<ReturnType<typeof cmpOf>>) => boolean) => PROB_IDS.filter((id) => cmp[id] && f(cmp[id]!)).map((id) => ({ id, name: NAMES[id] }));
  const low = names((c) => c.label === '낮음'), same = names((c) => c.label === '비슷');
  const watch = R.filter((r) => r.unit !== '%' && flagOf(r, inp) === 'mild').map((r) => ({ id: r.id as ItemId, name: `${NAMES[r.id as ItemId]}(${r.category})` }));
  const manage = improvedW.filter((w) => ['dm', 'htn', 'nafld', 'chol'].includes(w.id))
    .sort((a, b) => a.after! / a.before! - b.after! / b.before!)
    .map((w) => ({ id: w.id as ItemId, name: TITLE[w.id as ItemId], a: f1(w.before!), b: f1(w.after!) }));
  const improved = improvedW.map((w) => ({ id: w.id as ItemId, name: NAMES[w.id as ItemId] }));

  // ── 링: 같은 기준 또래 평균을 100으로 ──
  const rings = (['dm', 'htn', 'nafld'] as ItemId[]).map((id) => {
    const c = cmp[id], r = by[id];
    if (!c) return { id, name: NAMES[id], idx: '–', f: 0, label: statusText[r.status] ?? '범위', col: r.status === 'excluded' || r.status === 'criteria' ? LOOK : INK };
    return { id, name: NAMES[id], idx: `${xfmt(c.x)}배`, f: Math.min(1, c.x / 2), label: c.label, col: c.col };
  });

  // ── % 카드 ──
  const vals: number[] = [];
  [...PROB_IDS, 'osteo' as ItemId].forEach((id) => { const r = by[id], c = cmp[id]; if (r.value != null) vals.push(r.value); if (r.range) vals.push(r.range[1]); if (c) vals.push(c.peer); });
  const top = Math.max(30, Math.ceil((Math.max(...vals, 1) * 1.15) / 10) * 10);
  const prob = [...PROB_IDS, 'osteo' as ItemId].map((id) => {
    const r = by[id], c = cmp[id];
    const v = r.value ?? (r.range ? r.range[1] : null);
    return { id, title: TITLE[id], badge: BADGE[r.type] + (id === 'dep' && r.category ? ' · ' + r.category : ''), status: r.status, meaning: MEANING[id] ?? '',
      pct: r.value != null ? pctText(r.value) : r.range ? `${r.range[0]}–${r.range[1]}` : '–', n: r.value != null ? Math.round(r.value) : null,
      cmp: c, peerTxt: c ? `${id === 'dm' ? '약 ' : ''}${f1(c.peer)}` : '', meW: v != null ? (v / top) * 100 : 0, peerW: c ? (c.peer / top) * 100 : 0,
      note: statusNote(id, r, inp), tone: r.status === 'excluded' || r.status === 'criteria' ? 'look' : r.status === 'managed' ? 'managed' : 'plain',
      raw: (r as ViewResult).raw, rawPeer: (r as ViewResult).rawPeer,
      // 검진 수치가 있지만 기준 미만인 경우: 확률 옆에 실제 수치를 함께
      measured: glucoseNote(id, r, inp), screen: screenAdvice(id, inp, r) };
  });

  // ── 점수 카드 ──
  const S = (id: ItemId, v: string, unit: string, frac: number, note: string) => {
    const r = by[id], fl = flagOf(r, inp);
    return { id, name: NAMES[id], v, unit, frac: Math.max(0, Math.min(1, frac)), cat: r.status === 'ok' ? r.category ?? '–' : statusText[r.status], col: fl ? LOOK : INK, note, status: r.status };
  };
  const ob = by.obesity, isi = by.isi, dt = by.diet, osa = by.osa, gad = by.gad, gd = by.gerd, dp = by.dep;
  const phqMax = inp.mind?.phq.length === 9 ? 27 : 6;
  const score = [
    S('obesity', f1(ob.value!), 'BMI', (ob.value! - 15) / 20, ob.category === '정상' ? '정상 범위예요' : String(ob.notes?.[0] ?? '').replace('BMI 25 미만 체중: ', '') + '면 BMI 25 미만'),
    S('dep', dp.value == null ? '–' : String(dp.value), `${phqMax === 27 ? 'PHQ-9' : 'PHQ-2'} / ${phqMax}점`, (dp.value ?? 0) / phqMax, dp.status === 'needs_input' ? '마음 질문에 답하면 볼 수 있어요' : dp.peer != null ? `또래 약 ${f1(dp.peer)}%가 PHQ-9 10점 이상` : ''),
    S('isi', isi.value == null ? '–' : String(isi.value), 'ISI / 28점', (isi.value ?? 0) / 28, isi.status === 'ok' && isi.value == null ? '첫 질문에서 불면 없음 · 7문항 점수는 재지 않았어요' : isi.peer != null ? `또래 약 ${isi.peer}%가 10점 이상` : '수면 질문에 답하면 볼 수 있어요'),
    S('diet', dt.value == null ? '–' : String(dt.value), '참고 지표 / 100', (dt.value ?? 0) / 100, dt.value == null ? '식생활 질문에 답하면 볼 수 있어요' : dt.flags?.length ? '보완할 점: ' + dt.flags.join(', ') : '골고루 잘 드시고 있어요'),
    S('osa', osa.value == null ? '–' : String(osa.value), 'STOP-Bang / 8점', (osa.value ?? 0) / 8, osa.value == null ? '수면 질문에 답하면 볼 수 있어요' : osa.category === '저위험' ? '낮을 때 안심하기 좋은 도구' : '높다고 확정은 아니에요'),
    S('gad', gad.value == null ? '–' : String(gad.value), 'GAD-2 / 6점', (gad.value ?? 0) / 6, gad.value == null ? '마음 질문에 답하면 볼 수 있어요' : gad.category === '선별 양성' ? '2주 넘게 이어지면 상담을 권해요' : '3점부터 자세히 봐요'),
    S('gerd', gd.value == null ? '–' : String(gd.value), 'GerdQ / 18점', (gd.value ?? 0) / 18, gd.status === 'needs_input' ? '소화 질문에 답하면 볼 수 있어요' : gd.value == null ? '성인 약 4~7%가 주 1회 이상 겪어요' : '증상이 계속되면 진료를 받아 보세요'),
  ];
  return { group: groupLabel(inp), who: `${inp.age}세 ${inp.sex === 'F' ? '여성' : '남성'}`, scenarioText: scenarioText(sc),
    diagnosed, first, hero, others, low, same, watch, improved, manage, best: manage[0] ?? null, hasManage: improved.length > 0,
    rings, prob, score, crisis };
}

export const WI_META: Record<string, [string, string]> = { dm: ['이미 당뇨일 확률', '%'], htn: ['고혈압', '%'], chol: ['고콜레스테롤', '%'], obesity: ['비만', 'BMI'], nafld: ['지방간', '%'], osa: ['수면무호흡', '점'] };
export function whatIfRows(inp: Input, after: Input) {
  const by = byId(runAll(inp)), byA = byId(runAll(after));
  const scale = (u: string, v: number | null) => v == null ? 0 : u === '%' ? Math.min(100, (v / 30) * 100) : u === 'BMI' ? Math.max(0, Math.min(100, ((v - 15) / 20) * 100)) : (v / 8) * 100;
  const fmt = (u: string, v: number | null) => (v == null ? '–' : u === '점' ? String(v) : v.toFixed(1));
  let down = 0, up = 0;
  const rows = whatIf(inp, after).map((x) => {
    const [name, u] = WI_META[x.id];
    const d = x.before == null || x.after == null ? 0 : Math.round((x.after - x.before) * 10) / 10;
    if (d < 0) down++; if (d > 0) up++;
    const du = u === '%' ? '%p' : u === '점' ? '점' : '';
    // 확률이 없는 경우: 진단받음 / 술 때문에 계산 안 함 등을 그대로 알려준다 (바꾼 뒤 계산 가능해지면 그 값을 보여줌)
    const st = by[x.id as ItemId].status, stA = byA[x.id as ItemId]?.status;
    const measuredLab = (x.id === 'dm' && labOf(inp).glu != null) || (x.id === 'htn' && labOf(inp).sbp != null);
    const naText = measuredLab && st !== 'managed' ? '검진 수치 반영' : statusText[st] ?? '해당 없음';
    return { id: x.id, name, unit: u, b: fmt(u, x.before), a: fmt(u, x.after), na: x.before == null,
      delta: x.before == null ? (x.after != null && stA === 'ok' ? '계산 가능해짐' : naText) : d < 0 ? `−${u === '점' ? Math.abs(d) : f1(Math.abs(d))}${du}` : d > 0 ? `+${u === '점' ? d : f1(d)}${du}` : '그대로',
      tone: x.before == null ? 'na' : d < 0 ? 'down' : d > 0 ? 'up' : 'same', wB: scale(u, x.before), wA: scale(u, x.after) };
  });
  return { rows, down, up };
}

/** 항목 상세 */
export function viewDetail(id: ItemId, inp: Input, sc: Scenario) {
  const R = byId(runAll(inp)), r = R[id];
  const after = hasScenario(sc) ? applyScenario(inp, sc) : inp, rA = byId(runAll(after))[id];
  const isProb = r.unit === '%';
  const ok = r.status === 'ok' && r.value != null;
  const n = ok && isProb ? Math.round(r.value!) : 0;
  const inWhatIf = ['dm', 'htn', 'chol', 'obesity', 'nafld', 'osa'].includes(id);
  let afterV: number | null = null;
  if (inWhatIf && hasScenario(sc) && ok) afterV = whatIf(inp, after).find((w) => w.id === id)?.after ?? null;
  const m = afterV != null && isProb ? Math.round(afterV) : n;
  const people = Array.from({ length: 100 }, (_, k) => (k < Math.min(n, m) ? 'keep' : k < n ? 'gone' : 'rest'));
  // 또래 곡선: 나이만 바꿔 runAll 을 다시 실행해 연령대별 또래 값을 얻는다 (당뇨는 같은 기준으로 환산)
  let bands: { l: string; v: number; mine: boolean }[] = [];
  if (['dm', 'htn', 'chol', 'obesity'].includes(id)) {
    const ages = [25, 35, 45, 55, 65, 75], L = ['20대', '30대', '40대', '50대', '60대', '70+'];
    const mine = Math.min(5, Math.max(0, Math.floor(inp.age / 10) - 2));
    bands = ages.map((a, k) => ({ l: L[k], v: (isCal(id) ? peerOf(id, inp.sex, a) : byId(runAll({ ...inp, age: a }))[id].peer) ?? 0, mine: k === mine }));
  }
  // 당뇨 점수 내역: 요인 하나씩 빼고 runAll 을 다시 실행한 차이
  let parts: { k: string; v: number }[] = [];
  if (id === 'dm' && r.score != null) {
    const s0 = (x: Input) => byId(runAll(x)).dm.score ?? 0, total = r.score;
    parts = [
      [`나이 ${inp.age}세`, total - s0({ ...inp, age: 30 })],
      [`허리둘레 ${inp.waistCm}cm`, total - s0({ ...inp, waistCm: 60 })],
      ['부모·형제 당뇨', total - s0({ ...inp, famDM: false })],
      ['고혈압', total - s0({ ...inp, dx: { ...inp.dx, htn: false }, bp: 'normal' })],
      ['현재 흡연', total - s0({ ...inp, smoke: 'never' })],
      ['음주', total - s0({ ...inp, alcohol: 'none' })],
    ].map(([k, v]) => ({ k: k as string, v: v as number }));
  }
  const c = cmpOf(id, r, inp);
  return { r, rA, isProb, ok, n, m, people, removed: Math.max(0, n - m), afterV, bands, parts, group: groupLabel(inp), cmp: c,
    ratioTag: c ? (c.label === '비슷' ? '또래와 비슷' : '또래보다 ' + c.label) : r.status !== 'ok' ? statusText[r.status] : '',
    ratioBg: c?.bg ?? (r.status === 'excluded' || r.status === 'criteria' ? HIGH_BG : SAME_BG), ratioFg: c?.fg ?? (r.status === 'excluded' || r.status === 'criteria' ? LOOK : INK),
    rank: ok && isProb ? rankOf(id, inp.sex, inp.age, r.value!) : null,
    measured: glucoseNote(id, r, inp), screen: screenAdvice(id, inp, r),
    statusNote: statusNote(id, r, inp), scenarioText: scenarioText(sc), crisis: (r.flags || []).includes('CRISIS') };
}

/** 기록 비교 */
export function viewRecord(prev: Input, cur: Input) {
  const Pv = byId(runAll(prev)), N = byId(runAll(cur));
  const ids: ItemId[] = ['nafld', 'htn', 'chol', 'dm', 'dep', 'osteo', 'obesity', 'isi', 'osa', 'gad', 'gerd', 'diet'];
  const rows: { id: ItemId; name: string; b: string; a: string; delta: string; better: boolean; y1: number; y2: number; why: string }[] = [];
  const same: string[] = []; let down = 0;
  ids.forEach((id) => {
    const a = Pv[id], b = N[id];
    const unit = b.unit === '%' ? '%' : b.unit === 'bmi' ? '' : '점';
    const fmt = (v: number) => (b.unit === 'score' ? v + '점' : f1(v) + unit);
    if (a.value == null || b.value == null) { same.push(`${TITLE[id]} ${b.status === 'ok' ? b.category ?? '–' : statusText[b.status]}`); return; }
    const d = Math.round((b.value - a.value) * 10) / 10;
    if (d === 0) { same.push(`${TITLE[id]} ${fmt(b.value)}`); return; }
    const better = id === 'diet' ? d > 0 : d < 0; if (better) down++;
    const max = b.unit === 'bmi' ? 20 : b.unit === '%' ? 30 : id === 'diet' ? 100 : id === 'isi' || id === 'dep' ? 28 : 18, base = b.unit === 'bmi' ? 15 : 0;
    const y = (v: number) => 24 - Math.min(1, (v - base) / max) * 20;
    rows.push({ id, name: TITLE[id] + (b.unit === 'bmi' ? ' (BMI)' : ''), b: fmt(a.value), a: fmt(b.value), y1: y(a.value), y2: y(b.value),
      delta: (d > 0 ? '+' : '−') + (b.unit === 'score' ? Math.abs(d) + '점' : f1(Math.abs(d)) + (b.unit === '%' ? '%p' : '')), better,
      why: a.category && b.category && a.category !== b.category ? `${a.category} → ${b.category}` : '' });
  });
  const dl = (v: number) => { v = Math.round(v * 10) / 10; return v === 0 ? '그대로' : (v > 0 ? '+' : '−') + Math.abs(v); };
  const habits: string[] = [];
  if (cur.exercise !== prev.exercise) habits.push(cur.exercise ? '운동을 시작했어요' : '운동을 쉬었어요');
  if (cur.smoke !== prev.smoke) habits.push(cur.smoke === 'current' ? '흡연' : '금연했어요');
  if (cur.alcohol !== prev.alcohol) habits.push('음주 습관이 바뀌었어요');
  return { rows, same, down,
    weight: { v: dl(cur.weightKg - prev.weightKg) + (cur.weightKg !== prev.weightKg ? 'kg' : ''), s: `${prev.weightKg} → ${cur.weightKg}` },
    waist: cur.waistCm != null && prev.waistCm != null ? { v: dl(cur.waistCm - prev.waistCm) + (cur.waistCm !== prev.waistCm ? 'cm' : ''), s: `${prev.waistCm} → ${cur.waistCm}` } : { v: '–', s: '허리 모름' },
    habit: habits.join(' · ') || '생활습관은 그대로예요' };
}
