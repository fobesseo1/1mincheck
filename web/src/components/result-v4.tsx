// 결과 첫 화면 (2026-10-15, Claude 디자인 캔버스 '1분체크 결과 화면' 세 장 그대로)
//  ① 지금 당장 할 일: 판정(verdict.ts) 할 일을 한 줄씩, 설명은 '자세히'
//  ② 세 가지 한눈에: 당뇨·고혈압·지방간 한 카드에 세 줄. '○○대 남성 중 3번째로 위험 (100명 중)', 숫자·위험/안전만 크게
//     허리 모름이면 '[허리 입력] 하면 바로 확인' + 0–100명 범위 막대 + 보통 허리로 계산한 '예상' 뱃지
//  ③ 생활을 바꾸면 무엇이 달라질까요? 결과 안에 바로. 허리·몸무게 막대(체형 그림), 술은 소주병 −/+ (lib/similar.ts + 연구 근거)
// 계산은 바꾸지 않는다. 빨강은 위험만, 주의는 회색, 황금색 없음(docs/DESIGN.md). 글꼴 프리텐다드 · 자간 −0.5%(index.css)
import { useState, type ReactNode } from 'react';
import { ChevronDown, Share2, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import type { Input } from '../../../engine/src/engine.ts';
import type { Verdict } from '@/lib/verdict';
import { overviewRows, LEVEL_WORD, type Row, type Level } from '@/lib/overview';
import { per100, bodyOf, OUTCOME_NAME, type Outcome } from '@/lib/similar';
import { groupLabel } from '@/lib/view';
import { drinkOf, type Draft } from '@/state';
import { bodyStage } from '@/lib/body';
import { useCharacterSet } from '@/lib/characters';
import { useStore } from '@/ui';
import { ReasonChip } from '@/components/reason-chip';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const IN = 2.54;
/** 판정 문구의 %를 '100명 중 몇 명'으로 (일반 사용자는 %를 잘 읽지 않는다) */
const R = (x: string) => String(Math.max(1, Math.round(parseFloat(x))));
export const plain = (t: string) => t
  .replace(/(\d+(?:\.\d+)?)%에서 (\d+(?:\.\d+)?)%로/g, (_, a: string, b: string) => `100명 중 ${R(a)}명에서 ${R(b)}명으로`)
  .replace(/(\d+(?:\.\d+)?)%로/g, (_, a: string) => `100명 중 ${R(a)}명으로`)
  .replace(/(\d+(?:\.\d+)?)%/g, (_, a: string) => `100명 중 ${R(a)}명`);
/** 여러 줄 설명을 한 문단으로 */
const para = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => (/[요다죠]$/.test(x) ? x + '.' : x)).join(' ');

/** 펼치기 단추 '자세히 ⌄' */
function More({ open, onClick, dark }: { open: boolean; onClick: () => void; dark?: boolean }) {
  return (
    <button type="button" aria-expanded={open} onClick={onClick}
      className={cn('flex shrink-0 cursor-pointer items-center gap-0.5 py-2 pl-1 text-[13px]', dark ? 'text-white/70' : 'text-ink-soft')}>
      자세히<ChevronDown className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} />
    </button>
  );
}

/* ── ① 지금 당장 할 일 ── */
const TAG_BG: Record<Verdict['tier'], string> = { 1: 'bg-risk', 2: 'bg-risk', 5: 'bg-ink-2', 3: 'bg-ink-2', 4: 'bg-good' };
function Todo({ v }: { v: Verdict }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const acts = v.actions.slice(0, v.tier === 1 || v.tier === 2 ? 3 : 2).map((a) =>
    // '내과에서 한 번에 검사받으세요' + 검사 목록은 접으면 안 보이므로 제목에 합친다
    a.t.endsWith('한 번에 검사받으세요') && a.d ? { t: `${a.t.replace(' 검사받으세요', '')}: ${a.d}`, d: '' } : { t: plain(a.t), d: a.d ? plain(para(a.d)) : '' });
  return (
    <section aria-label="할 일" className="flex flex-col rounded-[20px] bg-ink px-5 pt-[18px] pb-2 text-white">
      <div className="flex items-center justify-between pb-1.5">
        <h1 className="text-[15px] font-semibold">{v.tier === 4 ? '이번에 할 일' : '지금 당장 할 일'}</h1>
        <span className={cn('rounded-full px-2.5 py-0.5 text-caption font-semibold text-white', TAG_BG[v.tier])}>{v.tag}</span>
      </div>
      {acts.map((a, k) => (
        <div key={a.t} className="flex flex-col border-t border-white/12">
          <div className="flex items-center gap-3 py-3.5">
            <b className="flex-1 text-[17px] leading-[1.4] font-semibold">{a.t}</b>
            {a.d && <More dark open={!!open[k]} onClick={() => setOpen((o) => ({ ...o, [k]: !o[k] }))} />}
          </div>
          {a.d && open[k] && <p className="mb-3.5 text-body-sm leading-[1.6] text-white/75">{a.d}</p>}
        </div>
      ))}
    </section>
  );
}

/* ── ② 세 가지 한눈에 ── */
type Tone = 'red' | 'green' | 'gray';
const toneOfLevel = (l: Level): Tone => (l >= 3 ? 'red' : l === 0 ? 'green' : 'gray');
const TXT: Record<Tone, string> = { red: 'text-risk', green: 'text-good', gray: 'text-ink' };
const DOT: Record<Tone, string> = { red: 'bg-risk ring-risk', green: 'bg-good ring-good', gray: 'bg-ink ring-ink' };
function Badge({ t, tone, guess }: { t: string; tone: Tone; guess?: boolean }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
    guess ? cn('border border-dashed', tone === 'red' ? 'border-risk text-risk' : tone === 'green' ? 'border-good text-good' : 'border-mute text-ink-2')
      : tone === 'red' ? 'bg-risk-bg text-risk' : tone === 'green' ? 'bg-good-bg text-good' : 'bg-hair text-ink-2')}>{t}</span>;
}
const TEST: Record<string, string> = { htn: '지금 혈압을 재면 고혈압으로', dm: '지금 혈당 검사를 하면 당뇨로', nafld: '지금 복부 초음파를 하면 지방간으로' };
const n100 = (p: number) => (p < 1 ? '1명도 안 돼요.' : `${Math.round(p)}명쯤이에요.`);
const peerTxt = (p: number) => (Math.round(p) < 1 ? '같은 또래도 1명이 안 돼요.' : `같은 또래는 평균 ${Math.round(p)}명이에요.`);

function RowView({ r, inp, first, onWaist }: { r: Row; inp: Input; first: boolean; onWaist: () => void }) {
  const [open, setOpen] = useState(false);
  const g = groupLabel(inp), N = r.num ?? {};
  let badge: ReactNode, stmt: ReactNode, viz: ReactNode = null, more = '';
  if (r.kind === 'prob' && N.me != null) {
    const lv = (r.level ?? 1) as Level, tone = toneOfLevel(lv), rank = N.rank ?? null;
    badge = <Badge t={LEVEL_WORD[lv]} tone={tone} />;
    if (rank != null) {
      const high = rank >= 50, n = high ? 101 - rank : rank;   // 딱 가운데(50)는 위험 쪽으로 센다(뱃지와 엇갈리지 않게)
      stmt = (<>
        <span className="text-[13px] text-ink-soft">{g} 중</span>
        <b className={cn('text-[24px] leading-none font-semibold tabular-nums', TXT[tone])}>{n}</b><span className="text-[13px] text-ink-2">번째로</span>
        <b className={cn('text-[17px] font-semibold', TXT[tone])}>{high ? '위험' : '안전'}</b>
        <span className="text-caption text-mute">(100명 중)</span>
      </>);
      viz = (
        <div role="img" aria-label={`${g} 100명 중 ${n}번째로 ${high ? '위험' : '안전'}`} className="mt-0.5 flex flex-col gap-1">
          <div className="relative h-1.5 rounded-full bg-track">
            <span className={cn('absolute top-1/2 box-border size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white ring-1', DOT[tone])} style={{ left: `${Math.min(97, Math.max(3, rank))}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-[#9a9a96]"><span>안전</span><span>위험</span></div>
        </div>
      );
    } else stmt = <b className={cn('text-[17px] font-semibold', TXT[tone])}>{g}와 견주면 {LEVEL_WORD[lv]}</b>;
    more = `${TEST[r.id]} 나올 사람이 이런 조건에서 100명 중 ${n100(N.me)}${N.peer != null ? ' ' + peerTxt(N.peer) : ''}`;
  } else if (r.kind === 'managed') {
    badge = <Badge t="관리 중" tone="gray" />;
    stmt = <b className="text-[17px] font-semibold">진단 · 관리 중</b>;
    more = r.id === 'dm' ? '약을 챙기고, 해마다 눈(안저)·콩팥·발 검사를 받으세요.' : r.id === 'htn' ? '약을 챙기고, 집에서 잰 혈압을 진료 때 보여 주세요.' : '정기 진료를 이어가세요.';
  } else if (r.kind === 'alert' && r.word === '간 검사 필요') {
    badge = <Badge t="검사 필요" tone="red" />;
    stmt = <b className="text-[17px] font-semibold text-risk">간 수치 검사</b>;
    const gr = N.grams;
    more = `${gr ? `일주일에 소주 약 ${Math.round((gr / 46.9) * 2) / 2}병(알코올 ${Math.round(gr / 10) * 10}g)이에요. ` : ''}지방간 점수는 일주일 ${inp.sex === 'M' ? 140 : 70}g 이하로 마시는 사람에게만 쓸 수 있어서, 피검사로 간을 직접 봐야 해요.`;
  } else if (r.kind === 'alert') {
    badge = <Badge t="기준 이상" tone="red" />;
    stmt = <b className="text-[17px] font-semibold text-risk">{r.side.replace(/ \(.*\)$/, '')}</b>;
    more = `${r.side}. 한 번의 검사로 진단하지 않으니 다시 재거나 추가 검사를 받아요.`;
  } else if (r.kind === 'range' && N.lo != null && N.hi != null) {
    const lo = N.lo, hi = N.hi, gl = r.guess;
    badge = <><Badge t="허리 모름" tone="gray" />{gl != null && <Badge guess t={`${LEVEL_WORD[gl]} 예상`} tone={toneOfLevel(gl)} />}</>;
    stmt = (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <button type="button" onClick={onWaist} className="cursor-pointer rounded-full bg-ink px-3 py-1 text-[13px] font-semibold text-white">허리 입력</button>
        <span className="text-body-sm font-medium text-ink-2">하면 바로 확인</span>
      </span>
    );
    // 막대는 '100명 중 몇 명'(0–100) 기준. 숫자 글씨는 막대 끝에서 4px 안쪽(시작 근처 0–8명은 같은 자리)
    viz = (
      <div role="img" aria-label={`허리에 따라 100명 중 ${lo}명에서 ${hi}명 사이`} className="mt-0.5 flex flex-col gap-1">
        <div className="relative h-[18px] text-[13px] font-semibold tabular-nums">
          <span className="absolute bottom-0" style={lo < 8 ? { left: 4 } : { left: `${lo}%`, transform: 'translateX(-100%)', paddingRight: 3 }}>{lo}명</span>
          <span className="absolute bottom-0" style={hi > 92 ? { right: 4 } : lo < 8 && hi < 16 ? { left: 36 } : { left: `${hi}%`, paddingLeft: 3 }}>{hi}명</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-track">
          <span className="absolute inset-y-0 rounded-full" style={{ left: `${lo}%`, width: `${Math.max(1.5, hi - lo)}%`, background: 'repeating-linear-gradient(90deg,#8a8a86 0 4px,#b5b5b1 4px 8px)' }} />
        </div>
        <div className="flex justify-between text-[11px] text-[#9a9a96]"><span>0명</span><span className="text-ink-2">100명 중 · 허리에 따라 이 사이</span><span>100명</span></div>
      </div>
    );
    more = `${TEST[r.id]} 나올 사람이, 허리가 가늘면 100명 중 ${lo}명, 굵으면 ${hi}명쯤이에요.${N.peer != null ? ' ' + peerTxt(N.peer) : ''}${gl != null ? ` 같은 키·몸무게 ${g}의 보통 허리로 계산하면 '${LEVEL_WORD[gl]}'이에요.` : ''}`;
  } else if (r.kind === 'gray' && r.word === '당뇨 전 단계') {
    badge = <Badge t="전 단계" tone="gray" />;
    stmt = <b className="text-[17px] font-semibold">당뇨 전 단계</b>;
    more = `${r.side}. 당화혈색소 검사로 한 번 더 확인하고, 단 음료·간식을 줄여요.`;
  } else {
    badge = <Badge t={r.word} tone="gray" />;
    stmt = <b className="text-[17px] font-semibold">{r.word}</b>;
    more = r.side;
  }
  const why = r.kind === 'prob' ? r.chips.filter((c) => c.tone === 'up') : [];
  return (
    <div className={cn('flex flex-col gap-2 py-4', !first && 'border-t border-hair')}>
      <div className="flex items-center gap-1.5">{badge}</div>
      <div className="flex items-center gap-3">
        <b className="w-[52px] flex-none text-[17px] font-semibold">{r.name}</b>
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1">{stmt}</div>
        <More open={open} onClick={() => setOpen((x) => !x)} />
      </div>
      {viz}
      {open && (
        <div className="flex flex-col gap-2 rounded-[12px] bg-paper px-3.5 py-3">
          <p className="text-body-sm leading-[1.6] text-[#333]">{more}</p>
          {why.length > 0 && <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">왜? {why.slice(0, 3).map((c) => <ReasonChip key={c.t} c={{ ...c, t: c.t.replace(/ \+\d+$/, '') }} quiet />)}</div>}
        </div>
      )}
    </div>
  );
}
const sev = (r: Row) => (r.kind === 'alert' ? 5 : r.kind === 'prob' ? r.level ?? 0 : r.kind === 'range' ? 1.5 + (r.guess ?? 0) / 10 : r.kind === 'managed' ? 0.5 : 0);

/* ── 허리 입력 시트 ── */
function WaistSheet({ open, onOpenChange, inp }: { open: boolean; onOpenChange: (v: boolean) => void; inp: Input }) {
  const { setDraft } = useStore();
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [v, setV] = useState(Math.round((inp.sex === 'F' ? 80 : 86) / IN));   // 처음 숫자: 같은 성별의 흔한 허리
  const lim = unit === 'in' ? [22, 50] : [56, 127];
  const set = (x: number) => setV(Math.min(lim[1], Math.max(lim[0], x)));
  const swap = (u: 'in' | 'cm') => { if (u === unit) return; setV(u === 'cm' ? Math.round(v * IN) : Math.round(v / IN)); setUnit(u); };
  const ok = () => {
    setDraft((d: Draft) => ({ ...d, waist: String(v), waistUnit: unit, waistUnitChosen: true, waistUnknown: false }));
    onOpenChange(false);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby="waist-desc">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <SheetTitle className="text-[19px] leading-[1.4] font-semibold">허리둘레를 알려 주세요</SheetTitle>
            <SheetDescription id="waist-desc" className="text-[13px] leading-[1.55] text-ink-soft">줄자로 배꼽 높이를 한 바퀴 재요. 모르면 바지 허리 사이즈를 넣어도 돼요.</SheetDescription>
          </div>
          <div role="group" aria-label="단위" className="flex flex-none gap-0.5 rounded-[9px] bg-[#f0f0ed] p-[3px]">
            {(['in', 'cm'] as const).map((u) => (
              <button key={u} type="button" aria-pressed={unit === u} onClick={() => swap(u)}
                className={cn('h-8 cursor-pointer rounded-[7px] px-3 text-[13px] font-semibold', unit === u ? 'bg-ink text-white' : 'text-ink-soft')}>{u === 'in' ? '인치' : 'cm'}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-5">
          <button type="button" aria-label="줄이기" onClick={() => set(v - 1)} className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-[#f0f0ed]"><Minus className="size-5" /></button>
          <div className="flex min-w-[120px] items-baseline justify-center gap-1.5"><b className="text-[44px] leading-none font-semibold tabular-nums">{v}</b><span className="text-[17px] text-ink-soft">{unit === 'in' ? '인치' : 'cm'}</span></div>
          <button type="button" aria-label="늘리기" onClick={() => set(v + 1)} className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-[#f0f0ed]"><Plus className="size-5" /></button>
        </div>
        <input type="range" className="range-v4" aria-label="허리둘레" min={lim[0]} max={lim[1]} step={1} value={v} onChange={(e) => set(Number(e.target.value))} />
        <span className="-mt-2.5 text-center text-caption text-mute">{unit === 'in' ? `약 ${Math.round(v * IN)}cm` : `약 ${Math.round(v / IN)}인치`}</span>
        <button type="button" onClick={ok} className="h-[52px] cursor-pointer rounded-[14px] bg-ink text-body font-semibold text-white">확인</button>
      </SheetContent>
    </Sheet>
  );
}

/* ── ③ 생활을 바꾸면 무엇이 달라질까요? ── */
type Tab = 'waist' | 'weight' | 'alc';
interface Study { t: string; src: string }
function studies(tab: Tab, i: Input, gDay: number): Study[] {
  if (tab === 'waist') return [{ t: `${i.sex === 'F' ? '여성 허리 기준은 85cm(33인치)' : '남성 허리 기준은 90cm(35인치)'}예요. 이보다 크면 복부비만으로 봐요.`, src: '대한비만학회 2022' }];
  if (tab === 'weight') {
    const out: Study[] = [];
    if (i.dx.dm) out.push({ t: '당뇨를 진단받고 10–15kg 뺀 사람은 57%, 15kg 이상 뺀 사람은 86%가 1년 뒤 약 없이 정상 혈당이었어요.', src: 'DiRECT · Lancet 2018' });
    else if (i.weightKg / (i.heightCm / 100) ** 2 >= 23) out.push({ t: '당뇨 전 단계인 사람은 몸무게를 1kg 뺄 때마다 당뇨가 생길 위험이 16%씩 줄었어요.', src: 'DPP · Diabetes Care 2006' });
    out.push({ t: '몸무게를 1kg 뺄 때마다 위 혈압이 평균 약 1 내려갔어요(평균 5kg 뺀 연구들).', src: 'Hypertension 2003' });
    return out;
  }
  const out: Study[] = [];
  if (gDay > 24) out.push({ t: '하루 2잔 넘게 마시던 사람이 술을 줄이면 위 혈압이 평균 5.5 내려갔어요.', src: 'Lancet Public Health 2017' });
  if (gDay >= 30) out.push({ t: '많이 마시던 한국인이 양을 줄이면, 계속 마신 사람보다 술 관련 암이 약 8–9% 적었어요.', src: '건보공단 451만 명 · JAMA Netw Open 2022' });
  return out;
}
/**
 * 소주병 아이콘 (흑백 선 아이콘, 실제 소주병 비율): 넓은 몸통 · 꺾인 어깨 · 위로 곧게 좁아지는 긴 목 · 줄무늬 뚜껑.
 * 체형 그림과 같은 84×126 칸에 세운다. 마신 양만큼 아래부터 검정으로 찬다.
 */
function Bottle({ n, max }: { n: number; max: number }) {
  const BODY = 'M22 15L18.5 44Q18 46 16.6 47.6L9.4 56.4Q8 58 8 60V120Q8 124 12 124H48Q52 124 52 120V60Q52 58 50.6 56.4L43.4 47.6Q42 46 41.5 44L38 15Z';
  const top = 46, bottom = 124, y = bottom - Math.round((bottom - top) * Math.min(1, n / max));
  return (
    <svg width="84" height="126" viewBox="-12 0 84 126" role="img" aria-label={`소주병 ${n}병`} className="flex-none text-ink">
      <defs><clipPath id="soju-body"><path d={BODY} /></clipPath></defs>
      <path d={BODY} fill="#fff" />
      <g clipPath="url(#soju-body)"><rect x="-12" y={y} width="84" height="126" fill="currentColor" style={{ transition: 'y .3s ease' }} /></g>
      <path d={BODY} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <rect x="20.5" y="2" width="19" height="13" rx="3" fill="#fff" stroke="currentColor" strokeWidth="2" />
      <line x1="22.5" x2="37.5" y1="6.5" y2="6.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="22.5" x2="37.5" y1="9.5" y2="9.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function Change({ inp }: { inp: Input }) {
  const b0 = bodyOf(inp), d = drinkOf(inp), hasWaist = inp.waistCm != null;
  const in0 = Math.round(b0.waistCm / IN), kg0 = Math.round(inp.weightKg), times = d?.timesPerWeek ?? 0;
  const bt0 = d ? Math.round((d.perOccasion / 7) * 2) / 2 : 0;
  const tabs: Tab[] = [...(hasWaist ? ['waist' as Tab] : []), 'weight', ...(d ? ['alc' as Tab] : [])];
  const [tab0, setTab] = useState<Tab>(tabs[0]);
  const tab = tabs.includes(tab0) ? tab0 : tabs[0];
  const [wIn, setWIn] = useState(in0), [kg, setKg] = useState(kg0), [bt, setBt] = useState(bt0), [touched, setTouched] = useState(false);
  const h2 = (inp.heightCm / 100) ** 2, g = groupLabel(inp), cut = inp.sex === 'F' ? 85 : 90, cutIn = inp.sex === 'F' ? 33 : 35;
  const charSet = useCharacterSet(inp.sex, inp.age);
  const TL: Record<Tab, string> = { waist: '허리', weight: '몸무게', alc: '술' };

  const after = { ...b0, waistCm: tab === 'waist' && wIn !== in0 ? wIn * IN : b0.waistCm, bmi: tab === 'weight' ? kg / h2 : b0.bmi, glassesPerDay: tab === 'alc' ? bt * times : b0.glassesPerDay };
  const outs = (['bp', 'dm', 'alt', 'tg'] as Outcome[]).filter((o) => !(o === 'bp' && inp.dx.htn) && !(o === 'dm' && inp.dx.dm));
  const rows = outs.map((o) => ({ o, now: per100(o, b0), af: per100(o, after) }));
  const lead = rows[0], diff = lead.now - lead.af;
  const val = tab === 'waist' ? wIn : tab === 'weight' ? kg : bt, now = tab === 'waist' ? in0 : tab === 'weight' ? kg0 : bt0;
  const moved = val !== now, dv = Math.round((val - now) * 10) / 10, unit = tab === 'waist' ? '인치' : tab === 'weight' ? 'kg' : '병';
  const who = tab === 'waist' ? `허리 ${wIn}인치인 사람들은` : tab === 'weight' ? `몸무게 ${kg}kg인 사람들은` : bt === 0 ? '술을 안 마시는 사람들은' : `소주를 한 번에 ${bt}병 마시는 사람들은`;
  const st = moved ? studies(tab, inp, b0.glassesPerDay * 6.7) : [];
  // 체형 그림: 몸무게 = 단계(가까운 그림), 허리 = 배(기준 이상이면 배 나온 그림)
  const stage = Math.min(5, Math.max(1, Math.round(bodyStage(inp.heightCm, tab === 'weight' ? kg : inp.weightKg))));
  const belly = hasWaist && (tab === 'waist' ? wIn * IN : inp.waistCm!) >= cut;
  const pic = charSet ? (belly ? charSet.bellyFiles : charSet.files)[stage - 1] : null;
  const std = `표준 ${Math.ceil(18.5 * h2)}–${Math.floor(23 * h2 - 0.05)}kg`;
  const btMax = Math.max(3, bt0 + 1);
  const range = tab === 'waist' ? [Math.max(22, in0 - 10), in0 + 6] : tab === 'weight' ? [Math.max(35, kg0 - 20), kg0 + 10] : [0, btMax];

  return (
    <section aria-label="생활을 바꾸면 무엇이 달라질까요" className="flex flex-col gap-4 rounded-[20px] bg-white p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-[19px] leading-[1.4] font-semibold">생활을 바꾸면 무엇이 달라질까요?</h2>
        <p className="text-[13px] leading-[1.55] text-ink-soft">같은 {g} 중 {tabs.map((t) => TL[t]).join('·')}이 다른 사람들의 실제 검진 결과예요.</p>
      </div>
      {!hasWaist && <p className="rounded-[12px] bg-paper px-3 py-2.5 text-[13px] leading-[1.55] text-ink-2">허리를 넣으면 허리도 바꿔 볼 수 있어요. 줄자로 배꼽 높이를 재 보세요.</p>}
      {tabs.length > 1 && (
        <div role="tablist" aria-label="바꿔 볼 것" className="grid gap-1 rounded-[12px] bg-[#f0f0ed] p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn('h-10 cursor-pointer rounded-[9px] text-body-sm font-semibold', tab === t ? 'bg-ink text-white' : 'text-ink-soft')}>{TL[t]}</button>)}
        </div>
      )}

      {/* 허리 · 몸무게 · 술 모두 같은 틀: 왼쪽 그림(84×126) → 이름 · 큰 숫자 + 작은 단위 · 지금/기준 한 줄 → 아래 게이지 바 */}
      <div className="flex items-end gap-3.5">
        {tab === 'alc' ? <Bottle n={bt} max={btMax} />
          : pic ? <img src={pic} alt="지금 체형 그림" className="h-[126px] w-[84px] flex-none object-contain object-bottom" /> : <span className="h-[126px] w-[84px] flex-none" />}
        <div className="flex flex-1 flex-col gap-1 pb-1.5">
          <span className="text-[13px] text-ink-soft">{tab === 'waist' ? '허리둘레' : tab === 'weight' ? '몸무게' : '한 번에 마시는 소주'}</span>
          <div className="flex items-baseline gap-1.5">
            <b className="text-[30px] leading-none font-semibold tabular-nums">{val}</b><span className="text-[15px] text-ink-soft">{unit}</span>
            {moved && <span className={cn('ml-1 rounded-full px-2 py-0.5 text-caption font-semibold', dv < 0 ? 'bg-good-bg text-good' : 'bg-risk-bg text-risk')}>{dv > 0 ? '+' : '−'}{Math.abs(dv)}{unit}</span>}
          </div>
          <span className="text-caption text-mute">지금 {now}{unit} · {tab === 'waist' ? `기준 ${cutIn}인치까지` : tab === 'weight' ? std : `일주일에 ${times}번쯤`}</span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <input type="range" className="range-v4" aria-label={`${tab === 'waist' ? '허리둘레' : tab === 'weight' ? '몸무게' : '한 번에 마시는 소주'} 바꿔 보기`} aria-valuetext={`${val}${unit}`}
          min={range[0]} max={range[1]} step={tab === 'alc' ? 0.5 : 1} value={val}
          onChange={(e) => { setTouched(true); (tab === 'waist' ? setWIn : tab === 'weight' ? setKg : setBt)(Number(e.target.value)); }} />
        {!touched && (
          <div className="flex items-center justify-center gap-2 text-[13px] font-medium">
            <ChevronLeft className="size-4 motion-safe:animate-[nudge-l_1.1s_ease-in-out_infinite]" aria-hidden />게이지 바를 움직여 보세요<ChevronRight className="size-4 motion-safe:animate-[nudge-r_1.1s_ease-in-out_infinite]" aria-hidden />
          </div>
        )}
      </div>

      <div aria-live="polite" className="flex flex-col gap-3.5 rounded-[16px] bg-paper p-4">
        {moved ? (
          <div className="flex flex-col gap-2">
            <p className="text-[15px] leading-[1.5] text-[#333]">{who}<br /><b className="font-semibold text-ink">{OUTCOME_NAME[lead.o]}이 100명 중 </b><b className="text-[22px] font-semibold text-ink tabular-nums">{lead.af}</b><b className="font-semibold text-ink">명</b></p>
            <span className={cn('self-start rounded-full px-2.5 py-0.5 text-caption font-semibold', diff > 0 ? 'bg-good-bg text-good' : diff < 0 ? 'bg-risk-bg text-risk' : 'bg-[#e6e6e3] text-ink-2')}>
              {diff > 0 ? `지금보다 ${diff}명 적어요` : diff < 0 ? `지금보다 ${-diff}명 많아요` : '지금과 같아요'}
            </span>
          </div>
        ) : <p className="text-[15px] leading-[1.5] text-[#333]">지금 같은 사람들 100명 중</p>}
        {rows.map(({ o, now: n, af }) => {
          const col = af < n ? 'good' : af > n ? 'risk' : 'ink';
          return (
            <div key={o} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-ink-2">{OUTCOME_NAME[o]}</span>
                <span className="flex items-baseline gap-1.5">
                  {af !== n && <s className="text-caption text-[#9a9a96] tabular-nums">{n}명</s>}
                  <b className={cn('text-[18px] leading-none font-semibold tabular-nums', col === 'good' ? 'text-good' : col === 'risk' ? 'text-risk' : 'text-ink')}>{af}</b><span className="text-caption text-ink-soft">명</span>
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-[#e6e6e3]">
                <div className="absolute inset-y-0 left-0 rounded-full bg-[#c9c9c5]" style={{ width: `${n}%` }} />
                <div className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-300', col === 'good' ? 'bg-good' : col === 'risk' ? 'bg-risk' : 'bg-ink')} style={{ width: `${af}%` }} />
              </div>
            </div>
          );
        })}
        <p className="text-[11px] leading-[1.6] text-mute">국민건강영양조사(2022–2024) · 체형·습관이 비슷한 사람끼리 비교한 결과로, 바꾸면 꼭 이만큼 달라진다는 뜻은 아니에요.{!hasWaist && ' 허리를 몰라서 보통 허리로 계산했어요.'}</p>
      </div>

      {st.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">실제로 바꾼 사람들은</span>
          {st.map((s) => <p key={s.t} className="text-[13px] leading-[1.6] text-ink-2">{s.t} <span className="text-[11px] text-[#9a9a96]">{s.src}</span></p>)}
        </div>
      )}
    </section>
  );
}

/* ── 화면 ── */
export function ResultTop({ inp, v, who, onShare }: { inp: Input; v: Verdict; who: string; onShare?: () => void }) {
  const rows = [...overviewRows(inp)].sort((a, b) => sev(b) - sev(a));
  const [sheet, setSheet] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <header className="flex h-11 items-center justify-between">
        <span className="text-[13px] text-ink-soft">{who}</span>
        {onShare && <button type="button" aria-label="카톡으로 보내기" onClick={onShare} className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-ink text-white"><Share2 className="size-[18px]" /></button>}
      </header>
      <Todo v={v} />
      <section aria-label="세 가지 한눈에" className="flex flex-col rounded-[20px] bg-white px-5 py-1.5">
        {rows.map((r, k) => <RowView key={r.id} r={r} inp={inp} first={k === 0} onWaist={() => setSheet(true)} />)}
      </section>
      <Change key={`${inp.waistCm}-${inp.weightKg}`} inp={inp} />
      <WaistSheet open={sheet} onOpenChange={setSheet} inp={inp} />
    </div>
  );
}
