// 기록 비교: 이 기기에 저장한 두 기록을 나란히. 디자인: docs/DESIGN.md
import { useState } from 'react';
import { ArrowRight, Printer, ChevronDown, Trash2 } from 'lucide-react';
import { useStore, Nav, AppShell, Help, Arrowed, go } from '../ui.tsx';
import { saveRecords, fromInput } from '../state.ts';
import { viewRecord } from '../lib/view.ts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function Record() {
  const { records, setRecords, setDraft, toast } = useStore();
  const n = records.length;
  const [pi, setPi] = useState(Math.max(0, n - 2));
  const [ci, setCi] = useState(Math.max(0, n - 1));
  const clear = () => { if (confirm('이 기기에 저장된 기록을 모두 지울까요? 되돌릴 수 없어요.')) { saveRecords([]); setRecords([]); toast('기록을 지웠어요'); } };
  const open = (k: number) => { setDraft(() => fromInput(records[k].input)); go('/result'); };
  if (n < 2) {
    return (
      <AppShell tab="record">
        <Nav title="기록 비교" sub="이 기기에 저장된 기록" />
        <Card className="flex flex-col gap-2.5 px-5 py-8 text-center">
          <b className="text-[19px] font-medium">{n === 0 ? '아직 저장한 기록이 없어요' : '아직 기록이 하나예요'}</b>
          <span className="whitespace-pre-line text-body-sm text-ink-soft">{'결과 화면에서 ‘이 기기에 기록 저장’을 누르면 남아요.\n몇 달 뒤 다시 체크하면, 달라진 만큼 나란히 보여 드려요.'}</span>
          {n === 1 && <Button variant="outline" className="mt-2" onClick={() => open(0)}>{records[0].date} 결과 다시 보기</Button>}
        </Card>
        <Button asChild size="lg" className="w-full"><a href="#/start">체크 시작하기 <ArrowRight /></a></Button>
        <div className="flex-1" />
        {n > 0 && <Button variant="ghost" size="sm" className="self-center text-ink-soft" onClick={clear}><Trash2 /> 기록 지우기</Button>}
      </AppShell>
    );
  }
  const p = records[Math.min(pi, n - 1)], c = records[Math.min(ci, n - 1)];
  const v = viewRecord(p.input, c.input);
  const sel = (val: number, set: (x: number) => void, label: string, now?: boolean) => (
    <label className={cn('flex flex-1 flex-col items-center gap-0.5 rounded-btn p-2.5', now ? 'bg-brand text-white' : 'bg-sand-soft')}>
      <span className={cn('text-caption', now ? 'text-white/80' : 'text-ink-soft')}>{label}</span>
      <select value={val} onChange={(e) => set(Number(e.target.value))} className={cn('cursor-pointer border-0 bg-transparent text-center text-body font-medium outline-none', now ? 'text-white' : 'text-ink')}>
        {records.map((r, k) => <option key={r.id} value={k} className="text-ink">{r.date}{k === n - 1 ? ' (최근)' : ''}</option>)}
      </select>
    </label>
  );
  return (
    <AppShell tab="record">
      <Nav title="기록 비교" sub={`이 기기에 저장된 기록 ${n}개`} />
      <Card className="flex items-center gap-2 p-2">{sel(pi, setPi, '이전')}<ArrowRight className="size-5 text-brand" />{sel(ci, setCi, '지금', true)}</Card>
      <div className="flex items-stretch rounded-card bg-ink px-2 py-5 text-white shadow-float">
        {[['체중', v.weight.v, v.weight.s], null, ['좋아진 항목', `${v.down}개`, v.habit], null, ['허리', v.waist.v, v.waist.s]].map((x, k) => x ? (
          <div key={k} className={cn('flex flex-1 flex-col items-center justify-center gap-1 text-center', k === 2 && 'flex-[1.5]')}>
            <span className="text-[11px] text-white/70">{x[0]}</span>
            <span className={cn('font-medium', k === 2 ? 'text-heading text-brand-tint' : 'text-subheading')}>{x[1]}</span>
            <span className="text-[11px] text-white/70"><Arrowed text={x[2]} /></span>
          </div>
        ) : <i key={k} className="w-px bg-white/20" />)}
      </div>
      <h2 className="mx-1 mt-2 text-[19px] font-medium">달라진 항목</h2>
      <Card className="px-5 py-1">
        {v.rows.length === 0 && <div className="py-4 text-body-sm">달라진 항목이 없어요.</div>}
        {v.rows.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 border-b border-sand-soft py-4 last:border-b-0">
            <div className="flex items-center justify-between"><b className="text-body font-medium">{r.name}</b><Badge variant={r.better ? 'good' : 'risk'}>{r.delta}</Badge></div>
            <div className="flex items-center gap-3">
              <span className="w-14 text-body font-medium text-ink-soft">{r.b}</span>
              <svg width="100%" height="28" viewBox="0 0 200 28" preserveAspectRatio="none" aria-hidden="true" className="flex-1"><line x1="6" y1={r.y1} x2="194" y2={r.y2} stroke="var(--color-brand)" strokeWidth="2" strokeDasharray="4 4" /><circle cx="6" cy={r.y1} r="5" fill="var(--color-sand)" /><circle cx="194" cy={r.y2} r="6" fill="var(--color-brand)" /></svg>
              <span className="w-16 text-right text-subheading font-medium">{r.a}</span>
            </div>
            {r.why && <span className="text-caption text-ink-soft"><Arrowed text={r.why} /></span>}
          </div>
        ))}
        <details className="group py-3.5">
          <summary className="flex items-center justify-between text-body font-medium">그대로인 항목 {v.same.length}개 <ChevronDown className="size-5 text-brand transition-transform group-open:rotate-180" /></summary>
          <div className="mt-2.5 text-body-sm leading-loose text-ink-soft">{v.same.join(' · ')}</div>
        </details>
      </Card>
      <Button variant="outline" size="lg" className="w-full" onClick={() => window.print()}><Printer /> 진료 때 보여줄 리포트로 저장(인쇄·PDF)</Button>
      <Button variant="soft" size="lg" className="w-full" onClick={() => open(Math.min(ci, n - 1))}>{c.date} 결과 자세히 보기</Button>
      <div className="flex items-center justify-between gap-3 px-1">
        <Help className="mx-0">기록은 이 기기에만 있어요. 브라우저 데이터를 지우면 함께 사라져요.</Help>
        <Button variant="ghost" size="sm" className="shrink-0 text-ink-soft" onClick={clear}><Trash2 /> 기록 지우기</Button>
      </div>
    </AppShell>
  );
}
