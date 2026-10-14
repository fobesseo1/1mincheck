import { describe, it, expect } from 'vitest';
import { pickSet, ageGroup, type CharManifest } from './characters';

const set = (prefix: string) => ({ prefix, widths: [1, 2, 3, 4, 5], bellyWidths: [1, 2, 3, 4, 5] });
const M: CharManifest = { version: 'v1', size: [512, 768], sets: { m: { 20: set('m20'), 30: set('m30'), 50: set('m'), 60: set('m60') }, f: { 40: set('f40'), 60: set('f60') } } };

describe('체형 캐릭터 세트 고르기', () => {
  it('나이대는 20~60대, 70세 이상은 60대', () => {
    expect([19, 25, 39, 59, 60, 69, 70, 95].map(ageGroup)).toEqual([20, 20, 30, 50, 60, 60, 60, 60]);
  });
  it('그 나이대 세트가 있으면 그대로', () => {
    expect(pickSet(M, 'M', 34)!.prefix).toBe('m30');
    expect(pickSet(M, 'M', 77)!.prefix).toBe('m60');
  });
  it('없으면 같은 성별에서 가장 가까운 나이대, 거리가 같으면 더 높은 나이대', () => {
    expect(pickSet(M, 'M', 45)!.group).toBe(50);   // 40대 없음: 30 · 50 거리 같음 → 50
    expect(pickSet(M, 'F', 25)!.group).toBe(40);   // 여성 20대 없음 → 가장 가까운 40
    expect(pickSet(M, 'F', 52)!.group).toBe(60);   // 50대 없음: 40 · 60 거리 같음 → 60
    expect(pickSet(M, 'F', 52)!.wanted).toBe(50);
  });
  it('그림 주소에 version 을 붙인다', () => {
    expect(pickSet(M, 'M', 52)!.files[0]).toMatch(/characters\/m-1\.webp\?v=v1$/);
    expect(pickSet(M, 'M', 52)!.bellyFiles[4]).toMatch(/m-5-belly\.webp\?v=v1$/);
  });
});
