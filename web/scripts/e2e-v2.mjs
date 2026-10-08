// v2(심플) 실제 브라우저 흐름 테스트: 랜딩 미니 체험 → 기본정보 → 생활 → 결과 3장 → 바꾸면 → 검진 풀이 → 모든 항목 → 기록
// 사용: 개발 서버 실행 후 node scripts/e2e-v2.mjs [http://localhost:5173/1mincheck/]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(new URL('../../brag-output/work/package.json', import.meta.url));
const puppeteer = require('puppeteer-core');
const BASE = process.argv[2] || 'http://localhost:5173/1mincheck/';
const OUT = new URL('../e2e-shots-v2/', import.meta.url).pathname.slice(1);
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
let n = 0, fails = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const hideDemo = () => p.evaluate(() => { const d = document.querySelector('.demo'); if (d) d.style.display = 'none'; const a = document.querySelector('a[href="#/dev"]'); if (a) a.style.display = 'none'; });
const shot = async (name) => { await wait(1200); await hideDemo(); await p.screenshot({ path: `${OUT}${String(++n).padStart(2, '0')}-${name}.png`, fullPage: true }); };
const route = () => p.evaluate(() => location.hash);
const text = () => p.evaluate(() => document.body.innerText);
const ok = (cond, msg) => { console.log(cond ? '  ✓' : '  ✗', msg); if (!cond) fails++; };
async function click(label, group) {
  const done = await p.evaluate((label, group) => {
    const root = group ? [...document.querySelectorAll('[role=group],[role=radiogroup],[role=tablist]')].find((g) => (g.getAttribute('aria-label') || '').includes(group)) : document;
    if (!root) return 'no group';
    const el = [...root.querySelectorAll('button, a')].find((e) => e.textContent.trim().replace(/\s+/g, ' ').startsWith(label) || e.getAttribute('aria-label') === label);
    if (!el) return 'no button';
    el.click(); return 'ok';
  }, label, group);
  if (done !== 'ok') throw new Error(`누를 수 없음: "${label}" ${group ? '(' + group + ')' : ''} → ${done}`);
  await wait(150);
}
async function type(sel, v) { await p.click(sel, { clickCount: 3 }); await p.type(sel, v); }
/** React 가 관리하는 range 입력 값 바꾸기 */
const slide = (label, v) => p.evaluate((label, v) => {
  const s = document.querySelector(`input[aria-label="${label}"]`);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(s, String(v));
  s.dispatchEvent(new Event('input', { bubbles: true }));
}, label, v);

try {
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  await p.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await p.reload({ waitUntil: 'networkidle0' });
  console.log('랜딩');
  const t0 = await text();
  ok(t0.includes('딱 1분') && t0.includes('또래 100명 중') && t0.includes('줄이면?') && t0.includes('검진 결과지') && !/수면·마음|불면|위식도/.test(t0), '랜딩: 영상 흐름 섹션, 숨긴 분야 없음');
  ok(await p.evaluate(() => !document.querySelector('video[autoplay], video[preload="auto"]')), '영상은 처음에 받지 않음');
  await shot('landing');
  // 미니 체험 → 이어서
  await click('남성'); await type('.mini input[aria-label="만 나이"]', '52'); await type('.mini input[aria-label="키"]', '172'); await type('.mini input[aria-label="몸무게"]', '82');
  await click('간단 결과 보기'); ok((await text()).includes('내 BMI 27.7'), '미니 결과');
  await p.evaluate(() => document.querySelector('.mini-go').click()); await wait(300);
  ok((await route()) === '#/info' && (await p.evaluate(() => document.getElementById('age').value)) === '52', '이어서: 기본정보에 52세 채워짐');

  console.log('입력 2쪽');
  ok((await text()).includes('1/2'), '입력은 2쪽 (분야 고르기 없음)');
  await p.evaluate(() => { const b = [...document.querySelectorAll('button[role=radio]')].find((x) => x.textContent === 'cm'); b.click(); }); await wait(100);
  await type('#wa', '92'); await shot('info');
  await click('다음');
  ok((await route()) === '#/life', '#/life');
  await click('안 피움', '담배'); await click('월 1회 이하', '술은');
  await p.evaluate(() => document.querySelector('[aria-label="소주 늘리기"]').click()); await wait(100);
  await click('아니요', '운동'); await click('없어요', '부모'); await click('없음', '진단'); await click('정상', '혈압');
  ok((await text()).includes('결과 보기'), '생활 다음 버튼 = 결과 보기');
  await click('결과 보기');
  ok((await route()) === '#/result', '#/result');

  console.log('결과 3장');
  const tr = await text();
  ok(['지금 내 상태', '또래 100명 중 나', '이대로면 vs 바꾸면'].every((l) => tr.includes(l.replace('지금 내 상태', '')) ) && !!(await p.$('section[aria-label="지금 내 상태"]')) && !!(await p.$('section[aria-label="또래 100명 중 나"]')) && !!(await p.$('#change')), '카드 3장');
  ok(/나는 \d+번째/.test(tr), '또래 중 내 자리 (n번째)');
  ok(!/배예요|\d배\)/.test(tr), '결과 첫 화면에 몇 배 표현 없음');
  ok(tr.includes('3cm 줄이면 복부비만 기준(90cm) 아래예요'), '허리 기준선까지 거리');
  ok(tr.includes('10년 안에 당뇨가 생길 가능성') && tr.includes('이대로면 23.4%'), '이대로면 10년 당뇨 23.4%');
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  ok(h <= 844 * 3.2, `결과 화면 길이 ${h}px (화면 약 ${(h / 844).toFixed(1)}장)`);
  await shot('result');
  await click('고혈압', '항목'); ok((await text()).includes('고혈압 ·'), '또래 탭 전환');
  await click('허리 90cm 아래로'); await wait(600);
  const tc = await p.evaluate(() => document.getElementById('change').innerText);
  ok(tc.includes('89cm 기준 아래') && tc.includes('바꾸면 8.9%'), '허리 −3cm: 기준선 아래, 10년 당뇨 23.4% → 8.9%');
  await slide('몸무게 바꿔보기', -4); await wait(500);
  ok((await p.evaluate(() => document.getElementById('change').innerText)).includes('78kg'), '몸무게 슬라이더');
  await p.evaluate(() => document.getElementById('change').scrollIntoView()); await shot('result-change');
  await click('처음 값으로'); ok(!(await p.evaluate(() => document.getElementById('change').innerText)).includes('바꾸면 8.9%'), '처음 값으로');
  await click('체중을 줄이세요').catch(() => {}); await wait(300);

  console.log('기록 저장');
  await click('이 기기에 기록 저장'); ok(await p.evaluate(() => JSON.parse(localStorage.getItem('1mincheck.records') || '[]').length === 1), '기록 1개 저장');

  console.log('검진 풀이');
  await p.evaluate(() => { location.hash = '#/labs'; }); await wait(300);
  for (const [k, v] of [['sbp', '132'], ['dbp', '84'], ['glu', '108'], ['tc', '245'], ['hdl', '38']]) await type(`#lab-${k}`, v);
  await shot('labs-input');
  await click('4개 쉽게 풀어보기');   // 혈압 두 숫자는 카드 하나 ok((await route()) === '#/labs/result', '#/labs/result');
  const tl = await text();
  ok(tl.includes('총콜레스테롤·HDL 콜레스테롤 확인이 필요해요') || tl.includes('확인이 필요해요'), '검진 요약 한 줄');
  ok(tl.includes('고혈압 전단계') && tl.includes('당뇨 전 단계') && tl.includes('높음') && tl.includes('낮음'), '구간 이름');
  ok((tl.match(/→ /g) || []).length >= 4, '카드마다 할 일');
  await shot('labs-result');
  await click('이 숫자를 반영한 내 결과 보기');
  const tr2 = await text();
  ok(tr2.includes('4년 안에 고혈압이 생길 가능성'), '검진 혈압 반영 → 4년 고혈압 기준선 비교 등장');

  console.log('모든 항목 · 상세');
  await p.evaluate(() => { location.hash = '#/all'; }); await wait(400);
  const ta = await text();
  ok(ta.includes('주요 결과') && ta.includes('앞으로 N년 안의 발생 위험') && !ta.includes('설문 점수'), '모든 항목: 자세한 내용, 설문 점수 없음');
  await p.evaluate(() => { location.hash = '#/detail/isi'; }); await wait(400);
  ok((await route()) === '#/result', '숨긴 항목 상세 → 결과로');
  await p.evaluate(() => { location.hash = '#/sleep'; }); await wait(400);
  ok((await route()) === '#/result', '숨긴 분야 입력 → 결과로');

  console.log('폭 360·430');
  for (const w of [360, 430]) {
    await p.setViewport({ width: w, height: 844 }); await p.evaluate(() => { location.hash = '#/result'; }); await wait(300);
    const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok(!over, `${w}px: 가로 넘침 없음`); await shot(`result-${w}`);
  }
  ok(errors.length === 0, `콘솔 오류 없음 ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
} catch (e) { console.log('  ✗ 중단:', e.message); fails++; }
await b.close();
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
