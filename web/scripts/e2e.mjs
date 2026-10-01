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
    const root = group ? [...document.querySelectorAll('[role=group],[role=radiogroup]')].find((g) => (g.getAttribute('aria-label') || '').includes(group)) : document;
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
  ok(!(await text()).includes('모름'), '허리 ‘모름’ 선택지는 없다');
  await type('#wa', '32');
  ok((await text()).includes('≈ 81.3cm'), '기본 단위 인치: 32인치 → 같은 칸에 ≈ 81.3cm');
  await click('cm', '허리 단위'); await type('#wa', '81.3');
  ok((await text()).includes('≈ 32.0인치'), 'cm 선택: 81.3cm → ≈ 32.0인치');
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

  console.log('관심 분야'); ok((await text()).includes('25문항'), '기본: 소화·식생활·수면만 켜짐 (25문항)');
  ok(await p.evaluate(() => [...document.querySelectorAll('button[aria-pressed]')].map((b) => b.textContent.slice(0, 2)).join(',')) === '소화,식생,수면,마음', '순서: 소화·식생활 위, 수면·마음 아래');
  ok(await p.evaluate(() => [...document.querySelectorAll('button[aria-pressed]')].find((b) => b.textContent.startsWith('마음')).getAttribute('aria-pressed')) === 'false', '마음은 기본으로 꺼져 있다');
  await click('마음'); ok((await text()).includes('29문항'), '마음을 켜면 29문항'); await shot('modules');
  await click('다음');

  console.log('소화'); ok((await route()) === '#/digest', '#/digest (소화가 먼저)');
  await click('네', '가슴쓰림(명치');
  ok((await text()).includes('열린 질문 6개'), 'GerdQ 6문항이 열린다');
  const gq = [['가슴 뒤쪽', '1일'], ['음식이나 신물', '0일'], ['명치(윗배', '0일'], ['메스꺼움', '0일'], ['잠을 설침', '0일'], ['약국 약', '0일']];
  for (const [g, a] of gq) await click(a, g);
  await shot('digest'); await click('다음');

  console.log('식생활'); ok((await route()) === '#/diet', '#/diet');
  const diet = [['아침식사', '5일 이상'], ['잡곡밥', '가끔'], ['과일', '주 2–6회'], ['김치 말고', '하루 1–2끼'], ['우유', '주 1회 이하'], ['국물을', '가끔'], ['단 음료', '주 1회 이하']];
  for (const [g, a] of diet) await click(a, g);
  await shot('diet'); await click('다음');

  console.log('수면'); ok((await route()) === '#/sleep', '#/sleep');
  ok((await text()).includes('16인치/41cm'), 'STOP-Bang 공식판: 여성 목둘레 41cm');
  await click('아니요', '코를 크게'); await click('네', '피곤'); await click('아니요', '숨을 멈추거나'); await click('아니요', '목둘레');
  ok(!(await text()).includes('열린 질문 7개'), '아직 ISI 는 닫혀 있다');
  await click('네', '최근 2주'); ok((await text()).includes('열린 질문 7개'), '‘네’를 누르면 ISI 7문항이 열린다');
  const isi = [['1. 잠들기', '중간'], ['2. 잠을 유지', '약간'], ['3. 너무 일찍', '중간'], ['4. 지금 수면', '보통'], ['5. 수면 문제가 다른', '약간'], ['6. 수면 문제로', '어느 정도'], ['7. 수면 문제가 낮', '약간']];
  for (const [g, a] of isi) await click(a, g);
  await shot('sleep'); await click('다음');

  console.log('마음'); ok((await route()) === '#/mind', '#/mind (마지막)');
  await click('며칠', '흥미나'); await click('며칠', '기분이');
  ok((await text()).includes('두 문항 합계 2점'), '합계 2점이면 추가 문항은 닫혀 있다');
  await click('며칠', '초조'); await click('며칠', '걱정을'); await shot('mind');
  await click('결과 보기');

  console.log('결과 (예시 A와 같아야 함)'); ok((await route()) === '#/result', '#/result');
  const t = await text();
  ok(t.indexOf('먼저 확인할 것 1개') < t.indexOf('이미 당뇨일 확률') && /또래의 약\s*2.1\s*배/.test(t.slice(0, 400)), '맨 위: 먼저 확인할 것 + 또래의 약 2.1배 크게');
  ok(t.indexOf('공복혈당') < t.indexOf('관리하면 줄어드는 것'), '검사 권유 하늘색 박스가 상단 카드 안에 있다');
  ok(t.includes('그 밖의 항목') && t.includes('또래와 비슷') && t.includes('또래보다 낮음'), '그 밖의 항목 묶음');
  ok(t.includes('이미 당뇨일 확률') && t.includes('또래의 약 2.1배예요') && t.includes('공복혈당'), '이미 당뇨일 확률: 또래 배수 + 검사 권유');
  ok(t.includes('40대 여성 중 진단받지 않은 사람 평균'), '당뇨는 진단받지 않은 또래와 비교');
  ok(!t.includes('숨은 당뇨') && !t.includes('확률 6'), '헷갈리는 용어·꼬리표가 없다');
  ok(/관리하면 줄어드는 것\s*4개/.test(t) && t.includes('비만'), '숫자 카드에 항목 이름이 같이 나온다');
  ok(t.includes('지금 6.4%') && t.includes('1.2'), '관리하면 지방간 6.4 → 1.2');
  ok(t.includes('생활·검진으로 보는 체크') && t.includes('49세 여성 권장 검사') && t.includes('유방암 검진'), '맞춤 검진·접종 카드 (49세 여성)');
  ok(!t.includes('고위험음주'), '안 마시면 음주 카드는 없다');
  ok(t.includes('10년 안에 당뇨가 생길 가능성') && t.includes('참고사항') && !t.includes('정확도 낮음'), '10년 당뇨 카드 (참고사항)');
  ok(t.includes('허리/키 비율 0.51'), '허리/키 비율 0.51');
  ok(t.includes('PHQ-2 / 6점') && !t.includes('지금 우울(PHQ-9'), '우울은 확률 대신 PHQ 점수');
  await shot('result');
  await click('이 기기에 기록 저장'); ok((await text()).includes('기록을 저장했어요'), '기록 저장');

  console.log('상세'); await p.evaluate(() => { location.hash = '/detail/dm'; });
  await new Promise((r) => setTimeout(r, 300));
  const td = await text(); ok(td.includes('관리해도 남는 1명') && td.includes('또래의 약 2.1배예요') && td.includes('/ 11점'), '당뇨 상세: 또래 배수, 3명→1명, 선별점수'); await shot('detail-dm');
  for (const id of ['htn', 'chol', 'obesity', 'nafld', 'osa', 'isi', 'dep', 'gad', 'osteo', 'gerd', 'diet']) {
    await p.evaluate((id) => { location.hash = '/detail/' + id; }, id); await new Promise((r) => setTimeout(r, 200));
    ok((await text()).includes('다음에 할 일'), `상세 ${id} 열림`);
    if (id === 'osteo') ok((await text()).includes('1년 안에 약 17%'), '골다공증 상세: 고관절 골절 1년 사망률');
  }

  console.log('바꿔보기'); await p.evaluate(() => { location.hash = '/whatif'; }); await new Promise((r) => setTimeout(r, 300));
  ok(/낮아지는 항목\s*4개/.test(await text()), '제안값(−4kg·−5cm)에서 4개 항목이 낮아진다');
  await click('처음 값으로'); ok(/낮아지는 항목\s*0개/.test(await text()), '처음 값으로 되돌리면 0개');
  await p.evaluate(() => { const s = document.getElementById('wi-wa'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, '-5'); s.dispatchEvent(new Event('input', { bubbles: true })); });
  await new Promise((r) => setTimeout(r, 200));
  ok((await text()).includes('1.3'), '허리 −5cm 슬라이더 → 당뇨 1.3%'); await shot('whatif');

  console.log('고혈압 진단 + 과음이면 숨기지 않고 맨 앞에'); await p.evaluate(() => { location.hash = '/life'; }); await new Promise((r) => setTimeout(r, 300));
  await click('고혈압', '진단받은'); await click('거의 매일', '술은'); await click('소주 늘리기'); await click('소주 늘리기');
  await p.evaluate(() => { location.hash = '/result'; }); await new Promise((r) => setTimeout(r, 400));
  const th = await text();
  ok(th.includes('이미 진단받은 질환') && th.includes('관리 중이에요'), '고혈압 진단이 맨 위에 나온다');
  ok(th.includes('함께 확인할 것') && th.indexOf('간 수치 검사') < th.indexOf('관리하면 줄어드는 것'), '과음이면 간 검사 안내가 상단 카드에 나온다');
  ok(th.includes('고위험음주에 해당해요') && th.includes('주당 알코올'), '거의 매일 소주 1병 → 고위험음주 + 주당 알코올 g');
  ok(th.includes('대사증후군') && th.includes('치매 위험요인') && th.includes('콩팥'), '추가 체크 카드가 나온다');
  await shot('result-htn-alcohol');
  await p.evaluate(() => { location.hash = '/whatif'; }); await new Promise((r) => setTimeout(r, 300));
  ok((await text()).includes('진단받아 관리 중'), '바꿔보기에서도 고혈압은 ‘진단받아 관리 중’');

  console.log('기록'); await p.evaluate(() => { location.hash = '/record'; }); await new Promise((r) => setTimeout(r, 300));
  ok((await text()).includes('아직 기록이 하나예요'), '기록 1개 상태'); await shot('record-one');

  console.log('마음 분기(양성) + 위기 안내'); await p.evaluate(() => { location.hash = '/mind'; }); await new Promise((r) => setTimeout(r, 300));
  await click('7일 이상', '흥미나'); await click('7일 이상', '기분이');
  ok((await text()).includes('더 정확히 보기 7문항'), '합계 4점이면 PHQ-9 7문항이 열린다');
  await click('며칠', '9. 차라리'); ok((await text()).includes('자살예방상담 109'), '9번 문항에 답하면 109 안내가 바로 뜬다'); await shot('mind-crisis');

  console.log('결과 화면 깨짐 검사 (예시·극단값 × 폰 폭 360/430)');
  const hasDemo = await p.evaluate(() => !!document.querySelector('.demo'));
  if (!hasDemo) console.log('  - 배포 화면이라 예시 버튼이 없어 건너뜀');
  else for (const w of [360, 430]) {
    await p.setViewport({ width: w, height: 844, deviceScaleFactor: 1 });
    for (const s of ['A ·', 'B ·', 'C ·', 'X1', 'X2', 'X3', 'X4']) {
      await p.evaluate(() => { location.hash = '/result'; }); await new Promise((r) => setTimeout(r, 200));
      await click(s, '개발용'); await new Promise((r) => setTimeout(r, 300));
      const bad = await p.evaluate(() => {
        const W = document.documentElement.clientWidth, out = [];
        if (document.documentElement.scrollWidth > W) out.push('가로 스크롤 ' + document.documentElement.scrollWidth);
        for (const e of document.querySelectorAll('.page *')) {
          const r = e.getBoundingClientRect();
          if (r.width && (r.right > W + 0.5 || r.left < -0.5)) out.push(`${e.tagName}.${e.className} "${e.textContent.slice(0, 20)}" ${Math.round(r.left)}–${Math.round(r.right)}`);
          if (e.matches('.pill, .tag') && e.scrollWidth > e.clientWidth + 1) out.push(`글자 잘림 "${e.textContent}"`);
        }
        return out.slice(0, 5);
      });
      ok(bad.length === 0, `${s.replace(' ·', '')} @${w}px 넘침 없음${bad.length ? ' → ' + bad.join(' | ') : ''}`);
      await p.screenshot({ path: `${OUT}stress-${s.replace(' ·', '')}-${w}.png`, fullPage: true });
    }
  }
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });

  console.log('데스크톱 랜딩'); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await p.evaluate(() => { location.hash = '/'; }); await shot('landing-desktop');
} catch (e) { fails++; console.log('  ✗ 중단:', e.message); await shot('error'); }
console.log(errors.length ? `콘솔 오류 ${errors.length}건:\n` + errors.join('\n') : '콘솔 오류 없음');
console.log(fails ? `실패 ${fails}건` : '모두 통과');
await b.close();
process.exit(fails ? 1 : 0);
