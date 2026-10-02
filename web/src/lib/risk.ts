/**
 * 위험 표시 규칙 (미니 체험·결과 화면 공통): 절대 비율과 또래 비교 중 '더 경고가 되는 쪽'을 크게.
 * 목적은 검사·진료를 빨리 받게 하는 것. 또래 자체가 위험한 나이대(예: 50대 남성 당뇨 5명 중 1명)에서
 * '또래와 비슷해요'라고만 하면 안전하게 들리므로, 그때는 '4명 중 1명'을 크게 쓰고 '또래도 이만큼 많아요'를 덧붙인다.
 *  - 절대: 20% 이상 강(빨강), 10–20% 중(파랑)
 *  - 또래: 2배 이상 강, 1.25–2배 중, 0.8 미만 낮음 (결과 화면 ratioLabel 과 같은 구간)
 */
export type Sev = 0 | 1 | 2;   // 0 낮음·보통, 1 주의(파랑), 2 높음(빨강)
export const SEV_COLOR = ['var(--ink)', 'var(--look)', '#a8231a'] as const;

/** 퍼센트 → 자연 빈도. 50% 이상은 'n명 중 m명'(분모 2–5), 10–50%는 'n명 중 1명', 10% 미만은 '100명 중 n명' */
export function oneIn(pct: number): string {
  if (pct < 1) return '100명 중 1명 미만';
  if (pct < 10) return `100명 중 ${Math.round(pct)}명`;
  if (pct >= 95) return '거의 모두';
  // 가장 가까운 간단한 분수: 50% 미만은 1/d(d≤10)와 2/5, 50% 이상은 m/d(d≤5)
  const cands = pct < 50 ? [...Array.from({ length: 9 }, (_, k) => [1, k + 2]), [2, 5]] : Array.from({ length: 4 }, (_, k) => k + 2).flatMap((d) => Array.from({ length: d - 1 }, (_, m) => [m + 1, d]));
  const [m, d] = cands.reduce((a, c) => (Math.abs(c[0] / c[1] - pct / 100) < Math.abs(a[0] / a[1] - pct / 100) - 0.005 ? c : a));
  return `${d}명 중 ${m}명`;
}
const xText = (x: number) => (Math.round(x * 10) / 10).toFixed(1);

export function riskView(me: number, peer: number, group: string) {
  const x = peer > 0 ? me / peer : 1;
  const absSev: Sev = me >= 20 ? 2 : me >= 10 ? 1 : 0;
  const relSev: Sev = x >= 2 ? 2 : x >= 1.25 ? 1 : 0;
  const sev = Math.max(absSev, relSev) as Sev;
  const rel = x >= 1.25 ? `또래의 ${xText(x)}배` : x < 0.8 ? '또래보다 낮아요' : peer >= 10 ? '또래도 이만큼 많아요' : '또래와 비슷해요';
  // 메인: 둘 중 더 경고가 되는 쪽. 같으면 절대(자연 빈도)가 더 와닿는다. 둘 다 낮으면 또래 비교(안심 문구)
  const main = sev === 0 ? rel : absSev >= relSev ? oneIn(me) : rel;
  const sub = `${main === rel ? oneIn(me) : rel} · ${group} 평균 ${oneIn(peer)}`;
  return { main, sub, sev, x, absSev, relSev };
}
