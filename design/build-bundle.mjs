// engine/src/engine.ts + src/sampleData.ts → design/onemin.js (브라우저용 IIFE)
// 계산 로직은 건드리지 않는다: 타입만 제거하고 prevalence.json 을 인라인한다.
// 사용: node design/build-bundle.mjs   (Node 22.6+ / 24 권장)
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const strip = (src) => stripTypeScriptTypes(src, { mode: 'transform' });

let engine = readFileSync(join(root, 'engine/src/engine.ts'), 'utf8');
const json = readFileSync(join(root, 'engine/src/prevalence.json'), 'utf8').trim();
engine = engine.replace(/^import P from .*$/m, `const P = ${json};`);
let engineJs = strip(engine);
const engineNames = [...engineJs.matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
engineJs = engineJs.replace(/^export (?=const|function)/gm, '').replace(/^export \{\};?$/gm, '');

let sample = readFileSync(join(root, 'src/sampleData.ts'), 'utf8').replace(/^import type .*$/m, '');
let sampleJs = strip(sample).replace(/^export (?=const|function)/gm, '').replace(/^export \{\};?$/gm, '');

const viewJs = readFileSync(join(root, 'design/view.js'), 'utf8');
void engineNames; // 화면은 runAll·whatIf 만 쓴다
const out = `/* 1mincheck design bundle — 자동 생성 파일. 직접 고치지 말고 src/sampleData.ts 또는 engine 을 고친 뒤 다시 빌드 */
(function () {
/* ── engine/src/engine.ts (타입만 제거) ── */
${engineJs}
/* ── src/sampleData.ts ── */
${sampleJs}
/* ── 예시 사용자 전환 (화면 간 공유) ── */
var KEY = '1mincheck.sample';
function getSel() {
  var id = null;
  try { id = window.localStorage.getItem(KEY); } catch (e) {}
  if (!id && window.__oneminSel) id = window.__oneminSel;
  return samples.some(function (s) { return s.id === id; }) ? id : defaultSampleId;
}
function setSel(id) {
  window.__oneminSel = id;
  try { window.localStorage.setItem(KEY, id); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('onemin-sample', { detail: id })); } catch (e) {}
}
function subscribe(fn) {
  var h = function () { fn(getSel()); };
  window.addEventListener('onemin-sample', h);
  window.addEventListener('storage', h);
  return function () { window.removeEventListener('onemin-sample', h); window.removeEventListener('storage', h); };
}
function sample(id) { var k = id || getSel(); return samples.filter(function (s) { return s.id === k; })[0] || samples[0]; }
function applyScenario(input, sc) {
  return Object.assign({}, input, { weightKg: input.weightKg + sc.weightKg,
    waistCm: input.waistCm == null ? null : Math.round((input.waistCm + sc.waistCm) * 10) / 10 });
}
/* ── design/view.js (화면용 가공) ── */
${viewJs}
window.OneMin = { runAll: runAll, whatIf: whatIf, samples: samples, defaultSampleId: defaultSampleId,
  getSel: getSel, setSel: setSel, subscribe: subscribe, sample: sample, applyScenario: applyScenario,
  viewResults: viewResults, viewDetailDm: viewDetailDm, viewRecord: viewRecord, viewInputs: viewInputs, sampleList: sampleList };
})();
`;
writeFileSync(join(root, 'design/onemin.js'), out);
console.log('design/onemin.js 생성 · samples:', out.length, 'bytes');
