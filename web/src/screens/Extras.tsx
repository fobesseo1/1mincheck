// 생활·검진으로 보는 추가 체크 카드 (engine/src/extras.ts). 디자인: docs/DESIGN.md
import { ArrowRight, Circle, CircleDot, CircleHelp, CheckCircle2, Dot } from 'lucide-react';
import type { Extra } from '../../../engine/src/extras.ts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { polishExtra } from '../lib/extrasCopy.ts';

const LV = { look: ['risk', '확인 필요'], note: ['soft', '참고'], ok: ['good', '해당 없음'] } as const;
/** 항목 표시: 해당·확인·아님·모름·정보 (검진·접종은 권장·조건부) */
const MARK = {
  yes: [CheckCircle2, 'text-risk', '해당'], maybe: [CircleDot, 'text-warn', '확인'], no: [Circle, 'text-ash', '아님'], unknown: [CircleHelp, 'text-ink-soft', '모름'], info: [Dot, 'text-ink-soft', ''],
} as const;
const CHECK = { yes: [CheckCircle2, 'text-brand', '권장'], maybe: [CircleDot, 'text-brand', '해당되면'], no: [Circle, 'text-ash', ''], unknown: [CircleHelp, 'text-ink-soft', ''], info: [Dot, 'text-ink-soft', ''] } as const;

const LEAD = '지금까지 답한 내용에 공식 기준과 검증된 점수를 적용했어요.\n대부분 확률이 아니라, 기준에 해당하는지예요. ‘모름’은 낮다는 뜻이 아니에요.';
export function ExtraCards({ xs, title = '생활·검진으로 보는 체크', lead = LEAD }: { xs: Extra[]; title?: string; lead?: string }) {
  if (!xs.length) return null;
  return (
    <>
      <h2 className="mx-1 mt-3 text-[19px] font-medium">{title}</h2>
      <p className="mx-1 -mt-2 whitespace-pre-line text-body-sm text-ink-soft">{lead}</p>
      {xs.map(polishExtra).map((x) => {
        const [variant, tag] = LV[x.level], M = x.id === 'checkup' ? CHECK : MARK;
        return (
          <Card key={x.id} aria-label={x.name} className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-2"><b className="text-body font-medium">{x.name}</b><Badge variant={variant}>{x.tag ?? tag}</Badge></div>
            <b className={cn('whitespace-pre-line text-[19px] leading-snug font-medium', x.level === 'look' ? 'text-risk' : 'text-ink')}>{x.head}</b>
            <ul className="flex flex-col gap-1.5">
              {x.items.map((it) => {
                const [Ic, c, w] = M[it.s];
                return (
                  <li key={it.t} className="grid grid-cols-[18px_1fr_auto] items-start gap-2 text-body-sm">
                    <Ic className={cn('mt-0.5 size-4', c)} />
                    <span className={it.s === 'no' ? 'text-ink-soft' : 'text-ink'}>{it.t}{it.sub && <span className="block whitespace-pre-line text-caption text-ink-soft">{it.sub}</span>}</span>
                    {w && <span className={cn('whitespace-nowrap text-[11px] font-medium', c)}>{w}</span>}
                  </li>
                );
              })}
            </ul>
            <div className={cn('flex items-start gap-1.5 rounded-btn px-3.5 py-2.5 text-body-sm', x.level === 'look' ? 'bg-risk-bg font-medium text-risk' : 'bg-sand-soft text-ink')}><ArrowRight className="mt-0.5 size-4 shrink-0" /><span className="whitespace-pre-line">{x.action}</span></div>
            <details><summary className="text-caption text-ink-soft">근거</summary><p className="mt-1.5 text-caption text-ink-soft">{x.source}</p></details>
          </Card>
        );
      })}
    </>
  );
}
