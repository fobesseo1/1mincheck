// v2 랜딩: 홍보영상 흐름 그대로 — 숫자 몇 개(미니 체험) → 또래 100명 중 나 → 줄이면? → 검진 풀이 → 짧은 FAQ.
// 예시 숫자는 모두 앱과 같은 함수(lines.ts·peer.ts·labZones.ts)로 계산한다.
import './landing.css';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Icon, useStore } from '../ui.tsx';
import { MiniTrial, loadMini, miniDraft, MINI_CTA } from './MiniTrial.tsx';
import { toInput } from '../state.ts';
import { Dots, LineBar } from './Results.tsx';
import { ZoneBar } from './Labs.tsx';
import { peerCards } from '../lib/peer.ts';
import { bmiGauge, waistGauge, futureEffects } from '../lib/lines.ts';
import { labCards } from '../lib/labZones.ts';
import { PRIVACY_LINE } from '../lib/share.ts';
import type { AppInput } from '../state.ts';

/** 미니 체험 결과(탭 세션)를 구독: 없으면 null */
function useMini() {
  const [m, setM] = useState(loadMini);
  useEffect(() => { const on = () => setM(loadMini()); window.addEventListener('mini-change', on); return () => window.removeEventListener('mini-change', on); }, []);
  return m;
}
/** '체크 시작' 버튼. 미니 결과가 있으면 그 단계의 색·문구로, 누르면 미니에 넣은 4개 값을 가지고 이어서.
 *  kind: nav(상단)·main(첫 화면·아래 띠)은 색까지, text(중간 섹션)는 문구만 바꾼다(빨강이 여러 개면 무뎌지므로). */
function StartBtn({ kind, base, label, style }: { kind: 'nav' | 'main' | 'text' | 'link'; base: string; label: string; style?: React.CSSProperties }) {
  const m = useMini(), { setDraft, draft } = useStore();
  // 이미 결과가 있으면(기본정보를 다 채움) 결과로
  if (kind !== 'main' && kind !== 'nav' && toInput(draft)) return <a className={base} href="#/result" style={style}>내 결과 보기</a>;
  const toned = m?.tone != null;
  const set = !m ? null : toned ? MINI_CTA[m.tone!] : MINI_CTA.partial;
  const text = !set ? label : set[kind === 'nav' || kind === 'link' ? 'nav' : 'main'];
  const cls = toned && (kind === 'nav' || kind === 'main') ? `${base.replace(/\b(lime|dark)\b/, '')} tone-${m!.tone}` : base;
  // 미니에 한 칸이라도 넣었으면 넣은 값을 채운 채 기본정보로
  const go = (e: React.MouseEvent) => { if (!m) return; e.preventDefault(); setDraft((d) => ({ ...d, ...miniDraft(m) })); location.hash = '#/info'; };
  return <a className={cls || undefined} href="#/start" onClick={go} style={toned && kind !== 'text' && kind !== 'link' ? undefined : style}>{text}</a>;
}

// ── 예시 (영상과 같은 장면). 52세 남성 · 172cm · 82kg · 허리 92cm · 혈압 정상 · 운동 안 함 ──
const EX: AppInput = { age: 52, sex: 'M', heightCm: 172, weightKg: 82, waistCm: 92, smoke: 'never', alcohol: 'lt1', famDM: false, dx: { htn: false, dm: false, chol: false }, bp: 'normal', exercise: false, meno: null };
const EX_PEER = peerCards(EX).find((c) => c.id === 'htn')!;
const EX_DW = -4, EX_DWA = -3;
const EX_FX = futureEffects(EX, EX_DW, EX_DWA).effects.find((e) => e.id === 'dm10')!;
const EX_LAB = labCards({ glu: 108 }, 'M')[0];
const FAQ = [
  ['검사 없이 건강 상태를 알 수 있나요?', '간단한 몸 정보와 생활습관으로 지금 건강을 가늠해 볼 수 있어요. 국가 건강통계와 한국인 연구로 계산한 참고 정보이고, 실제 질환 여부는 검사와 진료로 확인해요.'],
  ['입력한 정보는 저장되나요?', '입력한 건강정보는 서버로 보내지 않고 이 기기 안에서만 계산해요. 결과는 ‘기록 저장’을 눌렀을 때만 이 기기에 보관되고, 언제든 지울 수 있어요.'],
  ['‘또래 100명 중 나’는 어떻게 계산하나요?', '국민건강영양조사(2022–2024)에서 나와 성별이 같고 나이가 ±5세인, 아직 진단받지 않은 사람들에게 같은 계산을 해 본 분포예요. 그 100명을 위험이 낮은 순서로 세웠을 때 내 자리를 보여드려요.'],
  ['몸무게나 허리를 바꾸면 왜 숫자가 계단처럼 바뀌나요?', '한국인 추적 연구의 점수표가 BMI 25·30, 허리 남 90·여 85cm 같은 기준선으로 점수를 매기기 때문이에요. 그래서 기준선을 넘는지를 먼저 보여드려요. 기간도 연구 그대로(10년·4년) 써요.'],
  ['앱을 설치해야 하나요?', '설치 없이 웹에서 바로 쓸 수 있어요. 휴대폰 홈 화면에 추가하면 다음에 더 편하게 열 수 있어요.'],
];

/** 소개 영상: 처음엔 그림만(가볍게), 누르면 받아서 소리와 함께 재생 */
function VideoButton() {
  const dlg = useRef<HTMLDialogElement>(null), v = useRef<HTMLVideoElement>(null);
  const base = import.meta.env.BASE_URL;
  const open = () => { dlg.current?.showModal(); v.current?.play().catch(() => {}); };
  return (
    <>
      <button type="button" className="vid-btn" onClick={open} aria-label="1분체크 소개 영상 45초 보기 (소리 있음)">
        <img src={`${base}video/promo-poster.jpg`} alt="" loading="lazy" />
        <span className="vid-cap"><span className="vid-play">▶</span>소개 영상 보기 · 45초 · 소리 있음</span>
      </button>
      <dialog ref={dlg} className="promo-dlg" aria-label="1분체크 소개 영상 45초" onClose={() => v.current?.pause()} onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <button type="button" className="promo-x" aria-label="닫기" onClick={() => dlg.current?.close()}>✕</button>
        <video ref={v} className="promo" src={`${base}video/promo-45s.mp4`} poster={`${base}video/promo-poster.jpg`} controls playsInline preload="none" />
      </dialog>
    </>
  );
}

/** '줄이면?' 예시: 이대로면 ↔ 바꾸면을 번갈아 보여준다(움직임 줄이기면 바꾼 뒤 그대로) */
function ChangeDemo() {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [on, setOn] = useState(reduce);
  useEffect(() => { if (reduce) return; const t = setInterval(() => setOn((x) => !x), 2600); return () => clearInterval(t); }, [reduce]);
  const wg = waistGauge(EX, on ? EX_DWA : 0)!, bg = bmiGauge(EX, on ? EX_DW : 0);
  return (
    <div className="card demo-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 440 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <b style={{ color: 'var(--obsidian)' }}><span className="cap" style={{ marginRight: 6 }}>예시</span>52세 남성</b>
        <span className="tag" style={{ background: on ? 'var(--lime)' : 'var(--fog)', color: 'var(--ink)', transition: 'background .3s' }}>{on ? `허리 ${EX_DWA}cm · 체중 ${EX_DW}kg` : '이대로면'}</span>
      </div>
      <LineBar g={wg} changed={on} />
      <LineBar g={bg} changed={on} />
      <div style={{ padding: '12px 14px', borderRadius: 14, background: on ? 'var(--linen)' : 'var(--bg)', transition: 'background .3s' }}>
        <b style={{ fontSize: 14, color: 'var(--obsidian)' }}>{EX_FX.title}</b>
        <div style={{ fontSize: 15, marginTop: 2 }}>이대로면 <b>{EX_FX.before}</b> → 바꾸면 <b style={{ fontSize: 22, color: on ? 'var(--ink)' : 'var(--slate)' }}>{on ? EX_FX.after : '?'}</b></div>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="ld">
      <header><div className="wrap">
        <a className="logo" href="#/"><i /><b>1분체크</b></a>
        <nav><a href="#peer">또래 중 나</a><a href="#change">줄이면?</a><a href="#labs">검진 풀이</a><a href="#faq">자주 묻는 질문</a></nav>
        <StartBtn kind="nav" base="btn lime sm" label="1분 건강 체크하기" />
      </div></header>

      <section className="dots"><div className="wrap hero">
        <div className="hero-left">
          <h1 className="hero-title">내 몸이 궁금할 때<br /><b>딱 1분.</b></h1>
          <div className="hero-rest">
            <p style={{ margin: 0, fontSize: 'clamp(18px, 2vw, 21px)', fontWeight: 700, color: 'var(--obsidian)' }}>숫자 몇 개면 또래 100명 중 내 자리가 보여요.<br />몸무게·허리를 줄이면 어떻게 되는지도요.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <StartBtn kind="main" base="btn lime" label="1분 건강 체크하기" />
              <a className="btn line" href="#/labs">검진 결과지 풀어보기</a>
            </div>
            <div style={{ display: 'flex', gap: '8px 18px', flexWrap: 'wrap', fontSize: 13, fontWeight: 500, color: 'var(--slate)' }}>
              {['설치·가입 없이', '국가 건강통계와 한국인 연구로 계산', PRIVACY_LINE].map((t) => <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icon.check}{t}</span>)}
            </div>
          </div>
        </div>
        <div className="hero-mini" id="try"><MiniTrial /></div>
      </div></section>

      <section id="peer" className="wrap sec"><div className="zig">
        <div className="txt">
          <span className="kicker">또래 100명 중 나</span>
          <h3>같은 나이·성별 100명을<br />줄 세우면, 나는 몇 번째?</h3>
          <p>‘몇 %’보다 쉽게. 나와 성별이 같고 나이가 비슷한 한국인 100명을 위험이 낮은 순서로 세웠을 때 내 자리를 점 하나로 보여드려요.</p>
          <StartBtn kind="text" base="gbtn" label="내 자리 보기" />
        </div>
        <div className="vis" style={{ background: 'var(--linen)' }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="cap">예시 · {EX_PEER.group}</span>
            <b style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', color: '#cb272f' }}>{EX_PEER.name} · {EX_PEER.word}</b>
            {EX_PEER.kind === 'rank' && <><Dots rank={EX_PEER.rank} hot={false} /><span style={{ fontSize: 14 }}>100명을 위험이 낮은 순서로 세우면 <b>{EX_PEER.rank}번째</b></span></>}
          </div>
        </div>
      </div></section>

      <section id="change" className="wrap"><div className="band" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40, alignItems: 'center', textAlign: 'left' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="kicker" style={{ color: 'var(--lime)' }}>이대로면 vs 바꾸면</span>
          <h2 style={{ color: '#fff' }}>만약 허리를 <span style={{ color: 'var(--lime)' }}>줄이면?</span></h2>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, color: 'rgba(255,255,255,.85)' }}>결과 화면에서 몸무게·허리를 직접 움직여 보세요. 기준선(BMI 23·25, 허리 남 90·여 85cm)을 넘는 순간, 한국인 추적 연구 점수표로 앞으로의 위험이 어떻게 바뀌는지 보여드려요.</p>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,.65)' }}>연구 기간 그대로(10년·4년) 보여드려요. 참고값이며 치료 효과를 보장하지 않아요.</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}><ChangeDemo /></div>
      </div></section>

      <section id="labs" className="wrap sec"><div className="zig">
        <div className="vis" style={{ background: 'var(--bg)' }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><b style={{ color: 'var(--obsidian)' }}>{EX_LAB.title}</b><b style={{ fontSize: 24, color: '#7a5a00' }}>{EX_LAB.value} <small style={{ fontSize: 11, color: 'var(--slate)' }}>mg/dL</small></b></div>
            <ZoneBar c={EX_LAB} delay={300} />
            <div style={{ padding: '10px 12px', borderRadius: 12, background: '#fbeec9', fontSize: 14, lineHeight: 1.5 }}><b style={{ color: '#7a5a00' }}>{EX_LAB.zone}</b> · {EX_LAB.mean}<div style={{ fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>→ {EX_LAB.todo}</div></div>
          </div>
        </div>
        <div className="txt">
          <span className="kicker">검진 풀이</span>
          <h3>검진 결과지,<br />숫자만 있고 뜻은 모르겠다면</h3>
          <p>혈압·혈당·콜레스테롤·콩팥 수치를 넣으면 하나씩 ‘어느 구간인지 · 무슨 뜻인지 · 무엇을 하면 되는지’로 풀어 드려요.</p>
          <a className="gbtn" href="#/labs">결과지 풀어보기</a>
        </div>
      </div></section>

      <section className="wrap"><div className="panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32, alignItems: 'center', background: 'var(--linen)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b style={{ fontSize: 24, color: 'var(--obsidian)', letterSpacing: '-0.03em' }}>45초로 보는 1분체크</b>
          <span style={{ fontSize: 15, lineHeight: 1.6 }}>숫자 몇 개 넣고, 100명 중 내 자리를 보고, 줄이면 어떻게 되는지까지.</span>
        </div>
        <VideoButton />
      </div></section>

      <section id="faq" className="wrap sec"><div className="faq">
        <h2>자주 묻는 질문</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQ.map(([q, a]) => <details key={q} style={{ padding: '20px 24px', borderRadius: 16, background: 'var(--bg)' }}>
            <summary style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 17, fontWeight: 700, color: 'var(--obsidian)' }}>{q}<span style={{ color: 'var(--ink)' }}>{Icon.down}</span></summary>
            <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.65 }}>{a}</p></details>)}
        </div>
      </div></section>

      <section className="wrap"><div className="band" style={{ backgroundColor: 'var(--lime)', backgroundImage: 'radial-gradient(rgba(22,51,0,.12) 1.5px, transparent 1.5px)' }}>
        <h2 style={{ fontSize: 'clamp(34px, 5vw, 56px)', fontWeight: 900, color: 'var(--ink)' }}>지금 내 건강, 1분만 살펴보세요</h2>
        <p style={{ fontSize: 17, color: 'var(--ink)' }}>몸 정보와 생활 질문 2쪽이면 끝나요.</p>
        <StartBtn kind="main" base="btn dark" label="1분 건강 체크하기" />
      </div></section>

      <footer><div className="wrap">
        <div className="fcols">
          <div><a className="logo" href="#/"><i /><b>1분체크</b></a><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--obsidian)' }}>내 몸이 궁금할 때 딱 1분.</p></div>
          <div><span className="cap">서비스</span><StartBtn kind="link" base="" label="1분 건강 체크하기" /><a href="#/labs">검진 풀이</a><a href="#/record">지난 결과 비교</a></div>
          <div><span className="cap">알아두기</span><a href="#faq">자주 묻는 질문</a><a href="https://www.kdca.go.kr" target="_blank" rel="noreferrer">질병관리청</a></div>
        </div>
        <p className="help" style={{ marginTop: 32, maxWidth: 820 }}>1분체크는 국가 건강통계와 연구를 바탕으로 건강 상태를 추정하는 참고 서비스예요. 의료 진단을 대신하지 않으며, 질환 여부는 검사와 진료로 확인해 주세요. © 2026 1분체크</p>
      </div></footer>
    </div>
  );
}
