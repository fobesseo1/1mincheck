import { useEffect, useState, useCallback } from 'react';
import { StoreCtx, useRoute } from './ui.tsx';
import { type Draft, emptyDraft, loadDraft, saveDraft, loadRecords, fromInput, type RecordItem } from './state.ts';
import { Start, Intro, Info, Life, Modules, Sleep, Mind, Digest, Diet } from './screens/Inputs.tsx';
import { Results } from './screens/Results.tsx';
import { Checkup } from './screens/Checkup.tsx';
import { Detail } from './screens/Detail.tsx';
import { WhatIf } from './screens/WhatIf.tsx';
import { Record } from './screens/Record.tsx';
import { Landing } from './screens/Landing.tsx';
import { samples } from '../../src/sampleData.ts';
import type { ItemId } from './lib/content.ts';
import { stressSamples } from './lib/stress.ts';
import { isDev } from './lib/dev.ts';
import { Dev } from './screens/Dev.tsx';

const APP: Record<string, () => JSX.Element> = {
  '/start': Start, '/intro': Intro, '/info': Info, '/life': Life, '/modules': Modules,
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

  // 랜딩 안의 섹션 이동(#how 등)
  useEffect(() => { if (!route.startsWith('/')) document.getElementById(route)?.scrollIntoView({ behavior: 'smooth' }); }, [route]);

  let screen: JSX.Element;
  if (!route.startsWith('/') || route === '/') screen = <Landing />;
  else if (APP[route]) { const S = APP[route]; screen = <div className="app"><S /></div>; }
  else if (route === '/result') screen = <Results />;
  else if (route === '/whatif') screen = <WhatIf key={JSON.stringify(draft)} />;
  else if (route === '/record') screen = <Record />;
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
