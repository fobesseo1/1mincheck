// v2 검진 풀이: 결과지 숫자를 넣으면(#/labs) 하나씩 쉽게 풀어 준다(#/labs/result).
// 넣은 값은 1분 체크 결과에도 함께 반영된다(같은 draft.lab). 계산 없이 공식 기준 구간만 쓴다(lib/labZones.ts).
import type { CSSProperties } from 'react';
import { useStore, Nav, H1, TabBar, Icon, go } from '../ui.tsx';
import { toInput } from '../state.ts';
import { LABS, labError, parseLab } from '../lib/labs.ts';
import { labCards, labSummary, type LabCard, type LabTone } from '../lib/labZones.ts';
import { LabField } from './Checkup.tsx';

const RED = '#cb272f';
const TONE_BG: Record<LabTone, string> = { ok: 'var(--linen)', mid: '#fbeec9', high: '#fbe1df', urgent: '#f6c9c6' };
const TONE_FG: Record<LabTone, string> = { ok: 'var(--ink)', mid: '#7a5a00', high: RED, urgent: RED };

/** 결과지 숫자 넣기 */
export function LabsInput() {
  const { draft: d, setDraft } = useStore();
  const err = labError(d.lab ?? {}, 'life') ?? labError(d.lab ?? {}, 'checkup');
  const n = labCards(parseLab(d.lab ?? {}), d.sex).length;
  const ready = !!toInput(d);
  return (
    <div className="app">
      <div className="page fade">
        <Nav back={ready ? '/result' : '/'} title="검진 풀이" sub="아는 숫자만 넣어도 돼요" />
        <H1 a="건강검진 결과지의" b="숫자를 넣어 주세요" />
        <p className="lead">숫자 하나하나가 무슨 뜻인지, 무엇을 하면 되는지 쉽게 풀어 드려요. 넣은 숫자는 이 기기 안에서만 써요.</p>
        {!d.sex && (
          <div className="card q" role="group" aria-label="성별">
            <div className="qt">성별 <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--slate)' }}>(좋은 콜레스테롤 기준이 달라요)</span></div>
            <div className="opts" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {(['F', 'M'] as const).map((s) => <button key={s} type="button" className="opt" aria-pressed={d.sex === s} onClick={() => setDraft((x) => ({ ...x, sex: s }))}>{s === 'F' ? '여성' : '남성'}</button>)}
            </div>
          </div>
        )}
        {([['life', '혈압 · 혈당', '결과지 ‘고혈압’·‘당뇨병’ 칸'], ['checkup', '혈액 · 소변 검사', '결과지 ‘이상지질혈증’·‘신장질환’·‘요검사’ 칸']] as const).map(([w, t, h]) => (
          <div key={w} className="card" style={{ padding: '6px 18px 10px' }}>
            <b style={{ display: 'block', padding: '12px 0 0', fontSize: 14, color: 'var(--obsidian)' }}>{t}</b>
            <span style={{ display: 'block', paddingBottom: 4, fontSize: 12, color: 'var(--slate)' }}>{h}</span>
            {LABS.filter((l) => l.where === w).map((l) => <LabField key={l.key} l={l} />)}
          </div>
        ))}
        <div className="err" role="alert">{err ?? ''}</div>
        <button type="button" className="cta" aria-disabled={!!err || n === 0} onClick={() => { if (!err && n) go('/labs/result'); }}>{n ? `${n}개 쉽게 풀어보기` : '숫자를 하나 이상 넣어 주세요'}</button>
        {n > 0 && <button type="button" className="link" style={{ fontSize: 13 }} onClick={() => setDraft((x) => ({ ...x, lab: {} }))}>넣은 숫자 모두 지우기</button>}
        <p className="help" style={{ margin: '0 4px' }}>나중에는 결과지 사진을 찍으면 숫자를 자동으로 채우는 기능을 준비하고 있어요.</p>
      </div>
      <TabBar at="labs" />
    </div>
  );
}

/** 구간 막대: 구간마다 같은 폭, 점이 왼쪽에서 제자리로 미끄러져 들어온다 */
export function ZoneBar({ c, delay }: { c: LabCard; delay: number }) {
  const n = c.zones.length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="zonebar" style={{ ['--pos' as string]: `${c.pos * 100}%`, ['--delay' as string]: `${delay}ms` } as CSSProperties}>
        {c.zones.map((z, k) => <i key={k} style={{ width: `${100 / n}%`, background: k === c.at ? TONE_FG[z.tone] : TONE_BG[z.tone], opacity: k === c.at ? 0.9 : 1 }} />)}
        <b className="pin" />
      </div>
      <div style={{ display: 'flex' }}>
        {c.zones.map((z, k) => <span key={k} style={{ width: `${100 / n}%`, textAlign: 'center', fontSize: 10.5, lineHeight: 1.3, fontWeight: k === c.at ? 800 : 500, color: k === c.at ? TONE_FG[z.tone] : 'var(--slate)' }}>{z.name}</span>)}
      </div>
    </div>
  );
}

/** 숫자 하나하나 풀이 */
export function LabsResult() {
  const { draft: d } = useStore();
  const cs = labCards(parseLab(d.lab ?? {}), d.sex);
  if (!cs.length) return (
    <div className="app"><div className="page fade" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <h1 className="h1">아직 넣은 숫자가<b>없어요</b></h1>
      <a className="cta" href="#/labs" style={{ marginTop: 20 }}>결과지 숫자 넣기</a>
    </div></div>
  );
  const s = labSummary(cs), ready = !!toInput(d);
  return (
    <div className="app">
      <div className="page fade">
        <Nav back="/labs" title="검진 풀이" sub={`넣은 숫자 ${cs.length}개`} />
        <section className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 8, background: s.tone === 'urgent' ? RED : s.tone === 'ok' ? 'var(--lime)' : '#fff', borderTop: s.tone === 'high' ? `6px solid ${RED}` : undefined }}>
          <b style={{ fontSize: 22, lineHeight: 1.3, fontWeight: 900, letterSpacing: '-0.03em', color: s.tone === 'urgent' ? '#fff' : s.tone === 'high' ? RED : 'var(--ink)' }}>{s.title}</b>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([['urgent', '지금 확인'], ['high', '확인 필요'], ['mid', '신경 쓸 것'], ['ok', '괜찮음']] as const).filter(([k]) => s.count[k]).map(([k, t]) => (
              <span key={k} className="pill" style={{ background: '#fff', color: TONE_FG[k], boxShadow: 'inset 0 0 0 1.5px currentColor' }}>{t} {s.count[k]}</span>
            ))}
          </div>
        </section>
        {s.order.map((c, k) => (
          <section key={c.key} className="card labcard" aria-label={c.title} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, animationDelay: `${k * 90}ms` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <b style={{ fontSize: 16, color: 'var(--obsidian)' }}>{c.title}</b>
              <span style={{ whiteSpace: 'nowrap' }}><b style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', color: TONE_FG[c.tone] }}>{c.value}</b> <small style={{ fontSize: 11, color: 'var(--slate)' }}>{c.key === 'upro' ? '' : c.key === 'bp' ? 'mmHg' : c.key === 'egfr' ? 'mL/min' : 'mg/dL'}</small></span>
            </div>
            <span style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--slate)', marginTop: -6 }}>{c.easy}</span>
            <ZoneBar c={c} delay={250 + k * 90} />
            <div style={{ padding: '10px 12px', borderRadius: 12, background: TONE_BG[c.tone], display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--obsidian)' }}><b style={{ color: TONE_FG[c.tone] }}>{c.zone}</b> · {c.mean}</span>
              <span style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 700, color: c.tone === 'urgent' ? RED : 'var(--ink)' }}>→ {c.todo}</span>
              {c.note && <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--charcoal)' }}>{c.note}</span>}
            </div>
          </section>
        ))}
        {ready
          ? <a className="cta" href="#/result">이 숫자를 반영한 내 결과 보기</a>
          : <a className="cta" href="#/info">1분 체크도 해보기 <small style={{ fontSize: 12, fontWeight: 600 }}>· 넣은 숫자가 함께 반영돼요</small></a>}
        <a className="cta outline" href="#/labs">{Icon.back} 숫자 고치기·더 넣기</a>
        <p className="help" style={{ margin: '0 4px' }}>대한고혈압학회·대한당뇨병학회·한국지질·동맥경화학회 진료지침과 국가건강검진 판정 기준으로 나눈 구간이에요. 한 번 잰 값이라 진단이 아니며, 실제 판정은 의사가 해요.</p>
      </div>
      <TabBar at="labs" />
    </div>
  );
}
