import { describe, expect, it } from 'vitest';
import { cleanNum } from './numInput';

describe('숫자 칸 입력 정리 (B5)', () => {
  it('음수는 양수로 바꾸지 않는다', () => {
    expect(cleanNum('-1')).toBe('-1');
    expect(cleanNum('−1')).toBe('-1');
    expect(Number(cleanNum('−1'))).toBeLessThan(0);
  });
  it('소수는 그대로', () => {
    expect(cleanNum('14.8')).toBe('14.8');
    expect(cleanNum('0.9')).toBe('0.9');
    expect(cleanNum('1.')).toBe('1.');   // 입력 중
  });
  it('숫자 뒤 단위 글자는 뗀다', () => {
    expect(cleanNum('108 mg/dL')).toBe('108');
    expect(cleanNum('82mL/min')).toBe('82');
    expect(cleanNum('172cm')).toBe('172');
  });
  it('천 단위 쉼표는 떼고 1200으로 (1.2·120으로 바꾸지 않음)', () => {
    expect(cleanNum('1,200')).toBe('1200');
    expect(Number(cleanNum('1,200'))).toBe(1200);
  });
  it('숫자가 둘 이상이면 그대로 둬서 숫자가 아니게 (형식 안내)', () => {
    expect(cleanNum('132/84')).toBe('132/84');
    expect(Number.isNaN(Number(cleanNum('132/84')))).toBe(true);
    expect(Number.isNaN(Number(cleanNum('1,2')))).toBe(true);
  });
  it('빈 칸 · 글자만', () => {
    expect(cleanNum('')).toBe('');
    expect(cleanNum('abc')).toBe('');
    expect(cleanNum('-')).toBe('-');
  });
});
