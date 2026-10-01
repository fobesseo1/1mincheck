import { describe, it, expect } from 'vitest';
import { samples } from '../../../src/sampleData.ts';
import { viewResults, viewDetail, viewRecord, whatIfRows, applyScenario } from './view.ts';
import { toInput, fromInput, suggestScenario, emptyDraft, basicError } from '../state.ts';

const S = Object.fromEntries(samples.map((s) => [s.id, s]));

const names = (xs: { name: string }[]) => xs.map((x) => x.name);

describe('결과 화면 (엔진 값은 그대로, 묶음·비교만 검사)', () => {
  it('A · 기본: 확률 값은 캔버스와 같고, 당뇨는 진단받지 않은 또래와 비교한다', () => {
    const r = viewResults(S.A.input, S.A.scenario);
    expect(r.prob.slice(0, 5).map((p) => p.pct)).toEqual(['2.9', '9.7', '13.6', '6.4', '1.0']);
    expect(r.score.map((g) => g.v)).toEqual(['24.2', '11', '57', '1', '2', '7']);
    const dm = r.prob[0].cmp!;
    expect(dm.peer).toBeCloseTo(1.37, 1);             // 40대 여성 당뇨 5.2% 중 진단받지 않은 사람 비율
    expect(dm.label).toBe('매우 높음');                // 2.9 / 1.37 ≈ 2.1배 (엔진 기준 2배 이상)
    expect(names(r.first)).toEqual(['이미 당뇨일 확률']);
    expect(names(r.low)).toEqual(['고혈압', '지방간', '우울']);
    expect(names(r.same)).toEqual(['고콜레스테롤']);
    expect(names(r.improved)).toEqual(['당뇨', '고혈압', '비만', '지방간']);
  });
  it('B · 증상 있음: 불면·우울·역류가 먼저 확인할 것에 들어간다', () => {
    const r = viewResults(S.B.input, S.B.scenario);
    expect(names(r.first)).toEqual(['이미 당뇨일 확률', '우울', '불면', '위식도역류']);
    expect(r.prob[4].pct).toBe('36.3');
  });
  it('C · 모두 양호: 먼저 확인할 것이 없다', () => {
    const r = viewResults(S.C.input, S.C.scenario);
    expect([r.first.length, r.diagnosed.length, r.hasManage]).toEqual([0, 0, false]);
  });
  it('59세 남성·고혈압 진단·과음·당뇨 가족력: 진단 질환, 간 검사, 당뇨 2.5배가 맨 앞에 나온다', () => {
    const me = { ...S.A.input, age: 59, sex: 'M' as const, heightCm: 181, weightKg: 79, waistCm: 88.9, alcohol: 'd5' as const, famDM: true,
      dx: { htn: true, dm: false, chol: false }, meno: null };
    const r = viewResults(me, suggestScenario(me));
    expect(names(r.diagnosed)).toEqual(['고혈압']);
    expect(r.first.map((f) => f.short).slice(0, 2)).toEqual(['당뇨', '간']);
    const dm = r.prob[0];
    expect(dm.pct).toBe('15.6');
    expect(dm.cmp!.peer).toBeCloseTo(6.3, 1);
    expect(dm.cmp!.headline).toBe('또래의 약 2.5배예요');
    expect(dm.cmp!.action).toContain('공복혈당');
    expect(r.prob.find((p) => p.id === 'nafld')!.note).toContain('간 수치 검사');
    expect(r.prob.find((p) => p.id === 'htn')!.status).toBe('managed');
    // 상단 대표는 배수가 가장 큰 당뇨, 간은 '함께 확인할 것'
    expect(r.hero!.id).toBe('dm');
    expect(r.others.map((f) => f.short)).toContain('간');
  });
  it('극단 예시: 먼저 확인할 것 9개, 진단 3개, 낮음 최대', async () => {
    const { stressSamples: X } = await import('./stress.ts');
    const v = X.map((s) => viewResults(s.input, suggestScenario(s.input)));
    expect(v[0].first.length).toBe(9);
    expect(v[1].diagnosed.length).toBe(3);
    expect(v[2].first.length).toBe(0);
    expect(v[2].hero).toBe(null);
    // 우울 배수가 더 커도 상단 대표는 신체 항목, 마음·수면·소화는 그 뒤
    expect(v.map((r) => r.hero?.id ?? '-')).toEqual(['dm', 'nafld', '-', 'dm']);
    expect(v[0].others.map((f) => f.short)).toEqual(['고혈압', '고콜레스테롤', '간', '우울', '수면무호흡', '불면', '불안', '위식도역류']);
    console.log(v.map((r) => [r.first.length, r.improved.length, r.low.length, r.same.length, r.watch.length, r.diagnosed.length].join('/')));
  });
});

describe('상세·바꿔보기·기록', () => {
  it('숨은 당뇨 상세: 100명 중 3명 → 1명, 점수 5 = 나이 3 + 허리 2', () => {
    const d = viewDetail('dm', S.A.input, S.A.scenario);
    expect([d.n, d.m, d.removed]).toEqual([3, 1, 2]);
    expect(d.parts.filter((p) => p.v > 0).map((p) => p.v)).toEqual([3, 2]);
    // 연령대별 '진단받지 않은 사람 중 당뇨' 비율 (유병률 0.6·2.1·5.2·11.6·19.6·27.9% 에서 환산)
    expect(d.bands.map((b) => Math.round(b.v * 10) / 10)).toEqual([0.3, 1.2, 1.4, 3.2, 5.8, 8.9]);
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
  it('진단받지 않은 또래 당뇨 비율 = 유병률 × (1 − 인지율) ÷ (1 − 유병률 × 인지율)', async () => {
    const { undiagnosedDm } = await import('./view.ts');
    expect(undiagnosedDm(20.9, 55)).toBeCloseTo(6.27, 1);   // 50대 남성, 인지율 74.7%
    expect(undiagnosedDm(2.1, 35)).toBeCloseTo(1.20, 1);    // 30대 여성, 인지율 43.3%
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
