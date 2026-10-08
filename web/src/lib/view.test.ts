import { describe, it, expect } from 'vitest';
import { samples } from '../../../src/sampleData.ts';
import { viewResults, viewDetail, viewRecord, whatIfRows, applyScenario } from './view.ts';
import { toInput, fromInput, suggestScenario, emptyDraft, basicError, type AppInput } from '../state.ts';
import { modOn } from './features.ts';

const S = Object.fromEntries(samples.map((s) => [s.id, s]));

const names = (xs: { name: string }[]) => xs.map((x) => x.name);

describe('결과 화면 (엔진 값 → 실측 보정, 묶음·비교 검사)', () => {
  it('A · 기본: 당뇨·고혈압·콜레스테롤은 실측 보정값, 또래는 진단받지 않은 사람의 실측 비율', () => {
    const r = viewResults(S.A.input, S.A.scenario);
    expect(r.prob.slice(0, 4).map((p) => p.pct)).toEqual(['1.4', '4.1', '9.3', '6.4']);
    // 우울은 확률 대신 PHQ-2 점수(2점)로
    expect(r.score.map((g) => g.v)).toEqual(['24.2', '2', '11', '57', '1', '2', '7']);
    const dm = r.prob[0].cmp!;
    expect(dm.peer).toBe(1.5);                         // 40대 여성 중 진단받지 않은 사람의 실측 당뇨 비율
    expect(dm.label).toBe('비슷');                     // 보정 1.4% vs 실측 1.5%
    expect(names(r.first)).toEqual([]);
    expect(names(r.low)).toEqual(['지방간']);
    expect(names(r.same)).toEqual(['당뇨', '고혈압', '고콜레스테롤']);
    expect(names(r.improved)).toEqual(['당뇨', '고혈압', '비만', '지방간']);
  });
  it('B · 증상 있음: 불면·우울·역류가 먼저 확인할 것에 들어간다', () => {
    const r = viewResults(S.B.input, S.B.scenario);
    expect(names(r.first)).toEqual(['불면', '우울', '위식도역류']);
    const dep = r.score.find((s) => s.id === 'dep')!;
    expect([dep.v, dep.unit, dep.cat]).toEqual(['4', 'PHQ-2 / 6점', 'PHQ-2 양성']);
  });
  it('C · 불면 첫 질문 ‘아니요’는 ISI 0점이 아니라 측정 안 함', () => {
    const isi = viewResults(S.C.input, S.C.scenario).score.find((s) => s.id === 'isi')!;
    expect([isi.v, isi.cat]).toEqual(['–', '불면 선별 음성']);
  });
  it('지방간: 원 연구 음주 기준(여 주 70g·남 140g)을 넘으면 점수 대신 간 수치 검사', () => {
    const alc = { freq: 'w3_4' as const, amt: { soju: 1, beer: 0, wine: 0 } };          // 주 3.5회 × 47g ≈ 164g
    const fi: AppInput = { ...S.A.input, alcohol: 'd1_4', alc }, mi: AppInput = { ...S.A.input, sex: 'M', meno: null, alcohol: 'd1_4', alc: { ...alc, freq: 'w1_2' } };
    const f = viewResults(fi, S.A.scenario);
    expect(f.prob.find((p) => p.id === 'nafld')!.status).toBe('excluded');
    expect(f.first.map((x) => x.big)).toContain('간 수치 검사로 확인해요');
    const m = viewResults(mi, S.A.scenario);   // 남 주 70g
    expect(m.prob.find((p) => p.id === 'nafld')!.status).toBe('ok');
  });
  it('C · 모두 양호: 먼저 확인할 것이 없다', () => {
    const r = viewResults(S.C.input, S.C.scenario);
    expect([r.first.length, r.diagnosed.length, r.hasManage]).toEqual([0, 0, false]);
  });
  it('59세 남성·고혈압 진단·과음·당뇨 가족력: 진단 질환, 간 검사, 당뇨 2.2배가 맨 앞에 나온다', () => {
    const me = { ...S.A.input, age: 59, sex: 'M' as const, heightCm: 181, weightKg: 79, waistCm: 88.9, alcohol: 'd5' as const, famDM: true,
      dx: { htn: true, dm: false, chol: false }, meno: null };
    const r = viewResults(me, suggestScenario(me));
    expect(names(r.diagnosed)).toEqual(['고혈압']);
    expect(r.first.map((f) => f.short).slice(0, 2)).toEqual(['당뇨', '간']);
    const dm = r.prob[0];
    expect(dm.pct).toBe('16.3');                       // 엔진 15.6% → 보정 16.3%
    expect(dm.cmp!.peer).toBe(7.3);                    // 50대 남성 중 진단받지 않은 사람의 실측 비율
    expect(dm.cmp!.headline).toBe('또래의 약 2.2배예요');
    expect(dm.cmp!.action).toContain('공복혈당');
    expect(r.prob.find((p) => p.id === 'nafld')!.note).toContain('간 수치 검사');
    expect(r.prob.find((p) => p.id === 'htn')!.status).toBe('managed');
    // 상단 대표는 배수가 가장 큰 당뇨, 간은 '함께 확인할 것'
    expect(r.hero!.id).toBe('dm');
    expect(r.others.map((f) => f.short)).toContain('간');
  });
  it('극단 예시: 먼저 확인할 것 7개(허리 70cm라 당뇨는 BMI·허리 보정 후 또래와 비슷), 진단 3개, 낮음 최대', async () => {
    const { stressSamples: X } = await import('./stress.ts');
    const v = X.map((s) => viewResults(s.input, suggestScenario(s.input)));
    expect(v[0].first.length).toBe(7);
    expect(v[1].diagnosed.length).toBe(3);
    expect(v[2].first.length).toBe(0);
    expect(v[2].hero).toBe(null);
    // 우울 배수가 더 커도 상단 대표는 신체 항목, 마음·수면·소화는 그 뒤
    expect(v.map((r) => r.hero?.id ?? '-')).toEqual(['htn', 'nafld', '-', 'dm']);
    expect(v[0].others.map((f) => f.short)).toEqual(['간', '수면무호흡', '불면', '우울', '불안', '위식도역류']);
    console.log(v.map((r) => [r.first.length, r.improved.length, r.low.length, r.same.length, r.watch.length, r.diagnosed.length].join('/')));
  });
});

describe('검진 수치 (선택 입력): 있으면 추정보다 실제 수치가 우선', () => {
  const A = S.A.input;
  it('공복혈당 130 → 당뇨 기준, 110 → 전단계 안내, 콜레스테롤 250 → 기준 이상, 190 → 검진 수치 반영', () => {
    const hi = viewResults({ ...A, lab: { glu: 130 } } as AppInput, S.A.scenario);
    expect(hi.prob[0].status).toBe('criteria');
    expect(hi.first.map((f) => f.big)).toContain('당뇨 기준에 해당하는 수치, 확인 필요');
    expect([hi.prob[0].pct, hi.prob[0].note.includes('확인이 필요해요')]).toEqual(['–', true]);   // 126 이상은 확률(100%)로 표시하지 않음
    expect(viewResults({ ...A, lab: { glu: 110 } } as AppInput, S.A.scenario).prob[0].measured).toContain('공복혈당장애');
    const c1 = viewResults({ ...A, lab: { tc: 250 } } as AppInput, S.A.scenario);
    expect(c1.prob.find((p) => p.id === 'chol')!.status).toBe('criteria');
    const c2 = viewResults({ ...A, lab: { tc: 190 } } as AppInput, S.A.scenario).prob.find((p) => p.id === 'chol')!;
    expect([c2.status, c2.note.includes('190')]).toEqual(['measured', true]);
  });
  describe('공복혈당 반영 (규제 회귀) — 정상·경계·부분 입력에서 숫자와 문구가 같은지', () => {
    const run = (o: Partial<AppInput>) => viewResults({ ...A, ...o } as AppInput, S.A.scenario);
    const dm = (o: Partial<AppInput>) => run(o).prob[0];
    it('126 미만: 화면 숫자 = 문구 숫자, 소수 최대 한 자리 또는 ‘0.1 미만’, 혈당이 오를수록 낮아지지 않음', () => {
      const gs = [60, 80, 95, 99, 100, 105, 110, 120, 125];
      const ps = gs.map((g) => dm({ lab: { glu: g } }));
      for (const p of ps) {
        expect(p.status).toBe('ok');
        expect(p.pct).toMatch(/^(\d+\.\d|0\.1 미만)$/);
        expect(p.measured).toContain(p.pct === '0.1 미만' ? '현재 당뇨 가능성 추정 0.1% 미만' : `현재 당뇨 가능성 추정 약 ${p.pct}%`);
      }
      const v = gs.map((g) => run({ lab: { glu: g } }).prob[0].cmp!.me);
      for (let k = 1; k < v.length; k++) expect(v[k]).toBeGreaterThanOrEqual(v[k - 1]);
    });
    it('100 미만은 정상 범위 + 당뇨 배제 불가 문구, 100–125는 공복혈당장애 + 추가 확인을 먼저 확인할 것에', () => {
      const n = run({ lab: { glu: 95 } });
      expect(n.prob[0].measured).toContain('정상 범위(100 미만)');
      expect(n.prob[0].measured).toContain('공복혈당만으로 없다고 할 수는 없어요');
      expect(n.first.some((f) => f.big.includes('공복혈당장애'))).toBe(false);
      for (const g of [100, 110, 125]) {
        const r = run({ lab: { glu: g } });
        expect(r.prob[0].measured).toContain('공복혈당장애(100–125)');
        expect(r.first.find((f) => f.big === '공복혈당장애예요 · 추가 확인 필요')!.line).toContain(`현재 당뇨 가능성 ${r.prob[0].pct === '0.1 미만' ? '추정 0.1% 미만' : `추정 약 ${r.prob[0].pct}%`}`);
      }
    });
    it('126 이상은 확률 없이 ‘당뇨 기준에 해당하는 수치, 확인 필요’', () => {
      for (const g of [126, 140, 200]) {
        const r = run({ lab: { glu: g } });
        expect([r.prob[0].status, r.prob[0].pct, r.prob[0].measured]).toEqual(['criteria', '–', '']);
        expect(r.first.map((f) => f.big)).toContain('당뇨 기준에 해당하는 수치, 확인 필요');
        expect(JSON.stringify(r)).not.toContain('100.0');
      }
    });
    it('혈당 미입력은 기존 모형(보정값 1.4%), 당뇨 진단자는 혈당을 넣어도 확률 추정 제외', () => {
      expect(dm({}).pct).toBe('1.4');
      expect(dm({}).measured).toBe('');
      const d = dm({ dx: { htn: false, dm: true, chol: false }, lab: { glu: 110 } });
      expect([d.status, d.pct]).toEqual(['managed', '–']);
    });
    it('부분 입력: 혈당 + 혈압 숫자, 혈당 + 콜레스테롤이 서로 영향 없이 반영', () => {
      const r = run({ lab: { glu: 110, sbp: 125, dbp: 78, tc: 190 } });
      expect(r.prob[0].measured).toContain('공복혈당장애');
      expect(r.prob.find((p) => p.id === 'htn')!.status).toBe('measured');
      expect(r.prob.find((p) => p.id === 'chol')!.status).toBe('measured');
      expect(r.prob[0].pct).toBe(dm({ lab: { glu: 110 } }).pct);
    });
  });
  it('혈압 숫자가 140/90 미만이면 고혈압 확률 대신 측정 상태(주의혈압·전단계)로, 바꿔보기에서는 ‘검진 수치 반영’', () => {
    const p = (s: number, d: number) => viewResults({ ...A, lab: { sbp: s, dbp: d } } as AppInput, S.A.scenario).prob.find((x) => x.id === 'htn')!;
    expect([p(125, 78).status, p(125, 78).note.includes('주의혈압')]).toEqual(['measured', true]);
    expect(p(135, 85).note).toContain('고혈압 전단계');
    const w = whatIfRows({ ...A, lab: { sbp: 125, dbp: 78 } } as AppInput, applyScenario(A, S.A.scenario)).rows.find((r) => r.id === 'htn')!;
    expect(w.delta).toBe('검진 수치 반영');
  });
  it('또래 비교와 별도로 공식 검진 권고를 보여준다 (또래와 비슷해도 검사 안내)', () => {
    const r = viewResults(A, S.A.scenario);
    expect(r.prob.find((p) => p.id === 'chol')!.screen).toContain('4년마다');          // 49세 여성: 국가검진 이상지질혈증
    expect(r.prob.find((p) => p.id === 'dm')!.screen).toContain('35세 이상');
    expect(viewResults({ ...A, age: 66 }, S.A.scenario).prob.find((p) => p.id === 'osteo')!.screen).toContain('골밀도');
  });
  it('혈압 숫자 145/85 → 범주 ‘높음’으로 계산, 범위 밖 값과 혈압 한쪽만은 반영하지 않음', async () => {
    const { parseLab, labError } = await import('./labs.ts');
    const i = toInput({ ...fromInput(A), lab: { sbp: '145', dbp: '85' } })!;
    expect([i.bp, i.lab]).toEqual(['high', { sbp: 145, dbp: 85 }]);
    expect(toInput({ ...fromInput(A), lab: { glu: '9999' } })).toBe(null);          // 범위 밖이면 다음으로 못 넘어가고 이유를 보여준다
    expect(parseLab({ sbp: '130' })).toEqual({});
    expect(labError({ sbp: '130' }, 'life')).toContain('두 숫자');
  });
});

describe('상세·바꿔보기·기록', () => {
  it('당뇨 상세: 보정 1.4% → 100명 중 1명, 점수 5 = 나이 3 + 허리 2', () => {
    const d = viewDetail('dm', S.A.input, S.A.scenario);
    expect([d.n, d.m, d.removed]).toEqual([1, 1, 0]);
    expect(d.parts.filter((p) => p.v > 0).map((p) => p.v)).toEqual([3, 2]);
    // 연령대별 '진단받지 않은 사람 중 실측 당뇨 비율' (국민건강영양조사 2022–2024, 여성)
    expect(d.bands.map((b) => b.v)).toEqual([0.3, 1.1, 1.5, 3.3, 3.5, 4.7]);
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
  it('또래 평균 = 진단받지 않은 같은 성별·연령대의 실측 비율 (국민건강영양조사 2022–2024)', async () => {
    const { peerOf } = await import('../../../engine/src/calibrate.ts');
    expect(peerOf('dm', 'M', 55)).toBe(7.3);
    expect(peerOf('htn', 'M', 55)).toBe(15.3);
    expect(peerOf('osteo', 'F', 45)).toBe(null);
  });
});

describe('입력 변환', () => {
  it('Input → 화면 답변 → Input 이 그대로 돌아온다', () => {
    // 예시에는 음주 원답이 없어 대표 답(alc)이 붙는다. 엔진 Input 부분은 그대로 돌아와야 한다
    // 숨긴 분야(lib/features.ts)의 답은 계산에 넣지 않으므로 비교에서 뺀다
    const vis = (i: AppInput) => Object.fromEntries(Object.entries(i).filter(([k]) => !(['sleep', 'mind', 'gerd', 'diet'] as const).some((m) => m === k && !modOn(m)))) as AppInput;
    for (const s of samples) { const { alc: _a, ...back } = toInput(fromInput(s.input))!; expect(back).toEqual(vis(s.input)); }
    // 원답이 있는 기록은 그대로 복원된다
    const rec: AppInput = { ...samples[0].input, alcohol: 'd1_4', alc: { freq: 'w3_4', amt: { soju: 0.5, beer: 2, wine: 0 } } };
    expect(toInput(fromInput(rec))).toEqual(vis(rec));
  });
  it('19세 미만은 막는다', () => {
    expect(basicError({ ...emptyDraft(), age: '17' })).toBe('under19');
  });
  it('제안 시나리오: BMI 23 이상만 체중·허리를 줄여 본다', () => {
    expect(suggestScenario(S.A.input)).toEqual({ weightKg: -4, waistCm: -5 });
    expect(suggestScenario(S.C.input)).toEqual({ weightKg: 0, waistCm: 0 });
  });
});

describe('랜딩 미니 체험', () => {
  it('같은 성별·나이대·BMI 사람들의 실제 비율(진단받은 사람 포함), 또래의 몇 배가 메인', async () => {
    const { miniResults, miniError } = await import('../screens/MiniTrial.tsx');
    const r = miniResults(56, 'M', 172, 88);   // BMI 29.7 → 50대 남성 BMI 25–30
    expect(r.rows.map((p) => p.id)).toEqual(['dm', 'htn', 'nafld']);
    expect(r.bmiLabel).toBe('BMI 25–30');
    expect(r.rows[0].pct!).toBeGreaterThan(20);             // 진단받은 사람 포함: 50대 남성 전체(약 21%) 이상
    // 절대·또래 중 더 경고가 되는 쪽이 메인: 당뇨 25%(또래 21%와 비슷) → '4명 중 1명', 서브에 '또래도 이만큼 많아요'
    expect(r.rows[0].big).toBe('4명 중 1명'); expect(r.rows[0].small).toContain('또래도 이만큼 많아요');
    expect(miniResults(35, 'M', 175, 110).rows[0].big).toMatch(/또래의 \d\.\d배/);   // 30대 고도비만 당뇨: 또래의 4.5배가 더 경고
    expect(miniResults(56, 'M', 172, 60).rows[0].pct!).toBeLessThan(r.rows[0].pct!);
    expect(miniError('45', '170', '70', null)).toBeTruthy(); expect(miniError('18', '170', '70', 'M')).toBeTruthy(); expect(miniError('45', '170', '70', 'M')).toBeNull();
  });
});

describe('진단자 카드 설명', () => {
  it('당뇨·고혈압 진단자에게는 "아직 진단은 안 받았지만" 같은 확률 설명을 붙이지 않는다', () => {
    const inp = { ...S[Object.keys(S)[0]].input, dx: { htn: true, dm: true, chol: false } } as AppInput;
    const v = viewResults(inp, {} as never);
    for (const id of ['dm', 'htn']) {
      const c = v.prob.find((p) => p.id === id)!;
      expect(c.status).toBe('managed'); expect(c.meaning).toBe('');
    }
    expect(v.prob.find((p) => p.id === 'chol')!.meaning).not.toBe('');
  });
});

describe('매우 높은 혈압', () => {
  const base = S[Object.keys(S)[0]].input as AppInput;
  const at = (sbp: number, dbp: number) => viewResults({ ...base, dx: { htn: false, dm: false, chol: false }, bp: 'high', lab: { sbp, dbp } } as AppInput, {} as never);
  it('180/120 이상이면 맨 위에 "지금 바로 병원", 119·응급실이라는 말은 쓰지 않는다', () => {
    for (const [s, d] of [[190, 125], [180, 95], [150, 120]]) {
      const h = at(s, d).hero!;
      expect(h.big).toContain('지금 바로 병원');
      expect(h.action).toContain('지금 바로 병원');
      expect(h.big + h.action + h.line).not.toMatch(/119|응급실/);
      expect(viewDetail('htn', { ...base, dx: { htn: false, dm: false, chol: false }, bp: 'high', lab: { sbp: s, dbp: d } } as AppInput, {} as never).r.status).toBe('criteria');
    }
  });
  it('179/119는 일반 고혈압 기준 안내', () => {
    const h = at(179, 119).hero!;
    expect(h.big).not.toContain('지금 바로');
  });
});

describe('미니 체험 한 줄 결론', () => {
  it('위험 2개 이상이면 빨강 결론, 하나면 조심, 없으면 괜찮음 + 사람 그림 분수', async () => {
    const { miniResults, miniHeadline } = await import('../screens/MiniTrial.tsx');
    expect(miniHeadline(miniResults(58, 'M', 172, 99).rows)).toMatchObject({ tone: 2, title: '3가지 중 3가지가 위험한 쪽이에요' });
    expect(miniHeadline(miniResults(45, 'F', 160, 55).rows).tone).toBe(0);
    expect(miniResults(58, 'M', 172, 99).rows[0].frac).toEqual({ m: 1, d: 4 });   // 4명 중 1명 → 사람 4명 중 1명 채움
  });
});
