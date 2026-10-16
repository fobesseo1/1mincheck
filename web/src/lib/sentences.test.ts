// 출시 전 수정 A3 · B2 문장 시험 (docs/plan-2026-10-16-prelaunch-fixes.md)
import { describe, expect, it } from 'vitest';
import { plain } from '../components/result-v4';
import { polishExtra } from './extrasCopy';
import type { Extra } from '../../../engine/src/extras';

const p = (t: string) => plain(t).replace(/⁠/g, '');
const ex = (head: string, action = ''): Extra => ({ id: 'dm10', name: '', level: 'note', head, items: [], action, source: '' } as unknown as Extra);

describe('A3 % → 100명 중 몇 명', () => {
  it('범위는 통째로, 조사 맞춤', () => {
    expect(p('비슷한 사람 중 24.3–34.9%가 됐어요')).toBe('비슷한 사람 중 100명 중 24–35명이 됐어요');
    expect(p('약 2.5%예요')).toBe('100명 중 약 3명이에요');
  });
  it('1% 미만은 부풀리지 않음', () => {
    expect(p('약 0.1% (이상적인 경우)')).toBe('100명 중 1명 미만 (이상적인 경우)');
    expect(p('약 0.1 미만% (이상적인 경우)')).toBe('100명 중 1명 미만 (이상적인 경우)');
    expect(p('0.4%')).toBe('100명 중 1명 미만');
  });
  it('단일 값 · 소수 · 변화', () => {
    expect(p('22.7%')).toBe('100명 중 23명');
    expect(p('49.1%에서 40.1%로')).toBe('100명 중 49명에서 40명으로');
  });
  it('사람 수가 아닌 비율은 그대로', () => {
    expect(p('치매 위험의 약 45%는 이런 요인을 바꿔 줄일 수 있어요.')).toBe('치매 위험의 약 45%는 이런 요인을 바꿔 줄일 수 있어요.');
  });
  it('엔진 문장 → 화면 문장', () => {
    expect(polishExtra(ex('비슷한 점수였던 사람 중 24.3–34.9%가 10년 안에 당뇨가 됐어요')).head).toBe('비슷한 점수였던 사람 100명 중 24–35명이\n10년 안에 당뇨가 됐어요');
    expect(polishExtra(ex('비슷한 점수였던 사람 중 24.3%가 10년 안에 당뇨가 됐어요')).head).toBe('비슷한 점수였던 사람 100명 중 24명이\n10년 안에 당뇨가 됐어요');
    expect(polishExtra(ex('계산식으로 본 10년 안 관상동맥질환(심근경색·급사) 가능성은 약 2.5%예요')).head).toBe('비슷한 조건의 사람 100명 중 약 3명에게\n10년 안에 심근경색 등이 생길 것으로 추정돼요');
    expect(polishExtra(ex('계산식으로 본 10년 안 관상동맥질환(심근경색·급사) 가능성은 약 0.1 미만%예요')).head).toBe('비슷한 조건의 사람 100명 중 1명 미만에게\n10년 안에 심근경색 등이 생길 것으로 추정돼요');
    expect(polishExtra(ex('계산식으로 본 4년 안 고혈압 발생 가능성은 약 12%예요')).head).toBe('비슷한 조건의 사람 100명 중 약 12명에게\n4년 안에 고혈압이 생길 것으로 추정돼요');
  });
});

describe('B2 금연 문장은 지금 피우는 사람에게만', () => {
  const dm = '공복혈당·당화혈색소 검사를 받으면 지금 상태(전단계인지)를 정확히 알 수 있어요. 허리를 줄이고 금연하면 점수가 내려가요.';
  const chd = '혈압·콜레스테롤·혈당 관리와 금연이 가장 크게 낮춰요. 이미 협심증·심근경색 진단을 받았다면 이 계산은 해당되지 않아요.';
  it('비흡연 · 과거 흡연', () => {
    for (const s of ['never', 'past'] as const) {
      expect(polishExtra(ex('x', dm), s).action).toMatch(/허리를 줄이면 점수가 내려가요\.$/);
      expect(polishExtra(ex('x', chd), s).action).toMatch(/^혈압·콜레스테롤·혈당을 관리하는 것이 위험을 낮추는 데 도움이 돼요\./);
    }
  });
  it('현재 흡연', () => {
    expect(polishExtra(ex('x', dm), 'current').action).toMatch(/허리를 줄이고 담배를 끊으면 점수가 내려가요\.$/);
    expect(polishExtra(ex('x', chd), 'current').action).toMatch(/^금연과 혈압·콜레스테롤·혈당 관리가 위험을 낮추는 데 도움이 돼요\./);
  });
});
