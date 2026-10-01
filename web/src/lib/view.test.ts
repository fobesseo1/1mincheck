import { describe, it, expect } from 'vitest';
import { samples } from '../../../src/sampleData.ts';
import { viewResults, viewDetail, viewRecord, whatIfRows, applyScenario } from './view.ts';
import { toInput, fromInput, suggestScenario, emptyDraft, basicError } from '../state.ts';

const S = Object.fromEntries(samples.map((s) => [s.id, s]));

describe('결과 화면 값이 캔버스 디자인(예시 A/B/C)과 같다', () => {
  it('A · 기본', () => {
    const r = viewResults(S.A.input, S.A.scenario);
    expect([r.lower, r.improvedN, r.look]).toEqual([4, 4, 3]);
    expect(r.prob.slice(0, 5).map((p) => p.main)).toEqual(['3', '10', '14', '6', '1']);
    expect(r.rings.map((g) => g.idx)).toEqual(['56', '78', '30']);
    expect(r.score.map((g) => g.v)).toEqual(['24.2', '11', '57', '1', '2', '7']);
    expect(r.manage.map((m) => `${m.name}:${m.a}→${m.b}`)).toEqual(['지방간:6.4→1.2', '숨은 당뇨:2.9→1.3']);
  });
  it('B · 증상 있음', () => {
    const r = viewResults(S.B.input, S.B.scenario);
    expect([r.lower, r.look]).toEqual([3, 5]);
    expect(r.strong.map((s) => s.name)).toEqual(['불면', '우울', '위식도역류']);
    expect(r.prob[4].main).toBe('36');
  });
  it('C · 모두 양호', () => {
    const r = viewResults(S.C.input, S.C.scenario);
    expect([r.lower, r.improvedN, r.look, r.hasManage]).toEqual([4, 0, 0, false]);
  });
});

describe('상세·바꿔보기·기록', () => {
  it('숨은 당뇨 상세: 100명 중 3명 → 1명, 점수 5 = 나이 3 + 허리 2', () => {
    const d = viewDetail('dm', S.A.input, S.A.scenario);
    expect([d.n, d.m, d.removed]).toEqual([3, 1, 2]);
    expect(d.parts.filter((p) => p.v > 0).map((p) => p.v)).toEqual([3, 2]);
    expect(d.bands.map((b) => b.v)).toEqual([0.6, 2.1, 5.2, 11.6, 19.6, 27.9]);
  });
  it('바꿔보기: 체중 −4kg·허리 −5cm면 4개 항목이 낮아진다', () => {
    const w = whatIfRows(S.A.input, applyScenario(S.A.input, S.A.scenario));
    expect([w.down, w.up]).toEqual([4, 0]);
  });
  it('기록 비교 A: 5개 항목이 좋아졌다', () => {
    expect(viewRecord(S.A.previous!.input, S.A.input).down).toBe(5);
  });
});

describe('입력 변환', () => {
  it('Input → 화면 답변 → Input 이 그대로 돌아온다', () => {
    for (const s of samples) expect(toInput(fromInput(s.input))).toEqual(s.input);
  });
  it('19세 미만은 막는다', () => {
    expect(basicError({ ...emptyDraft(), age: '17' })).toBe('under19');
  });
  it('제안 시나리오: BMI 23 이상만 체중·허리를 줄여 본다', () => {
    expect(suggestScenario(S.A.input)).toEqual({ weightKg: -4, waistCm: -5 });
    expect(suggestScenario(S.C.input)).toEqual({ weightKg: 0, waistCm: 0 });
  });
});
