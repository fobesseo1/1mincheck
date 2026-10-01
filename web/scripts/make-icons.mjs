// public/icon.svg → icon-180/192/512.png (설치된 크롬으로 렌더). 사용: node scripts/make-icons.mjs
// puppeteer-core 는 brag-output/work 에 설치된 것을 빌려 쓴다.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../../brag-output/work/package.json', import.meta.url));
const puppeteer = require('puppeteer-core');
const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage();
for (const s of [180, 192, 512]) {
  await p.setViewport({ width: s, height: s });
  // 홈 화면 아이콘은 둥근 모서리를 OS 가 적용하므로 꽉 찬 사각형으로 그린다
  await p.setContent(`<body style="margin:0"><div style="width:${s}px;height:${s}px">${svg.replace('rx="112"', 'rx="0"').replace('<svg ', `<svg width="${s}" height="${s}" `)}</div></body>`);
  await p.screenshot({ path: new URL(`../public/icon-${s}.png`, import.meta.url).pathname.slice(1), omitBackground: false });
}
await b.close();
console.log('icons ok');
