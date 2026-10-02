import { describe, it, expect } from 'vitest';
import { viewResults } from './view.ts';
import { verdict } from './verdict.ts';
import { suggestScenario } from '../state.ts';
import { CASES, TIER_NAME } from './tiers.cases.ts';

// 정답지(docs/action-tiers.md)의 가상 고객마다 첫 화면 판정 단계와 핵심 말을 확인
describe('첫 화면 판정 (정답지)', () => {
  for (const c of CASES) {
    it(`${c.id} ${c.who} → ${TIER_NAME[c.tier]}`, () => {
      const sc = suggestScenario(c.inp), v = verdict(c.inp, viewResults(c.inp, sc), sc);
      const text = [v.title, v.sub, ...v.actions.flatMap((x) => [x.t, x.d ?? '']), v.also ?? ''].join(' ');
      expect(TIER_NAME[v.tier]).toBe(TIER_NAME[c.tier]);
      for (const m of c.must) expect(text).toContain(m);
      for (const m of c.not ?? []) expect(text).not.toContain(m);
      expect(v.actions.length).toBeGreaterThan(0);
      expect(v.actions.length).toBeLessThanOrEqual(2);
      expect(text).not.toMatch(/(^|[^\d/])119|응급실|유병률|백분위|AUC|보정/);
    });
  }
});
