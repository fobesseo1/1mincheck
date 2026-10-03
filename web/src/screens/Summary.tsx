// B버전: 진료용 결과 요약. 기록이 없어도 지금 결과로 바로 인쇄·PDF 저장(브라우저 인쇄 기능, 서버 없음).
// 숫자·판정은 결과 화면과 같은 함수(view.ts·verdict.ts)에서 가져오고, 장식·큰 배수 없이 표로만 보여준다.
import type React from 'react';
import { Nav } from '../ui.tsx';
import { suggestScenario, today, ALC_LABEL, type AppInput } from '../state.ts';
import { viewResults, labOf } from '../lib/view.ts';
import { verdictB, scopeOf, B_NAME, probB } from '../lib/b.ts';
import { LABS } from '../lib/labs.ts';
import { DISCLAIMER } from '../lib/content.ts';
import { useInput, NeedInput } from './Results.tsx';

const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #cfd3cb', fontSize: 12, color: '#454745', fontWeight: 700 };
const td: React.CSSProperties = { padding: '7px 8px', borderBottom: '1px solid #e3e6e0', fontSize: 13, verticalAlign: 'top' };
const H = ({ children }: { children: React.ReactNode }) => <h2 style={{ margin: '18px 0 6px', fontSize: 15, fontWeight: 800, color: '#0e0f0c' }}>{children}</h2>;

export function Summary() {
  const inp = useInput() as AppInput | null;
  if (!inp) return <NeedInput />;
  const sc = suggestScenario(inp), r = viewResults(inp, sc), v = verdictB(inp, r, sc), scope = scopeOf(inp), L = labOf(inp);
  const labRows = LABS.filter((l) => L[l.key] != null).map((l) => [l.label, l.options ? l.options.find(([n]) => n === L[l.key])?.[1] ?? String(L[l.key]) : `${L[l.key]} ${l.unit}`]);
  const est = r.prob.filter((p) => p.status !== 'na');
  const scores = r.score.filter((s) => s.id !== 'obesity');
  const ob = r.score.find((s) => s.id === 'obesity')!;
  return (
    <div className="summary">
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <Nav back="/result" title="진료용 결과 요약" sub="인쇄하거나 PDF로 저장" />
        <button type="button" className="cta" onClick={() => window.print()}>인쇄·PDF로 저장</button>
        <span className="help" style={{ textAlign: 'center' }}>인쇄 창에서 ‘PDF로 저장’을 고르면 파일로 남아요. 이 요약은 서버로 보내지 않아요.</span>
      </div>

      <article style={{ background: '#fff', color: '#0e0f0c', padding: '20px 18px', borderRadius: 16, lineHeight: 1.5 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>1분체크 결과 요약 <span style={{ fontSize: 12, fontWeight: 600, color: '#6a6c6a' }}>(참고용 추정 정보)</span></h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#454745' }}>작성일 {today()} · 이 기기에서 계산 · 진단이 아니며 진료를 대신하지 않아요.</p>

        <H>입력한 기본 정보</H>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          {[['몸 정보', `${scope.body} · BMI ${ob.v}`], ['흡연', { never: '안 피움', past: '예전에 피움', current: '지금 피움' }[inp.smoke]], ['음주', ALC_LABEL[inp.alcohol]],
            ['운동(주 2회·30분 이상)', inp.exercise == null ? '모름' : inp.exercise ? '함' : '안 함'], ['부모·형제 당뇨', inp.famDM ? '있음' : '없음'],
            ['진단받은 질환', scope.dx.length ? scope.dx.join(', ') : '없음'], ['최근 혈압(응답)', L.sbp != null ? '검진 수치로 대신함' : { unknown: '모름', normal: '정상', elevated: '주의', high: '140/90 이상' }[inp.bp]]]
            .map(([k, x]) => <tr key={k}><td style={{ ...td, width: '38%', color: '#454745' }}>{k}</td><td style={td}>{x}</td></tr>)}
        </tbody></table>

        <H>입력한 검진값</H>
        {labRows.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
            {labRows.map(([k, x]) => <tr key={k}><td style={{ ...td, width: '38%', color: '#454745' }}>{k}</td><td style={td}>{x}</td></tr>)}
          </tbody></table>
        ) : <p style={{ margin: 0, fontSize: 13 }}>입력한 검진값 없음 (모든 항목을 몸 정보와 답변으로 추정)</p>}
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6a6c6a' }}>검진값은 사용자가 입력한 값이며 검사 날짜는 받지 않았어요.</p>

        <H>앱의 안내 ({v.tag}) · 확인이 필요한 항목과 할 일</H>
        <p style={{ margin: 0, fontSize: 13 }}><b>{v.title}</b></p>
        <p style={{ margin: '2px 0 6px', fontSize: 13, color: '#454745' }}>{v.sub}</p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>{v.actions.map((a) => <li key={a.t}>{a.t}{a.d ? ` — ${a.d}` : ''}</li>)}</ul>
        {v.also && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#454745' }}>{v.also}</p>}

        <H>질환 가능성 추정 (지금 상태를 추정한 값)</H>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>항목</th><th style={th}>현재 가능성 추정</th><th style={th}>또래 평균</th><th style={th}>비고</th></tr></thead>
          <tbody>{est.map((p) => { const b = probB(p);
            return <tr key={p.id}><td style={td}>{B_NAME[p.id] ?? p.title}</td>
              <td style={td}>{b.kind === 'estimate' || b.kind === 'range' ? `${p.pct}%` : b.big}</td>
              <td style={td}>{p.cmp ? `${p.peerTxt}%` : '–'}</td>
              <td style={{ ...td, fontSize: 12, color: '#454745' }}>{b.kind === 'estimate' ? b.freq.replace(' 수준이에요', '') : b.kind === 'range' ? '모르는 답이 있어 범위' : b.label}</td></tr>; })}</tbody>
        </table>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6a6c6a' }}>또래 평균 = {r.group} (국민건강영양조사). 당뇨·고혈압·콜레스테롤은 아직 진단받지 않은 같은 또래 기준.</p>

        <H>설문 결과 (점수와 등급, 확률 아님)</H>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>항목</th><th style={th}>점수</th><th style={th}>등급</th></tr></thead>
          <tbody>{scores.map((s) => <tr key={s.id}><td style={td}>{s.name}</td><td style={td}>{s.status === 'needs_input' ? '–' : `${s.v} (${s.unit})`}</td><td style={td}>{s.status === 'needs_input' ? '아직 체크하지 않음' : s.cat}</td></tr>)}</tbody>
        </table>

        {scope.dx.length > 0 && (<><H>진단받아 관리 중인 항목</H><p style={{ margin: 0, fontSize: 13 }}>{scope.dx.join(', ')} — 가능성을 다시 추정하지 않았어요.</p></>)}

        <p style={{ margin: '18px 0 0', paddingTop: 10, borderTop: '1px solid #cfd3cb', fontSize: 11, color: '#454745' }}>
          {DISCLAIMER} 체형은 입력한 키·몸무게로 계산했어요(BMI {ob.v} · {ob.cat}). 1분체크에서 만든 요약이에요.
        </p>
      </article>
    </div>
  );
}
