// 일반건강검진 숫자 항목 추가분(LDL·혈색소·AST·ALT·감마지티피·크레아티닌) 구간 경계
import { describe, it, expect } from 'vitest';
import { labCards, LAB_SPEC } from './labZones.ts';
import { parseLab } from './labs.ts';

const z = (L: Parameters<typeof labCards>[0], sex: 'M' | 'F' = 'M') => labCards(L, sex)[0].zone;

describe('검진 풀이 추가 항목 (국가건강검진·학회 기준)', () => {
  it('혈색소: 남 13.0–16.5 정상, 12.0–12.9 경계, 12.0 미만 빈혈 의심 / 여 12.0–15.5, 10.0–11.9, 10.0 미만', () => {
    expect([z({ hb: 11.9 }), z({ hb: 12 }), z({ hb: 12.9 }), z({ hb: 13 }), z({ hb: 16.5 }), z({ hb: 16.6 })]).toEqual(['빈혈 의심', '경계', '경계', '정상', '정상', '높음']);
    expect([z({ hb: 9.9 }, 'F'), z({ hb: 10 }, 'F'), z({ hb: 11.9 }, 'F'), z({ hb: 12 }, 'F'), z({ hb: 15.5 }, 'F'), z({ hb: 15.6 }, 'F')]).toEqual(['빈혈 의심', '경계', '경계', '정상', '정상', '높음']);
    expect(labCards({ hb: 12.5 }, 'F')[0].note).toBe('여성 기준이에요.');
  });
  it('AST ≤40 정상·41–50 경계·51 이상 높음, ALT ≤35·36–45·46 이상', () => {
    expect([z({ ast: 40 }), z({ ast: 41 }), z({ ast: 50 }), z({ ast: 51 })]).toEqual(['정상', '경계', '경계', '높음']);
    expect([z({ alt: 35 }), z({ alt: 36 }), z({ alt: 45 }), z({ alt: 46 })]).toEqual(['정상', '경계', '경계', '높음']);
  });
  it('감마지티피: 남 ≤63·64–77·78 이상, 여 ≤35·36–45·46 이상', () => {
    expect([z({ ggt: 63 }), z({ ggt: 64 }), z({ ggt: 78 })]).toEqual(['정상', '경계', '높음']);
    expect([z({ ggt: 35 }, 'F'), z({ ggt: 36 }, 'F'), z({ ggt: 46 }, 'F')]).toEqual(['정상', '경계', '높음']);
  });
  it('크레아티닌 1.5 이하 정상, 넘으면 높음 · LDL 130·160·190 경계', () => {
    expect([z({ cr: 1.5 }), z({ cr: 1.6 })]).toEqual(['정상', '높음']);
    expect([z({ ldl: 129 }), z({ ldl: 130 }), z({ ldl: 160 }), z({ ldl: 190 })]).toEqual(['정상', '경계', '높음', '매우 높음']);
  });
  it('입력 문자열 → 숫자 (소수점 포함), 범위 밖은 뺀다', () => {
    expect(parseLab({ hb: '13.4', cr: '0.9', ast: '0' })).toEqual({ hb: 13.4, cr: 0.9 });
  });
  it('추가 항목 문구에도 응급 표현 없음', () => {
    for (const s of Object.values(LAB_SPEC)) for (const zz of [...s.zones, ...(s.zonesF ?? [])]) expect(zz.mean + zz.todo).not.toMatch(/응급|119/);
  });
});
