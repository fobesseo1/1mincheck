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
      expect(v.actions.length).toBeLessThanOrEqual(v.tier === 2 ? 3 : 2);   // 병원 확인은 걸린 문제를 최대 3개까지 모두
      expect(text).not.toMatch(/(^|[^\d/])119|응급|유병률|백분위|AUC|보정/);   // 119·응급·응급실은 절대 쓰지 않는다
    });
  }
});

// 앱 문구 전체에서 금지어: 한국 사용자에게 장난처럼 들리고, 정말 급한 사람은 앱을 보고 있지 않다 → '지금 바로 병원 가세요'만 쓴다
describe('금지어 (119·응급)', () => {
  it('앱·엔진 소스 어디에도 없다 (테스트·정답지 파일 제외)', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const roots = [new URL('../', import.meta.url), new URL('../../../engine/src/', import.meta.url)].map((u) => decodeURIComponent(u.pathname.replace(/^\/([A-Za-z]:)/, '$1')));
    const hits: string[] = [];
    // json 은 숫자 자료(표본 수 등)라 '응급'만 본다
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx|json)$/.test(f) && !/\.test\.ts$|tiers\.cases\.ts$/.test(f)) { const t = readFileSync(p, 'utf8'); if (/응급/.test(t) || (!f.endsWith('.json') && /(^|[^\d/.])119(?!\d)/.test(t))) hits.push(p); } } };
    roots.forEach(walk);
    expect(hits).toEqual([]);
  });
});
