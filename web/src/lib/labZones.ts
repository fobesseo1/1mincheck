/**
 * 검진 풀이 (v2): 검진 결과지 숫자 하나당 '어느 구간인지 · 무슨 뜻인지 · 할 일 하나'.
 * 확률이 아니라 공식 기준 구간이다. 앱의 다른 화면(view.ts·verdict.ts)과 같은 기준을 쓴다.
 *  - 혈압: 대한고혈압학회 2022 고혈압 진료지침 (정상 <120/<80, 주의 120–129/<80, 고혈압 전단계 130–139/80–89, 고혈압 ≥140/90).
 *          매우 높음 180/120 이상은 결과 판정과 같이 '지금 바로 병원 가세요'.
 *  - 공복혈당: 대한당뇨병학회 2025 진료지침 (정상 <100, 공복혈당장애 100–125, 당뇨병 기준 ≥126). 250·300 이상은 verdict.ts 와 같은 안내.
 *  - 총콜레스테롤·중성지방·HDL: 한국지질·동맥경화학회 이상지질혈증 진료지침 2022
 *          (총콜 적정 <200·경계 200–239·높음 ≥240, 중성지방 적정 <150·경계 150–199·높음 200–499·매우 높음 ≥500, HDL 낮음 <40·높음 ≥60).
 *          HDL 여성 50 미만은 대사증후군 기준(질병관리청 국가건강정보포털) 중 하나라 따로 알린다.
 *  - eGFR: KDIGO 2012 (G1 ≥90, G2 60–89, 60 미만이 3개월 넘게 이어지면 만성콩팥병). 국가검진도 60 미만을 신장질환 의심으로 본다.
 *  - 요단백: 국가건강검진 요검사 판정 (음성·약양성(±) 정상, 1+ 이상 신장질환 의심). 한 번 검사로 판단하지 않는다.
 * 막대는 구간마다 같은 폭으로 그리고, 구간 안에서는 값에 비례해 점을 놓는다.
 */
import type { Lab, LabKey } from '../../../engine/src/extras.ts';

export type LabTone = 'ok' | 'mid' | 'high' | 'urgent';
/** alt: 같은 구간 안에서 더 높은 값(예: 공복혈당 300 이상)일 때 바꿔 쓰는 문구 */
interface Z { to: number; name: string; tone: LabTone; mean: string; todo: string; alt?: { from: number; mean: string; todo: string } }
interface Spec { title: string; easy: string; unit: string; lo: number; hi: number; zones: Z[] }

const BP_SYS: Z[] = [
  { to: 120, name: '정상', tone: 'ok', mean: '혈관에 걸리는 압력이 알맞아요.', todo: '1년에 한두 번은 혈압을 재 보세요.' },
  { to: 130, name: '주의', tone: 'mid', mean: '정상보다 조금 높아요.', todo: '국물·짠 반찬을 줄이고 집에서 가끔 재 보세요.' },
  { to: 140, name: '고혈압 전단계', tone: 'mid', mean: '고혈압 바로 앞 단계예요. 지금 관리하면 고혈압을 늦출 수 있어요.', todo: '집에서 며칠 아침·저녁으로 재서 기록해 보세요.' },
  { to: 180, name: '고혈압 기준', tone: 'high', mean: '고혈압 기준(140/90 이상)이에요. 한 번 잰 값으로 진단하지는 않아요.', todo: '며칠 다시 재 보고, 계속 높으면 내과 진료를 받으세요.' },
  { to: Infinity, name: '매우 높음', tone: 'urgent', mean: '매우 높은 혈압(180/120 이상)이에요.', todo: '5분 쉬고 다시 재 보세요. 그래도 180/120 이상이면 지금 바로 병원 가세요.' },
];
/** 이완기(낮은 값)를 같은 구간에 맞춘 경계: 80 미만 → 정상(주의는 수축기로만), 80 이상 전단계, 90 이상 고혈압, 120 이상 매우 높음 */
const DIA_TO = [80, 80, 90, 120, Infinity];

export const LAB_SPEC: Record<Exclude<LabKey, 'sbp' | 'dbp'> | 'bp', Spec> = {
  bp: { title: '혈압', easy: '심장이 피를 밀어낼 때(높은 값)와 쉴 때(낮은 값) 혈관에 걸리는 압력', unit: 'mmHg', lo: 90, hi: 200, zones: BP_SYS },
  glu: { title: '공복혈당', easy: '8시간 이상 굶은 뒤 피 속 당', unit: 'mg/dL', lo: 70, hi: 400, zones: [
    { to: 100, name: '정상', tone: 'ok', mean: '굶은 뒤 혈당이 정상이에요.', todo: '35세가 넘었다면 매년 혈당을 확인하는 게 좋아요.' },
    { to: 126, name: '당뇨 전 단계', tone: 'mid', mean: '공복혈당장애예요. 지금 관리하면 당뇨로 가는 걸 늦출 수 있어요.', todo: '당화혈색소 검사를 받아 보고, 단 음료·간식을 줄이세요.' },
    { to: 250, name: '당뇨 기준', tone: 'high', mean: '당뇨 기준(126 이상)에 해당하는 수치예요. 하루 검사로 진단하지는 않아요.', todo: '내과에서 다른 날 다시 재거나 당화혈색소 검사를 받으세요.' },
    { to: Infinity, name: '매우 높음', tone: 'urgent', mean: '혈당이 매우 높아요(250 이상).', todo: '최근 잰 값이면 오늘 진료를 받으세요. 예전 값이면 지금 혈당을 다시 재 보세요.',
      alt: { from: 300, mean: '혈당이 매우 높아요(300 이상).', todo: '최근 잰 값이면 지금 바로 병원 가세요. 예전 값이면 지금 혈당을 다시 재 보세요.' } },
  ] },
  tc: { title: '총콜레스테롤', easy: '피 속 기름(콜레스테롤)의 전체 양', unit: 'mg/dL', lo: 120, hi: 300, zones: [
    { to: 200, name: '적정', tone: 'ok', mean: '피 속 콜레스테롤이 적정해요.', todo: '국가검진에서 4년마다 다시 확인해요.' },
    { to: 240, name: '경계', tone: 'mid', mean: '조금 높은 편이에요.', todo: '기름진 고기·튀김을 줄이고 운동을 늘려 보세요.' },
    { to: Infinity, name: '높음', tone: 'high', mean: '높아요(240 이상).', todo: '내과에서 LDL 등 자세한 지질검사를 받으세요.' },
  ] },
  tg: { title: '중성지방', easy: '피 속 기름의 한 종류. 술·단 음식·밀가루의 영향을 많이 받아요', unit: 'mg/dL', lo: 40, hi: 800, zones: [
    { to: 150, name: '적정', tone: 'ok', mean: '중성지방이 적정해요.', todo: '지금 식습관을 이어가세요.' },
    { to: 200, name: '경계', tone: 'mid', mean: '조금 높은 편이에요.', todo: '술과 단 음식·흰 밀가루를 줄여 보세요.' },
    { to: 500, name: '높음', tone: 'high', mean: '높아요(200 이상).', todo: '술·단 음식을 줄이고 다음 진료에서 지질검사를 상담하세요.' },
    { to: Infinity, name: '매우 높음', tone: 'high', mean: '매우 높아요(500 이상). 췌장염 위험이 있어요.', todo: '내과 진료를 받으세요. 술과 단 음식을 바로 줄이세요.' },
  ] },
  hdl: { title: 'HDL 콜레스테롤', easy: '혈관 속 기름을 치워 주는 ‘좋은 콜레스테롤’. 높을수록 좋아요', unit: 'mg/dL', lo: 20, hi: 90, zones: [
    { to: 40, name: '낮음', tone: 'high', mean: '좋은 콜레스테롤이 낮아요.', todo: '운동을 늘리고, 담배를 피우면 끊는 게 도움이 돼요.' },
    { to: 60, name: '보통', tone: 'ok', mean: '좋은 콜레스테롤이 보통이에요.', todo: '규칙적인 운동이 HDL을 올려요.' },
    { to: Infinity, name: '높음(좋음)', tone: 'ok', mean: '좋은 콜레스테롤이 넉넉해요.', todo: '지금 습관을 이어가세요.' },
  ] },
  egfr: { title: 'eGFR (콩팥 기능)', easy: '콩팥이 1분 동안 피를 얼마나 거르는지. 높을수록 좋아요', unit: 'mL/min', lo: 5, hi: 120, zones: [
    { to: 60, name: '낮음', tone: 'high', mean: '콩팥 기능이 떨어졌을 수 있어요. 한 번 검사로 판단하지는 않아요.', todo: '내과에서 콩팥 검사를 다시 받으세요.' },
    { to: 90, name: '약간 낮음', tone: 'mid', mean: '조금 낮지만 나이가 들면 흔해요. 요단백이 없으면 대개 콩팥병으로 보지 않아요.', todo: '다음 검진에서 다시 확인하세요.' },
    { to: Infinity, name: '정상', tone: 'ok', mean: '콩팥이 피를 잘 거르고 있어요.', todo: '지금처럼 물을 충분히 마시고 진통제를 오래 먹지 않도록 해요.' },
  ] },
  upro: { title: '요단백', easy: '소변에 단백질이 섞여 나오는지. 콩팥이 걸러야 할 것을 흘리는지 봐요', unit: '', lo: 0, hi: 3, zones: [
    { to: 1, name: '음성', tone: 'ok', mean: '소변에 단백질이 없어요.', todo: '다음 검진에서 다시 확인해요.' },
    { to: 2, name: '약양성(±)', tone: 'mid', mean: '아주 조금 나왔어요. 운동·탈수·열이 있어도 나올 수 있어요.', todo: '다음 검진에서 다시 확인해요.' },
    { to: Infinity, name: '양성(1+ 이상)', tone: 'high', mean: '소변에 단백질이 나왔어요. 한 번 검사로 판단하지는 않아요.', todo: '내과에서 소변검사를 다시 받으세요.' },
  ] },
};

const zoneIndex = (zs: { to: number }[], v: number) => zs.findIndex((z) => v < z.to);
/** 구간마다 같은 폭으로 놓은 막대에서 값의 자리 (0–1) */
function posIn(spec: Spec, v: number, tos = spec.zones.map((z) => z.to), lo = spec.lo, hi = spec.hi) {
  const k = zoneIndex(tos.map((to) => ({ to })), v), from = k ? tos[k - 1] : lo, to = tos[k] === Infinity ? hi : tos[k];
  const t = to > from ? Math.max(0, Math.min(1, (v - from) / (to - from))) : 0.5;
  return (k + 0.1 + 0.8 * t) / tos.length;   // 경계 위에 걸쳐 보이지 않게 구간 안쪽 10–90%에만 놓는다
}

export interface LabCard { key: string; title: string; easy: string; value: string; pos: number; zones: { name: string; tone: LabTone }[]; at: number; zone: string; tone: LabTone; mean: string; todo: string; note?: string }

/** 넣은 검진값 → 카드. 넣지 않은 항목은 만들지 않는다 */
export function labCards(L: Lab, sex: 'M' | 'F' | null): LabCard[] {
  const out: LabCard[] = [];
  const card = (key: keyof typeof LAB_SPEC, v: number, value: string, k: number, pos: number, note?: string) => {
    const s = LAB_SPEC[key], z = s.zones[k], alt = z.alt && v >= z.alt.from ? z.alt : null;
    out.push({ key, title: s.title, easy: s.easy, value, pos, zones: s.zones.map((x) => ({ name: x.name, tone: x.tone })), at: k,
      zone: z.name, tone: z.tone, mean: alt?.mean ?? z.mean, todo: alt?.todo ?? z.todo, note });
  };
  if (L.sbp != null && L.dbp != null) {
    const s = LAB_SPEC.bp, ks = zoneIndex(BP_SYS, L.sbp), kd = zoneIndex(DIA_TO.map((to) => ({ to })), L.dbp);
    const k = Math.max(ks, kd), pos = Math.max(posIn(s, L.sbp), posIn(s, L.dbp, DIA_TO, 40, 130));
    card('bp', L.sbp, `${L.sbp}/${L.dbp}`, k, Math.max(pos, (k + 0.1) / s.zones.length), kd > ks ? '낮은 값(이완기) 때문에 이 구간이에요.' : undefined);
  }
  if (L.glu != null) { const s = LAB_SPEC.glu; card('glu', L.glu, `${L.glu}`, zoneIndex(s.zones, L.glu), posIn(s, L.glu)); }
  if (L.tc != null) { const s = LAB_SPEC.tc; card('tc', L.tc, `${L.tc}`, zoneIndex(s.zones, L.tc), posIn(s, L.tc)); }
  if (L.tg != null) { const s = LAB_SPEC.tg; card('tg', L.tg, `${L.tg}`, zoneIndex(s.zones, L.tg), posIn(s, L.tg)); }
  if (L.hdl != null) {
    const s = LAB_SPEC.hdl, k = zoneIndex(s.zones, L.hdl);
    card('hdl', L.hdl, `${L.hdl}`, k, posIn(s, L.hdl), sex === 'F' && L.hdl >= 40 && L.hdl < 50 ? '여성은 50 미만이면 대사증후군 기준 5가지 중 하나에 해당해요.' : undefined);
  }
  if (L.egfr != null) { const s = LAB_SPEC.egfr; card('egfr', L.egfr, `${L.egfr}`, zoneIndex(s.zones, L.egfr), posIn(s, L.egfr)); }
  if (L.upro != null) { const s = LAB_SPEC.upro, k = zoneIndex(s.zones, L.upro); card('upro', L.upro, ['음성', '±', '1+', '2+ 이상'][L.upro] ?? String(L.upro), k, (k + 0.5) / s.zones.length); }
  return out;
}

const RANK: Record<LabTone, number> = { urgent: 0, high: 1, mid: 2, ok: 3 };
/** 맨 위 한 줄 요약 */
export function labSummary(cs: LabCard[]) {
  const urgent = cs.filter((c) => c.tone === 'urgent'), high = cs.filter((c) => c.tone === 'high'), mid = cs.filter((c) => c.tone === 'mid');
  const names = (xs: LabCard[]) => xs.map((c) => c.title.replace(/ \(.*\)$/, '')).join('·');
  const tone: LabTone = urgent.length ? 'urgent' : high.length ? 'high' : mid.length ? 'mid' : 'ok';
  const m = names(mid), batchim = (m.charCodeAt(m.length - 1) - 0xac00) % 28 > 0;
  const title = urgent.length ? `${names(urgent)} · 지금 바로 확인이 필요해요`
    : high.length ? `${names(high)} 확인이 필요해요`
    : mid.length ? `${m}${batchim ? '은' : '는'} 조금 신경 쓸 구간이에요`
    : '넣은 수치가 모두 정상 범위예요';
  return { tone, title, count: { urgent: urgent.length, high: high.length, mid: mid.length, ok: cs.length - urgent.length - high.length - mid.length },
    order: [...cs].sort((a, b) => RANK[a.tone] - RANK[b.tone]) };
}
