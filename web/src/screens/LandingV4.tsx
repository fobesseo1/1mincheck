// 첫 화면 (2026-10-15, Claude 디자인 캔버스 'Landing' 그대로) — 무채색. 예전 랜딩(Landing.tsx·LandingScenes 등)은 파일로 남겨 둔다.
//  어두운 첫 화면(큰 제목 · 버튼 · 기기 틀 속 결과 화면) → 또래 비교(결과 화면 세 줄 그대로) → 생활을 바꾸면(결과 화면 부품 그대로)
//  → 10초 간단 체험(같은 체형 한국인 통계, 세 줄 모양) → 검진 풀이 → 자주 묻는 질문 → 마무리
//  숫자와 단위는 붙이고, 문장 끝에서 줄을 바꾼다(docs/DESIGN.md 8장). 진초록은 로고 칸에만 쓰지 않고 잉크로.
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { suggestScenario, type AppInput } from '../state.ts';
import { verdict } from '../lib/verdict.ts';
import { viewResults } from '../lib/view.ts';
import { useStore, Fields } from '../ui.tsx';
import { loadMini, miniDraft, miniError, miniResults, miniHeadline, MINI_KEY } from './MiniTrial.tsx';
import { overviewRows } from '../lib/overview.ts';
import { labCards } from '../lib/labZones.ts';
import { RowView, Badge, Change, sev, type Tone } from '@/components/result-v4';
import { Segmented } from '@/components/ui/segmented';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { NOT_DIAGNOSIS } from '../lib/content.ts';
import { cn } from '@/lib/utils';

/** 예시 인물 (52세 남성 · 172cm · 82kg · 허리 36인치) */
const EX: AppInput = { age: 52, sex: 'M', heightCm: 172, weightKg: 82, waistCm: 92, smoke: 'never', alcohol: 'lt1', famDM: false, dx: { htn: false, dm: false, chol: false }, bp: 'normal', exercise: false, meno: null };
const EX_LABS = labCards({ sbp: 152, dbp: 96, glu: 108, upro: 0 }, 'M');
const FAQ: [string, string][] = [
  ['검사 없이 무엇을 알 수 있나요?', `몸 정보와 생활습관으로 지금 당뇨·고혈압·지방간일 가능성을 가늠하고, 같은 또래와 견줘요.\n몸무게·허리·술을 바꾸면 어떻게 달라지는지도 볼 수 있어요.\n${NOT_DIAGNOSIS}`],
  ['몇 번째인지는 어떻게 계산하나요?', '국민건강영양조사(2022–2024)에서 성별·나이대가 같고 아직 진단받지 않은 한국인에게 같은 계산을 적용해 줄 세운 자리예요.\n실제로 100명을 모아 검사한 순위는 아니에요.'],
  ['건강정보는 어디에 저장되나요?', '서버로 보내지 않고 이 기기 안에서만 계산해요.\n결과 기록은 ‘기록 저장’을 눌렀을 때만 이 기기에 남아요.' + (__ANALYTICS__ ? '\n사이트 방문 수만 익명으로 세요.' : '')],
  ['누가 이용할 수 있나요?', '만 19세 이상 성인을 위한 참고 정보예요.\n앱 설치 없이 웹에서 바로 쓸 수 있어요.'],
];

function jump(e: MouseEvent<HTMLAnchorElement>, id: string) {
  const el = document.getElementById(id); if (!el) return; e.preventDefault();
  el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}
/** 체크 시작: 10초 체험에서 넣은 값이 있으면 채워서 바로 기본정보로 */
function Start({ children = '1분 건강 체크하기', light, className }: { children?: ReactNode; light?: boolean; className?: string }) {
  const { setDraft } = useStore();
  const go = (e: MouseEvent<HTMLAnchorElement>) => { const m = loadMini(); if (m) { e.preventDefault(); setDraft((d) => ({ ...d, ...miniDraft(m) })); location.hash = '#/info'; } };
  return (
    <a href="#/start" onClick={go} className={cn('flex h-14 items-center justify-center gap-2 rounded-[14px] text-[17px] font-semibold no-underline', light ? 'bg-white text-ink' : 'bg-ink text-white', className)}>
      {children}<ArrowRight className="size-[18px]" />
    </a>
  );
}
const Eyebrow = ({ children }: { children: ReactNode }) => <span className="text-[13px] font-semibold text-ink-soft">{children}</span>;
const H2 = ({ children }: { children: ReactNode }) => <h2 className="m-0 text-[24px] leading-[1.35] font-bold">{children}</h2>;
const Lead = ({ children }: { children: ReactNode }) => <p className="m-0 text-[15px] leading-[1.6] text-ink-soft">{children}</p>;

/** 기기 틀 속 결과 화면 (실제 부품을 작게) */
function Device() {
  const rows = [...overviewRows(EX)].sort((a, b) => sev(b) - sev(a));
  const sc = suggestScenario(EX), todo = verdict(EX, viewResults(EX, sc), sc).actions[0]?.t ?? '';   // 결과 화면과 같은 판정의 첫 할 일
  return (
    <div aria-hidden className="mx-auto mt-2 h-[400px] w-[260px] rounded-[36px] bg-[#2a2b29] p-2 shadow-[0_24px_60px_rgba(0,0,0,.45)]">
      <div className="h-full overflow-hidden rounded-[28px] bg-paper px-3 pt-7 pb-3 text-ink">
        <div className="pointer-events-none w-[390px] origin-top-left scale-[.604]">
          <div className="mb-3 flex flex-col gap-1 rounded-[20px] bg-ink px-5 py-4 text-white"><span className="text-[13px] text-[#b5b5b5]">지금 당장 할 일</span><b className="text-[17px] font-semibold">{todo}</b></div>
          <div className="flex flex-col rounded-[20px] bg-white px-5 py-1.5">{rows.map((r, k) => <RowView key={r.id} r={r} inp={EX} first={k === 0} onWaist={() => {}} />)}</div>
        </div>
      </div>
    </div>
  );
}

/** 10초 간단 체험: 성별·나이·키·몸무게 → 같은 체형 한국인 통계 세 줄 */
function Try() {
  const saved = loadMini();
  const [sex, setSex] = useState<'M' | 'F' | null>(saved?.sex ?? null), [age, setAge] = useState(saved?.age ?? ''), [h, setH] = useState(saved?.h ?? ''), [w, setW] = useState(saved?.w ?? '');
  const err = miniError(age, h, w, sex);
  const res = !err && sex ? miniResults(Number(age), sex, Number(h), Number(w)) : null;
  // 넣은 값은 이 탭 세션에만(서버 전송 없음). 기본정보 화면이 이어받는다
  useEffect(() => {
    try {
      const hd = res ? miniHeadline(res.rows) : null;
      if (!sex && !age && !h && !w) sessionStorage.removeItem(MINI_KEY);
      else sessionStorage.setItem(MINI_KEY, JSON.stringify({ sex, age, h, w, ...(hd ? { tone: hd.tone, title: hd.title } : {}) }));
    } catch { /* 저장소 없음 */ }
  }, [sex, age, h, w]);   // eslint-disable-line react-hooks/exhaustive-deps
  const field = (id: string, label: string, unit: string, v: string, set: (s: string) => void) => (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <span className="flex h-[52px] items-baseline justify-between rounded-[12px] border-[1.5px] border-sand px-3 pt-3.5 focus-within:border-ink focus-within:border-2">
        <input id={id} inputMode="numeric" value={v} placeholder="0" onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ''))}
          className="w-full min-w-0 border-0 bg-transparent p-0 text-[17px] leading-none font-semibold tabular-nums outline-none placeholder:text-[#c4c4c0]" />
        <span className="flex-none text-[13px] text-mute">{unit}</span>
      </span>
    </label>
  );
  return (
    <div className="flex flex-col gap-3.5 rounded-card bg-white p-5">
      <Segmented options={[{ v: 'M' as const, t: '남성' }, { v: 'F' as const, t: '여성' }]} value={sex} onChange={setSex} label="성별" />
      <div className="grid grid-cols-3 gap-2">
        {field('try-age', '나이', '세', age, setAge)}
        {field('try-h', '키', 'cm', h, setH)}
        {field('try-w', '몸무게', 'kg', w, setW)}
      </div>
      {res ? (<>
        <div className="flex flex-col border-t border-hair pt-1.5">
          {res.rows.map((r, k) => {
            const x = r.pct != null && r.all ? r.pct / r.all : 1;
            const [word, tone]: [string, Tone] = x >= 1.5 ? ['높은 편', 'red'] : x >= 1.15 ? ['조금 높은 편', 'gray'] : x <= 0.85 ? ['낮은 편', 'green'] : ['또래와 비슷', 'gray'];
            return (
              <div key={r.id} className={cn('flex flex-wrap items-center gap-x-2.5 gap-y-1 py-2.5', k > 0 && 'border-t border-hair')}>
                <Badge t={word} tone={tone} />
                <b className="text-[15px] font-semibold">{r.name}</b>
                <span className="flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-[13px] text-ink-soft">100명 중</span>
                  <b className={cn('text-[17px] leading-none font-bold tabular-nums', tone === 'red' && 'text-risk', tone === 'green' && 'text-good')}>{r.pct == null ? '–' : Math.max(1, Math.round(r.pct))}<span className="text-[13px] font-normal text-ink-soft">명</span></b>
                </span>
                {r.all != null && <span className="whitespace-nowrap text-[12px] text-mute">/ 또래 평균 {Math.round(r.all)}명</span>}
              </div>
            );
          })}
        </div>
        <p className="m-0 rounded-[12px] bg-paper px-3 py-2.5 text-[13px] leading-[1.55] text-ink-2">{res.group} · {res.bmiLabel} 한국인 통계예요.<br />허리와 생활습관까지 넣으면<br />나에게 맞춰 다시 계산해요.</p>
        <Start className="h-[52px] text-[16px]">이어서 1분 체크하기</Start>
      </>) : (
        <p className="m-0 min-h-5 text-center text-[13px] text-mute">{age || h || w || sex ? err : '네 가지를 넣으면 바로 보여 드려요'}</p>
      )}
    </div>
  );
}

const LAB_TONE: Record<string, Tone> = { ok: 'green', mid: 'gray', high: 'red', urgent: 'red' };

export function LandingV4() {
  const rows = [...overviewRows(EX)].sort((a, b) => sev(b) - sev(a));
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <Fields />
      <div className="mx-auto max-w-[480px]">
        {/* 첫 화면 */}
        <section className="relative flex flex-col gap-5 rounded-b-[28px] bg-[#141513] px-5 pt-4 pb-10 text-white">
          <header className="flex h-11 items-center justify-between">
            <a href="#/" aria-label="1분체크 처음으로" className="flex items-center gap-2 text-[17px] font-bold text-white no-underline">
              <span className="flex size-6 items-center justify-center rounded-lg bg-white"><i className="size-2 rounded-full bg-ink" /></span>1분체크
            </a>
            <a href="#/labs" className="text-[13px] font-semibold text-[#d4d4d0] no-underline">검진 풀이</a>
          </header>
          <span className="mt-6 self-start rounded-full border border-white/[.22] px-2.5 py-1 text-[12px] font-semibold text-[#d4d4d0]">국가 건강통계 · 한국인 연구 바탕</span>
          <h1 className="m-0 text-[34px] leading-[1.25] font-bold tracking-[-0.02em] text-white">1분이면,<br />또래 100명 중<br />내 자리가 보여요</h1>
          <p className="m-0 text-[15px] leading-[1.6] text-[#b5b5b5]">검사 없이 키·몸무게·생활습관으로<br />당뇨·고혈압·지방간을 가늠해요.</p>
          <div className="flex flex-col gap-2.5">
            <Start light />
            <a href="#try" onClick={(e) => jump(e, 'try')} className="flex h-[52px] items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-white/[.28] text-[16px] font-semibold text-white no-underline">10초 간단 체험<ChevronDown className="size-4" /></a>
          </div>
          <p className="m-0 text-center text-[12px] text-mute">만 19세 이상 · 건강정보는 서버로 보내지 않아요</p>
          <Device />
        </section>

        <div className="mt-12 flex flex-col gap-14 px-5">
          {/* 또래 비교 */}
          <section id="peer" className="flex flex-col gap-4">
            <Eyebrow>또래 비교</Eyebrow>
            <H2>세 가지를 한눈에,<br />또래 100명 중 몇 번째인지</H2>
            <Lead>국민건강영양조사에서<br />성별·나이가 같은 한국인과 비교해요.</Lead>
            <div className="flex flex-col rounded-card bg-white px-5 py-1.5">{rows.map((r, k) => <RowView key={r.id} r={r} inp={EX} first={k === 0} onWaist={() => {}} />)}</div>
            <p className="m-0 text-[12px] text-mute">예시: 52세 남성 · 172cm · 82kg · 허리 36인치</p>
          </section>

          {/* 생활을 바꾸면 */}
          <section id="change" className="flex flex-col gap-4">
            <Eyebrow>생활을 바꾸면</Eyebrow>
            <H2>허리 2인치,<br />무엇이 달라질까요?</H2>
            <Lead>허리·몸무게·술을 직접 움직여 보면,<br />100명 중 몇 명인지 바로 바뀌어요.</Lead>
            <Change inp={EX} />
          </section>

          {/* 10초 간단 체험 */}
          <section id="try" className="flex scroll-mt-6 flex-col gap-4">
            <Eyebrow>10초 간단 체험</Eyebrow>
            <H2>네 가지만 넣어 보세요</H2>
            <Try />
          </section>

          {/* 검진 풀이 */}
          <section id="labs" className="flex flex-col gap-4">
            <Eyebrow>검진 풀이</Eyebrow>
            <H2>건강검진 숫자,<br />쉬운 말로 풀어 드려요</H2>
            <div className="flex flex-col rounded-card bg-white px-5 py-1.5">
              {EX_LABS.map((c, k) => {
                const tone = LAB_TONE[c.tone];
                return (
                  <div key={c.key} className={cn('flex items-center gap-3 py-3.5', k > 0 && 'border-t border-hair')}>
                    <b className="w-[84px] flex-none text-[15px] font-semibold">{c.title.replace(/ \(.*\)$/, '')}</b>
                    <b className={cn('flex-1 font-semibold tabular-nums', c.key === 'upro' ? 'text-[17px]' : 'text-[20px]', tone === 'red' && 'text-risk', tone === 'green' && 'text-good')}>{c.value}</b>
                    <Badge t={c.zone} tone={tone} />
                  </div>
                );
              })}
            </div>
            <a href="#/labs" className="flex h-[52px] items-center justify-center rounded-[14px] border-[1.5px] border-sand bg-white text-[16px] font-semibold text-ink no-underline">검진 숫자 넣어 보기</a>
          </section>

          {/* 자주 묻는 질문 */}
          <section id="faq" className="flex flex-col gap-3">
            <h2 className="m-0 text-[24px] font-bold">자주 묻는 질문</h2>
            <Accordion type="single" collapsible className="flex flex-col rounded-card bg-white px-5">
              {FAQ.map(([q, a], i) => (
                <AccordionItem key={q} value={String(i)} className={cn('rounded-none bg-transparent', i > 0 && 'border-t border-hair')}>
                  <AccordionTrigger className="py-4 text-left text-[15px] font-semibold">{q}</AccordionTrigger>
                  <AccordionContent className="pb-4 text-body-sm leading-[1.6] whitespace-pre-line text-ink-2">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </div>

        {/* 마무리 */}
        <section className="mt-14 flex flex-col gap-[18px] rounded-t-[28px] bg-[#141513] px-5 py-12 text-white">
          <h2 className="m-0 text-[26px] leading-[1.35] font-bold text-white">내 몸이 궁금하다면,<br />지금 확인해 보세요</h2>
          <Start light />
          <p className="m-0 text-[12px] leading-[1.6] text-mute">내 기기 안에서만 계산 · 논문과 국가 통계 바탕 · 무료, 가입 없음</p>
          <footer className="flex flex-col gap-2 border-t border-white/[.12] pt-[18px] text-[12px] text-mute">
            <nav aria-label="바닥글 메뉴" className="flex flex-wrap gap-x-4 gap-y-1">
              <a href="#/start" className="text-[#d4d4d0] no-underline">1분 건강 체크하기</a>
              <a href="#/labs" className="text-[#d4d4d0] no-underline">검진 수치 풀이</a>
              <a href="#/record" className="text-[#d4d4d0] no-underline">지난 결과 비교</a>
            </nav>
            <span>국민건강영양조사 · 한국인 추적 연구 · <a href="https://www.kdca.go.kr/" target="_blank" rel="noreferrer" className="text-mute">질병관리청</a></span>
            <span>질환 여부는 검사와 진료로 확인해 주세요.</span>
            <span>© 2026 1분체크</span>
          </footer>
        </section>
      </div>
    </div>
  );
}
