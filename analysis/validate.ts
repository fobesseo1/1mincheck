/**
 * 엔진 검증 + 또래 백분위 표 (국민건강영양조사 제9기 2022–2024, 가중치 wt_itvex/3)
 *
 * 실행:  npx tsx analysis/validate.ts      (먼저 python analysis/extract.py)
 * 입력:  analysis/.cache/people.jsonl       (개인 단위, git 제외)
 * 출력:  analysis/results/validation.json  집계 결과만 (저장소에 올림)
 *        engine/src/percentiles.json        성별·나이(±5세)별 분위수 표 (앱에서 사용)
 *
 * 검증 대상은 '진단받지 않은 사람'이다. 엔진은 진단받은 항목을 '관리 중'으로 보여주고 확률을 내지 않는다.
 * 혈압은 '모름'으로 둔다(앱의 기본 상태). 실측 결과 정의는 이용지침서 표 20.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { runAll, type Input } from '../engine/src/engine.ts';

type Person = { year: number; w: number; inp: Input; out: Record<string, number> };
const people: Person[] = readFileSync(new URL('./.cache/people.jsonl', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const IDS = ['dm', 'htn', 'chol', 'osteo'] as const;
const NAMES = { dm: '이미 당뇨일 확률 (진단받지 않은 사람 중 공복혈당 126↑ 또는 당화혈색소 6.5%↑)', htn: '고혈압 (진단받지 않은 사람 중 측정 140/90↑)',
  chol: '고콜레스테롤 (진단받지 않은 사람 중 총콜레스테롤 240↑)', osteo: '골다공증 (골밀도 T-score −2.5 이하, 2024년)' };

/** 가중 AUC: 양성 한 명과 음성 한 명을 무작위로 뽑았을 때 양성의 예측값이 더 클 확률 */
function auc(xs: { p: number; y: number; w: number }[]) {
  const s = [...xs].sort((a, b) => a.p - b.p);
  let neg = 0, tot = 0, wPos = 0, wNeg = 0;
  for (let i = 0; i < s.length; ) {
    let j = i, pos = 0, ng = 0;
    while (j < s.length && s[j].p === s[i].p) { if (s[j].y) pos += s[j].w; else ng += s[j].w; j++; }
    tot += pos * (neg + ng / 2); neg += ng; wPos += pos; wNeg += ng; i = j;
  }
  return tot / (wPos * wNeg);
}
const wmean = (xs: { v: number; w: number }[]) => xs.reduce((a, x) => a + x.v * x.w, 0) / xs.reduce((a, x) => a + x.w, 0);
const r1 = (v: number) => Math.round(v * 10) / 10, r3 = (v: number) => Math.round(v * 1000) / 1000;
const band = (a: number) => (a < 30 ? '19–29' : a < 40 ? '30대' : a < 50 ? '40대' : a < 60 ? '50대' : a < 70 ? '60대' : '70세↑');

// ── 엔진 실행 ──
const rows = people.map((p) => ({ ...p, R: Object.fromEntries(runAll(p.inp).map((r) => [r.id, r])) }));

// ── 검증 ──
const validation: Record<string, unknown> = {};
for (const id of IDS) {
  const xs = rows.filter((r) => r.out[id] != null && r.R[id].status === 'ok' && r.R[id].value != null)
    .map((r) => ({ p: r.R[id].value as number, y: r.out[id], w: r.w, sex: r.inp.sex, age: r.inp.age }));
  if (!xs.length) continue;
  const groups: Record<string, { n: number; predicted: number; observed: number }> = {};
  for (const sex of ['M', 'F'] as const) for (const b of ['19–29', '30대', '40대', '50대', '60대', '70세↑']) {
    const g = xs.filter((x) => x.sex === sex && band(x.age) === b);
    if (g.length < 50) continue;
    groups[`${sex === 'M' ? '남' : '여'} ${b}`] = { n: g.length, predicted: r1(wmean(g.map((x) => ({ v: x.p, w: x.w })))), observed: r1(100 * wmean(g.map((x) => ({ v: x.y, w: x.w })))) };
  }
  // 예측값 10분위별 실제 비율
  const sorted = [...xs].sort((a, b) => a.p - b.p), deciles = [];
  for (let k = 0; k < 10; k++) {
    const g = sorted.slice(Math.floor((k * sorted.length) / 10), Math.floor(((k + 1) * sorted.length) / 10));
    deciles.push({ predicted: r1(wmean(g.map((x) => ({ v: x.p, w: x.w })))), observed: r1(100 * wmean(g.map((x) => ({ v: x.y, w: x.w })))) });
  }
  validation[id] = { name: NAMES[id], n: xs.length, auc: r3(auc(xs)),
    predicted: r1(wmean(xs.map((x) => ({ v: x.p, w: x.w })))), observed: r1(100 * wmean(xs.map((x) => ({ v: x.y, w: x.w })))), groups, deciles };
}

// ── 또래 백분위: 같은 성별, 나이 ±5세, 진단받지 않은 사람의 엔진 확률 분포 (가중 분위수 5–95%) ──
const PCT_IDS = ['dm', 'htn', 'chol', 'nafld', 'osteo'] as const;
const Q = Array.from({ length: 19 }, (_, k) => (k + 1) * 5);
function wquant(xs: { v: number; w: number }[]) {
  const s = [...xs].sort((a, b) => a.v - b.v), W = s.reduce((a, x) => a + x.w, 0);
  let acc = 0, k = 0; const out: number[] = [];
  for (const x of s) { acc += x.w; while (k < Q.length && acc / W >= Q[k] / 100) { out.push(r1(x.v)); k++; } }
  while (out.length < Q.length) out.push(r1(s[s.length - 1].v));
  return out;
}
const percentiles: Record<string, Record<string, Record<string, number[]>>> = {};
let minCell = Infinity;
for (const id of PCT_IDS) {
  percentiles[id] = { M: {}, F: {} };
  for (const sex of ['M', 'F'] as const) for (let a = 19; a <= 80; a++) {
    const g = rows.filter((r) => r.inp.sex === sex && Math.abs(Math.min(r.inp.age, 80) - a) <= 5 && r.R[id].status === 'ok' && r.R[id].value != null)
      .map((r) => ({ v: r.R[id].value as number, w: r.w }));
    if (g.length < 100) continue;           // 표본이 적은 칸은 만들지 않는다
    minCell = Math.min(minCell, g.length);
    percentiles[id][sex][a] = wquant(g);
  }
}

const meta = { source: '국민건강영양조사 제9기(2022–2024) 원시자료, 질병관리청', weights: 'wt_itvex/3 (이용지침서 기수 내 3개년 통합)', adults: people.length,
  note: '혈압은 ‘모름’으로 계산(앱 기본 상태). 진단받지 않은 사람만. 운동은 유산소 신체활동 실천(주 150분)으로 대체', generated: new Date().toISOString().slice(0, 10) };
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL('./results/validation.json', import.meta.url), JSON.stringify({ meta, validation }, null, 2));
writeFileSync(new URL('../engine/src/percentiles.json', import.meta.url), JSON.stringify({ meta: { ...meta, quantiles: Q, window: '같은 성별, 나이 ±5세', minCell }, ...percentiles }));
for (const [id, v] of Object.entries(validation) as [string, any][]) console.log(`${id}: n=${v.n} AUC=${v.auc} 예측 평균 ${v.predicted}% / 실제 ${v.observed}%`);
console.log('percentiles minCell', minCell);
