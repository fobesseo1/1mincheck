// 실행: npx tsx --test test/extras.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as X from '../src/extras.ts';
import type { Input } from '../src/engine.ts';

const base = (o: Partial<Input>): Input => ({
  age: 49, sex: 'F', heightCm: 160, weightKg: 62, waistCm: 81.3, smoke: 'never', alcohol: 'none', famDM: false,
  dx: { htn: false, dm: false, chol: false }, bp: 'unknown', exercise: true, meno: false, ...o,
});
const yes = (e: X.Extra) => e.items.filter((x) => x.s === 'yes').map((x) => x.t);

test('알코올 g: 소주 1병 ≈ 46.9g, 맥주 500mL ≈ 19.7g, 와인 1잔 ≈ 14.8g', () => {
  assert.equal(Math.round(X.ALCOHOL_G.sojuBottle * 10) / 10, 46.9);
  assert.equal(Math.round(X.ALCOHOL_G.beer500 * 10) / 10, 19.7);
  assert.equal(Math.round(X.ALCOHOL_G.wineGlass * 10) / 10, 14.8);
});

test('검진: 49세 여성 → 위·유방·자궁경부, 대장은 1년 후, 콜레스테롤·혈당 검사', () => {
  const e = X.checkup(base({}));
  const t = e.items.map((x) => x.t).join('|');
  for (const k of ['위암', '유방암', '자궁경부암', '콜레스테롤', '혈당 검사', '독감', '파상풍']) assert.ok(t.includes(k), k);
  assert.ok(!t.includes('골밀도'));   // 폐경 전 49세 여성
  assert.ok(e.items.find((x) => x.t === '대장암 검진')!.sub!.includes('1년 후'));
  assert.ok(!t.includes('폐렴구균') && !t.includes('대상포진') && !t.includes('폐암'));
});
test('검진: 60세 남성 흡연자 → 폐암 확인, 대상포진, 유방·자궁경부 없음', () => {
  const t = X.checkup(base({ age: 60, sex: 'M', smoke: 'current' })).items.map((x) => x.t).join('|');
  assert.ok(t.includes('폐암') && t.includes('대상포진') && t.includes('우울증 검사'));
  assert.ok(!t.includes('유방암') && !t.includes('자궁경부암'));
});
test('검진: 혈당검사는 35세 이상 또는 위험요인 있는 19세 이상 · 당뇨 진단자는 합병증 검사', () => {
  const has = (o: Partial<Input>, k: string) => X.checkup(base(o)).items.some((x) => x.t.includes(k));
  assert.ok(!has({ age: 25, weightKg: 50, waistCm: 70 }, '혈당 검사'));          // 25세, 위험요인 없음
  assert.ok(has({ age: 25, weightKg: 70, waistCm: 70 }, '혈당 검사'));           // BMI 27
  assert.ok(has({ dx: { htn: false, dm: true, chol: false } }, '당뇨 합병증 검사'));
  assert.ok(has({ age: 66 }, '골밀도') && has({ meno: true }, '골밀도'));
});
test('검진: 보건복지부 기준 — 골밀도 여 54·60·66세, 우울 20–34세 2년마다, 독감은 50세↑ 또는 위험군', () => {
  const item = (o: Partial<Input>, k: string) => X.checkup(base(o)).items.find((x) => x.t.includes(k));
  assert.ok(item({ age: 60, meno: true }, '골밀도')!.sub!.includes('국가검진'));
  assert.ok(item({ age: 25 }, '우울증')!.sub!.includes('2년마다'));
  assert.ok(item({ age: 37 }, '우울증')!.sub!.includes('35–39세'));
  assert.equal(item({ age: 52, meno: true, weightKg: 45 }, '골밀도')!.s, 'yes');      // 폐경 + BMI 17.6 → 급여 대상
  assert.equal(item({ age: 52, meno: true }, '골밀도')!.s, 'maybe');
  assert.equal(item({ age: 40 }, '독감')!.s, 'maybe');
  assert.equal(item({ age: 52 }, '독감')!.s, 'yes');
  assert.equal(item({ age: 40, dx: { htn: false, dm: true, chol: false } }, '독감')!.s, 'yes');
});

test('음주: 남성 주 3–4회 × 소주 1병(7잔) = 고위험음주', () => {
  const d = { perOccasion: 7, timesPerWeek: 3.5, gramsPerWeek: 3.5 * X.ALCOHOL_G.sojuBottle };
  const e = X.alcohol(base({ sex: 'M', alcohol: 'd1_4' }), d)!;
  assert.equal(e.head, '고위험음주에 해당해요'); assert.equal(e.level, 'look');
});
test('음주: 여성 월 2–4회 × 맥주 1캔(2잔) = 해당 없음', () => {
  const e = X.alcohol(base({ alcohol: 'lt1' }), { perOccasion: 2, timesPerWeek: 0.7, gramsPerWeek: 0.7 * X.ALCOHOL_G.beer500 })!;
  assert.equal(e.level, 'ok');
  assert.equal(X.alcohol(base({}), undefined), null);   // 안 마시면 카드 없음
});

test('대사증후군: 허리 92·혈압 높음·당뇨 진단 남성 = 3개 → 해당', () => {
  const e = X.metsyn(base({ sex: 'M', waistCm: 92, bp: 'high', dx: { htn: false, dm: true, chol: false } }));
  assert.equal(yes(e).length, 3); assert.equal(e.head, '대사증후군 기준에 해당해요');
});
test('대사증후군: 예시 A(허리 81.3 여성, 혈압 모름) = 확인된 기준 없음, 그래도 ‘양호’가 아니라 ‘참고’', () => {
  const e = X.metsyn(base({}));
  assert.equal(e.level, 'note'); assert.ok(e.head.includes('검사로 확인'));
});

test('생활습관: 흡연·과음·BMI 27·운동 안 함 = 4개 → 사망 위험 약 2배 그룹', () => {
  const e = X.lifestyle(base({ sex: 'M', heightCm: 170, weightKg: 78, smoke: 'current', alcohol: 'd5', exercise: false }));
  assert.equal(yes(e).length, 4); assert.ok(e.head.includes('약 2배'));
});

test('간: 남성 주 5병(234g) = MetALD 범위, 여성 주 1병 = 해당 없음', () => {
  const g = (n: number) => ({ perOccasion: 7, timesPerWeek: n, gramsPerWeek: n * X.ALCOHOL_G.sojuBottle });
  assert.ok(X.liver(base({ sex: 'M', alcohol: 'd1_4' }), g(5))!.head.includes('MetALD'));
  assert.equal(X.liver(base({ alcohol: 'd1_4' }), g(1))!.level, 'ok');
  assert.equal(X.liver(base({}), undefined), null);                                            // 안 마시고 섬유화 위험군 아님
  assert.ok(X.liver(base({ dx: { htn: false, dm: true, chol: false } }))!.head.includes('섬유화'));  // 당뇨면 술과 상관없이
  assert.ok(X.liver(base({ sex: 'M', alcohol: 'd5' }), g(10))!.head.includes('술 때문에 생기는 간질환'));   // 469g > 420g
});

test('치매 위험요인: 고혈압·당뇨·흡연·운동 부족 = 4개', () => {
  const e = X.dementia(base({ dx: { htn: true, dm: true, chol: false }, smoke: 'current', exercise: false }));
  assert.deepEqual(yes(e), ['고혈압', '당뇨', '흡연', '운동 부족']);
});

test('콩팥: 65세 여성 = 3+1 = 4점 → 검사 권장, 49세 여성 = 최소 1점(낮다고 하지 않음), 고혈압이면 KDIGO 안내', () => {
  assert.equal(X.ckd(base({ age: 65 })).level, 'look');
  const e = X.ckd(base({}));
  assert.ok(e.head.startsWith('선별 점수 최소 1점') && !e.head.includes('낮'));
  assert.ok(X.ckd(base({ dx: { htn: true, dm: false, chol: false } })).action.includes('소변 알부민'));
});

test('체형: 160cm 허리 81.3 = 0.51 위험 증가, 정상 BMI(21) + 허리 85 = 정상 체중 복부지방, 저체중 안내', () => {
  assert.ok(X.body(base({}))!.head.includes('0.51'));
  assert.ok(X.body(base({ weightKg: 54, waistCm: 85 }))!.head.includes('체중은 정상'));
  assert.ok(X.body(base({ weightKg: 45, waistCm: 66 }))!.action.includes('영양'));
});

test('10년 당뇨 (Oh 2021): 표 3 점수 · 표 4 비율', () => {
  // 49세 여성: 나이 45–49 +5, 도시 +19 = 24점 → ≤24 구간 10.8% (혈압 정상)
  assert.equal(X.kdrScore(base({ bp: 'normal' }), 'normal'), 24);
  assert.ok(X.dm10(base({ bp: 'normal' }))!.head.includes('10.8%'));
  // 59세 남성 흡연·고혈압·가족력·허리 92: 12+17+14+20+12+12 = 87 → ≥50 34.9%
  const m = base({ age: 59, sex: 'M', smoke: 'current', bp: 'high', famDM: true, waistCm: 92 });
  assert.equal(X.kdrScore(m, 'htn'), 87); assert.ok(X.dm10(m)!.head.includes('34.9%'));
  // 혈압 모름이면 범위, 40세 미만·70세 이상·당뇨 진단자는 없음
  assert.ok(X.dm10(base({}))!.head.includes('–'));
  assert.equal(X.dm10(base({ age: 35 })), null);
  assert.equal(X.dm10(base({ dx: { htn: false, dm: true, chol: false } })), null);
});

test('검진 수치: 대사증후군 5개가 모두 확인되고, 콩팥은 eGFR·요단백이 점수보다 우선', () => {
  const m = X.metsyn(base({ sex: 'M', waistCm: 92 }), { sbp: 128, dbp: 82, glu: 104, tg: 180, hdl: 45 });
  assert.deepEqual(m.items.map((x) => x.s), ['yes', 'no', 'yes', 'yes', 'no']);
  assert.equal(m.head, '대사증후군 기준에 해당해요');
  const ok = X.metsyn(base({}), { sbp: 118, dbp: 76, glu: 92, tg: 100, hdl: 60 });
  assert.equal(ok.tag, '기준 아래');
  assert.ok(X.ckd(base({}), { egfr: 55 }).head.startsWith('eGFR 55'));
  assert.equal(X.ckd(base({}), { egfr: 95, upro: 0 }).tag, '이번 검사 정상 범위');
  // eGFR 없이 요단백만 양성이어도 재검 안내 (단일 검사로 만성콩팥병이라고 하지 않는다)
  const up = X.ckd(base({ age: 55, sex: 'M' }), { upro: 2 });
  assert.equal(up.level, 'look'); assert.ok(up.head.includes('재검') && up.action.includes('한 번의 검사로는 만성콩팥병이라고 하지 않아요'));
  assert.equal(X.ckd(base({}), { upro: 3 }).level, 'look');
  assert.equal(X.ckd(base({}), { upro: 1 }).level, 'note');                           // ± 는 재검 권유
  assert.ok(!X.dementia(base({ dx: { htn: false, dm: false, chol: true } })).items.some((x) => x.t === '높은 LDL 콜레스테롤'));   // 측정 안 한 LDL 을 측정한 것처럼 쓰지 않음
  assert.equal(X.dm10(base({ bp: 'normal' }), { glu: 130 }), null);
  assert.ok(X.dm10(base({}), { sbp: 112, dbp: 72 })!.head.includes('10.8%'));          // 검진 혈압 정상 → 범위 대신 한 값
  assert.ok(!X.dm10(base({}), { sbp: 128, dbp: 76 })!.head.includes('–'));
  assert.ok(X.dm10(base({}), { sbp: 128, dbp: 76 })!.items[0].sub!.includes('검진 혈압 128/76'));                   // 이미 당뇨 기준이면 10년 발생 카드 없음
});

test('runExtras: 검진이 맨 앞, 주의 항목이 그다음', () => {
  const xs = X.runExtras(base({ sex: 'M', age: 66, waistCm: 95, bp: 'high', smoke: 'current', alcohol: 'd5', exercise: false }));
  assert.equal(xs[0].id, 'checkup');
  assert.equal(xs[1].level, 'look');
});

test('4년 고혈압 (Lim 2013): 표 3 점수 · 위험', () => {
  // 49세 여성(BMI 23.4)·비흡연, 검진 118/76: 수축기 115–119 +2, BMI 0, 45–49×75–79 +3, 여성 +1 = 6 → 12.3%
  const f = base({});
  assert.equal(X.htn4Score(f, 118, 76, 0), 6);
  assert.ok(X.htn4(f, { sbp: 118, dbp: 76 })!.head.includes('12.3%'));
  assert.ok(X.htn4(f, { sbp: 118, dbp: 76 })!.items[1].sub!.includes('17.5%'));   // 부모 한 분 +2 → 8점
  // 표 양 끝: 최저 −3 → 2.3%, 최고 24 → 98.5%, 인쇄 오류 3점 → 7.1%
  assert.equal(X.htn4Risk(-3), 2.3); assert.equal(X.htn4Risk(24), 98.5); assert.equal(X.htn4Risk(3), 7.1);
  // 검진 혈압 없음·140/90 이상·고혈압 진단·나이 범위 밖이면 없음
  assert.equal(X.htn4(f), null);
  assert.equal(X.htn4(f, { sbp: 142, dbp: 80 }), null);
  assert.equal(X.htn4(base({ dx: { htn: true, dm: false, chol: false } }), { sbp: 118, dbp: 76 }), null);
  assert.equal(X.htn4(base({ age: 35 }), { sbp: 118, dbp: 76 }), null);
});
