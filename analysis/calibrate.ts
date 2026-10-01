/**
 * 실측 보정 계수 만들기 (보정 v1)
 *
 * 실행:  npx tsx analysis/calibrate.ts   (먼저 python analysis/extract.py)
 * 출력:  engine/src/calibration.json        앱에서 쓰는 보정 계수·또래 실측 비율 (집계만)
 *        analysis/results/calibration.json  보정 확인 결과 (만든 자료와 다른 자료로)
 *
 * 방법: 진단받지 않은 사람에서 logit(실측) ~ a[성별·연령대] + b·logit(엔진 확률) 가중 로지스틱 회귀.
 * 확인: 당뇨·고혈압·콜레스테롤은 2022–2023으로 만들고 2024로 확인. 골다공증은 2024만 있어 짝수/홀수 행으로 나눠 확인.
 * 최종 계수는 확인을 마친 뒤 전체 자료로 다시 만든다.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { runAll } from '../engine/src/engine.ts';
import { loadPeople } from './people.ts';
// 주의: 이 스크립트는 engine/src/calibration.json(앱 보정)과 analysis/results/calibration.json 을 다시 쓴다. 보정 버전을 바꿀 때만 실행.
// 보정 v1 은 EXTRACT_MODE=legacy (예전 추출 규칙)로 만들어졌다. 새 규칙 비교는 analysis/scenarios/compare_calibration.ts.
const people = loadPeople(process.env.EXTRACT_MODE === 'legacy' ? 'legacy' : 'checked');
const IDS = ['dm', 'htn', 'chol', 'osteo'] as const;
type Id = (typeof IDS)[number];
const bandOf = (age: number) => (age < 30 ? 0 : age >= 70 ? 5 : Math.floor(age / 10) - 2);
const gIdx = (sex: string, age: number) => (sex === 'M' ? 0 : 6) + bandOf(age);
const logit = (p: number) => Math.log(p / (1 - p));
const clamp = (p: number) => Math.min(0.995, Math.max(0.001, p));
const r1 = (v: number) => Math.round(v * 10) / 10, r3 = (v: number) => Math.round(v * 1000) / 1000, r4 = (v: number) => Math.round(v * 1e4) / 1e4;

type Row = { g: number; x: number; y: number; w: number; p: number; year: number; i: number };
const data: Record<Id, Row[]> = { dm: [], htn: [], chol: [], osteo: [] };
people.forEach((pp, i) => {
  const R = Object.fromEntries(runAll(pp.inp).map((r) => [r.id, r]));
  for (const id of IDS) {
    const r = R[id], y = pp.out[id];
    if (y == null || r.status !== 'ok' || r.value == null) continue;    // 진단받지 않은 사람만
    data[id].push({ g: gIdx(pp.inp.sex, pp.inp.age), x: logit(clamp(r.value / 100)), y, w: pp.w, p: r.value, year: pp.year, i });
  }
});

/** 가중 로지스틱: 12개 그룹 절편 + 공통 기울기. 표본이 없는 그룹은 null */
function fit(rows: Row[]) {
  const present = [...new Set(rows.map((r) => r.g))].sort((a, b) => a - b), K = present.length + 1;
  const col = new Map(present.map((g, k) => [g, k]));
  const W = rows.reduce((a, r) => a + r.w, 0), nw = rows.length / W;        // 가중치를 표본 수 규모로
  let beta = new Array(K).fill(0); beta[K - 1] = 1;
  for (let it = 0; it < 50; it++) {
    const H = Array.from({ length: K }, () => new Array(K).fill(0)), gr = new Array(K).fill(0);
    for (const r of rows) {
      const k = col.get(r.g)!, z = beta[k] + beta[K - 1] * r.x, p = 1 / (1 + Math.exp(-z)), w = r.w * nw, v = w * p * (1 - p), e = w * (r.y - p);
      gr[k] += e; gr[K - 1] += e * r.x;
      H[k][k] += v; H[k][K - 1] += v * r.x; H[K - 1][k] += v * r.x; H[K - 1][K - 1] += v * r.x * r.x;
    }
    const step = solve(H, gr); beta = beta.map((b, k) => b + step[k]);
    if (Math.max(...step.map(Math.abs)) < 1e-8) break;
  }
  const a: (number | null)[] = new Array(12).fill(null);
  present.forEach((g, k) => { a[g] = beta[k]; });
  return { a, slope: beta[K - 1] };
}
function solve(A: number[][], b: number[]) {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((row, i) => row[n] / row[i]);
}
const apply = (m: { a: (number | null)[]; slope: number }, r: Row) => (m.a[r.g] == null ? r.p : 100 / (1 + Math.exp(-(m.a[r.g]! + m.slope * r.x))));
function auc(xs: { p: number; y: number; w: number }[]) {
  const s = [...xs].sort((a, b) => a.p - b.p); let neg = 0, tot = 0, wp = 0, wn = 0;
  for (let i = 0; i < s.length; ) { let j = i, pos = 0, ng = 0; while (j < s.length && s[j].p === s[i].p) { if (s[j].y) pos += s[j].w; else ng += s[j].w; j++; } tot += pos * (neg + ng / 2); neg += ng; wp += pos; wn += ng; i = j; }
  return tot / (wp * wn);
}
const wm = (xs: Row[], f: (r: Row) => number) => xs.reduce((a, r) => a + f(r) * r.w, 0) / xs.reduce((a, r) => a + r.w, 0);
const BANDS = ['19–29', '30대', '40대', '50대', '60대', '70세↑'];

const out: Record<string, unknown> = {}, cal: Record<string, unknown> = {};
for (const id of IDS) {
  const rows = data[id];
  const [train, test] = id === 'osteo' ? [rows.filter((r) => r.i % 2 === 0), rows.filter((r) => r.i % 2 === 1)] : [rows.filter((r) => r.year < 2024), rows.filter((r) => r.year === 2024)];
  const m = fit(train);
  const groups: Record<string, unknown> = {};
  for (let g = 0; g < 12; g++) {
    const t = test.filter((r) => r.g === g); if (t.length < 50) continue;
    groups[`${g < 6 ? '남' : '여'} ${BANDS[g % 6]}`] = { n: t.length, engine: r1(wm(t, (r) => r.p)), calibrated: r1(wm(t, (r) => apply(m, r))), observed: r1(100 * wm(t, (r) => r.y)) };
  }
  out[id] = { check: id === 'osteo' ? '2024 짝수 행으로 만들고 홀수 행으로 확인' : '2022–2023으로 만들고 2024로 확인', nTrain: train.length, nTest: test.length,
    auc: { engine: r3(auc(test)), calibrated: r3(auc(test.map((r) => ({ ...r, p: apply(m, r) })))) },
    mean: { engine: r1(wm(test, (r) => r.p)), calibrated: r1(wm(test, (r) => apply(m, r))), observed: r1(100 * wm(test, (r) => r.y)) }, groups };
  // 최종: 전체 자료로 다시 만들기 + 또래 실측 비율
  const f = fit(rows);
  const peer = (s: number) => BANDS.map((_, b) => { const g = rows.filter((r) => r.g === s + b); return g.length >= 50 ? r1(100 * wm(g, (r) => r.y)) : null; });
  const n = (s: number) => BANDS.map((_, b) => rows.filter((r) => r.g === s + b).length);
  cal[id] = { slope: r4(f.slope), a: { M: f.a.slice(0, 6).map((v, b) => (v == null || n(0)[b] < 50 ? null : r4(v))), F: f.a.slice(6).map((v, b) => (v == null || n(6)[b] < 50 ? null : r4(v))) },
    peer: { M: peer(0), F: peer(6) }, n: { M: n(0), F: n(6) } };
  console.log(id, JSON.stringify(out[id] && (out[id] as any).mean), 'AUC', JSON.stringify((out[id] as any).auc));
}
const meta = { version: '보정 v1 (국민건강영양조사 2022–2024)', source: '국민건강영양조사 제9기(2022–2024) 원시자료, 질병관리청', method: '로지스틱 재보정: logit(p′) = a[성별·연령대] + b·logit(엔진 확률), 진단받지 않은 사람, 가중치 wt_itvex/3', generated: new Date().toISOString().slice(0, 10) };
writeFileSync(new URL('../engine/src/calibration.json', import.meta.url), JSON.stringify({ version: meta.version, meta, items: cal }, null, 1));
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL('./results/calibration.json', import.meta.url), JSON.stringify({ meta, check: out }, null, 2));
