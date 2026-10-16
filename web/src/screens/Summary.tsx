// 진료용 결과 요약. 기록이 없어도 지금 결과로 바로 인쇄·PDF 저장(브라우저 인쇄 기능, 서버 없음).
// 숫자·판정은 결과 화면과 같은 함수(view.ts·verdict.ts)에서 가져오고, 장식·큰 배수 없이 표로만 보여준다.
// 2026-10-15 캔버스 'Summary': 앱과 같은 무채색 모양, 의사에게 보여 주는 문서라 %는 그대로(docs/DESIGN.md 9-1)
import type { ReactNode } from 'react';
import { Printer } from 'lucide-react';
import { Nav } from '../ui.tsx';
import { Button } from '@/components/ui/button';
import { suggestScenario, today, ALC_LABEL, type AppInput } from '../state.ts';
import { viewResults, labOf } from '../lib/view.ts';
import { verdictB, scopeOf, B_NAME, probB } from '../lib/b.ts';
import { LABS } from '../lib/labs.ts';
import { DISCLAIMER, NOT_DIAGNOSIS } from '../lib/content.ts';
import { useInput, NeedInput } from './Results.tsx';
import { bpUnknown } from '@/components/result-v4';

const H = ({ children }: { children: ReactNode }) => <h2 className="mt-[22px] mb-2 text-[15px] font-semibold">{children}</h2>;
const K = 'w-[38%] border-b border-hair px-2 py-2 align-top text-[13px] text-ink-soft';
const V = 'border-b border-hair px-2 py-2 align-top text-[13px]';
const TH = 'border-b border-sand px-2 py-[7px] text-left text-[12px] font-medium text-ink-soft';
/** '·'로 이은 목록은 항목 사이에서만 줄이 바뀌게 */
const List = ({ t }: { t: string }) => <>{t.split(' · ').map((x, j, a) => <span key={j}><span className="whitespace-nowrap">{x}{j < a.length - 1 ? ' ·' : ''}</span>{' '}</span>)}</>;
/** 문장 끝마다 줄바꿈 */
const Lines = ({ t }: { t: string }) => <>{t.split(/(?<=[요다]\.)\s+/).map((x, j) => <span key={j} className="block">{x}</span>)}</>;

export function Summary() {
  const inp = useInput() as AppInput | null;
  if (!inp) return <NeedInput />;
  const sc = suggestScenario(inp), r = viewResults(inp, sc), v = verdictB(inp, r, sc), scope = scopeOf(inp), L = labOf(inp);
  const labRows = LABS.filter((l) => L[l.key] != null).map((l) => [l.label, l.options ? l.options.find(([n]) => n === L[l.key])?.[1] ?? String(L[l.key]) : `${L[l.key]} ${l.unit}`]);
  const est = r.prob.filter((p) => p.status !== 'na');
  const ob = r.score.find((s) => s.id === 'obesity')!;
  const cutCm = inp.sex === 'F' ? 85 : 90;
  return (
    <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-4 bg-paper px-5 pt-3 pb-8 print:max-w-none print:bg-white print:p-0">
      <div className="no-print flex flex-col gap-2.5">
        <Nav back="/result" title="진료용 요약" sub="인쇄하거나 PDF로 저장" />
        <Button size="lg" className="w-full" onClick={() => window.print()}><Printer /> 인쇄·PDF로 저장</Button>
        <p className="m-0 text-center text-[12px] leading-[1.6] text-mute">인쇄 창에서 ‘PDF로 저장’을 고르면 파일로 남아요.<br />서버로 보내지 않아요.</p>
      </div>

      <article className="rounded-card bg-white px-[18px] pt-[22px] pb-5 leading-normal text-ink">
        <h1 className="m-0 text-[19px] font-semibold">1분체크 결과 요약 <span className="text-[12px] font-normal text-mute">(참고용 추정)</span></h1>
        <p className="m-0 mt-1 text-[12px] text-ink-soft">작성일 {today()} · 이 기기에서 계산<br />{NOT_DIAGNOSIS}</p>

        <H>입력한 기본 정보</H>
        <table className="w-full border-collapse"><tbody>
          {([['몸 정보', <List key="b" t={`${scope.body} · BMI ${ob.v}`} />], ['흡연', { never: '안 피움', past: '예전에 피움', current: '지금 피움' }[inp.smoke]], ['음주', ALC_LABEL[inp.alcohol]],
            ['운동', <>{inp.exercise == null ? '모름' : inp.exercise ? '함' : '안 함'}<span className="block text-[12px] text-mute">주 2회·30분 이상 기준</span></>], ['부모·형제 당뇨', inp.famDM ? '있음' : '없음'],
            ['진단받은 질환', scope.dx.length ? scope.dx.join(', ') : '없음'], ['최근 혈압(응답)', L.sbp != null ? '검진 수치로 대신함' : { unknown: '모름', normal: '정상', elevated: '주의', high: '140/90 이상' }[inp.bp]]] as [string, ReactNode][])
            .map(([k, x]) => <tr key={k}><td className={K}>{k}</td><td className={V}>{x}</td></tr>)}
        </tbody></table>

        <H>입력한 검진값</H>
        {labRows.length ? (
          <table className="w-full border-collapse"><tbody>
            {labRows.map(([k, x]) => <tr key={k}><td className={K}>{k}</td><td className={V}>{x}</td></tr>)}
          </tbody></table>
        ) : <p className="m-0 text-[13px]">입력한 검진값 없음<br /><span className="text-ink-soft">모든 항목을 몸 정보와 답변으로 추정했어요.</span></p>}
        <p className="m-0 mt-1.5 text-[11px] text-mute">사용자가 넣은 값이며 검사 날짜는 받지 않았어요.</p>

        <H>앱의 안내 · 할 일</H>
        <p className="m-0 text-[13px]"><b className="font-semibold">{v.title}</b></p>
        {v.sub && <p className="m-0 mt-0.5 mb-1.5 text-[13px] whitespace-pre-line text-ink-soft">{v.sub}</p>}
        <ul className="m-0 mt-1.5 pl-[18px] text-[13px] leading-[1.7]">{v.actions.map((a) => <li key={a.t}>{a.t}{a.d && <span className="block text-[12px] text-ink-soft"><Lines t={a.d} /></span>}</li>)}</ul>
        {v.also && <p className="m-0 mt-1 text-[12px] text-ink-soft">{v.also}</p>}

        <H>질환 가능성 추정 (지금 상태)</H>
        <table className="w-full border-collapse">
          <thead><tr><th className={TH}>항목</th><th className={TH}>추정 가능성</th><th className={TH}>비교 평균</th><th className={TH}>비고</th></tr></thead>
          <tbody>{est.map((p) => { const b = probB(p);
            return <tr key={p.id}><td className={V}>{(B_NAME[p.id] ?? p.title).replace('고콜레스테롤', '이상지질혈증')}</td>
              <td className={V}><b className="font-semibold">{b.kind === 'estimate' || b.kind === 'range' ? `${p.pct}%` : b.big}</b></td>
              <td className={V}>{p.cmp ? <>{p.peerTxt}%{p.id === 'nafld' && <sup>*</sup>}</> : '–'}</td>
              <td className={`${V} text-[12px] text-ink-soft`}>{b.kind === 'estimate' ? b.freq.replace('나와 비슷한 사람 ', '').replace(' 정도예요', '') : b.kind === 'range' ? '모르는 답이 있어 범위' : b.label}{p.id === 'htn' && bpUnknown(inp) && <span className="block">혈압 모름</span>}</td></tr>; })}</tbody>
        </table>
        <p className="m-0 mt-1.5 text-[11px] leading-[1.6] text-mute">비교 평균 = 진단받지 않은 {r.group}의 실측 비율<br />(국민건강영양조사 2022–2024).{est.some((p) => p.id === 'nafld') && <><br />* 지방간은 성인 {inp.sex === 'F' ? '여성' : '남성'} 전체 평균(2016–18년, 다른 판정 기준).</>}</p>

        <H>체형</H>
        <table className="w-full border-collapse"><tbody>
          <tr><td className={K}>BMI</td><td className={V}>{ob.v} · {ob.cat}</td></tr>
          <tr><td className={K}>허리</td><td className={V}>{inp.waistCm == null ? '모름' : <>{Math.round(inp.waistCm / 2.54)}인치<span className="block text-[12px] text-ink-soft">{inp.waistCm >= cutCm ? `복부비만 기준(${Math.round(cutCm / 2.54)}인치) 넘음` : `복부비만 기준(${Math.round(cutCm / 2.54)}인치) 아래`}</span></>}</td></tr>
        </tbody></table>

        {scope.dx.length > 0 && (<><H>진단받아 관리 중인 항목</H><p className="m-0 text-[13px]">{scope.dx.join(', ')}<br /><span className="text-ink-soft">가능성을 다시 추정하지 않았어요.</span></p></>)}

        <p className="m-0 mt-[22px] border-t border-sand pt-3 text-[11px] leading-[1.6] text-ink-soft"><Lines t={`${DISCLAIMER}이에요. 1분체크에서 만든 요약이에요.`} /></p>
      </article>
    </div>
  );
}
