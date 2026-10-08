import { describe, it, expect } from 'vitest';
import { freqOf, peerLine, probB, reasonOf, scopeOf, verdictB, goodHabits, normalLabs } from './b.ts';
import { B_PROFILES, draftOf } from './bProfiles.ts';
import { toInput, suggestScenario, type AppInput } from '../state.ts';
import { modOn } from './features.ts';
import { viewResults } from './view.ts';
import { verdict } from './verdict.ts';

const P = Object.fromEntries(B_PROFILES.map((p) => [p.id, toInput(draftOf(p))!])) as Record<string, AppInput>;
const res = (i: AppInput) => { const sc = suggestScenario(i), r = viewResults(i, sc); return { sc, r, v: verdict(i, r, sc), vb: verdictB(i, r, sc) }; };

describe('B 표시: 자연 빈도', () => {
  it('분모 1,000명/100명, 아주 작은 값은 0으로 반올림하지 않는다', () => {
    expect(freqOf(0.05)).toBe('1,000명 중 1명 미만');
    expect(freqOf(0.3)).toBe('1,000명 중 약 3명');
    expect(freqOf(24)).toBe('100명 중 약 24명');
    expect(freqOf(3.9)).toBe('100명 중 약 4명');
  });
  it('또래 비교: 배수를 지우지 않고, 작은 확률이면 가능성 자체가 낮은 편임을 함께', () => {
    expect(peerLine(0.3, 0.1, '0.1')).toBe('또래 평균 0.1%보다 높지만(약 3.0배), 추정 가능성 자체는 낮은 편이에요');
    expect(peerLine(24, 8, '8.0')).toBe('또래 평균 8.0%보다 높아요 (약 3.0배)');
    expect(peerLine(26, 25, '25.0')).toContain('흔한 편');
    expect(peerLine(2, 4, '4.0')).toBe('또래 평균 4.0%보다 낮아요');
  });
});

describe('B 프로필: 계산·판정은 A 그대로', () => {
  it('모든 프로필이 기본 체크를 마친 입력이 된다', () => {
    for (const p of B_PROFILES) expect(toInput(draftOf(p)), p.id).not.toBeNull();
  });
  it('B 판정 카드의 단계·태그·할 일은 기존 판정과 같다 (④ 문구만 다름)', () => {
    for (const [id, i] of Object.entries(P)) {
      const { v, vb } = res(i);
      expect([vb.tier, vb.tag, vb.actions], id).toEqual([v.tier, v.tag, v.actions]);
      if (v.tier !== 4) expect(vb, id).toEqual(v);
    }
  });
  it('긴급: P8은 맨 위 ① 지금 바로', () => { expect(res(P.P8).v.tier).toBe(1); });
  it('진단자: P7은 당뇨·고혈압을 다시 추정하지 않는다', () => {
    const { r } = res(P.P7);
    for (const id of ['dm', 'htn']) expect(probB(r.prob.find((x) => x.id === id)!).kind).toBe('managed');
  });
  it('P13: 작은 절대 가능성·큰 배수 — 판정은 ② 그대로, 표현은 가능성 자체가 낮은 편임을 함께 (표현 충돌 기록용)', () => {
    const { r, v } = res(P.P13), dm = r.prob.find((x) => x.id === 'dm')!;
    expect(v.tier).toBe(2);
    const b = probB(dm);
    expect(b.kind).toBe('estimate');
    if (b.kind === 'estimate') { expect(b.freq).toContain('1,000명 중'); expect(b.peer).toContain('낮은 편'); }
  });
});

describe('B 표시: 이유·확인 범위·칭찬은 실제 입력만', () => {
  it('결과 이유는 답한 위험 요인만 말한다', () => {
    const dm1 = reasonOf('dm', P.P1, res(P.P1).r.prob.find((x) => x.id === 'dm'))!;
    expect(dm1).not.toMatch(/가족|흡연|음주|고혈압/);
    const dm3 = reasonOf('dm', P.P3, res(P.P3).r.prob.find((x) => x.id === 'dm'))!;
    expect(dm3).toMatch(/부모·형제 당뇨/); expect(dm3).toMatch(/현재 흡연/);
    // 여성 고콜레스테롤은 허리 보정이 없다
    expect(reasonOf('chol', P.P1, res(P.P1).r.prob.find((x) => x.id === 'chol'))).not.toMatch(/허리/);
    // 진단받은 항목은 이유를 만들지 않는다
    expect(reasonOf('dm', P.P7, res(P.P7).r.prob.find((x) => x.id === 'dm'))).toBeNull();
  });
  it('확인 범위: 넣은 검진값만, 설문은 한 분야와 안 한 분야를 구분', () => {
    expect(scopeOf(P.P1).labLine).toBe('반영한 검진값: 없음');
    expect(scopeOf(P.P9).labs).toEqual(['총콜레스테롤']);
    const m = scopeOf(P.P10).mods;
    // 숨긴 분야(lib/features.ts)는 목록에 나오지 않는다
    expect(m.filter((x) => x.done).map((x) => x.name)).toEqual((['수면', '마음'] as const).filter((n) => modOn(n === '수면' ? 'sleep' : 'mind')));
  });
  it('칭찬: 검진값이 없으면 검진 얘기를 하지 않고, 정상인 검진값만 이름으로', () => {
    const { vb } = res(P.P1);
    expect(vb.tier).toBe(4);
    expect(vb.sub).not.toMatch(/검진/);
    expect(vb.sub).toMatch(/담배를 피우지 않고/);
    expect(goodHabits(P.P3)).toEqual(['체중·허리둘레가 정상 범위예요']);   // 흡연·운동 부족·음주는 칭찬하지 않음
    expect(normalLabs(P.P4)).toEqual(['공복혈당']);
    expect(normalLabs(P.P9)).toEqual([]);   // 총콜레스테롤 228은 정상(200 미만)이 아니다
  });
});
