import './landing.css';
import type React from 'react';
import { viewResults } from '../lib/view.ts';
import { verdictB, probB, B_NAME } from '../lib/b.ts';
import { Icon } from '../ui.tsx';
import { MiniTrial, loadMini, miniDraft, MINI_CTA } from './MiniTrial.tsx';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../ui.tsx';
import { toInput, suggestScenario, type AppInput } from '../state.ts';

/** 미니 체험 결과(탭 세션)를 구독: 없으면 null */
function useMini() {
  const [m, setM] = useState(loadMini);
  useEffect(() => { const on = () => setM(loadMini()); window.addEventListener('mini-change', on); return () => window.removeEventListener('mini-change', on); }, []);
  return m;
}
/** '체크 시작' 버튼. 미니 결과가 있으면 그 단계의 색·문구로, 누르면 미니에 넣은 4개 값을 가지고 이어서.
 *  kind: nav(상단)·main(첫 화면·아래 띠)은 색까지, text(중간 섹션)는 문구만 바꾼다(빨강이 여러 개면 무뎌지므로). */
function StartBtn({ kind, base, label, style, to }: { kind: 'nav' | 'main' | 'text' | 'link'; base: string; label: string; style?: React.CSSProperties; to?: string }) {
  const m = useMini(), { setDraft, draft } = useStore();
  // 결과가 이미 있으면(기본정보를 다 채움) 버튼 이름 그대로의 화면으로, 없으면 체크부터 (예: '내 결과에서 바꿔보기')
  if (to && toInput(draft)) return <a className={base} href={to} style={style}>{label}</a>;
  const toned = m?.tone != null;
  const set = !m ? null : toned ? MINI_CTA[m.tone!] : MINI_CTA.partial;
  // 기능 소개의 작은 버튼(gbtn)은 짧게 '이어서 체크하기'
  const text = !set ? label : base.includes('gbtn') ? MINI_CTA.partial.main : set[kind === 'nav' || kind === 'link' ? 'nav' : 'main'];
  const cls = toned && (kind === 'nav' || kind === 'main') ? `${base.replace(/\b(lime|dark)\b/, '')} tone-${m!.tone}` : m && base.includes('gbtn') ? `${base} cont` : base;
  // 미니에 한 칸이라도 넣었으면 시작·소개 화면을 건너뛰고 넣은 값을 채운 채 기본정보로
  const go = (e: React.MouseEvent) => { if (!m) return; e.preventDefault(); setDraft((d) => ({ ...d, ...miniDraft(m) })); location.hash = '#/info'; };
  return <a className={cls || undefined} href="#/start" onClick={go} style={toned && kind !== 'text' && kind !== 'link' ? undefined : style}>{text}</a>;
}

// 메인 소개용 쉬운 이름·보조 표시 (정확한 모형 이름과 점수/확률 구분은 상세 결과에 그대로)
const ITEMS: [string, string][] = [['현재 당뇨 가능성', '가능성 추정'], ['고혈압', '가능성 추정'], ['높은 콜레스테롤', '가능성 추정'], ['지방간', '가능성 추정'], ['우울감', '설문 체크'], ['골다공증', '50세 이상'], ['비만·복부비만', '체형 확인'], ['수면무호흡', '설문 체크'], ['불면', '설문 체크'], ['불안', '설문 체크'], ['위식도역류 · 속쓰림·신물', '설문 체크'], ['식생활', '식습관 체크']];
// [구분, 쉬운 설명, 공식 자료명·연도·인원(작게), 원문]
const SRC = [
  ['국가 통계', '질병관리청 · 성별·나이대별 건강통계', '2025 국민건강영양조사 주요결과 · 2023–2025 3년 평균 (원시자료 2022–2024)', 'https://www.kdca.go.kr/bbs/kdca/42/312791/artclView.do'],
  ['한국인 연구', '한국인의 당뇨 가능성을 살펴보는 연구', '한국형 당뇨 선별점수 · Diabetes Care 2012 · 개발 9,602명 · 검증 8,391명', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3402268/'],
  ['한국인 연구', '혈액검사 없이 지방간 가능성을 살펴보는 연구', '비혈액 지방간 자가진단 점수 · PLoS One 2014 · 외부검증 66,868명', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4162644/'],
];
const FAQ = [
  ['검사 없이 건강 상태를 알 수 있나요?', '간단한 몸 정보와 생활습관으로 현재 건강 상태를 추정해 볼 수 있어요. 다만 실제 질환 여부를 확인하는 검사는 아니에요.'],
  // 실제 동작: 입력한 건강정보는 서버로 보내지 않고 기기 안에서만 계산. 문구는 동작과 맞춘다
  ['입력한 정보는 저장되나요?', '입력한 건강정보는 서버로 보내지 않고 이 기기 안에서만 계산해요. 결과는 ‘이 결과 저장하기’를 눌렀을 때만 이 기기(브라우저)에 보관되고, 기록 화면에서 언제든 지울 수 있어요.'],
  ['검진표가 꼭 있어야 하나요?', '없어도 시작할 수 있어요. 몸 정보와 답변으로 추정하고, 혈압·공복혈당·콜레스테롤 등 아는 수치가 있으면 그 항목에 검사 기준과 함께 반영해요.'],
  ['‘1분체크 알려주기’는 무엇을 보내나요?', '내 결과가 아니라 1분체크 소개와 주소만 보내요. 진료 때 보여줄 결과는 ‘진료용 결과 요약 저장’으로 인쇄하거나 PDF로 저장할 수 있어요.'],
  ['왜 결과가 숫자나 단계로 다르게 나오나요?', '항목마다 확인하는 방법이 달라요. 질환 가능성은 확률로, 수면·마음 건강 등은 설문 점수와 단계로 보여드려요.'],
  ['결과는 얼마나 믿을 수 있나요?', '국가 건강통계와 연구를 바탕으로 계산하지만, 개인의 실제 상태와 차이가 있을 수 있어요. 항목별 근거와 한계는 상세 결과에서 확인할 수 있어요.'],
  ['앱을 설치해야 하나요?', '설치 없이 웹에서 바로 이용할 수 있어요. 휴대폰 홈 화면에 추가하면 다음에 더 편하게 열 수 있어요.'],
];

/** 아래 '직접 해보세요' 미니 테스트로 내려가서 빈 칸에 커서 */
function goTry() {
  const t = document.getElementById('try'); if (!t) return;
  t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  setTimeout(() => {
    // 부드러운 스크롤이 안 되는 환경(일부 브라우저·탭)이면 바로 이동
    if (Math.abs(t.getBoundingClientRect().top - 84) > 60) t.scrollIntoView({ block: 'start' });
    const ins = [...t.querySelectorAll<HTMLInputElement>('input')];
    (ins.find((i) => !i.value) ?? ins[0])?.focus({ preventScroll: true });
  }, 700);
}
const openFull = () => window.dispatchEvent(new Event('promo-full'));

/** 첫 화면 20초 사용 장면 영상: 소리 없이, 화면에 보일 때만 재생. 움직임 줄이기 설정이면 자동 재생하지 않음. 누르면 미니 테스트로 */
function PromoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    const v = ref.current; if (!v || reduce || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.4 });
    io.observe(v); return () => io.disconnect();
  }, [reduce]);
  const base = import.meta.env.BASE_URL;
  // 휴대폰 폭에서는 세로(9:16) 영상
  const tall = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 600px)').matches, kind = tall ? '-vertical' : '';
  // 45초 전체 영상: 버튼을 눌렀을 때만 받아서 소리와 함께 재생, 닫으면 멈춤
  const dlg = useRef<HTMLDialogElement>(null), full = useRef<HTMLVideoElement>(null);
  const open = () => { ref.current?.pause(); dlg.current?.showModal(); full.current?.play().catch(() => {}); };
  useEffect(() => { window.addEventListener('promo-full', open); return () => window.removeEventListener('promo-full', open); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <figure className="promo-fig">
      <video ref={ref} className={tall ? 'promo promo-tall' : 'promo'} src={`${base}video/promo-20s${kind}.mp4`} poster={`${base}video/promo-poster${kind}.jpg`} muted loop playsInline preload="auto" controls={reduce}
        onClick={reduce ? undefined : goTry} style={{ cursor: reduce ? undefined : 'pointer' }}
        aria-label="1분체크를 쓰는 장면 20초 영상(소리 없음): 몸 정보 입력, 결과 카드, 판정 카드" />
      <figcaption className="promo-cap">
        <div className="promo-acts">
          <button type="button" className="promo-try" onClick={goTry}>나도 바로 해보기 <span aria-hidden>↓</span></button>
          <button type="button" className="promo-more" onClick={open}>▶ 전체 영상 <small>45초 · 소리 있음</small></button>
        </div>
        <span>20초로 보는 1분체크 · 화면 속 숫자는 예시예요</span>
      </figcaption>
      <dialog ref={dlg} className="promo-dlg" aria-label="1분체크 전체 영상 45초" onClose={() => { full.current?.pause(); if (!reduce) ref.current?.play().catch(() => {}); }} onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <button type="button" className="promo-x" aria-label="닫기" onClick={() => dlg.current?.close()}>✕</button>
        <video ref={full} className="promo" src={`${base}video/promo-45s.mp4`} poster={`${base}video/promo-poster.jpg`} controls playsInline preload="none" />
      </dialog>
    </figure>
  );
}

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => <div className="card" style={{ borderRadius: 24, boxShadow: '0 6px 20px rgba(0,0,0,.06)', ...style }}>{children}</div>;

// ── B: 대표 결과 예시. 가상 프로필을 지금 엔진으로 계산한 실제 값(숫자를 손으로 넣지 않음) ──
const EX_INPUT: AppInput = { age: 42, sex: 'M', heightCm: 173, weightKg: 92, waistCm: 100, smoke: 'current', alcohol: 'none', famDM: false, dx: { htn: false, dm: false, chol: false }, bp: 'unknown', exercise: false, meno: null };
const EX_SC = suggestScenario(EX_INPUT), EX_R = viewResults(EX_INPUT, EX_SC), EX_V = verdictB(EX_INPUT, EX_R, EX_SC);
const EX_ROWS = EX_R.prob.filter((p) => p.cmp).sort((a, b) => b.cmp!.x - a.cmp!.x).slice(0, 3);

/** 첫 화면의 대표 결과 예시 (방문자 결과로 보이지 않게 '예시'를 분명히) */
function ExampleResult() {
  return (
    <figure className="ex-card" aria-label="결과 화면 예시 (가상의 42세 남성)">
      <div className="ex-head"><span className="ex-badge">예시</span><span>가상의 42세 남성 · 내 결과가 아니에요</span></div>
      <div className="ex-status"><span className="ex-tag">{EX_V.tag}</span><b>{EX_V.title}</b></div>
      {EX_ROWS.map((p) => { const b = probB(p); return b.kind === 'estimate' && (
        <div key={p.id} className="ex-row">
          <div className="ex-row-top"><b>{B_NAME[p.id]}</b><span>현재 가능성 추정</span></div>
          <b className="ex-pct" style={{ color: b.high ? '#cb272f' : 'var(--obsidian)' }}>{b.big}</b>
          <span className="ex-freq">{b.freq}</span>
          <span className="ex-peer" style={{ color: b.high ? '#cb272f' : 'var(--charcoal)' }}>{b.peer}</span>
        </div>
      ); })}
      <div className="ex-act">→ {EX_V.actions[0].t}</div>
      <figcaption>키 173cm·몸무게 92kg·허리 100cm·흡연·운동 안 함으로 지금 계산식이 낸 값이에요.</figcaption>
    </figure>
  );
}

/** 45초 사용 장면 영상(소리 있음) 팝업 */
function VideoButton() {
  const dlg = useRef<HTMLDialogElement>(null), full = useRef<HTMLVideoElement>(null), base = import.meta.env.BASE_URL;
  const open = () => { dlg.current?.showModal(); full.current?.play().catch(() => {}); };
  return (<>
    <button type="button" className="promo-more" onClick={open}>▶ 사용 장면 영상 <small>45초 · 소리 있음</small></button>
    <dialog ref={dlg} className="promo-dlg" aria-label="1분체크 사용 장면 영상 45초" onClose={() => full.current?.pause()} onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
      <button type="button" className="promo-x" aria-label="닫기" onClick={() => dlg.current?.close()}>✕</button>
      <video ref={full} className="promo" src={`${base}video/promo-45s.mp4`} poster={`${base}video/promo-poster.jpg`} controls playsInline preload="none" />
    </dialog>
  </>);
}

const EX_HTN = probB(EX_R.prob.find((p) => p.id === 'htn')!);
const READ: [string, string, string][] = [
  ['현재 가능성 추정', '지금 검사하면 기준에 해당할 가능성이에요.', EX_HTN.kind === 'estimate' ? `예: 고혈압 ${EX_HTN.big}` : ''],
  ['비슷한 조건의 몇 명', '숫자를 사람 수로 바꿔 보여드려요. 아주 작은 값은 1,000명 기준으로 봐요.', EX_HTN.kind === 'estimate' ? `예: ${EX_HTN.freq}` : ''],
  ['또래 평균과 비교', '같은 나이대·성별 한국인과 비교해요. 배수만 보지 말고 내 값과 함께 보세요.', EX_HTN.kind === 'estimate' ? `예: ${EX_HTN.peer}` : ''],
  ['결과마다 종류가 달라요', '현재 가능성, 앞으로 N년 안의 발생 위험, 입력한 검진 수치, 설문 점수를 따로 표시해요.', '같은 % 라도 뜻이 다를 수 있어요'],
];

export function Landing() {
  return (
    <div className="ld">
      <header><div className="wrap">
        <a className="logo" href="#/"><i /><b>1분체크</b></a>
        <nav><a href="#try">직접 해보기</a><a href="#items">건강 분야</a><a href="#read">결과 읽는 법</a><a href="#evidence">통계와 연구</a><a href="#faq">자주 묻는 질문</a></nav>
        <StartBtn kind="nav" base="btn lime sm" label="1분 건강 체크하기" />
      </div></header>

      {/* 1. 핵심 제목·설명·시작 버튼·대표 결과 예시 */}
      <section className="dots"><div className="wrap hero">
        <div className="hero-left">
          <h1 className="hero-title">내 몸이 궁금할 때<br /><b>딱 1분.</b></h1>
          <div className="hero-rest">
            <p style={{ margin: 0, fontSize: 'clamp(19px, 2vw, 22px)', fontWeight: 700, color: 'var(--obsidian)', wordBreak: 'keep-all' }}>간단한 몸 정보와 생활습관으로, 지금 건강을 가늠해 보세요.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><StartBtn kind="main" base="btn lime" label="1분 건강 체크하기" /><a className="btn line" href="#read">결과 읽는 법</a></div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>기본 체크 약 1분 · 추가 질문은 선택 · 만 19세 이상</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--slate)', wordBreak: 'keep-all' }}>검진 수치가 없어도 시작할 수 있어요. 수치가 있으면 검사 기준과 함께 볼 수 있어요.</p>
            <div style={{ display: 'flex', gap: '8px 18px', flexWrap: 'wrap', fontSize: 13, fontWeight: 500, color: 'var(--slate)' }}>
              {['국가 건강통계와 한국인 연구를 바탕으로', '입력한 건강정보는 서버로 보내지 않아요'].map((t) => <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icon.check}{t}</span>)}
            </div>
          </div>
        </div>
        <div className="hero-mini" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <ExampleResult />
          <VideoButton />
        </div>
      </div></section>

      {/* 2. 짧은 미니 체험 */}
      <section id="try" className="wrap"><div className="try">
        <div className="try-head">
          <h2>직접 해보세요</h2>
          <p>성별·나이·키·몸무게만 넣으면 같은 체형의 한국인 비율로 먼저 가늠해 드려요. 내 습관까지 넣는 기본 체크는 약 1분이에요.</p>
        </div>
        <MiniTrial />
      </div></section>

      {/* 3. 확인할 수 있는 건강 분야 */}
      <section id="items" className="wrap"><div className="band">
        <h2 style={{ color: '#fff' }}>기본 건강부터 <span style={{ color: 'var(--lime)' }}>수면·마음까지</span></h2>
        <p style={{ margin: '12px auto 0', maxWidth: 560, fontSize: 16, color: 'rgba(255,255,255,.82)' }}>기본 체크로 질환 가능성과 체형을 가늠하고, 수면·마음·소화·식생활은 원할 때만 추가로 답해요.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, maxWidth: 980, margin: '28px auto' }}>
          {ITEMS.map(([n, t]) => <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 9999, background: 'var(--spruce)', fontSize: 15, fontWeight: 600, color: '#fff' }}>{n}<span style={{ fontSize: 12, color: 'var(--lime)' }}>{t}</span></span>)}
        </div>
        <StartBtn kind="text" base="btn" label="1분 건강 체크하기" style={{ background: '#fff', color: 'var(--ink)' }} />
      </div></section>

      {/* 4. 결과를 읽는 방법 */}
      <section id="read" className="wrap sec" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <h2 style={{ textAlign: 'center' }}>결과는 이렇게 읽어요</h2>
        <div className="read-grid">
          {READ.map(([t, d, e]) => <Card key={t} style={{ padding: '22px 22px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <b style={{ fontSize: 19, color: 'var(--obsidian)' }}>{t}</b><span style={{ fontSize: 15, lineHeight: 1.6, wordBreak: 'keep-all' }}>{d}</span><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{e}</span>
          </Card>)}
        </div>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 15, lineHeight: 1.65, color: 'var(--charcoal)', wordBreak: 'keep-all' }}>확인이 필요한 결과는 분명하게, 잘하고 있는 습관은 구체적으로 알려드려요. 추정 가능성이 낮아도 질환이 없다는 보증은 아니에요.<br />결과는 이 기기에 저장해 다음 체크와 비교할 수 있고, 진료 때 보여줄 요약도 인쇄·PDF로 저장할 수 있어요.</p>
      </section>

      {/* 5. 국가 통계와 연구 근거 */}
      <section id="evidence" className="wrap sec"><div className="ev">
        <div style={{ padding: 28, borderRadius: 20, border: '1px solid var(--line2)', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
          <span className="cap">통계와 연구</span><b style={{ fontSize: 26, lineHeight: 1.25, color: 'var(--obsidian)' }}>간단한 체크에도,<br />근거는 꼼꼼하게</b><span style={{ fontSize: 14 }}>국가 건강통계와 연구를 바탕으로 계산해요. 항목별 출처와 계산 방법은 결과의 상세 화면에서 볼 수 있어요.</span>
        </div>
        {SRC.map(([k, t, d, u]) => <a key={t} href={u} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 28, borderRadius: 20, background: 'var(--bg)', textDecoration: 'none' }}>
          <span className="pill" style={{ alignSelf: 'flex-start', background: 'var(--linen)', color: 'var(--ink)' }}>{k}</span><b style={{ fontSize: 18, color: 'var(--obsidian)' }}>{t}</b><span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--slate)' }}>{d}</span><span style={{ marginTop: 'auto', fontSize: 13, fontWeight: 700 }}>원문 보기 →</span></a>)}
      </div></section>

      {/* 6. 정보 보호와 FAQ */}
      <section className="wrap"><div className="panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 36, background: 'var(--linen)' }}>
        {[['입력한 정보는 내 기기 안에서', '입력한 건강정보는 서버나 방문 분석 도구로 보내지 않아요.'], ['저장은 원할 때만', '‘이 결과 저장하기’를 누를 때만 이 기기(브라우저)에 보관하고, 기록 화면에서 언제든 지울 수 있어요.'], ['건강을 가늠하는 참고 정보예요', '추정 결과는 실제 건강 상태와 다를 수 있어요. 질환 여부는 검사와 진료로 확인해 주세요.']].map(([t, d]) => (
          <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><b style={{ fontSize: 21, color: 'var(--obsidian)' }}>{t}</b><span style={{ fontSize: 16, lineHeight: 1.6 }}>{d}</span></div>
        ))}
      </div></section>

      <section id="faq" className="wrap sec"><div className="faq">
        <h2>자주 묻는 질문</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQ.map(([q, a]) => <details key={q} style={{ padding: '22px 26px', borderRadius: 16, background: 'var(--bg)' }}>
            <summary style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 18, fontWeight: 700, color: 'var(--obsidian)' }}>{q}<span style={{ color: 'var(--ink)' }}>{Icon.down}</span></summary>
            <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.65 }}>{a}</p></details>)}
        </div>
      </div></section>

      {/* 7. 마지막 시작 안내 */}
      <section className="wrap"><div className="band" style={{ backgroundColor: 'var(--lime)', backgroundImage: 'radial-gradient(rgba(22,51,0,.12) 1.5px, transparent 1.5px)' }}>
        <h2 style={{ fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 900, color: 'var(--ink)' }}>지금 내 건강, 1분만 살펴보세요</h2>
        <p style={{ fontSize: 17, color: 'var(--ink)' }}>기본 체크 약 1분 · 추가 질문은 선택</p>
        <StartBtn kind="main" base="btn dark" label="1분 건강 체크하기" />
      </div></section>

      <footer><div className="wrap">
        <div className="fcols">
          <div><a className="logo" href="#/"><i /><b>1분체크</b></a><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--obsidian)' }}>간단한 몸 정보와 생활습관으로, 지금 건강을 가늠해 보세요.</p></div>
          <div><span className="cap">서비스</span><StartBtn kind="link" base="" label="1분 건강 체크하기" /><a href="#/record">지난 결과 비교</a><a href="#items">건강 분야</a></div>
          <div><span className="cap">통계와 연구</span><a href="#evidence">통계와 연구</a><a href="#faq">자주 묻는 질문</a></div>
          <div><span className="cap">도움</span><a href="tel:109">자살예방상담 109</a><a href="https://www.kdca.go.kr" target="_blank" rel="noreferrer">질병관리청</a></div>
        </div>
        <p className="help" style={{ marginTop: 32, maxWidth: 820 }}>1분체크는 국가 건강통계와 연구를 바탕으로 건강 상태를 추정하는 참고 서비스예요. 의료 진단을 대신하지 않으며, 질환 여부는 검사와 진료로 확인해 주세요. 이 페이지는 비교용 제안 버전(B)이며, 기록은 현재 버전과 따로 저장돼요. © 2026 1분체크</p>
      </div></footer>
    </div>
  );
}
