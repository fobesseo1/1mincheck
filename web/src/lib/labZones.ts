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
 *  - LDL: 한국지질·동맥경화학회 2022 (적정 <100·정상 100–129·경계 130–159·높음 160–189·매우 높음 ≥190).
 *  - 혈색소: 국가건강검진 판정기준 표준화 연구 2015 (남 정상 13.0–16.5·경계 12.0–12.9·빈혈 의심 <12.0, 여 정상 12.0–15.5·경계 10.0–11.9·빈혈 의심 <10.0).
 *          WHO 2024도 남 13.0·여 12.0 미만을 빈혈로 본다. 정상보다 높으면 '높음'(다시 확인).
 *  - AST·ALT·감마지티피: 보건복지부 건강검진 실시기준 판정 (AST ≤40 정상·41–50 경계·≥51 의심, ALT ≤35·36–45·≥46,
 *          감마지티피 남 ≤63·64–77·≥78, 여 ≤35·36–45·≥46).
 *  - 혈청 크레아티닌: 국가건강검진 (1.5 이하 정상, 1.5 초과 신장질환 의심). 콩팥 기능은 eGFR이 더 정확하다.
 * 막대는 구간마다 같은 폭으로 그리고, 구간 안에서는 값에 비례해 점을 놓는다.
 */
import type { Lab, LabKey } from './labs.ts';

export type LabTone = 'ok' | 'mid' | 'high' | 'urgent';
/** alt: 같은 구간 안에서 더 높은 값(예: 공복혈당 300 이상)일 때 바꿔 쓰는 문구 */
interface Z { to: number; name: string; tone: LabTone; mean: string; todo: string; alt?: { from: number; mean: string; todo: string } }
/** zonesF: 여성 기준이 다르면 */
interface Spec { title: string; easy: string; unit: string; lo: number; hi: number; zones: Z[]; zonesF?: Z[]; loF?: number; hiF?: number }

const BP_SYS: Z[] = [
  { to: 120, name: '정상', tone: 'ok', mean: '혈관에 걸리는 압력이 알맞아요.', todo: '1년에 한두 번은\n혈압을 재 보세요.' },
  { to: 130, name: '주의', tone: 'mid', mean: '정상보다 조금 높아요.', todo: '국물과 짠 반찬을 줄이고,\n집에서 가끔 재 보세요.' },
  { to: 140, name: '고혈압 전단계', tone: 'mid', mean: '고혈압 바로 앞 단계예요.\n지금부터 관리를 시작해야 해요.', todo: '며칠 동안 아침·저녁으로 재서\n기록해 보세요.' },
  { to: 180, name: '고혈압 기준', tone: 'high', mean: '고혈압 기준(140/90)을 넘어요.\n한 번 잰 값으로 진단하지는 않아요.', todo: '며칠 더 재 보고,\n계속 높으면 내과 진료를 받으세요.' },
  { to: Infinity, name: '매우 높음', tone: 'urgent', mean: '혈압이 매우 높아요(180/120 이상).', todo: '5분 쉬고 다시 재 보세요.\n그래도 180/120 이상이면 지금 바로 병원 가세요.' },
];
/** 이완기(낮은 값)를 같은 구간에 맞춘 경계: 80 미만 → 정상(주의는 수축기로만), 80 이상 전단계, 90 이상 고혈압, 120 이상 매우 높음 */
const DIA_TO = [80, 80, 90, 120, Infinity];

export const LAB_SPEC: Record<Exclude<LabKey, 'sbp' | 'dbp'> | 'bp', Spec> = {
  bp: { title: '혈압', easy: '심장이 피를 밀어낼 때(높은 값)와 쉴 때(낮은 값) 혈관에 걸리는 압력', unit: 'mmHg', lo: 90, hi: 200, zones: BP_SYS },
  glu: { title: '공복혈당', easy: '8시간 이상 금식한 뒤 측정한 혈당', unit: 'mg/dL', lo: 70, hi: 400, zones: [
    { to: 100, name: '정상', tone: 'ok', mean: '공복혈당이 정상이에요.', todo: '35세가 넘었다면\n매년 혈당을 확인해 보세요.' },
    { to: 126, name: '당뇨 전 단계', tone: 'mid', mean: '공복혈당장애예요.\n지금부터 관리를 시작해야 해요.', todo: '당화혈색소 검사를 받아 보고,\n단 음료와 간식을 줄이세요.' },
    { to: 250, name: '당뇨 기준', tone: 'high', mean: '당뇨 기준(126)을 넘어요.\n하루 검사로 진단하지는 않아요.', todo: '내과에서 다른 날 다시 재거나\n당화혈색소 검사를 받으세요.' },
    { to: Infinity, name: '매우 높음', tone: 'urgent', mean: '혈당이 매우 높아요(250 이상).', todo: '최근 잰 값이면 오늘 진료를 받으세요.\n예전 값이면 지금 다시 재 보세요.',
      alt: { from: 300, mean: '혈당이 매우 높아요(300 이상).', todo: '최근 잰 값이면 지금 바로 병원 가세요.\n예전 값이면 지금 다시 재 보세요.' } },
  ] },
  tc: { title: '총콜레스테롤', easy: '피 속 기름(콜레스테롤)의 전체 양', unit: 'mg/dL', lo: 120, hi: 300, zones: [
    { to: 200, name: '적정', tone: 'ok', mean: '콜레스테롤이 적정해요.', todo: '국가검진에서\n4년마다 다시 확인해요.' },
    { to: 240, name: '경계', tone: 'mid', mean: '조금 높은 편이에요.', todo: '기름진 고기와 튀김을 줄이고,\n운동을 늘려 보세요.' },
    { to: Infinity, name: '높음', tone: 'high', mean: '240을 넘었어요.', todo: '내과에서 LDL 등\n자세한 지질검사를 받으세요.' },
  ] },
  tg: { title: '중성지방', easy: '피 속 기름의 한 종류. 술·단 음식·밀가루의 영향을 많이 받아요', unit: 'mg/dL', lo: 40, hi: 800, zones: [
    { to: 150, name: '적정', tone: 'ok', mean: '중성지방이 적정해요.', todo: '지금 식습관을 이어가세요.' },
    { to: 200, name: '경계', tone: 'mid', mean: '조금 높은 편이에요.', todo: '술, 단 음식, 흰 밀가루를\n줄여 보세요.' },
    { to: 500, name: '높음', tone: 'high', mean: '200을 넘었어요.', todo: '술과 단 음식을 줄이고,\n다음 진료 때 지질검사를 상담하세요.' },
    { to: Infinity, name: '매우 높음', tone: 'high', mean: '500을 넘었어요.\n췌장염 위험이 있어요.', todo: '내과 진료를 받으세요.\n술과 단 음식은 바로 줄이세요.' },
  ] },
  hdl: { title: 'HDL 콜레스테롤', easy: '혈관 속 기름을 치워 주는 ‘좋은 콜레스테롤’. 높을수록 좋아요', unit: 'mg/dL', lo: 20, hi: 90, zones: [
    { to: 40, name: '낮음', tone: 'high', mean: '좋은 콜레스테롤이 낮아요.', todo: '운동을 늘려 보세요.\n담배를 피운다면 끊는 게 도움이 돼요.' },
    { to: 60, name: '보통', tone: 'ok', mean: '좋은 콜레스테롤이 보통이에요.', todo: '꾸준히 운동하면\n좋은 콜레스테롤이 올라가요.' },
    { to: Infinity, name: '높음(좋음)', tone: 'ok', mean: '좋은 콜레스테롤이 넉넉해요.', todo: '지금 습관을 이어가세요.' },
  ] },
  egfr: { title: 'eGFR (콩팥 기능)', easy: '콩팥이 1분 동안 피를 얼마나 거르는지. 높을수록 좋아요', unit: 'mL/min', lo: 5, hi: 120, zones: [
    { to: 60, name: '낮음', tone: 'high', mean: '콩팥 기능이 떨어졌을 수 있어요.\n한 번 검사로 판단하지는 않아요.', todo: '내과에서\n콩팥 검사를 다시 받으세요.' },
    { to: 90, name: '약간 낮음', tone: 'mid', mean: '조금 낮지만, 나이가 들면 흔해요.\n요단백이 없으면 대개 콩팥병은 아니에요.', todo: '다음 검진에서 다시 확인하세요.' },
    { to: Infinity, name: '정상', tone: 'ok', mean: '콩팥이 피를 잘 거르고 있어요.', todo: '물을 충분히 마시고,\n진통제는 오래 먹지 마세요.' },
  ] },
  ldl: { title: 'LDL 콜레스테롤', easy: '혈관 벽에 쌓이는 ‘나쁜 콜레스테롤’', unit: 'mg/dL', lo: 50, hi: 220, zones: [
    { to: 130, name: '정상', tone: 'ok', mean: 'LDL이 정상 범위예요.', todo: '지금 식습관을 이어가세요.' },
    { to: 160, name: '경계', tone: 'mid', mean: '조금 높은 편이에요.', todo: '기름진 고기와 튀김을 줄이고,\n운동을 늘려 보세요.' },
    { to: 190, name: '높음', tone: 'high', mean: '160을 넘었어요.', todo: '내과에서 치료가 필요한지\n상담해 보세요.' },
    { to: Infinity, name: '매우 높음', tone: 'high', mean: '190을 넘었어요.\n타고난 원인일 수도 있어요.', todo: '내과 진료를 받아 보세요.' },
  ] },
  hb: { title: '혈색소', easy: '피가 산소를 나르는 힘. 낮으면 빈혈일 수 있어요', unit: 'g/dL', lo: 9, hi: 19, zones: [
    { to: 12, name: '빈혈 의심', tone: 'high', mean: '혈색소가 낮아요.\n빈혈일 수 있어요.', todo: '내과에서 빈혈 검사와\n원인 확인을 받으세요.' },
    { to: 13, name: '경계', tone: 'mid', mean: '정상보다 조금 낮아요.', todo: '고기·생선·녹색 채소를 챙기고,\n다음 검진에서 다시 확인하세요.' },
    { to: 16.55, name: '정상', tone: 'ok', mean: '피가 산소를 잘 나르고 있어요.', todo: '지금처럼 골고루 드세요.' },
    { to: Infinity, name: '높음', tone: 'mid', mean: '정상보다 높아요.\n담배나 탈수 때문일 수도 있어요.', todo: '다음 검진에서 다시 확인하고,\n계속 높으면 진료를 받으세요.' },
  ], loF: 7, hiF: 18, zonesF: [
    { to: 10, name: '빈혈 의심', tone: 'high', mean: '혈색소가 낮아요.\n빈혈일 수 있어요.', todo: '내과에서 빈혈 검사와\n원인 확인을 받으세요.' },
    { to: 12, name: '경계', tone: 'mid', mean: '정상보다 조금 낮아요.', todo: '고기·생선·녹색 채소를 챙기고,\n다음 검진에서 다시 확인하세요.' },
    { to: 15.55, name: '정상', tone: 'ok', mean: '피가 산소를 잘 나르고 있어요.', todo: '지금처럼 골고루 드세요.' },
    { to: Infinity, name: '높음', tone: 'mid', mean: '정상보다 높아요.\n담배나 탈수 때문일 수도 있어요.', todo: '다음 검진에서 다시 확인하고,\n계속 높으면 진료를 받으세요.' },
  ] },
  ast: { title: 'AST (SGOT)', easy: '간·근육이 상하면 피로 나오는 효소', unit: 'U/L', lo: 5, hi: 100, zones: [
    { to: 41, name: '정상', tone: 'ok', mean: '간 수치가 정상이에요.', todo: '지금처럼 술을 적게 마시세요.' },
    { to: 51, name: '경계', tone: 'mid', mean: '조금 높아요.\n술, 약, 심한 운동 뒤에도 오를 수 있어요.', todo: '술을 줄이고,\n다음 검진에서 다시 확인하세요.' },
    { to: Infinity, name: '높음', tone: 'high', mean: '간이 상했을 수 있어요.', todo: '내과에서 간 수치를 다시 재고,\n원인을 확인하세요.' },
  ] },
  alt: { title: 'ALT (SGPT)', easy: '간세포가 상하면 피로 나오는 효소. 지방간에서 자주 올라요', unit: 'U/L', lo: 5, hi: 100, zones: [
    { to: 36, name: '정상', tone: 'ok', mean: '간 수치가 정상이에요.', todo: '지금처럼 체중과 술을 관리하세요.' },
    { to: 46, name: '경계', tone: 'mid', mean: '조금 높아요.\n지방간일 때 자주 올라요.', todo: '체중과 술을 줄이고,\n다음 검진에서 다시 확인하세요.' },
    { to: Infinity, name: '높음', tone: 'high', mean: '간이 상했을 수 있어요.', todo: '내과에서 간 수치를 다시 재고,\n원인을 확인하세요.' },
  ] },
  ggt: { title: '감마지티피 (γ-GTP)', easy: '술과 가장 관련이 큰 간 수치', unit: 'U/L', lo: 5, hi: 120, zones: [
    { to: 64, name: '정상', tone: 'ok', mean: '감마지티피가 정상이에요.', todo: '지금처럼 술을 적게 마시세요.' },
    { to: 78, name: '경계', tone: 'mid', mean: '조금 높아요.\n술을 자주 마시면 잘 올라요.', todo: '술을 줄이고,\n다음 검진에서 다시 확인하세요.' },
    { to: Infinity, name: '높음', tone: 'high', mean: '간에 부담이 있을 수 있어요.', todo: '술을 줄이고,\n내과에서 간 검사를 받아 보세요.' },
  ], loF: 3, hiF: 80, zonesF: [
    { to: 36, name: '정상', tone: 'ok', mean: '감마지티피가 정상이에요.', todo: '지금처럼 술을 적게 마시세요.' },
    { to: 46, name: '경계', tone: 'mid', mean: '조금 높아요.\n술을 자주 마시면 잘 올라요.', todo: '술을 줄이고,\n다음 검진에서 다시 확인하세요.' },
    { to: Infinity, name: '높음', tone: 'high', mean: '간에 부담이 있을 수 있어요.', todo: '술을 줄이고,\n내과에서 간 검사를 받아 보세요.' },
  ] },
  cr: { title: '혈청 크레아티닌', easy: '콩팥이 걸러 내는 노폐물. 높으면 콩팥 기능이 떨어졌을 수 있어요', unit: 'mg/dL', lo: 0.3, hi: 3, zones: [
    { to: 1.55, name: '정상', tone: 'ok', mean: '콩팥이 노폐물을 잘 걸러 내고 있어요.', todo: 'eGFR도 함께 보면 더 정확해요.' },
    { to: Infinity, name: '높음', tone: 'high', mean: '콩팥 기능이 떨어졌을 수 있어요.\n한 번 검사로 판단하지는 않아요.', todo: '내과에서\n콩팥 검사를 다시 받으세요.' },
  ] },
  upro: { title: '요단백', easy: '소변에 단백질이 섞여 나오는지. 콩팥이 걸러야 할 것을 흘리는지 봐요', unit: '', lo: 0, hi: 3, zones: [
    { to: 1, name: '음성', tone: 'ok', mean: '소변에 단백질이 없어요.', todo: '다음 검진에서 다시 확인해요.' },
    { to: 2, name: '약양성(±)', tone: 'mid', mean: '아주 조금 나왔어요.\n운동 뒤나 열이 날 때도 나올 수 있어요.', todo: '다음 검진에서 다시 확인해요.' },
    { to: Infinity, name: '양성(1+ 이상)', tone: 'high', mean: '소변에 단백질이 나왔어요.\n한 번 검사로 판단하지는 않아요.', todo: '내과에서\n소변검사를 다시 받으세요.' },
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
  if (L.ldl != null) { const s = LAB_SPEC.ldl; card('ldl', L.ldl, `${L.ldl}`, zoneIndex(s.zones, L.ldl), posIn(s, L.ldl)); }
  // 남녀 기준이 다른 항목: 여성이면 여성 구간
  const bySex = (key: 'hb' | 'ggt', v: number) => {
    const b = LAB_SPEC[key], s = sex === 'F' && b.zonesF ? { ...b, zones: b.zonesF, lo: b.loF ?? b.lo, hi: b.hiF ?? b.hi } : b;
    const k = zoneIndex(s.zones, v);
    out.push({ key, title: s.title, easy: s.easy, value: `${v}`, pos: posIn(s, v), zones: s.zones.map((x) => ({ name: x.name, tone: x.tone })), at: k,
      zone: s.zones[k].name, tone: s.zones[k].tone, mean: s.zones[k].mean, todo: s.zones[k].todo, note: sex ? `${sex === 'F' ? '여성' : '남성'} 기준이에요.` : '성별을 몰라 남성 기준으로 봤어요.' });
  };
  if (L.hb != null) bySex('hb', L.hb);
  if (L.ast != null) { const s = LAB_SPEC.ast; card('ast', L.ast, `${L.ast}`, zoneIndex(s.zones, L.ast), posIn(s, L.ast)); }
  if (L.alt != null) { const s = LAB_SPEC.alt; card('alt', L.alt, `${L.alt}`, zoneIndex(s.zones, L.alt), posIn(s, L.alt)); }
  if (L.ggt != null) bySex('ggt', L.ggt);
  if (L.cr != null) { const s = LAB_SPEC.cr; card('cr', L.cr, `${L.cr}`, zoneIndex(s.zones, L.cr), posIn(s, L.cr)); }
  if (L.egfr != null) { const s = LAB_SPEC.egfr; card('egfr', L.egfr, `${L.egfr}`, zoneIndex(s.zones, L.egfr), posIn(s, L.egfr)); }
  if (L.upro != null) { const s = LAB_SPEC.upro, k = zoneIndex(s.zones, L.upro); card('upro', L.upro, ['음성', '±', '1+', '2+ 이상'][L.upro] ?? String(L.upro), k, (k + 0.5) / s.zones.length); }
  return out;
}

const RANK: Record<LabTone, number> = { urgent: 0, high: 1, mid: 2, ok: 3 };
/** 맨 위 한 줄 요약 */
export function labSummary(cs: LabCard[]) {
  const urgent = cs.filter((c) => c.tone === 'urgent'), high = cs.filter((c) => c.tone === 'high'), mid = cs.filter((c) => c.tone === 'mid');
  // 둘이면 'LDL 콜레스테롤과 ALT', 셋 이상이면 가운뎃점으로
  const names = (xs: LabCard[]) => {
    const ws = xs.map((c) => c.title.replace(/ \(.*\)$/, '')), a = ws[0] ?? '', c = a.charCodeAt(a.length - 1) - 0xac00;
    return ws.length === 2 ? `${a}${c >= 0 && c % 28 ? '과' : '와'} ${ws[1]}` : ws.join('·');
  };
  const tone: LabTone = urgent.length ? 'urgent' : high.length ? 'high' : mid.length ? 'mid' : 'ok';
  const m = names(mid), batchim = (m.charCodeAt(m.length - 1) - 0xac00) % 28 > 0;
  const last = (xs: LabCard[]) => { const w = names(xs); return (w.charCodeAt(w.length - 1) - 0xac00) % 28 > 0 ? '을' : '를'; };
  const title = urgent.length ? `${names(urgent)}${last(urgent)} 지금 바로 확인하세요`
    : high.length ? `${names(high)}${last(high)} 확인해 보세요`
    : mid.length ? `${m}${batchim ? '은' : '는'} 조금 신경 써야 해요`
    : '넣은 수치가 모두 정상 범위예요';
  return { tone, title, count: { urgent: urgent.length, high: high.length, mid: mid.length, ok: cs.length - urgent.length - high.length - mid.length },
    order: [...cs].sort((a, b) => RANK[a.tone] - RANK[b.tone]) };
}
