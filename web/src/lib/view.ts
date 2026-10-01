// 화면에 보여줄 값 만들기. 계산은 engine 의 runAll()·whatIf() 호출 결과만 쓴다.
import { runAll, whatIf, type Input, type Result } from '../../../engine/src/engine.ts';
import { NAMES, BADGE, PROB_IDS, type ItemId } from './content.ts';

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
/** 챙겨볼 항목: strong = '먼저 챙겨볼 것' 카드에 올림 */
export function flagOf(r: Result): 'strong' | 'mild' | null {
  if (r.status === 'criteria') return 'strong';
  if (r.status !== 'ok') return null;
  if (r.unit === '%' && (r.ratioLabel === '높음' || r.ratioLabel === '매우 높음')) return 'strong';
  switch (r.id) {
    case 'obesity': return r.category !== '정상' || (r.flags || []).includes('복부비만') ? 'mild' : null;
    case 'isi': return r.category === '중등도' || r.category === '심함' ? 'strong' : r.category === '경계' ? 'mild' : null;
    case 'osa': return r.category === '고위험' ? 'strong' : r.category === '중위험' ? 'mild' : null;
    case 'gad': return r.category === '선별 양성' ? 'strong' : null;
    case 'gerd': return r.category === '가능성 높음' ? 'strong' : null;
    case 'diet': return r.category === '양호' ? null : 'mild';
  }
  return null;
}
export const statusText: Record<string, string> = { managed: '관리 중', criteria: '기준 해당', na: '대상 아님', excluded: '대상 아님', needs_input: '답하면 볼 수 있어요' };

/** % 항목 한 줄 요약 */
export function probLine(r: Result) {
  if (r.status === 'ok' && r.value != null) return { main: String(Math.round(r.value)), unit: '명', sub: `약 ${f1(r.value)}%` };
  if (r.status === 'ok' && r.range) return { main: `${Math.round(r.range[0])}–${Math.round(r.range[1])}`, unit: '명', sub: `약 ${r.range[0]}–${r.range[1]}% · 허리를 재면 좁혀져요` };
  return { main: '–', unit: '', sub: r.status === 'managed' ? '이미 진단받아 관리 중이에요' : r.status === 'criteria' ? '측정 혈압이 기준에 해당해요' : r.status === 'na' ? (r.notes?.[0] ?? '') : r.status === 'excluded' ? '이 도구의 대상이 아니에요' : '답하면 볼 수 있어요' };
}

export function viewResults(inp: Input, sc: Scenario) {
  const R = runAll(inp), by = byId(R);
  const W = hasScenario(sc) ? whatIf(inp, applyScenario(inp, sc)) : [];
  const improved = W.filter((w) => w.before != null && w.after != null && w.after < w.before);
  const lower = PROB_IDS.filter((id) => by[id].ratioLabel === '낮음').length;
  const flags = R.map((r) => ({ r, f: flagOf(r) })).filter((x) => x.f);
  const crisis = R.some((r) => (r.flags || []).includes('CRISIS'));
  const strong = flags.filter((x) => x.f === 'strong').map(({ r }) => {
    const id = r.id as ItemId;
    let what = r.unit === '%' && r.value != null ? `100명 중 약 ${Math.round(r.value)}명` : `${r.category ?? ''}${r.score != null ? ' · ' + r.score + '점' : ''}`;
    if (id === 'dep') what = `${r.category} · 100명 중 약 ${Math.round(r.value ?? 0)}명`;
    if (r.status === 'criteria') what = '측정 혈압이 고혈압 기준';
    return { id, name: NAMES[id], what };
  });
  const manage = W.filter((w) => ['dm', 'htn', 'nafld', 'chol'].includes(w.id) && w.before != null && w.after != null && w.after < w.before)
    .sort((a, b) => a.after! / a.before! - b.after! / b.before!).slice(0, 2)
    .map((w) => ({ id: w.id as ItemId, name: NAMES[w.id as ItemId], a: f1(w.before!), b: f1(w.after!) }));
  const rings = (['dm', 'htn', 'nafld'] as ItemId[]).map((id) => {
    const r = by[id];
    if (r.status !== 'ok' || r.value == null || !r.peer) return { id, name: NAMES[id], idx: '–', f: 0, label: statusText[r.status] ?? '범위', col: INK };
    const f = r.value / r.peer, st = ratioStyle(r.ratioLabel);
    return { id, name: NAMES[id], idx: String(Math.round(f * 100)), f: Math.min(1, f), label: r.ratioLabel!, col: st.col };
  });
  const vals: number[] = [];
  PROB_IDS.forEach((id) => { const r = by[id]; if (r.value != null) vals.push(r.value); if (r.range) vals.push(r.range[1]); if (r.peer) vals.push(r.peer); });
  const top = Math.max(30, Math.ceil((Math.max(...vals, 1) * 1.15) / 10) * 10);
  const prob = [...PROB_IDS, 'osteo' as ItemId].map((id) => {
    const r = by[id], st = ratioStyle(r.ratioLabel), pl = probLine(r);
    const v = r.value ?? (r.range ? r.range[1] : null);
    return { id, name: NAMES[id], badge: BADGE[r.type] + (id === 'dep' && r.category ? ' · ' + r.category : ''), status: r.status, ...pl,
      ok: r.status === 'ok' && v != null, pct: r.value != null ? f1(r.value) : r.range ? `${r.range[0]}–${r.range[1]}` : '–',
      peer: r.peer != null ? f1(r.peer) : '–', meW: v != null ? (v / top) * 100 : 0, peerX: r.peer != null ? (r.peer / top) * 100 : null,
      tag: r.ratioLabel ?? statusText[r.status] ?? '', tagBg: st.bg, tagFg: st.fg, barC: st.col };
  });
  const S = (id: ItemId, v: string, unit: string, frac: number, note: string) => {
    const r = by[id], fl = flagOf(r);
    return { id, name: NAMES[id], v, unit, frac: Math.max(0, Math.min(1, frac)), cat: r.status === 'ok' ? r.category ?? '–' : statusText[r.status], col: fl ? LOOK : INK, note, status: r.status };
  };
  const ob = by.obesity, isi = by.isi, dt = by.diet, osa = by.osa, gad = by.gad, gd = by.gerd;
  const score = [
    S('obesity', f1(ob.value!), 'BMI', (ob.value! - 15) / 20, ob.category === '정상' ? '정상 범위예요' : String(ob.notes?.[0] ?? '').replace('BMI 25 미만 체중: ', '') + '면 BMI 25 미만'),
    S('isi', isi.value == null ? '–' : String(isi.value), 'ISI / 28점', (isi.value ?? 0) / 28, isi.peer != null ? `동년배 약 ${isi.peer}%가 10점 이상` : '수면 질문에 답하면 볼 수 있어요'),
    S('diet', dt.value == null ? '–' : String(dt.value), '참고 지표 / 100', (dt.value ?? 0) / 100, dt.value == null ? '식생활 질문에 답하면 볼 수 있어요' : dt.flags?.length ? '보완할 점: ' + dt.flags.join(', ') : '골고루 잘 드시고 있어요'),
    S('osa', osa.value == null ? '–' : String(osa.value), 'STOP-Bang / 8점', (osa.value ?? 0) / 8, osa.value == null ? '수면 질문에 답하면 볼 수 있어요' : osa.category === '저위험' ? '낮을 때 안심하기 좋은 도구' : '높다고 확정은 아니에요'),
    S('gad', gad.value == null ? '–' : String(gad.value), 'GAD-2 / 6점', (gad.value ?? 0) / 6, gad.value == null ? '마음 질문에 답하면 볼 수 있어요' : gad.category === '선별 양성' ? '2주 넘게 이어지면 상담을 권해요' : '3점부터 자세히 봐요'),
    S('gerd', gd.value == null ? '–' : String(gd.value), 'GerdQ / 18점', (gd.value ?? 0) / 18, gd.status === 'needs_input' ? '소화 질문에 답하면 볼 수 있어요' : gd.value == null ? '성인 약 4~7%가 주 1회 이상 겪어요' : '증상이 계속되면 진료를 받아 보세요'),
  ];
  return { group: groupLabel(inp), who: `${inp.age}세 ${inp.sex === 'F' ? '여성' : '남성'} 기준`, lower, improvedN: improved.length,
    hasManage: improved.length > 0, look: flags.length, scenarioText: scenarioText(sc), manage, rings, prob, score, strong, crisis };
}

export const WI_META: Record<string, [string, string]> = { dm: ['숨은 당뇨', '%'], htn: ['고혈압', '%'], chol: ['고콜레스테롤', '%'], obesity: ['비만', 'BMI'], nafld: ['지방간', '%'], osa: ['수면무호흡', '점'] };
export function whatIfRows(inp: Input, after: Input) {
  const scale = (u: string, v: number | null) => v == null ? 0 : u === '%' ? Math.min(100, (v / 30) * 100) : u === 'BMI' ? Math.max(0, Math.min(100, ((v - 15) / 20) * 100)) : (v / 8) * 100;
  const fmt = (u: string, v: number | null) => (v == null ? '–' : u === '점' ? String(v) : v.toFixed(1));
  let down = 0, up = 0;
  const rows = whatIf(inp, after).map((x) => {
    const [name, u] = WI_META[x.id];
    const d = x.before == null || x.after == null ? 0 : Math.round((x.after - x.before) * 10) / 10;
    if (d < 0) down++; if (d > 0) up++;
    const du = u === '%' ? '%p' : u === '점' ? '점' : '';
    return { id: x.id, name, unit: u, b: fmt(u, x.before), a: fmt(u, x.after), na: x.before == null,
      delta: x.before == null ? '해당 없음' : d < 0 ? `−${u === '점' ? Math.abs(d) : f1(Math.abs(d))}${du}` : d > 0 ? `+${u === '점' ? d : f1(d)}${du}` : '그대로',
      tone: d < 0 ? 'down' : d > 0 ? 'up' : 'same', wB: scale(u, x.before), wA: scale(u, x.after) };
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
  // 동년배 곡선: 나이만 바꿔 runAll 을 다시 실행해 연령대별 동년배 값을 얻는다
  let bands: { l: string; v: number; mine: boolean }[] = [];
  if (['dm', 'htn', 'chol', 'obesity', 'dep'].includes(id)) {
    const ages = [25, 35, 45, 55, 65, 75], L = ['20대', '30대', '40대', '50대', '60대', '70+'];
    const mine = Math.min(5, Math.max(0, Math.floor(inp.age / 10) - 2));
    bands = ages.map((a, k) => ({ l: L[k], v: byId(runAll({ ...inp, age: a }))[id].peer ?? 0, mine: k === mine }));
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
  const st = ratioStyle(r.ratioLabel);
  return { r, rA, isProb, ok, n, m, people, removed: Math.max(0, n - m), afterV, bands, parts, group: groupLabel(inp),
    ratioTag: r.ratioLabel ? (r.ratioLabel === '비슷' ? '동년배와 비슷' : '동년배보다 ' + r.ratioLabel) : '', ratioBg: st.bg, ratioFg: st.fg,
    scenarioText: scenarioText(sc), crisis: (r.flags || []).includes('CRISIS') };
}

/** 기록 비교 */
export function viewRecord(prev: Input, cur: Input) {
  const P = byId(runAll(prev)), N = byId(runAll(cur));
  const ids: ItemId[] = ['nafld', 'htn', 'chol', 'dm', 'dep', 'osteo', 'obesity', 'isi', 'osa', 'gad', 'gerd', 'diet'];
  const rows: { id: ItemId; name: string; b: string; a: string; delta: string; better: boolean; y1: number; y2: number; why: string }[] = [];
  const same: string[] = []; let down = 0;
  ids.forEach((id) => {
    const a = P[id], b = N[id];
    const unit = b.unit === '%' ? '%' : b.unit === 'bmi' ? '' : '점';
    const fmt = (v: number) => (b.unit === 'score' ? v + '점' : f1(v) + unit);
    if (a.value == null || b.value == null) { same.push(`${NAMES[id]} ${b.status === 'ok' ? b.category ?? '–' : statusText[b.status]}`); return; }
    const d = Math.round((b.value - a.value) * 10) / 10;
    if (d === 0) { same.push(`${NAMES[id]} ${fmt(b.value)}`); return; }
    const better = id === 'diet' ? d > 0 : d < 0; if (better) down++;
    const max = b.unit === 'bmi' ? 20 : b.unit === '%' ? 30 : id === 'diet' ? 100 : id === 'isi' ? 28 : 18, base = b.unit === 'bmi' ? 15 : 0;
    const y = (v: number) => 24 - Math.min(1, (v - base) / max) * 20;
    rows.push({ id, name: NAMES[id] + (b.unit === 'bmi' ? ' (BMI)' : ''), b: fmt(a.value), a: fmt(b.value), y1: y(a.value), y2: y(b.value),
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
