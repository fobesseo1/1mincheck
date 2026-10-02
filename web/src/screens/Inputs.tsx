import { useStore, Nav, Progress, H1, Choice, YN, Branch, ScaleItem, Closed, Next, Icon, Crisis, go } from '../ui.tsx';
import { useEffect, useState } from 'react';
import { LABS, parseLab, bpOf } from '../lib/labs.ts';
import type { LabKey } from '../../../engine/src/extras.ts';
import { LabField } from './Checkup.tsx';
import { loadMini } from './MiniTrial.tsx';
import { type Draft, type DrinkKey, basicError, lifeError, sleepError, mindError, gerdError, dietError, menoShown, phq2Sum, emptyDraft, ALC_FREQ, DRINKS, ALC_LABEL, alcCalc } from '../state.ts';

// ── 흐름: 기본정보 → 생활 → 관심 분야 → (고른 모듈만) → 결과 ──
type Step = 'info' | 'life' | 'modules' | 'sleep' | 'mind' | 'gerd' | 'diet';
const MOD: [keyof Draft['modules'], string][] = [['gerd', '/digest'], ['diet', '/diet'], ['sleep', '/sleep'], ['mind', '/mind']];
function flow(d: Draft): Step[] { return ['info', 'life', 'modules', ...MOD.filter(([k]) => d.modules[k]).map(([k]) => k as Step)]; }
const ROUTE: Record<Step, string> = { info: '/info', life: '/life', modules: '/modules', sleep: '/sleep', mind: '/mind', gerd: '/digest', diet: '/diet' };
const nextOf = (d: Draft, s: Step) => { const f = flow(d), i = f.indexOf(s); return i >= 0 && i < f.length - 1 ? ROUTE[f[i + 1]] : '/result'; };
const lastLabel = (d: Draft, s: Step) => (nextOf(d, s) === '/result' ? '결과 보기' : '다음');
const prevOf = (d: Draft, s: Step) => { const f = flow(d), i = f.indexOf(s); return i > 0 ? ROUTE[f[i - 1]] : '/intro'; };
function Head({ s, title }: { s: Step; title: string }) {
  const { draft } = useStore(); const f = flow(draft), i = Math.max(0, f.indexOf(s));
  return (<><Nav back={prevOf(draft, s)} title={title} right={<div className="side">{i + 1}/{f.length}</div>} /><Progress step={i + 1} total={f.length} /></>);
}

// ── 온보딩 ──
export function Start() {
  const { reset } = useStore();
  const dots = Array.from({ length: 100 }, (_, k) => k < 3);
  return (
    <div className="page fade" style={{ gap: 18 }}>
      <a href="#/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, textDecoration: 'none' }}>
        <span style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)' }} /></span>
        <b style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)' }}>1분체크</b>
      </a>
      <h1 className="h1" style={{ fontSize: 36, margin: 0 }}>내 몸이 궁금할 때<b>딱 1분.</b></h1>
      <div className="grow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ width: 300, padding: '26px 24px 22px', borderRadius: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 14px)', gap: 8 }} aria-hidden="true">{dots.map((on, k) => <i key={k} style={{ width: 14, height: 14, borderRadius: '50%', background: on ? 'var(--ink)' : '#e3e6e0' }} />)}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate)' }}>나와 비슷한 100명 중 몇 명일까요?</div>
        </div>
      </div>
      <p className="lead" style={{ fontSize: 16 }}>질문 몇 개에 답하면 나이·성별이 같은 한국인 통계와 비교해 12가지 건강 항목을 보여드려요.</p>
      <button className="cta" onClick={() => { reset(); go('/intro'); }}>시작하기</button>
      <a className="link" href="#/record">이전 기록 보기</a>
    </div>
  );
}
export function Intro() {
  const rules = [
    ['01', '이 기기 안에서만 계산해요', '답한 내용은 서버로 보내지 않아요. 기록 저장도 원할 때만, 이 기기에만 해요.'],
    ['02', '수학적 추정이에요', '논문과 국가 통계로 계산한 참고 정보예요. 진단이 아니며, 실제 판정은 반드시 의사가 해요.'],
    ['03', '근거가 있는 숫자만 써요', '국민건강영양조사(2023–2025 공표 통계, 2022–2024 원시자료)와 한국인에게 검증된 설문 도구로 계산해요.'],
  ];
  return (
    <div className="page fade">
      <Nav back="/start" title="시작하기 전에" />
      <H1 a="세 가지만" b="알아두세요" />
      {rules.map(([n, t, d]) => (
        <div key={n} className="card" style={{ display: 'flex', gap: 16, padding: 20 }}>
          <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 14, background: 'var(--linen)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--ink)' }}>{n}</div>
          <div><div style={{ fontSize: 16, fontWeight: 700, color: 'var(--obsidian)' }}>{t}</div><div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 4 }}>{d}</div></div>
        </div>
      ))}
      <div className="grow" />
      <a className="cta" href="#/info">좋아요, 시작할게요</a>
      <p className="help" style={{ textAlign: 'center', margin: 0 }}>만 19세 이상을 위한 참고 정보예요.</p>
    </div>
  );
}

// ── 1. 기본정보 ──
function NumField({ label, unit, value, onChange, big, id }: { label: string; unit: string; value: string; onChange: (v: string) => void; big?: boolean; id: string }) {
  return (
    <label htmlFor={id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: big ? 'center' : 'stretch', gap: 2 }}>
      <span className="cap" style={{ fontSize: 13 }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: big ? 'center' : 'flex-start', gap: 4 }}>
        <input id={id} className="num" inputMode="decimal" value={value} placeholder="0" onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))} style={{ width: `${Math.max(2, value.length) * (big ? 0.62 : 0.66) + 0.4}em`, ...(big ? { fontSize: 48, textAlign: 'center' } : {}) }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--slate)' }}>{unit}</span>
      </span>
    </label>
  );
}
/** 미니 체험에서 이어 온 경우 맨 위 안내: 미니에서 본 결론 색 그대로 이어서 */
function MiniBridge() {
  const m = loadMini();
  if (!m) return null;
  const t = m.tone;
  const st = t === 2 ? { background: '#cb272f', color: '#fff' } : t === 1 ? { background: '#fdecea', color: '#cb272f' } : t === 0 ? { background: 'var(--lime)', color: 'var(--ink)' } : { background: 'var(--linen)', color: 'var(--ink)' };
  const title = t != null ? `체형만 봤을 때: ${m.title}` : '미니 체험에서 넣은 값을 가져왔어요';
  const sub = t === 0 ? '허리·습관까지 넣으면 더 정확해요. 넣은 값은 채워 뒀어요.' : t != null ? '허리·혈압·습관을 넣으면 내 위험이 정확해져요. 넣은 값은 채워 뒀어요.' : '나머지만 채우면 돼요.';
  return (
    <div role="note" style={{ ...st, padding: '12px 14px', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <b style={{ fontSize: 15, lineHeight: 1.4 }}>{title}</b>
      <span style={{ fontSize: 13, lineHeight: 1.5, color: t === 1 ? 'var(--charcoal)' : undefined, opacity: t === 2 ? 0.92 : 1 }}>{sub}</span>
    </div>
  );
}

export function Info() {
  const { draft: d, setDraft } = useStore();
  // 미니에서 이어 왔으면 처음 비어 있는 칸으로 바로 (보통 허리둘레)
  useEffect(() => {
    if (!loadMini()) return;
    const first = [['age', d.age], ['h', d.height], ['w', d.weight], ['wa', d.waist]].find(([, v]) => !v)?.[0];
    const el = first ? (document.getElementById(first) as HTMLInputElement | null) : null;
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<Draft>) => setDraft((x) => ({ ...x, ...p }));
  const err = basicError(d);
  const h = Number(d.height), w = Number(d.weight), bmi = h >= 120 && w >= 30 ? w / (h / 100) ** 2 : null;
  const cat = bmi == null ? '' : bmi < 18.5 ? '저체중' : bmi < 23 ? '정상' : bmi < 25 ? '비만 전단계' : bmi < 30 ? '1단계 비만' : bmi < 35 ? '2단계 비만' : '3단계 비만';
  return (
    <div className="page fade">
      <Head s="info" title="기본정보" />
      <MiniBridge />
      <H1 a="몸에 대한 숫자부터" b="알려주세요" />
      <Choice q="성별" value={d.sex} onChange={(v) => set({ sex: v })} options={[{ v: 'M' as const, t: '남성' }, { v: 'F' as const, t: '여성' }]} />
      <div className="grid2">
        <div className="card" style={{ padding: '18px 20px' }}><NumField id="age" label="만 나이" unit="세" value={d.age} onChange={(v) => set({ age: v })} /></div>
        <div className="card" style={{ padding: '18px 20px' }}><NumField id="h" label="키" unit="cm" value={d.height} onChange={(v) => set({ height: v })} /></div>
      </div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', padding: '20px 16px' }}>
        <NumField id="w" big label="몸무게" unit="kg" value={d.weight} onChange={(v) => set({ weight: v })} />
        <div style={{ width: 1, height: 64, background: 'var(--line2)' }} />
        {/* 허리둘레: 숫자 오른쪽에 단위(인치 위·cm 아래), 숫자 아래에 다른 단위 환산값 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <label htmlFor="wa" className="cap" style={{ fontSize: 13 }}>허리둘레</label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <input id="wa" className="num" inputMode="decimal" value={d.waist} placeholder="0"
              onChange={(e) => set({ waist: e.target.value.replace(/[^0-9.]/g, ''), waistUnknown: false })}
              style={{ fontSize: 44, textAlign: 'center', width: `${Math.max(2, d.waist.length) * 0.6 + 0.3}em` }} />
            <div role="radiogroup" aria-label="허리 단위" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {([['in', '인치'], ['cm', 'cm']] as const).map(([u, t]) => {
                const on = d.waistUnit === u;
                return <button key={u} type="button" role="radio" aria-checked={on} onClick={() => set({ waistUnit: u })}
                  style={{ border: 0, background: 'transparent', padding: '2px 2px', minHeight: 22, fontSize: 13, whiteSpace: 'nowrap', textAlign: 'left', fontWeight: on ? 800 : 500, color: on ? 'var(--ink)' : '#b9bdb5' }}>{t}</button>;
              })}
            </div>
          </div>
          <span style={{ fontSize: 12, color: '#a3a7a0', minHeight: 16 }}>
            {Number(d.waist) > 0 ? (d.waistUnit === 'in' ? `≈ ${(Number(d.waist) * 2.54).toFixed(1)}cm` : `≈ ${(Number(d.waist) / 2.54).toFixed(1)}인치`) : ''}
          </span>
        </div>
      </div>
      <p className="help" style={{ margin: '0 4px' }}>허리둘레는 배꼽 높이 기준 둘레예요.</p>
      {bmi != null && (
        <div className="dark fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
          <div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--lime)' }}>자동 계산</div><div style={{ fontSize: 14 }}>{cat} · 대한비만학회 기준</div></div>
          <div><span style={{ fontSize: 13, color: '#d8e8cf' }}>BMI </span><b style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.04em' }}>{bmi.toFixed(1)}</b></div>
        </div>
      )}
      <div className="grow" />
      {err === 'under19'
        ? <div className="card" style={{ padding: 18, textAlign: 'center', lineHeight: 1.55 }}>1분체크는 <b>만 19세 이상</b>을 위한 통계예요.<br />청소년 건강은 보호자와 함께 학교·보건소 검진으로 확인해 주세요.</div>
        : <Next error={err} to={nextOf(d, 'info')} label="다음" />}
    </div>
  );
}

// ── 2. 생활과 병력 ──
export function Life() {
  const { draft: d, setDraft } = useStore();
  const set = (p: Partial<Draft>) => setDraft((x) => ({ ...x, ...p }));
  const toggleDx = (k: 'htn' | 'dm' | 'chol' | 'none') => setDraft((x) => {
    const dx = { ...x.dx };
    if (k === 'none') return { ...x, dx: { htn: false, dm: false, chol: false, none: !dx.none } };
    dx[k] = !dx[k]; dx.none = false; return { ...x, dx };
  });
  // 혈압 숫자가 있으면 범주를 숫자로 맞춘다
  const lab = parseLab(d.lab ?? {}), bpNum = lab.sbp != null ? bpOf(lab.sbp, lab.dbp!) : null;
  useEffect(() => { if (bpNum && d.bp !== bpNum) set({ bp: bpNum }); }, [bpNum]);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="page fade">
      <Head s="life" title="생활과 병력" />
      <H1 a="요즘 생활은" b="어떠세요?" />
      <Choice q="담배를 피우나요?" value={d.smoke} onChange={(v) => set({ smoke: v })} options={[{ v: 'never' as const, t: '안 피움' }, { v: 'past' as const, t: '예전에 피움' }, { v: 'current' as const, t: '지금 피움' }]} />
      <Choice q="술은 얼마나 자주 마시나요?" cols={3} size="sm" value={d.alcFreq} onChange={(v) => set({ alcFreq: v })}
        options={ALC_FREQ.map((f) => ({ v: f.v, t: f.t }))} />
      {d.alcFreq && d.alcFreq !== 'none' && <Drinks />}
      <YN q="주 2회 이상, 한 번에 30분 이상 운동하나요?" value={d.exercise} onChange={(v) => set({ exercise: v })} />
      {menoShown(d) && (
        <Choice q="폐경했나요?" badge="여성 · 40세 이상이라 보이는 질문" value={d.meno} onChange={(v) => set({ meno: v })}
          options={[{ v: true as const, t: '네' }, { v: false as const, t: '아니요' }, { v: 'unknown' as const, t: '잘 모름' }]} />
      )}
      <Choice q="부모·형제 중에 당뇨가 있는 분이 있나요?" value={d.famDM} onChange={(v) => set({ famDM: v })} options={[{ v: true, t: '있어요' }, { v: false, t: '없어요' }]} />
      <div className="card q" role="group" aria-label="진단받은 질환">
        <div className="qt">진단받은 질환이 있나요? <span style={{ fontWeight: 400, fontSize: 14, color: 'var(--slate)' }}>(여러 개 선택)</span></div>
        <div className="opts" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          {([['htn', '고혈압'], ['dm', '당뇨'], ['chol', '고지혈증'], ['none', '없음']] as const).map(([k, t]) => (
            <button key={k} type="button" className="opt sm" aria-pressed={d.dx[k]} onClick={() => toggleDx(k)}>{t}</button>
          ))}
        </div>
        <div className="help">고지혈증은 콜레스테롤·중성지방 이상 진단, 또는 검진에서 이상 소견을 받은 경우예요. 진단받은 항목은 확률 대신 ‘관리 중’으로 보여드려요.</div>
      </div>
      <Choice q="최근에 잰 혈압은요?" cols={2} value={d.bp} onChange={(v) => set({ bp: v })}
        options={[{ v: 'unknown' as const, t: '모름' }, { v: 'normal' as const, t: '정상', s: '120/80 미만' }, { v: 'elevated' as const, t: '주의', s: '120–139 / 80–89' }, { v: 'high' as const, t: '높음', s: '140 / 90 이상' }]} />
      <Optional label="혈압 숫자를 알면 (선택)" keys={['sbp', 'dbp']} note={bpNum ? `→ ${({ normal: '정상', elevated: '주의', high: '높음', unknown: '모름' } as const)[bpNum]}으로 계산해요` : '두 숫자를 넣으면 위 칸이 자동으로 정해져요'} />
      <Optional label="최근 공복혈당을 알면 (선택)" keys={['glu']} />
      <a href="#/checkup" style={{ alignSelf: 'center', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>건강검진 결과지가 있으면 더 정확하게 →</a>
      <div className="grow" />
      <Next error={lifeError(d)} to={nextOf(d, 'life')} label="다음: 관심 분야 고르기" />
    </div>
  );
}

/** 접힌 선택 입력 (검진 수치). 누르면 칸이 열린다 */
function Optional({ label, keys, note }: { label: string; keys: LabKey[]; note?: string }) {
  const { draft: d } = useStore();
  const has = keys.some((k) => d.lab?.[k]);
  const [open, setOpen] = useState(has);
  return (
    <div className="card" style={{ padding: '4px 18px' }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        style={{ width: '100%', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 0, background: 'transparent', padding: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
        {label}<span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>{Icon.down}</span>
      </button>
      {open && <div className="fade" style={{ paddingBottom: 8 }}>
        {LABS.filter((l) => keys.includes(l.key)).map((l) => <LabField key={l.key} l={l} />)}
        {note && <div className="help" style={{ paddingTop: 6 }}>{note}</div>}
      </div>}
    </div>
  );
}

/** 한 번 마실 때 무엇을 얼마나: 술 종류별 수량 → 표준 잔 → 하루 평균 */
function Drinks() {
  const { draft: d, setDraft } = useStore();
  const setAmt = (k: DrinkKey, v: number) => setDraft((x) => ({ ...x, alcAmt: { ...x.alcAmt, [k]: Math.max(0, Math.round(v * 10) / 10) } }));
  const c = alcCalc(d.alcFreq, d.alcAmt), freq = ALC_FREQ.find((f) => f.v === d.alcFreq)!;
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  return (
    <div className="card branch fade" role="group" aria-label="한 번 마실 때 마시는 양">
      <div className="hd"><span style={{ color: 'var(--lime)' }}>{Icon.down}</span><div><b>한 번 마실 때 보통 얼마나 마시나요?</b><span>여러 종류를 섞어 마시면 각각 넣어 주세요</span></div></div>
      <div className="bd" style={{ gap: 4 }}>
        {DRINKS.map((k) => (
          <div key={k.k} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 52, borderBottom: '1px solid var(--line)' }}>
            <div className="grow"><b style={{ fontSize: 15, color: 'var(--obsidian)' }}>{k.t}</b><div style={{ fontSize: 12, color: 'var(--slate)' }}>{k.hint}</div></div>
            <button type="button" className="circle" aria-label={`${k.t} 줄이기`} onClick={() => setAmt(k.k, d.alcAmt[k.k] - k.step)} style={{ width: 38, height: 38, fontSize: 20, fontWeight: 700 }}>−</button>
            <span style={{ minWidth: 62, textAlign: 'center', fontSize: 16, fontWeight: 800, color: d.alcAmt[k.k] ? 'var(--obsidian)' : '#b9bdb5' }}>{fmt(d.alcAmt[k.k])}<small style={{ fontSize: 11, fontWeight: 600 }}> {k.unit}</small></span>
            <button type="button" className="circle" aria-label={`${k.t} 늘리기`} onClick={() => setAmt(k.k, d.alcAmt[k.k] + k.step)} style={{ width: 38, height: 38, fontSize: 20, fontWeight: 700, background: 'var(--ink)', color: '#fff' }}>+</button>
          </div>
        ))}
        <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 14, background: c.per ? 'var(--linen)' : 'var(--bg)', fontSize: 14, lineHeight: 1.5, color: 'var(--ink)' }} role="status">
          {c.per ? <>{freq.t} × 한 번에 약 {fmt(c.per)}잔 → <b>하루 평균 약 {c.daily.toFixed(1)}잔</b> ({ALC_LABEL[c.cat!]})</> : '+ 버튼으로 양을 넣어 주세요'}
        </div>
      </div>
    </div>
  );
}

// ── 3. 관심 분야 ──
export function Modules() {
  const { draft: d, setDraft } = useStore();
  const M: [keyof Draft['modules'], string, string, string, string][] = [
    ['gerd', '소화', '가슴쓰림·신물 올라옴', '1문항 · 증상 있으면 +6', 'M8 3v6a4 4 0 0 0 8 0V3M12 13v8'],
    ['diet', '식생활', '아침·잡곡·과일·채소·짠 음식·단 음료', '7문항 · 참고 지표', 'M4 11h16a8 8 0 0 1-16 0zM9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4'],
    ['sleep', '수면', '코골이·숨멈춤·낮 졸림, 잠드는 어려움', '5문항 · 증상 있으면 +7', 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
    ['mind', '마음', '최근 2주 기분과 걱정 · 원할 때만', '4문항 · 필요하면 +7', 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
  ];
  const n = 12 + (d.modules.sleep ? 5 : 0) + (d.modules.mind ? 4 : 0) + (d.modules.gerd ? 1 : 0) + (d.modules.diet ? 7 : 0);
  return (
    <div className="page fade">
      <Head s="modules" title="관심 분야" />
      <H1 a="더 알고 싶은 분야를" b="골라주세요" />
      <p className="lead">해당하는 답을 했을 때만 질문이 더 열려요. 건너뛴 분야는 결과에서 ‘답하면 볼 수 있어요’로 남아요.</p>
      <div className="grid2">
        {M.map(([k, t, w, c, icon]) => {
          const on = d.modules[k];
          return (
            <button key={k} type="button" aria-pressed={on} onClick={() => setDraft((x) => ({ ...x, modules: { ...x.modules, [k]: !on } }))}
              className="card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '18px 16px', minHeight: 168, textAlign: 'left', border: `2px solid ${on ? 'var(--ink)' : 'transparent'}`, opacity: on ? 1 : 0.75 }}>
              <span style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--linen)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg></span>
              <span style={{ position: 'absolute', top: 14, right: 14, width: 24, height: 24, borderRadius: '50%', background: on ? 'var(--ink)' : 'var(--fog)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && Icon.check}</span>
              <b style={{ fontSize: 17, color: 'var(--obsidian)' }}>{t}</b>
              <span style={{ fontSize: 12, lineHeight: 1.45 }}>{w}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--spruce)' }}>{c}</span>
            </button>
          );
        })}
      </div>
      <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <b style={{ fontSize: 14, color: 'var(--obsidian)' }}>추가 질문 없이 자동으로 계산해요</b>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="pill" style={{ height: 30, background: 'var(--bg)', color: 'var(--ink)' }}>지방간 · 기본정보로 계산</span>
          <span className="pill" style={{ height: 30, background: 'var(--bg)', color: 'var(--ink)' }}>골다공증 · 50세부터</span>
        </div>
      </div>
      <div className="grow" />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '0 4px' }}><span>선택한 경로</span><span><b style={{ color: 'var(--obsidian)' }}>{n}문항</b> · 답에 따라 더 열려요</span></div>
      <a className="cta" href={'#' + nextOf(d, 'modules')}>{nextOf(d, 'modules') === '/result' ? '결과 보기' : '다음'}</a>
    </div>
  );
}

// ── 4. 수면 ──
const ISI: [string, string[]][] = (() => {
  const sev = ['없음', '약간', '중간', '심함', '매우 심함'], sat = ['매우 만족', '만족', '보통', '불만족', '매우 불만족'], deg = ['전혀', '약간', '어느 정도', '많이', '매우 많이'];
  return [['잠들기 어려움', sev], ['잠을 유지하기 어려움', sev], ['너무 일찍 깸', sev], ['지금 수면 패턴에 얼마나 만족하나요?', sat],
    ['수면 문제가 다른 사람 눈에 얼마나 띄나요?', deg], ['수면 문제로 얼마나 걱정되거나 괴로운가요?', deg], ['수면 문제가 낮 생활(피로·집중·기억·기분)을 얼마나 방해하나요?', deg]];
})();
export function Sleep() {
  const { draft: d, setDraft } = useStore(); const s = d.sleep;
  const set = (p: Partial<Draft['sleep']>) => setDraft((x) => ({ ...x, sleep: { ...x.sleep, ...p } }));
  return (
    <div className="page fade">
      <Head s="sleep" title="수면" />
      <H1 a="잠은 잘" b="자고 계신가요?" />
      {/* STOP-Bang 공식 한국어판(KR-kor, 2015) 문구. 혈압·BMI·나이·성별 4문항은 앞에서 받은 답으로 자동 계산 */}
      <YN q="코를 크게 곱니까? (문이 닫힌 상태에서 문 밖에서 들을 수 있을 정도, 또는 같이 자는 사람이 밀쳐 낼 정도)" value={s.snore} onChange={(v) => set({ snore: v })} />
      <YN q="낮 동안 종종 지치거나, 피곤하거나, 졸림을 느낍니까? (예: 운전 중 잠드는 것)" value={s.tired} onChange={(v) => set({ tired: v })} />
      <YN q="수면 중에 숨을 멈추거나 숨이 막히거나 숨을 헐떡이는 것을 누군가가 보았습니까?" value={s.apnea} onChange={(v) => set({ apnea: v })} />
      <YN q={`목둘레가 큽니까? (목젖 주위로 측정, 셔츠 목 칼라 ${d.sex === 'F' ? '16인치/41cm' : '17인치/43cm'} 이상)`} value={s.neck} onChange={(v) => set({ neck: v })} />
      <YN q="최근 2주, 잠들기·잠 유지·새벽에 일찍 깨는 것 중 하나라도 문제가 있었나요?" value={s.insGate} onChange={(v) => set({ insGate: v })} />
      {s.insGate === true && (
        <Branch title="‘네’라고 답해서 열린 질문 7개" sub="불면 정도 표준 척도(ISI) · 최근 2주">
          {ISI.map(([q, l], k) => <ScaleItem key={k} q={`${k + 1}. ${q}`} labels={l} size="xs" value={s.isi[k]} onChange={(v) => set({ isi: s.isi.map((x, j) => (j === k ? v : x)) })} />)}
        </Branch>
      )}
      {s.insGate === false && <Closed>‘아니요’라서 <b>불면 척도 7문항은 건너뛰었어요.</b></Closed>}
      <div className="grow" />
      <Next error={sleepError(d)} to={nextOf(d, 'sleep')} label={lastLabel(d, 'sleep')} />
    </div>
  );
}

// ── 5. 마음 ──
const F4 = ['전혀', '며칠', '7일 이상', '거의 매일'];
const PHQ_MORE = ['잠들기 어렵거나 자주 깨요. 또는 너무 많이 자요', '피곤하고 기운이 없어요', '식욕이 줄었거나 너무 많이 먹어요', '내가 실패자라고 느끼거나, 나 자신이나 가족을 실망시켰다고 느껴요',
  '신문을 읽거나 TV를 볼 때 집중하기 어려워요', '남들이 알아챌 만큼 느리게 움직이거나 말해요. 또는 너무 안절부절못해요', '차라리 죽는 게 낫겠다는 생각이나 스스로를 해치는 생각을 했어요'];
export function Mind() {
  const { draft: d, setDraft } = useStore(); const m = d.mind;
  const setP = (k: number, v: number) => setDraft((x) => ({ ...x, mind: { ...x.mind, phq: x.mind.phq.map((y, j) => (j === k ? v : y)) } }));
  const setG = (k: number, v: number) => setDraft((x) => ({ ...x, mind: { ...x.mind, gad: x.mind.gad.map((y, j) => (j === k ? v : y)) } }));
  const two = m.phq[0] != null && m.phq[1] != null, sum = phq2Sum(d), open = two && sum >= 3;
  const crisis = (m.phq[8] ?? 0) >= 1;
  return (
    <div className="page fade">
      <Head s="mind" title="마음" />
      <H1 a="지난 2주, 이런 일이" b="얼마나 있었나요?" />
      <Choice q="일이나 여가 활동에 흥미나 즐거움을 느끼지 못했어요" size="sm" value={m.phq[0]} onChange={(v) => setP(0, v)} options={F4.map((t, j) => ({ v: j, t }))} />
      <Choice q="기분이 가라앉거나, 우울하거나, 희망이 없다고 느꼈어요" size="sm" value={m.phq[1]} onChange={(v) => setP(1, v)} options={F4.map((t, j) => ({ v: j, t }))} />
      {open && (
        <Branch title={`두 문항 합계 ${sum}점 · 더 정확히 보기 7문항`} sub="답하지 않고 넘어가도 돼요. 답하면 결과가 더 정확해져요.">
          {PHQ_MORE.map((q, k) => <ScaleItem key={k} q={`${k + 3}. ${q}`} labels={F4} size="xs" value={m.phq[k + 2]} onChange={(v) => setP(k + 2, v)} />)}
        </Branch>
      )}
      {crisis && <Crisis />}
      {two && !open && <Closed><b>두 문항 합계 {sum}점</b> · 3점 이상이면 ‘더 정확히 보기’ 7문항이 열려요.</Closed>}
      <Choice q="초조하거나 불안하거나 조마조마했어요" size="sm" value={m.gad[0]} onChange={(v) => setG(0, v)} options={F4.map((t, j) => ({ v: j, t }))} />
      <Choice q="걱정을 멈추거나 조절하기 어려웠어요" size="sm" value={m.gad[1]} onChange={(v) => setG(1, v)} options={F4.map((t, j) => ({ v: j, t }))} />
      {!crisis && (
        <div style={{ display: 'flex', gap: 14, padding: 18, borderRadius: 20, background: 'var(--linen)', color: 'var(--ink)', fontSize: 13, lineHeight: 1.55 }}>
          {Icon.chat}<div>마음이 많이 힘들다면 혼자 견디지 않아도 돼요. <a href="tel:109"><b>자살예방상담 109</b></a>(24시간), 가까운 정신건강복지센터에서 이야기를 들어줘요.</div>
        </div>
      )}
      <div className="grow" />
      <Next error={mindError(d)} to={nextOf(d, 'mind')} label={lastLabel(d, 'mind')} />
    </div>
  );
}

// ── 6. 소화 ──
const GQ = ['가슴 뒤쪽이 타는 듯한 느낌(가슴쓰림)', '음식이나 신물이 목·입으로 올라옴', '명치(윗배 가운데) 통증', '메스꺼움', '가슴쓰림·역류 때문에 잠을 설침', '가슴쓰림·역류 때문에 약국 약(제산제 등)을 더 먹음'];
export function Digest() {
  const { draft: d, setDraft } = useStore(); const g = d.gerd;
  return (
    <div className="page fade">
      <Head s="gerd" title="소화" />
      <H1 a="속은" b="편안한가요?" />
      <YN q="최근 가슴쓰림(명치 위가 타는 느낌)이나 신물이 올라온 적이 있나요?" value={g.gate} onChange={(v) => setDraft((x) => ({ ...x, gerd: { ...x.gerd, gate: v } }))} />
      {g.gate === true && (
        <Branch title="‘네’라고 답해서 열린 질문 6개" sub="지난 7일 중 며칠이었나요? (한국판 GerdQ)">
          {GQ.map((q, k) => <ScaleItem key={k} q={q} labels={['0일', '1일', '2–3일', '4–7일']} size="sm" value={g.gq[k]} onChange={(v) => setDraft((x) => ({ ...x, gerd: { ...x.gerd, gq: x.gerd.gq.map((y, j) => (j === k ? v : y)) } }))} />)}
        </Branch>
      )}
      {g.gate === false && <Closed>‘아니요’라서 <b>소화 모듈은 여기서 끝났어요.</b></Closed>}
      <div className="grow" />
      <Next error={gerdError(d)} to={nextOf(d, 'gerd')} label={lastLabel(d, 'gerd')} />
    </div>
  );
}

// ── 7. 식생활 ──
const DIET: [string, string[]][] = [
  ['아침식사를 일주일에 며칠 하나요?', ['0–2일', '3–4일', '5일 이상']], ['잡곡밥(현미·보리 등)을 하루 1번 이상 먹나요?', ['거의 안 먹음', '가끔', '거의 매일']],
  ['과일(주스 제외)은 얼마나 자주 먹나요?', ['주 1회 이하', '주 2–6회', '매일']], ['김치 말고 채소 반찬을 끼니마다 먹나요?', ['거의 안 먹음', '하루 1–2끼', '매 끼니']],
  ['우유·요구르트·치즈는 얼마나 자주 먹나요?', ['주 1회 이하', '주 2–6회', '매일']], ['국물을 다 마시거나 짠 반찬(젓갈·장아찌)을 자주 먹나요?', ['자주', '가끔', '거의 안 함']],
  ['단 음료(탄산·가당 커피·주스)는 얼마나 마시나요?', ['거의 매일', '주 2–6회', '주 1회 이하']],
];
export function Diet() {
  const { draft: d, setDraft } = useStore();
  return (
    <div className="page fade">
      <Head s="diet" title="식생활" />
      <H1 a="평소에 이렇게" b="드시나요?" />
      <span className="pill" style={{ alignSelf: 'flex-start', marginLeft: 4, background: '#fff' }}>참고 지표 · 검증된 척도는 아니에요</span>
      {DIET.map(([q, o], k) => <Choice key={k} q={q} size="sm" value={d.diet[k]} onChange={(v) => setDraft((x) => ({ ...x, diet: x.diet.map((y, j) => (j === k ? v : y)) }))} options={o.map((t, j) => ({ v: j, t }))} />)}
      <div className="grow" />
      <Next error={dietError(d)} to={nextOf(d, 'diet')} label={lastLabel(d, 'diet')} />
    </div>
  );
}
export { emptyDraft };
