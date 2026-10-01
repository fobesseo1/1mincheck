// 실행: npx tsx --test test/engine.test.ts   (Node 20+ 내장 node:test 사용, 추가 의존성 없음)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import P from '../src/prevalence.json' with { type: 'json' };
import * as E from '../src/engine.ts';
import type { Input } from '../src/engine.ts';

const near = (a: number | null | undefined, b: number, tol = 0.1) =>
  assert.ok(a != null && Math.abs(a - b) <= tol, `expected ${b} ± ${tol}, got ${a}`);

const base = (o: Partial<Input>): Input => ({
  age: 40, sex: 'M', heightCm: 170, weightKg: 65, waistCm: 80, smoke: 'never', alcohol: 'none', famDM: false,
  dx: { htn: false, dm: false, chol: false }, bp: 'unknown', exercise: true, meno: false, ...o,
});
const kg = (bmi: number, h: number) => bmi * (h / 100) ** 2;

// ── §6-1 당뇨 ──
test('당뇨: 46세 남 허리92 흡연 음주1', () => {
  const r = E.diabetes(base({ age: 46, waistCm: 92, smoke: 'current', alcohol: 'd1_4' }));
  near(r.value, 9.4); assert.equal(r.score, 8);
});
test('당뇨: what-if 허리85 금연 금주', () => {
  const r = E.diabetes(base({ age: 46, waistCm: 85, smoke: 'never', alcohol: 'none' }));
  near(r.value, 2.9); assert.equal(r.score, 5);
});
test('당뇨: 58세 여 가족력 고혈압 허리86', () => {
  const r = E.diabetes(base({ age: 58, sex: 'F', waistCm: 86, famDM: true, dx: { htn: true, dm: false, chol: false } }));
  near(r.value, 10.9); assert.equal(r.score, 8);
});
test('당뇨: 최대/최소', () => {
  near(E.diabetes(base({ age: 50, waistCm: 95, famDM: true, dx: { htn: true, dm: false, chol: false }, smoke: 'current', alcohol: 'd5' })).value, 28.4);
  near(E.diabetes(base({ age: 25, sex: 'F', waistCm: 70 })).value, 0.4);
});
test('당뇨: 허리 모름 → 범위', () => {
  const r = E.diabetes(base({ age: 46, waistCm: null }));
  assert.equal(r.value, null); assert.ok(r.range && r.range[0] < r.range[1]);
});

// ── §6-2·6-3 고혈압·콜레스테롤 ──
const m46 = base({ age: 46, heightCm: 175, weightKg: 85, waistCm: 92 });
test('고혈압: 46세 남 BMI27.8 → 34.9', () => near(E.hypertension(m46).value, 34.9));
test('고혈압 what-if: 허리 −7cm → 26.7', () => near(E.hypertensionWhatIf(m46, { ...m46, waistCm: 85 }), 26.7));
test('고혈압 what-if: 허리 모름, 체중 −7kg → 29.2', () => {
  const b = { ...m46, waistCm: null }; near(E.hypertensionWhatIf(b, { ...b, weightKg: 78 }), 29.2, 0.15);
});
test('고혈압: 58세 여 비비만 22.7, 75세 여 비만 80.0', () => {
  near(E.hypertension(base({ age: 58, sex: 'F', heightCm: 160, weightKg: 55 })).value, 22.7);
  near(E.hypertension(base({ age: 75, sex: 'F', heightCm: 155, weightKg: 65 })).value, 80.0);
});
test('콜레스테롤: 46세 남 비만 → 32.0', () => near(E.cholesterol(m46).value, 32.0));
test('보정 검사: 12칸 모두 가중평균 = 3년 평균 유병률', () => {
  for (const kind of ['htn', 'chol'] as const) for (const s of ['M', 'F'] as const) for (let b = 0; b < 6; b++) {
    const T = (P as any)[kind]; const f = P.obesityByAge.pooled[s][b] / 100;
    const a = T.intercept[s][b], L = T.lnOR_obese;
    const avg = 100 * (f * E.expit(a + L) + (1 - f) * E.expit(a));
    near(avg, T.pooled[s][b], 0.01);
  }
});

// ── §6-10 지방간 ──
test('지방간: 46세 남 → 71.9, what-if → 28.9', () => {
  near(E.nafld({ ...m46, alcohol: 'd1_4', exercise: false }).value, 71.9);
  near(E.nafld(base({ age: 46, heightCm: 175, weightKg: kg(24.5, 175), waistCm: 85, alcohol: 'd1_4', exercise: true })).value, 28.9);
});
test('지방간: 58세 여 47.5, 30세 여 1.0', () => {
  near(E.nafld(base({ age: 58, sex: 'F', heightCm: 160, weightKg: kg(26, 160), waistCm: 86, dx: { htn: false, dm: false, chol: true }, meno: true, exercise: true })).value, 47.5);
  near(E.nafld(base({ age: 30, sex: 'F', heightCm: 160, weightKg: kg(21, 160), waistCm: 70, exercise: true })).value, 1.0);
});
test('지방간: 점수 단조 증가', () => {
  for (const s of ['M', 'F'] as const) for (let k = 2; k < 12; k++) assert.ok(E.nafldProb(s, k + 1) >= E.nafldProb(s, k));
});

// ── §6-9 골다공증 ──
test('골다공증: OSTA 베이즈', () => {
  near(E.osteoporosis(base({ age: 68, sex: 'F', weightKg: 50 })).value, 44.0);
  near(E.osteoporosis(base({ age: 58, sex: 'F', weightKg: 55 })).value, 2.7);
  near(E.osteoporosis(base({ age: 65, sex: 'F', weightKg: 70 })).value, 4.7);
  assert.equal(E.osteoporosis(base({ age: 49 })).status, 'na');
});

// ── §6-7 우울 ──
test('우울: PHQ-2', () => {
  near(E.depression(base({ age: 35, mind: { phq: [2, 1], gad: [0, 0] } })).value, 30.2);
  near(E.depression(base({ age: 35, mind: { phq: [0, 0], gad: [0, 0] } })).value, 0.8);
  near(E.depression(base({ age: 25, sex: 'F', mind: { phq: [2, 1], gad: [0, 0] } })).value, 49.7);
});
test('우울: PHQ-9 9번 문항 → 위기 플래그', () => {
  const r = E.depression(base({ mind: { phq: [1, 1, 1, 1, 1, 1, 1, 1, 1], gad: [0, 0] } }));
  assert.ok(r.flags?.includes('CRISIS'));
});

// ── §6-11 위식도역류 ──
test('GerdQ 역채점과 상대 변화', () => {
  const r = E.gerd(base({ gerd: { gate: true, gq: [3, 2, 0, 0, 1, 0] } }));  // 3+2+3+3+1+0
  assert.equal(r.value, 12);
  const b = base({ heightCm: 170, weightKg: 80, smoke: 'current', alcohol: 'd1_4' });
  near(E.gerdRelativeChange(b, { ...b, weightKg: 70, smoke: 'never', alcohol: 'none' }), 1 / 2.93, 0.01);
});

// ── 사례: 49세 여성 160cm 62kg 허리 32인치 ──
test('사례: 49세 여성', () => {
  const f = base({ age: 49, sex: 'F', heightCm: 160, weightKg: 62, waistCm: 32 * 2.54, exercise: true, meno: false });
  const dm = E.diabetes(f); near(dm.value, 2.9); assert.equal(dm.score, 5);
  near(E.hypertension(f).value, 9.7);
  near(E.cholesterol(f).value, 13.6);
  near(E.obesity(f).value, 24.2);
  near(E.nafld(f).value, 6.4);
  near(E.nafld({ ...f, exercise: false, meno: true }).value, 21.0);
  near(E.diabetes({ ...f, waistCm: 76 }).value, 1.3);
});

// ── §6-0 확률 범위 (무작위 입력 5,000건) ──
test('모든 확률은 0~100%', () => {
  let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let n = 0; n < 5000; n++) {
    const i = base({ age: 19 + Math.floor(r() * 70), sex: r() < 0.5 ? 'M' : 'F', heightCm: 145 + r() * 45, weightKg: 40 + r() * 70,
      waistCm: r() < 0.2 ? null : 60 + r() * 60, smoke: r() < 0.3 ? 'current' : 'never', alcohol: (['none', 'lt1', 'd1_4', 'd5'] as const)[Math.floor(r() * 4)],
      famDM: r() < 0.3, exercise: r() < 0.5, meno: r() < 0.5 });
    for (const res of E.runAll(i)) {
      if (res.unit !== '%') continue;
      for (const v of [res.value, ...(res.range ?? [])]) if (v != null) assert.ok(v > 0 && v < 100, `${res.id} ${v}`);
    }
  }
});
