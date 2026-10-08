import { describe, it, expect } from 'vitest';
import { labCards, labSummary, LAB_SPEC } from './labZones.ts';

const one = (L: Parameters<typeof labCards>[0], sex: 'M' | 'F' = 'M') => labCards(L, sex)[0];

describe('검진 풀이 구간 (공식 기준 그대로)', () => {
  it('혈압: 높은 값·낮은 값 중 더 높은 구간, 180/120 이상은 지금 바로 병원', () => {
    expect(one({ sbp: 118, dbp: 76 }).zone).toBe('정상');
    expect(one({ sbp: 125, dbp: 78 }).zone).toBe('주의');
    expect(one({ sbp: 118, dbp: 85 }).zone).toBe('고혈압 전단계');
    expect(one({ sbp: 118, dbp: 85 }).note).toMatch(/이완기/);
    expect(one({ sbp: 142, dbp: 88 }).zone).toBe('고혈압 기준');
    const u = one({ sbp: 185, dbp: 100 });
    expect([u.zone, u.tone]).toEqual(['매우 높음', 'urgent']); expect(u.todo).toMatch(/지금 바로 병원 가세요/);
    expect(one({ sbp: 150, dbp: 121 }).tone).toBe('urgent');
  });
  it('공복혈당: 100·126 경계, 250 오늘 진료, 300 지금 바로 병원', () => {
    expect(one({ glu: 99 }).zone).toBe('정상');
    expect(one({ glu: 100 }).zone).toBe('당뇨 전 단계');
    expect(one({ glu: 126 }).zone).toBe('당뇨 기준');
    expect(one({ glu: 260 }).todo).toMatch(/오늘 진료/);
    expect(one({ glu: 310 }).todo).toMatch(/지금 바로 병원 가세요/);
  });
  it('지질: 총콜 200·240, 중성지방 150·200·500, HDL 40·60 (여성 50 미만 안내)', () => {
    expect([one({ tc: 199 }).zone, one({ tc: 200 }).zone, one({ tc: 240 }).zone]).toEqual(['적정', '경계', '높음']);
    expect([one({ tg: 149 }).zone, one({ tg: 150 }).zone, one({ tg: 200 }).zone, one({ tg: 500 }).zone]).toEqual(['적정', '경계', '높음', '매우 높음']);
    expect([one({ hdl: 39 }).zone, one({ hdl: 45 }).zone, one({ hdl: 60 }).zone]).toEqual(['낮음', '보통', '높음(좋음)']);
    expect(one({ hdl: 45 }, 'F').note).toMatch(/대사증후군/);
    expect(one({ hdl: 45 }, 'M').note).toBeUndefined();
  });
  it('콩팥: eGFR 60·90, 요단백 1+ 이상', () => {
    expect([one({ egfr: 55 }).zone, one({ egfr: 75 }).zone, one({ egfr: 95 }).zone]).toEqual(['낮음', '약간 낮음', '정상']);
    expect([one({ upro: 0 }).zone, one({ upro: 1 }).zone, one({ upro: 2 }).zone, one({ upro: 3 }).zone]).toEqual(['음성', '약양성(±)', '양성(1+ 이상)', '양성(1+ 이상)']);
  });
  it('막대 위 자리는 0–1, 구간 안에 들어간다', () => {
    for (const L of [{ sbp: 90, dbp: 50 }, { sbp: 250, dbp: 150 }, { glu: 50 }, { glu: 500 }, { tg: 2000 }, { hdl: 10 }, { egfr: 5 }, { upro: 3 }]) {
      const c = one(L), n = c.zones.length;
      expect(c.pos).toBeGreaterThanOrEqual(0); expect(c.pos).toBeLessThanOrEqual(1);
      expect(Math.max(0, Math.min(n - 1, Math.floor(c.pos * n - 1e-9)))).toBe(c.at);
    }
  });
  it('넣지 않은 항목은 카드가 없고, 요약은 가장 급한 것부터', () => {
    expect(labCards({}, 'M')).toEqual([]);
    expect(labCards({ sbp: 120 }, 'M')).toEqual([]);   // 혈압은 두 값이 다 있어야
    const cs = labCards({ sbp: 118, dbp: 76, glu: 108, tc: 250, egfr: 95 }, 'F'), s = labSummary(cs);
    expect(s.tone).toBe('high'); expect(s.title).toBe('총콜레스테롤을 확인해 보세요');
    expect(s.order[0].key).toBe('tc'); expect(s.order[1].key).toBe('glu');
    expect(labSummary(labCards({ glu: 108 }, 'F')).title).toBe('공복혈당은 조금 신경 써야 해요');
    expect(labSummary(labCards({ glu: 90, tc: 180 }, 'F')).title).toBe('넣은 수치가 모두 정상 범위예요');
  });
  it('급한 문구는 지금 바로 병원 가세요만 쓴다', () => {
    const all = Object.values(LAB_SPEC).flatMap((s) => s.zones.flatMap((z) => [z.mean, z.todo, z.alt?.todo ?? '']));
    for (const t of all) expect(t).not.toMatch(/응급|119/);
  });
});
