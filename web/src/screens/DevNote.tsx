import { isDev } from '../lib/dev.ts';
import { calInfo, calVersion, type CalId } from '../../../engine/src/calibrate.ts';

const f1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

/** 개발자 모드에서만: 엔진 원래 값 → 보정값, 보정 그룹과 근거 */
export function DevNote({ id, raw, value, rawPeer, peer, sex, age }: { id: string; raw?: number; value?: number | null; rawPeer?: number | null; peer?: number | null; sex: 'M' | 'F'; age: number }) {
  if (!isDev() || raw == null) return null;
  const c = calInfo(id as CalId, sex, age);
  return (
    <div className="rounded-[10px] bg-citrus px-2.5 py-2 font-mono text-[11px] leading-normal text-ink">
      DEV · 엔진 {f1(raw)}% → 보정 {value != null ? f1(value) : '–'}% · 또래 엔진 {rawPeer != null ? f1(rawPeer) : '–'}% → 실측 {peer != null ? f1(peer) : '–'}%<br />
      {c.band} (n={c.n}) · a={c.a ?? '–'} · b={c.slope} · {calVersion}
    </div>
  );
}
