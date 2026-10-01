// 실제 브라우저로 처음부터 끝까지 눌러보는 테스트 (예시 A의 답을 손으로 입력)
// 사용: 개발 서버 실행 후 node scripts/e2e.mjs [http://localhost:5173/1mincheck/]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(new URL('../../brag-output/work/package.json', import.meta.url));
const puppeteer = require('puppeteer-core');
const BASE = process.argv[2] || 'http://localhost:5173/1mincheck/';
const OUT = new URL('../e2e-shots/', import.meta.url).pathname.slice(1);
mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
let n = 0, fails = 0;
const shot = async (name) => { await new Promise((r) => setTimeout(r, 350)); await p.screenshot({ path: `${OUT}${String(++n).padStart(2, '0')}-${name}.png`, fullPage: true }); };
const route = () => p.evaluate(() => location.hash);
const text = () => p.evaluate(() => document.body.innerText);
const ok = (cond, msg) => { console.log(cond ? '  ✓' : '  ✗', msg); if (!cond) fails++; };
// 버튼/링크를 글자로 찾아 누르기. group 을 주면 그 질문 안에서만 찾는다
async function click(label, group) {
  const done = await p.evaluate((label, group) => {
    const root = group ? [...document.querySelectorAll('[role=group]')].find((g) => (g.getAttribute('aria-label') || '').includes(group)) : document;
    if (!root) return 'no group';
    const el = [...root.querySelectorAll('button, a')].find((e) => e.textContent.trim().replace(/\s+/g, ' ').startsWith(label) || e.getAttribute('aria-label') === label);
    if (!el) return 'no button';
    el.click(); return 'ok';
  }, label, group);
  if (done !== 'ok') throw new Error(`누를 수 없음: "${label}" ${group ? '(' + group + ')' : ''} → ${done}`);
  await new Promise((r) => setTimeout(r, 120));
}
async function type(sel, v) { await p.click(sel, { clickCount: 3 }); await p.type(sel, v); }

try {
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  await p.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  console.log('랜딩'); await shot('landing');
  ok((await text()).includes('1분이면 보는'), '랜딩 헤드라인');
  await click('1분 체크 시작하기');
  console.log('온보딩'); ok((await route()) === '#/start', '#/start'); await shot('start');
  await click('시작하기'); await shot('intro');
  await click('좋아요, 시작할게요');

  console.log('기본정보'); ok((await route()) === '#/info', '#/info');
  await click('다음'); ok((await text()).includes('만 나이를 숫자로'), '빈 칸이면 이유를 보여준다');
  await click('여성', '성별');
  await type('#age', '17'); ok((await text()).includes('만 19세 이상'), '19세 미만 안내');
  await type('#age', '49'); await type('#h', '160'); await type('#w', '62');
  await click('인치', '허리 단위'); await type('#wa', '32');
  ok((await text()).includes('= 81.3cm'), '허리 32인치 → 81.3cm 환산 표시');
  await click('cm', '허리 단위'); ok(await p.$eval('#wa', (e) => e.value) === '81.3', 'cm로 바꾸면 81.3으로 환산');
  ok((await text()).includes('24.2'), 'BMI 24.2 자동 계산'); await shot('info');
  await click('다음');

  console.log('생활과 병력'); ok((await route()) === '#/life', '#/life');
  ok((await text()).includes('폐경했나요'), '여성·40세 이상이라 폐경 질문이 보인다');
  await click('안 피움', '담배');
  await click('주 1–2회', '술은'); ok((await text()).includes('한 번 마실 때 보통 얼마나'), '자주 마시면 양 질문이 열린다');
  await click('소주 늘리기'); await click('소주 늘리기');
  ok((await text()).includes('하루 평균 약 1.5잔'), '주 1–2회 × 소주 1병 → 하루 평균 1.5잔');
  await click('안 마심', '술은'); await click('네', '운동'); await click('아니요', '폐경');
  await click('없어요', '당뇨가'); await click('없음', '진단받은'); await click('모름', '혈압'); await shot('life');
  await click('다음: 관심 분야');

  console.log('관심 분야'); ok((await text()).includes('29문항'), '기본 경로 29문항'); await shot('modules');
  await click('다음');

  console.log('수면'); ok((await route()) === '#/sleep', '#/sleep');
  await click('아니요', '코골이'); await click('네', '피곤'); await click('아니요', '숨을 멈춘다'); await click('아니요', '목둘레');
  ok(!(await text()).includes('열린 질문 7개'), '아직 ISI 는 닫혀 있다');
  await click('네', '최근 2주'); ok((await text()).includes('열린 질문 7개'), '‘네’를 누르면 ISI 7문항이 열린다');
  const isi = [['1. 잠들기', '중간'], ['2. 잠을 유지', '약간'], ['3. 너무 일찍', '중간'], ['4. 지금 수면', '보통'], ['5. 수면 문제가 다른', '약간'], ['6. 수면 문제로', '어느 정도'], ['7. 수면 문제가 낮', '약간']];
  for (const [g, a] of isi) await click(a, g);
  await shot('sleep'); await click('다음');

  console.log('마음'); ok((await route()) === '#/mind', '#/mind');
  await click('며칠', '흥미나'); await click('며칠', '기분이');
  ok((await text()).includes('두 문항 합계 2점'), '합계 2점이면 추가 문항은 닫혀 있다');
  await click('며칠', '초조'); await click('며칠', '걱정을'); await shot('mind');
  await click('다음');

  console.log('소화'); await click('네', '가슴쓰림(명치');
  ok((await text()).includes('열린 질문 6개'), 'GerdQ 6문항이 열린다');
  const gq = [['가슴 뒤쪽', '1일'], ['음식이나 신물', '0일'], ['명치(윗배', '0일'], ['메스꺼움', '0일'], ['잠을 설침', '0일'], ['약국 약', '0일']];
  for (const [g, a] of gq) await click(a, g);
  await shot('digest'); await click('다음');

  console.log('식생활'); const diet = [['아침식사', '5일 이상'], ['잡곡밥', '가끔'], ['과일', '주 2–6회'], ['김치 말고', '하루 1–2끼'], ['우유', '주 1회 이하'], ['국물을', '가끔'], ['단 음료', '주 1회 이하']];
  for (const [g, a] of diet) await click(a, g);
  await shot('diet'); await click('결과 보기');

  console.log('결과 (예시 A와 같아야 함)'); ok((await route()) === '#/result', '#/result');
  const t = await text();
  ok(/또래 평균보다 낮음\s*4개/.test(t), '또래 평균보다 낮음 4개');
  ok(t.includes('40대 여성 평균과 비교하면') && t.includes('낮은 편'), '한눈에 보기 문장');
  ok(t.includes('아직 진단받지 않은 당뇨가 지금 있을 가능성') && t.includes('40대 여성 평균 5.2% 기준 · 평균의 약 0.6배로 낮은 편이에요'), '숨은 당뇨: 무엇의 가능성인지 + 또래 비교');
  ok(!t.includes('확률 6'), '‘확률 6’ 같은 헷갈리는 꼬리표가 없다');
  ok(/관리하면 낮아지는 항목\s*4개/.test(t), '관리하면 낮아지는 항목 4개');
  ok(/챙겨볼 항목\s*3개/.test(t), '챙겨볼 항목 3개');
  ok(t.includes('2.9%') && t.includes('성인 여성 평균 21.6% 기준'), '숨은 당뇨 2.9%, 지방간은 성인 여성 평균과 비교');
  ok(t.includes('지금 6.4%') && t.includes('1.2'), '관리하면 지방간 6.4 → 1.2');
  await shot('result');
  await click('이 기기에 기록 저장'); ok((await text()).includes('기록을 저장했어요'), '기록 저장');

  console.log('상세'); await p.evaluate(() => { location.hash = '/detail/dm'; });
  await new Promise((r) => setTimeout(r, 300));
  const td = await text(); ok(td.includes('관리해도 남는 1명') && td.includes('5') && td.includes('/ 11점'), '숨은 당뇨 상세: 3명→1명, 선별점수'); await shot('detail-dm');
  for (const id of ['htn', 'chol', 'obesity', 'nafld', 'osa', 'isi', 'dep', 'gad', 'osteo', 'gerd', 'diet']) {
    await p.evaluate((id) => { location.hash = '/detail/' + id; }, id); await new Promise((r) => setTimeout(r, 200));
    ok((await text()).includes('다음에 할 일'), `상세 ${id} 열림`);
  }

  console.log('바꿔보기'); await p.evaluate(() => { location.hash = '/whatif'; }); await new Promise((r) => setTimeout(r, 300));
  ok(/낮아지는 항목\s*4개/.test(await text()), '제안값(−4kg·−5cm)에서 4개 항목이 낮아진다');
  await click('처음 값으로'); ok(/낮아지는 항목\s*0개/.test(await text()), '처음 값으로 되돌리면 0개');
  await p.evaluate(() => { const s = document.getElementById('wi-wa'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, '-5'); s.dispatchEvent(new Event('input', { bubbles: true })); });
  await new Promise((r) => setTimeout(r, 200));
  ok((await text()).includes('1.3'), '허리 −5cm 슬라이더 → 숨은 당뇨 1.3%'); await shot('whatif');

  console.log('기록'); await p.evaluate(() => { location.hash = '/record'; }); await new Promise((r) => setTimeout(r, 300));
  ok((await text()).includes('아직 기록이 하나예요'), '기록 1개 상태'); await shot('record-one');

  console.log('마음 분기(양성) + 위기 안내'); await p.evaluate(() => { location.hash = '/mind'; }); await new Promise((r) => setTimeout(r, 300));
  await click('7일 이상', '흥미나'); await click('7일 이상', '기분이');
  ok((await text()).includes('더 정확히 보기 7문항'), '합계 4점이면 PHQ-9 7문항이 열린다');
  await click('며칠', '9. 차라리'); ok((await text()).includes('자살예방상담 109'), '9번 문항에 답하면 109 안내가 바로 뜬다'); await shot('mind-crisis');

  console.log('데스크톱 랜딩'); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await p.evaluate(() => { location.hash = '/'; }); await shot('landing-desktop');
} catch (e) { fails++; console.log('  ✗ 중단:', e.message); await shot('error'); }
console.log(errors.length ? `콘솔 오류 ${errors.length}건:\n` + errors.join('\n') : '콘솔 오류 없음');
console.log(fails ? `실패 ${fails}건` : '모두 통과');
await b.close();
process.exit(fails ? 1 : 0);
