import { useStore, Nav, H1, go } from '../ui.tsx';
import { toInput } from '../state.ts';
import { LABS, labError, type LabDef } from '../lib/labs.ts';

/** 숫자 칸 하나 (검진 수치) */
export function LabField({ l }: { l: LabDef }) {
  const { draft: d, setDraft } = useStore();
  const v = d.lab?.[l.key] ?? '';
  const set = (s: string) => setDraft((x) => ({ ...x, lab: { ...x.lab, [l.key]: s } }));
  if (l.options) return (
    <div role="group" aria-label={l.label} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0', borderTop: '1px solid var(--line)' }}>
      <span><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{l.label}</b>{l.help && <span style={{ fontSize: 12, color: 'var(--slate)' }}> · {l.help}</span>}</span>
      <div className="seg">
        {l.options.map(([n, t]) => <button key={n} type="button" aria-pressed={v === String(n)} onClick={() => set(v === String(n) ? '' : String(n))}>{t}</button>)}
      </div>
    </div>
  );
  return (
    <label htmlFor={`lab-${l.key}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: '1px solid var(--line)' }}>
      <span className="grow"><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{l.label}</b>{l.help && <span style={{ display: 'block', fontSize: 12, color: 'var(--slate)' }}>{l.help}</span>}</span>
      <input id={`lab-${l.key}`} className="num" inputMode="decimal" placeholder="–" value={v} onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ''))}
        style={{ width: '3.4em', fontSize: 22, textAlign: 'right' }} />
      <span style={{ width: 52, fontSize: 12, color: 'var(--slate)' }}>{l.unit}</span>
    </label>
  );
}

/** 건강검진 결과지 수치 넣기 (선택). 비워도 되고, 넣은 값만 반영된다 */
export function Checkup() {
  const { draft: d, setDraft } = useStore();
  const err = labError(d.lab ?? {}, 'life') ?? labError(d.lab ?? {}, 'checkup');
  const ready = !!toInput(d);
  const back = ready ? '/result' : '/life';
  return (
    <div className="page fade">
      <Nav back={back} title="검진 수치 넣기" sub="선택 · 아는 것만" />
      <H1 a="건강검진 결과지의" b="숫자를 넣어 주세요" />
      <p className="lead">넣은 수치는 추정보다 먼저 반영돼요. 모르는 칸은 비워 두면 지금처럼 추정으로 보여드려요. 이 기기 안에서만 계산해요.</p>
      {(['life', 'checkup'] as const).map((w) => (
        <div key={w} className="card" style={{ padding: '6px 18px 10px' }}>
          <b style={{ display: 'block', padding: '12px 0 4px', fontSize: 13, color: 'var(--slate)' }}>{w === 'life' ? '혈압 · 혈당' : '혈액 · 소변 검사'}</b>
          {LABS.filter((l) => l.where === w).map((l) => <LabField key={l.key} l={l} />)}
        </div>
      ))}
      <div className="err" role="alert">{err ?? ''}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="cta outline" style={{ flex: 1 }} onClick={() => setDraft((x) => ({ ...x, lab: {} }))}>모두 지우기</button>
        <button type="button" className="cta" style={{ flex: 2 }} disabled={!!err} onClick={() => go(back)}>{ready ? '결과에 반영하기' : '돌아가기'}</button>
      </div>
    </div>
  );
}
