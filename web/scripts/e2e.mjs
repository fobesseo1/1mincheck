// 실제 브라우저로 처음부터 끝까지 눌러보는 테스트 (예시 A의 답을 손으로 입력) + 가상 프로필 + 기록·요약·다른 버전 기록 격리
// 결과 화면: 맨 위는 상태 카드(할 일 포함)·작은 저장 버튼, 아래는 주요 결과(현재 가능성 → 100명 중 → 또래 평균)
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
  // 같은 출처의 비교용 버전(B) 기록이 있다고 가정하고 넣어 둔다 → 메인이 읽거나 지우지 않는지 마지막에 확인
  await p.evaluate(() => { sessionStorage.clear(); localStorage.clear(); localStorage.setItem('1mincheck-b.records', '["B-SENTINEL"]'); sessionStorage.setItem('1mincheck-b.draft', '"B-SENTINEL"'); });
  console.log('랜딩'); await shot('landing');
  ok((await text()).includes('내 몸이 궁금할 때') && !(await text()).includes('가입 없이'), '랜딩 헤드라인 (가입 문구 없음)');
  // 미니 체험: 입력 중에는 결과가 안 바뀌고, '결과 보기'를 눌러야 나온다
  await click('남성'); await type('.mini input[aria-label="만 나이"]', '56'); await type('.mini input[aria-label="키"]', '172'); await type('.mini input[aria-label="몸무게"]', '88');
  ok(!(await text()).includes('내 BMI'), '미니: 누르기 전에는 결과 없음');
  await click('간단 결과 보기'); const tm = await text();
  ok(tm.includes('50대 남성 · BMI 25–30') && /당뇨[^]*100명 중 약 2\d명/.test(tm) && tm.includes('또래 평균') && tm.includes('1분 더 입력하고 정확한 위험 확인하기'), '미니: 56세 남성 BMI 29.7 → 100명 중 약 n명 · 또래 평균과 비교');
  ok(await p.evaluate(() => { const a = document.querySelector('.ld header a.btn'); return a.textContent === '내 위험 확인하기' && a.className.includes('tone-2'); }), '미니 결과 위험 → 상단 버튼도 빨강·"내 위험 확인하기"');
  await type('.mini input[aria-label="몸무게"]', '70'); ok(!(await text()).includes('내 BMI'), '미니: 값을 고치면 결과를 지우고 다시 누르게');
  await new Promise((r) => setTimeout(r, 200));   // 값 저장 → 버튼 갱신을 기다림
  ok(await p.evaluate(() => document.querySelector('.ld header a.btn').textContent === '이어서 체크하기'), '결과는 지워져도 값이 있으면 버튼은 "이어서 체크하기"');
  // 이어서: 시작·소개를 건너뛰고 넣은 값이 채워진 기본정보로, 위에 이어짐 안내
  await click('이어서 체크하기'); await new Promise((r) => setTimeout(r, 300));
  ok((await route()) === '#/info' && (await text()).includes('미니 체험에서 넣은 값을 가져왔어요') && (await p.evaluate(() => document.getElementById('age').value)) === '56', '이어서: 기본정보로 바로, 나이 56 채워짐, 이어짐 안내');
  // 처음 온 사람 흐름(A)을 확인하기 위해 세션을 비우고 다시
  await p.evaluate(() => { sessionStorage.clear(); sessionStorage.setItem('1mincheck-b.draft', '"B-SENTINEL"'); location.hash = ''; }); await p.reload({ waitUntil: 'networkidle0' });
  ok(await p.evaluate(() => document.querySelector('.ld header a.btn').textContent === '1분 건강 체크하기'), '미니에 아무것도 안 넣으면 버튼은 처음 그대로');
  await click('1분 건강 체크하기');
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
  const t0 = await text();
  // 첫 화면: 상태 한 줄 + 할 일 (docs/action-tiers.md). 예시 A는 비흡연·운동·정상 체형 → ④ 잘하고 있어요
  ok(t0.slice(0, 400).includes('잘 관리하고 계세요') && t0.includes('담배를 피우지 않고'), '맨 위: 칭찬 + 지금처럼 유지');
  ok(t0.includes('주요 결과') && /당뇨\s*현재 가능성 추정\s*1\.4%\s*비슷한 조건의 100명 중 약 1명 수준이에요\s*또래 평균 약 1\.5%와 비슷해요/.test(t0), '주요 결과: 이름 → 현재 가능성 추정 → 100명 중 → 또래 평균');
  ok(!t0.includes('결과를 읽는 법') && t0.includes('반영한 검진값: 없음') && !t0.includes('지금 할 일') && t0.indexOf('이 기기에 기록 저장') < t0.indexOf('잘 관리하고 계세요') && t0.indexOf('잘 관리하고 계세요') < t0.indexOf('주요 결과') && t0.indexOf('주요 결과') < t0.indexOf('이번 결과에 반영한 정보') && t0.indexOf('이번 결과에 반영한 정보') < t0.indexOf('진료용 결과 요약 저장'), '순서: 저장 버튼 → 상태 카드(할 일) → 주요 결과 → 반영한 정보 → 진료용 요약, 긴 비교는 접힘');
  await p.evaluate(() => { document.querySelector('details.more').open = true; });
  const t = await text();
  // 실측 보정 후 예시 A(49세 여성): 당뇨 1.4% vs 진단받지 않은 또래 실측 1.5% → 또래와 비슷, 먼저 확인할 것 없음
  ok(t.includes('또래 평균과 비교 (몇 배)') && t.includes('앞으로 N년 안의 발생 위험') && t.includes('결과를 읽는 법'), '자세히 보기: 또래 배수·앞으로의 발생 위험·읽는 법');
  ok(t.includes('설문 결과') && t.includes('점수와 등급 · 확률이 아니에요') && !t.includes('아직 체크하지 않음:'), '설문: 네 분야 모두 답함 → 미체크 안내 없음');
  ok(t.includes('왜 이렇게 나왔나요?'), '결과 이유 펼치기');
  ok(t.includes('또래 평균은 40대 여성 기준'), '또래 기준 표시');
  ok(!t.includes('DEV ·') && !t.includes('개발자 모드'), '일반 주소에서는 개발자 정보가 안 보인다');
  ok(!t.includes('숨은 당뇨') && !t.includes('확률 6'), '헷갈리는 용어·꼬리표가 없다');
  ok(t.includes('바꿔 입력하면 추정이 이렇게 달라져요') && t.includes('실제 치료 효과나 질병 감소를 보장하지 않아요'), '바꿔보기 요약: 보장하지 않음');
  ok(t.includes('지방간: 현재 가능성 추정 6.4% → 1.2%'), '바꿔 입력하면 지방간 6.4 → 1.2');
  ok(t.includes('생활·검진으로 보는 체크') && t.includes('49세 여성 권장 검사') && t.includes('유방암 검진'), '맞춤 검진·접종 카드 (49세 여성)');
  ok(!t.includes('고위험음주'), '안 마시면 음주 카드는 없다');
  ok(t.includes('10년 안에 당뇨가 생길 가능성') && t.includes('참고사항') && !t.includes('정확도 낮음'), '10년 당뇨 카드 (참고사항)');
  ok(t.includes('허리/키 비율 0.51'), '허리/키 비율 0.51');
  ok(t.includes('PHQ-2 / 6점') && !t.includes('지금 우울(PHQ-9'), '우울은 확률 대신 PHQ 점수');
  await shot('result');
  await click('이 기기에 기록 저장'); ok((await text()).includes('기록을 저장했어요'), '기록 저장');
  console.log('진료용 결과 요약 (기록 1개여도)'); await click('진료용 결과 요약 저장'); await new Promise((r) => setTimeout(r, 300));
  const ts = await text(); ok((await route()) === '#/summary' && ts.includes('1분체크 결과 요약') && ts.includes('입력한 검진값 없음') && ts.includes('질환 가능성 추정') && ts.includes('설문 결과') && ts.includes('인쇄·PDF로 저장'), '요약: 작성일·입력·추정·설문 구분');
  await shot('summary');
  await p.emulateMediaType('print'); ok(await p.evaluate(() => getComputedStyle(document.querySelector('.no-print')).display === 'none'), '인쇄 화면에서는 버튼을 숨김'); await p.emulateMediaType(null);

  console.log('상세'); await p.evaluate(() => { location.hash = '/detail/dm'; });
  await new Promise((r) => setTimeout(r, 300));
  const td = await text(); ok(td.includes('현재 가능성 추정') && td.includes('비슷한 조건의 100명 중 약 1명') && td.includes('또래 평균 약 1.5%와 비슷해요') && td.includes('/ 11점'), '당뇨 상세: 현재 가능성 → 100명 중 → 또래 평균');
  ok(td.includes('낮은 쪽에서 약 40번째'), '또래 100명 중 내 위치 (백분위)'); await shot('detail-dm');
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
  ok(/1\.4 →\s*0\.7/.test(await text()), '허리 −5cm 슬라이더 → 당뇨 1.4 → 0.7%'); await shot('whatif');

  console.log('고혈압 진단 + 과음이면 숨기지 않고 맨 앞에'); await p.evaluate(() => { location.hash = '/life'; }); await new Promise((r) => setTimeout(r, 300));
  await click('고혈압', '진단받은'); await click('거의 매일', '술은'); await click('소주 늘리기'); await click('소주 늘리기');
  await p.evaluate(() => { location.hash = '/result'; }); await new Promise((r) => setTimeout(r, 400));
  const th0 = await text();
  ok(/간[^\n]*확인이 필요해요/.test(th0.slice(0, 400)) && th0.includes('고혈압은 지금처럼 관리를 이어가세요'), '맨 위: 과음 → 간 확인(다른 문제도 함께), 고혈압은 관리 이어가기');
  await p.evaluate(() => { document.querySelector('details.more').open = true; });
  const th = await text();
  ok(th.includes('이미 진단받은 항목은 가능성을 다시 추정하지 않아요'), '진단받은 고혈압은 다시 추정하지 않음');
  ok(th.indexOf('간 수치') > -1 && th.indexOf('간 수치') < th.indexOf('자세히 보기'), '과음이면 간 검사 안내가 할 일에 나온다');
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

  console.log('검진 수치 (선택 입력)'); await p.evaluate(() => { location.hash = '/life'; }); await new Promise((r) => setTimeout(r, 300));
  await click('혈압 숫자를 알면'); await type('#lab-sbp', '150'); await type('#lab-dbp', '95'); await new Promise((r) => setTimeout(r, 200));
  ok(await p.evaluate(() => [...document.querySelectorAll('[aria-label="최근에 잰 혈압은요?"] button, [role=group] button')].some((b) => b.textContent.startsWith('높음') && (b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-checked') === 'true'))), '혈압 150/95 → ‘높음’ 자동 선택');
  await click('건강검진 결과지가 있으면'); ok((await route()) === '#/checkup', '#/checkup 화면');
  await type('#lab-tc', '250'); await type('#lab-egfr', '55'); await click('1+', '요단백'); await shot('checkup');
  await click('결과에 반영하기'); await new Promise((r) => setTimeout(r, 400));
  ok((await text()).slice(0, 400).includes('혈압·콜레스테롤·콩팥 확인이 필요해요'), '맨 위: 혈압·콜레스테롤·콩팥을 빠짐없이 병원 확인');
  await p.evaluate(() => { document.querySelector('details.more').open = true; });
  const tl = await text();
  ok(tl.includes('검진 총콜레스테롤 250mg/dL') && tl.includes('eGFR 55 · 요단백 1+'), '검진 수치가 결과에 반영 (콜레스테롤 250, eGFR 55·요단백 1+)');
  ok(tl.includes('한 번의 검사로는 만성콩팥병이라고 하지 않아요'), '콩팥: 단일 검사로 확진하지 않는 문구');
  ok(tl.includes('검진 150/95'), '혈압 숫자가 대사증후군 카드에 표시');
  ok(tl.includes('반영한 검진값: 혈압 · 총콜레스테롤 · eGFR · 요단백'), '반영한 검진값을 이름으로');
  await shot('result-lab');
  await click('모두 지우기').catch(() => {});


  // 프로필 모듈은 개발 서버에서만 불러올 수 있다(배포본은 번들이라 건너뜀)
  if (!BASE.includes('github.io')) {
  console.log('비교용 가상 프로필 (현재 엔진으로 계산)');
  await p.goto(BASE + '#/', { waitUntil: 'networkidle0' });
  const PROF = new URL('src/lib/bProfiles.ts', BASE).pathname;
  const ids = await p.evaluate(async (PROF) => (await import(PROF)).B_PROFILES.map((x) => x.id), PROF);
  const loadProfile = (id, edit) => p.evaluate(async (PROF, id, edit) => { const m = await import(PROF); const d = m.draftOf(m.B_PROFILES.find((x) => x.id === id)); Object.assign(d, edit || {}); sessionStorage.setItem('1mincheck.draft', JSON.stringify(d)); }, PROF, id, edit);
  const openResult = async () => { await p.goto(BASE + '#/result', { waitUntil: 'networkidle0' }); await p.reload({ waitUntil: 'networkidle0' }); await new Promise((r) => setTimeout(r, 300)); };
  for (const w of [360, 430]) {
    await p.setViewport({ width: w, height: 844, deviceScaleFactor: 1 });
    for (const id of ids) {
      await loadProfile(id); await openResult();
      const tp = await text();
      const bad = await p.evaluate(() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('.page *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > W + 0.5 || r.left < -0.5); }).map((e) => e.tagName + ' ' + e.textContent.slice(0, 16)).slice(0, 3).concat(document.documentElement.scrollWidth > W ? ['가로 스크롤'] : []); });
      ok(tp.includes('주요 결과') && bad.length === 0, `${id} @${w}px 결과 열림 · 가로 넘침 없음${bad.length ? ' → ' + bad.join(' | ') : ''}`);
      if (w !== 360) continue;
      if (id === 'P8') ok(tp.indexOf('지금 바로') > -1 && tp.indexOf('지금 바로') < tp.indexOf('주요 결과'), 'P8 긴급: 지금 바로 안내가 주요 결과보다 먼저');
      if (id === 'P7') ok((tp.match(/이미 진단받은 항목은 가능성을 다시 추정하지 않아요/g) || []).length === 2, 'P7 진단자: 당뇨·고혈압 다시 추정 안 함');
      if (id === 'P13') ok(tp.includes('혈당 확인이 필요해요') && tp.includes('추정 가능성 자체는 낮은 편이에요') && tp.includes('1,000명 중 약 6명'), 'P13: 판정 그대로(병원 확인) + 작은 절대값을 함께 표시');
      if (id === 'P10') ok(tp.includes('불면 ·') && tp.includes('아직 체크하지 않음: 소화 · 식생활'), 'P10: 설문 결과와 미체크 분야 구분');
      if (id === 'P4') ok(tp.includes('입력한 공복혈당 92mg/dL · 정상 범위') && tp.includes('반영한 검진값: 공복혈당'), 'P4: 공복혈당 측정값과 모형 추정 구분');
      if (id === 'P5') ok(tp.includes('공복혈당장애'), 'P5: 공복혈당 100–125');
      if (id === 'P9') ok(tp.includes('반영한 검진값: 총콜레스테롤') && tp.includes('그 밖의 항목은 몸 정보와 답변으로 추정했어요'), 'P9: 일부 검진값만');
      if (id === 'P1') ok(!tp.includes('검진 수치도 정상'), 'P1: 검진값 없으면 검진이 정상이라 하지 않음');
      await shot('profile-' + id);
    }
  }
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  console.log('기록 0 → 1 → 같은 입력 2 → 바뀐 입력 3');
  await p.evaluate(() => { localStorage.removeItem('1mincheck.records'); });
  await loadProfile('P2'); await p.goto(BASE + '#/record', { waitUntil: 'networkidle0' }); await p.reload({ waitUntil: 'networkidle0' });
  ok((await text()).includes('아직 저장한 기록이 없어요'), '기록 0개');
  await openResult(); await click('이 기기에 기록 저장');
  await p.evaluate(() => { location.hash = '/record'; }); await new Promise((r) => setTimeout(r, 300));
  ok((await text()).includes('아직 기록이 하나예요'), '기록 1개');
  await p.evaluate(() => { location.hash = '/result'; }); await new Promise((r) => setTimeout(r, 300));
  await click('이 기기에 기록 저장');
  await p.evaluate(() => { location.hash = '/record'; }); await new Promise((r) => setTimeout(r, 300));
  ok((await text()).includes('달라진 항목이 없어요') && /좋아진 항목\s*0개/.test(await text()), '같은 입력을 다시 저장 → 달라진 항목 없음');
  await loadProfile('P2', { weight: '84', waist: '94' }); await openResult();
  await click('이 기기에 기록 저장');
  await p.evaluate(() => { location.hash = '/record'; }); await new Promise((r) => setTimeout(r, 300));
  const tr = await text(); ok(tr.includes('달라진 항목') && /좋아진 항목\s*[1-9]개/.test(tr) && tr.includes('진료 때 보여줄 리포트로 저장'), '기록 3개: 달라진 항목 비교');
  await shot('record-compare');
  console.log('비교용 버전 기록 격리');
  const st = await p.evaluate(() => ({ ls: Object.keys(localStorage), ss: Object.keys(sessionStorage), b: localStorage.getItem('1mincheck-b.records'), bd: sessionStorage.getItem('1mincheck-b.draft') }));
  ok(st.b === '["B-SENTINEL"]' && st.bd === '"B-SENTINEL"', '비교용 B 키는 그대로 (읽거나 덮어쓰지 않음)');
  ok(st.ls.every((k) => k === '1mincheck-b.records' || k.startsWith('1mincheck.')) && st.ss.every((k) => k === '1mincheck-b.draft' || k.startsWith('1mincheck.')), '메인은 1mincheck.* 키만 씀 → ' + [...st.ls, ...st.ss].join(','));
  p.once('dialog', (d) => d.accept()); await click('기록 지우기'); await new Promise((r) => setTimeout(r, 200));
  ok(await p.evaluate(() => localStorage.getItem('1mincheck-b.records') === '["B-SENTINEL"]' && localStorage.getItem('1mincheck.records') === '[]'), '기록 지우기는 메인 기록만');

  } else console.log('  - 배포 화면: 프로필·기록 단계는 개발 서버에서 확인 (건너뜀)');
  console.log('개발자 모드 (?dev=1616)');
  await p.goto(BASE.replace(/\/?$/, '/') + '?dev=1616#/result', { waitUntil: 'networkidle0' }); await new Promise((r) => setTimeout(r, 400));
  await p.evaluate(() => { document.querySelector('details.more').open = true; });
  const tdv = await text();
  await p.evaluate(() => { location.hash = '/detail/dm'; }); await new Promise((r) => setTimeout(r, 300));
  ok(tdv.includes('개발자 모드') && (await text()).includes('DEV · 엔진'), '개발자 모드: 상세에서 엔진값 → 보정값 표시');
  await p.evaluate(() => { location.hash = '/dev'; }); await new Promise((r) => setTimeout(r, 300));
  ok((await text()).includes('확인 자료 AUC'), '개발자 모드: /dev 보정 확인 화면'); await shot('dev');
  await p.goto(BASE.replace(/\/?$/, '/') + '?dev=1#/result', { waitUntil: 'networkidle0' }); await new Promise((r) => setTimeout(r, 300));
  ok(!(await text()).includes('DEV ·'), '?dev=1 로는 켜지지 않는다');
  await p.goto(BASE.replace(/\/?$/, '/') + '?dev=1616#/result', { waitUntil: 'networkidle0' });

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
