// 개발 확인용 (#/dev/chars, 개발 서버나 ?dev=1616 에서만): characters.json 에서 어떤 세트를 골라 어떤 그림을 받는지 본다.
import { useState } from 'react';
import { Nav, AppShell } from '../ui.tsx';
import { useCharacterSet, ageGroup } from '../lib/characters.ts';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function DevChars() {
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [age, setAge] = useState(52);
  const set = useCharacterSet(sex, age);
  return (
    <AppShell>
      <Nav back="/dev" title="캐릭터 그림 확인" sub="characters.json 에서 고른 세트" />
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex gap-1 rounded-full bg-sand-soft p-1">
          {(['M', 'F'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSex(s)} className={cn('h-10 flex-1 cursor-pointer rounded-full text-body-sm font-medium', sex === s ? 'bg-white shadow-card' : 'text-ink-soft')}>{s === 'M' ? '남성' : '여성'}</button>
          ))}
        </div>
        <label className="flex items-center gap-3 text-body-sm">만 나이 <input type="range" min={19} max={100} value={age} onChange={(e) => setAge(+e.target.value)} className="flex-1" /><b className="w-10 text-right">{age}</b></label>
        {set ? (
          <div className="text-body-sm">
            입력 나이대 <b>{ageGroup(age) >= 60 ? '60대 이상' : `${ageGroup(age)}대`}</b> →{' '}
            {set.group === set.wanted ? <b className="text-good">그 나이대 세트 사용</b> : <b className="text-warn">세트 없음 → 가장 가까운 {set.group}대로 대신</b>}
            <div className="mt-1 break-all text-caption text-ink-soft">앞이름 {set.prefix} · {set.files[0].split('?')[1]}</div>
          </div>
        ) : <span className="text-body-sm text-ink-soft">목록을 읽는 중…</span>}
      </Card>
      {set && (['보통', '배 나온'] as const).map((t, k) => (
        <Card key={t} className="p-4">
          <b className="text-body-sm font-medium">{t} 1~5단계</b>
          <div className="mt-2 grid grid-cols-5 gap-1">
            {(k ? set.bellyFiles : set.files).map((src, i) => (
              <figure key={src} className="flex flex-col items-center">
                <img src={src} alt="" className="w-full" />
                <figcaption className="text-[10px] text-ink-soft">폭 {(k ? set.bellyWidths : set.widths)[i]}</figcaption>
              </figure>
            ))}
          </div>
        </Card>
      ))}
    </AppShell>
  );
}
