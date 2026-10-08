// 바꿔보기 (#/whatif, 모든 항목 보기에서): 몸무게·허리·음주·운동·흡연을 바꾸면 '지금 가능성 추정'이 어떻게 달라지는지. 디자인: docs/DESIGN.md
import { useState } from 'react';
import { RotateCcw, ArrowRight } from 'lucide-react';
import type { Alcohol } from '../../../engine/src/engine.ts';
import { Nav, AppShell, Help } from '../ui.tsx';
import { suggestScenario, type AppInput } from '../state.ts';
import { whatIfRows } from '../lib/view.ts';
import { useInput, NeedInput } from './Results.tsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const ALC: [Alcohol, string][] = [['none', '안 마심'], ['lt1', '1잔 미만'], ['d1_4', '1–4.9잔'], ['d5', '5잔+']];
const TONE: Record<string, BadgeVariant> = { down: 'good', up: 'risk', same: 'muted', na: 'muted' };

/** 켜고 끄기 */
function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cn('flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors', on ? 'justify-end bg-brand' : 'justify-start bg-sand')}>
      <i className="block size-[26px] rounded-full bg-white shadow-card" />
    </button>
  );
}

export function WhatIf() {
  const inp = useInput();
  const sc0 = inp ? suggestScenario(inp) : { weightKg: 0, waistCm: 0 };
  const [dw, setDw] = useState(sc0.weightKg);
  const [dwa, setDwa] = useState(sc0.waistCm);
  const [alc, setAlc] = useState<Alcohol>(inp?.alcohol ?? 'none');
  const [ex, setEx] = useState<boolean>(inp?.exercise !== false);
  const [smoke, setSmoke] = useState<boolean>(inp?.smoke === 'current');
  if (!inp) return <NeedInput />;
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const after = { ...inp, weightKg: r1(inp.weightKg + dw), waistCm: inp.waistCm == null ? null : r1(inp.waistCm + dwa),
    smoke: smoke ? 'current' as const : inp.smoke === 'current' ? 'never' as const : inp.smoke, alcohol: alc, exercise: ex,
    alc: alc === inp.alcohol ? (inp as AppInput).alc : undefined };   // 음주 단계를 바꾸면 원답(종류별 양)은 더 이상 맞지 않는다
  const { rows, down, up } = whatIfRows(inp, after);
  const sign = (n: number, u: string) => (n === 0 ? '그대로' : `${n > 0 ? '+' : '−'}${Math.abs(n)}${u}`);
  const reset = () => { setDw(0); setDwa(0); setAlc(inp.alcohol); setEx(inp.exercise !== false); setSmoke(inp.smoke === 'current'); };
  return (
    <AppShell>
      <Nav back="/all" title="바꿔보기" sub="바꾸면 바로 다시 계산해요" right={<Button variant="soft" size="icon" aria-label="처음 값으로" onClick={reset}><RotateCcw /></Button>} />
      <div className="flex items-stretch rounded-card bg-ink px-2 py-5 text-white shadow-float">
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center"><span className="text-[11px] text-white/70">체중</span><span className="text-subheading font-medium">{after.weightKg}kg</span><span className="text-[11px] text-white/70">{sign(dw, 'kg')}</span></div>
        <i className="w-px bg-white/20" />
        <div className="flex flex-[1.5] flex-col items-center justify-center gap-1 text-center"><span className="text-[11px] text-white/70">낮아지는 항목</span><span className="text-heading font-medium text-good-dot" aria-live="polite">{down}<small className="text-subheading">개</small></span><span className="text-[11px] text-white/70">{up ? `${up}개는 올라가요` : '올라가는 항목 없음'}</span></div>
        <i className="w-px bg-white/20" />
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center"><span className="text-[11px] text-white/70">허리</span><span className="text-subheading font-medium">{after.waistCm == null ? '모름' : after.waistCm + 'cm'}</span><span className="text-[11px] text-white/70">{after.waistCm == null ? '' : sign(dwa, 'cm')}</span></div>
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
        <Help className="mx-0 py-3 text-[11px]">회색 = 지금, 주황 = 바꾼 후 · 골다공증은 체중 증가를 권하는 것처럼 읽힐 수 있어 넣지 않았어요.</Help>
      </Card>

      <h2 className="mx-1 mt-2 text-[19px] font-medium">무엇을 바꿔볼까요?</h2>
      <Card className="p-5">
        <div className="flex justify-between text-body-sm"><b className="font-medium">체중</b><span><b>{after.weightKg}kg</b> <span className="text-ink-soft">{sign(dw, 'kg')}</span></span></div>
        <Slider fill={false} aria-label="체중" min={-20} max={10} step={1} value={[dw]} onValueChange={([x]) => setDw(x)} />
        <div className="flex justify-between text-caption text-ink-soft"><span>−20kg</span><span>+10kg</span></div>
      </Card>
      {inp.waistCm != null && (
        <Card className="p-5">
          <div className="flex justify-between text-body-sm"><b className="font-medium">허리둘레</b><span><b>{after.waistCm}cm</b> <span className="text-ink-soft">{sign(dwa, 'cm')}</span></span></div>
          <Slider fill={false} aria-label="허리둘레" min={-15} max={10} step={1} value={[dwa]} onValueChange={([x]) => setDwa(x)} />
          <div className="flex justify-between text-caption text-ink-soft"><span>−15cm</span><span>+10cm</span></div>
        </Card>
      )}
      <Card className="flex flex-col gap-3 p-5">
        <b className="text-body-sm font-medium">음주 <span className="font-normal text-ink-soft">하루 평균</span></b>
        <div className="flex gap-1 rounded-full bg-sand-soft p-1" role="group" aria-label="음주">
          {ALC.map(([v, t]) => <button key={v} type="button" aria-pressed={alc === v} onClick={() => setAlc(v)} className={cn('h-10 flex-1 cursor-pointer rounded-full text-body-sm font-medium', alc === v ? 'bg-white text-ink shadow-card' : 'text-ink-soft')}>{t}</button>)}
        </div>
      </Card>
      <Card className="px-5">
        {([['운동', '주 2회 · 30분 이상', ex, setEx], ['흡연', '지금 피우는 경우', smoke, setSmoke]] as const).map(([t, s, v, f], k) => (
          <div key={t} className={cn('flex min-h-16 items-center justify-between', k && 'border-t border-sand-soft')}>
            <span><b className="text-body font-medium">{t}</b><div className="text-caption text-ink-soft">{s}</div></span>
            <Toggle on={v} label={t} onChange={f} />
          </div>
        ))}
      </Card>
      <div className="flex flex-col gap-1 px-1 text-caption text-ink-soft">
        <span>· 고혈압은 {inp.waistCm != null ? '허리' : '체중(BMI)'} 변화로 계산한 추정이에요(한국인 코호트).</span>
        <span>· 고콜레스테롤은 BMI 25를 넘나들 때만 바뀌어요. 체중 영향은 대략적이에요.</span>
        <span>· 계산 모형에서 숫자가 어떻게 바뀌는지 보여주는 거예요. 실제로 바꿨을 때 그만큼 줄어든다는 치료 효과는 아니에요.</span>
      </div>
    </AppShell>
  );
}
