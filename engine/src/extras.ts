/**
 * 1분체크 추가 체크 (spec.md §6-14). 입력을 늘리지 않고 기존 답으로 계산하는 기준·점수형 결과.
 * engine.ts 는 건드리지 않는다. 공식 정의·검증된 점수·진료지침을 그대로 적용한다.
 * 확률은 원문 표를 확인한 10년 당뇨 발생(Oh 2021) 하나만, 관찰 비율 그대로 보여준다.
 * 원칙: 확인 못 한 것은 '낮음'이 아니라 '모름'. 검진 '대상'으로 확정하지 않고 '권장 연령'으로 쓴다.
 * 근거별 원문 확인 상태는 docs/spec.md §6-14 표에 적는다.
 */
import type { Input } from './engine.ts';

/** 술: 화면에서 받은 횟수 × 한 번 양. 예전 기록에서는 없을 수 있다 */
export interface Drink {
  /** 한 번 술자리 잔 수 (소주 1잔 기준, 소주 1병 = 7잔, 맥주 500mL = 2잔, 와인 1잔 = 1잔) */
  perOccasion: number;
  /** 주당 술자리 횟수 (월 1회 이하 0.25 … 거의 매일 6.5) */
  timesPerWeek: number;
  /** 주당 알코올 g */
  gramsPerWeek: number;
}
/** 알코올 g: 소주 360mL·16.5%, 맥주 500mL·5%, 와인 150mL·12.5%, 에탄올 비중 0.789 */
export const ALCOHOL_G = { sojuBottle: 360 * 0.165 * 0.789, beer500: 500 * 0.05 * 0.789, wineGlass: 150 * 0.125 * 0.789 };

export type Level = 'look' | 'note' | 'ok';
export type Mark = 'yes' | 'maybe' | 'no' | 'unknown' | 'info';
export interface Extra {
  id: 'checkup' | 'alcohol' | 'metsyn' | 'lifestyle' | 'liver' | 'dementia' | 'ckd' | 'body' | 'dm10';
  name: string;
  level: Level;
  /** 오른쪽 위 꼬리표 (없으면 level 기본값) */
  tag?: string;
  /** 한 줄 결론 */
  head: string;
  /** 판단 근거 줄 */
  items: { t: string; s: Mark; sub?: string }[];
  action: string;
  source: string;
}

const bmiOf = (i: Input) => i.weightKg / (i.heightCm / 100) ** 2;
const htnYes = (i: Input) => i.dx.htn || i.bp === 'high';
const waistHigh = (i: Input) => i.waistCm != null && i.waistCm >= (i.sex === 'F' ? 85 : 90);
/** 엔진과 같은 우울 선별 기준: PHQ-9 10점 이상, PHQ-2 3점 이상 */
const depYes = (i: Input) => (i.mind ? (i.mind.phq.length === 9 ? i.mind.phq.reduce((a, b) => a + b, 0) >= 10 : i.mind.phq[0] + i.mind.phq[1] >= 3) : null);
/** 주당 잔 수. 자세한 답이 없으면 엔진 4단계로 범위만 */
const weekly = (i: Input, d?: Drink): [number, number] =>
  d ? [d.perOccasion * d.timesPerWeek, d.perOccasion * d.timesPerWeek]
    : ({ none: [0, 0], lt1: [0, 7], d1_4: [7, 35], d5: [35, 999] } as Record<Input['alcohol'], [number, number]>)[i.alcohol];

// ── 1. 맞춤 검진·접종 (국가암검진·일반건강검진·학회 권고·성인 예방접종) ──
export function checkup(i: Input): Extra {
  const a = i.age, F = i.sex === 'F', smoker = i.smoke !== 'never', b = bmiOf(i);
  const items: Extra['items'] = [];
  const add = (t: string, sub: string, s: Mark = 'yes') => items.push({ t, s, sub });
  add('일반건강검진', '2년마다 (혈압·혈당·간·콩팥 수치·소변)');
  // 혈당검사: 대한당뇨병학회(2023 개정) 35세 이상 성인, 위험인자가 있으면 19세 이상
  if (i.dx.dm) add('당뇨 합병증 검사', '매년 눈(안저)·콩팥(eGFR·소변 알부민)·발 검사');
  else {
    const why = [b >= 23 && '과체중', waistHigh(i) && '복부비만', i.famDM && '가족력', htnYes(i) && '고혈압', i.dx.chol && '고지혈증', i.exercise === false && '운동 부족'].filter(Boolean) as string[];
    if (a >= 35) add('혈당 검사 (공복혈당·당화혈색소)', '35세 이상은 매년 권장 · 전단계도 함께 알 수 있어요');
    else if (why.length) add('혈당 검사 (공복혈당·당화혈색소)', `위험요인(${why.join('·')})이 있어 매년 권장`);
  }
  if (htnYes(i) && !i.dx.dm) add('콩팥 검사 (eGFR·소변 알부민)', '고혈압이 있으면 정기적으로');
  if (a >= 40) add('위암 검진 · 위내시경', '40세부터 2년마다');
  if (a >= 50) add('대장암 검진 · 분변잠혈검사', '50세부터 매년. 양성이면 대장내시경');
  else if (a >= 45) add('대장암 검진', `50세부터 매년 (${50 - a}년 후)`, 'maybe');
  if (F && a >= 40) add('유방암 검진 · 유방촬영', '40세부터 2년마다');
  if (F) add('자궁경부암 검진 · 세포검사', '20세부터 2년마다');
  if (a >= 40) add('간암 검진 · 초음파+혈액검사', '간경변·B형·C형 간염이 있으면 6개월마다', 'maybe');
  if (smoker && a >= 54 && a <= 74) add('폐암 검진 · 저선량 CT', '흡연 30갑년 이상이면 2년마다', 'maybe');
  if (!i.dx.chol && ((a >= 24 && !F) || (a >= 40 && F))) add('콜레스테롤 혈액검사', `${F ? '여성 40세' : '남성 24세'}부터 4년마다`);
  // 골밀도: 대한골대사학회 여성 65·남성 70세 이상, 위험요인 있으면 폐경 후 여성·50세 이상 남성
  if ((F && a >= 65) || (!F && a >= 70)) add('골밀도 검사', `${F ? '여성 65세' : '남성 70세'} 이상 권장`);
  else if ((F && i.meno) || (!F && a >= 50)) add('골밀도 검사', `${F ? '폐경 후' : '50세 이상 남성'} · 저체중·흡연·골절 등 위험요인이 있으면`, 'maybe');
  if (a === 40) add('B형간염 검사', '40세 검진에 포함');
  if (a % 10 === 0 && a >= 20 && a <= 70) add('우울증 검사', `${a}세 검진에 포함`);
  if (a >= 66) add('인지기능 검사', '66세부터 2년마다');
  add('독감 예방접종', a >= 65 ? '매년 가을 (65세 이상 무료)' : '매년 가을');
  if (a >= 65) add('폐렴구균 예방접종', '65세 이상 무료 1회 (보건소)');
  if (a >= 50) add('대상포진 예방접종', '50세 이상 권장');
  add('파상풍(Td/Tdap) 예방접종', '10년마다');
  if (F && a <= 26) add('HPV 예방접종', '26세 이하 여성');
  const vac = items.filter((x) => x.t.includes('접종')).length;
  return { id: 'checkup', name: '나에게 맞는 검진·접종', level: 'note', tag: '권장 연령 기준',
    head: `${a}세 ${F ? '여성' : '남성'} 권장 검사 ${items.length - vac}개 · 접종 ${vac}개`,
    items, action: '이미 받았거나 개인 사정(수술·질환)이 있으면 다를 수 있어요. 올해 국가검진 대상인지는 ‘The건강보험’ 앱에서 확인하세요.',
    source: '국립암센터 국가암검진, 국민건강보험 일반건강검진, 대한당뇨병학회 진료지침(2023 개정), 대한골대사학회 권고, 질병관리청 성인 예방접종' };
}

// ── 2. 음주 (국민건강영양조사 고위험음주·월간폭음 정의) ──
export function alcohol(i: Input, d?: Drink): Extra | null {
  if (i.alcohol === 'none') return null;
  const F = i.sex === 'F', th = F ? 5 : 7, wk = weekly(i, d);
  const items: Extra['items'] = [];
  let level: Level = 'ok', head = '';
  if (d) {
    const binge = d.perOccasion >= th;
    const twice: Mark = d.timesPerWeek >= 3.5 ? 'yes' : d.timesPerWeek >= 1.5 ? 'maybe' : 'no';
    const high: Mark = binge ? twice : 'no';
    items.push({ t: `한 번에 ${F ? '5' : '7'}잔 이상 (폭음)`, s: binge ? 'yes' : 'no', sub: `한 번에 약 ${Math.round(d.perOccasion * 10) / 10}잔` });
    items.push({ t: '그렇게 주 2회 이상 (고위험음주)', s: high, sub: high === 'maybe' ? '주 1–2회라 주 2회면 해당' : undefined });
    items.push({ t: `주 ${F ? 10 : 14}잔 이상 (사망 위험 연구의 고위험 기준)`, s: wk[0] >= (F ? 10 : 14) ? 'yes' : 'no', sub: `주 약 ${Math.round(wk[0])}잔` });
    level = high === 'yes' || binge || wk[0] >= (F ? 10 : 14) ? 'look' : 'ok';
    head = high === 'yes' ? '고위험음주에 해당해요' : binge ? '폭음에 해당해요' : level === 'look' ? '주간 음주량이 많아요' : '고위험음주는 아니에요';
  } else {
    level = i.alcohol === 'd5' ? 'look' : 'note';
    head = i.alcohol === 'd5' ? '하루 평균 5잔 이상이에요' : '음주 습관을 다시 답하면 자세히 볼 수 있어요';
    items.push({ t: '하루 평균', s: i.alcohol === 'd5' ? 'yes' : 'unknown', sub: { lt1: '1잔 미만', d1_4: '1–4.9잔', d5: '5잔 이상' }[i.alcohol] });
  }
  return { id: 'alcohol', name: '술', level, tag: level === 'ok' ? '해당 없음' : undefined, head, items,
    action: level === 'look' ? '한 번에 마시는 양부터 줄이세요. 줄이기 어렵다면 보건소 절주 상담을 이용할 수 있어요.' : '지금처럼 한 번에 마시는 양을 적게 유지하세요. 적게 마실수록 좋아요.',
    source: '질병관리청 국민건강영양조사 고위험음주·월간폭음 정의, Kim 2020 (사망 위험 연구)' };
}

// ── 3. 대사증후군 (한국 기준: 허리 남 90·여 85cm, 혈압 130/85, 공복혈당 100, 중성지방 150, HDL 남 40·여 50) ──
export function metsyn(i: Input): Extra {
  const F = i.sex === 'F';
  const waist: Mark = i.waistCm == null ? 'unknown' : waistHigh(i) ? 'yes' : 'no';
  const bp: Mark = htnYes(i) ? 'yes' : i.bp === 'elevated' ? 'maybe' : i.bp === 'normal' ? 'no' : 'unknown';
  const glu: Mark = i.dx.dm ? 'yes' : 'unknown';
  const items: Extra['items'] = [
    { t: `허리 ${F ? '85' : '90'}cm 이상`, s: waist, sub: i.waistCm == null ? undefined : `${i.waistCm}cm` },
    { t: '혈압 130/85 이상 또는 약 복용', s: bp, sub: bp === 'maybe' ? '‘주의’ 범위라 130/85를 넘는지 확인' : undefined },
    { t: '공복혈당 100 이상 또는 당뇨 치료', s: glu, sub: glu === 'unknown' ? '혈액검사로 확인' : undefined },
    { t: '중성지방 150 이상', s: 'unknown', sub: '혈액검사로 확인 (고지혈증 진단만으로는 알 수 없어요)' },
    { t: `HDL 콜레스테롤 ${F ? '50' : '40'} 미만`, s: 'unknown', sub: '혈액검사로 확인' },
  ];
  const y = items.filter((x) => x.s === 'yes').length;
  const head = y >= 3 ? '대사증후군 기준에 해당해요' : y === 2 ? '5개 중 2개 해당 · 혈액검사 1개만 더 나오면 대사증후군' : y === 1 ? '5개 중 1개 해당 · 나머지는 혈액검사로 확인' : '확인된 기준은 없어요 · 혈액 기준 3개는 검사로 확인';
  return { id: 'metsyn', name: '대사증후군', level: y >= 2 ? 'look' : 'note', head, items,
    action: y >= 2 ? '건강검진 결과지의 공복혈당·중성지방·HDL 콜레스테롤을 확인해 보세요. 3개 이상이면 대사증후군이에요.' : '건강검진 때 혈액 3가지(공복혈당·중성지방·HDL)를 함께 확인하세요.',
    source: '대한비만학회 허리둘레 기준, NCEP-ATP III 수정 기준 (5개 중 3개 이상)' };
}

// ── 4. 생활습관 위험 (Kim 2020, 국민건강영양조사–사망 연계 3.7만 명) ──
export function lifestyle(i: Input, d?: Drink): Extra {
  const F = i.sex === 'F', b = bmiOf(i), wk = weekly(i, d), heavy = F ? 10 : 14;
  const items: Extra['items'] = [
    { t: '지금 흡연', s: i.smoke === 'current' ? 'yes' : 'no' },
    { t: `술 주 ${heavy}잔 이상`, s: wk[0] >= heavy ? 'yes' : wk[1] < heavy ? 'no' : 'maybe' },
    { t: '체중이 정상 범위 밖 (BMI 18.5 미만·25 이상)', s: b < 18.5 || b >= 25 ? 'yes' : 'no', sub: `BMI ${(Math.round(b * 10) / 10).toFixed(1)}` },
    { t: '운동 부족', s: i.exercise === false ? 'yes' : i.exercise == null ? 'unknown' : 'no', sub: '연구 기준은 주 150분 · 앱은 주 2회·30분으로 물어요' },
    { t: '수면 7시간 미만·9시간 이상', s: 'unknown', sub: '이 앱에서는 묻지 않아요' },
  ];
  const n = items.filter((x) => x.s === 'yes').length;
  const head = n >= 4 ? '해로운 습관 4개 · 사망 위험이 약 2배인 그룹이에요' : n === 0 ? '확인된 해로운 습관이 없어요' : `해로운 습관 ${n}개`;
  const first = items.find((x) => x.s === 'yes');
  return { id: 'lifestyle', name: '생활습관 위험', level: n >= 2 ? 'look' : n === 1 ? 'note' : 'ok', tag: n === 0 ? '확인된 것 없음' : undefined, head, items,
    action: first ? `하나씩 줄일수록 위험이 내려가요. ${first.t.startsWith('지금 흡연') ? '금연이 가장 효과가 커요(보건소 금연클리닉 무료).' : '가장 쉬운 것부터 하나 바꿔 보세요.'}` : '지금 습관을 유지하세요.',
    source: 'Kim 2020 (국민건강영양조사–사망 연계): 해로운 습관 4–5개면 0개보다 전체 사망 2.01배, 심혈관 사망 2.59배' };
}

// ── 5. 간: 술 양(2023 MASLD·MetALD 명명) + 간 섬유화 평가가 필요한 위험군(EASL–EASD–EASO 2024) ──
export function liver(i: Input, d?: Drink): Extra | null {
  const F = i.sex === 'F', lo = F ? 140 : 210, hi = F ? 350 : 420;
  // 섬유화 case-finding: 2형 당뇨, 또는 복부비만 + 대사 위험요인 1개 이상
  const fib = i.dx.dm || (waistHigh(i) && (htnYes(i) || i.dx.chol || bmiOf(i) >= 25));
  const items: Extra['items'] = [];
  let band: 'none' | 'masld' | 'metald' | 'ald' | 'unknown' = 'none';
  if (i.alcohol !== 'none') {
    if (d) {
      const g = d.gramsPerWeek;
      band = g > hi ? 'ald' : g >= lo ? 'metald' : 'masld';
      items.push({ t: '주당 알코올', s: 'info', sub: `약 ${Math.round(g)}g` });
      items.push({ t: `대사+술 지방간 범위 (${lo}–${hi}g)`, s: band === 'metald' ? 'yes' : 'no' });
      items.push({ t: `알코올 간질환 범위 (${hi}g 초과)`, s: band === 'ald' ? 'yes' : 'no' });
    } else {
      band = i.alcohol === 'd5' ? 'ald' : 'unknown';
      items.push({ t: '하루 평균 5잔 이상', s: i.alcohol === 'd5' ? 'yes' : 'unknown' });
    }
  }
  if (fib) items.push({ t: '간 섬유화 평가가 필요한 위험군', s: 'yes', sub: i.dx.dm ? '당뇨' : '복부비만 + 대사 위험요인' });
  if (band === 'none' && !fib) return null;
  const alcLook = band === 'metald' || band === 'ald';
  const head = band === 'ald' ? '술 때문에 생기는 간질환 범위의 음주량이에요' : band === 'metald' ? '지방간이 있다면 ‘대사+술’ 지방간(MetALD) 범위예요'
    : fib ? '간 섬유화(간이 굳는 정도) 평가를 상담해 볼 위험군이에요' : '지방간이 있어도 술 때문으로 보지 않는 양이에요';
  const acts = [alcLook && '간 수치 검사를 받아 보세요. 술을 이 범위 아래로 줄이면 간이 회복될 수 있어요.',
    fib && '진료 때 간 섬유화 검사(FIB-4 혈액 계산, 간 탄력도 검사)가 필요한지 물어보세요.'].filter(Boolean) as string[];
  return { id: 'liver', name: '간', level: alcLook || fib ? 'look' : 'ok', tag: !alcLook && !fib ? '해당 없음' : undefined, head, items,
    action: acts.join(' ') || '술보다 체중·허리 관리가 간에 더 중요해요.',
    source: 'MASLD·MetALD 명명 합의 (2023): 주당 알코올 여 140–350g·남 210–420g = MetALD. EASL–EASD–EASO 2024: 2형 당뇨·복부비만+대사 위험이면 섬유화 평가' };
}

// ── 6. 치매 위험요인 (Lancet 위원회 2024, 바꿀 수 있는 위험요인 14개 중 앱에서 볼 수 있는 8개) ──
export function dementia(i: Input, d?: Drink): Extra {
  const wk = d ? d.gramsPerWeek : null;
  const dep = depYes(i);
  const items: Extra['items'] = [
    { t: '고혈압', s: htnYes(i) ? 'yes' : i.bp === 'unknown' ? 'unknown' : 'no' },
    { t: '당뇨', s: i.dx.dm ? 'yes' : 'no' },
    { t: '높은 LDL 콜레스테롤', s: i.dx.chol ? 'yes' : 'unknown' },
    { t: '흡연', s: i.smoke === 'current' ? 'yes' : 'no' },
    { t: '과음 (주 알코올 168g 초과)', s: wk != null ? (wk > 168 ? 'yes' : 'no') : i.alcohol === 'd5' ? 'yes' : i.alcohol === 'd1_4' ? 'maybe' : 'no' },
    { t: '비만 (BMI 30 이상)', s: bmiOf(i) >= 30 ? 'yes' : 'no' },
    { t: '운동 부족', s: i.exercise === false ? 'yes' : i.exercise == null ? 'unknown' : 'no' },
    { t: '우울', s: dep == null ? 'unknown' : dep ? 'yes' : 'no', sub: dep == null ? '마음 질문에 답하면 확인' : undefined },
  ];
  const n = items.filter((x) => x.s === 'yes').length;
  return { id: 'dementia', name: '치매 위험요인', level: n >= 2 ? 'look' : n === 1 ? 'note' : 'ok', tag: n === 0 ? '확인된 것 없음' : undefined,
    head: n ? `바꿀 수 있는 위험요인 ${n}개 해당` : '앱에서 볼 수 있는 위험요인은 없어요', items,
    action: '청력·시력 저하도 위험요인이에요. 잘 안 들리거나 안 보이면 검사받고 보청기·안경으로 교정하세요. 치매 위험의 약 45%는 이런 요인을 바꿔서 줄일 수 있어요.',
    source: 'Livingston 2024 Lancet 위원회 (14개 요인, 예방 가능 약 45%). 학력·청력·시력·두부 외상·대기오염·사회적 고립은 묻지 않아요. 확률이 아니에요' };
}

// ── 7. 콩팥 (Kwon 2012 한국 만성콩팥병 선별 점수 4점↑ + KDIGO 2024: 당뇨·고혈압이면 검사) ──
export function ckd(i: Input): Extra {
  const a = i.age, ageP = a >= 70 ? 4 : a >= 60 ? 3 : a >= 50 ? 2 : 0;
  const items: Extra['items'] = [
    { t: '나이', s: ageP ? 'yes' : 'no', sub: `${ageP}점` },
    { t: '여성', s: i.sex === 'F' ? 'yes' : 'no', sub: i.sex === 'F' ? '1점' : '0점' },
    { t: '고혈압', s: htnYes(i) ? 'yes' : 'no', sub: htnYes(i) ? '1점' : '0점' },
    { t: '당뇨', s: i.dx.dm ? 'yes' : 'no', sub: i.dx.dm ? '1점' : '0점' },
    { t: '빈혈·단백뇨·심혈관질환', s: 'unknown', sub: '각 1점 · 앱에서 묻지 않아 0점으로 계산' },
  ];
  const s = ageP + (i.sex === 'F' ? 1 : 0) + (htnYes(i) ? 1 : 0) + (i.dx.dm ? 1 : 0);
  const kdigo = htnYes(i) || i.dx.dm;
  return { id: 'ckd', name: '콩팥', level: s >= 4 ? 'look' : kdigo || s === 3 ? 'note' : 'ok', tag: s < 4 && !kdigo && s < 3 ? '기준 아래' : undefined,
    head: s >= 4 ? `선별 점수 ${s}점 이상 · 콩팥 기능 검사 권장 기준(4점)이에요` : s === 3 ? `선별 점수 최소 ${s}점 · 1개만 더 해당하면 검사 권장` : `선별 점수 최소 ${s}점 · 검사 권장 기준(4점) 아래`, items,
    action: [s >= 4 && '고위험으로 나온 사람 5명 중 약 1명이 실제로 콩팥 기능이 떨어져 있었어요.', kdigo && '당뇨·고혈압이 있으면 점수와 상관없이 혈액 eGFR와 소변 알부민 검사로 콩팥을 정기적으로 확인하세요.',
      !kdigo && s < 4 && '빈혈·단백뇨가 있으면 점수가 올라가요. 건강검진의 eGFR·요단백 결과를 함께 보세요.'].filter(Boolean).join(' '),
    source: 'Kwon 2012 Nephrology (국민건강영양조사, eGFR<60 선별, 4점 이상 민감도 89%·양성예측도 19%), KDIGO 2024 만성콩팥병 지침' };
}

// ── 8. 체형: 허리/키 비율(NICE NG246) · 정상 체중 복부비만 · 저체중 ──
export function body(i: Input): Extra | null {
  if (i.waistCm == null) return null;
  const r = i.waistCm / i.heightCm, b = bmiOf(i), rr = Math.round(r * 100) / 100;
  const band = r >= 0.6 ? 'high' : r >= 0.5 ? 'up' : 'ok';
  const normalButBelly = b >= 18.5 && b < 23 && (band !== 'ok' || waistHigh(i));
  const items: Extra['items'] = [
    { t: '허리/키 비율', s: 'info', sub: `${i.waistCm} ÷ ${i.heightCm} = ${rr.toFixed(2)}` },
    { t: '0.5 이상 (건강 위험 증가)', s: band === 'up' ? 'yes' : 'no' },
    { t: '0.6 이상 (건강 위험 더 증가)', s: band === 'high' ? 'yes' : 'no' },
  ];
  if (b < 18.5) items.push({ t: '저체중 (BMI 18.5 미만)', s: 'yes', sub: `BMI ${(Math.round(b * 10) / 10).toFixed(1)}` });
  const head = normalButBelly ? '체중은 정상인데 배에 지방이 많은 편이에요' : band === 'high' ? `허리/키 비율 ${rr.toFixed(2)} · 건강 위험이 더 높은 구간` : band === 'up' ? `허리/키 비율 ${rr.toFixed(2)} · 건강 위험이 높아지는 구간` : b < 18.5 ? '저체중이에요' : `허리/키 비율 ${rr.toFixed(2)} · 0.5 미만`;
  const look = band !== 'ok' || b < 18.5;
  return { id: 'body', name: '체형 · 허리/키 비율', level: look ? 'look' : 'ok', tag: look ? undefined : '기준 아래', head, items,
    action: b < 18.5 ? '식사량과 영양 상태를 진료나 보건소 영양 상담에서 확인해 보세요. 의도하지 않게 체중이 줄었다면 진료가 필요해요.'
      : band !== 'ok' ? `허리를 키의 절반(${Math.round(i.heightCm / 2)}cm) 아래로 유지하는 게 목표예요. 체중보다 허리가 대사 위험을 더 잘 보여줘요.` : '허리를 키의 절반 아래로 유지하세요.',
    source: 'NICE NG246 (2025): BMI 35 미만 성인에서 허리/키 비율 0.4–0.49 건강, 0.5–0.59 위험 증가, 0.6 이상 높음. 대한비만학회 허리 기준. 질병 확률이 아니에요' };
}

// ── 9. 10년 안에 당뇨가 생긴 비율 (Oh 2021 KDR 점수, KoGES 안성·안산, 40–69세) ──
const KDR = {
  M: { age: [0, 4, 7, 12, 17, 25], urban: 17, smoke: { past: 8, current: 14 }, bp: { pre: 11, htn: 20 }, fam: 12, waist: 12, risk: [8.9, 20.6, 24.3, 23.4, 34.8, 28.8, 34.9] },
  F: { age: [0, 5, 10, 8, 18, 20], urban: 19, smoke: { past: 9, current: 13 }, bp: { pre: 10, htn: 19 }, fam: 15, waist: 14, risk: [10.8, 24.1, 21.5, 27.4, 26.9, 28.6, 38.3] },
};
/** 점수 → 표 4의 점수 구간(≤24, 25–29, …, ≥50) */
const kdrBand = (s: number) => (s <= 24 ? 0 : s >= 50 ? 6 : Math.floor((s - 25) / 5) + 1);
export function kdrScore(i: Input, bp: 'normal' | 'pre' | 'htn') {
  const K = KDR[i.sex];
  return K.age[Math.floor((i.age - 40) / 5)] + K.urban + (i.smoke === 'never' ? 0 : K.smoke[i.smoke]) + (bp === 'normal' ? 0 : K.bp[bp])
    + (i.famDM ? K.fam : 0) + (waistHigh(i) ? K.waist : 0);
}
export function dm10(i: Input): Extra | null {
  if (i.dx.dm || i.age < 40 || i.age > 69 || i.waistCm == null) return null;
  const K = KDR[i.sex];
  const bps: ('normal' | 'pre' | 'htn')[] = htnYes(i) ? ['htn'] : i.bp === 'elevated' ? ['pre'] : i.bp === 'normal' ? ['normal'] : ['normal', 'pre', 'htn'];
  const ss = bps.map((b) => kdrScore(i, b)), rs = ss.map((s) => K.risk[kdrBand(s)]);
  const lo = Math.min(...rs), hi = Math.max(...rs), avg = 22.7;
  const pct = lo === hi ? `${lo}%` : `${lo}–${hi}%`;
  return { id: 'dm10', name: '10년 안에 당뇨가 생길 가능성', level: hi > avg ? 'look' : 'note', tag: '참고 · 정확도 낮음',
    head: `비슷한 점수였던 사람 중 ${pct}가 10년 안에 당뇨가 됐어요`,
    items: [
      { t: '점수', s: 'info', sub: `${ss.length > 1 ? `${Math.min(...ss)}–${Math.max(...ss)}` : ss[0]}점 / 100 (도시 거주로 계산${ss.length > 1 ? ', 혈압을 몰라 범위로' : ''})` },
      { t: '연구 참가자 전체 평균', s: 'info', sub: `${avg}%` },
      { t: '이 점수의 정확도', s: 'info', sub: 'AUC 0.66 · 당뇨가 생긴 사람과 안 생긴 사람을 3번 중 2번 정도만 맞게 구분해요' },
    ],
    action: '이 숫자보다 혈당 검사가 더 정확해요. 공복혈당·당화혈색소를 확인하면 전단계인지도 알 수 있어요. 허리를 줄이고 금연하면 점수가 내려가요.',
    source: 'Oh 2021 J Diabetes Investig 12:610 (KoGES 안성·안산 40–69세, 2001년 시작, 9.7년 추적). 점수별 비율은 검증군의 실제 발생 비율이고, 혈당부하검사까지 해서 진단해 일반 검진보다 높게 나올 수 있어요' };
}

/** 모든 추가 체크. 순서: 검진 → 주의가 필요한 것 → 나머지 */
export function runExtras(i: Input, d?: Drink): Extra[] {
  const xs = [dm10(i), alcohol(i, d), metsyn(i), body(i), lifestyle(i, d), liver(i, d), dementia(i, d), ckd(i)].filter((x): x is Extra => !!x);
  const rank = { look: 0, note: 1, ok: 2 };
  return [checkup(i), ...xs.sort((a, b) => rank[a.level] - rank[b.level])];
}
