// v2 검진 풀이: 결과지 숫자를 넣으면(#/labs) 하나씩 쉽게 풀어 준다(#/labs/result).
// 넣은 값은 1분 체크 결과에도 함께 반영된다(같은 draft.lab). 계산 없이 공식 기준 구간만 쓴다(lib/labZones.ts). 디자인: docs/DESIGN.md
import { ArrowRight, ChevronLeft, Camera, Trash2 } from 'lucide-react';
import { useStore, Nav, H1, Lead, Help, AppShell, go, optCls } from '../ui.tsx';
import { toInput } from '../state.ts';
import { LABS, LAB_GROUPS, labError, parseLab } from '../lib/labs.ts';
import { labCards, labSummary, type LabCard, type LabTone } from '../lib/labZones.ts';
import { LabField } from './Checkup.tsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { ZoneGauge, TONE_TEXT, TONE_BG } from '@/components/viz';
import { cn } from '@/lib/utils';

const UNIT: Record<string, string> = { bp: 'mmHg', egfr: 'mL/min', upro: '', hb: 'g/dL', ast: 'U/L', alt: 'U/L', ggt: 'U/L' };
const BADGE: Record<LabTone, BadgeVariant> = { ok: 'good', mid: 'warn', high: 'risk', urgent: 'risk' };

/** 결과지 숫자 넣기 */
export function LabsInput() {
  const { draft: d, setDraft } = useStore();
  const err = labError(d.lab ?? {}, 'life') ?? labError(d.lab ?? {}, 'checkup');
  const n = labCards(parseLab(d.lab ?? {}), d.sex).length;
  const ready = !!toInput(d);
  return (
    <AppShell tab="labs">
      <Nav back={ready ? '/result' : '/'} title="검진 풀이" sub="아는 숫자만 넣어도 돼요" />
      <H1 a="검진 결과지의 숫자를" b="넣어 주세요" />
      <Lead>{'숫자마다 무슨 뜻인지, 무엇을 하면 되는지 풀어 드려요.\n넣은 숫자는 이 기기 안에서만 써요.'}</Lead>
      {!d.sex && (
        <Card className="flex flex-col gap-3 p-4" role="group" aria-label="성별">
          <div className="text-body font-medium">성별 <span className="text-body-sm font-normal text-ink-soft">(혈색소·간 수치 기준이 달라요)</span></div>
          <div className="grid grid-cols-2 gap-1.5">
            {(['F', 'M'] as const).map((s) => <button key={s} type="button" className={optCls(false)} aria-pressed={false} onClick={() => setDraft((x) => ({ ...x, sex: s }))}>{s === 'F' ? '여성' : '남성'}</button>)}
          </div>
        </Card>
      )}
      {LAB_GROUPS.map(([w, t, h]) => (
        <Card key={w} className="px-4 pt-3 pb-2">
          <b className="block text-body font-medium">{t}</b>
          <span className="block pb-1 text-caption text-ink-soft">{h}</span>
          {LABS.filter((l) => l.group === w).map((l) => <LabField key={l.key} l={l} />)}
        </Card>
      ))}
      <div className="min-h-[18px] text-center text-body-sm font-medium text-risk" role="alert">{err ?? ''}</div>
      <Button size="lg" className="w-full" aria-disabled={!!err || n === 0} onClick={() => { if (!err && n) go('/labs/result'); }}>{n ? <>{n}개 풀어 보기 <ArrowRight /></> : '숫자를 하나 이상 넣어 주세요'}</Button>
      {n > 0 && <Button variant="ghost" size="sm" className="self-center text-ink-soft" onClick={() => setDraft((x) => ({ ...x, lab: {} }))}><Trash2 /> 넣은 숫자 모두 지우기</Button>}
      <Help className="flex items-center gap-1.5"><Camera className="size-4 shrink-0" /> 결과지 사진만 찍으면 숫자가 채워지는 기능을 준비하고 있어요.</Help>
    </AppShell>
  );
}

/** 구간 게이지: 같은 폭 구간, 내 구간 색으로 내 자리까지 차오른다 */
export function ZoneBar({ c, delay }: { c: LabCard; delay: number }) {
  const n = c.zones.length;
  return <ZoneGauge label={`${c.title} 구간`} pos={c.pos} tone={c.tone} delay={delay} at={c.at} labels={c.zones.map((z) => z.name)} ticks={Array.from({ length: n - 1 }, (_, k) => ({ at: (k + 1) / n }))}
    segs={c.zones.map((z, k) => ({ from: k / n, to: (k + 1) / n, tone: z.tone }))} />;
}

/** 숫자 하나 카드: 항목·값 → 구간 막대 → 구간 이름(색 하나) + 뜻 → 할 일 */
export function LabCardView({ c, k }: { c: LabCard; k: number }) {
  return (
    <Card aria-label={c.title} className="flex flex-col gap-4 p-5 animate-rise" style={{ animationDelay: `${k * 90}ms` }}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5"><b className="text-[18px] font-semibold">{c.title}</b><span className="text-body-sm text-ink-soft">{c.easy}</span></div>
        <span className="whitespace-nowrap"><b className="text-[30px] font-semibold tabular-nums">{c.value}</b> <small className="text-body-sm text-ink-soft">{UNIT[c.key] ?? 'mg/dL'}</small></span>
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

/** 숫자 하나하나 풀이 */
export function LabsResult() {
  const { draft: d } = useStore();
  const cs = labCards(parseLab(d.lab ?? {}), d.sex);
  if (!cs.length) return (
    <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center gap-4 px-5 text-center">
      <h1 className="text-heading-sm text-ink-soft">아직 넣은 숫자가<b className="block text-ink">없어요</b></h1>
      <Button asChild size="lg" className="mt-4"><a href="#/labs">결과지 숫자 넣기</a></Button>
    </div>
  );
  const s = labSummary(cs), ready = !!toInput(d);
  const head = s.tone === 'urgent' ? 'bg-risk text-white' : s.tone === 'high' ? 'bg-white border-t-[6px] border-risk-dot' : s.tone === 'ok' ? 'bg-good-bg' : 'bg-warn-bg';
  return (
    <AppShell tab="labs">
      <Nav back="/labs" title="검진 풀이" sub={`넣은 숫자 ${cs.length}개`} />
      <section className={cn('flex flex-col gap-3 rounded-card p-5 shadow-card', head)}>
        <h2 className={cn('text-heading-sm', s.tone === 'urgent' ? 'text-white' : s.tone === 'high' ? 'text-risk' : s.tone === 'ok' ? 'text-good' : 'text-warn')}>{s.title}</h2>
        <div className="flex flex-wrap gap-1.5">
          {([['urgent', '지금 확인', 'risk'], ['high', '확인 필요', 'risk'], ['mid', '조금 주의', 'warn'], ['ok', '괜찮음', 'good']] as const).filter(([k]) => s.count[k]).map(([k, t, v]) => (
            <Badge key={k} variant={v} className="bg-white">{t} {s.count[k]}</Badge>
          ))}
        </div>
      </section>
      {s.order.map((c, k) => <LabCardView key={c.key} c={c} k={k} />)}
      {ready
        ? <Button asChild size="lg" className="w-full"><a href="#/result">이 숫자를 반영한 내 결과 보기 <ArrowRight /></a></Button>
        : <Button asChild size="lg" className="w-full"><a href="#/info">1분 체크도 해보기 <ArrowRight /></a></Button>}
      {!ready && <Help className="-mt-2 text-center">넣은 숫자가 1분 체크 결과에도 함께 반영돼요.</Help>}
      <Button asChild variant="outline" size="lg" className="w-full"><a href="#/labs"><ChevronLeft /> 숫자 고치기·더 넣기</a></Button>
      <Help>대한고혈압학회·대한당뇨병학회·한국지질·동맥경화학회 진료지침과 국가건강검진 판정 기준으로 나눈 구간이에요. 한 번 잰 값이라 진단이 아니며, 실제 판정은 의사가 해요.</Help>
    </AppShell>
  );
}
