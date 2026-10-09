// 랜딩 첫 화면(A안): 원래 진초록 사진 배경 + 큰 제목·버튼 + 둥근 화면 틀 안의 1분 소개 영상.
// 영상은 틀 안에서만 소리 없이 반복 재생한다(PC·태블릿에서 화면을 꽉 채우지 않는다).
// 방문자 부담: 처음엔 첫 장면 사진(약 17KB)만, 페이지가 다 뜬 뒤 화면에 보일 때 소리 없는 영상(약 1.6MB)을 받는다.
// '전체 화면'을 누를 때만 소리 있는 영상(약 2.4MB)을 받아 처음부터 소리와 함께 재생한다. 데이터 절약·동작 줄이기면 자동 재생하지 않는다.
import { useEffect, useRef, type ReactNode } from 'react';
import { Maximize2 } from 'lucide-react';
import './hero-video.css';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = () => !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
type FsVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

export function HeroVideo({ actions, note, art }: { actions: ReactNode; note?: ReactNode; art: { pc?: string; m?: string } }) {
  const base = import.meta.env.BASE_URL;
  const screen = useRef<HTMLDivElement>(null), video = useRef<FsVideo>(null);

  // 영상 받기: 페이지가 다 뜬 뒤, 화면에 보일 때. 화면 밖이면 멈춘다
  useEffect(() => {
    const v = video.current!, sc = screen.current!;
    if (saveData() || reduced()) return;   // 사진만 두고, 전체 화면을 누르면 재생
    let io: IntersectionObserver | null = null;
    const start = () => {
      io = new IntersectionObserver(([e]) => {
        if (document.fullscreenElement) return;
        if (e.isIntersecting) { if (!v.getAttribute('src')) v.src = base + 'video/hero.mp4'; v.play().catch(() => {}); } else v.pause();
      }, { threshold: 0.25 });
      io.observe(sc);
    };
    if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
    // 전체 화면에서 나오면 다시 소리 없이 반복
    const exit = () => { if (!document.fullscreenElement) { v.muted = true; v.controls = false; } };
    document.addEventListener('fullscreenchange', exit);
    return () => { removeEventListener('load', start); io?.disconnect(); document.removeEventListener('fullscreenchange', exit); };
  }, [base]);

  /** 전체 화면: 소리 있는 영상을 처음부터 */
  const full = () => {
    const v = video.current!;
    if (!v.getAttribute('src')?.includes('hero-sound')) v.src = base + 'video/hero-sound.mp4';
    v.currentTime = 0; v.muted = false; v.controls = true; v.play().catch(() => {});
    if (v.requestFullscreen) v.requestFullscreen().catch(() => {}); else v.webkitEnterFullscreen?.();   // 아이폰 사파리
  };

  return (
    <section className="hv" aria-labelledby="hv-title">
      <div className="hv-bg" aria-hidden><picture><source media="(max-width: 700px)" srcSet={art.m} /><img src={art.pc} alt="" /></picture></div>
      <div className="hv-shade" aria-hidden />
      <div className="hv-inner">
        <div className="hv-copy">
          <h1 id="hv-title">내 몸이 궁금할 때<br /><em>딱 1분.</em></h1>
          <p className="hv-lead">또래 속 내 위치를 알고,<br />바꿨을 때의 차이를 느껴 보세요.</p>
          <div className="hv-actions">{actions}</div>
          {note && <small className="hv-note">{note}</small>}
        </div>
        <div ref={screen} className="hv-screen">
          <video ref={video} className="hv-video" poster={base + 'video/hero-poster.jpg'} muted loop playsInline preload="none" aria-label="1분체크 소개 영상 (1분)" />
          <button type="button" className="hv-full" onClick={full} aria-label="소개 영상 전체 화면으로 보기 (소리 있음)"><Maximize2 size={14} /> 전체 화면</button>
        </div>
      </div>
    </section>
  );
}
