// 공통 화면 부품
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Draft, RecordItem } from './state.ts';

// ── 라우팅: 해시(#/result) 기반. GitHub Pages 에서 새로고침해도 안전 ──
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

// ── 아이콘 (선 아이콘) ──
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export const Icon = {
  back: <svg width="20" height="20" viewBox="0 0 24 24" {...P}><path d="M15 18l-6-6 6-6" /></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" {...P} strokeWidth={3}><path d="M5 12l5 5 9-10" /></svg>,
  down: <svg width="18" height="18" viewBox="0 0 24 24" {...P}><path d="M6 9l6 6 6-6" /></svg>,
  right: <svg width="18" height="18" viewBox="0 0 24 24" {...P}><path d="M9 6l6 6-6 6" /></svg>,
  ext: <svg width="18" height="18" viewBox="0 0 24 24" {...P} strokeWidth={2}><path d="M7 17L17 7M9 7h8v8" /></svg>,
  save: <svg width="20" height="20" viewBox="0 0 24 24" {...P} strokeWidth={2}><path d="M6 3h12v18l-6-4-6 4z" /></svg>,
  share: <svg width="20" height="20" viewBox="0 0 24 24" {...P} strokeWidth={2}><path d="M12 3v13M7 8l5-5 5 5M5 14v6h14v-6" /></svg>,
  reset: <svg width="20" height="20" viewBox="0 0 24 24" {...P} strokeWidth={2}><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" /></svg>,
  chat: <svg width="22" height="22" viewBox="0 0 24 24" {...P} strokeWidth={2}><path d="M4 5h16v11H8l-4 4z" /></svg>,
  grid: <svg width="24" height="24" viewBox="0 0 24 24" {...P} strokeWidth={2}><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>,
  sliders: <svg width="24" height="24" viewBox="0 0 24 24" {...P} strokeWidth={2}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>,
  chart: <svg width="24" height="24" viewBox="0 0 24 24" {...P} strokeWidth={2}><path d="M4 19V5M4 19h16" /><path d="M8 15l3-4 3 2 5-6" /></svg>,
  clock: <svg width="24" height="24" viewBox="0 0 24 24" {...P} strokeWidth={2}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>,
  phone: <svg width="22" height="22" viewBox="0 0 24 24" {...P} strokeWidth={2}><rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M10 18.5h4" /></svg>,
};

export function Nav({ back, title, sub, right }: { back?: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="nav">
      {back ? <a className="circle" href={'#' + back} aria-label="뒤로">{Icon.back}</a> : <div style={{ width: 44 }} />}
      <div className="title"><b>{title}</b>{sub && <span>{sub}</span>}</div>
      {right ?? <div style={{ width: 44 }} />}
    </div>
  );
}
export const Progress = ({ step, total }: { step: number; total: number }) => (
  <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label="진행"><i style={{ width: `${(step / total) * 100}%` }} /></div>
);
export const H1 = ({ a, b }: { a: ReactNode; b: ReactNode }) => <h1 className="h1">{a}<b>{b}</b></h1>;

/** 한 개 고르기 */
export function Choice<T>({ q, options, value, onChange, cols, size, help, badge }: {
  q: ReactNode; options: { v: T; t: string; s?: string }[]; value: T | null | undefined; onChange: (v: T) => void;
  cols?: number; size?: 'sm' | 'xs'; help?: ReactNode; badge?: string;
}) {
  return (
    <div className="card q" role="group" aria-label={typeof q === 'string' ? q : undefined}>
      {badge && <span className="pill" style={{ alignSelf: 'flex-start', background: 'var(--linen)', color: 'var(--ink)' }}>{badge}</span>}
      <div className="qt">{q}</div>
      <div className="opts" style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button key={String(o.v)} type="button" className={'opt' + (size ? ' ' + size : '')} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
            {o.t}{o.s && <small>{o.s}</small>}
          </button>
        ))}
      </div>
      {help && <div className="help">{help}</div>}
    </div>
  );
}
export const YN = ({ q, value, onChange, help }: { q: string; value: boolean | null; onChange: (v: boolean) => void; help?: string }) => (
  <Choice q={q} value={value} onChange={onChange} options={[{ v: true, t: '네' }, { v: false, t: '아니요' }]} help={help} />
);
/** 분기로 열린 질문 묶음 */
export function Branch({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="card branch fade">
      <div className="hd"><span style={{ color: 'var(--lime)' }}>{Icon.down}</span><div><b>{title}</b><span>{sub}</span></div></div>
      <div className="bd">{children}</div>
    </div>
  );
}
export function ScaleItem({ q, labels, value, onChange, size }: { q: string; labels: string[]; value: number | null; onChange: (v: number) => void; size?: 'sm' | 'xs' }) {
  return (
    <div className="it" role="group" aria-label={q}>
      <b>{q}</b>
      <div className="opts" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
        {labels.map((t, j) => <button key={j} type="button" className={'opt' + (size ? ' ' + size : '')} aria-pressed={value === j} onClick={() => onChange(j)}>{t}</button>)}
      </div>
    </div>
  );
}
export const Closed = ({ children }: { children: ReactNode }) => (
  <div className="closed"><span style={{ color: 'var(--slate)', flexShrink: 0 }}>{Icon.right}</span><div>{children}</div></div>
);
/** 다음 버튼: 조건이 덜 되면 이유를 보여줌 */
export function Next({ error, to, label, onGo }: { error: string | null; to: string; label: string; onGo?: () => void }) {
  const [tried, setTried] = useState(false);
  return (
    <>
      <div className="err" role="status" aria-live="polite">{tried && error ? error : ''}</div>
      <button type="button" className="cta" aria-disabled={!!error} onClick={() => { if (error) { setTried(true); return; } onGo?.(); go(to); }}>{label}</button>
    </>
  );
}
export function TabBar({ at }: { at: 'result' | 'whatif' | 'record' | 'again' }) {
  const T: [typeof at, string, string, ReactNode][] = [['result', '#/result', '결과', Icon.grid], ['whatif', '#/whatif', '바꿔보기', Icon.sliders], ['record', '#/record', '기록', Icon.chart], ['again', '#/start', '다시 체크', Icon.clock]];
  return (
    <nav className="tabbar" aria-label="주요 메뉴">
      {T.map(([k, h, t, ic]) => <a key={k} href={h} aria-current={at === k ? 'page' : undefined}>{ic}{t}</a>)}
    </nav>
  );
}
export function Ring({ f, label, col = 'var(--ink)', size = 72 }: { f: number; label: string; col?: string; size?: number }) {
  const r = size * 0.39, C = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fog)" strokeWidth={size * 0.1} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={size * 0.1} strokeLinecap="round" strokeDasharray={`${C * f} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.22, fontWeight: 800, color: 'var(--obsidian)' }}>{label}</div>
    </div>
  );
}
export function Gauge({ f, v, col, w = 120 }: { f: number; v: string; col: string; w?: number }) {
  const S = Math.PI * 48;
  return (
    <div style={{ position: 'relative', width: w, height: w * 0.58 }}>
      <svg width={w} height={w * 0.58} viewBox="0 0 120 70" aria-hidden="true">
        <path d="M 12 62 A 48 48 0 0 1 108 62" fill="none" stroke="var(--fog)" strokeWidth="10" strokeLinecap="round" />
        <path d="M 12 62 A 48 48 0 0 1 108 62" fill="none" stroke={col} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${S * f} ${S}`} />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center', fontSize: w * 0.2, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--obsidian)' }}>{v}</div>
    </div>
  );
}
export function People({ cells, cols = 20, size = 14 }: { cells: string[]; cols?: number; size?: number }) {
  const C: Record<string, string> = { keep: 'var(--ink)', gone: 'var(--lime)', rest: '#d3d6d0' };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '4px 3px', width: '100%' }} aria-hidden="true">
      {cells.map((c, k) => (
        <svg key={k} width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', margin: '0 auto', color: C[c] }}>
          <circle cx="12" cy="7" r="4.5" fill="currentColor" /><path d="M4 23c0-4.5 3.6-8 8-8s8 3.5 8 8z" fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}
export const Crisis = () => (
  <div className="crisis" role="alert">{Icon.chat}<div>마음이 많이 힘들다면 혼자 견디지 않아도 돼요. <a href="tel:109">자살예방상담 109</a>(24시간)에 지금 바로 전화할 수 있고, 가까운 정신건강복지센터에서도 이야기를 들어줘요.</div></div>
);
