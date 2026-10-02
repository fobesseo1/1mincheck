import './landing.css';
import type React from 'react';
import { samples, defaultSampleId } from '../../../src/sampleData.ts';
import { viewResults, viewDetail, viewRecord, whatIfRows, applyScenario } from '../lib/view.ts';
import { People, Icon } from '../ui.tsx';
import { MiniTrial, loadMini, miniDraft, MINI_CTA } from './MiniTrial.tsx';
import { useEffect, useState } from 'react';
import { useStore } from '../ui.tsx';

/** 미니 체험 결과(탭 세션)를 구독: 없으면 null */
function useMini() {
  const [m, setM] = useState(loadMini);
  useEffect(() => { const on = () => setM(loadMini()); window.addEventListener('mini-change', on); return () => window.removeEventListener('mini-change', on); }, []);
  return m;
}
/** '체크 시작' 버튼. 미니 결과가 있으면 그 단계의 색·문구로, 누르면 미니에 넣은 4개 값을 가지고 이어서.
 *  kind: nav(상단)·main(첫 화면·아래 띠)은 색까지, text(중간 섹션)는 문구만 바꾼다(빨강이 여러 개면 무뎌지므로). */
function StartBtn({ kind, base, label, style }: { kind: 'nav' | 'main' | 'text' | 'link'; base: string; label: string; style?: React.CSSProperties }) {
  const m = useMini(), { setDraft } = useStore();
  const toned = m?.tone != null;
  const set = !m ? null : toned ? MINI_CTA[m.tone!] : MINI_CTA.partial;
  const text = set ? set[kind === 'nav' || kind === 'link' ? 'nav' : 'main'] : label;
  const cls = toned && (kind === 'nav' || kind === 'main') ? `${base.replace(/\b(lime|dark)\b/, '')} tone-${m!.tone}` : base;
  // 미니에 한 칸이라도 넣었으면 시작·소개 화면을 건너뛰고 넣은 값을 채운 채 기본정보로
  const go = (e: React.MouseEvent) => { if (!m) return; e.preventDefault(); setDraft((d) => ({ ...d, ...miniDraft(m) })); location.hash = '#/info'; };
  return <a className={cls || undefined} href="#/start" onClick={go} style={toned && kind !== 'text' && kind !== 'link' ? undefined : style}>{text}</a>;
}

// 랜딩의 예시 숫자: src/sampleData.ts 기본 예시를 engine 으로 계산
const S = samples.find((s) => s.id === defaultSampleId)!;
const R = viewResults(S.input, S.scenario), D = viewDetail('dm', S.input, S.scenario), W = whatIfRows(S.input, applyScenario(S.input, S.scenario));
const REC = S.previous ? viewRecord(S.previous.input, S.input) : null;
const WI = W.rows.filter((r) => r.tone === 'down').map((r) => ({ ...r, b: r.unit === '%' ? r.b + '%' : r.b, a: r.unit === '%' ? r.a + '%' : r.a }));
const ITEMS: [string, string][] = [['이미 당뇨일 확률', '모형 확률'], ['고혈압', '추정'], ['고콜레스테롤', '추정'], ['지방간', '점수표 확률'], ['우울', '추정'], ['골다공증', '50세+'], ['비만·복부비만', '등급'], ['수면무호흡', '점수'], ['불면', '점수'], ['불안', '점수'], ['위식도역류', '점수'], ['식생활', '참고 지표']];
const SRC = [
  ['국가 통계', '2025 국민건강영양조사 주요결과', '질병관리청 · 성·연령별 원표, 2023–2025 3년 평균', 'https://www.kdca.go.kr/bbs/kdca/42/312791/artclView.do'],
  ['한국인 모형', '한국형 당뇨 선별점수', 'Diabetes Care 2012 · 개발 9,602명 · 검증 8,391명', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3402268/'],
  ['한국인 점수', '비혈액 지방간 자가진단 점수', 'PLoS One 2014 · 외부검증 66,868명', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4162644/'],
];
const FAQ = [
  ['진단을 해 주는 앱인가요?', '아니에요. 나와 나이·성별이 같은 한국인 통계에 검증된 설문 점수를 더해, 비슷한 사람 100명 중 몇 명인지 보여주는 참고 정보예요. 확인은 국가건강검진과 진료로 해 주세요.'],
  ['내 정보는 어디에 저장되나요?', '서버로 보내지 않아요. 모든 계산은 휴대폰 안에서 하고, 기록 저장을 누른 경우에만 이 기기에 남아요.'],
  ['왜 어떤 항목은 확률이 아니라 점수인가요?', '수면무호흡·불면·불안·위식도역류는 검증된 점수와 등급만 있고, 확률로 바꿀 근거가 부족해요. 근거가 없는 숫자는 만들지 않아요.'],
  ['숫자는 얼마나 정확한가요?', '항목마다 근거 수준이 달라서 모형 확률·추정·점수·참고 지표로 나눠 표시해요. 예를 들어 이미 당뇨일 확률은 상대 오차 ±약 25%라고 함께 알려드려요.'],
  ['앱을 설치해야 하나요?', '설치 없이 웹에서 바로 쓸 수 있어요. 휴대폰 브라우저에서 ‘홈 화면에 추가’를 하면 앱처럼 열려요.'],
];

const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => <div className="card" style={{ borderRadius: 24, boxShadow: '0 6px 20px rgba(0,0,0,.06)', ...style }}>{children}</div>;

export function Landing() {
  return (
    <div className="ld">
      <header><div className="wrap">
        <a className="logo" href="#/"><i /><b>1분체크</b></a>
        <nav><a href="#how">작동 방식</a><a href="#features">기능</a><a href="#items">12가지 항목</a><a href="#evidence">근거</a><a href="#faq">자주 묻는 질문</a></nav>
        <StartBtn kind="nav" base="btn lime sm" label="지금 체크하기" />
      </div></header>

      <section className="dots"><div className="wrap hero">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <span className="pill" style={{ alignSelf: 'flex-start', background: 'var(--linen)', color: 'var(--ink)' }}>만 19세 이상 · 설치·가입 없이</span>
          <h1>1분이면 보는<br /><b>내 몸의 확률</b></h1>
          <p style={{ margin: 0 }}>질문 몇 개에 답하면 나이·성별이 같은 한국인 통계와 비교해 12가지 건강 항목을 ‘100명 중 몇 명’으로 보여드려요. 무엇을 바꾸면 얼마나 줄어드는지까지요.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><StartBtn kind="main" base="btn lime" label="1분 체크 시작하기" /><a className="btn line" href="#how">어떻게 계산하나요?</a></div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
            {['서버 저장 없음', '국민건강영양조사 공표 통계·원시자료', '한국인 검증 설문 도구'].map((t) => <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icon.check}{t}</span>)}
          </div>
        </div>
        <MiniTrial />
      </div></section>

      <section id="how" className="wrap"><div className="panel dots" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44 }}>
        <h2 style={{ textAlign: 'center' }}>가장 쉬운 건강 셀프체크</h2>
        <div className="steps" style={{ width: '100%' }}>
          {[['기본정보 12문항', '나이·키·몸무게·허리, 흡연·음주·운동, 가족력. 약 60초면 끝나요. 허리를 몰라도 범위로 보여드려요.', 'var(--linen)'],
            ['궁금한 분야만 더', '수면·마음·소화·식생활 중에서 골라요. 해당하는 답을 했을 때만 질문이 더 열려요.', '#e3edf3'],
            ['100명 중 몇 명으로', '또래와 비교하고, 근거 논문과 다음에 할 일까지 한 화면에서 봐요.', 'var(--bg)']].map(([t, d, bg], k) => (
            <Card key={t} style={{ overflow: 'hidden' }}>
              <div style={{ height: 8, background: bg }} />
              <div style={{ padding: '26px 28px 30px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--ink)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k + 1}</span><b style={{ fontSize: 21, color: 'var(--obsidian)' }}>{t}</b></div>
                <span style={{ fontSize: 15, lineHeight: 1.6 }}>{d}</span>
              </div>
            </Card>
          ))}
        </div>
        <StartBtn kind="text" base="btn lime" label="1분 체크 시작하기" />
      </div></section>

      <section id="features" className="wrap sec" style={{ display: 'flex', flexDirection: 'column', gap: 80 }}>
        <h2 style={{ textAlign: 'center' }}>주요 기능 살펴보기</h2>
        <div className="zig">
          <div className="txt"><h3>퍼센트 대신, 100명 중 몇 명</h3><p>‘{D.r.value?.toFixed(1)}%’보다 ‘100명 중 약 {D.n}명’이 더 잘 와닿아요. 사람 아이콘 100개 위에 내 몫과, 관리하면 빠지는 몫을 함께 그려요.</p><a className="gbtn" href="#/start">내 결과 보기</a></div>
          <div className="vis" style={{ background: 'var(--linen)' }}><Card style={{ width: '100%', maxWidth: 420, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>나와 같은 조건인 사람 100명 중</span><b style={{ fontSize: 84, lineHeight: 0.95, fontWeight: 900, letterSpacing: '-0.06em', color: 'var(--obsidian)' }}>{D.n}<small style={{ fontSize: 22 }}>명</small></b><People cells={D.people} />
          </Card></div>
        </div>
        <div className="zig">
          <div className="vis" style={{ background: 'var(--bg)' }}><Card style={{ width: '100%', maxWidth: 420, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ color: 'var(--obsidian)' }}>또래 곡선</b><span className="cap">{D.group} · 당뇨 유병률</span></div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150, borderBottom: '1px solid var(--line2)' }}>
              {D.bands.map((b) => <div key={b.l} style={{ position: 'relative', flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: '8px 8px 0 0', background: b.mine ? '#eef6e8' : 'transparent' }}>
                <div style={{ height: `${(b.v / 30) * 100}%`, borderRadius: '6px 6px 0 0', background: b.mine ? 'var(--ink)' : '#c2c6be' }} />
                {b.mine && <i style={{ position: 'absolute', left: '50%', bottom: `${((D.r.value ?? 0) / 30) * 100}%`, transform: 'translate(-50%,50%)', width: 16, height: 16, borderRadius: '50%', background: 'var(--lime)', border: '3px solid var(--ink)', boxSizing: 'border-box' }} />}
              </div>)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>{D.bands.map((b) => <span key={b.l} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--slate)' }}>{b.l}</span>)}</div>
          </Card></div>
          <div className="txt"><h3>같은 나이·성별과 나란히</h3><p>연령대별 한국인 유병률 위에 내 값을 찍어 보여드려요. 낮음·비슷·높음을 한눈에 보고, 비교값의 뜻이 다를 땐 그 차이도 함께 적어둬요.</p><a className="gbtn" href="#evidence">통계 출처 보기</a></div>
        </div>
        <div className="zig">
          <div className="txt"><h3>빨간 경고 대신, 줄어드는 만큼</h3><p>체중·허리·흡연·음주·운동을 바꾸면 영향을 받는 항목이 바로 다시 계산돼요. 겁주지 않고, 무엇을 하면 얼마나 좋아지는지를 차분하게 보여드려요.</p><a className="gbtn" href="#/start">바꿔보기 체험하기</a></div>
          <div className="vis" style={{ background: 'var(--ink)' }}><Card style={{ width: '100%', maxWidth: 420, padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6 }}><b style={{ color: 'var(--obsidian)' }}>{R.scenarioText}</b><span className="tag" style={{ background: 'var(--lime)', color: 'var(--ink)' }}>{W.down}개 항목 ↓</span></div>
            {WI.map((w) => <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 52, padding: '0 16px', borderRadius: 14, background: 'var(--bg)' }}><b style={{ color: 'var(--obsidian)' }}>{w.name}</b><span style={{ color: 'var(--slate)' }}>{w.b} → <b style={{ fontSize: 18, color: 'var(--obsidian)' }}>{w.a}</b></span></div>)}
          </Card></div>
        </div>
        {REC && <div className="zig">
          <div className="vis" style={{ background: '#e3edf3' }}><Card style={{ width: '100%', maxWidth: 420, padding: '8px 24px' }}>
            {REC.rows.filter((r) => r.a.includes('%')).slice(0, 4).map((r) => <div key={r.id} className="row" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ color: 'var(--obsidian)' }}>{r.name}</b><span style={{ color: 'var(--slate)' }}>{r.b} → <b style={{ fontSize: 17, color: 'var(--obsidian)' }}>{r.a}</b></span></div>)}
          </Card></div>
          <div className="txt"><h3>다시 체크하면, 달라진 만큼</h3><p>원할 때만 이 기기에 기록을 남기고, 지난 결과와 나란히 비교해요. 예시 사용자는 {REC.habit.replace('했어요', '하고')} 다시 체크해 {REC.down}개 항목이 좋아졌어요.</p><a className="gbtn" href="#/record">기록 비교 보기</a></div>
        </div>}
      </section>

      <section id="items" className="wrap"><div className="band">
        <h2 style={{ color: '#fff' }}>12가지 건강 항목을 <span style={{ color: 'var(--lime)' }}>1분 만에</span></h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, maxWidth: 980, margin: '28px auto' }}>
          {ITEMS.map(([n, t]) => <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 9999, background: 'var(--spruce)', fontSize: 15, fontWeight: 600, color: '#fff' }}>{n}<span style={{ fontSize: 12, color: 'var(--lime)' }}>{t}</span></span>)}
        </div>
        <StartBtn kind="text" base="btn" label="지금 확인하기" style={{ background: '#fff', color: 'var(--ink)' }} />
      </div></section>

      <section id="evidence" className="wrap sec"><div className="ev">
        <div style={{ padding: 28, borderRadius: 20, border: '1px solid var(--line2)', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
          <span className="cap">근거</span><b style={{ fontSize: 26, lineHeight: 1.25, color: 'var(--obsidian)' }}>숫자마다<br />출처가 있어요</b><span style={{ fontSize: 14 }}>원문 표와 논문을 직접 확인한 수치만 써요.</span>
        </div>
        {SRC.map(([k, t, d, u]) => <a key={t} href={u} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 28, borderRadius: 20, background: 'var(--bg)', textDecoration: 'none' }}>
          <span className="pill" style={{ alignSelf: 'flex-start', background: 'var(--linen)', color: 'var(--ink)' }}>{k}</span><b style={{ fontSize: 18, color: 'var(--obsidian)' }}>{t}</b><span style={{ fontSize: 14, color: 'var(--charcoal)' }}>{d}</span><span style={{ marginTop: 'auto', fontSize: 13, fontWeight: 700 }}>원문 보기 →</span></a>)}
      </div></section>

      <section className="wrap"><div className="panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 36, background: 'var(--linen)' }}>
        {[['기기 안에서만 계산', '답한 내용은 서버로 보내지 않아요. 방문 분석 도구에도 넘기지 않아요.'], ['기록은 원할 때만', '저장을 누른 경우에만 이 기기에 남기고, 언제든 지울 수 있어요.'], ['진단이 아닌 참고 정보', '통계로 보는 내 위치예요. 확인은 국가건강검진과 진료로 해요.']].map(([t, d]) => (
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
        <h2 style={{ fontSize: 'clamp(38px, 5vw, 56px)', fontWeight: 900, color: 'var(--ink)' }}>1분, 지금 체크해요</h2>
        <p style={{ fontSize: 18, color: 'var(--ink)' }}>가입 없이, 기기 안에서 바로 계산해요.</p>
        <StartBtn kind="main" base="btn dark" label="시작하기" />
      </div></section>

      <footer><div className="wrap">
        <div className="fcols">
          <div><a className="logo" href="#/"><i /><b>1분체크</b></a><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--obsidian)' }}>1분이면 보는 내 몸의 확률</p></div>
          <div><span className="cap">서비스</span><StartBtn kind="link" base="" label="체크 시작" /><a href="#/record">기록 비교</a><a href="#items">12가지 항목</a></div>
          <div><span className="cap">근거</span><a href="#evidence">통계·논문</a><a href="#faq">자주 묻는 질문</a></div>
          <div><span className="cap">도움</span><a href="tel:109">자살예방상담 109</a><a href="https://www.kdca.go.kr" target="_blank" rel="noreferrer">질병관리청</a></div>
        </div>
        <p className="help" style={{ marginTop: 32, maxWidth: 820 }}>1분체크는 논문과 국가 통계를 바탕으로 한 수학적 추정을 보여주는 참고 서비스예요. 진단이 아니며, 실제 판정은 반드시 의사가 해요. © 2026 1분체크</p>
      </div></footer>
    </div>
  );
}
