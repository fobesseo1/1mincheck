// 화면 문장 다듬기(extrasCopy)는 판정·숫자를 바꾸지 않는다
import { describe, it, expect } from 'vitest';
import { runExtras } from '../../../engine/src/extras.ts';
import { polishExtra } from './extrasCopy.ts';
import { samples } from '../../../src/sampleData.ts';

describe('생활·검진 체크 문장 다듬기', () => {
  it('판정(level·s)·항목 수·근거는 그대로, 문장만 바뀐다', () => {
    for (const s of samples) {
      for (const x of runExtras(s.input, undefined, { sbp: 132, dbp: 84, glu: 108, tc: 245, tg: 180, hdl: 46, egfr: 82, upro: 1 })) {
        const y = polishExtra(x);
        expect(y.level).toBe(x.level); expect(y.source).toBe(x.source); expect(y.items.map((i) => i.s)).toEqual(x.items.map((i) => i.s));
        expect(y.head.length).toBeGreaterThan(0);
        for (const t of [y.head, y.action, ...y.items.map((i) => i.t)]) expect(t).not.toContain('\\n');
      }
    }
  });
  it('예: 검진·접종 머리줄', () => {
    const x = runExtras(samples[0].input).find((e) => e.id === 'checkup')!;
    expect(polishExtra(x).head).toMatch(/^\d+세 (여성|남성)에게 권하는\n검사 \d+개, 접종 \d+개$/);
  });
});
