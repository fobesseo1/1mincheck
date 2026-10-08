import { describe, it, expect } from 'vitest';
import type { AppInput } from '../state.ts';
import { samples } from '../../../src/sampleData.ts';
import { kgToLowerZone, cmToWaistOk, minWeightDelta, bmiGauge, waistGauge, futureEffects, weightTrack, waistTrack, toneAt } from './lines.ts';
import { peerCards, rankWord, standing } from './peer.ts';

const base: AppInput = { age: 49, sex: 'F', heightCm: 160, weightKg: 62, waistCm: 81.3, smoke: 'never', alcohol: 'none', famDM: false,
  dx: { htn: false, dm: false, chol: false }, bp: 'normal', exercise: true, meno: null };

describe('기준선까지 거리', () => {
  it('BMI: 바로 아래 단계로 가려면 몇 kg (올림), 정상이면 여유', () => {
    expect(kgToLowerZone(160, 62)).toEqual({ kg: 4, line: 23, zone: '정상' });   // 24.2 → 58kg = 22.7
    expect(kgToLowerZone(172, 88)).toEqual({ kg: 15, line: 25, zone: '비만 전단계' });   // 29.7 → 73kg = 24.7
    expect(kgToLowerZone(160, 55)).toBeNull();
    expect(bmiGauge(base, 0).gap).toBe('4kg을 빼면\n정상 체중이 돼요');
    expect(bmiGauge({ ...base, weightKg: 55 }, 0).gap).toBe('정상 체중이에요.\n3.9kg 더 늘면 비만 전단계예요.');
  });
  it('허리: 기준(여 85·남 90) 이상이면 줄일 cm, 아래면 여유', () => {
    expect(cmToWaistOk('F', 87)).toBe(3);   // 84cm
    expect(cmToWaistOk('M', 90)).toBe(1);
    expect(cmToWaistOk('F', 81.3)).toBeNull();
    expect(waistGauge(base, 0)!.gap).toBe('복부비만은 아니에요.\n85cm까지 3.7cm 남았어요.');
    expect(waistGauge({ ...base, waistCm: null }, 0)).toBeNull();
  });
  it('몸무게는 BMI 18.5 아래로 줄이지 않는다', () => {
    expect(minWeightDelta(160, 62)).toBe(-14);   // 47.36kg 이상
    expect(minWeightDelta(160, 48)).toBe(0);
    expect(minWeightDelta(180, 100)).toBe(-15);
  });
  it('바꾼 뒤 구간', () => {
    const g = bmiGauge(base, -4);
    expect([g.now, g.nowZone.name, g.after, g.afterZone.name]).toEqual([24.2, '비만 전단계', 22.7, '정상']);
    expect(waistGauge(base, 5)!.afterZone.name).toBe('복부비만');
  });
});

describe('끌어서 바꾸는 막대 (kg·cm)', () => {
  it('몸무게: BMI 구간을 키에 맞춰 kg 로, 표준 몸무게 = BMI 18.5–22.9', () => {
    const t = weightTrack(base);   // 160cm
    expect(t.normal).toEqual([48, 58]);
    expect(toneAt(t, 62).name).toBe('비만 전단계');
    expect(toneAt(t, 55).tone).toBe('ok');
    expect(toneAt(t, 66).name).toBe('1단계 비만');
    expect(t.min).toBeLessThan(48); expect(t.max).toBeGreaterThanOrEqual(72);
  });
  it('허리: 기준선(여 85cm) 아래 기준 아래 · 이상 복부비만', () => {
    const t = waistTrack(base)!;
    expect(t.cut).toBe(85);
    expect(toneAt(t, 84).name).toBe('정상'); expect(toneAt(t, 85).name).toBe('복부비만');
    expect(waistTrack({ ...base, waistCm: null })).toBeNull();
  });
});

describe('바꾸면 달라지는 미래 위험 (원문 점수표 그대로, 기간 그대로)', () => {
  it('10년 당뇨: 몸무게만 바꾸면 그대로, 허리 기준선을 넘을 때만 바뀐다', () => {
    const w = futureEffects(base, -4, 0).effects.find((e) => e.id === 'dm10')!;
    expect(w.dir).toBe('same'); expect(w.before).toBe(w.after); expect(w.note).toMatch(/몸무게는 이 계산에 들어가지 않아요/);
    const up = futureEffects(base, 0, 5).effects.find((e) => e.id === 'dm10')!;
    expect(up.dir).toBe('up'); expect(up.note).toMatch(/14점 높아져요/);
    const down = futureEffects({ ...base, waistCm: 87 }, 0, -3).effects.find((e) => e.id === 'dm10')!;
    expect(down.dir).toBe('down'); expect(down.note).toMatch(/14점 낮아져요/);
  });
  it('점수가 내려가도 점수표 비율이 같으면 점수 변화만 말한다 (표가 단조롭지 않음)', () => {
    const hi: AppInput = { ...base, sex: 'M', age: 67, heightCm: 170, weightKg: 80, waistCm: 95, smoke: 'current', famDM: true, dx: { htn: true, dm: false, chol: false } };
    const e = futureEffects(hi, 0, -6).effects.find((x) => x.id === 'dm10')!;
    expect(e.dir).toBe('same'); expect(e.note).toMatch(/12점 낮아지지만/);
  });
  it('혈압을 모르면 범위로', () => {
    const e = futureEffects({ ...base, bp: 'unknown' }, 0, 0).effects.find((x) => x.id === 'dm10')!;
    expect(e.before).toMatch(/–/);
  });
  it('4년 고혈압: 검진 혈압이 있을 때만, BMI 25 기준선에서 바뀐다', () => {
    const i: AppInput = { ...base, weightKg: 68, lab: { sbp: 128, dbp: 82 } };   // BMI 26.6
    const e = futureEffects(i, -5, 0).effects.find((x) => x.id === 'htn4')!;   // 24.6
    expect(e.dir).toBe('down');
    expect(futureEffects(base, -5, 0).effects.some((x) => x.id === 'htn4')).toBe(false);
    expect(futureEffects(base, 0, 0).hints.join()).toMatch(/검진 혈압/);
  });
  it('40–69세가 아니면 기준선만, 허리를 모르면 넣으라는 안내', () => {
    const y = futureEffects({ ...base, age: 35 }, -4, 0);
    expect(y.effects).toEqual([]); expect(y.hints.join()).toMatch(/40–69세/);
    expect(futureEffects({ ...base, waistCm: null }, 0, 0).hints.join()).toMatch(/허리둘레를 넣으면/);
  });
});

describe('또래 100명 중 나', () => {
  it('당뇨·고혈압·지방간 3장, 백분위가 있으면 자리와 한 단어', () => {
    for (const s of samples) {
      const cs = peerCards(s.input);
      expect(cs.map((c) => c.id)).toEqual(['dm', 'htn', 'nafld']);
      for (const c of cs) if (c.kind === 'rank') { expect(c.rank).toBeGreaterThanOrEqual(1); expect(c.rank).toBeLessThanOrEqual(99); expect(c.word).toBe(rankWord(c.rank, c.name)); }
    }
    const c = peerCards(base);
    expect(c.filter((x) => x.kind === 'rank').length).toBeGreaterThan(0);
  });
  it('또래 100명 중 높은 쪽 / 낮은 쪽에서 약 N번째 (그 항목 추정 위험도 순서)', () => {
    expect(standing(92)).toEqual({ n: 9, side: '높은 쪽', dir: '높아요' });
    expect(standing(51)).toEqual({ n: 50, side: '높은 쪽', dir: '높아요' });
    expect(standing(50)).toEqual({ n: 50, side: '낮은 쪽', dir: '낮아요' });
    expect(standing(20)).toEqual({ n: 20, side: '낮은 쪽', dir: '낮아요' });
    expect(rankWord(99)).toBe('위험성이 2번째로 높아요');
    expect(rankWord(98, '고혈압')).toBe('고혈압 위험성이 3번째로 높아요');
    expect(rankWord(20, '당뇨')).toBe('당뇨 위험성이 20번째로 낮아요');
  });
  it('또래 평균 대비 한 줄은 cmpOf 구간과 같다', () => {
    const c = peerCards(base).filter((x) => x.kind !== 'status') as { level: string }[];
    for (const x of c) expect(['또래보다 낮은 편', '또래와 비슷한 편', '또래보다 높은 편']).toContain(x.level);
  });
  it('진단받은 항목은 그림 대신 상태', () => {
    const c = peerCards({ ...base, dx: { htn: true, dm: false, chol: false } }).find((x) => x.id === 'htn')!;
    expect(c.kind).toBe('status'); expect(c.word).toBe('진단받아 관리 중');
  });
  it('허리를 모르면 범위로', () => {
    const c = peerCards({ ...base, waistCm: null });
    expect(c.some((x) => x.kind === 'status' && x.word.includes('–'))).toBe(true);
  });
});
