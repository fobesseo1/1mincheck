// A(기준 배포 커밋)와 B의 계산·판정이 같은 입력에서 같은지 비교한다.
// 사용: (A 커밋을 다른 폴더에 체크아웃한 뒤) npx tsx scripts/ab-identity.mts <A 저장소 폴더>
// 비교: 모든 항목의 상태·확률·범위·또래 기준값·점수·등급·플래그, 결과 화면 묶음(prob·score), 행동 단계(tier·태그·제목·할 일), 앞으로의 발생 위험(dm10·htn4·chd10)과 생활·검진 체크
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const A = resolve(process.argv[2] ?? '');
const imp = (root: string, p: string) => import(pathToFileURL(resolve(root, p)).href);
const B = resolve(import.meta.dirname, '../..');

const [aView, aVerdict, aState, aExtras] = await Promise.all([imp(A, 'web/src/lib/view.ts'), imp(A, 'web/src/lib/verdict.ts'), imp(A, 'web/src/state.ts'), imp(A, 'engine/src/extras.ts')]);
const [bView, bVerdict, bState, bExtras, prof] = await Promise.all([imp(B, 'web/src/lib/view.ts'), imp(B, 'web/src/lib/verdict.ts'), imp(B, 'web/src/state.ts'), imp(B, 'engine/src/extras.ts'), imp(B, 'web/src/lib/bProfiles.ts')]);

function snap(V: any, Vd: any, St: any, Ex: any, inp: any) {
  const sc = St.suggestScenario(inp), r = V.viewResults(inp, sc), v = Vd.verdict(inp, r, sc);
  return {
    runAll: V.runAll(inp).map((x: any) => ({ id: x.id, status: x.status, value: x.value, range: x.range, peer: x.peer, score: x.score, category: x.category, flags: x.flags })),
    prob: r.prob.map((p: any) => ({ id: p.id, status: p.status, pct: p.pct, peer: p.cmp?.peer ?? null, x: p.cmp?.x ?? null, label: p.cmp?.label ?? null })),
    score: r.score.map((s: any) => ({ id: s.id, v: s.v, cat: s.cat, status: s.status })),
    verdict: { tier: v.tier, tag: v.tag, title: v.title, sub: v.sub, actions: v.actions, also: v.also ?? null },
    extras: Ex.runExtras(inp, St.drinkOf(inp), V.labOf(inp)).map((x: any) => ({ id: x.id, level: x.level, head: x.head, items: x.items })),
    whatIf: V.whatIfRows(inp, V.applyScenario(inp, sc)).rows.map((w: any) => [w.id, w.b, w.a]),
  };
}

let diff = 0;
const rows: string[] = [];
for (const p of prof.B_PROFILES) {
  const d = prof.draftOf(p);
  const ia = aState.toInput(d), ib = bState.toInput(d);
  const sa = snap(aView, aVerdict, aState, aExtras, ia), sb = snap(bView, bVerdict, bState, bExtras, ib);
  const same = JSON.stringify(sa) === JSON.stringify(sb);
  if (!same) { diff++; for (const k of Object.keys(sa)) if (JSON.stringify((sa as any)[k]) !== JSON.stringify((sb as any)[k])) console.log(`  ✗ ${p.id} ${k} 다름`); }
  const pr = sb.prob.map((x: any) => `${x.id} ${x.status === 'ok' ? x.pct + '%' + (x.peer != null ? `(또래 ${Math.round(x.peer * 10) / 10})` : '') : x.status}`).join(' · ');
  const sc = sb.score.filter((x: any) => x.status === 'ok' && x.v !== '–').map((x: any) => `${x.id} ${x.v}·${x.cat}`).join(' · ');
  const fut = sb.extras.filter((x: any) => ['dm10', 'htn4', 'chd10'].includes(x.id)).map((x: any) => x.id).join('·') || '없음(나이 범위 밖)';
  rows.push(`| ${p.id} | ${p.title} | ${sb.verdict.tier} ${sb.verdict.tag} · ${sb.verdict.title} | ${pr} | ${sc || '–'} | ${fut} | ${same ? '같음' : '다름'} |`);
}
console.log('| 프로필 | 상황 | 행동 단계 | 현재 가능성 추정(또래 평균) | 설문·체형 | 앞으로의 발생 위험 카드 | A와 B |');
console.log('|---|---|---|---|---|---|---|');
console.log(rows.join('\n'));
console.log(diff ? `\n다른 프로필 ${diff}개` : '\n모든 프로필에서 계산·판정이 A와 같음');
process.exit(diff ? 1 : 0);
