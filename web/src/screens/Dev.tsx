import { Nav } from '../ui.tsx';
import { isDev } from '../lib/dev.ts';
import { calVersion } from '../../../engine/src/calibrate.ts';
import CAL from '../../../analysis/results/calibration.json';
import VAL from '../../../analysis/results/validation.json';

const NAME: Record<string, string> = { dm: '이미 당뇨일 확률', htn: '고혈압', chol: '고콜레스테롤', osteo: '골다공증' };
type G = { n: number; engine: number; calibrated: number; observed: number };

/** 개발자 모드 전용: 실측 보정 확인 결과 (보정 계수를 만든 자료와 다른 자료로 확인) */
export function Dev() {
  if (!isDev()) return <div className="page"><Nav back="/result" title="개발자" /><p className="lead">주소에 개발자 코드가 있어야 볼 수 있어요.</p></div>;
  const check = CAL.check as Record<string, { check: string; nTrain: number; nTest: number; auc: { engine: number; calibrated: number }; mean: { engine: number; calibrated: number; observed: number }; groups: Record<string, G> }>;
  const val = VAL.validation as Record<string, { aucEngine: number; auc: number; engine: number; predicted: number; observed: number; n: number }>;
  const cell = { padding: '4px 6px', textAlign: 'right' as const, borderTop: '1px solid var(--line)' };
  return (
    <div className="page fade">
      <Nav back="/result" title="개발자 · 보정 확인" sub={calVersion} />
      <p className="help" style={{ margin: '0 4px' }}>{CAL.meta.method}. 엔진 = 보정 전, 보정 = 앱에 보이는 값, 실측 = 국민건강영양조사 검사 결과. 진단받지 않은 사람만, 가중 평균(%).</p>
      {Object.entries(check).map(([id, c]) => (
        <div key={id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{NAME[id]}</b>
          <span>확인 방법: {c.check} (만든 자료 {c.nTrain}명 · 확인 자료 {c.nTest}명)</span>
          <span>확인 자료 AUC 엔진 <b>{c.auc.engine}</b> → 보정 <b>{c.auc.calibrated}</b> · 평균 엔진 {c.mean.engine}% → 보정 <b>{c.mean.calibrated}%</b> / 실측 <b>{c.mean.observed}%</b></span>
          <span style={{ color: 'var(--slate)' }}>전체 자료(n={val[id]?.n}): AUC {val[id]?.aucEngine} → {val[id]?.auc} · 평균 {val[id]?.engine}% → {val[id]?.predicted}% / 실측 {val[id]?.observed}%</span>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr><th style={{ textAlign: 'left' }}>확인 자료</th><th style={cell}>n</th><th style={cell}>엔진</th><th style={cell}>보정</th><th style={cell}>실측</th></tr></thead>
            <tbody>{Object.entries(c.groups).map(([g, v]) => (
              <tr key={g}><td style={{ ...cell, textAlign: 'left' }}>{g}</td><td style={cell}>{v.n}</td><td style={cell}>{v.engine}</td><td style={{ ...cell, fontWeight: 700 }}>{v.calibrated}</td><td style={cell}>{v.observed}</td></tr>
            ))}</tbody>
          </table>
        </div>
      ))}
      <p className="help" style={{ margin: '0 4px' }}>출처: {CAL.meta.source}. 개인 단위 자료는 저장소에 없고 집계만 있어요.</p>
    </div>
  );
}
