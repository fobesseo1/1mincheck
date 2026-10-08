// 항목 상세 (#/detail/:id): 핵심 숫자 · 또래 · 점수 내역 · 관리하면 · 다음에 할 일 · 근거. 디자인: docs/DESIGN.md
import type { ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, ChevronDown } from 'lucide-react';
import { useStore, Nav, People, Gauge, Crisis, AppShell, Help } from '../ui.tsx';
import { suggestScenario } from '../state.ts';
import { viewDetail, f1, pctText, statusText, flagOf, severeBp, labOf, INK, LOOK, type ViewResult } from '../lib/view.ts';
import { DevNote } from './DevNote.tsx';
import { freqOf, peerLine } from '../lib/b.ts';
import { NAMES, TITLE, TOOL, BADGE, WHAT, WHY, HOW, NEXT, NEXT_SPECIAL, SRC, KNHANES, MODULE_OF, MEANING, DISCLAIMER, type ItemId } from '../lib/content.ts';
import { useInput, NeedInput } from './Results.tsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const MOD_ROUTE = { sleep: '/sleep', mind: '/mind', gerd: '/digest', diet: '/diet' };
const SCALE: Partial<Record<ItemId, [number, number, string]>> = {
  obesity: [15, 35, 'BMI'], isi: [0, 28, 'ISI / 28점'], diet: [0, 100, '참고 지표 / 100점'], osa: [0, 8, 'STOP-Bang / 8점'], gad: [0, 6, 'GAD-2 / 6점'], gerd: [0, 18, 'GerdQ / 18점'],
};
const Box = ({ children, className }: { children: ReactNode; className?: string }) => <Card className={cn('flex flex-col gap-2.5 p-5', className)}>{children}</Card>;
const Title = ({ children }: { children: ReactNode }) => <b className="text-body font-medium">{children}</b>;

export function Detail({ id }: { id: ItemId }) {
  const { setDraft } = useStore();
  const inp = useInput();
  if (!inp) return <NeedInput />;
  if (!NAMES[id]) return <NeedInput />;
  const d = viewDetail(id, inp, suggestScenario(inp)), r = d.r;
  const flag = flagOf(r, inp), col = flag ? LOOK : INK;
  const sc: [number, number, string] | undefined = id === 'dep' ? (inp.mind?.phq.length === 9 ? [0, 27, 'PHQ-9 / 27점'] : [0, 6, 'PHQ-2 / 6점']) : SCALE[id];
  const mod = MODULE_OF[id];
  const sources = [...SRC[id], KNHANES];
  const hi = d.cmp?.high && d.cmp.me >= 1;
  return (
    <AppShell>
      <Nav back="/result" title={TITLE[id]} sub={TOOL[id]} />
      {d.crisis && <Crisis />}

      {/* 핵심 숫자 */}
      <Card className="flex flex-col items-center gap-1.5 px-5 pt-6 pb-6 text-center">
        <div className="flex flex-wrap justify-center gap-1.5">
          <Badge variant="ink">{BADGE[r.type]} · {r.type}</Badge>
          {d.ratioTag && <Badge variant={d.cmp?.label === '낮음' ? 'good' : d.cmp?.high || r.status === 'excluded' || r.status === 'criteria' ? 'risk' : 'muted'}>{d.ratioTag}</Badge>}
        </div>
        {r.status === 'ok' && d.isProb && r.value != null && (<>
          {MEANING[id] && <div className="mt-2.5 text-body font-medium">{MEANING[id]}</div>}
          <div className="mt-1.5 text-body-sm text-ink-soft">현재 가능성 추정</div>
          <div><span className={cn('font-medium text-ink', r.value < 0.1 ? 'text-[40px]' : 'text-[72px] leading-none')}>{pctText(r.value)}</span><b className="text-subheading font-medium">%</b></div>
          <div className="text-body">비슷한 조건의 <b className="text-brand">{freqOf(r.value)}</b> 수준이에요{id === 'dm' && !r.flags?.includes('GLU_MODEL') ? ' · 상대 오차 ±약 25%' : ''}</div>
          {d.cmp && <div className={cn('text-body-sm font-medium', hi ? 'text-risk' : 'text-ink-soft')}>{peerLine(d.cmp.me, d.cmp.peer, (id === 'dm' ? '약 ' : '') + f1(d.cmp.peer))}</div>}
          {d.cmp && <div className="text-caption text-ink-soft">또래 평균 = {d.cmp.who}</div>}
          {d.rank != null && <div className="mt-1 rounded-btn bg-blush px-3.5 py-2 text-body-sm">같은 나이(±5세)·성별 100명을 줄 세우면 <b className="text-brand">낮은 쪽에서 약 {d.rank}번째</b>예요</div>}
          <div className="mt-1.5 w-full"><DevNote id={id} raw={(r as ViewResult).raw} value={r.value} rawPeer={(r as ViewResult).rawPeer} peer={d.cmp?.peer} sex={inp.sex} age={inp.age} /></div>
          {d.cmp?.action && <div className="mt-1.5 flex items-start gap-1.5 rounded-btn bg-risk-bg px-3.5 py-2.5 text-left text-body-sm font-medium text-risk"><ArrowRight className="mt-0.5 size-4 shrink-0" />{d.cmp.action}</div>}
          <div className="mt-3.5 w-full"><People cells={d.people} /></div>
          <div className="mt-2 flex flex-wrap justify-center gap-3.5 text-caption">
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-brand" />{d.removed ? `관리해도 남는 ${d.m}명` : `100명 중 ${d.n}명`}</span>
            {d.removed > 0 && <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-good-dot" />{d.scenarioText}이면 빠지는 {d.removed}명</span>}
          </div>
        </>)}
        {r.status === 'ok' && d.isProb && r.value == null && r.range && (<>
          <div className="mt-2.5 text-body font-medium">나와 같은 조건인 사람 100명 중</div>
          <div className="text-[64px] leading-none font-medium">{Math.round(r.range[0])}–{Math.round(r.range[1])}<small className="text-subheading">명</small></div>
          <div className="text-body-sm text-ink-soft">허리둘레·운동 등 ‘모름’이 있어 범위로 보여드려요. 입력하면 하나의 값으로 좁혀져요.</div>
          <Button asChild variant="outline" className="mt-2.5"><a href="#/info">기본정보 고치기</a></Button>
        </>)}
        {r.status === 'ok' && !d.isProb && sc && r.value != null && (<>
          <div className="mt-3.5"><Gauge f={(r.value - sc[0]) / (sc[1] - sc[0])} v={id === 'obesity' ? f1(r.value) : String(r.value)} col={col} w={200} /></div>
          <div className="text-body-sm text-ink-soft">{sc[2]}</div>
          <div className="text-subheading font-medium" style={{ color: col }}>{r.category}</div>
        </>)}
        {r.status === 'ok' && !d.isProb && r.value == null && <div className="mt-3.5 text-heading-sm font-medium">{r.category}</div>}
        {r.status === 'managed' && <><div className="mt-3.5 text-heading-sm font-medium">진단받아 관리 중</div><p className="text-body-sm">{d.statusNote}</p></>}
        {r.status === 'criteria' && <><div className="mt-3.5 text-subheading font-medium text-risk">{({ dm: '당뇨 기준에 해당하는 수치, 확인 필요', chol: '총콜레스테롤이 기준 이상이에요' } as Partial<Record<ItemId, string>>)[id] ?? '측정 혈압이 고혈압 기준이에요'}</div><p className="text-body-sm">{d.statusNote}</p></>}
        {(r.status as string) === 'measured' && <><div className="mt-3.5 text-subheading font-medium">검진 수치를 반영했어요</div><p className="text-body-sm">{d.statusNote}</p></>}
        {d.screen && <div className="mt-2 rounded-btn bg-sand-soft px-3.5 py-2.5 text-body-sm text-ink-soft">{d.screen}</div>}
        {d.measured && <div className="mt-2 rounded-btn bg-blush px-3.5 py-2.5 text-body-sm font-medium">{d.measured}</div>}
        {r.status === 'excluded' && <><div className="mt-3.5 text-subheading font-medium text-risk">{id === 'nafld' ? '술 때문에 간 검사가 필요해요' : statusText[r.status]}</div><p className="text-body-sm text-risk">{d.statusNote}</p></>}
        {r.status === 'na' && <><div className="mt-3.5 text-subheading font-medium">{statusText[r.status]}</div><p className="text-body-sm">{d.statusNote}</p></>}
        {r.status === 'needs_input' && mod && <><div className="mt-3.5 text-subheading font-medium">답하면 볼 수 있어요</div>
          <Button asChild className="mt-2.5"><a href={'#' + MOD_ROUTE[mod]} onClick={() => setDraft((x) => ({ ...x, modules: { ...x.modules, [mod]: true } }))}>질문 답하기</a></Button></>}
        <p className="mt-2.5 text-body-sm">{WHAT[id]}</p>
      </Card>

      {WHY[id] && <Box><Title>왜 중요할까요</Title><p className="text-body-sm">{WHY[id]}</p><Help className="mx-0">대한골대사학회·국민건강보험공단 팩트시트 2023 (50세 이상, 2002–2022 건강보험 자료)</Help></Box>}

      {/* 동년배 */}
      {r.peer != null && r.status === 'ok' && (
        <Box>
          <div className="flex items-baseline justify-between"><Title>{d.bands.length ? '또래 곡선' : '또래와 비교'}</Title><span className="text-caption text-ink-soft">{d.group}</span></div>
          {d.bands.length > 0 ? (<>
            <div className="flex h-[150px] items-end gap-2 border-b border-sand">
              {(() => { const top = Math.max(30, Math.ceil(Math.max(...d.bands.map((b) => b.v), r.value ?? 0) * 1.1 / 10) * 10); return d.bands.map((b) => (
                <div key={b.l} className={cn('relative flex h-full flex-1 flex-col justify-end rounded-t-lg', b.mine && 'bg-blush')}>
                  <div className={cn('rounded-t-md', b.mine ? 'bg-brand' : 'bg-sand')} style={{ height: `${(b.v / top) * 100}%` }} />
                  {b.mine && r.value != null && <i className="absolute left-1/2 size-4 -translate-x-1/2 translate-y-1/2 rounded-full border-[3px] border-white bg-ink shadow-float" style={{ bottom: `${(r.value / top) * 100}%` }} />}
                </div>)); })()}
            </div>
            <div className="flex gap-2">{d.bands.map((b) => <div key={b.l} className="flex-1 text-center text-[11px]"><b className={b.mine ? 'font-medium text-brand' : 'font-normal'}>{f1(b.v)}</b><div className="text-ink-soft">{b.l}</div></div>)}</div>
          </>) : (
            <div className="flex flex-col gap-2.5">
              {([['나', r.unit === '%' ? r.value : null, 'bg-brand'], [r.unit === '%' ? '또래 평균' : '또래 중 기준 이상', d.cmp?.peer ?? r.peer, 'bg-sand']] as const).map(([k, v, c]) => (
                <div key={k}><div className="flex justify-between text-body-sm"><span>{k}</span><b>{v == null ? (r.unit === '%' ? '–' : `${r.score ?? r.value}점`) : `${f1(v)}%`}</b></div>
                  {v != null && <div className="mt-1.5 h-2 rounded-full bg-sand-soft"><i className={cn('block h-full rounded-full', c)} style={{ width: `${Math.min(100, (v / Math.max(30, r.peer! * 1.3, (r.value ?? 0) * 1.3)) * 100)}%` }} /></div>}</div>
              ))}
            </div>
          )}
          <Help className="mx-0">{id === 'dm' ? '막대는 각 연령대에서 진단받지 않은 사람 중 당뇨인 비율(유병률에서 이미 진단받은 사람을 뺀 값), 점은 내 값이에요.' : r.notes?.find((n) => n.includes('동년배'))?.replace('동년배', '또래') ?? (id === 'isi' ? '또래 값은 ISI 10점 이상 비율이에요.' : id === 'dep' ? '또래 값은 같은 나이·성별에서 PHQ-9 10점 이상인 비율이에요(2024).' : id === 'osa' ? '또래 값은 40–69세 수면다원검사 기준 수면호흡장애(AHI 5 이상) 비율이에요(2004).' : id === 'nafld' ? '또래 값은 간지방지수 기준 성인 전체 비율이에요.' : '같은 나이대·성별 한국인 통계예요.')}</Help>
        </Box>
      )}

      {/* 당뇨 점수 내역 */}
      {d.parts.length > 0 && (
        <Box>
          <div className="flex items-baseline justify-between"><Title>점수는 이렇게 나왔어요</Title><span className="text-caption text-ink-soft">한국형 당뇨 선별점수</span></div>
          <div><b className="text-[40px] font-medium">{r.score}</b> <span className="text-body-sm text-ink-soft">/ 11점</span></div>
          {d.parts.map((p) => <div key={p.k} className="flex min-h-[34px] items-center justify-between border-t border-sand-soft text-body-sm"><span>{p.k}</span><b className={p.v > 0 ? 'text-brand' : 'font-normal text-ink-soft'}>{p.v > 0 ? '+' + p.v : '0'}</b></div>)}
          <div className="rounded-btn bg-sand-soft px-3.5 py-3 text-body-sm">{(r.score ?? 0) >= 5 ? '5점부터는 검진에서 혈당을 한 번 확인해 보길 권하는 구간이에요.' : '선별 기준(5점)보다 낮아요.'}</div>
        </Box>
      )}

      {/* 관리하면 */}
      {d.afterV != null && r.value != null && d.afterV < r.value && (
        <div className="flex flex-col gap-3.5 rounded-card bg-ink p-5 text-white">
          <div className="flex items-center justify-between gap-2"><b className="text-body font-medium">관리하면 이만큼 줄어요</b><Badge variant="brand">{d.scenarioText}</Badge></div>
          <div className="flex items-center">
            <div className="flex-1 text-center"><div className="text-[11px] text-white/70">지금</div><b className="text-[40px] font-medium">{f1(r.value)}</b><small>{d.isProb ? '%' : ''}</small></div>
            <ArrowRight className="size-5 text-brand-tint" />
            <div className="flex-1 text-center"><div className="text-[11px] text-white/70">바꾼 후</div><b className="text-[40px] font-medium text-good-dot">{f1(d.afterV)}</b><small className="text-good-dot">{d.isProb ? '%' : ''}</small></div>
          </div>
          <Button asChild variant="white"><a href="#/whatif">다른 습관도 바꿔보기</a></Button>
        </div>
      )}

      {/* 엔진 메모 */}
      {(() => { const extra = (r.notes ?? []).filter((n) => !n.includes('동년배') && !n.includes('상대 오차') && !(r.status !== 'ok' && n === r.notes?.[0]));
        return extra.length > 0 && <div className="flex flex-col gap-1 px-1">{extra.map((n) => <span key={n} className="text-caption text-ink-soft">· {n}</span>)}</div>; })()}

      <Box>
        <Title>다음에 할 일</Title>
        {(NEXT_SPECIAL[id === 'htn' && r.status === 'criteria' && severeBp(inp) ? 'htn:severe' : id === 'dm' && (labOf(inp).glu ?? 0) >= 250 ? 'dm:veryhigh' : `${id}:${r.status}`] ?? NEXT[id]).map((t, k) => (
          <div key={t.t} className="flex gap-3.5 border-t border-sand-soft py-3">
            <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[10px] bg-blush text-body-sm font-medium text-brand">{k + 1}</span>
            <div><b className="text-body font-medium">{t.t}</b><div className="mt-0.5 text-body-sm text-ink-soft">{t.d}</div></div>
          </div>
        ))}
        {id === 'diet' && (r.flags?.length ?? 0) > 0 && <div className="text-body-sm text-risk">지금 보완하면 좋은 점: {r.flags!.join(', ')}</div>}
      </Box>

      <Box>
        <Title>근거</Title>
        {sources.map((s) => (
          <a key={s.u} href={s.u} target="_blank" rel="noreferrer" className="flex min-h-14 items-center justify-between gap-2.5 border-t border-sand-soft text-ink no-underline">
            <span><b className="text-body-sm font-medium">{s.t}</b><div className="text-caption text-ink-soft">{s.d}</div></span><ArrowUpRight className="size-5 shrink-0 text-brand" />
          </a>
        ))}
        <details className="group rounded-btn bg-sand-soft px-4 py-3.5">
          <summary className="flex items-center justify-between text-body-sm font-medium">계산 방법 보기 <ChevronDown className="size-5 text-brand transition-transform group-open:rotate-180" /></summary>
          <p className="mt-3 text-body-sm">{HOW[id]} 이 계산은 기기 안에서만 해요.</p>
        </details>
      </Box>
      <Help>{DISCLAIMER}</Help>
    </AppShell>
  );
}
