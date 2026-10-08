import { Nav, AppShell, Help } from '../ui.tsx';
import { Card } from '@/components/ui/card';
import { isDev } from '../lib/dev.ts';
import { calVersion } from '../../../engine/src/calibrate.ts';
import CAL from '../../../analysis/results/calibration.json';
import VAL from '../../../analysis/results/validation.json';

const NAME: Record<string, string> = { dm: '이미 당뇨일 확률', htn: '고혈압', chol: '고콜레스테롤', osteo: '골다공증' };
type G = { n: number; engine: number; calibrated: number; observed: number };

/** 개발자 모드 전용: 실측 보정 확인 결과 (보정 계수를 만든 자료와 다른 자료로 확인) */
export function Dev() {
  if (!isDev()) return <AppShell><Nav back="/result" title="개발자" /><Help>주소에 개발자 코드가 있어야 볼 수 있어요.</Help></AppShell>;
  const check = CAL.check as Record<string, { check: string; nTrain: number; nTest: number; auc: { engine: number; calibrated: number }; mean: { engine: number; calibrated: number; observed: number }; groups: Record<string, G> }>;
  const val = VAL.validation as Record<string, { aucEngine: number; auc: number; engine: number; predicted: number; observed: number; n: number }>;
  const cell = 'border-t border-sand-soft px-1.5 py-1 text-right';
  return (
    <AppShell>
      <Nav back="/result" title="개발자 · 보정 확인" sub={calVersion} />
      <Help>{CAL.meta.method}. 엔진 = 보정 전, 보정 = 앱에 보이는 값, 실측 = 국민건강영양조사 검사 결과. 진단받지 않은 사람만, 가중 평균(%).</Help>
      {Object.entries(check).map(([id, c]) => (
        <Card key={id} className="flex flex-col gap-2 p-4 text-body-sm">
          <b className="text-body font-medium">{NAME[id]}</b>
          <span>확인 방법: {c.check} (만든 자료 {c.nTrain}명 · 확인 자료 {c.nTest}명)</span>
          <span>확인 자료 AUC 엔진 <b>{c.auc.engine}</b> → 보정 <b>{c.auc.calibrated}</b> · 평균 엔진 {c.mean.engine}% → 보정 <b>{c.mean.calibrated}%</b> / 실측 <b>{c.mean.observed}%</b></span>
          <span className="text-ink-soft">전체 자료(n={val[id]?.n}): AUC {val[id]?.aucEngine} → {val[id]?.auc} · 평균 {val[id]?.engine}% → {val[id]?.predicted}% / 실측 {val[id]?.observed}%</span>
          <table className="w-full border-collapse text-caption">
            <thead><tr><th className="text-left font-medium">확인 자료</th><th className={cell}>n</th><th className={cell}>엔진</th><th className={cell}>보정</th><th className={cell}>실측</th></tr></thead>
            <tbody>{Object.entries(c.groups).map(([g, v]) => (
              <tr key={g}><td className={cell + ' text-left'}>{g}</td><td className={cell}>{v.n}</td><td className={cell}>{v.engine}</td><td className={cell + ' font-medium text-brand'}>{v.calibrated}</td><td className={cell}>{v.observed}</td></tr>
            ))}</tbody>
          </table>
        </Card>
      ))}
      <Help>출처: {CAL.meta.source}. 개인 단위 자료는 저장소에 없고 집계만 있어요.</Help>
    </AppShell>
  );
}
