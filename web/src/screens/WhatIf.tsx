// 바꿔보기 (#/whatif, 모든 항목 보기에서): 몸무게·허리·음주·운동·흡연을 바꾸면 '지금 가능성 추정'이 어떻게 달라지는지. 디자인: docs/DESIGN.md
import { useState } from 'react';
import { RotateCcw, ArrowRight } from 'lucide-react';
import type { Alcohol } from '../../../engine/src/engine.ts';
import { Nav, AppShell, Help, useStore } from '../ui.tsx';
import { suggestScenario, type AppInput } from '../state.ts';
import { whatIfRows } from '../lib/view.ts';
import { HIDDEN } from '../lib/features.ts';
import type { ItemId } from '../lib/content.ts';
import { useInput, NeedInput, UnitPick } from './Results.tsx';
import { toUnit, toCm, unitLabel, initialWaistUnit, saveWaistUnit, type WaistUnit } from '../lib/body.ts';
import { Card } from '@/components/ui/card';
import { GlassButton } from '@/components/ui/button';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Segmented } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const ALC: [Alcohol, string][] = [['none', '안 마심'], ['lt1', '1잔 미만'], ['d1_4', '1–4.9잔'], ['d5', '5잔+']];
const TONE: Record<string, BadgeVariant> = { down: 'good', up: 'risk', same: 'muted', na: 'muted' };

export function WhatIf() {
  const inp = useInput();
  const sc0 = inp ? suggestScenario(inp) : { weightKg: 0, waistCm: 0 };
  const [dw, setDw] = useState(sc0.weightKg);
  // 허리: 인치가 기본(정수만), 고른 사람은 cm. 막대는 그 단위 눈금으로 움직이고 계산은 cm
  const { draft } = useStore();
  const [unit, setUnit0] = useState<WaistUnit>(() => initialWaistUnit(draft));
  const [dU, setDU] = useState(inp?.waistCm == null ? 0 : toUnit(sc0.waistCm, unit));
  const [alc, setAlc] = useState<Alcohol>(inp?.alcohol ?? 'none');
  const [ex, setEx] = useState<boolean>(inp?.exercise !== false);
  const [smoke, setSmoke] = useState<boolean>(inp?.smoke === 'current');
  if (!inp) return <NeedInput />;
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const w0 = inp.waistCm == null ? 0 : toUnit(inp.waistCm, unit), wNow = w0 + dU, wu = unitLabel(unit);
  // 눈금을 안 움직였으면 입력한 cm 그대로 (단위만 바꿔서 결과가 바뀌지 않게)
  const waistAfter = inp.waistCm == null ? null : dU === 0 ? inp.waistCm : r1(toCm(wNow, unit));
  const setUnit = (u: WaistUnit) => { if (u === unit || inp.waistCm == null) return; saveWaistUnit(u); setUnit0(u); setDU(toUnit(waistAfter!, u) - toUnit(inp.waistCm, u)); };
  const after = { ...inp, weightKg: r1(inp.weightKg + dw), waistCm: waistAfter,
    smoke: smoke ? 'current' as const : inp.smoke === 'current' ? 'never' as const : inp.smoke, alcohol: alc, exercise: ex,
    alc: alc === inp.alcohol ? (inp as AppInput).alc : undefined };   // 음주 단계를 바꾸면 원답(종류별 양)은 더 이상 맞지 않는다
  const { rows: all, down, up } = whatIfRows(inp, after);
  const rows = all.filter((r) => !HIDDEN.includes(r.id as ItemId));   // 숨긴 분야(수면 등)는 빼고
  const sign = (n: number, u: string) => (n === 0 ? '그대로' : `${n > 0 ? '+' : '−'}${Math.abs(n)}${u}`);
  const reset = () => { setDw(0); setDU(0); setAlc(inp.alcohol); setEx(inp.exercise !== false); setSmoke(inp.smoke === 'current'); };
  return (
    <AppShell>
      <Nav back="/all" title="바꿔보기" sub="바꾸는 대로 바로 다시 계산해요" right={<GlassButton size="icon" aria-label="처음 값으로" onClick={reset}><RotateCcw /></GlassButton>} />
      <div className="flex items-stretch rounded-card bg-brand px-2 py-5 text-white shadow-float">
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center"><span className="text-[11px] text-white/70">체중</span><span className="text-subheading font-medium">{after.weightKg}kg</span><span className="text-[11px] text-white/70">{sign(dw, 'kg')}</span></div>
        <i className="w-px bg-white/20" />
        <div className="flex flex-[1.5] flex-col items-center justify-center gap-1 text-center"><span className="text-[11px] text-white/70">낮아지는 항목</span><span className="text-heading font-medium text-good-dot" aria-live="polite">{down}<small className="text-subheading">개</small></span><span className="text-[11px] text-white/70">{up ? `${up}개는 올라가요` : '올라가는 항목 없음'}</span></div>
        <i className="w-px bg-white/20" />
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center"><span className="text-[11px] text-white/70">허리</span><span className="text-subheading font-medium">{after.waistCm == null ? '모름' : wNow + wu}</span><span className="text-[11px] text-white/70">{after.waistCm == null ? '' : sign(dU, wu)}</span></div>
      </div>

      <Card className="px-5 py-1">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 border-b border-sand-soft py-4 last:border-b-0">
            <div className="flex items-center justify-between gap-2">
              <b className="text-body font-medium">{r.name}</b>
              <span className="whitespace-nowrap"><span className="text-body-sm text-ink-soft">{r.b} <ArrowRight className="mx-0.5 inline size-3.5 align-[-2px]" /> </span><b className="text-subheading font-medium">{r.a}</b><span className="text-caption"> {r.na ? '' : r.unit}</span></span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1"><Progress value={r.wB} className="h-2" indicatorClassName="bg-sand" /><Progress value={r.wA} className="absolute inset-0 h-2 bg-transparent" indicatorClassName="bg-brand" /></div>
              <Badge variant={TONE[r.tone]}>{r.delta}</Badge>
            </div>
          </div>
        ))}
        <Help className="mx-0 py-3">{'옅은 막대는 지금, 진한 막대는 바꾼 뒤예요.\n골다공증은 체중을 늘리라는 뜻으로 읽힐 수 있어 넣지 않았어요.'}</Help>
      </Card>

      <h2 className="mx-1 mt-2 text-[19px] font-medium">무엇을 바꿔 볼까요?</h2>
      <Card className="p-5">
        <div className="flex justify-between text-body-sm"><b className="font-medium">체중</b><span><b>{after.weightKg}kg</b> <span className="text-ink-soft">{sign(dw, 'kg')}</span></span></div>
        <Slider fill={false} aria-label="체중" min={-20} max={10} step={1} value={[dw]} onValueChange={([x]) => setDw(x)} />
        <div className="flex justify-between text-caption text-ink-soft"><span>−20kg</span><span>+10kg</span></div>
      </Card>
      {inp.waistCm != null && (
        <Card className="p-5">
          <div className="flex items-center justify-between text-body-sm"><b className="flex items-center font-medium">허리둘레 <UnitPick unit={unit} onChange={setUnit} /></b><span><b>{wNow}{wu}</b> <span className="text-ink-soft">{sign(dU, wu)}</span></span></div>
          {(() => { const [lo, hi] = unit === 'cm' ? [-15, 10] : [-6, 4]; return <>
            <Slider fill={false} aria-label="허리둘레" min={lo} max={hi} step={1} value={[dU]} onValueChange={([x]) => setDU(x)} />
            <div className="flex justify-between text-caption text-ink-soft"><span>−{-lo}{wu}</span><span>+{hi}{wu}</span></div>
          </>; })()}
        </Card>
      )}
      <Card className="flex flex-col gap-3 p-5">
        <b className="text-body-sm font-medium">술 <span className="font-normal text-ink-soft">하루 평균</span></b>
        <Segmented label="음주" options={ALC.map(([v, t]) => ({ v, t }))} value={alc} onChange={setAlc} optClassName="text-body-sm" />
      </Card>
      <Card className="px-5">
        {([['운동', '일주일에 두 번, 30분 이상', ex, setEx], ['흡연', '지금 담배를 피우면', smoke, setSmoke]] as const).map(([t, s, v, f], k) => (
          <div key={t} className={cn('flex min-h-16 items-center justify-between', k && 'border-t border-sand-soft')}>
            <span><b className="text-body font-medium">{t}</b><div className="text-caption text-ink-soft">{s}</div></span>
            <Switch on={v} label={t} onChange={f} />
          </div>
        ))}
      </Card>
      <div className="flex flex-col gap-1 px-1 text-caption text-ink-soft">
        <span>· 고혈압은 {inp.waistCm != null ? '허리' : '체중(BMI)'} 변화로 다시 계산했어요(한국인 추적 연구).</span>
        <span>· 고콜레스테롤은 BMI 25를 넘나들 때만 바뀌어요.</span>
        <span>· 계산에서 숫자가 어떻게 바뀌는지 보여 드리는 거예요.<br />실제로 그만큼 줄어든다고 약속하는 건 아니에요.</span>
      </div>
    </AppShell>
  );
}
