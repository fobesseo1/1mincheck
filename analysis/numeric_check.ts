/**
 * 숫자 입력 로직 점검 (성별·나이·키·몸무게·허리·혈압·공복혈당·총콜레스테롤만).
 *  1) sweep.csv  — 다른 답은 고정하고 숫자 하나만 올리며 앱 결과를 기록. 숫자가 커지는데 위험이 내려가면 flag
 *  2) raw_compare.csv — 원시자료(국민건강영양조사 2022–2024)를 성별·나이대·숫자 구간으로 나눠
 *     실제 비율(가중)과 앱 평균(그 사람들의 실제 답으로 계산)을 나란히. n<50 칸은 '표본 부족'
 * 실행: PYTHONPATH=… npx tsx analysis/numeric_check.ts → analysis/results/numeric-check/
 * 집계만 저장한다(개인 단위 자료 없음).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Input } from '../engine/src/engine.ts';
import { viewResults } from '../web/src/lib/view.ts';
import { bpOf } from '../web/src/lib/labs.ts';
import { loadPeople } from './people.ts';

export const IDS = ['dm', 'htn', 'chol', 'nafld', 'osteo'] as const;
type Id = (typeof IDS)[number];
type Lab = { sbp?: number; dbp?: number; glu?: number; tc?: number };

/** 앱이 보여주는 값(%) — 확률이면 그 값, 범위면 가운데, 기준 해당이면 'criteria', 진단자·대상 아님은 빈칸 */
export function appValues(inp: Input, lab: Lab = {}): Record<Id, number | 'criteria' | null> {
  const i = { ...inp, ...(Object.keys(lab).length ? { lab } : {}) } as Input & { lab?: Lab };
  if (lab.sbp != null && lab.dbp != null) i.bp = bpOf(lab.sbp, lab.dbp);
  const v = viewResults(i as never, {} as never);
  const out = {} as Record<Id, number | 'criteria' | null>;
  for (const id of IDS) {
    const p = v.prob.find((x) => x.id === id)!;
    if (p.status === 'criteria') out[id] = 'criteria';
    else if ((p.status as string) === 'measured') out[id] = null;   // 검진 수치가 기준 미만이면 확률 대신 상태를 보여준다
    else if (p.cmp) out[id] = p.cmp.me;
    else if (p.pct.includes('–')) { const [a, b] = p.pct.split('–').map(Number); out[id] = (a + b) / 2; }
    else if (p.pct !== '–' && p.status === 'ok') out[id] = Number(p.pct.replace('0.1 미만', '0.05'));
    else out[id] = null;
  }
  return out;
}

const OUT = new URL('./results/numeric-check/', import.meta.url);
const csv = (rows: (string | number | null)[][]) => '﻿' + rows.map((r) => r.map((x) => (x == null ? '' : typeof x === 'string' && /[,"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)).join(',')).join('\n') + '\n';
const r1 = (x: number | 'criteria' | null) => (x == null ? null : x === 'criteria' ? 'criteria' : Math.round(x * 10) / 10);

// ── 1) 한 숫자씩 올리기 ──
/** 위험이 커져야(또는 같아야) 하는 방향. osteo는 BMI·몸무게가 오르면 낮아지는 게 정상이라 제외 */
const UP: Record<string, Id[]> = { bmi: ['dm', 'htn', 'nafld'], waist: ['dm', 'htn', 'nafld'], sbp: ['htn'], glu: ['dm'], tc: ['chol'], age: ['dm', 'htn', 'chol', 'osteo'] };
/** 이 값부터는 위험이 계속 올라가야 하는 구간 (BMI 25 비만, 허리 남 90·여 85 복부비만, 혈압 120, 공복혈당 100, 총콜 200, 나이 40) */
const THRESH: Record<string, (sex: 'M' | 'F') => number> = { bmi: () => 25, waist: (s) => (s === 'M' ? 90 : 85), sbp: () => 120, glu: () => 100, tc: () => 200, age: () => 40 };
export function sweep() {
  const rows: (string | number | null)[][] = [['profile', 'sex', 'age', 'variable', 'value', ...IDS, 'flag']];
  const flags: string[] = [], plateaus: string[] = [];
  for (const sex of ['M', 'F'] as const) for (const age of [30, 45, 55, 65, 75]) {
    const h = sex === 'M' ? 172 : 160, wMid = sex === 'M' ? 88 : 80;
    const base: Input = { age, sex, heightCm: h, weightKg: 23 * (h / 100) ** 2, waistCm: wMid, smoke: 'never', alcohol: 'none', famDM: false,
      dx: { htn: false, dm: false, chol: false }, bp: 'unknown', exercise: true, meno: sex === 'F' && age >= 40 ? age >= 50 : null };
    const vars: [string, number[], (v: number) => [Input, Lab]][] = [
      ['bmi', [18, 20, 22, 24, 26, 28, 30, 33, 36, 40], (v) => [{ ...base, weightKg: Math.round(v * (h / 100) ** 2 * 10) / 10 }, {}]],
      ['waist', sex === 'M' ? [70, 78, 85, 90, 95, 100, 105, 110, 120] : [62, 70, 78, 85, 90, 95, 100, 110], (v) => [{ ...base, waistCm: v }, {}]],
      ['sbp', [100, 110, 118, 125, 132, 138, 145, 155, 165, 175], (v) => [base, { sbp: v, dbp: Math.round(v * 0.62) }]],
      ['glu', [80, 88, 95, 100, 105, 110, 115, 120, 125, 130, 150], (v) => [base, { glu: v }]],
      ['tc', [150, 170, 190, 210, 230, 245, 270], (v) => [base, { tc: v }]],
      ['age', [25, 35, 45, 55, 65, 75, 85], (v) => [{ ...base, age: v, meno: sex === 'F' && v >= 40 ? v >= 50 : null }, {}]],
    ];
    for (const [name, vals, mk] of vars) {
      if (name === 'age' && age !== 45) continue;   // 나이 올리기는 한 번만
      let prev: Record<Id, number | 'criteria' | null> | null = null;
      const seen: { val: number; a: Record<Id, number | 'criteria' | null> }[] = [];
      for (const val of vals) {
        const [i, lab] = mk(val), a = appValues(i, lab);
        const bad = prev ? UP[name].filter((id) => typeof a[id] === 'number' && typeof prev![id] === 'number' && (a[id] as number) < (prev![id] as number) - 0.05) : [];
        const flag = bad.length ? `내려감: ${bad.join('·')}` : '';
        if (flag) flags.push(`${sex}${age} ${name} ${val}: ${flag}`);
        rows.push([`${sex}${age}`, sex, name === 'age' ? val : age, name, val, ...IDS.map((id) => r1(a[id])), flag]);
        prev = a; seen.push({ val, a });
      }
      // 의학적으로 위험이 더 올라가야 하는 구간(기준값 이후)에서 결과가 전혀 안 오르면 '그대로'
      const from = THRESH[name](sex);
      for (const id of UP[name]) {
        const xs = seen.filter((x) => x.val >= from && typeof x.a[id] === 'number');
        if (xs.length >= 3 && (xs[xs.length - 1].a[id] as number) <= (xs[0].a[id] as number) + 0.05) {
          const f = `그대로: ${id} (${name} ${xs[0].val}→${xs[xs.length - 1].val}에서 ${r1(xs[0].a[id])}% 고정)`;
          plateaus.push(`${sex}${age} ${f}`); rows.push([`${sex}${age}`, sex, age, name, null, ...IDS.map(() => null), f]);
        }
      }
    }
  }
  return { rows, flags, plateaus };
}

// ── 2) 원시자료와 비교 ──
export function rawCompare() {
  const ppl = loadPeople('checked').filter((p) => p.inp.age >= 19);
  const bmiOf = (i: Input) => i.weightKg / (i.heightCm / 100) ** 2;
  const AGE: [string, number, number][] = [['19–39', 19, 39], ['40–49', 40, 49], ['50–59', 50, 59], ['60–69', 60, 69], ['70+', 70, 200]];
  // 사람마다 앱 값(간편: 숫자 검진값 없이 / 혈당: 공복혈당 넣고) 한 번씩
  const easy = new Map<object, Record<Id, number | 'criteria' | null>>(), withGlu = new Map<object, number | 'criteria' | null>();
  for (const p of ppl) {
    easy.set(p, appValues(p.inp));
    if (p.lab.glu != null) withGlu.set(p, appValues(p.inp, { glu: p.lab.glu }).dm);
  }
  type Bin = [string, (p: (typeof ppl)[number]) => boolean];
  const bins: Record<string, Bin[]> = {
    BMI: [['<18.5', (p) => bmiOf(p.inp) < 18.5], ['18.5–23', (p) => bmiOf(p.inp) >= 18.5 && bmiOf(p.inp) < 23], ['23–25', (p) => bmiOf(p.inp) >= 23 && bmiOf(p.inp) < 25], ['25–28', (p) => bmiOf(p.inp) >= 25 && bmiOf(p.inp) < 28], ['28–30', (p) => bmiOf(p.inp) >= 28 && bmiOf(p.inp) < 30], ['30–33', (p) => bmiOf(p.inp) >= 30 && bmiOf(p.inp) < 33], ['33+', (p) => bmiOf(p.inp) >= 33]],
    '허리(남)': [['<80', (p) => p.inp.waistCm! < 80], ['80–85', (p) => p.inp.waistCm! >= 80 && p.inp.waistCm! < 85], ['85–90', (p) => p.inp.waistCm! >= 85 && p.inp.waistCm! < 90], ['90–95', (p) => p.inp.waistCm! >= 90 && p.inp.waistCm! < 95], ['95–100', (p) => p.inp.waistCm! >= 95 && p.inp.waistCm! < 100], ['100–105', (p) => p.inp.waistCm! >= 100 && p.inp.waistCm! < 105], ['105+', (p) => p.inp.waistCm! >= 105]],
    '허리(여)': [['<75', (p) => p.inp.waistCm! < 75], ['75–80', (p) => p.inp.waistCm! >= 75 && p.inp.waistCm! < 80], ['80–85', (p) => p.inp.waistCm! >= 80 && p.inp.waistCm! < 85], ['85–90', (p) => p.inp.waistCm! >= 85 && p.inp.waistCm! < 90], ['90–95', (p) => p.inp.waistCm! >= 90 && p.inp.waistCm! < 95], ['95–100', (p) => p.inp.waistCm! >= 95 && p.inp.waistCm! < 100], ['100+', (p) => p.inp.waistCm! >= 100]],
    공복혈당: [['<90', (p) => p.lab.glu! < 90], ['90–100', (p) => p.lab.glu! >= 90 && p.lab.glu! < 100], ['100–110', (p) => p.lab.glu! >= 100 && p.lab.glu! < 110], ['110–126', (p) => p.lab.glu! >= 110 && p.lab.glu! < 126]],
  };
  const rows: (string | number | null)[][] = [['item', 'mode', 'sex', 'age', 'var', 'bin', 'n', 'events', 'observed_pct', 'app_mean_pct', 'diff_pt', 'flag']];
  const flags: string[] = [];
  const W = (xs: typeof ppl, f: (p: (typeof ppl)[number]) => number) => xs.reduce((a, p) => a + p.w * f(p), 0) / xs.reduce((a, p) => a + p.w, 0);
  const add = (item: Id, mode: string, sex: string, age: string, v: string, bin: string, xs: typeof ppl, app: (p: (typeof ppl)[number]) => number) => {
    if (xs.length < 50) { rows.push([item, mode, sex, age, v, bin, xs.length, null, null, null, null, '표본 부족']); return; }
    const obs = 100 * W(xs, (p) => p.out[item]), am = W(xs, app), d = am - obs, ev = xs.filter((p) => p.out[item] === 1).length;
    const flag = Math.abs(d) >= Math.max(3, 0.35 * obs) && ev >= 10 ? (d < 0 ? '앱이 낮음' : '앱이 높음') : '';
    if (flag) flags.push(`${item} ${mode} ${sex}${age} ${v} ${bin}: 실제 ${obs.toFixed(1)} 앱 ${am.toFixed(1)}`);
    rows.push([item, mode, sex, age, v, bin, xs.length, ev, Math.round(obs * 10) / 10, Math.round(am * 10) / 10, Math.round(d * 10) / 10, flag]);
  };
  for (const item of ['dm', 'htn', 'chol', 'osteo'] as const) for (const sex of ['M', 'F'] as const) for (const [al, a0, a1] of AGE) {
    // 간편: 진단받지 않은 사람, 앱 값이 숫자인 사람만
    const base = ppl.filter((p) => p.inp.sex === sex && p.inp.age >= a0 && p.inp.age <= a1 && p.out[item] != null && !(item !== 'osteo' && p.inp.dx[item]) && typeof easy.get(p)![item] === 'number');
    for (const v of ['BMI', sex === 'M' ? '허리(남)' : '허리(여)']) for (const [bl, f] of bins[v]) {
      if (v !== 'BMI' && !base.some((p) => p.inp.waistCm != null)) continue;
      add(item, '간편', sex, al, v, bl, base.filter((p) => (v === 'BMI' || p.inp.waistCm != null) && f(p)), (p) => easy.get(p)![item] as number);
    }
    if (item === 'dm') {
      const g = ppl.filter((p) => p.inp.sex === sex && p.inp.age >= a0 && p.inp.age <= a1 && p.out.dm != null && !p.inp.dx.dm && p.lab.glu != null && p.lab.glu < 126 && typeof withGlu.get(p) === 'number');
      for (const [bl, f] of bins.공복혈당) add('dm', '혈당 입력', sex, al, '공복혈당', bl, g.filter(f), (p) => withGlu.get(p) as number);
    }
  }
  // 지방간: 실측이 없어 방향만 (BMI·허리 구간별 앱 평균)
  return { rows, flags };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  mkdirSync(OUT, { recursive: true });
  const s = sweep();
  writeFileSync(new URL('sweep.csv', OUT), csv(s.rows));
  const rc = rawCompare();
  writeFileSync(new URL('raw_compare.csv', OUT), csv(rc.rows));
  const list = (xs: string[]) => xs.map((f) => '- ' + f).join('\n') || '- 없음';
  const md = `# 숫자 입력 로직 점검 (${new Date().toISOString().slice(0, 10)})\n\n- sweep.csv: 숫자가 커지는데 위험이 내려간 곳 ${s.flags.length}개, 위험이 올라가야 할 구간에서 그대로인 곳 ${s.plateaus.length}개\n- raw_compare.csv: 실제와 크게 다른 칸(차이 3%p 이상이면서 상대 35% 이상, 양성 10명 이상) ${rc.flags.length}개\n\n## 파일과 열\n- **sweep.csv**: 다른 답은 고정(비흡연·비음주·운동함·가족력 없음·진단 없음, 키 남 172·여 160, BMI 23, 허리 남 88·여 80)하고 숫자 하나만 올림. 열 = profile(성별+나이), variable(bmi·waist·sbp·glu·tc·age), value, 항목별 앱 값(%; criteria = 검진 수치가 기준 이상, 빈칸 = 확률 대신 상태 표시), flag\n- **raw_compare.csv**: 국민건강영양조사 2022–2024 원시자료, 그 병을 진단받지 않은 사람. mode 간편 = 검진 수치 없이(그 사람의 실제 답으로), 혈당 입력 = 공복혈당까지 넣고. n, events(양성 수), observed_pct(가중 실제 비율), app_mean_pct(같은 사람들의 앱 값 가중 평균), diff_pt, flag. n<50은 표본 부족\n- **before_*.csv**: BMI·허리 연속 보정 전\n\n## 내려간 곳\n${list(s.flags)}\n\n## 그대로인 곳\n${list(s.plateaus)}\n\n## 실제와 크게 다른 칸\n${list(rc.flags)}\n`;
  writeFileSync(new URL('README.md', OUT), md);
  console.log(md);
}
