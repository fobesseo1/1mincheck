/**
 * 랜딩 미니 체험 표: 성별·나이대·BMI 구간별 (국민건강영양조사 제9기 2022–2024 원시자료, 가중, 집계만)
 * - 당뇨·고혈압: 그 병을 진단받지 않은 사람 중 검사에서 기준에 해당한 실제 비율
 * - 지방간: 실측(초음파)이 없어, 같은 칸 사람들의 실제 답으로 앱 점수표 확률을 계산한 평균 (40세 미만 여성은 폐경 전으로)
 * 칸의 표본이 50명 미만이면 BMI 25–29·30 이상을 '25 이상'으로 합치고, 그래도 부족하면 성별·나이대 전체를 쓴다.
 * 실행: PYTHONPATH=… npx tsx analysis/mini_table.ts → engine/src/mini_rates.json
 */
import { writeFileSync } from 'node:fs';
import { loadPeople, type Person } from './people.ts';
import { viewResults } from '../web/src/lib/view.ts';

const AGES = [[19, 29], [30, 39], [40, 49], [50, 59], [60, 69], [70, 200]] as const;
const BMIS = [[0, 23], [23, 25], [25, 30], [30, 99]] as const;
const bmi = (p: Person) => p.inp.weightKg / (p.inp.heightCm / 100) ** 2;
const ppl = loadPeople('checked').filter((p) => p.inp.age >= 19);
const nafldOf = new Map<Person, number>();
for (const p of ppl) { const i = p.inp.sex === 'F' && p.inp.age < 40 && p.inp.meno == null ? { ...p.inp, meno: false } : p.inp; const v = viewResults(i as never, {} as never).prob.find((x) => x.id === 'nafld')!; if (v.status === 'ok' && v.cmp) nafldOf.set(p, v.cmp.me); }

type Cell = { pct: number; n: number; scope: string } | null;
function rate(xs: Person[], id: 'dm' | 'htn' | 'nafld'): Cell {
  const ys = id === 'nafld' ? xs.filter((p) => nafldOf.has(p)) : xs.filter((p) => !p.inp.dx[id] && p.out[id] != null);
  if (ys.length < 50) return null;
  const W = ys.reduce((a, p) => a + p.w, 0);
  const v = ys.reduce((a, p) => a + p.w * (id === 'nafld' ? nafldOf.get(p)! / 100 : p.out[id]), 0) / W;
  return { pct: Math.round(1000 * v) / 10, n: ys.length, scope: '' };
}
const out: Record<string, unknown> = {};
for (const sex of ['M', 'F'] as const) for (const [a0, a1] of AGES) {
  const base = ppl.filter((p) => p.inp.sex === sex && p.inp.age >= a0 && p.inp.age <= a1);
  const key = `${sex}${a0}`;
  const row: Record<string, unknown> = {};
  for (const id of ['dm', 'htn', 'nafld'] as const) {
    const all = rate(base, id);
    row[id] = BMIS.map(([b0, b1], k) => {
      let c = rate(base.filter((p) => bmi(p) >= b0 && bmi(p) < b1), id);
      if (c) return { ...c, scope: 'bmi' };
      if (k >= 2) { c = rate(base.filter((p) => bmi(p) >= 25), id); if (c) return { ...c, scope: 'bmi25+' }; }
      return all ? { ...all, scope: 'age' } : null;
    });
    row[id + '_all'] = all;
  }
  out[key] = row;
}
const meta = { source: '국민건강영양조사 제9기(2022–2024) 원시자료, 질병관리청 — 집계만', generated: new Date().toISOString().slice(0, 10),
  ages: AGES.map(([a, b]) => (b > 150 ? `${a}+` : `${a}–${b}`)), bmi: ['<23', '23–24.9', '25–29.9', '≥30'],
  rule: '칸 n<50이면 BMI 25 이상 합침(scope bmi25+), 그래도 부족하면 성별·나이대 전체(scope age). dm·htn = 진단받지 않은 사람의 실측 비율, nafld = 같은 칸 사람들 실제 답으로 계산한 앱 확률 평균' };
writeFileSync(new URL('../engine/src/mini_rates.json', import.meta.url), JSON.stringify({ meta, table: out }, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k, ['dm', 'htn', 'nafld'].map((id) => id + ' ' + (v as any)[id].map((c: any) => c ? `${c.pct}${c.scope === 'bmi' ? '' : '*'}` : '–').join('/')).join(' | '));
