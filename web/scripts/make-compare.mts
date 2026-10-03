// A/B 비교 안내 페이지(public/compare.html)를 만든다. 가상 프로필의 답은 src/lib/bProfiles.ts 에서 그대로 가져온다(손으로 옮기지 않음).
// 결과 값은 넣지 않는다 — 두 버전에서 직접 입력해 보게 한다.
// 사용: npx tsx scripts/make-compare.mts
import { writeFileSync } from 'node:fs';
import { B_PROFILES, draftOf } from '../src/lib/bProfiles.ts';
import { ALC_FREQ, menoShown } from '../src/state.ts';

const A_URL = 'https://fobesseo1.github.io/1mincheck/', B_URL = 'https://fobesseo1.github.io/1mincheck-b/';
const yn = (v: boolean | null | undefined, y = '네', n = '아니요') => (v == null ? '–' : v ? y : n);
const ISI_L = [['없음', '약간', '중간', '심함', '매우 심함'], ['없음', '약간', '중간', '심함', '매우 심함'], ['없음', '약간', '중간', '심함', '매우 심함'], ['매우 만족', '만족', '보통', '불만족', '매우 불만족'],
  ['전혀', '약간', '어느 정도', '많이', '매우 많이'], ['전혀', '약간', '어느 정도', '많이', '매우 많이'], ['전혀', '약간', '어느 정도', '많이', '매우 많이']];
const F4 = ['전혀', '며칠', '7일 이상', '거의 매일'];
const LAB: Record<string, string> = { sbp: '수축기 혈압', dbp: '이완기 혈압', glu: '공복혈당', tc: '총콜레스테롤', tg: '중성지방', hdl: 'HDL', egfr: 'eGFR', upro: '요단백' };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function answers(p: (typeof B_PROFILES)[number]) {
  const d = draftOf(p), L: string[] = [];
  L.push(`<b>기본</b> ${d.sex === 'F' ? '여성' : '남성'} · 만 ${d.age}세 · 키 ${d.height}cm · 몸무게 ${d.weight}kg · 허리 ${d.waist}cm (단위 cm로 바꿔 입력)`);
  const amt = Object.entries(d.alcAmt).filter(([, n]) => n).map(([k, n]) => `${{ soju: '소주', beer: '맥주', wine: '와인' }[k]} ${n}${{ soju: '병', beer: '캔(500cc)', wine: '잔' }[k]}`).join(', ');
  L.push(`<b>생활</b> 담배 ${{ never: '안 피움', past: '예전에 피움', current: '지금 피움' }[d.smoke!]} · 술 ${ALC_FREQ.find((f) => f.v === d.alcFreq)!.t}${amt ? ` (한 번에 ${amt})` : ''} · 운동 ${yn(d.exercise)}${menoShown(d) ? ` · 폐경 ${d.meno === true ? '네' : d.meno === false ? '아니요' : '잘 모름'}` : ''} · 부모·형제 당뇨 ${yn(d.famDM, '있어요', '없어요')}`);
  const dx = (['htn', 'dm', 'chol'] as const).filter((k) => d.dx[k]).map((k) => ({ htn: '고혈압', dm: '당뇨', chol: '고지혈증' }[k]));
  L.push(`<b>병력</b> 진단받은 질환 ${dx.length ? dx.join('·') : '없음'} · 최근 혈압 ${{ unknown: '모름', normal: '정상', elevated: '주의', high: '높음' }[d.bp!]}`);
  const labs = Object.entries(d.lab ?? {}).map(([k, v]) => `${LAB[k]} ${v}`);
  L.push(`<b>검진 수치</b> ${labs.length ? labs.join(' · ') + (d.lab?.sbp || d.lab?.glu ? ' (생활 화면의 ‘혈압 숫자를 알면’·‘공복혈당을 알면’ 칸)' : ' (결과 화면 → 검진 수치 넣기)') : '넣지 않음'}`);
  const mods = Object.entries(d.modules).filter(([, v]) => v).map(([k]) => ({ sleep: '수면', mind: '마음', gerd: '소화', diet: '식생활' }[k]));
  L.push(`<b>관심 분야</b> ${mods.length ? mods.join('·') + '만 켜기' : '모두 끄기'}`);
  if (d.modules.sleep) L.push(`<b>수면</b> 코골이 ${yn(d.sleep.snore)} · 낮 피곤 ${yn(d.sleep.tired)} · 숨 멈춤 ${yn(d.sleep.apnea)} · 목둘레 ${yn(d.sleep.neck)} · 최근 2주 잠 문제 ${yn(d.sleep.insGate)}${d.sleep.insGate ? ` → 7문항: ${d.sleep.isi.map((v, k) => ISI_L[k][v!]).join(', ')}` : ''}`);
  if (d.modules.mind) L.push(`<b>마음</b> 흥미 ${F4[d.mind.phq[0]!]} · 기분 ${F4[d.mind.phq[1]!]} · 초조 ${F4[d.mind.gad[0]!]} · 걱정 ${F4[d.mind.gad[1]!]} (‘더 정확히 보기’ 7문항은 비워 두기)`);
  return L.map((x) => `<li>${x}</li>`).join('');
}

const prof = B_PROFILES.map((p) => `<details><summary><span class="id">${p.id}</span> ${esc(p.title)}</summary><ul>${answers(p)}</ul>${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}</details>`).join('\n');

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>1분체크 버전 비교 안내</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
:root{--ink:#163300;--lime:#9fe870;--bg:#f2f4f0;--line:#e0e3dd;--text:#0e0f0c;--sub:#454745}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:"Pretendard Variable",Pretendard,system-ui,sans-serif;letter-spacing:-0.005em;word-break:keep-all;overflow-wrap:break-word;line-height:1.6}
main{max-width:720px;margin:0 auto;padding:28px 16px 64px;display:flex;flex-direction:column;gap:18px}
h1{margin:0;font-size:26px;line-height:1.3}h2{margin:0 0 8px;font-size:18px}
section{background:#fff;border-radius:18px;padding:18px}
.open{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.open a{display:flex;flex-direction:column;gap:2px;padding:16px;border-radius:14px;background:var(--ink);color:#fff;text-decoration:none;font-weight:800;font-size:18px}
.open a small{font-weight:500;font-size:12px;color:#d8e8cf}
.addr{font-size:13px;color:var(--sub)}.addr code{font-size:12px}
ol,ul{margin:0;padding-left:20px}li{margin:4px 0}
details{border-top:1px solid var(--line);padding:10px 0}details:first-of-type{border-top:0}
summary{cursor:pointer;font-weight:700}.id{display:inline-block;min-width:38px;padding:1px 8px;border-radius:999px;background:var(--bg);font-size:12px;text-align:center;margin-right:6px}
details ul{font-size:14px;margin-top:8px}.note{margin:6px 0 0;font-size:13px;color:var(--sub)}
.q li{font-weight:600}.small{font-size:13px;color:var(--sub)}
@media (max-width:480px){.open{grid-template-columns:1fr}}
</style></head>
<body><main>
<h1>1분체크 두 버전 비교 안내</h1>
<p class="small" style="margin:0">두 버전은 계산 방법과 결과 숫자가 같고, 보여주는 순서와 문장이 달라요. 어느 쪽이 더 낫다는 정답은 없어요. 써 보고 느낀 그대로 알려 주세요.</p>

<section>
<h2>열어 보기</h2>
<div class="open" id="open"></div>
<p class="addr" id="addr"></p>
<p class="small" id="order-note"></p>
</section>

<section>
<h2>같은 조건으로 비교하는 방법</h2>
<ol>
<li>먼저 1번의 첫 화면을 5초만 보고, 무엇을 해 주는 서비스인지 한 문장으로 적어 보세요. 2번도 똑같이 해요.</li>
<li>아래 가상 프로필 하나를 골라 1번에서 처음부터 끝까지 입력하고 결과를 봐요. 같은 답을 2번에도 입력해요.</li>
<li>결과에서 숫자의 뜻, 걱정할 부분과 유지할 부분, 할 일을 찾아보세요. 저장·기록·진료용 요약도 눌러 봐요.</li>
<li>두 버전의 기록은 서로 따로 저장돼요. 건강정보는 서버로 보내지 않아요. 실제 내 정보 대신 가상 프로필을 써도 돼요.</li>
</ol>
</section>

<section>
<h2>비교할 때 볼 질문 4개</h2>
<ol class="q">
<li>무엇을 해주는 서비스인지 더 빨리 이해한 쪽은?</li>
<li>결과 숫자의 뜻을 더 쉽게 이해한 쪽은?</li>
<li>걱정할 부분과 유지할 부분을 더 명확히 알 수 있는 쪽은?</li>
<li>더 편하고 덜 피곤한 쪽은?</li>
</ol>
<p class="small">답은 ‘1번 / 2번 / 비슷함’과 그렇게 느낀 이유 한 줄이면 충분해요.</p>
</section>

<section>
<h2>비교용 가상 프로필 (실제 사람이 아니에요)</h2>
<p class="small" style="margin-top:0">결과 값은 적지 않았어요. 두 버전에 같은 답을 넣고 직접 확인해 주세요. 소주 양은 ‘소주 늘리기(+)’ 버튼으로 맞춰요.</p>
${prof}
<details><summary><span class="id">P11</span> 기록이 없는 첫 이용</summary><ul><li>각 버전을 처음 연 상태(또는 기록 지우기 후)에서 P1을 입력하고 결과와 ‘기록’ 탭을 봐요.</li></ul></details>
<details><summary><span class="id">P12</span> 기록 1개와 2개 이상</summary><ul><li>P2를 입력하고 결과를 저장 → ‘기록’ 탭에서 1개 상태를 봐요.</li><li>‘다시 체크’로 P2를 다시 입력하되 몸무게 84kg·허리 94cm로 바꿔 저장 → ‘기록’ 탭에서 비교를 봐요.</li></ul></details>
</section>
<p class="small">이 안내는 비교를 위한 페이지예요. 건강정보를 주소(URL)에 담지 않고, 응답을 자동으로 모으지 않아요.</p>
</main>
<script>
// 순서 편향을 줄이려고 ?o=2 이면 B를 1번으로 보여준다(배정·기록은 하지 않음)
var A = { name: '현재 버전 (A)', url: '${A_URL}' }, B = { name: '제안 버전 (B)', url: '${B_URL}' };
var swap = new URLSearchParams(location.search).get('o') === '2', first = swap ? B : A, second = swap ? A : B;
document.getElementById('open').innerHTML = [first, second].map(function (v, k) { return '<a href="' + v.url + '" target="_blank" rel="noopener">' + (k + 1) + '번 열기<small>' + v.name + '</small></a>'; }).join('');
document.getElementById('addr').innerHTML = '현재 버전(A): <code>' + A.url + '</code><br>제안 버전(B): <code>' + B.url + '</code>';
document.getElementById('order-note').textContent = swap ? '이 안내는 B를 먼저 보는 순서예요. 다른 순서 안내: compare.html' : '이 안내는 A를 먼저 보는 순서예요. 다른 순서 안내: compare.html?o=2';
</script>
</body></html>
`;
writeFileSync(new URL('../public/compare.html', import.meta.url), html);
console.log('public/compare.html 작성');
