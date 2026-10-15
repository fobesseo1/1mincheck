// 첫 화면(랜딩) 장면 속 결과 조각 (2026-10-15, 캔버스 'LandingPC'·'LandingM').
// v2 첫 화면의 틀은 그대로 두고, 결과를 보여 주던 예전 카드(%·또래의 ○배)만 결과 화면과 같은 v3 부품·계산으로 바꾼다.
//  TodoPiece = 지금 당장 할 일 · RowsPiece = 세 줄(○○대 남성 중 N번째로 위험) · ChangePiece = 생활을 바꾸면(줄인 모양) · LabPiece = 검진 풀이 한 줄
import type { Input } from '../../../engine/src/engine.ts';
import type { AppInput } from '@/state';
import { suggestScenario } from '@/state';
import { viewResults } from '@/lib/view';
import { verdict } from '@/lib/verdict';
import { overviewRows } from '@/lib/overview';
import { per100, bodyOf, OUTCOME_NAME, type Outcome } from '@/lib/similar';
import { bodyStage } from '@/lib/body';
import { useCharacterSet } from '@/lib/characters';
import { labCards } from '@/lib/labZones';
import { Todo, RowView, Badge, sev } from '@/components/result-v4';
import { LabRow } from '../screens/Labs.tsx';
import { cn } from '@/lib/utils';

const IN = 2.54;

/** 지금 당장 할 일 (결과 화면 맨 위 검정 상자 그대로) */
export function TodoPiece({ inp }: { inp: Input }) {
  const sc = suggestScenario(inp as AppInput), v = verdict(inp as AppInput, viewResults(inp, sc), sc);
  return <Todo v={v} />;
}

/** 세 줄(당뇨·고혈압·지방간) 또는 그중 한 줄 — 결과 화면 '세 가지 한눈에'와 같은 줄 */
export function RowsPiece({ inp, only }: { inp: Input; only?: 'htn' | 'dm' | 'nafld' }) {
  const rows = [...overviewRows(inp)].sort((a, b) => sev(b) - sev(a)).filter((r) => !only || r.id === only);
  return (
    <section className="flex flex-col rounded-[20px] bg-white px-5 py-1.5">
      {rows.map((r, k) => <RowView key={r.id} r={r} inp={inp} first={k === 0} onWaist={() => { location.hash = '#/start'; }} />)}
    </section>
  );
}

/** 생활을 바꾸면 (줄인 모양): 체형 그림 → 허리 인치 → 막대 → '허리 ○인치인 사람들은 / 혈압이 높은 사람이 100명 중 N명' + 두 줄.
 *  dIn = 지금 허리에서 줄인 인치(0 이하). 계산은 결과 화면과 같은 lib/similar */
export function ChangePiece({ inp, dIn = -1, rows = 2 }: { inp: Input; dIn?: number; rows?: number }) {
  const b0 = bodyOf(inp), in0 = Math.round(b0.waistCm / IN), w = in0 + dIn, after = { ...b0, waistCm: dIn === 0 ? b0.waistCm : w * IN };
  const cut = inp.sex === 'F' ? 85 : 90, set = useCharacterSet(inp.sex, inp.age);
  const stage = Math.min(5, Math.max(1, Math.round(bodyStage(inp.heightCm, inp.weightKg))));
  const pic = set ? (after.waistCm >= cut ? set.bellyFiles : set.files)[stage - 1] : null;
  const outs = (['bp', 'dm', 'alt', 'tg'] as Outcome[]).filter((o) => !(o === 'bp' && inp.dx.htn) && !(o === 'dm' && inp.dx.dm));
  const list = outs.map((o) => ({ o, now: per100(o, b0), af: per100(o, after) }));
  const lead = list[0], diff = lead.now - lead.af, lo = Math.max(22, in0 - 10), hi = in0 + 6;
  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-white p-5">
      <div className="flex items-end gap-3">
        {pic ? <img src={pic} alt="" className="h-[84px] w-14 flex-none object-contain object-bottom" /> : <span className="h-[84px] w-14 flex-none" />}
        <span className="flex flex-col gap-0.5 pb-1">
          <span className="text-[12px] text-ink-soft">허리둘레</span>
          <span className="flex items-baseline gap-1.5"><b className="text-[26px] leading-none font-semibold tabular-nums">{w}<span className="text-[14px] font-normal text-ink-soft">인치</span></b>{dIn !== 0 && <Badge t={`−${-dIn}인치`} tone="green" />}</span>
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-track" aria-hidden>
        <span className="absolute top-1/2 box-border size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-ink shadow-[0_2px_8px_rgba(0,0,0,.25)] transition-[left] duration-300" style={{ left: `${((w - lo) / (hi - lo)) * 100}%` }} />
      </div>
      <p className="m-0 text-[14px] leading-[1.5] text-[#333]">허리 {w}인치인 사람들은<br />
        <b className="font-semibold text-ink">{OUTCOME_NAME[lead.o]}이 100명 중 <span className="text-[20px] tabular-nums">{lead.af}</span>명</b>
        {diff !== 0 && <span className={cn('ml-1.5 text-[13px]', diff > 0 ? 'text-good' : 'text-risk')}>지금보다 {Math.abs(diff)}명 {diff > 0 ? '적어요' : '많아요'}</span>}
      </p>
      {rows > 0 && (
        <div className="flex flex-col gap-2 border-t border-hair pt-2.5 text-[13px] text-ink-2">
          {list.slice(0, rows).map((x) => (
            <span key={x.o} className="flex items-baseline justify-between gap-2"><span>{OUTCOME_NAME[x.o]}</span>
              <span className="whitespace-nowrap">{x.af !== x.now && <span className="text-[#9a9a96]">{x.now}명 → </span>}<b className={cn('text-[18px] font-semibold tabular-nums', x.af < x.now ? 'text-good' : x.af > x.now ? 'text-risk' : 'text-ink')}>{x.af}명</b></span></span>
          ))}
        </div>
      )}
    </section>
  );
}

/** 검진 풀이 한 줄 (검진 풀이 결과 화면의 줄 그대로) */
export function LabPiece({ lab, sex }: { lab: Record<string, number>; sex: 'M' | 'F' | null }) {
  const c = labCards(lab, sex)[0];
  if (!c) return null;
  return <section className="flex flex-col rounded-[20px] bg-white px-5 py-1.5"><LabRow c={c} first /></section>;
}
