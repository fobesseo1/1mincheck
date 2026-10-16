// 검진 풀이: 결과지 숫자를 넣으면(#/labs) 하나씩 쉽게 풀어 준다(#/labs/result).
// 넣은 값은 1분 체크 결과에도 함께 반영된다(같은 draft.lab). 계산 없이 공식 기준 구간만 쓴다(lib/labZones.ts).
// 2026-10-15 캔버스 'LabsInput'·'LabsResult': 결과 화면과 같은 줄 모양(뱃지 → 이름·수치 → 구간 막대 → 자세히). 주의는 회색. 디자인: docs/DESIGN.md
import { useState } from 'react';
import { ArrowRight, Camera, Trash2 } from 'lucide-react';
import { useStore, Nav, H1, Help, AppShell, go } from '../ui.tsx';
import { toInput } from '../state.ts';
import { LABS, LAB_GROUPS, labError, parseLab } from '../lib/labs.ts';
import { labCards, labSummary, type LabCard, type LabTone } from '../lib/labZones.ts';
import { LabField } from './Checkup.tsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoneGauge, TONE_TEXT, TONE_BG } from '@/components/viz';
import { Badge, More, nb, type Tone } from '@/components/result-v4';
import { cn } from '@/lib/utils';

const UNIT: Record<string, string> = { bp: 'mmHg', egfr: 'mL/분', upro: '', hb: 'g/dL', ast: 'U/L', alt: 'U/L', ggt: 'U/L' };
const TONE: Record<LabTone, Tone> = { ok: 'green', mid: 'gray', high: 'red', urgent: 'red' };
const SEG: Record<LabTone, string> = { ok: 'bg-good-bg', mid: 'bg-[#d6d6d2]', high: 'bg-[#ffc9d3]', urgent: 'bg-[#ffc9d3]' };
const DOT: Record<Tone, string> = { red: 'bg-risk ring-risk', green: 'bg-good ring-good', gray: 'bg-ink ring-ink' };
const TXT: Record<Tone, string> = { red: 'text-risk', green: 'text-good', gray: 'text-ink' };
/** 'eGFR (신사구체여과율)' → 이름 'eGFR' + 작은 설명 */
const nameOf = (t: string) => { if (/^HDL/.test(t)) return ['HDL', '좋은 콜레스테롤']; if (/^LDL/.test(t)) return ['LDL', '나쁜 콜레스테롤']; const m = /^(.*?) \((.*)\)$/.exec(t); return m ? [m[1], m[2]] : [t, '']; };
/** 구간 막대 아래 이름은 칸이 좁아 짧게 (뱃지에는 원래 이름) */
const ZSHORT: Record<string, string> = { '고혈압 전단계': '전단계', '고혈압 기준': '고혈압', '당뇨 전 단계': '전 단계', '양성(1+ 이상)': '양성', '약양성(±)': '±' };
const zs = (t: string) => ZSHORT[t] ?? t;

/** 결과지 숫자 넣기 */
export function LabsInput() {
  const { draft: d, setDraft } = useStore();
  const err = labError(d.lab ?? {}, 'life') ?? labError(d.lab ?? {}, 'checkup');
  const n = labCards(parseLab(d.lab ?? {}), d.sex).length;
  const ready = !!toInput(d);
  return (
    <AppShell tab="labs">
      <Nav back={ready ? '/result' : '/'} title="검진 풀이" />
      <H1 a="결과지의 숫자를" b="넣어 주세요" />
      <Help className="-mt-2 text-[13px]">{'아는 것만 넣어도 돼요.\n숫자 하나씩 쉽게 풀어 드려요.'}</Help>
      {!d.sex && (
        <Card className="flex flex-col gap-3 p-[18px]" role="group" aria-label="성별">
          <div className="flex items-baseline justify-between gap-2"><b className="text-[15px] font-semibold">성별</b><span className="text-[12px] text-mute">혈색소·간 수치 기준이 달라요</span></div>
          <div className="grid grid-cols-2 gap-1 rounded-[12px] bg-[#f0f0ed] p-1">
            {(['F', 'M'] as const).map((s) => <button key={s} type="button" className="h-11 cursor-pointer rounded-[9px] text-body text-ink-soft" onClick={() => setDraft((x) => ({ ...x, sex: s }))}>{s === 'F' ? '여성' : '남성'}</button>)}
          </div>
        </Card>
      )}
      {LAB_GROUPS.map(([w, t, h]) => (
        <Card key={w} className="px-[18px] py-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 pt-3 pb-1"><b className="text-[15px] font-semibold">{t}</b><span className="ml-auto text-right text-[12px] text-mute">{h}</span></div>
          {LABS.filter((l) => l.group === w).map((l) => <LabField key={l.key} l={l} />)}
        </Card>
      ))}
      <div className="min-h-[18px] text-center text-body-sm font-medium text-risk" role="alert">{err ?? ''}</div>
      <Button size="lg" className="w-full" aria-disabled={!!err || n === 0} onClick={() => { if (!err && n) go('/labs/result'); }}>{n ? <>숫자 {n}개 풀어 보기 <ArrowRight /></> : '숫자를 하나 이상 넣어 주세요'}</Button>
      {n > 0 && <Button variant="ghost" size="sm" className="self-center text-ink-soft" onClick={() => setDraft((x) => ({ ...x, lab: {} }))}><Trash2 /> 넣은 숫자 모두 지우기</Button>}
      <Help className="flex items-center gap-1.5"><Camera className="size-4 shrink-0" /> 결과지 사진만 찍으면 숫자가 채워지는 기능을 준비하고 있어요.</Help>
    </AppShell>
  );
}

/** 구간 게이지: 같은 폭 구간, 내 구간 색으로 내 자리까지 차오른다 (예전 랜딩 장면용으로 남김) */
export function ZoneBar({ c, delay }: { c: LabCard; delay: number }) {
  const n = c.zones.length;
  return <ZoneGauge label={`${c.title} 구간`} pos={c.pos} tone={c.tone} delay={delay} at={c.at} labels={c.zones.map((z) => z.name)} ticks={Array.from({ length: n - 1 }, (_, k) => ({ at: (k + 1) / n }))}
    segs={c.zones.map((z, k) => ({ from: k / n, to: (k + 1) / n, tone: z.tone }))} />;
}
/** 숫자 하나 카드 (예전 랜딩 장면용으로 남김) */
export function LabCardView({ c, k }: { c: LabCard; k: number }) {
  return (
    <Card aria-label={c.title} className="flex flex-col gap-4 p-5 animate-rise" style={{ animationDelay: `${k * 90}ms` }}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5"><b className="text-[18px] font-semibold">{c.title}</b><span className="text-body-sm text-ink-soft">{c.easy}</span></div>
        <span className="whitespace-nowrap"><b className="text-[30px] font-semibold tabular-nums">{c.value}</b><small className="text-body-sm text-ink-soft">{UNIT[c.key] ?? 'mg/dL'}</small></span>
      </div>
      <ZoneBar c={c} delay={250 + k * 90} />
      <div className={cn('flex flex-col gap-2 rounded-btn px-4 py-3.5', TONE_BG[c.tone])}>
        <b className={cn('text-body font-semibold', TONE_TEXT[c.tone])}>{c.zone}</b>
        <span className="whitespace-pre-line text-body">{c.mean}</span>
        <span className={cn('flex items-start gap-1.5 text-body font-medium', c.tone === 'urgent' ? 'text-risk' : 'text-ink')}><ArrowRight className="mt-1 size-4 shrink-0" /><span className="whitespace-pre-line">{c.todo}</span></span>
        {c.note && <span className="text-body-sm text-ink-soft">{c.note}</span>}
      </div>
    </Card>
  );
}

/** 숫자 한 줄: 뱃지 → 이름 · 수치(단위 붙여서) · 자세히 → 구간 막대 → 펼친 뜻·할 일 */
export function LabRow({ c, first }: { c: LabCard; first: boolean }) {
  const [open, setOpen] = useState(false);
  const tone = TONE[c.tone], n = c.zones.length, [name, sub] = nameOf(c.title), unit = UNIT[c.key] ?? 'mg/dL';
  const isWord = c.key === 'upro';
  return (
    <div className={cn('flex flex-col gap-2 py-4', !first && 'border-t border-hair')}>
      <span className="self-start"><Badge t={c.zone} tone={tone} /></span>
      <div className="flex items-center gap-2">
        {/* 이름 · 수치는 한 덩어리: 자리가 모자라면(글자를 크게 쓰는 사람) 수치가 이름 아래로. '132/84mmHg'는 붙인 채로 */}
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <b className="flex w-[104px] flex-none flex-col text-[17px] leading-tight font-semibold whitespace-nowrap">{name}{sub && <span className="text-[12px] font-normal text-mute">{sub}</span>}</b>
          <span className="flex flex-1 items-baseline">
            <b className={cn('leading-none font-semibold whitespace-nowrap tabular-nums', isWord ? 'text-[17px]' : 'text-[24px]', tone !== 'gray' && TXT[tone])}>{c.value}{unit && !isWord && <span className="text-[12px] font-normal text-ink-soft">{unit}</span>}</b>
          </span>
        </span>
        <More open={open} onClick={() => setOpen((x) => !x)} />
      </div>
      {n > 1 && (
        <div role="img" aria-label={`${c.title} 구간: ${c.zone}`} className="flex flex-col gap-1">
          <div className="relative grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {c.zones.map((z, k) => <i key={z.name} className={cn('h-1.5 rounded-full', k === c.at ? SEG[c.tone] : 'bg-track')} />)}
            <span className={cn('absolute top-1/2 box-border size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white ring-1', DOT[tone])} style={{ left: `${Math.min(97, Math.max(3, c.pos * 100))}%` }} />
          </div>
          <div className="grid gap-[3px] text-center text-[11px] text-[#9a9a96]" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {c.zones.map((z, k) => k === c.at ? <b key={z.name} className={cn('font-semibold', TXT[tone])}>{zs(z.name)}</b> : <span key={z.name}>{zs(z.name)}</span>)}
          </div>
        </div>
      )}
      {open && (
        <div className="flex flex-col gap-1.5 rounded-[12px] bg-paper px-3.5 py-3 text-body-sm leading-[1.6] text-[#333]">
          <p className="m-0 whitespace-pre-line">{nb(c.mean)}</p>
          <p className="m-0 whitespace-pre-line font-medium text-ink">{nb(c.todo)}</p>
          {c.note && <p className="m-0 text-[12px] text-mute">{nb(c.note)}</p>}
          <p className="m-0 text-[12px] text-mute">{c.easy}</p>
        </div>
      )}
    </div>
  );
}

const TAG: Record<LabTone, [string, string]> = { urgent: ['지금 확인', 'bg-risk'], high: ['병원 확인', 'bg-risk'], mid: ['조금 주의', 'bg-ink-2'], ok: ['괜찮아요', 'bg-good'] };
/** 숫자 하나하나 풀이 */
export function LabsResult() {
  const { draft: d } = useStore();
  const cs = labCards(parseLab(d.lab ?? {}), d.sex);
  if (!cs.length) return (
    <AppShell tab="labs">
      <Nav back="/labs" title="검진 풀이" />
      <section className="flex flex-col items-center gap-3 rounded-card bg-white px-6 py-8 text-center">
        <b className="text-[19px] font-semibold">아직 넣은 숫자가 없어요</b>
        <p className="m-0 text-body-sm text-ink-soft">결과지의 숫자를 넣으면 하나씩 풀어 드려요.</p>
      </section>
      <Button asChild size="lg" className="w-full"><a href="#/labs">결과지 숫자 넣기</a></Button>
    </AppShell>
  );
  const s = labSummary(cs), ready = !!toInput(d), [tag, tagBg] = TAG[s.tone];
  return (
    <AppShell tab="labs">
      <Nav back="/labs" title="검진 풀이" sub={`넣은 숫자 ${cs.length}개`} />
      <section aria-label="지금 할 일" className="flex flex-col rounded-card bg-ink px-5 pt-[18px] pb-4 text-white">
        <div className="flex items-center justify-between pb-2"><h1 className="m-0 text-[15px] font-semibold text-white">{s.tone === 'ok' ? '이번 결과' : '지금 당장 할 일'}</h1><span className={cn('rounded-full px-2.5 py-[3px] text-[12px] font-semibold text-white', tagBg)}>{tag}</span></div>
        <b className="border-t border-white/[.12] pt-3.5 text-[17px] leading-[1.4] font-semibold">{s.title}</b>
      </section>
      <div className="flex flex-wrap gap-1.5 px-1">
        {([['urgent', '지금 확인', 'bg-risk-bg text-risk'], ['high', '확인 필요', 'bg-risk-bg text-risk'], ['mid', '조금 주의', 'bg-hair text-ink-2'], ['ok', '괜찮음', 'bg-good-bg text-good']] as const).filter(([k]) => s.count[k]).map(([k, t, c]) => (
          <span key={k} className={cn('rounded-full px-2.5 py-1 text-[12px] font-semibold', c)}>{t} {s.count[k]}</span>
        ))}
      </div>
      <section aria-label="숫자 풀이" className="flex flex-col rounded-card bg-white px-5 py-1.5">
        {s.order.map((c, k) => <LabRow key={c.key} c={c} first={k === 0} />)}
      </section>
      {ready
        ? <Button asChild size="lg" className="w-full"><a href="#/result">이 숫자를 넣은 내 결과 보기 <ArrowRight /></a></Button>
        : <Button asChild size="lg" className="w-full"><a href="#/info">1분 체크도 해보기 <ArrowRight /></a></Button>}
      {!ready && <Help className="-mt-2 text-center">넣은 숫자가 1분 체크 결과에도 함께 반영돼요.</Help>}
      <Button asChild variant="outline" size="lg" className="w-full"><a href="#/labs">숫자 고치기</a></Button>
      <p className="m-0 text-center text-[12px] leading-[1.6] text-mute">각 학회 진료지침과 국가건강검진 판정 기준으로 나눈 구간이에요.<br />한 번 잰 값이라 진단이 아니며, 실제 판정은 의사가 해요.</p>
    </AppShell>
  );
}
