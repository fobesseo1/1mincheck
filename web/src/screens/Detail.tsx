// 항목 상세 (#/detail/:id). 디자인: docs/DESIGN.md
//  2026-10-15 사용자 결정: 맨 위만 '○○대 남성 중 N번째로 위험 (100명 중)', 그 아래는 모두 %.
//  ① 핵심: 뱃지 → 순위 + 위치 막대 → '또래보다 ○○ 가능성이 높아요' → 나의 예상 가능성 21% / 40대 남성 평균 14%
//  ② 몸무게와 허리가 줄어든다면?: 92kg → 70kg / 고혈압 가능성 21% → 9% (lib/overview leversOf, 하나씩 따로)
//  ③ 나이대별 ○○ 가능성: 막대(%) + 나의 예상 가능성 비교선 ④ 점수 내역(당뇨) ⑤ 다음에 할 일 ⑥ 생활을 바꾸면 → 결과 화면 ⑦ 근거
import { useState, type ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore, Nav, Crisis, AppShell } from '../ui.tsx';
import { suggestScenario } from '../state.ts';
import { viewDetail, f1, statusText, severeBp, labOf } from '../lib/view.ts';
import { NAMES, TITLE, WHAT, WHY, HOW, NEXT, NEXT_SPECIAL, SRC, KNHANES, MODULE_OF, type ItemId } from '../lib/content.ts';
import { useInput, NeedInput } from './Results.tsx';
import { overviewRows, leversOf, LEVEL_WORD, type Level } from '../lib/overview.ts';
import { RowView, Badge, plain, nb, toneOfLevel, WaistSheet, peerName, ME_CAP, bpUnknown, type Tone } from '@/components/result-v4';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MOD_ROUTE = { sleep: '/sleep', mind: '/mind', gerd: '/digest', diet: '/diet' };
const TEST: Partial<Record<ItemId, string>> = { htn: '고혈압(140/90 이상)으로', dm: '당뇨로', nafld: '지방간으로', chol: '고콜레스테롤로', osteo: '골다공증으로' };
const TXT: Record<Tone, string> = { red: 'text-risk', green: 'text-good', gray: 'text-ink' };
const DOT: Record<Tone, string> = { red: 'bg-risk ring-risk', green: 'bg-good ring-good', gray: 'bg-ink ring-ink' };
const Box = ({ children, className, label }: { children: ReactNode; className?: string; label?: string }) => <section aria-label={label} className={cn('flex flex-col rounded-card bg-white px-5 py-[18px]', className)}>{children}</section>;
const H2 = ({ children, side }: { children: ReactNode; side?: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-2"><h2 className="m-0 text-[19px] font-semibold">{children}</h2>{side && <span className="text-[12px] text-mute">{side}</span>}</div>
);
/** 가능성 % (정수, 1 미만은 '1% 미만') */
const pc = (v: number) => (v < 1 ? '1% 미만' : `${Math.round(v)}%`);
/** 받침에 맞는 조사 */
const josa = (w: string, a: string, b: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };
/** 실측 보정 항목: 비교 평균 = 진단받지 않은 같은 나이대 실측 (engine calibrate.ts) */
const CAL = ['dm', 'htn', 'chol', 'osteo'];
/** 나의 추정 가능성 21% / 50대 남성 실측 평균 15% — 숫자마다 기준을 한 줄로 (출시 전 수정 A6) */
function MePeer({ me, peer, group, tone, id, inp }: { me: number; peer: number | null | undefined; group: string; tone: Tone; id: ItemId; inp: Parameters<typeof peerName>[1] }) {
  const pn = id === 'nafld' || CAL.includes(id) ? peerName(id, inp, group) : { name: `${group} 평균`, cap: '' };
  return (
    <div className="flex flex-col gap-2.5 rounded-[12px] bg-paper px-4 py-3">
      <span className="flex flex-col gap-0.5"><span className="flex items-baseline justify-between gap-3"><span className="text-[15px] text-ink-2">나의 추정 가능성</span><b className={cn('text-[24px] leading-none font-semibold tabular-nums', TXT[tone])}>{pc(me)}</b></span>{ME_CAP[id] && <span className="text-[12px] leading-[1.5] text-mute">{ME_CAP[id]}</span>}</span>
      {peer != null && <span className="flex flex-col gap-0.5"><span className="flex items-baseline justify-between gap-3"><span className="text-[15px] text-ink-soft">{pn.name}</span><span className="text-[17px] text-ink-soft tabular-nums">{pc(peer)}</span></span>{pn.cap && <span className="text-[12px] leading-[1.5] text-mute">{pn.cap}</span>}</span>}
    </div>
  );
}
/** 견준 한 줄: 높음 '또래보다 고혈압 가능성이 높아요.' · 비슷 '고혈압 가능성이 또래와 비슷해요.'
 *  지방간은 비교 평균이 성인 전체라 '또래' 대신 '성인 남성 평균' */
const cmpLine = (name: string, d: 1 | 0 | -1, who = '또래') => (d === 0 ? `${name} 가능성이 ${who}${josa(who, '과', '와')} 비슷해요.` : `${who}보다 ${name} 가능성이 ${d > 0 ? '높아요' : '낮아요'}.`);

/** 위치 막대: 점 하나 + 양 끝 말 */
function Bar({ at, tone, ends, label }: { at: number; tone: Tone; ends: [string, string]; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex flex-col gap-1">
      <div className="relative h-1.5 rounded-full bg-track">
        <span className={cn('absolute top-1/2 box-border size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white ring-1', DOT[tone])} style={{ left: `${Math.min(97, Math.max(3, at))}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-[#9a9a96]"><span>{ends[0]}</span><span>{ends[1]}</span></div>
    </div>
  );
}

export function Detail({ id }: { id: ItemId }) {
  const { setDraft } = useStore();
  const inp = useInput();
  const [sheet, setSheet] = useState(false);
  if (!inp) return <NeedInput />;
  if (!NAMES[id]) return <NeedInput />;
  const d = viewDetail(id, inp, suggestScenario(inp)), r = d.r;
  const row = overviewRows(inp).find((x) => x.id === id);
  const mod = MODULE_OF[id];
  const sources = [...SRC[id], KNHANES];
  // 바꿔보기: 결과 세 줄(당뇨·고혈압·지방간)과 같은 기능의 확률 항목(콜레스테롤 등)도 모두
  const levers = row?.kind === 'prob' || (!row && d.isProb && r.status === 'ok') ? leversOf(id, inp) : [];
  const nextKey = id === 'htn' && r.status === 'criteria' && severeBp(inp) ? 'htn:severe' : id === 'dm' && (labOf(inp).glu ?? 0) >= 250 ? 'dm:veryhigh' : `${id}:${r.status}`;
  const next = NEXT_SPECIAL[nextKey] ?? NEXT[id];

  // ① 핵심
  let hero: ReactNode;
  const rank = row?.num?.rank ?? d.rank ?? null;
  if (row?.kind === 'prob' && rank != null && row.num?.me != null) {
    const lv = (row.level ?? 1) as Level, tone = toneOfLevel(lv), high = rank >= 50, n = high ? 101 - rank : rank;
    hero = (<>
      <span className="flex flex-wrap gap-1.5"><Badge t={LEVEL_WORD[lv]} tone={tone} />{id === 'htn' && bpUnknown(inp) && <Badge t="혈압 모름 · 재 보면 더 정확해요" tone="gray" />}</span>
      <p className="m-0 flex flex-wrap items-baseline gap-x-[5px]">
        <span className="whitespace-nowrap text-[15px] text-ink-soft">{d.group} 중</span>
        <span className="inline-flex items-baseline gap-[5px] whitespace-nowrap">
          <b className={cn('text-[30px] leading-none font-semibold tabular-nums', TXT[tone])}>{n}<span className="text-[15px] font-normal text-ink-2">번째로</span></b>
          <b className={cn('text-[19px] font-semibold', TXT[tone])}>{high ? '위험' : '안전'}</b>
        </span>
        <span className="whitespace-nowrap text-[13px] text-mute">(100명 중)</span>
      </p>
      <Bar at={rank} tone={tone} ends={['안전', '위험']} label={`${d.group} 100명 중 ${n}번째로 ${high ? '위험' : '안전'}`} />
      <p className="m-0 border-t border-hair pt-3.5 text-[15px] font-semibold">{cmpLine(NAMES[id], lv >= 2 ? 1 : lv === 0 ? -1 : 0, id === 'nafld' ? `성인 ${inp.sex === 'F' ? '여성' : '남성'} 평균` : '또래')}</p>
      <MePeer me={row.num.me} peer={row.num.peer} group={d.group} tone={lv >= 3 ? 'red' : 'gray'} id={id} inp={inp} />
    </>);
  } else if (row && row.kind !== 'prob') {
    hero = <div className="-my-4"><RowView r={row} inp={inp} first onWaist={() => setSheet(true)} /></div>;
  } else if (r.status === 'ok' && d.isProb && r.value != null && d.cmp) {
    const me = d.cmp.me, peer = d.cmp.peer, x = peer > 0 ? me / peer : 1;
    const [word, tone]: [string, Tone] = x >= 2 && me >= 5 ? ['높은 편', 'red'] : x >= 1.2 ? ['조금 높은 편', 'gray'] : x <= 0.8 ? ['낮은 편', 'green'] : ['또래와 비슷', 'gray'];
    // 순위 표가 없는 항목(콜레스테롤·골다공증): 순위 줄 없이 같은 % 두 줄
    hero = (<>
      <Badge t={word} tone={tone} />
      <p className="m-0 text-[15px] font-semibold">{cmpLine(NAMES[id], x >= 1.2 ? 1 : x <= 0.8 ? -1 : 0)}</p>
      <MePeer me={me} peer={peer} group={d.group} tone={tone === 'red' ? 'red' : 'gray'} id={id} inp={inp} />
    </>);
  } else if (r.status === 'ok' && !d.isProb && r.value != null) {
    hero = (<>
      <Badge t={r.category ?? ''} tone={id === 'obesity' ? (r.value >= 25 || r.value < 18.5 ? 'red' : r.value >= 23 ? 'gray' : 'green') : 'gray'} />
      <p className="m-0 flex items-baseline gap-[5px]"><span className="text-[15px] text-ink-soft">{id === 'obesity' ? 'BMI' : '점수'}</span><b className="text-[30px] leading-none font-semibold tabular-nums">{id === 'obesity' ? f1(r.value) : r.value}{id !== 'obesity' && <span className="text-[15px] font-normal text-ink-2">점</span>}</b></p>
    </>);
  } else {
    const red = r.status === 'criteria' || r.status === 'excluded';
    hero = (<>
      <Badge t={d.ratioTag || statusText[r.status]} tone={red ? 'red' : 'gray'} />
      <b className={cn('text-[19px] font-semibold', red && 'text-risk')}>{r.status === 'needs_input' ? '답하면 볼 수 있어요' : r.status === 'managed' ? '진단·관리 중' : statusText[r.status]}</b>
      {d.statusNote && <p className="m-0 text-body-sm leading-[1.6] text-ink-2">{plain(d.statusNote)}</p>}
      {r.status === 'needs_input' && mod && <Button asChild className="self-start"><a href={'#' + MOD_ROUTE[mod]} onClick={() => setDraft((x) => ({ ...x, modules: { ...x.modules, [mod]: true } }))}>질문 답하기</a></Button>}
    </>);
  }
  const top = d.bands.length ? Math.max(...d.bands.map((b) => b.v), 1) : 1;
  return (
    <AppShell tab="result">
      <Nav back="/result" title={TITLE[id]} sub={`${inp.age}세 ${inp.sex === 'F' ? '여성' : '남성'}`} />
      {d.crisis && <Crisis />}

      <Box label="핵심" className="gap-3.5 p-5 [&>span:first-child]:self-start">{hero}</Box>
      {/* 검진 안내 블록은 두지 않는다(2026-10-15 사용자): 같은 조언이 아래 '다음에 할 일'에 있다 */}

      {levers.length > 0 && (() => {
        // 제목: 몸무게·허리(줄이는 것)만이면 '몸무게와 허리가 줄어든다면?', 운동·술이 끼면 '생활을 바꾼다면?'
        const shrink = levers.every((l) => l.key === 'weight' || l.key === 'waist');
        const short = levers.map((l) => (l.key === 'waist' ? '허리' : l.name)), full = levers.map((l) => l.name);
        const join = (xs: string[]) => xs.reduce((s, w, k) => (k === 0 ? w : `${s}${josa(xs[k - 1], '과', '와')} ${w}`), '');
        const title = shrink ? `${join(short)}${josa(short[short.length - 1], '이', '가')} 줄어든다면?` : '생활을 바꾼다면?';
        return (
          <Box label={title} className="pt-1.5">
            <h2 className="m-0 mt-3.5 mb-1.5 text-[19px] font-semibold">{title}</h2>
            {/* 캔버스 'Detail' 그대로: 오른쪽 위 '○○ 가능성' 머리말, 줄마다 왼쪽 이름 / 지금 → 바꾼 값, 오른쪽 지금 %(줄 그음) → 바꾼 뒤 %(크게 초록) */}
            <p className="m-0 mb-1.5 self-end text-right text-[13px] text-mute">{NAMES[id]} 가능성</p>
            {levers.map((l) => (
              // 이름 · 바꾼 값과 % 가 한 줄에 안 들어가면(좁은 화면 · 글자 크게) % 가 아랫줄 오른쪽으로
              <div key={l.key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-hair py-3.5">
                <b className="flex flex-1 flex-col text-[15px] font-semibold">{l.name}<span className="whitespace-nowrap">{l.from} → {l.to}</span></b>
                <span className="ml-auto flex items-baseline gap-1 whitespace-nowrap">
                  <s className="text-[13px] text-[#9a9a96] tabular-nums">{pc(l.now)}</s><ArrowRight className="size-3.5 self-center text-[#9a9a96]" />
                  <b className="text-[22px] leading-none font-semibold text-good tabular-nums">{pc(l.after)}</b>
                </span>
              </div>
            ))}
            <p className="m-0 border-t border-hair pt-3 text-[12px] leading-[1.55] text-mute">{levers.length > 1 ? `${join(full)}${josa(full[full.length - 1], '은', '는')} 각각 따로 바꿔본 결과예요.` : '다른 조건은 그대로 두고 바꿔본 결과예요.'}</p>
          </Box>
        );
      })()}

      {d.bands.length > 0 && id !== 'nafld' && (() => {
        // 막대 = 나이대별 평균 가능성(%), 점선 = 나의 예상 가능성. 막대 높이는 92px 안에서 (위 16px는 숫자 자리)
        // 막대 숫자는 막대 아래(나이 위)에 두어 점선과 겹치지 않게. 점선 이름표는 그래프 위 범례로
        const me = d.isProb && r.value != null ? r.value : null, H = 104;
        const scale = Math.max(top, me ?? 0, 1) * 1.08, y = (v: number) => Math.max(4, (v / scale) * H);
        const lineCls = row?.level != null && row.level >= 3 ? 'border-risk' : row?.level === 0 ? 'border-good' : 'border-ink-2';
        const sex = inp.sex === 'F' ? '여성' : '남성', cal = CAL.includes(id);
        const title = cal ? '나이대별 실측 평균' : `나이대별 ${NAMES[id]} 가능성`, legend = cal ? `진단받지 않은 ${sex}` : `${sex} 평균`;
        return (
          <Box label={title} className="gap-3">
            <H2 side="단위 %">{title}</H2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-2">
              <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-[#e6e6e3]" />{legend}</span>
              {me != null && <span className="inline-flex items-center gap-1.5"><i className={cn('w-4 border-t-2 border-dashed', lineCls)} />나의 추정 가능성 <b className="font-semibold text-ink">{pc(me)}</b></span>}
            </div>
            <div role="img" aria-label={`${title} (${legend})${me != null ? `, 나의 추정 가능성 ${pc(me)}` : ''}`} className="relative">
              <div className="grid h-[104px] grid-cols-6 items-end gap-2 border-b border-track">
                {d.bands.map((b) => <i key={b.l} className={cn('w-full rounded-t-md', b.mine ? 'bg-ink' : 'bg-[#e6e6e3]')} style={{ height: y(b.v) }} />)}
              </div>
              {me != null && <div className={cn('pointer-events-none absolute inset-x-0 border-t-2 border-dashed', lineCls)} style={{ bottom: y(me) }} />}
            </div>
            <div className="-mt-1 grid grid-cols-6 gap-2 text-center">
              {d.bands.map((b) => (
                <span key={b.l} className="flex flex-col gap-0.5">
                  <span className={cn('text-[13px] tabular-nums', b.mine ? 'font-semibold text-ink' : 'text-ink-soft')}>{pc(b.v)}</span>
                  <span className={cn('text-[11px]', b.mine ? 'font-semibold text-ink' : 'text-[#9a9a96]')}>{b.l}</span>
                </span>
              ))}
            </div>
            {d.isProb && <p className="m-0 text-[12px] leading-[1.55] text-mute">이미 진단받은 사람은 빼고 계산했어요.{cal && <><br />국민건강영양조사 2022–2024</>}</p>}
          </Box>
        );
      })()}

      {d.parts.length > 0 && (
        <Box label="점수 내역" className="pt-1.5">
          <div className="mt-3.5 mb-1.5"><H2 side="한국형 당뇨 선별점수">점수는 이렇게 나왔어요</H2></div>
          <p className="m-0 flex items-baseline pb-2"><b className="text-[30px] leading-none font-semibold tabular-nums">{r.score}<span className="text-[15px] font-normal text-ink-2">점</span></b><span className="ml-1 text-[13px] text-ink-soft">/ 11점</span></p>
          {d.parts.map((p) => <div key={p.k} className="flex min-h-[40px] items-center justify-between border-t border-hair text-[15px]"><span>{p.k}</span><b className={p.v > 0 ? 'font-semibold' : 'font-normal text-mute'}>{p.v > 0 ? `+${p.v}점` : '0점'}</b></div>)}
          <p className="m-0 mt-1 rounded-[12px] bg-paper px-3.5 py-3 text-body-sm leading-[1.6]">{(r.score ?? 0) >= 5 ? '5점 이상이면\n검진에서 혈당을 한 번 확인해 보세요.' : '검사를 권하는 기준(5점)보다 낮아요.'}</p>
        </Box>
      )}

      {WHY[id] && <Box label="왜 중요할까요" className="gap-2"><H2>왜 중요할까요</H2><p className="m-0 text-body-sm leading-[1.6] whitespace-pre-line text-ink-2">{nb(WHY[id])}</p></Box>}

      <Box label="다음에 할 일" className="py-1.5">
        <h2 className="m-0 mt-3.5 mb-1.5 text-[19px] font-semibold">다음에 할 일</h2>
        {next.map((t, k) => (
          <div key={t.t} className="flex gap-3 border-t border-hair py-3.5">
            <span className="flex size-6 flex-none items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white">{k + 1}</span>
            <span className="flex flex-col gap-0.5"><b className="text-[15px] font-semibold">{t.t}</b>{t.d && <span className="text-[13px] leading-[1.55] whitespace-pre-line text-ink-soft">{plain(t.d)}</span>}</span>
          </div>
        ))}
        {id === 'diet' && (r.flags?.length ?? 0) > 0 && <p className="m-0 pb-3 text-body-sm text-risk">지금 보완하면 좋은 점: {r.flags!.join(', ')}</p>}
      </Box>

      {['dm', 'htn', 'nafld', 'obesity', 'chol'].includes(id) && (
        <a href="#/result" className="flex items-center gap-3.5 rounded-card bg-white px-5 py-[18px] text-ink no-underline">
          <span className="flex flex-1 flex-col gap-0.5"><b className="text-[15px] font-semibold">몸무게·허리·술을 바꾸면?</b><span className="text-[13px] text-ink-soft">결과 화면 ‘생활을 바꾸면’에서 바로 볼 수 있어요</span></span>
          <ChevronRight className="size-5 text-mute" />
        </a>
      )}

      <Box label="근거" className="gap-2.5">
        <details className="group">
          <summary className="flex items-center justify-between"><b className="text-[15px] font-semibold">근거</b><span className="flex items-center gap-0.5 text-[13px] text-ink-soft">계산 방법<ChevronDown className="size-3.5 transition-transform group-open:rotate-180" /></span></summary>
          <p className="m-0 mt-2.5 text-body-sm leading-[1.6] text-ink-2">{nb(HOW[id])} 이 계산은 기기 안에서만 해요.</p>
        </details>
        <p className="m-0 text-[13px] leading-[1.6] whitespace-pre-line text-ink-2">{nb(WHAT[id])}</p>
        {sources.map((s) => (
          <a key={s.u} href={s.u} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2.5 border-t border-hair pt-2.5 text-ink no-underline">
            <span className="flex flex-col"><span className="text-[13px] text-ink-2">{nb(s.t)}</span><span className="text-[12px] text-mute">{nb(s.d)}</span></span><ArrowUpRight className="size-4 flex-none text-mute" />
          </a>
        ))}
      </Box>
      <p className="m-0 text-center text-[12px] text-mute">논문과 국가 통계를 바탕으로 한 예측이에요.</p>
      <WaistSheet open={sheet} onOpenChange={setSheet} inp={inp} />
    </AppShell>
  );
}
