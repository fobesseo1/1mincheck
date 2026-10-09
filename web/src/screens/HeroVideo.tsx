// 랜딩 첫 화면: 큰 제목·버튼 + 그 아래 소개 영상(1분). 영상은 화면 폭 80%의 둥근 화면으로 시작해 스크롤하면 화면을 꽉 채운다.
// 방문자 부담: 처음엔 첫 장면 사진(약 17KB)만, 페이지가 다 뜬 뒤 화면에 보일 때 소리 없는 영상(약 1.6MB)을 받는다.
// 소리 있는 영상(약 2.4MB)은 '소리 켜고 처음부터'를 누를 때만. 데이터 절약·동작 줄이기면 자동 재생하지 않는다.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import './hero-video.css';

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = () => !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

export function HeroVideo({ actions, note }: { actions: ReactNode; note?: ReactNode }) {
  const base = import.meta.env.BASE_URL;
  const stage = useRef<HTMLDivElement>(null), frame = useRef<HTMLDivElement>(null), video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'idle' | 'muted' | 'sound'>('idle');

  // 스크롤: 둥근 화면(폭 80%) → 꽉 찬 화면
  useLayoutEffect(() => {
    const st = stage.current!, fr = frame.current!;
    let f = 0;
    const run = () => {
      f = 0;
      const W = innerWidth, H = innerHeight, wide = W >= 900 && !reduced();
      st.dataset.mode = wide ? 'wide' : 'narrow';
      if (!wide) { fr.style.width = ''; fr.style.height = ''; fr.style.borderRadius = ''; return; }
      const r = st.getBoundingClientRect(), t = ease(clamp(-r.top / Math.max(1, (r.height - H) * 0.7)));
      // 영상은 늘 16:9 그대로(잘리거나 확대되지 않게). 끝 크기 = 화면 폭, 단 높이가 화면을 넘지 않게
      const full = Math.min(W, (H * 16) / 9), w = lerp(Math.min(W * 0.8, 1240, ((H - 120) * 16) / 9), full, t);
      fr.style.width = w + 'px';
      fr.style.height = (w * 9) / 16 + 'px';
      fr.style.borderRadius = lerp(28, 0, t) + 'px';
    };
    const go = () => { if (!f) f = requestAnimationFrame(run); };
    run(); addEventListener('scroll', go, { passive: true }); addEventListener('resize', go);
    return () => { cancelAnimationFrame(f); removeEventListener('scroll', go); removeEventListener('resize', go); };
  }, []);

  // 영상 받기: 페이지가 다 뜬 뒤, 화면에 보일 때. 화면 밖이면 멈춘다
  useEffect(() => {
    const v = video.current!, fr = frame.current!;
    if (saveData() || reduced()) return;   // 사진만 두고, 누르면 재생
    let io: IntersectionObserver | null = null;
    const start = () => {
      io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          if (!v.src) { v.src = base + 'video/hero.mp4'; setState('muted'); }
          v.play().catch(() => {});
        } else v.pause();
      }, { threshold: 0.25 });
      io.observe(fr);
    };
    if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
    return () => { removeEventListener('load', start); io?.disconnect(); };
  }, [base]);

  const playMuted = () => { const v = video.current!; v.src = base + 'video/hero.mp4'; v.muted = true; v.play().catch(() => {}); setState('muted'); };
  const withSound = () => {
    const v = video.current!;
    if (state === 'sound') { v.muted = !v.muted; setState(v.muted ? 'muted' : 'sound'); return; }
    v.src = base + 'video/hero-sound.mp4'; v.muted = false; v.currentTime = 0; v.play().catch(() => {}); setState('sound');
  };

  return (
    <section className="hv" aria-labelledby="hv-title">
      <div className="hv-head">
        <h1 id="hv-title">내 몸이 궁금할 때<br /><em>딱 1분.</em></h1>
        <p className="hv-lead">또래 속 내 위치를 알고,<br />바꿨을 때의 차이를 느껴 보세요.</p>
        <div className="hv-actions">{actions}</div>
        {note && <small className="hv-note">{note}</small>}
      </div>
      <div ref={stage} className="hv-stage">
        <div className="hv-sticky">
          <div ref={frame} className="hv-frame">
            <video ref={video} className="hv-video" poster={base + 'video/hero-poster.jpg'} muted loop playsInline preload="none" aria-label="1분체크 소개 영상 (1분)" />
            {state === 'idle' && (saveData() || reduced()) && <button type="button" className="hv-play" onClick={playMuted}><Play size={22} fill="currentColor" /> 영상 보기 (1분)</button>}
            <button type="button" className="hv-sound" onClick={withSound} aria-pressed={state === 'sound'}>
              {state === 'sound' ? <><VolumeX size={16} /> 소리 끄기</> : <><Volume2 size={16} /> 소리 켜고 처음부터 보기</>}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
