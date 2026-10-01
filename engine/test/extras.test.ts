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

test('검진: 49세 여성 → 위·유방·자궁경부, 대장은 1년 후, 콜레스테롤 검사', () => {
  const e = X.checkup(base({}));
  const t = e.items.map((x) => x.t).join('|');
  for (const k of ['위암', '유방암', '자궁경부암', '콜레스테롤', '독감', '파상풍']) assert.ok(t.includes(k), k);
  assert.ok(e.items.find((x) => x.t === '대장암 검진')!.sub!.includes('1년 후'));
  assert.ok(!t.includes('폐렴구균') && !t.includes('대상포진') && !t.includes('폐암'));
});
test('검진: 60세 남성 흡연자 → 폐암 확인, 대상포진, 유방·자궁경부 없음', () => {
  const t = X.checkup(base({ age: 60, sex: 'M', smoke: 'current' })).items.map((x) => x.t).join('|');
  assert.ok(t.includes('폐암') && t.includes('대상포진') && t.includes('우울증 검사'));
  assert.ok(!t.includes('유방암') && !t.includes('자궁경부암'));
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
test('대사증후군: 예시 A(허리 81.3 여성, 혈압 모름) = 확인된 기준 없음', () => {
  assert.equal(X.metsyn(base({})).level, 'ok');
});

test('생활습관: 흡연·과음·BMI 27·운동 안 함 = 4개 → 사망 위험 약 2배 그룹', () => {
  const e = X.lifestyle(base({ sex: 'M', heightCm: 170, weightKg: 78, smoke: 'current', alcohol: 'd5', exercise: false }));
  assert.equal(yes(e).length, 4); assert.ok(e.head.includes('약 2배'));
});

test('간: 남성 주 5병(234g) = MetALD 범위, 여성 주 1병 = 해당 없음', () => {
  const g = (n: number) => ({ perOccasion: 7, timesPerWeek: n, gramsPerWeek: n * X.ALCOHOL_G.sojuBottle });
  assert.ok(X.liver(base({ sex: 'M', alcohol: 'd1_4' }), g(5))!.head.includes('MetALD'));
  assert.equal(X.liver(base({ alcohol: 'd1_4' }), g(1))!.level, 'ok');
  assert.ok(X.liver(base({ sex: 'M', alcohol: 'd5' }), g(10))!.head.includes('술 때문에 생기는 간질환'));   // 469g > 420g
});

test('치매 위험요인: 고혈압·당뇨·흡연·운동 부족 = 4개', () => {
  const e = X.dementia(base({ dx: { htn: true, dm: true, chol: false }, smoke: 'current', exercise: false }));
  assert.deepEqual(yes(e), ['고혈압', '당뇨', '흡연', '운동 부족']);
});

test('콩팥: 65세 여성 = 3+1 = 4점 → 검사 권장, 49세 여성 = 1점', () => {
  assert.equal(X.ckd(base({ age: 65 })).level, 'look');
  assert.ok(X.ckd(base({})).head.startsWith('선별 점수 1점'));
});

test('runExtras: 검진이 맨 앞, 주의 항목이 그다음', () => {
  const xs = X.runExtras(base({ sex: 'M', age: 66, waistCm: 95, bp: 'high', smoke: 'current', alcohol: 'd5', exercise: false }));
  assert.equal(xs[0].id, 'checkup');
  assert.equal(xs[1].level, 'look');
});
