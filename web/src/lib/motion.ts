// 손끝 반응 도구 (리퀴드 글래스). 수치: docs/DESIGN.md 움직임 표 · 시안 shared/motion.js
//   usePress   누르면 줄지 않고 살짝 부풀며 떠오른다 (1.06배)
//   useLens    가장자리 굴절 (크롬 계열 · 크기가 고정된 요소만). 안 되면 흐림 유리로 남는다
//   useDroplet 탭 · 고르기의 물방울 선택 표시 (가는 쪽 끝이 먼저, 반대쪽 끝이 늦게)
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { Spring, PRESS, LEAD, TRAIL, reducedMotion } from './spring';

/** 요소 하나에 누름 반응을 붙이고, 떼는 함수를 돌려준다 */
export function attachPress(el: HTMLElement, swell = 1.06) {
  const s = new Spring(1, PRESS, (v) => { el.style.scale = v === 1 ? '' : String(v); });
  const down = (e: PointerEvent) => { if (e.button === 0 && !(el as HTMLButtonElement).disabled) s.to(swell); };
  const up = () => s.to(1);
  el.addEventListener('pointerdown', down);
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel'] as const) el.addEventListener(ev, up);
  return () => { s.stop(); el.removeEventListener('pointerdown', down); for (const ev of ['pointerup', 'pointerleave', 'pointercancel'] as const) el.removeEventListener(ev, up); };
}
export function usePress<T extends HTMLElement>(ref: RefObject<T>, swell = 1.06) {
  useEffect(() => { const el = ref.current; return el ? attachPress(el, swell) : undefined; }, [ref, swell]);
}

// ── 렌즈 굴절: 둥근 사각형 가장자리 몇 px 안에서만 바깥쪽으로 밀어내는 SVG displacement ──
const CHROMIUM = typeof navigator !== 'undefined' && /Chrome\//.test(navigator.userAgent) && !/OPR\//.test(navigator.userAgent);
let defs: SVGDefsElement | null = null;
export function useLens<T extends HTMLElement>(ref: RefObject<T>, { strength = 20, edge = 16, blur = 12, saturate = 1.7 } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !CHROMIUM || reducedMotion()) return;
    if (!defs) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
      svg.style.position = 'absolute';
      defs = document.createElementNS(svg.namespaceURI, 'defs') as SVGDefsElement;
      svg.appendChild(defs); document.body.appendChild(svg);
    }
    const id = 'lens' + Math.random().toString(36).slice(2, 8);
    let lastKey = '';
    const build = () => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      if (!w || !h || `${w}x${h}` === lastKey) return;
      lastKey = `${w}x${h}`;
      const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d')!, img = ctx.createImageData(w, h), d = img.data;
      const sdf = (x: number, y: number) => {   // 둥근 사각형까지의 거리 (안쪽이 음수)
        const qx = Math.abs(x - w / 2) - (w / 2 - r), qy = Math.abs(y - h / 2) - (h / 2 - r);
        return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
      };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const t = Math.max(0, 1 - -sdf(x + 0.5, y + 0.5) / edge) ** 2;
        const nx = sdf(x + 1.5, y + 0.5) - sdf(x - 0.5, y + 0.5), ny = sdf(x + 0.5, y + 1.5) - sdf(x + 0.5, y - 0.5);
        const n = Math.hypot(nx, ny) || 1, i = (y * w + x) * 4;
        d[i] = 128 + (nx / n) * t * 127; d[i + 1] = 128 + (ny / n) * t * 127; d[i + 2] = 128; d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      defs!.querySelector('#' + id)?.remove();
      defs!.insertAdjacentHTML('beforeend',
        `<filter id="${id}" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
           <feImage href="${cv.toDataURL()}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>
           <feDisplacementMap in="SourceGraphic" in2="map" scale="${strength}" xChannelSelector="R" yChannelSelector="G"/>
         </filter>`);
      const f = `url(#${id}) blur(${blur}px) saturate(${saturate})`;
      el.style.backdropFilter = f; el.style.setProperty('-webkit-backdrop-filter', f);
    };
    build();
    const ro = new ResizeObserver(build); ro.observe(el);
    return () => { ro.disconnect(); defs?.querySelector('#' + id)?.remove(); el.style.backdropFilter = ''; el.style.removeProperty('-webkit-backdrop-filter'); };
  }, [ref, strength, edge, blur, saturate]);
}

/** 물방울 선택 표시. go(대상) 하면 표시가 그 칸으로 간다. onDraw 로 겹친 칸 글자 키우기 등 */
export function useDroplet(ind: RefObject<HTMLElement>, onDraw?: (L: number, R: number) => void) {
  const st = useRef<{ L: number; R: number; left: Spring; right: Spring } | null>(null);
  const drawRef = useRef(onDraw); drawRef.current = onDraw;
  if (!st.current) {
    const o = { L: 0, R: 0 } as { L: number; R: number; left: Spring; right: Spring };
    const draw = () => { const el = ind.current; if (el) { el.style.left = o.L + 'px'; el.style.width = Math.max(0, o.R - o.L) + 'px'; } drawRef.current?.(o.L, o.R); };
    o.left = new Spring(0, TRAIL, (v) => { o.L = v; draw(); });
    o.right = new Spring(0, TRAIL, (v) => { o.R = v; draw(); });
    st.current = o;
  }
  useEffect(() => () => { st.current!.left.stop(); st.current!.right.stop(); }, []);
  const api = useRef({
    /** a ~ b (부모 기준 px) 로 */
    span(a: number, b: number, instant = false) {
      const o = st.current!;
      if (instant || reducedMotion()) { o.left.set(a); o.right.set(b); return; }
      const goingRight = (a + b) / 2 > (o.L + o.R) / 2;
      (goingRight ? o.right : o.left).params(LEAD);   // 가는 쪽 끝이 먼저
      (goingRight ? o.left : o.right).params(TRAIL);  // 반대쪽 끝이 늦게 따라온다
      o.left.to(a); o.right.to(b);
    },
    go(el: HTMLElement | null | undefined, instant = false, inset = 0) {
      if (el) this.span(el.offsetLeft + inset, el.offsetLeft + el.offsetWidth - inset, instant);
    },
    get L() { return st.current!.L; }, get R() { return st.current!.R; },
  });
  return api.current;
}

/** 처음 그릴 때(크기가 잡힌 뒤) 한 번 바로 놓기 */
export function useFirstPlace(fn: () => void) {
  const done = useRef(false);
  useLayoutEffect(() => { if (!done.current) { done.current = true; fn(); } });
}
