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
  background: radial-gradient(120% 90% at 85% 10%, #ff9a7a 0%, #f9603f 38%, #f73b20 62%, #d92a12 100%); }
.l { flex: 1.1; display: flex; flex-direction: column; gap: 26px; } .logo { display: flex; align-items: center; gap: 14px; font-size: 34px; font-weight: 800; color: #fff; }
.logo i { width: 48px; height: 48px; border-radius: 14px; background: #fff; display: flex; align-items: center; justify-content: center; } .logo i::after { content: ''; width: 17px; height: 17px; border-radius: 50%; background: #f73b20; }
h1 { font-size: 76px; white-space: nowrap; line-height: 1; font-weight: 500; color: #fff; } h1 b { font-weight: 500; }
p { font-size: 30px; line-height: 1.4; font-weight: 450; color: rgba(255,255,255,.95); }
.r { flex: 0 0 440px; background: #fff; color: #360802; border-radius: 24px; box-shadow: 0 20px 50px rgba(54,8,2,.25); padding: 34px; display: flex; flex-direction: column; gap: 18px; }
.r b { font-size: 30px; font-weight: 500; color: #360802; }
.d { display: grid; grid-template-columns: repeat(10, 1fr); gap: 9px; } .d i { aspect-ratio: 1; border-radius: 50%; background: #e7dcdb; display: block; }
.d i.me { background: #f73b20; box-shadow: 0 0 0 3px #fff, 0 0 0 6px #f73b20; transform: scale(1.2); } .r span { font-size: 21px; color: #6b4a45; font-weight: 450; }
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
