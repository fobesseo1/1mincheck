// 공통 화면 부품 (Jeton 스타일 · Tailwind · shadcn · lucide). 디자인 기준: docs/DESIGN.md
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, Check, ArrowUpRight, Bookmark, Share2, RotateCcw, MessageCircle, LayoutGrid, SlidersHorizontal,
  LineChart, History, Smartphone, FileText, Play, X, ArrowRight,
} from 'lucide-react';
import type { Draft, RecordItem } from './state.ts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ── 라우팅: 해시(#/result) 기반. 정적 호스팅에서 새로고침해도 안전 ──
export function useRoute() {
  const [h, setH] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const f = () => { setH(location.hash.slice(1) || '/'); window.scrollTo(0, 0); };
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return h;
}
export const go = (p: string) => { location.hash = p; };

// ── 전역 상태 ──
export interface Store {
  draft: Draft; setDraft: (f: (d: Draft) => Draft) => void; reset: () => void;
  records: RecordItem[]; setRecords: (r: RecordItem[]) => void; toast: (m: string) => void;
}
export const StoreCtx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(StoreCtx);

// ── 아이콘: lucide-react 한 묶음만 (이모지·글자 기호 쓰지 않음) ──
const s = 'size-5';
export const Icon = {
  back: <ChevronLeft className={s} />, check: <Check className="size-4" strokeWidth={3} />, down: <ChevronDown className={s} />, right: <ChevronRight className={s} />,
  ext: <ArrowUpRight className={s} />, save: <Bookmark className={s} />, share: <Share2 className={s} />, reset: <RotateCcw className={s} />,
  chat: <MessageCircle className="size-6" />, grid: <LayoutGrid className="size-6" />, sliders: <SlidersHorizontal className="size-6" />, chart: <LineChart className="size-6" />,
  clock: <History className="size-6" />, phone: <Smartphone className="size-6" />, doc: <FileText className="size-6" />, play: <Play className="size-4" fill="currentColor" />, close: <X className={s} />,
};

/** 앱 화면 틀: 가운데 440px, 흰 바탕 */
export function AppShell({ children, tab }: { children: ReactNode; tab?: Parameters<typeof TabBar>[0]['at'] }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col bg-white">
      <div className="flex flex-1 flex-col gap-4 px-5 pt-[calc(12px+env(safe-area-inset-top))] pb-8 animate-rise">{children}</div>
      {tab && <TabBar at={tab} />}
    </div>
  );
}
/** 예전 화면 틀 이름(.page) 대신 쓰는 묶음 */
export const Page = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn('flex flex-1 flex-col gap-4 px-5 pt-[calc(12px+env(safe-area-inset-top))] pb-8 animate-rise', className)}>{children}</div>;

export function Nav({ back, title, sub, right }: { back?: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex h-14 items-center justify-between">
      {back ? <Button asChild variant="ghost" size="icon" className="bg-sand-soft"><a href={'#' + back} aria-label="뒤로">{Icon.back}</a></Button> : <div className="w-11" />}
      <div className="flex flex-col items-center text-center"><b className="text-[17px] font-medium text-ink">{title}</b>{sub && <span className="text-caption text-ink-soft">{sub}</span>}</div>
      {right ?? <div className="w-11" />}
    </div>
  );
}
export const Progress = ({ step, total }: { step: number; total: number }) => (
  <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label="진행">
    {Array.from({ length: total }, (_, k) => <i key={k} className={cn('h-1.5 flex-1 rounded-full transition-colors', k < step ? 'bg-brand' : 'bg-sand')} />)}
  </div>
);
export const H1 = ({ a, b }: { a: ReactNode; b: ReactNode }) => (
  <h1 className="mx-1 mt-2 mb-1 text-heading-sm text-ink-soft">{a}<b className="block text-ink">{b}</b></h1>
);
export const Lead = ({ children, className }: { children: ReactNode; className?: string }) => <p className={cn('mx-1 whitespace-pre-line text-body-sm text-ink-soft', className)}>{children}</p>;
export const Help = ({ children, className }: { children: ReactNode; className?: string }) => <p className={cn('mx-1 whitespace-pre-line text-caption text-ink-soft', className)}>{children}</p>;

/** 선택 버튼 하나 */
export const optCls = (on: boolean, size?: 'sm' | 'xs') => cn('flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-btn px-1.5 py-1.5 text-center leading-tight font-medium transition-colors',
  size === 'xs' ? 'text-caption' : size === 'sm' ? 'text-body-sm' : 'text-body', on ? 'bg-ink text-white' : 'bg-sand-soft text-ink hover:bg-sand');

/** 한 개 고르기 */
export function Choice<T>({ q, options, value, onChange, cols, size, help, badge }: {
  q: ReactNode; options: { v: T; t: string; s?: string }[]; value: T | null | undefined; onChange: (v: T) => void;
  cols?: number; size?: 'sm' | 'xs'; help?: ReactNode; badge?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card" role="group" aria-label={typeof q === 'string' ? q : undefined}>
      {badge && <span className="self-start rounded-full bg-blush px-2.5 py-0.5 text-caption font-medium text-brand">{badge}</span>}
      <div className="text-body font-medium leading-snug text-ink">{q}</div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button key={String(o.v)} type="button" className={optCls(value === o.v, size)} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
            {o.t}{o.s && <small className="mt-0.5 text-[11px] font-normal opacity-80">{o.s}</small>}
          </button>
        ))}
      </div>
      {help && <div className="text-caption text-ink-soft">{help}</div>}
    </div>
  );
}
export const YN = ({ q, value, onChange, help }: { q: string; value: boolean | null; onChange: (v: boolean) => void; help?: string }) => (
  <Choice q={q} value={value} onChange={onChange} options={[{ v: true, t: '네' }, { v: false, t: '아니요' }]} help={help} />
);
/** 분기로 열린 질문 묶음 */
export function Branch({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card bg-white shadow-card animate-rise">
      <div className="flex items-center gap-2.5 bg-ink px-4 py-3.5 text-white"><ChevronDown className="size-5 text-brand" /><div><b className="text-body-sm font-medium">{title}</b><span className="block text-caption text-white/75">{sub}</span></div></div>
      <div className="flex flex-col gap-5 p-4">{children}</div>
    </div>
  );
}
export function ScaleItem({ q, labels, value, onChange, size }: { q: string; labels: string[]; value: number | null; onChange: (v: number) => void; size?: 'sm' | 'xs' }) {
  return (
    <div className="flex flex-col gap-2" role="group" aria-label={q}>
      <b className="text-body-sm font-medium leading-snug text-ink">{q}</b>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
        {labels.map((t, j) => <button key={j} type="button" className={optCls(value === j, size)} aria-pressed={value === j} onClick={() => onChange(j)}>{t}</button>)}
      </div>
    </div>
  );
}
export const Closed = ({ children }: { children: ReactNode }) => (
  <div className="flex items-start gap-3 rounded-card border border-dashed border-sand p-4 text-body-sm"><ChevronRight className="size-5 shrink-0 text-ink-soft" /><div>{children}</div></div>
);
/** 다음 버튼: 조건이 덜 되면 이유를 보여줌 */
export function Next({ error, to, label, onGo }: { error: string | null; to: string; label: string; onGo?: () => void }) {
  const [tried, setTried] = useState(false);
  return (
    <>
      <div className="min-h-[18px] text-center text-body-sm font-medium text-risk" role="status" aria-live="polite">{tried && error ? error : ''}</div>
      <Button size="lg" className="w-full" aria-disabled={!!error} onClick={() => { if (error) { setTried(true); return; } onGo?.(); go(to); }}>{label}</Button>
    </>
  );
}
export function TabBar({ at }: { at: 'result' | 'labs' | 'whatif' | 'record' | 'again' }) {
  const T: [typeof at, string, string, ReactNode][] = [['result', '#/result', '결과', Icon.grid], ['labs', '#/labs', '검진 풀이', Icon.doc], ['record', '#/record', '기록', Icon.chart], ['again', '#/start', '다시 체크', Icon.clock]];
  return (
    <nav className="no-print sticky bottom-0 z-10 flex rounded-t-[24px] bg-white px-3 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] shadow-card" aria-label="주요 메뉴">
      {T.map(([k, h, t, ic]) => (
        <a key={k} href={h} aria-current={at === k ? 'page' : undefined} className={cn('flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium no-underline', at === k ? 'text-brand' : 'text-ink-soft')}>{ic}{t}</a>
      ))}
    </nav>
  );
}
/** 원형 비율 (모든 항목 보기의 또래 배수) */
export function Ring({ f, label, col = 'var(--color-brand)', size = 72 }: { f: number; label: string; col?: string; size?: number }) {
  const r = size * 0.39, C = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-sand)" strokeWidth={size * 0.1} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={size * 0.1} strokeLinecap="round" strokeDasharray={`${C * f} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-medium text-ink" style={{ fontSize: size * 0.22 }}>{label}</div>
    </div>
  );
}
/** 반원 게이지 (상세 화면 점수) */
export function Gauge({ f, v, col, w = 120 }: { f: number; v: string; col: string; w?: number }) {
  const S = Math.PI * 48;
  return (
    <div className="relative" style={{ width: w, height: w * 0.58 }}>
      <svg width={w} height={w * 0.58} viewBox="0 0 120 70" aria-hidden="true">
        <path d="M 12 62 A 48 48 0 0 1 108 62" fill="none" stroke="var(--color-sand)" strokeWidth="10" strokeLinecap="round" />
        <path d="M 12 62 A 48 48 0 0 1 108 62" fill="none" stroke={col} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${S * f} ${S}`} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center font-medium text-ink" style={{ fontSize: w * 0.2 }}>{v}</div>
    </div>
  );
}
/** 사람 100명 그림 (상세 화면) */
export function People({ cells, cols = 20, size = 14 }: { cells: string[]; cols?: number; size?: number }) {
  const C: Record<string, string> = { keep: 'text-brand', gone: 'text-good-dot', rest: 'text-sand' };
  return (
    <div className="grid w-full gap-x-[3px] gap-y-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden="true">
      {cells.map((c, k) => (
        <svg key={k} width={size} height={size} viewBox="0 0 24 24" className={cn('mx-auto block', C[c])}>
          <circle cx="12" cy="7" r="4.5" fill="currentColor" /><path d="M4 23c0-4.5 3.6-8 8-8s8 3.5 8 8z" fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}
/** 'a → b' 같은 문장의 화살표 글자를 lucide 아이콘으로 바꿔 보여준다 */
export const Arrowed = ({ text, className }: { text: string; className?: string }) => (
  <>{text.split('→').map((t, k) => <span key={k}>{k > 0 && <ArrowRight className={cn('mx-0.5 inline size-3.5 align-[-2px]', className)} />}{t.trim()}</span>)}</>
);
export const Crisis = () => (
  <div className="flex gap-3 rounded-card bg-info-bg p-4 text-body-sm leading-relaxed text-info" role="alert">{Icon.chat}<div>마음이 많이 힘들다면 혼자 견디지 않아도 돼요. <a className="font-medium text-info" href="tel:109">자살예방상담 109</a>(24시간)에 지금 바로 전화할 수 있고, 가까운 정신건강복지센터에서도 이야기를 들어줘요.</div></div>
);
