// 출시 전 검증: 입력 조합을 넓게 돌려 계산·문장이 깨지지 않는지 (경계 나이 · 성별 · 허리/혈압 모름 · 진단 · 검진값)
// docs/plan-2026-10-16-prelaunch-fixes.md '출시 전 남은 검증 — 계산 기준 사례'
import { describe, expect, it } from 'vitest';
import { runAll } from '../../../engine/src/engine';
import { runExtras } from '../../../engine/src/extras';
import { overviewRows } from './overview';
import { verdict } from './verdict';
import { polishExtra } from './extrasCopy';
import { plain } from '../components/result-v4';
import { drinkOf, suggestScenario, type AppInput } from '../state';
import { labOf, byId, viewResults } from './view';

const AGES = [19, 29, 30, 39, 40, 49, 50, 64, 65, 69, 70, 74, 75, 85, 100];
const BAD = /undefined|NaN|null|Infinity|\[object|–100명|명가|명는|명예요|\$\{/;

function* cases(): Generator<[string, AppInput]> {
  for (const sex of ['M', 'F'] as const) for (const age of AGES) for (const waist of [null, 70, 95, 120]) for (const bp of ['unknown', 'normal', 'high'] as const)
    for (const dx of [{ htn: false, dm: false, chol: false }, { htn: true, dm: true, chol: true }]) for (const lab of [undefined, { sbp: 150, dbp: 95, glu: 112, tc: 250, hdl: 38, egfr: 55, alt: 60 }]) {
      const inp: AppInput = { age, sex, heightCm: 165, weightKg: 70, waistCm: waist, smoke: age % 2 ? 'current' : 'never', alcohol: age > 60 ? 'd1_4' : 'none', famDM: age % 3 === 0, dx, bp, exercise: age % 5 === 0 ? null : age < 50, meno: sex === 'F' && age >= 40 ? (age >= 50 ? true : null) : null, ...(lab ? { lab } : {}) } as AppInput;
      yield [`${sex}${age} 허리${waist ?? '모름'} 혈압${bp} ${dx.htn ? '진단' : ''}${lab ? '검진' : ''}`, inp];
    }
}

describe('입력 조합 전체', () => {
  it('확률은 0–100, 순위는 1–99, 화면 문장에 깨진 글자 없음', () => {
    let n = 0;
    for (const [name, inp] of cases()) {
      n++;
      for (const r of runAll(inp)) {
        if (r.value != null) expect(r.value, `${name} ${r.id}`).toBeGreaterThanOrEqual(0), expect(r.value, `${name} ${r.id}`).toBeLessThanOrEqual(100);
        if (r.range) expect(r.range[0], `${name} ${r.id} 범위`).toBeLessThanOrEqual(r.range[1]);
      }
      for (const row of overviewRows(inp)) {
        if (row.num?.rank != null) expect(row.num.rank).toBeGreaterThanOrEqual(1), expect(row.num.rank).toBeLessThanOrEqual(99);
        for (const t of [row.side, row.sub, row.word]) expect(BAD.test(t ?? ''), `${name} ${row.id}: ${t}`).toBe(false);
      }
      for (const x0 of runExtras(inp, drinkOf(inp), labOf(inp))) {
        const x = polishExtra(x0, inp.smoke);
        for (const t of [x.head, x.action, ...x.items.flatMap((i) => [i.t, i.sub ?? ''])]) expect(BAD.test(plain(t)), `${name} ${x.id}: ${plain(t)}`).toBe(false);
      }
      const sc = suggestScenario(inp), v = verdict(inp, viewResults(inp, sc), sc);
      expect(v.tier, name).toBeGreaterThanOrEqual(1);
      for (const a of v.actions ?? []) expect(BAD.test(plain(`${a.t} ${a.d ?? ''}`)), `${name} 할 일: ${a.t}`).toBe(false);
    }
    expect(n).toBeGreaterThan(1000);
  });

  it('나이 제한 계산은 정해진 나이에서만 나온다', () => {
    const base: AppInput = { age: 50, sex: 'M', heightCm: 172, weightKg: 82, waistCm: 92, smoke: 'never', alcohol: 'none', famDM: false, dx: { htn: false, dm: false, chol: false }, bp: 'normal', exercise: false, meno: null, lab: { sbp: 130, dbp: 85, tc: 220, hdl: 45 } } as AppInput;
    const has = (age: number, id: string) => runExtras({ ...base, age }, drinkOf({ ...base, age }), labOf({ ...base, age } as AppInput)).some((x) => x.id === id);
    // 10년 당뇨(KoGES 40–69세) · 4년 고혈압(40–69세) · 10년 관상동맥질환(30–74세)
    for (const [id, lo, hi] of [['dm10', 40, 69], ['htn4', 40, 69], ['chd10', 30, 74]] as const) {
      expect(has(lo, id), `${id} ${lo}세`).toBe(true);
      expect(has(hi, id), `${id} ${hi}세`).toBe(true);
      expect(has(lo - 1, id), `${id} ${lo - 1}세`).toBe(false);
      expect(has(hi + 1, id), `${id} ${hi + 1}세`).toBe(false);
    }
  });

  it('진단받은 질환은 가능성 대신 관리 중', () => {
    const inp = { age: 55, sex: 'F', heightCm: 158, weightKg: 60, waistCm: 82, smoke: 'never', alcohol: 'none', famDM: true, dx: { htn: true, dm: true, chol: false }, bp: 'high', exercise: true, meno: true } as AppInput;
    const R = byId(runAll(inp));
    expect(R.htn.status).toBe('managed');
    expect(R.dm.status).toBe('managed');
  });
});
