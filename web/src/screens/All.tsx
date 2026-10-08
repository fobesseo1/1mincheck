// 모든 항목 보기 (#/all): v2 결과 첫 화면에서 내린 자세한 내용. 디자인: docs/DESIGN.md
import { ArrowRight, ChevronRight, ChevronDown, ClipboardList, SlidersHorizontal } from 'lucide-react';
import type { Input } from '../../../engine/src/engine.ts';
import { useStore, Nav, Ring, Gauge, AppShell, Help } from '../ui.tsx';
import { useInput, NeedInput } from './Results.tsx';
import { shown, anyModOn } from '../lib/features.ts';
import type { AppInput } from '../state.ts';
import { probB, reasonOf, scopeOf, B_NAME, type ProbRow } from '../lib/b.ts';
import { suggestScenario, drinkOf } from '../state.ts';
import { runExtras } from '../../../engine/src/extras.ts';
import { ExtraCards } from './Extras.tsx';
import { viewResults, labOf, LOOK } from '../lib/view.ts';
import { DISCLAIMER } from '../lib/content.ts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MOD_ROUTE = { sleep: '/sleep', mind: '/mind', gerd: '/digest', diet: '/diet' };
const MODNAME = { sleep: '수면', mind: '마음', gerd: '소화', diet: '식생활' } as const;
const FUTURE = ['dm10', 'htn4', 'chd10'];

/** 확률 항목 한 줄: 이름 → 현재 가능성 추정 % → 100명 중 몇 명 → 또래 평균 비교 → (필요하면) 확인 안내 */
function ProbRowB({ p, inp }: { p: ProbRow; inp: Input }) {
  const b = probB(p, inp as AppInput), reason = reasonOf(p.id, inp as AppInput, p), L = labOf(inp);
  const small = b.kind === 'estimate' && p.cmp!.me < 1;   // 배수는 커도 가능성 자체가 1% 미만이면 위험색 강조를 하지 않는다(판정은 그대로)
  const warn = (b.kind === 'estimate' && b.high && p.cmp!.me >= 1) || b.kind === 'criteria' || b.kind === 'excluded';
  const glu = p.id === 'dm' && b.kind === 'estimate' && L.glu != null;
  return (
    <div className="flex flex-col gap-1 border-t border-sand-soft py-4">
      <a href={`#/detail/${p.id}`} className="flex flex-col gap-1 text-ink no-underline">
        <span className="flex items-center justify-between gap-2"><b className="text-body font-medium">{B_NAME[p.id] ?? p.title}</b><span className="text-right text-caption text-ink-soft">{glu ? '현재 가능성 추정 · 공복혈당 반영' : b.label}</span></span>
        <b className={cn('text-heading-sm font-medium', warn ? 'text-risk' : 'text-ink')}>{b.big}</b>
        {(b.kind === 'estimate' || b.kind === 'range') && <span className="text-body-sm">{b.freq}</span>}
        {b.kind === 'estimate' && <span className={cn('text-body-sm', b.high && !small ? 'font-medium text-risk' : 'text-ink-soft')}>{b.peer}</span>}
        {b.kind === 'range' && <span className="text-body-sm text-ink-soft">{b.note}</span>}
        {b.kind !== 'estimate' && b.kind !== 'range' && b.note && <span className={cn('text-body-sm', warn ? 'text-risk' : 'text-ink-soft')}>{b.note}</span>}
        {glu && <span className="rounded-btn bg-sand-soft px-2.5 py-2 text-body-sm">입력한 공복혈당 {L.glu}mg/dL · {L.glu! >= 100 ? '공복혈당장애 범위(100–125)예요' : '정상 범위(100 미만)예요. 당뇨는 당화혈색소로도 진단해서 공복혈당만으로 없다고 할 수는 없어요'}</span>}
        {b.kind === 'estimate' && b.high && p.cmp?.action && <span className="flex items-start gap-1 text-body-sm font-medium"><ArrowRight className="mt-0.5 size-4 shrink-0 text-brand" />{p.cmp.action}</span>}
      </a>
      {reason && (
        <details className="group">
          <summary className="flex items-center gap-1 text-caption font-medium text-brand">왜 이렇게 나왔나요? <ChevronDown className="size-4 transition-transform group-open:rotate-180" /></summary>
          <p className="mt-1.5 text-caption text-ink-soft">{reason}. 계산에 들어간 정보이며, 각 정보가 얼마나 영향을 줬는지는 따로 계산하지 않았어요.</p>
        </details>
      )}
    </div>
  );
}

export function All() {
  const { setDraft } = useStore();
  const inp = useInput();
  if (!inp) return <NeedInput />;
  const sc = suggestScenario(inp), r = viewResults(inp, sc), extras = runExtras(inp, drinkOf(inp), labOf(inp));
  const scope = scopeOf(inp);
  const ob = r.score.find((x) => x.id === 'obesity')!;
  const doneScores = r.score.filter((x) => x.id !== 'obesity' && shown(x.id) && x.status === 'ok' && x.v !== '–');
  const future = extras.filter((x) => FUTURE.includes(x.id)), checks = extras.filter((x) => !FUTURE.includes(x.id));
  const probs = r.prob.filter((p) => p.status !== 'na');
  const osteoNa = r.prob.some((p) => p.id === 'osteo' && p.status === 'na');
  return (
    <AppShell tab="result">
      <Nav back="/result" title="모든 항목 보기" sub={r.who} />
      <Card aria-label="주요 결과" className="px-5 pt-4 pb-4">
        <div className="flex flex-col gap-0.5 pb-2"><b className="text-[19px] font-medium">주요 결과</b><span className="text-caption text-ink-soft">지금 이 상태일 가능성을 추정한 값이에요. 앞으로 생길 확률이 아니에요. 또래 평균은 {r.group} 기준이에요.</span></div>
        {probs.map((p) => <ProbRowB key={p.id} p={p} inp={inp} />)}
        <a href="#/detail/obesity" className="flex flex-col gap-0.5 border-t border-sand-soft py-4 text-ink no-underline">
          <span className="flex items-center justify-between gap-2"><b className="text-body font-medium">체형</b><span className="text-caption text-ink-soft">입력한 키·몸무게·허리로 계산</span></span>
          <span className="text-body"><b>BMI {ob.v}</b> · {ob.cat}{inp.waistCm != null ? (inp.waistCm >= (inp.sex === 'F' ? 85 : 90) ? ' · 복부비만 기준 해당' : ' · 허리둘레 기준 아래') : ' · 허리둘레 모름'}</span>
        </a>
        {anyModOn() && <div className="flex flex-col gap-2 border-t border-sand-soft pt-4 pb-1">
          <span className="flex items-center justify-between gap-2"><b className="text-body font-medium">설문 결과</b><span className="text-caption text-ink-soft">점수와 등급 · 확률이 아니에요</span></span>
          {doneScores.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {doneScores.map((x) => <a key={x.id} href={`#/detail/${x.id}`} className={cn('rounded-full px-2.5 py-1 text-caption font-medium no-underline', x.col === LOOK ? 'bg-risk-bg text-risk' : 'bg-sand-soft text-ink')}>{x.name} · {x.cat}</a>)}
            </div>
          ) : <span className="text-body-sm">선택 설문은 아직 하지 않았어요.</span>}
          {scope.mods.some((m) => !m.done) && (
            <span className="text-body-sm leading-relaxed">아직 체크하지 않음: {scope.mods.filter((m) => !m.done).map((m, k) => (
              <span key={m.k}>{k ? ' · ' : ''}<a className="text-brand" href={'#' + MOD_ROUTE[m.k]} onClick={() => setDraft((x) => ({ ...x, modules: { ...x.modules, [m.k]: true } }))}>{MODNAME[m.k]}</a></span>))}
              <span className="block text-caption text-ink-soft">체크하지 않은 분야는 낮거나 정상이라는 뜻이 아니에요.</span></span>
          )}
        </div>}
        <p className="mt-2 text-caption text-ink-soft">추정 가능성이 낮아도 질환이 없다는 뜻은 아니에요.{osteoNa ? ' 골다공증은 50세 이상부터 계산해요.' : ''}</p>
      </Card>

      <Card aria-label="이번 결과에 반영한 정보" className="flex flex-col gap-2 p-5">
        <b className="text-body font-medium">이번 결과에 반영한 정보</b>
        <span className="text-body-sm">{scope.body}</span>
        <span className="text-body-sm">{scope.life}{scope.dx.length ? ` · 진단받은 질환 ${scope.dx.join('·')}` : ''}</span>
        <span className="text-body-sm"><b>{scope.labLine}</b> · {scope.restLine}</span>
        <a href="#/labs" className="inline-flex items-center gap-1 text-body-sm font-medium text-brand">{scope.labs.length ? '검진 수치 고치기·더 넣기' : '검진 수치 넣기 (선택)'}<ChevronRight className="size-4" /></a>
        {!scope.labs.length && <span className="text-caption text-ink-soft">검진 수치가 없어도 괜찮아요. 넣으면 혈압·공복혈당·총콜레스테롤은 측정값 기준과 함께 보여드려요.</span>}
      </Card>

      <a href="#/summary" className="flex items-center gap-3 rounded-card bg-white p-5 text-ink no-underline shadow-card">
        <span className="flex size-10 items-center justify-center rounded-btn bg-blush text-brand"><ClipboardList className="size-5" /></span>
        <span className="flex-1"><b className="text-body font-medium">진료용 결과 요약 저장</b><span className="block text-caption text-ink-soft">진료 때 보여줄 수 있게 인쇄하거나 PDF로 저장해요. 서버로 보내지 않아요.</span></span>
        <ChevronRight className="size-5 text-ink-soft" />
      </a>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex justify-between"><b className="text-body font-medium">또래 평균과 비교 (몇 배)</b><span className="text-caption text-ink-soft">{r.group}</span></div>
        <div className="grid grid-cols-3 gap-2">
          {r.rings.map((g) => (
            <a key={g.id} href={`#/detail/${g.id}`} className="flex flex-col items-center gap-1.5 no-underline">
              <span className="text-caption text-ink">{g.name}</span>
              <Ring f={g.f} label={g.idx} col={g.col} />
              <span className="text-center text-caption font-medium" style={{ color: g.col }}>{g.label}</span>
            </a>
          ))}
        </div>
        <span className="text-caption text-ink-soft">배수는 내 추정값과 또래 평균을 함께 볼 때 의미가 있어요. 예를 들어 0.3%와 0.1%도 3배예요.</span>
      </Card>
      <a href="#/whatif" className="flex items-center gap-3 rounded-card bg-white p-5 text-ink no-underline shadow-card">
        <span className="flex size-10 items-center justify-center rounded-btn bg-blush text-brand"><SlidersHorizontal className="size-5" /></span>
        <span className="flex-1"><b className="text-body font-medium">습관까지 바꿔보기</b><span className="block text-caption text-ink-soft">음주·운동·흡연까지 바꿔 입력하면 지금 가능성 추정이 어떻게 달라지는지 볼 수 있어요.</span></span>
        <ChevronRight className="size-5 text-ink-soft" />
      </a>
      <ExtraCards xs={future} title="앞으로 N년 안의 발생 위험" lead="위의 ‘현재 가능성’과 다른 값이에요. 연구에서 추적한 기간(4년·10년) 그대로 보여드려요. 40–69세 연구로 만든 계산식이에요." />
      <ExtraCards xs={checks} />
      {anyModOn() && (<>
        <h2 className="mx-1 mt-3 text-[19px] font-medium">설문 점수</h2>
        <p className="mx-1 -mt-2 text-body-sm text-ink-soft">검증된 설문 점수와 등급이에요. 확률로 바꾸지 않았어요.</p>
        <div className="grid grid-cols-2 gap-3">
          {r.score.filter((s) => shown(s.id)).map((s) => (
            <a key={s.id} href={`#/detail/${s.id}`} className="flex flex-col items-center gap-1 rounded-card bg-white px-3.5 pt-4 pb-5 text-ink no-underline shadow-card">
              <div className="flex items-center gap-1.5 self-stretch"><i className="size-2 rounded-full" style={{ background: s.col }} /><span className="text-caption">{s.name}</span></div>
              <div className="mt-1.5"><Gauge f={s.frac} v={s.v} col={s.col} /></div>
              <span className="text-[11px] text-ink-soft">{s.unit}</span>
              <span className="text-center text-body-sm font-medium" style={{ color: s.col }}>{s.status === 'needs_input' ? '아직 체크하지 않음' : s.cat}</span>
              <span className="text-center text-[11px] text-ink-soft">{s.note}</span>
            </a>
          ))}
        </div>
      </>)}
      <Card className="p-5">
        <b className="text-body font-medium">결과를 읽는 법</b>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-body-sm">
          <li><b>현재 가능성 추정</b>: 지금 검사하면 기준에 해당할 가능성이에요. 예를 들어 ‘15%’는 비슷한 조건의 100명 중 약 15명이 검사에서 기준에 해당한다는 뜻이에요.</li>
          <li><b>앞으로 N년 안의 발생 위험</b>: 지금은 아니지만 정해진 기간 안에 새로 생길 가능성이에요.</li>
          <li><b>검진 수치</b>: 입력한 측정값이 기준 범위 어디에 있는지예요. 입력한 그날의 값이에요.</li>
          {anyModOn() && <li><b>설문 점수</b>: 검증된 설문의 점수와 등급이에요.</li>}
          <li><b>또래 평균</b>: 같은 나이대(10살 단위)·같은 성별 한국인의 같은 기준 값이에요.</li>
        </ul>
      </Card>
      <Button asChild variant="outline" size="lg" className="w-full"><a href="#/result">결과 카드 3장으로 돌아가기</a></Button>
      <Help>{DISCLAIMER} 모든 계산은 이 기기 안에서만 했어요.</Help>
    </AppShell>
  );
}
