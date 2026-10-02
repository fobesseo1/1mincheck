import './landing.css';
import type React from 'react';
import { samples, defaultSampleId } from '../../../src/sampleData.ts';
import { viewResults, viewDetail, viewRecord, whatIfRows, applyScenario } from '../lib/view.ts';
import { People, Icon } from '../ui.tsx';
import { MiniTrial, loadMini, miniDraft, MINI_CTA } from './MiniTrial.tsx';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../ui.tsx';
import { toInput } from '../state.ts';

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

// 랜딩의 예시 숫자: src/sampleData.ts 기본 예시를 engine 으로 계산
const S = samples.find((s) => s.id === defaultSampleId)!;
const R = viewResults(S.input, S.scenario), D = viewDetail('dm', S.input, S.scenario), W = whatIfRows(S.input, applyScenario(S.input, S.scenario));
const REC = S.previous ? viewRecord(S.previous.input, S.input) : null;
const WI = W.rows.filter((r) => r.tone === 'down').map((r) => ({ ...r, b: r.unit === '%' ? r.b + '%' : r.b, a: r.unit === '%' ? r.a + '%' : r.a }));
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
  ['입력한 정보는 저장되나요?', '입력한 건강정보는 서버로 보내지 않고 이 기기 안에서만 계산해요. 결과는 ‘기록 저장’을 눌렀을 때만 이 기기에 보관되고, 언제든 삭제할 수 있어요.'],
  ['왜 결과가 숫자나 단계로 다르게 나오나요?', '항목마다 확인하는 방법이 달라요. 질환 가능성은 확률로, 수면·마음 건강 등은 설문 점수와 단계로 보여드려요.'],
  ['결과는 얼마나 믿을 수 있나요?', '국가 건강통계와 연구를 바탕으로 계산하지만, 개인의 실제 상태와 차이가 있을 수 있어요. 항목별 근거와 한계는 상세 결과에서 확인할 수 있어요.'],
  ['앱을 설치해야 하나요?', '설치 없이 웹에서 바로 이용할 수 있어요. 휴대폰 홈 화면에 추가하면 다음에 더 편하게 열 수 있어요.'],
];

/** '이용 방법' 위 20초 사용 장면 영상: 소리 없이, 화면에 보일 때만 재생. 움직임 줄이기 설정이면 자동 재생하지 않음 */
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
  return (
    <figure style={{ margin: 0, width: '100%', maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <video ref={ref} className={tall ? 'promo promo-tall' : 'promo'} src={`${base}video/promo-20s${kind}.mp4`} poster={`${base}video/promo-poster${kind}.jpg`} muted loop playsInline preload="none" controls={reduce}
        aria-label="1분체크를 쓰는 장면 20초 영상(소리 없음): 몸 정보 입력, 결과 카드, 판정 카드" />
      <figcaption style={{ fontSize: 13, color: 'var(--slate)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        20초로 보는 1분체크 · 화면 속 숫자는 예시예요
        <button type="button" className="promo-more" onClick={open}>▶ 전체 영상 보기 <small>45초 · 소리 있음</small></button>
      </figcaption>
      <dialog ref={dlg} className="promo-dlg" aria-label="1분체크 전체 영상 45초" onClose={() => { full.current?.pause(); if (!reduce) ref.current?.play().catch(() => {}); }} onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <button type="button" className="promo-x" aria-label="닫기" onClick={() => dlg.current?.close()}>✕</button>
        <video ref={full} className="promo" src={`${base}video/promo-45s.mp4`} poster={`${base}video/promo-poster.jpg`} controls playsInline preload="none" />
      </dialog>
    </figure>
  );
}

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => <div className="card" style={{ borderRadius: 24, boxShadow: '0 6px 20px rgba(0,0,0,.06)', ...style }}>{children}</div>;

export function Landing() {
  return (
    <div className="ld">
      <header><div className="wrap">
        <a className="logo" href="#/"><i /><b>1분체크</b></a>
        <nav><a href="#how">이용 방법</a><a href="#features">결과 미리보기</a><a href="#items">건강 항목</a><a href="#evidence">통계와 연구</a><a href="#faq">자주 묻는 질문</a></nav>
        <StartBtn kind="nav" base="btn lime sm" label="1분 건강 체크하기" />
      </div></header>

      <section className="dots"><div className="wrap hero">
        {/* PC: 왼쪽 글 · 오른쪽 미니. 모바일·태블릿: 제목 → 미니 → 설명·버튼 순서(landing.css .hero-left display: contents) */}
        <div className="hero-left">
          <h1 className="hero-title">내 몸이 궁금할 때<br /><b>딱 1분.</b></h1>
          <div className="hero-rest">
          <p style={{ margin: 0, fontSize: 'clamp(19px, 2vw, 22px)', fontWeight: 700, color: 'var(--obsidian)' }}>간단한 내 몸 정보로 1분 만에 가늠해 보세요.</p>
          <p style={{ margin: '-10px 0 0', fontSize: 15, color: 'var(--slate)' }}>나이·체형·생활습관을 바탕으로, 현재 건강 상태를 추정해 드려요.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><StartBtn kind="main" base="btn lime" label="1분 건강 체크하기" /><a className="btn line" href="#how">어떻게 알 수 있나요?</a></div>
            <span style={{ fontSize: 12, color: 'var(--slate)' }}>현재 만 19세 이상 대상</span>
          </div>
          <div style={{ display: 'flex', gap: '8px 18px', flexWrap: 'wrap', fontSize: 13, fontWeight: 500, color: 'var(--slate)' }}>
            {['국가 건강통계와 연구를 바탕으로', '한국인을 대상으로 검증된 설문 활용', '입력한 건강정보는 서버로 보내지 않아요'].map((t) => <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icon.check}{t}</span>)}
          </div>
          </div>
        </div>
        <div className="hero-mini"><MiniTrial /></div>
      </div></section>

      <section id="how" className="wrap"><div className="panel dots" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44 }}>
        <h2 style={{ textAlign: 'center' }}>내 건강을 가늠하는 데 필요한 시간, 1분</h2>
        <PromoVideo />
        <div className="steps" style={{ width: '100%' }}>
          {[['간단한 내 몸 정보를 입력해요', '나이·키·몸무게와 평소 생활에 답해 주세요. 허리둘레를 몰라도 시작할 수 있어요.', 'var(--linen)'],
            ['궁금한 분야는 더 살펴봐요', '수면·마음·소화·식생활은 원하는 분야만 추가로 확인해 보세요.', '#e3edf3'],
            ['지금 내 건강을 가늠해 봐요', '질환 가능성과 건강 상태를 확인하고, 같은 나이·성별의 사람들과 비교해 보세요.', 'var(--bg)']].map(([t, d, bg], k) => (
            <Card key={t} style={{ overflow: 'hidden' }}>
              <div style={{ height: 8, background: bg }} />
              <div style={{ padding: '26px 28px 30px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--ink)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k + 1}</span><b style={{ fontSize: 21, color: 'var(--obsidian)' }}>{t}</b></div>
                <span style={{ fontSize: 15, lineHeight: 1.6 }}>{d}</span>
              </div>
            </Card>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <StartBtn kind="text" base="btn lime" label="1분 건강 체크하기" />
          <span style={{ fontSize: 13, color: 'var(--slate)' }}>기본 체크는 약 1분 · 추가 분야는 선택</span>
        </div>
      </div></section>

      <section id="features" className="wrap sec" style={{ display: 'flex', flexDirection: 'column', gap: 80 }}>
        <h2 style={{ textAlign: 'center' }}>내 건강을 이렇게 보여드려요</h2>
        <div className="zig">
          <div className="txt"><h3>건강 가능성을 이해하기 쉽게</h3><p>질환 가능성을 숫자로 보여드리고, ‘비슷한 조건의 100명 중 약 몇 명’인지도 살펴볼 수 있어요.</p><StartBtn kind="text" base="gbtn" label="내 건강 체크하기" /></div>
          <div className="vis" style={{ background: 'var(--linen)' }}><Card style={{ width: '100%', maxWidth: 420, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <span className="cap" style={{ alignSelf: 'flex-start' }}>예시</span><span style={{ fontSize: 14, fontWeight: 600 }}>나와 비슷한 조건의 사람 100명 중</span><b style={{ fontSize: 84, lineHeight: 0.95, fontWeight: 900, letterSpacing: '-0.06em', color: 'var(--obsidian)' }}>{D.n}<small style={{ fontSize: 22 }}>명</small></b><People cells={D.people} />
          </Card></div>
        </div>
        <div className="zig">
          <div className="vis" style={{ background: 'var(--bg)' }}><Card style={{ width: '100%', maxWidth: 420, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ color: 'var(--obsidian)' }}>나이대별 비교</b><span className="cap">{D.group} · 당뇨가 있는 사람의 비율</span></div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150, borderBottom: '1px solid var(--line2)' }}>
              {D.bands.map((b) => <div key={b.l} style={{ position: 'relative', flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: '8px 8px 0 0', background: b.mine ? '#eef6e8' : 'transparent' }}>
                <div style={{ height: `${(b.v / 30) * 100}%`, borderRadius: '6px 6px 0 0', background: b.mine ? 'var(--ink)' : '#c2c6be' }} />
                {b.mine && <i style={{ position: 'absolute', left: '50%', bottom: `${((D.r.value ?? 0) / 30) * 100}%`, transform: 'translate(-50%,50%)', width: 16, height: 16, borderRadius: '50%', background: 'var(--lime)', border: '3px solid var(--ink)', boxSizing: 'border-box' }} />}
              </div>)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>{D.bands.map((b) => <span key={b.l} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--slate)' }}>{b.l}</span>)}</div>
          </Card></div>
          <div className="txt"><h3>또래와 비교하면 어떨까요?</h3><p>같은 나이·성별의 사람들과 비교해, 내 추정 결과가 낮은 편인지 높은 편인지 보여드려요.</p><a className="gbtn" href="#evidence">통계 출처 보기</a></div>
        </div>
        <div className="zig">
          <div className="txt"><h3>생활습관을 바꾸면 어떻게 달라질까요?</h3><p>체중이나 생활습관을 바꿔 입력하고, 건강 추정 결과가 어떻게 달라지는지 비교해 보세요.</p><StartBtn kind="text" base="gbtn" label="내 결과에서 바꿔보기" to="#/whatif" /></div>
          <div className="vis" style={{ background: 'var(--ink)' }}><Card style={{ width: '100%', maxWidth: 420, padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6 }}><b style={{ color: 'var(--obsidian)' }}><span className="cap" style={{ marginRight: 6 }}>예시</span>{R.scenarioText}</b><span className="tag" style={{ background: 'var(--lime)', color: 'var(--ink)' }}>추정 결과의 변화</span></div>
            {WI.map((w) => <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 52, padding: '0 16px', borderRadius: 14, background: 'var(--bg)' }}><b style={{ color: 'var(--obsidian)' }}>{w.name}</b><span style={{ color: 'var(--slate)' }}>{w.b} → <b style={{ fontSize: 18, color: 'var(--obsidian)' }}>{w.a}</b></span></div>)}
          </Card></div>
        </div>
        {REC && <div className="zig">
          <div className="vis" style={{ background: '#e3edf3' }}><Card style={{ width: '100%', maxWidth: 420, padding: '8px 24px' }}>
            <span className="cap" style={{ display: 'block', padding: '12px 0 4px' }}>아래는 생활습관을 바꿔 입력한 예시예요.</span>
            {REC.rows.filter((r) => r.a.includes('%')).slice(0, 4).map((r) => <div key={r.id} className="row" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ color: 'var(--obsidian)' }}>{r.name}</b><span style={{ color: 'var(--slate)' }}>{r.b} → <b style={{ fontSize: 17, color: 'var(--obsidian)' }}>{r.a}</b></span></div>)}
          </Card></div>
          <div className="txt"><h3>지난번과 비교하면 어떨까요?</h3><p>결과를 저장해 두면, 다음 체크에서 이전과 달라진 부분을 비교할 수 있어요.</p><a className="gbtn" href="#/record">지난 결과 비교하기</a></div>
        </div>}
      </section>

      <section id="items" className="wrap"><div className="band">
        <h2 style={{ color: '#fff' }}>기본 건강부터 <span style={{ color: 'var(--lime)' }}>수면·마음까지</span></h2>
        <p style={{ margin: '12px auto 0', maxWidth: 560, fontSize: 16, color: 'rgba(255,255,255,.82)' }}>기본 정보로 건강을 가늠하고, 궁금한 분야는 추가 질문으로 살펴보세요.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, maxWidth: 980, margin: '28px auto' }}>
          {ITEMS.map(([n, t]) => <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 9999, background: 'var(--spruce)', fontSize: 15, fontWeight: 600, color: '#fff' }}>{n}<span style={{ fontSize: 12, color: 'var(--lime)' }}>{t}</span></span>)}
        </div>
        <StartBtn kind="text" base="btn" label="1분 건강 체크하기" style={{ background: '#fff', color: 'var(--ink)' }} />
      </div></section>

      <section id="evidence" className="wrap sec"><div className="ev">
        <div style={{ padding: 28, borderRadius: 20, border: '1px solid var(--line2)', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
          <span className="cap">통계와 연구</span><b style={{ fontSize: 26, lineHeight: 1.25, color: 'var(--obsidian)' }}>간단한 체크에도,<br />근거는 꼼꼼하게</b><span style={{ fontSize: 14 }}>국가 건강통계와 연구를 바탕으로 계산해요. 항목별 출처와 계산 방법도 확인할 수 있어요.</span>
        </div>
        {SRC.map(([k, t, d, u]) => <a key={t} href={u} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 28, borderRadius: 20, background: 'var(--bg)', textDecoration: 'none' }}>
          <span className="pill" style={{ alignSelf: 'flex-start', background: 'var(--linen)', color: 'var(--ink)' }}>{k}</span><b style={{ fontSize: 18, color: 'var(--obsidian)' }}>{t}</b><span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--slate)' }}>{d}</span><span style={{ marginTop: 'auto', fontSize: 13, fontWeight: 700 }}>원문 보기 →</span></a>)}
      </div></section>

      <section className="wrap"><div className="panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 36, background: 'var(--linen)' }}>
        {[['입력한 정보는 내 기기 안에서', '입력한 건강정보는 서버나 방문 분석 도구로 보내지 않아요.'], ['결과 저장은 원할 때만', '‘기록 저장’을 누르면 이 기기에 결과를 보관할 수 있고, 언제든 삭제할 수 있어요.'], ['건강을 가늠하는 참고 정보예요', '추정 결과는 실제 건강 상태와 다를 수 있어요. 질환 여부는 검사와 진료로 확인해 주세요.']].map(([t, d]) => (
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

      <section className="wrap"><div className="band" style={{ backgroundColor: 'var(--lime)', backgroundImage: 'radial-gradient(rgba(22,51,0,.12) 1.5px, transparent 1.5px)' }}>
        <h2 style={{ fontSize: 'clamp(38px, 5vw, 56px)', fontWeight: 900, color: 'var(--ink)' }}>지금 내 건강, 1분만 살펴보세요</h2>
        <p style={{ fontSize: 18, color: 'var(--ink)' }}>간단한 내 몸 정보로 시작해 보세요.</p>
        <StartBtn kind="main" base="btn dark" label="1분 건강 체크하기" />
      </div></section>

      <footer><div className="wrap">
        <div className="fcols">
          <div><a className="logo" href="#/"><i /><b>1분체크</b></a><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--obsidian)' }}>간단한 내 몸 정보로, 지금 건강을 가늠해 보세요.</p></div>
          <div><span className="cap">서비스</span><StartBtn kind="link" base="" label="1분 건강 체크하기" /><a href="#/record">지난 결과 비교</a><a href="#items">건강 항목</a></div>
          <div><span className="cap">통계와 연구</span><a href="#evidence">통계와 연구</a><a href="#faq">자주 묻는 질문</a></div>
          <div><span className="cap">도움</span><a href="tel:109">자살예방상담 109</a><a href="https://www.kdca.go.kr" target="_blank" rel="noreferrer">질병관리청</a></div>
        </div>
        <p className="help" style={{ marginTop: 32, maxWidth: 820 }}>1분체크는 국가 건강통계와 연구를 바탕으로 건강 상태를 추정하는 참고 서비스예요. 의료 진단을 대신하지 않으며, 질환 여부는 검사와 진료로 확인해 주세요. © 2026 1분체크</p>
      </div></footer>
    </div>
  );
}
