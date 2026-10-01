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

describe('음주·허리 입력', () => {
  it('주 1–2회 × 소주 1병이면 하루 평균 1.5잔 → 하루 1–4.9잔 구간', async () => {
    const { alcCalc, emptyAmt } = await import('../state.ts');
    const c = alcCalc('w1_2', { ...emptyAmt(), soju: 1 });
    expect([c.per, Math.round(c.daily * 10) / 10, c.cat]).toEqual([7, 1.5, 'd1_4']);
    expect(alcCalc('m1', { ...emptyAmt(), beer: 2 }).cat).toBe('lt1');           // 월 1회 × 맥주 2캔(4잔)
    expect(alcCalc('daily', { ...emptyAmt(), soju: 1 }).cat).toBe('d5');          // 거의 매일 소주 1병
    expect(alcCalc('w3_4', emptyAmt()).cat).toBe(null);                           // 양을 안 넣으면 미완료
    expect(alcCalc('none', emptyAmt()).cat).toBe('none');
  });
  it('허리 32인치 = 81.3cm', async () => {
    const { waistCmOf, emptyDraft } = await import('../state.ts');
    expect(waistCmOf({ ...emptyDraft(), waist: '32', waistUnit: 'in' })).toBe(81.3);
  });
  it('또래 비교 문장', async () => {
    const { compareText } = await import('./view.ts');
    expect(compareText(2.9, 5.2, '낮음')).toBe('평균의 약 0.6배로 낮은 편이에요');
    expect(compareText(13.6, 15.5, '비슷')).toBe('평균의 약 0.9배로 비슷한 수준이에요');
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
