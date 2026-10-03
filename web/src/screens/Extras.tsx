import type { Extra } from '../../../engine/src/extras.ts';
import { INK, LOOK } from '../lib/view.ts';

const LV = { look: ['var(--look-bg)', LOOK, '확인 필요'], note: ['var(--linen)', INK, '참고'], ok: ['var(--linen)', INK, '해당 없음'] } as const;
const MARK = {
  yes: ['●', LOOK, '해당'], maybe: ['◐', LOOK, '확인'], no: ['○', '#9aa096', '아님'], unknown: ['?', 'var(--slate)', '모름'], info: ['·', 'var(--slate)', ''],
} as const;
const CHECK = { yes: ['●', INK, '권장'], maybe: ['◐', INK, '조건부'], no: ['○', '#9aa096', ''], unknown: ['?', 'var(--slate)', ''], info: ['·', 'var(--slate)', ''] } as const;

/** 생활·검진으로 보는 추가 체크 카드 (engine/src/extras.ts) */
const LEAD = '새 질문 없이 지금 답으로 공식 기준과 검증된 점수를 적용했어요. 대부분 확률이 아니라 기준에 해당하는지예요. ‘모름’은 낮다는 뜻이 아니에요.';
export function ExtraCards({ xs, title = '생활·검진으로 보는 체크', lead = LEAD }: { xs: Extra[]; title?: string; lead?: string }) {
  if (!xs.length) return null;
  return (
    <>
      <h2 className="h2">{title}</h2>
      <p className="lead" style={{ marginTop: -6, fontSize: 13, color: 'var(--slate)' }}>{lead}</p>
      {xs.map((x) => {
        const [bg, fg, tag] = LV[x.level], M = x.id === 'checkup' ? CHECK : MARK;
        return (
          <section key={x.id} className="card" aria-label={x.name} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{x.name}</b>
              <span className="tag" style={{ background: bg, color: fg, flexShrink: 0 }}>{x.tag ?? tag}</span>
            </div>
            <b style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.35, color: x.level === 'look' ? LOOK : 'var(--obsidian)' }}>{x.head}</b>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {x.items.map((it) => {
                const [m, c, w] = M[it.s];
                return (
                  <li key={it.t} style={{ display: 'grid', gridTemplateColumns: '16px 1fr auto', gap: 8, alignItems: 'baseline', fontSize: 13, lineHeight: 1.45 }}>
                    <span aria-hidden style={{ color: c, fontSize: 11 }}>{m}</span>
                    <span style={{ color: it.s === 'no' ? 'var(--slate)' : 'var(--obsidian)' }}>{it.t}{it.sub && <span style={{ display: 'block', fontSize: 12, color: 'var(--slate)' }}>{it.sub}</span>}</span>
                    {w && <span style={{ fontSize: 11, fontWeight: 700, color: c, whiteSpace: 'nowrap' }}>{w}</span>}
                  </li>
                );
              })}
            </ul>
            <div style={{ padding: '10px 12px', borderRadius: 12, background: x.level === 'look' ? 'var(--look-bg)' : 'var(--bg)', color: x.level === 'look' ? LOOK : 'var(--charcoal)', fontSize: 13, fontWeight: x.level === 'look' ? 700 : 500, lineHeight: 1.5 }}>→ {x.action}</div>
            <details><summary style={{ fontSize: 12, color: 'var(--slate)' }}>근거</summary><p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--slate)' }}>{x.source}</p></details>
          </section>
        );
      })}
    </>
  );
}
