import { useEffect, useState, useCallback } from 'react';
import { StoreCtx, useRoute } from './ui.tsx';
import { type Draft, emptyDraft, loadDraft, saveDraft, loadRecords, fromInput, type RecordItem } from './state.ts';
import { Intro, Info, Life, Modules, Sleep, Mind, Digest, Diet } from './screens/Inputs.tsx';
import { Results } from './screens/Results.tsx';
import { All } from './screens/All.tsx';
import { Checkup } from './screens/Checkup.tsx';
import { Detail } from './screens/Detail.tsx';
import { WhatIf } from './screens/WhatIf.tsx';
import { Record } from './screens/Record.tsx';
import { Summary } from './screens/Summary.tsx';
import { Landing } from './screens/Landing.tsx';
import { samples } from '../../src/sampleData.ts';
import type { ItemId } from './lib/content.ts';
import { stressSamples } from './lib/stress.ts';
import { isDev } from './lib/dev.ts';
import { Dev } from './screens/Dev.tsx';
import { loadMini, miniDraft } from './screens/MiniTrial.tsx';
import { modOn, anyModOn, shown, type ModKey } from './lib/features.ts';

const MOD_PATH: Record<string, ModKey | undefined> = { '/sleep': 'sleep', '/mind': 'mind', '/digest': 'gerd', '/diet': 'diet' };

const APP: Record<string, () => JSX.Element> = {
  '/start': () => <div />, '/intro': Intro, '/info': Info, '/life': Life, '/modules': Modules,
  '/sleep': Sleep, '/mind': Mind, '/digest': Digest, '/diet': Diet, '/checkup': Checkup,
};

export function App() {
  const route = useRoute();
  const [draft, setD] = useState<Draft>(loadDraft);
  const [records, setRecords] = useState<RecordItem[]>(loadRecords);
  const [msg, setMsg] = useState('');
  const setDraft = useCallback((f: (d: Draft) => Draft) => setD((d) => { const n = f(d); saveDraft(n); return n; }), []);
  const reset = useCallback(() => setDraft(() => emptyDraft()), [setDraft]);
  const toast = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2200); }, []);

  // '체크 시작'(#/start): 시작·소개 화면 없이 바로 기본정보로. 새로 시작하므로 답을 비우되,
  // 미니 체험에 넣은 값이 있으면 채워서 이어간다. 뒤로 가기가 시작 주소에 걸리지 않게 replace
  useEffect(() => {
    if (route !== '/start') return;
    const m = loadMini();
    setDraft(() => ({ ...emptyDraft(), ...(m ? miniDraft(m) as Partial<Draft> : {}) }));
    location.replace(location.href.split('#')[0] + '#/info');
  }, [route, setDraft]);

  // 숨긴 분야(lib/features.ts)의 주소로 들어오면 결과로
  const hiddenRoute = (['/sleep', '/mind', '/digest', '/diet', '/modules'] as const).some((r) => r === route && !anyModOn())
    || (MOD_PATH[route] != null && !modOn(MOD_PATH[route]!)) || (route.startsWith('/detail/') && !shown(route.slice(8)));
  useEffect(() => { if (hiddenRoute) location.replace(location.href.split('#')[0] + '#/result'); }, [hiddenRoute]);

  // 랜딩 안의 섹션 이동(#how 등)
  useEffect(() => { if (!route.startsWith('/')) document.getElementById(route)?.scrollIntoView({ behavior: 'smooth' }); }, [route]);

  let screen: JSX.Element;
  if (!route.startsWith('/') || route === '/') screen = <Landing />;
  else if (APP[route]) { const S = APP[route]; screen = <div className="app"><S /></div>; }
  else if (route === '/result') screen = <Results />;
  else if (route === '/all') screen = <All />;
  else if (route === '/whatif') screen = <WhatIf key={JSON.stringify(draft)} />;
  else if (route === '/record') screen = <Record />;
  else if (route === '/summary') screen = <div className="app"><div className="page fade"><Summary /></div></div>;
  else if (route.startsWith('/detail/')) screen = <div className="app"><Detail id={route.slice(8) as ItemId} /></div>;
  else if (route === '/dev') screen = <div className="app"><Dev /></div>;
  else screen = <Landing />;

  return (
    <StoreCtx.Provider value={{ draft, setDraft, reset, records, setRecords, toast }}>
      {screen}
      {msg && <div className="toast" role="status">{msg}</div>}
      {isDev() && <a href="#/dev" style={{ position: 'fixed', top: 8, left: 8, zIndex: 50, padding: '3px 8px', borderRadius: 8, background: '#ffd84d', color: '#4a3800', fontSize: 11, fontWeight: 800, textDecoration: 'none' }}>개발자 모드 · 보정 확인</a>}
      {(import.meta.env.DEV || isDev()) && route.startsWith('/') && route !== '/' && (
        <div className="demo" role="group" aria-label="개발용 예시 불러오기">
          {[...samples, ...stressSamples].map((s) => <button key={s.id} type="button" onClick={() => { setDraft(() => fromInput(s.input)); toast(`예시 ${s.label} 불러옴`); }}>{s.label}</button>)}
        </div>
      )}
    </StoreCtx.Provider>
  );
}
