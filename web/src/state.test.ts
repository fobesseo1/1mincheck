import { describe, expect, it } from 'vitest';
import { emptyDraft, basicError, fieldError, swapWaistUnit, waistCmOf, toInput, sameRecord, type Draft } from './state';

const base = (p: Partial<Draft> = {}): Draft => ({
  ...emptyDraft(), age: '52', sex: 'M', height: '172', weight: '82', waist: '36', waistUnit: 'in',
  smoke: 'never', alcFreq: 'none', exercise: false, famDM: false, dx: { htn: false, dm: false, chol: false, none: true }, bp: 'unknown', ...p,
});
/** 단위 단추를 누른 것처럼 */
const swap = (d: Draft, u: 'cm' | 'in') => ({ ...d, ...swapWaistUnit(d, u) });

describe('A1 허리 비워 두기 = 모름', () => {
  it('빈 칸이면 진행 가능, 계산에는 허리 없음(0 아님)', () => {
    const d = base({ waist: '' });
    expect(basicError(d)).toBeNull();
    expect(waistCmOf(d)).toBeNull();
    const inp = toInput(d);
    expect(inp).not.toBeNull();
    expect(inp!.waistCm).toBeNull();
  });
  it('0 · 범위 밖은 막고 이유를 알려 준다', () => {
    expect(basicError(base({ waist: '0' }))).toBe('허리둘레를 20–60인치 사이로 입력해 주세요');
    expect(fieldError(base({ waist: '0', waistUnit: 'cm' }), 'waist')).toBe('허리둘레를 50–150cm 사이로 입력해 주세요');
  });
  it('넣었다 지우면 다시 모름, 다시 넣으면 그 값', () => {
    let d = base();
    expect(waistCmOf(d)).toBe(91.4);
    d = { ...d, waist: '', waistCm: undefined };
    expect(waistCmOf(d)).toBeNull();
    d = { ...d, waist: '34' };
    expect(waistCmOf(d)).toBe(86.4);
  });
});

describe('A2 단위만 바꾸면 실제 길이 유지', () => {
  it('36인치 → 91.4cm → 36인치', () => {
    const a = swap(base(), 'cm');
    expect(a.waist).toBe('91.4');
    expect(waistCmOf(a)).toBe(91.4);
    const b = swap(a, 'in');
    expect(b.waist).toBe('36');
    expect(waistCmOf(b)).toBe(91.4);
  });
  it('90cm → 35인치(표시) → 90cm, 원본 90 유지', () => {
    const a = swap(base({ waist: '90', waistUnit: 'cm' }), 'in');
    expect(a.waist).toBe('35');
    expect(waistCmOf(a)).toBe(90);
    expect(swap(a, 'cm').waist).toBe('90');
  });
  it('열 번 왕복해도 계산 값 동일', () => {
    let d = base({ waist: '88.3', waistUnit: 'cm' });
    const first = JSON.stringify(toInput(d));
    for (let k = 0; k < 10; k++) d = swap(swap(d, 'in'), 'cm');
    expect(waistCmOf(d)).toBe(88.3);
    expect(JSON.stringify(toInput(d))).toBe(first);
  });
  it('숫자를 새로 넣으면 그 숫자가 원본', () => {
    const a = swap(base(), 'cm');
    const b = { ...a, waist: '95', waistCm: undefined };   // 입력 칸이 하는 일
    expect(waistCmOf(b)).toBe(95);
  });
  it('올바르지 않은 숫자면 단위만 바뀌고 숫자는 그대로', () => {
    const a = swap(base({ waist: '0' }), 'cm');
    expect(a.waistUnit).toBe('cm');
    expect(a.waist).toBe('0');
  });
});

describe('B1 칸 오류 문장', () => {
  it('키 0 · 몸무게 범위 밖 · 나이 소수', () => {
    expect(fieldError(base({ height: '0' }), 'height')).toBe('키는 120–220cm 사이로 입력해 주세요');
    expect(fieldError(base({ weight: '250' }), 'weight')).toBe('몸무게는 30–200kg 사이로 입력해 주세요');
    expect(fieldError(base({ age: '52.5' }), 'age')).toBe('만 나이를 숫자로 입력해 주세요');
    expect(fieldError(base({ height: '' }), 'height')).toBeNull();   // 빈 칸은 칸 아래 안내 없음
    expect(basicError(base({ height: '' }))).toBe('키는 120–220cm 사이로 입력해 주세요');   // 다음 버튼은 막음
  });
});

describe('B4 같은 결과 중복 저장', () => {
  const inp = toInput(base())!;
  const rec = { id: '1', date: '2026.10.16', input: inp };
  it('같은 날 같은 입력이면 같은 결과', () => {
    expect(sameRecord(rec, '2026.10.16', JSON.parse(JSON.stringify(inp)))).toBe(true);
  });
  it('검진값만 바뀌어도 다른 결과', () => {
    expect(sameRecord(rec, '2026.10.16', toInput(base({ lab: { glu: '108' } }))!)).toBe(false);
  });
  it('다른 날짜면 입력이 같아도 새 기록', () => {
    expect(sameRecord(rec, '2026.12.01', inp)).toBe(false);
  });
});
