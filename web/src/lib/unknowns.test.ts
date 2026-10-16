// 출시 전 수정 A4: 범위로 나온 줄은 실제로 모르는 항목을 이유로 (docs/plan-2026-10-16-prelaunch-fixes.md)
import { describe, expect, it } from 'vitest';
import { overviewRows } from './overview';
import type { AppInput } from '../state';

const base: AppInput = { age: 45, sex: 'F', heightCm: 160, weightKg: 62, waistCm: 81.3, smoke: 'never', alcohol: 'none', famDM: false, dx: { htn: false, dm: false, chol: false }, bp: 'normal', exercise: true, meno: false };
const liver = (p: Partial<AppInput>) => overviewRows({ ...base, ...p }).find((r) => r.id === 'nafld')!;

describe('A4 범위 이유', () => {
  it('허리만 모름', () => {
    const r = liver({ waistCm: null });
    expect(r.kind).toBe('range');
    expect(r.unknown).toEqual(['waist']);
    expect(r.side).toBe('허리둘레를 몰라 범위로');
  });
  it('폐경만 모름 — 허리를 넣었으면 허리 모름이 아님', () => {
    const r = liver({ meno: null });
    expect(r.kind).toBe('range');
    expect(r.unknown).toEqual(['meno']);
    expect(r.side).toBe('폐경 여부를 몰라 범위로');
    expect(r.guess).toBeUndefined();   // '예상' 뱃지는 허리 모를 때만
  });
  it('운동만 모름 (화면에서는 생기지 않지만 계산·문구 조립 확인)', () => {
    const r = liver({ exercise: null });
    expect(r.unknown).toEqual(['exercise']);
    expect(r.side).toBe('운동 여부를 몰라 범위로');
  });
  it('여러 항목 동시에 모름', () => {
    const r = liver({ waistCm: null, meno: null, exercise: null });
    expect(r.unknown).toEqual(['waist', 'exercise', 'meno']);
    expect(r.side).toBe('허리둘레, 운동 여부와 폐경 여부를 몰라 범위로');
  });
  it('모름을 채우면 범위가 아니라 하나의 값', () => {
    expect(liver({}).kind).not.toBe('range');
    expect(liver({}).unknown).toBeUndefined();
  });
  it('40세 미만 여성은 폐경 전으로 계산 — 허리를 넣으면 하나의 값', () => {
    for (const age of [19, 25, 35, 39]) {
      const r = liver({ age, meno: null });
      expect(r.kind).not.toBe('range');
      expect(r.unknown).toBeUndefined();
    }
    expect(liver({ age: 40, meno: null }).unknown).toEqual(['meno']);   // 40세부터는 묻는 질문이라 모르면 범위
    expect(liver({ age: 30, meno: null, waistCm: null }).unknown).toEqual(['waist']);   // 허리만 이유
  });
  it('당뇨는 허리만 이유가 된다', () => {
    const dm = overviewRows({ ...base, waistCm: null, meno: null }).find((r) => r.id === 'dm')!;
    expect(dm.kind).toBe('range');
    expect(dm.unknown).toEqual(['waist']);
  });
});
