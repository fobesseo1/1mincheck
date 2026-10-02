/**
 * 결과 첫 화면의 '상태 한 줄 + 할 일 1–2개' (docs/action-tiers.md).
 * 우선순위 ① 지금 바로 병원 > ② 병원 확인 > ⑤ 관리 중 > ③ 습관 바꾸기 > ④ 지금처럼 유지. 하나만 맨 위에 올린다.
 * ② 병원 확인은 걸리는 문제를 모두 보여준다(제목·할 일 최대 3개, 넘치면 '함께 확인할 것'). 또래의 2배 이상인 확률도 ②에 넣는다.
 * 확률·또래 비교는 이 판정의 근거로 아래에 그대로 둔다(계산은 engine·view 그대로).
 */
import type { AppInput } from '../state.ts';
import type { Scenario } from './view.ts';
import { viewResults, labOf, severeBp, xfmt } from './view.ts';
import { SEVERE_HTN_SYMPTOM, ACTION, type ItemId } from './content.ts';

export type Tier = 1 | 2 | 5 | 3 | 4;
export interface Verdict {
  tier: Tier;
  tag: string;
  title: string;
  sub: string;
  actions: { t: string; d?: string; href?: string }[];
  /** 할 일 밖에서 짧게 덧붙일 것 (예: 또래보다 높은 항목의 검사) */
  also?: string;
}

type R = ReturnType<typeof viewResults>;
/** 받침에 맞는 조사 */
const j = (w: string, a: string, b: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };
const and = (xs: string[]) => (xs.length < 2 ? xs[0] ?? '' : `${xs[0]}${j(xs[0], '과', '와')} ${xs[1]}`);
const bmiOf = (i: AppInput) => i.weightKg / (i.heightCm / 100) ** 2;
const waistHigh = (i: AppInput) => i.waistCm != null && i.waistCm >= (i.sex === 'F' ? 85 : 90);
const DX_NAME = { htn: '고혈압', dm: '당뇨', chol: '고지혈증' } as const;

export function verdict(inp: AppInput, r: R, sc: Scenario): Verdict {
  const L = labOf(inp), dx = inp.dx;
  const st = (id: ItemId) => [...r.prob, ...r.score].find((x) => x.id === id);
  const strong = (id: ItemId) => r.first.some((f) => f.id === id && !f.c);

  // ── ① 지금 바로 병원 ──
  if (severeBp(inp)) return {
    tier: 1, tag: '지금 바로', title: '혈압이 매우 높아요 · 지금 바로 병원 가세요', sub: `검진 혈압 ${L.sbp}/${L.dbp} (180/120 이상)`,
    actions: [{ t: '5분 쉬고 다시 재 보세요', d: '그래도 180/120 이상이면 지금 바로 병원에 가세요.' }, { t: '이런 증상이 있으면 다시 재지 말고 지금 바로 병원', d: SEVERE_HTN_SYMPTOM.replace(/이 있으면 다시 재지 말고 지금 바로 병원에 가세요\.$/, '') }],
  };

  // ── 혈당이 매우 높음 (진단 여부와 관계없이). CDC: 250 이상이면 자주 재고 케톤 확인, 300 이상이 이어지면 바로 의료 도움.
  // 앱 문구는 '오늘 진료' / '지금 바로 병원'만 쓴다(다른 표현 금지). 입력값이 최근 값인지 예전 검진 값인지 모르므로 둘 다 안내.
  if (L.glu != null && L.glu >= 250) {
    const now = L.glu >= 300;
    return {
      tier: 1, tag: now ? '지금 바로' : '오늘 확인', title: now ? '혈당이 매우 높아요 · 지금 바로 병원 가세요' : '혈당이 매우 높아요 · 오늘 진료를 받으세요',
      sub: `공복혈당 ${L.glu} (${now ? '300' : '250'} 이상)`,
      actions: [{ t: now ? '최근 잰 값이면 지금 바로 병원 가세요' : '최근 잰 값이면 오늘 진료를 받으세요', d: `예전 검진 값이라면 지금 혈당을 다시 재서 확인하세요.${now ? '' : ' 다시 재도 300 이상이면 지금 바로 병원 가세요.'}` },
        { t: '구토·숨참이 있으면 기다리지 말고 지금 바로 병원 가세요', d: '심한 갈증, 배가 아픔, 멍해짐도 같아요.' }],
    };
  }

  // ── 습관 (②·⑤·③에서 함께 씀). 효과가 큰 순서: 금연 > 체중 > 운동 > 혈당 전단계 > 혈압 전단계 ──
  type H = { key: string; short: string; t: string; d?: string; href?: string };
  const hs: H[] = [];
  const b = bmiOf(inp), best = r.best;
  const gain = best && sc && (sc.weightKg || sc.waistCm) ? `${[sc.weightKg && `체중 ${Math.abs(sc.weightKg)}kg`, sc.waistCm && `허리 ${Math.abs(sc.waistCm)}cm`].filter(Boolean).join('·')}만 줄여도 ${best.name}${j(best.name, '이', '가')} ${best.a}% → ${best.b}%로 줄어요.` : undefined;
  if (inp.smoke === 'current') hs.push({ key: 'smoke', short: '금연', t: '담배를 끊으세요', d: '보건소 금연클리닉은 무료로 상담과 금연 보조제를 받을 수 있어요.' });
  if (b >= 25) hs.push({ key: 'weight', short: '체중 관리', t: '체중을 줄이세요', d: gain ?? '지금 체중의 5%만 줄여도 혈압·혈당이 좋아져요.', href: '#/whatif' });
  else if (waistHigh(inp)) hs.push({ key: 'waist', short: '허리둘레 관리', t: `허리둘레를 줄이세요 (목표 ${inp.sex === 'F' ? '85' : '90'}cm 미만)`, d: gain ?? '뱃살이 줄면 당뇨·지방간 가능성이 함께 내려가요.', href: '#/whatif' });
  else if (b < 18.5) hs.push({ key: 'under', short: '체중 관리', t: '끼니를 거르지 말고 단백질을 챙기세요', d: '체중이 적으면 근육과 뼈가 약해지기 쉬워요.' });
  if (inp.exercise === false) hs.push({ key: 'exercise', short: '운동', t: '주 2회 이상, 한 번에 30분씩 운동하세요', d: '빠르게 걷기도 충분해요.' });
  const ifg = !dx.dm && L.glu != null && L.glu >= 100 && L.glu < 126;
  if (ifg) hs.push({ key: 'glu', short: '혈당 관리', t: '당화혈색소 검사를 받아 보세요', d: `공복혈당 ${L.glu}는 당뇨 전 단계(100–125)예요. 단 음료·간식을 줄이고 매년 혈당을 확인하세요.`, href: '#/detail/dm' });
  const bpPre = !dx.htn && (L.sbp != null && L.dbp != null ? L.sbp >= 120 || L.dbp >= 80 : inp.bp === 'elevated');
  // 이상지질혈증 진료지침(한국지질·동맥경화학회): 중성지방 200 이상 높음(500 이상은 아래 ②), HDL 40 미만 낮음 → 생활습관 + 다음 진료 때 지질검사 상담
  if (L.tg != null && L.tg >= 200 && L.tg < 500) hs.push({ key: 'tg', short: '중성지방 관리', t: '술·단 음식을 줄이고 다음 진료에서 지질검사를 상담하세요', d: `중성지방 ${L.tg}는 높은 편이에요(200 이상).` });
  if (L.hdl != null && L.hdl < 40) hs.push({ key: 'hdl', short: '좋은 콜레스테롤(HDL) 관리', t: '운동을 늘리고 다음 진료에서 지질검사를 상담하세요', d: `HDL ${L.hdl}은 낮은 편이에요(40 미만). 담배를 피우면 끊는 게 HDL을 올려요.` });
  if (bpPre) hs.push({ key: 'bp', short: '혈압 관리', t: '짠 음식을 줄이고 집에서 혈압을 재 보세요', d: L.sbp != null ? `검진 혈압 ${L.sbp}/${L.dbp}는 정상(120/80 미만)보다 조금 높아요.` : '혈압이 정상보다 조금 높은 편이에요.' });

  // ── ② 병원 확인: 검진 수치가 기준 이상이거나 점수가 진료 권고 수준 ──
  /** short = 한 번에 묶을 때 쓰는 짧은 이름, body = 내과·병원에서 한 번에 확인할 수 있는 몸 검사 */
  type C = { name: string; why: string; t: string; d?: string; href?: string; short?: string; body?: boolean };
  const cs: C[] = [];
  const bpHigh = L.sbp != null && L.dbp != null && (L.sbp >= 140 || L.dbp >= 90);
  if (!bpHigh && !dx.htn && L.sbp == null && inp.bp === 'high') cs.push({ name: '혈압', why: '최근 잰 혈압이 140/90 이상이었다고 답하셨어요', t: '가까운 내과에서 혈압 진료를 받으세요', d: '그 전에 집에서 며칠 아침·저녁으로 재서 기록해 가세요.', href: '#/detail/htn', short: '혈압 진료', body: true });
  if (bpHigh) cs.push(dx.htn
    ? { name: '혈압', why: `검진 혈압 ${L.sbp}/${L.dbp} · 치료 목표(140/90 미만)보다 높아요`, t: '진료 때 이 수치를 알리세요', d: '약 조절이 필요한지 상담하세요. 집에서 잰 혈압 기록을 가져가면 좋아요.', short: '혈압 약 조절 상담', body: true }
    : { name: '혈압', why: `검진 혈압 ${L.sbp}/${L.dbp} · 고혈압 기준(140/90 이상)이에요`, t: '가까운 내과에서 혈압 진료를 받으세요', d: '그 전에 집에서 며칠 아침·저녁으로 재서 기록해 가세요.', href: '#/detail/htn', short: '혈압 진료', body: true });
  if (!dx.dm && L.glu != null && L.glu >= 126) cs.push({ name: '혈당', why: `공복혈당 ${L.glu} · 당뇨 기준(126 이상)이에요`, t: '내과에서 혈당을 다시 확인하세요', d: '다른 날 공복혈당을 다시 재거나 당화혈색소 검사를 받아요.', href: '#/detail/dm', short: '혈당 재검사·당화혈색소', body: true });
  if (!dx.chol && L.tc != null && L.tc >= 240) cs.push({ name: '콜레스테롤', why: `총콜레스테롤 ${L.tc} · 기준(240 이상)이에요`, t: '내과에서 콜레스테롤을 자세히 확인하세요', d: 'LDL·중성지방·HDL을 함께 보고 치료가 필요한지 정해요.', href: '#/detail/chol', short: 'LDL 등 지질검사', body: true });
  if (L.tg != null && L.tg >= 500) cs.push({ name: '중성지방', why: `중성지방 ${L.tg} · 매우 높아요(500 이상)`, t: '내과에서 중성지방 진료를 받으세요', d: '이만큼 높으면 췌장염 위험이 있어요. 술과 단 음식을 바로 줄이세요.', short: '중성지방 진료', body: true });
  const egfrLow = L.egfr != null && L.egfr < 60, upro = L.upro != null && L.upro >= 2;
  if (egfrLow || upro) cs.push({ name: '콩팥', why: [egfrLow && `eGFR ${L.egfr} (60 미만)`, upro && '요단백 1+ 이상'].filter(Boolean).join(' · '), t: '내과에서 콩팥 검사를 다시 받으세요', d: '한 번의 검사로는 콩팥병이라고 하지 않아요. 다시 검사해서 같은지 확인해요.', short: '콩팥 재검사', body: true });
  if (st('nafld')?.status === 'excluded') cs.push({ name: '간', why: '술을 많이 드셔서 간 검사가 필요해요', t: '간 수치 검사를 받으세요', d: 'AST·ALT·감마지티피 혈액검사로 술 때문에 간이 상했는지 봐요. 술을 줄이는 게 먼저예요.', href: '#/detail/nafld', short: '간 수치 검사', body: true });
  // 또래의 2배 이상인 확률 항목도 병원 확인 사유 (몸 → 마음 순서, 배수가 큰 것 먼저)
  const CMP_NAME: Partial<Record<ItemId, [string, string, string, string]>> = {
    dm: ['혈당', '당뇨', '혈당 검사(공복혈당·당화혈색소)를 받으세요', '혈당 검사'], htn: ['혈압', '고혈압', '혈압을 재고 내과 진료를 받으세요', '혈압 측정'],
    chol: ['콜레스테롤', '고콜레스테롤', '콜레스테롤 혈액검사를 받으세요', '콜레스테롤 검사'], nafld: ['간', '지방간', '간 수치 검사와 복부 초음파로 확인하세요', '간 수치·복부 초음파'], osteo: ['뼈', '골다공증', '골밀도 검사를 받으세요', '골밀도 검사'] };
  r.prob.filter((p) => p.cmp && p.cmp.x >= 2 && CMP_NAME[p.id as ItemId]).sort((a, b) => b.cmp!.x - a.cmp!.x).forEach((p) => {
    const [name, dis, t, short] = CMP_NAME[p.id as ItemId]!;
    if (cs.some((c) => c.name === name)) return;
    cs.push({ name, why: `${dis} 가능성이 또래의 ${xfmt(p.cmp!.x)}배예요`, t, d: `지금 ${p.pct}% · 같은 또래 평균 ${p.peerTxt}%`, href: `#/detail/${p.id}`, short, body: true });
  });
  if (strong('dep')) cs.push({ name: '마음', why: '우울 점수가 상담을 권하는 수준이에요', t: '정신건강복지센터나 병원에서 상담을 받으세요', d: '많이 힘들면 109(24시간)로 전화하세요.', href: '#/detail/dep' });
  if (strong('gad')) cs.push({ name: '불안', why: '불안 점수가 확인이 필요한 수준이에요', t: '불안이 2주 넘게 이어지면 상담을 받으세요', href: '#/detail/gad' });
  if (strong('osa')) cs.push({ name: '수면', why: '수면무호흡 가능성이 높은 점수예요', t: '수면 검사를 상담하세요', d: '수면다원검사는 건강보험이 적용돼요.', href: '#/detail/osa' });
  if (strong('isi')) cs.push({ name: '수면', why: '불면 점수가 진료를 권하는 수준이에요', t: '수면 진료를 받아 보세요', d: '불면 인지행동치료가 도움이 돼요.', href: '#/detail/isi' });
  if (strong('gerd')) cs.push({ name: '소화', why: '위식도역류 가능성이 높은 점수예요', t: '소화기내과 진료를 받아 보세요', href: '#/detail/gerd' });
  const dxNames = (Object.keys(DX_NAME) as (keyof typeof DX_NAME)[]).filter((k) => dx[k]).map((k) => DX_NAME[k]);
  if (cs.length) {
    const names = [...new Set(cs.map((c) => c.name))];
    // 몸 검사가 2개 이상이면 한 번의 방문으로 묶는다(내과, 골밀도가 끼면 병원). 마음·수면·소화는 따로. 그다음 가장 효과 큰 습관 1개(예: 금연)
    const bodyCs = cs.filter((c) => c.body), other = cs.filter((c) => !c.body);
    const acts: Verdict['actions'] = [], shown = new Set<string>();
    if (bodyCs.length >= 2) acts.push({ t: `${bodyCs.some((c) => c.name === '뼈') ? '병원' : '내과'}에서 한 번에 확인하세요`, d: [...new Set(bodyCs.map((c) => c.short ?? c.name))].join(' · ') });
    else if (bodyCs.length === 1) acts.push({ t: bodyCs[0].t, d: bodyCs[0].d, href: bodyCs[0].href });
    bodyCs.forEach((c) => shown.add(c.name));
    for (const c of other) if (acts.length < 2) { acts.push({ t: c.t, d: c.d, href: c.href }); shown.add(c.name); }
    const h = hs.find((x) => x.key !== 'bp' && x.key !== 'glu');
    if (h && acts.length < 3) acts.push({ t: h.t, d: h.d, href: h.href });
    const rest = names.filter((n) => !shown.has(n));
    return {
      tier: 2, tag: '병원 확인', title: `${names.slice(0, 3).join('·')} 확인이 필요해요`,
      sub: cs.slice(0, 3).map((c) => c.why).join(' / ') + (dxNames.length ? ` · ${dxNames.join('·')}${j(dxNames[dxNames.length - 1], '은', '는')} 지금처럼 관리를 이어가세요` : ''),
      actions: acts,
      also: rest.length ? `함께 확인할 것: ${rest.join('·')}` : undefined,
    };
  }

  // 또래보다 높은 확률 항목의 검사 안내 (③·④에서 덧붙임)
  const hiCmp = r.first.filter((f) => f.c).map((f) => f.id);
  const checkFor = (id: ItemId) => (id === 'osteo' ? '골밀도 검사를 받으세요' : id === 'dm' ? '공복혈당·당화혈색소 검사를 받으세요' : id === 'chol' ? '콜레스테롤 혈액검사를 받으세요' : id === 'nafld' ? '간 수치·복부 초음파로 지방간을 확인하세요' : id === 'htn' ? '혈압을 재 보세요' : ACTION[id] ?? '');

  // ── ⑤ 관리 중 ──
  if (dxNames.length) {
    const manageAct = dx.dm ? { t: '매년 눈·콩팥·발 합병증 검사를 받으세요', d: '처방대로 약을 챙기고 당화혈색소로 조절 상태를 확인해요.', href: '#/detail/dm' }
      : dx.htn ? { t: '처방대로 약을 먹고 집에서 혈압을 재 기록하세요', d: '목표는 140/90 미만이에요.', href: '#/detail/htn' }
      : { t: '처방대로 약을 먹고 정기 혈액검사를 받으세요', href: '#/detail/chol' };
    const extra = dx.dm && L.glu != null && L.glu > 130 ? ` · 공복혈당 ${L.glu}는 목표(80–130)보다 높아요. 진료 때 알리세요` : '';
    const h = hs.find((x) => x.key !== 'glu' && x.key !== 'bp');
    return { tier: 5, tag: '관리 중', title: `${dxNames.join('·')} 관리가 가장 중요해요`, sub: `진단받은 질환은 꾸준한 관리가 첫째예요${extra}`, actions: h ? [manageAct, { t: h.t, d: h.d, href: h.href }] : [manageAct] };
  }

  // ── ③ 습관 바꾸기 ──
  if (hs.length) {
    const top = hs.slice(0, 2);
    const also = hiCmp.length ? `함께: ${checkFor(hiCmp[0])}` : undefined;
    return { tier: 3, tag: '습관 바꾸기', title: ifg && top[0].key === 'glu' ? '혈당이 조금 높아요 · 생활습관부터 챙기세요' : `${and(top.map((x) => x.short))}부터 챙기세요`,
      sub: '지금 병이 있다는 뜻은 아니에요. 앞으로를 위해 효과가 가장 큰 것부터예요.', actions: top.map(({ t, d, href }) => ({ t, d, href })), also };
  }

  // ── ④ 지금처럼 유지 ──
  // 칭찬: '…고, …고, …이에요' 한 문장 (명령처럼 들리지 않게)
  const good: [string, string][] = [inp.smoke === 'never' ? ['담배를 피우지 않고', '담배를 피우지 않아요'] : ['담배를 끊었고', '담배를 끊었어요'],
    ...(inp.exercise ? [['운동을 꾸준히 하고', '운동을 꾸준히 해요'] as [string, string]] : []),
    ...(b >= 18.5 && b < 25 && !waistHigh(inp) ? [['체중·허리둘레도 정상이고', '체중·허리둘레도 정상이에요'] as [string, string]] : [])];
  const praise = good.map((g, k) => (k === good.length - 1 ? g[1] : g[0])).join(', ');
  // 넣은 검진 수치가 모두 정상일 때만 칭찬 (하나라도 경계·이상이면 말하지 않음)
  const allNormal = (L.sbp == null || (L.sbp < 120 && L.dbp! < 80)) && (L.glu == null || L.glu < 100) && (L.tc == null || L.tc < 200) && (L.tg == null || L.tg < 150)
    && (L.hdl == null || L.hdl >= 40) && (L.egfr == null || L.egfr >= 60) && (L.upro == null || L.upro < 2);
  const labsOk = Object.keys(L).length > 0 && allNormal ? ' 넣은 검진 수치도 정상 범위예요.' : '';
  const F = inp.sex === 'F', a = inp.age;
  const bone = (F && (a >= 65 || [54, 60, 66].includes(a))) || (!F && a >= 70);
  const first = bone ? { t: '올해 골밀도 검사를 받으세요', d: `${F ? '여성 65세' : '남성 70세'} 이상은 건강보험이 적용돼요.`, href: '#/detail/osteo' }
    : hiCmp.length ? { t: checkFor(hiCmp[0]), href: `#/detail/${hiCmp[0]}` }
    : { t: '2년마다 국가건강검진을 받으세요', d: '혈압·혈당·콜레스테롤을 정기적으로 확인해요.' };
  return { tier: 4, tag: '잘하고 있어요', title: '잘 관리하고 계세요', sub: `${praise}.${labsOk} 지금처럼 유지하세요.`,
    actions: [first, { t: '지금 습관을 그대로 이어가세요', d: '좋은 습관이 앞으로의 위험을 가장 크게 낮춰요.' }] };
}
