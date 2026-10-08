// 공유 미리보기 이미지(1200×630) 만들기: node scripts/make-og.mjs → public/og.png. 개인 숫자 없이 서비스 소개만.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../brag-output/work/package.json', import.meta.url));
const puppeteer = require('puppeteer-core');
import { readFileSync } from 'node:fs';
// 빈 페이지(setContent)에서는 file:// 글꼴을 못 읽어 data URL 로 넣는다
const FONT = 'data:font/woff2;base64,' + readFileSync(new URL('../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2', import.meta.url)).toString('base64');
const dots = Array.from({ length: 100 }, (_, k) => `<i class="${k === 71 ? 'me' : ''}"></i>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: P; src: url('${FONT}'); font-weight: 45 920; }
* { margin: 0; box-sizing: border-box; } body { width: 1200px; height: 630px; font-family: P, sans-serif; display: flex; padding: 72px 80px; gap: 64px; align-items: center; letter-spacing: -0.005em; color: #fff;
  background: radial-gradient(130% 100% at 80% 0%, #3d8f1c 0%, #1f5408 45%, #163300 100%); }
.l { flex: 1.1; display: flex; flex-direction: column; gap: 26px; } .logo { display: flex; align-items: center; gap: 14px; font-size: 34px; font-weight: 800; color: #fff; }
.logo i { width: 48px; height: 48px; border-radius: 14px; background: #9fe870; display: flex; align-items: center; justify-content: center; } .logo i::after { content: ''; width: 17px; height: 17px; border-radius: 50%; background: #163300; }
h1 { font-size: 76px; white-space: nowrap; line-height: 1; font-weight: 500; color: #fff; } h1 b { font-weight: 500; color: #9fe870; }
p { font-size: 30px; line-height: 1.4; font-weight: 450; color: rgba(255,255,255,.95); }
.r { flex: 0 0 440px; background: #fff; color: #0e0f0c; border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,.3); padding: 34px; display: flex; flex-direction: column; gap: 18px; }
.r b { font-size: 30px; font-weight: 500; color: #163300; }
.d { display: grid; grid-template-columns: repeat(10, 1fr); gap: 9px; } .d i { aspect-ratio: 1; border-radius: 50%; background: #e0e3dd; display: block; }
.d i.me { background: #163300; box-shadow: 0 0 0 3px #9fe870, 0 0 0 6px #163300; transform: scale(1.2); } .r span { font-size: 21px; color: #5d605c; font-weight: 450; }
</style></head><body><div class="l"><div class="logo"><i></i>1분체크</div><h1>내 몸이 궁금할 때<br><b>딱 1분.</b></h1><p>또래 100명 중 나는 어디쯤?<br>몸무게·허리를 줄이면 어떻게 될까?</p></div>
<div class="r"><b>또래 100명 중 나</b><div class="d">${dots}</div><span>설치·가입 없이 · 건강정보는 기기 안에서만</span></div></body></html>`;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 630 });
await p.setContent(html, { waitUntil: 'networkidle0' });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: new URL('../public/og.png', import.meta.url).pathname.slice(1) });
await b.close();
console.log('public/og.png');
