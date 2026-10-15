// 기록 비교: 이 기기에 저장한 두 기록을 나란히. 2026-10-15 캔버스 'Record'·'RecordEmpty' 그대로. 디자인: docs/DESIGN.md
//  날짜 고르기(지금 = 잉크) → 잉크 요약 상자(몸무게 · 좋아진 항목 · 허리 인치) → 달라진 항목(가능성은 '100명 중 N명') → 그대로인 항목
import { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronRight, LineChart, Printer, Trash2 } from 'lucide-react';
import { useStore, Nav, AppShell, go } from '../ui.tsx';
import { saveRecords, fromInput, type RecordItem } from '../state.ts';
import { viewRecord } from '../lib/view.ts';
import { Button } from '@/components/ui/button';
import { Badge, type Tone } from '@/components/result-v4';
import { cn } from '@/lib/utils';

const dateOf = (d: string) => d.replace(/^(\d{4})\.0?(\d+)\.0?(\d+)$/, '$1. $2. $3');
const monthDay = (d: string) => d.replace(/^\d{4}\.0?(\d+)\.0?(\d+)$/, '$1월 $2일');

/** 날짜 하나 고르기 칸 (지금 = 잉크) */
function Pick({ label, val, set, records, now }: { label: string; val: number; set: (x: number) => void; records: RecordItem[]; now?: boolean }) {
  const n = records.length;
  return (
    <label className={cn('relative flex h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-px rounded-[14px]', now ? 'bg-ink text-white' : 'text-ink')}>
      <span className={cn('text-[11px]', now ? 'text-[#b5b5b5]' : 'text-ink-soft')}>{label}</span>
      <b className="flex items-center gap-0.5 text-[15px] font-semibold">{dateOf(records[val].date)}<ChevronDown className="size-3.5" /></b>
      <select aria-label={`${label} 기록`} value={val} onChange={(e) => set(Number(e.target.value))} className="absolute inset-0 cursor-pointer opacity-0">
        {records.map((r, k) => <option key={r.id} value={k}>{dateOf(r.date)}{k === n - 1 ? ' (최근)' : ''}</option>)}
      </select>
    </label>
  );
}

/** 요약 상자 한 칸: 이름 → 숫자+단위(붙여서) → 작게 */
function Stat({ name, v, s, good, wide }: { name: string; v: string; s: string; good?: boolean; wide?: boolean }) {
  const m = /^([+−]?[\d.]+)(.*)$/.exec(v);
  return (
    <div className={cn('flex flex-col items-center gap-1 text-center', wide ? 'flex-[1.3]' : 'flex-1')}>
      <span className="text-[12px] text-[#b5b5b5]">{name}</span>
      {m ? <b className={cn('text-[24px] leading-none font-semibold tabular-nums', good && 'text-[#7fdca0]')}>{m[1]}<span className="text-[13px] font-normal text-[#b5b5b5]">{m[2]}</span></b>
        : <b className="text-[17px] leading-none font-semibold">{v}</b>}
      <span className="px-1 text-[12px] text-[#b5b5b5]">{s.split(" · ").map((x, j, a) => <span key={j}><span className="whitespace-nowrap">{x}{j < a.length - 1 ? " ·" : ""}</span>{" "}</span>)}</span>
    </div>
  );
}

export function Record() {
  const { records, setRecords, setDraft, toast } = useStore();
  const n = records.length;
  const [pi, setPi] = useState(Math.max(0, n - 2));
  const [ci, setCi] = useState(Math.max(0, n - 1));
  const [sameOpen, setSameOpen] = useState(false);
  const clear = () => { if (confirm('이 기기에 저장된 기록을 모두 지울까요? 되돌릴 수 없어요.')) { saveRecords([]); setRecords([]); toast('기록을 지웠어요'); } };
  const open = (k: number) => { setDraft(() => fromInput(records[k].input)); go('/result'); };
  const Clear = () => (
    <button type="button" onClick={clear} className="flex flex-none cursor-pointer items-center gap-1 p-2 text-[13px] text-ink-soft"><Trash2 className="size-3.5" />기록 지우기</button>
  );
  if (n < 2) {
    return (
      <AppShell tab="record">
        <Nav title="기록" sub="이 기기에 저장된 기록" />
        <section className="flex flex-col items-center gap-2.5 rounded-card bg-white px-6 pt-8 pb-6 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-paper text-ink-soft"><LineChart className="size-[26px]" /></span>
          <b className="mt-1 text-[19px] font-semibold">{n === 0 ? '아직 저장한 기록이 없어요' : '아직 기록이 하나예요'}</b>
          <p className="m-0 text-body-sm leading-[1.6] text-ink-soft">결과 화면에서 ‘기록 저장’을 누르면 남아요.<br />몇 달 뒤 다시 체크하면<br />달라진 만큼 나란히 보여 드려요.</p>
          {n === 1 && (
            <button type="button" onClick={() => open(0)} className="mt-3 flex w-full cursor-pointer items-center gap-3 border-t border-hair pt-3.5 text-left">
              <Badge t="저장됨" tone="gray" />
              <b className="flex-1 text-[15px] font-semibold">{dateOf(records[0].date)} 결과</b>
              <span className="flex items-center gap-0.5 text-[13px] text-ink-soft">다시 보기<ChevronRight className="size-3.5" /></span>
            </button>
          )}
        </section>
        <Button asChild size="lg" className="w-full"><a href="#/start">다시 체크하기 <ArrowRight /></a></Button>
        <p className="m-0 text-center text-[12px] leading-[1.6] text-mute">기록은 이 기기에만 있어요.<br />브라우저 데이터를 지우면 함께 사라져요.</p>
        {n > 0 && <div className="self-center"><Clear /></div>}
      </AppShell>
    );
  }
  const p = records[Math.min(pi, n - 1)], c = records[Math.min(ci, n - 1)];
  const v = viewRecord(p.input, c.input);
  return (
    <AppShell tab="record">
      <Nav title="기록 비교" sub={`이 기기에 저장된 기록 ${n}개`} />
      <section aria-label="비교할 날짜" className="flex items-center gap-1 rounded-card bg-white p-1.5">
        <Pick label="이전" val={Math.min(pi, n - 1)} set={setPi} records={records} />
        <ArrowRight className="size-[18px] flex-none text-[#9a9a96]" />
        <Pick label="지금" val={Math.min(ci, n - 1)} set={setCi} records={records} now />
      </section>

      <section aria-label="한눈에" className="flex items-stretch rounded-card bg-ink px-2 py-5 text-white">
        <Stat name="몸무게" v={v.weight.v} s={v.weight.s} />
        <i className="w-px bg-white/[.14]" />
        <Stat name="좋아진 항목" v={`${v.down}개`} s={v.habit} good={v.down > 0} wide />
        <i className="w-px bg-white/[.14]" />
        <Stat name="허리" v={v.waist.v} s={v.waist.s} />
      </section>

      <h2 className="m-0 mx-1 mt-1 text-[19px] font-semibold">달라진 항목</h2>
      <section className="flex flex-col rounded-card bg-white px-5 py-1.5">
        {v.rows.length === 0 && <p className="m-0 py-4 text-body-sm">달라진 항목이 없어요.</p>}
        {v.rows.map((r, k) => {
          const tone: Tone = r.better ? 'green' : 'red', col = r.better ? '#1e8a4c' : '#d81e44';
          // 가능성(%)은 '100명 중 N명'으로. 그 밖(BMI·점수)은 그대로
          const b = r.pct ? Math.round(r.bv) : null, a = r.pct ? Math.round(r.av) : null;
          const delta = r.pct ? `${a! - b! > 0 ? '+' : '−'}${Math.abs(a! - b!)}명` : r.delta;
          if (r.pct && a === b) return null;
          const lo = r.pct ? Math.min(a!, b!) : 0, hi = r.pct ? Math.max(a!, b!) : 0;
          return (
            <div key={r.id} className={cn('flex flex-col gap-2.5 py-4', k > 0 && 'border-t border-hair')}>
              <div className="flex items-center justify-between"><b className="text-[17px] font-semibold">{r.name.replace('고콜레스테롤', '콜레스테롤')}</b><Badge t={delta} tone={tone} /></div>
              <div className="flex items-center gap-2.5">
                <span className="w-11 flex-none text-[15px] text-[#9a9a96] tabular-nums">{r.pct ? `${b}명` : r.b}</span>
                {r.pct ? (
                  <div className="relative h-3.5 flex-1" aria-hidden>
                    <i className="absolute inset-x-0 top-1.5 h-0.5 rounded-full bg-track" />
                    <i className="absolute top-1.5 h-0.5" style={{ left: `${lo}%`, width: `${hi - lo}%`, background: col }} />
                    <span className="absolute top-0.5 box-border size-2.5 -translate-x-1/2 rounded-full border-2 border-[#c4c4c0] bg-white" style={{ left: `${Math.min(97, Math.max(3, b!))}%` }} />
                    <span className="absolute top-0 box-border size-3.5 -translate-x-1/2 rounded-full border-[3px] border-white" style={{ left: `${Math.min(97, Math.max(3, a!))}%`, background: col, boxShadow: `0 0 0 1px ${col}` }} />
                  </div>
                ) : <ArrowRight className="mx-auto size-4 text-[#9a9a96]" />}
                <span className="flex w-[52px] flex-none items-baseline justify-end">
                  {r.pct ? <b className="text-[24px] leading-none font-semibold tabular-nums">{a}<span className="text-[13px] font-normal text-ink-soft">명</span></b> : <b className="text-[20px] leading-none font-semibold tabular-nums">{r.a}</b>}
                </span>
              </div>
              <span className="text-[12px] text-ink-soft">{r.pct ? '100명 중' : ''}{r.pct && r.why ? ' · ' : ''}{r.why.replace('→', '→')}</span>
            </div>
          );
        })}
        {v.same.length > 0 && (
          <div className={cn('flex flex-col', v.rows.length > 0 && 'border-t border-hair')}>
            <button type="button" aria-expanded={sameOpen} onClick={() => setSameOpen((x) => !x)} className="flex cursor-pointer items-center justify-between py-3.5 text-[15px] font-semibold">
              그대로인 항목 {v.same.length}개<ChevronDown className={cn('size-[18px] text-ink-soft transition-transform', sameOpen && 'rotate-180')} />
            </button>
            {sameOpen && <p className="m-0 pb-3.5 text-body-sm leading-[1.8] text-ink-soft">{v.same.map((t, j) => <span key={t}><span className="whitespace-nowrap">{t}{j < v.same.length - 1 ? ' ·' : ''}</span>{' '}</span>)}</p>}
          </div>
        )}
      </section>

      <Button size="lg" className="w-full" onClick={() => open(Math.min(ci, n - 1))}>{monthDay(c.date)} 결과 자세히 보기 <ArrowRight /></Button>
      <Button asChild variant="outline" size="lg" className="w-full"><a href="#/summary"><Printer /> 진료 때 보여 줄 요약 만들기</a></Button>
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="m-0 text-[12px] leading-[1.6] text-mute">기록은 이 기기에만 있어요.<br />브라우저 데이터를 지우면 함께 사라져요.</p>
        <Clear />
      </div>
    </AppShell>
  );
}
