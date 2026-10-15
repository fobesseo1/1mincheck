// 모든 항목 보기 (#/all) — 2026-10-15 Claude 디자인 캔버스 'All' 그대로. 디자인: docs/DESIGN.md
//  지금 상태: 결과 화면의 세 줄(당뇨·고혈압·지방간) + 콜레스테롤·골다공증·체형을 같은 줄 모양으로
//  앞으로 몇 년 안에 · 생활·검진 체크: 뱃지 → 이름 · 결론 → 자세히(근거 줄·할 일·출처)
//  숫자 앞 %는 쓰지 않는다(plain). 숫자와 단위는 붙이고, 설명은 '/ ' 뒤에.
import { useState, type ReactNode } from 'react';
import { ChevronRight, Circle, CircleDot, CircleHelp, CheckCircle2, Dot } from 'lucide-react';
import type { Input } from '../../../engine/src/engine.ts';
import { AppShell, Nav } from '../ui.tsx';
import { useInput, NeedInput } from './Results.tsx';
import type { AppInput } from '../state.ts';
import { probB, scopeOf, B_NAME, type ProbRow } from '../lib/b.ts';
import { suggestScenario, drinkOf } from '../state.ts';
import { runExtras, type Extra } from '../../../engine/src/extras.ts';
import { polishExtra } from '../lib/extrasCopy.ts';
import { viewResults, labOf, groupLabel } from '../lib/view.ts';
import { overviewRows } from '../lib/overview.ts';
import { RowView, Badge, More, sev, plain, WaistSheet, type Tone } from '@/components/result-v4';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TOP = ['dm', 'htn', 'nafld'];
const FUTURE = ['dm10', 'htn4', 'chd10'];
const TXT: Record<Tone, string> = { red: 'text-risk', green: 'text-good', gray: 'text-ink' };
const DOT: Record<Tone, string> = { red: 'bg-risk ring-risk', green: 'bg-good ring-good', gray: 'bg-ink ring-ink' };

/** 한 줄 틀: 뱃지 → 이름 · 결론 · 자세히 → (막대) → 펼친 설명 */
function Line({ first, badge, name, stmt, viz, more }: { first?: boolean; badge: ReactNode; name: string; stmt: ReactNode; viz?: ReactNode; more?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('flex flex-col gap-2 py-4', !first && 'border-t border-hair')}>
      <div className="flex items-center gap-1.5">{badge}</div>
      <div className="flex items-center gap-3">
        <b className="w-[88px] flex-none whitespace-nowrap text-[17px] font-semibold">{name}</b>
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1">{stmt}</div>
        {more && <More open={open} onClick={() => setOpen((x) => !x)} />}
      </div>
      {viz}
      {open && more && <div className="flex flex-col gap-2 rounded-[12px] bg-paper px-3.5 py-3 text-body-sm leading-[1.6] whitespace-pre-line text-[#333]">{more}</div>}
    </div>
  );
}
/** 숫자 + 단위(붙여서) */
const Num = ({ n, unit, tone = 'gray' }: { n: ReactNode; unit: string; tone?: Tone }) => (
  <b className={cn('text-[24px] leading-none font-semibold tabular-nums', TXT[tone])}>{n}<span className="text-[13px] font-normal text-ink-2">{unit}</span></b>
);
const Sub = ({ children }: { children: ReactNode }) => <span className="text-[13px] text-ink-2">/ {children}</span>;

/** 0–100명 막대 위 점 하나 */
function Bar100({ me, tone, label }: { me: number; tone: Tone; label: string }) {
  return (
    <div role="img" aria-label={label} className="mt-0.5 flex flex-col gap-1">
      <div className="relative h-1.5 rounded-full bg-track">
        <span className={cn('absolute top-1/2 box-border size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white ring-1', DOT[tone])} style={{ left: `${Math.min(97, Math.max(3, me))}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-[#9a9a96]"><span>0명</span><span>100명</span></div>
    </div>
  );
}

/** 콜레스테롤·골다공증 등 순위가 없는 항목: 100명 중 몇 명 + 또래 평균 */
function ProbLine({ p, inp }: { p: ProbRow; inp: Input }) {
  const b = probB(p, inp as AppInput), name = (B_NAME[p.id] ?? p.title).replace('고콜레스테롤', '콜레스테롤');
  if (b.kind === 'estimate' && p.cmp) {
    const me = p.cmp.me, peer = p.cmp.peer, x = peer > 0 ? me / peer : 1;
    const [word, tone]: [string, Tone] = x >= 2 && me >= 5 ? ['높은 편', 'red'] : x >= 1.2 ? ['조금 높은 편', 'gray'] : x <= 0.8 ? ['낮은 편', 'green'] : ['또래와 비슷', 'gray'];
    const n = Math.round(me);
    return <Line first badge={<Badge t={word} tone={tone} />} name={name}
      stmt={<><span className="text-[13px] text-ink-soft">100명 중</span><Num n={n < 1 ? '1' : n} unit={n < 1 ? '명 미만' : '명쯤'} tone={tone === 'red' ? 'red' : 'gray'} /><Sub>또래 평균 {Math.max(0, Math.round(peer))}명</Sub></>}
      viz={<Bar100 me={me} tone={tone} label={`${name} 100명 중 ${n}명, 또래 평균 ${Math.round(peer)}명`} />}
      more={<p className="m-0">{p.id === 'chol' ? '콜레스테롤은 몸 정보만으로 알기 어려워요.\n그래서 순위 대신 100명 중 몇 명으로 보여요.\n혈액검사가 가장 정확해요.' : p.id === 'osteo' ? '골밀도 검사로 정확히 알 수 있어요.' : '이런 조건이면 100명 중 몇 명쯤인지예요.'}</p>} />;
  }
  if (b.kind === 'range') return <Line first badge={<Badge t="범위" tone="gray" />} name={name} stmt={<b className="text-[15px] font-semibold">{plain(b.big.replace('약 ', ''))}</b>} more={<p className="m-0">{b.note}</p>} />;
  if (b.kind === 'managed') return <Line first badge={<Badge t="관리 중" tone="gray" />} name={name} stmt={<b className="text-[17px] font-semibold">진단·관리 중</b>} more={<p className="m-0">{b.note}</p>} />;
  if (b.kind === 'na') return <Line first badge={<Badge t="대상 아님" tone="gray" />} name={name} stmt={<span className="text-[13px] text-ink-2">{p.id === 'osteo' ? '50세부터 계산해요' : '계산 대상이 아니에요'}</span>} />;
  if (b.kind === 'estimate') return null;
  const red = b.kind === 'criteria' || b.kind === 'excluded';
  return <Line first badge={<Badge t={red ? '확인 필요' : b.label} tone={red ? 'red' : 'gray'} />} name={name} stmt={<b className={cn('text-[17px] font-semibold', red && 'text-risk')}>{b.big}</b>} more={b.note ? <p className="m-0">{plain(b.note)}</p> : undefined} />;
}

/** 체형: BMI + 허리 */
function BodyLine({ inp, v, cat }: { inp: Input; v: string; cat: string }) {
  const bmi = Number(v), tone: Tone = bmi >= 25 || bmi < 18.5 ? 'red' : bmi >= 23 ? 'gray' : 'green';
  const waist = inp.waistCm == null ? '허리 모름' : inp.waistCm >= (inp.sex === 'F' ? 85 : 90) ? '복부비만' : '허리 정상';
  return <Line first badge={<Badge t={cat} tone={tone} />} name="체형" stmt={<><span className="text-[13px] text-ink-soft">BMI</span><Num n={v} unit="" tone={tone === 'red' ? 'red' : 'gray'} /><Sub>{waist}</Sub></>}
    more={<p className="m-0">{`키·몸무게로 계산한 체질량지수(BMI)예요.\n대한비만학회 기준으로 25부터 비만이에요.\n허리는 ${inp.sex === 'F' ? '85cm(33인치)' : '90cm(35인치)'}부터 복부비만이에요.`}</p>} />;
}

/** 생활·검진 체크 한 줄: 결론의 첫 토막은 굵게, 나머지는 '/ ' 뒤에 */
const MARK = { yes: [CheckCircle2, 'text-risk', '해당'], maybe: [CircleDot, 'text-ink-2', '확인'], no: [Circle, 'text-ash', '아님'], unknown: [CircleHelp, 'text-ink-soft', '모름'], info: [Dot, 'text-ink-soft', ''] } as const;
const CHECK = { yes: [CheckCircle2, 'text-ink', '권장'], maybe: [CircleDot, 'text-ink', '해당되면'], no: [Circle, 'text-ash', ''], unknown: [CircleHelp, 'text-ink-soft', ''], info: [Dot, 'text-ink-soft', ''] } as const;
const LV = { look: ['확인 필요', 'red'], note: ['참고', 'gray'], ok: ['해당 없음', 'green'] } as const;
const SHORT: Partial<Record<Extra['id'], string>> = { alcohol: '술', metsyn: '대사증후군', lifestyle: '생활습관', liver: '주량', dementia: '치매 위험', ckd: '콩팥', checkup: '검진·접종', body: '허리÷키', dm10: '10년 안에 당뇨', htn4: '4년 안에 고혈압', chd10: '10년 안에 심장병' };
function ExtraLine({ x0, first }: { x0: Extra; first: boolean }) {
  const x = polishExtra(x0), [word, tone] = LV[x.level], M = x.id === 'checkup' ? CHECK : MARK;
  // 결론은 문장 단위로만 나눈다: 앞 토막이 문장으로 끝나지 않으면 다음 토막과 이어 붙인다
  const segs = plain(x.head).split(/\s·\s|\n/).reduce<string[]>((a, t) => (a.length && !/[요다)]\.?$/.test(a[a.length - 1]) ? [...a.slice(0, -1), a[a.length - 1] + ' ' + t] : [...a, t]), []);
  const [head, ...rest] = segs;
  // 결론은 문장이라 이름 아래 한 줄 전체를 쓴다(좁은 칸에서 문장 중간이 끊기지 않게)
  const stmt = <><b className={cn('text-[15px] leading-snug font-semibold [text-wrap-style:balance]', x.level === 'look' && 'text-risk')}>{head}</b>{rest.length > 0 && <span className="text-[13px] leading-snug text-ink-2 [text-wrap-style:balance]">/ {rest.join(' · ')}</span>}</>;
  const more = (<>
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {x.items.map((it) => {
        const [Ic, c, w] = M[it.s];
        return (
          <li key={it.t} className="grid grid-cols-[16px_1fr_auto] items-start gap-2">
            <Ic className={cn('mt-1 size-4', c)} />
            <span className={it.s === 'no' ? 'text-ink-soft' : ''}>{plain(it.t)}{it.sub && <span className="block whitespace-pre-line text-caption text-ink-soft">{plain(it.sub)}</span>}</span>
            {w && <span className={cn('whitespace-nowrap text-[11px] font-semibold', c)}>{w}</span>}
          </li>
        );
      })}
    </ul>
    <p className="m-0 border-t border-[#e6e6e3] pt-2.5">{plain(x.action)}</p>
    <p className="m-0 text-caption text-mute">근거 · {x.source}</p>
  </>);
  return <LongLine first={first} badge={<Badge t={x.tag ?? word} tone={tone} />} name={SHORT[x.id] ?? x.name} stmt={stmt} more={more} />;
}
/** 결론이 문장인 줄: 뱃지 → 이름 · 자세히 → 결론(한 줄 전체) */
function LongLine({ first, badge, name, stmt, more }: { first?: boolean; badge: ReactNode; name: string; stmt: ReactNode; more: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('flex flex-col gap-1.5 py-4', !first && 'border-t border-hair')}>
      <div className="flex items-center gap-1.5">{badge}</div>
      <div className="flex items-center justify-between gap-3">
        <b className="whitespace-nowrap text-[17px] font-semibold">{name}</b>
        <More open={open} onClick={() => setOpen((x) => !x)} />
      </div>
      <div className="-mt-1 flex flex-col gap-0.5">{stmt}</div>
      {open && <div className="flex flex-col gap-2 rounded-[12px] bg-paper px-3.5 py-3 text-body-sm leading-[1.6] whitespace-pre-line text-[#333]">{more}</div>}
    </div>
  );
}
/** 아직 계산할 수 없는 앞으로 위험: 무엇을 넣으면 보이는지 */
function WantLine({ name, why, first, to }: { name: string; why: string; first?: boolean; to?: string }) {
  return (
    <div className={cn('flex items-center gap-3 py-4', !first && 'border-t border-hair')}>
      <span className="flex flex-1 flex-col gap-0.5"><b className="text-[15px] font-semibold">{name}</b><span className="text-[13px] text-ink-soft">{why}</span></span>
      {to && <a href={to} className="rounded-full bg-ink px-3 py-1 text-[13px] font-semibold text-white no-underline">넣기</a>}
    </div>
  );
}
type Want = { name: string; why: string; to?: string };

export function All() {
  const inp = useInput();
  const [sheet, setSheet] = useState(false);
  if (!inp) return <NeedInput />;
  const sc = suggestScenario(inp), r = viewResults(inp, sc), extras = runExtras(inp, drinkOf(inp), labOf(inp));
  const scope = scopeOf(inp), L = labOf(inp), g = groupLabel(inp);
  const ob = r.score.find((x) => x.id === 'obesity')!;
  const rows3 = [...overviewRows(inp)].sort((a, b) => sev(b) - sev(a));
  const others = r.prob.filter((p) => !TOP.includes(p.id));
  const future = extras.filter((x) => FUTURE.includes(x.id)), checks = extras.filter((x) => !FUTURE.includes(x.id));
  const has = (id: string) => future.some((x) => x.id === id);
  const wants: Want[] = inp.age >= 40 && inp.age <= 69 ? ([
    !has('htn4') && (inp.dx.htn ? { name: '4년 안에 고혈압', why: '이미 진단받아 계산하지 않아요' } : L.sbp == null ? { name: '4년 안에 고혈압', why: '검진 혈압을 넣으면 보여요', to: '#/labs' } : null),
    !has('chd10') && (L.sbp == null || L.tc == null ? { name: '10년 안에 심장병', why: '혈압·콜레스테롤을 넣으면 보여요', to: '#/labs' } : null),
    !has('dm10') && inp.dx.dm && { name: '10년 안에 당뇨', why: '이미 진단받아 계산하지 않아요' },
  ].filter(Boolean) as Want[]) : [];
  return (
    <AppShell tab="result">
      <Nav back="/result" title="모든 항목 보기" sub={r.who} />

      <section aria-label="지금 상태" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1"><h2 className="m-0 text-[19px] font-semibold">지금 상태</h2><span className="text-[12px] text-mute">같은 {g}과 견줘요</span></div>
        <div className="flex flex-col rounded-card bg-white px-5 py-1.5">
          {rows3.map((x, k) => <RowView key={x.id} r={x} inp={inp} first={k === 0} onWaist={() => setSheet(true)} nameW={88} />)}
          {others.map((p) => <div key={p.id} className="border-t border-hair"><ProbLine p={p} inp={inp} /></div>)}
          <div className="border-t border-hair"><BodyLine inp={inp} v={String(ob.v)} cat={ob.cat} /></div>
        </div>
      </section>

      {(future.length > 0 || wants.length > 0) && (
        <section aria-label="앞으로 몇 년 안에" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1"><h2 className="m-0 text-[19px] font-semibold">앞으로 몇 년 안에</h2><span className="text-[12px] text-mute">40~69세 한국인 연구</span></div>
          <div className="flex flex-col rounded-card bg-white px-5 py-1.5">
            {future.map((x, k) => <ExtraLine key={x.id} x0={x} first={k === 0} />)}
            {wants.map((w, k) => <WantLine key={w.name} {...w} first={!future.length && k === 0} />)}
          </div>
        </section>
      )}

      {checks.length > 0 && (
        <section aria-label="생활·검진 체크" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1"><h2 className="m-0 text-[19px] font-semibold">생활·검진 체크</h2><span className="text-[12px] text-mute">공식 기준에 해당하는지</span></div>
          <div className="flex flex-col rounded-card bg-white px-5 py-1.5">
            {checks.map((x, k) => <ExtraLine key={x.id} x0={x} first={k === 0} />)}
          </div>
        </section>
      )}

      <section aria-label="이번 결과에 넣은 정보" className="flex flex-col gap-2 rounded-card bg-white p-5">
        <b className="text-[15px] font-semibold">이번 결과에 넣은 정보</b>
        {/* 목록은 항목 사이에서만 줄이 바뀌게: 항목마다 nowrap */}
        <p className="m-0 text-[13px] leading-[1.6] text-ink-2">{[scope.body, scope.life + (scope.dx.length ? ` · 진단 ${scope.dx.join('·')}` : ''), scope.labs.length ? scope.labLine : '검진 숫자는 넣지 않음'].map((ln, k) => (
          <span key={k} className="block">{ln.split(' · ').map((t, j, a) => <span key={j}><span className="whitespace-nowrap">{t}{j < a.length - 1 ? ' ·' : ''}</span>{j < a.length - 1 ? ' ' : ''}</span>)}</span>
        ))}</p>
      </section>
      <Button asChild size="lg" className="w-full"><a href="#/labs">{scope.labs.length ? '검진 숫자 고치기' : '검진 숫자 넣기'}</a></Button>
      <a href="#/summary" className="flex items-center gap-3.5 rounded-card bg-white px-5 py-[18px] text-ink no-underline">
        <span className="flex flex-1 flex-col gap-0.5"><b className="text-[15px] font-semibold">진료용 요약 저장</b><span className="text-[13px] text-ink-soft">인쇄하거나 PDF로 저장</span></span>
        <ChevronRight className="size-5 text-mute" />
      </a>
      <p className="m-0 text-center text-[12px] leading-[1.6] text-mute">낮게 나와도 병이 없다는 뜻은 아니에요.<br />논문과 국가 통계를 바탕으로 한 예측이에요.</p>
      <WaistSheet open={sheet} onOpenChange={setSheet} inp={inp} />
    </AppShell>
  );
}
