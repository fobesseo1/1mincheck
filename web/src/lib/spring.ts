// 애플식 스프링 (response · damping). 목표가 바뀌면 지금 값 · 속도에서 이어 간다. 라이브러리 없이 rAF 하나로 돈다.
// 수치는 docs/DESIGN.md 움직임 표 (시안 shared/motion.js 와 같음).
export const MORPH = { response: 0.45, damping: 0.86 };   // 모양 변화 · 단계 · 숫자 세기
export const PRESS = { response: 0.25, damping: 0.72 };   // 누름
export const SNAP = { response: 0.3, damping: 0.9 };      // 손잡이 · 렌즈 따라붙기
export const LEAD = { response: 0.28, damping: 0.86 };    // 물방울 앞쪽 끝
export const TRAIL = { response: 0.42, damping: 0.86 };   // 물방울 뒤쪽 끝
type Params = { response: number; damping: number };

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const live = new Set<Spring>();
let last = 0;
function tick(now: number) {
  const dt = Math.min(0.032, (now - (last || now)) / 1000);
  last = now;
  for (const s of live) s.step(dt);
  if (live.size) requestAnimationFrame(tick); else last = 0;
}
const wake = (s: Spring) => { if (!live.size) requestAnimationFrame(tick); live.add(s); };

export class Spring {
  value: number; target: number; v = 0;
  private k = 0; private c = 0;
  constructor(value: number, p: Params, private onUpdate: (v: number) => void = () => {}) {
    this.value = this.target = value;
    this.params(p);
    onUpdate(value);
  }
  params({ response, damping }: Params) { this.k = (2 * Math.PI / response) ** 2; this.c = 4 * Math.PI * damping / response; return this; }
  to(t: number) { this.target = t; if (reducedMotion()) return this.set(t); wake(this); return this; }
  set(t: number) { this.value = this.target = t; this.v = 0; live.delete(this); this.onUpdate(t); return this; }
  kick(v: number) { if (reducedMotion()) return this; this.v += v; wake(this); return this; }
  stop() { live.delete(this); }
  step(dt: number) {
    const n = Math.ceil(dt / 0.004), h = dt / n;
    for (let i = 0; i < n; i++) { this.v += (-this.k * (this.value - this.target) - this.c * this.v) * h; this.value += this.v * h; }
    if (Math.abs(this.value - this.target) < 1e-4 && Math.abs(this.v) < 1e-3) { this.value = this.target; this.v = 0; live.delete(this); }
    this.onUpdate(this.value);
  }
}
