/**
 * B버전(비교용) 전용 표시 함수.
 * 계산·판정은 engine·view.ts·verdict.ts 를 그대로 쓰고(값·단계는 A버전과 같다), 여기서는 읽는 순서와 설명 문장만 만든다.
 *  - 확률: '현재 가능성 추정 ○%' → '비슷한 조건의 100명 중 약 ○명 수준' → '또래 평균과 비교'
 *  - 결과 이유: 그 모형이 실제로 쓰는 입력 중, 이 사람이 답한 값만 (기여도 숫자는 만들지 않는다)
 *  - 확인 범위: 반영한 검진값·설문, 아직 체크하지 않은 분야
 */
import { ratioLabel } from '../../../engine/src/engine.ts';
import { ALC_LABEL, type AppInput } from '../state.ts';
import { labOf, xfmt, f1, viewResults, type Scenario } from './view.ts';
import { verdict, type Verdict } from './verdict.ts';
import type { ItemId } from './content.ts';

type R = ReturnType<typeof viewResults>;
export type ProbRow = R['prob'][number];

/** B 화면의 항목 이름 */
export const B_NAME: Partial<Record<ItemId, string>> = { dm: '당뇨', htn: '고혈압', chol: '고콜레스테롤', nafld: '지방간', osteo: '골다공증' };

// ── 자연 빈도 ──
/** 분모: 1% 미만이면 1,000명, 아니면 100명 */
export const denomOf = (pct: number) => (pct < 1 ? 1000 : 100);
/** '100명 중 약 24명' · '1,000명 중 약 3명'. 0.1% 미만은 '1,000명 중 1명 미만'(0으로 반올림해 없다고 보이지 않게) */
export function freqOf(pct: number, denom = denomOf(pct)): string {
  const D = denom === 1000 ? '1,000명' : '100명';
  if (pct < 0.1) return '1,000명 중 1명 미만';
  const n = Math.round((pct * denom) / 100);
  return n < 1 ? `${D} 중 1명 미만` : `${D} 중 약 ${n}명`;
}

/** 또래 평균과 비교한 한 문장. 구간은 엔진 ratioLabel 과 같다(0.8·1.25·2배). 배수는 지우지 않고 뒤에 붙인다 */
export function peerLine(me: number, peer: number, peerTxt: string): string {
  const P = `또래 평균 ${peerTxt}%`, label = ratioLabel(me, peer), xs = `약 ${xfmt(me / peer)}배`;
  if (label === '낮음') return `${P}보다 낮아요`;
  if (label === '비슷') return me >= 20 ? `${P}와 비슷해요. 또래에서도 흔한 편이에요` : `${P}와 비슷해요`;
  if (me < 1) return `${P}보다 높지만(${xs}), 추정 가능성 자체는 낮은 편이에요`;
  return `${P}보다 높아요 (${xs})`;
}

/** 확률 항목 한 줄의 B 표현. kind 로 '현재 가능성 추정'·'검진 수치'·'관리 중' 등을 섞지 않는다 */
export type ProbB =
  | { kind: 'estimate'; label: string; big: string; freq: string; peer: string; high: boolean }
  | { kind: 'range'; label: string; big: string; freq: string; note: string }
  | { kind: 'managed' | 'criteria' | 'measured' | 'excluded' | 'na' | 'needs'; label: string; big: string; note: string };
export function probB(p: ProbRow, inp?: AppInput): ProbB {
  const st = p.status as string;
  if (st === 'ok' && p.cmp) {
    const me = p.cmp.me;
    return { kind: 'estimate', label: '현재 가능성 추정', big: `${p.pct}%`, freq: `비슷한 조건의 ${freqOf(me)} 수준이에요`,
      peer: peerLine(me, p.cmp.peer, p.peerTxt), high: p.cmp.high };
  }
  if (st === 'ok' && p.pct.includes('–')) {
    const [a, b] = p.pct.split('–').map(Number), one = a === b;   // 모르는 답이 있어도 값이 같으면 하나로
    return { kind: 'range', label: '현재 가능성 추정', big: one ? `약 ${a}%` : `약 ${p.pct}%`, freq: `비슷한 조건의 ${one ? freqOf(a) : `100명 중 약 ${Math.round(a)}–${Math.round(b)}명`} 수준이에요`,
      note: one ? '' : rangeNote(inp) };
  }
  if (st === 'managed') return { kind: 'managed', label: '진단받아 관리 중', big: '관리 중', note: '이미 진단받은 항목은 가능성을 다시 추정하지 않아요. 지금처럼 꾸준히 관리해 주세요.' };
  if (st === 'criteria') return { kind: 'criteria', label: '측정값 기준 판단', big: '기준 이상', note: p.note };
  if (st === 'measured') return { kind: 'measured', label: '입력한 검진 수치', big: '수치 반영', note: p.note };
  if (st === 'excluded') return { kind: 'excluded', label: '계산 대상 아님', big: '검사 필요', note: p.note };
  if (st === 'na') return { kind: 'na', label: '대상 아님', big: '–', note: p.note };
  return { kind: 'needs', label: '아직 체크하지 않음', big: '–', note: p.note };
}

/** 범위가 된 이유: 실제로 비어 있는 답만. 여성은 40세 미만이면 폐경 질문을 하지 않아 계산에서 모름으로 남는다(엔진 그대로) */
function rangeNote(inp?: AppInput) {
  if (!inp) return '모르는 답이 있어 범위로 계산했어요.';
  const xs = [inp.waistCm == null && '허리둘레', inp.exercise == null && '운동 여부', inp.sex === 'F' && inp.meno == null && (inp.age < 40 ? '폐경 여부(40세 미만은 묻지 않음)' : '폐경 여부')].filter(Boolean);
  return `${xs.join('·') || '일부 답'}${xs.length ? '를' : '이'} 몰라 범위로 계산했어요.`;
}

// ── 결과 이유 한 줄 ──
const bmiOf = (i: AppInput) => i.weightKg / (i.heightCm / 100) ** 2;
/**
 * 그 모형이 실제로 쓰는 입력 중 이 사람의 답만 나열한다(계산에 포함됐다는 뜻, 원인·기여도 아님).
 * 당뇨: 나이·가족력·고혈압(진단 또는 140/90 응답)·허리둘레·현재 흡연·음주(하루 1잔 이상) + 체질량지수·허리 보정(engine/src/numeric.ts), 공복혈당을 넣었으면 혈당 반영 모형
 * 고혈압: 성별·나이대·체질량지수(+허리 보정) / 고콜레스테롤: 성별·나이대·체질량지수(남성은 허리 보정 포함)
 * 지방간: 나이(35세 이상)·허리둘레·체질량지수·운동·당뇨/고지혈증 진단·(남) 음주·(여) 폐경
 * 골다공증: (여) 나이·체중 점수(OSTA) / (남) 나이대 평균 + 체질량지수·허리 보정
 */
export function reasonOf(id: ItemId, inp: AppInput, p?: ProbRow): string | null {
  if (!p || (p.status as string) !== 'ok') return null;
  const L = labOf(inp), bmi = `체질량지수 ${f1(bmiOf(inp))}`, w = inp.waistCm != null ? `허리둘레 ${inp.waistCm}cm` : null, xs: (string | null | false)[] = [];
  const F = inp.sex === 'F';
  switch (id) {
    case 'dm':
      xs.push(`나이 ${inp.age}세`, inp.famDM && '부모·형제 당뇨', (inp.dx.htn || inp.bp === 'high') && (inp.dx.htn ? '고혈압 진단' : '혈압 140/90 이상 응답'),
        w ?? '허리둘레 모름(범위로 계산)', inp.smoke === 'current' && '현재 흡연', (inp.alcohol === 'd1_4' || inp.alcohol === 'd5') && `음주 ${ALC_LABEL[inp.alcohol]}`, bmi,
        L.glu != null && `입력한 공복혈당 ${L.glu}mg/dL`);
      break;
    case 'htn': xs.push(`${F ? '여성' : '남성'}·나이 ${inp.age}세`, bmi, w); break;
    case 'chol': xs.push(`${F ? '여성' : '남성'}·나이 ${inp.age}세`, bmi, !F && w); break;
    case 'nafld':
      xs.push(inp.age >= 35 && `나이 ${inp.age}세`, w ?? '허리둘레 모름(범위로 계산)', bmi, inp.exercise === false ? '운동 안 함' : inp.exercise == null && '운동 모름',
        inp.dx.dm && '당뇨 진단', inp.dx.chol && '고지혈증 진단', !F && inp.alcohol !== 'none' && `음주 ${ALC_LABEL[inp.alcohol]}`, F && inp.meno === true && '폐경');
      break;
    case 'osteo': xs.push(...(F ? [`나이 ${inp.age}세`, `체중 ${inp.weightKg}kg`] : [`남성·나이 ${inp.age}세`, bmi, w])); break;
    default: return null;
  }
  const s = xs.filter(Boolean) as string[];
  return s.length ? `계산에 반영한 정보: ${s.join(' · ')}` : null;
}

// ── 이번 결과에 반영한 정보 ──
const LAB_NAME: [keyof ReturnType<typeof labOf>, string][] = [['sbp', '혈압'], ['glu', '공복혈당'], ['tc', '총콜레스테롤'], ['tg', '중성지방'], ['hdl', 'HDL'], ['egfr', 'eGFR'], ['upro', '요단백']];
const BP_ANS = { unknown: '모름', normal: '정상', elevated: '주의(120–139/80–89)', high: '140/90 이상' } as const;
export function scopeOf(inp: AppInput) {
  const L = labOf(inp);
  const labs = LAB_NAME.filter(([k]) => L[k] != null).map(([, n]) => n);
  const mods = ([['sleep', '수면'], ['mind', '마음'], ['gerd', '소화'], ['diet', '식생활']] as const).map(([k, n]) => ({ k, name: n, done: !!inp[k] }));
  const dx = ([['htn', '고혈압'], ['dm', '당뇨'], ['chol', '고지혈증']] as const).filter(([k]) => inp.dx[k]).map(([, n]) => n);
  return {
    body: `${inp.age}세 ${inp.sex === 'F' ? '여성' : '남성'} · 키 ${inp.heightCm}cm · 몸무게 ${inp.weightKg}kg · 허리 ${inp.waistCm != null ? inp.waistCm + 'cm' : '모름'}`,
    life: `흡연 ${{ never: '안 피움', past: '예전에 피움', current: '지금 피움' }[inp.smoke]} · 음주 ${ALC_LABEL[inp.alcohol]} · 운동 ${inp.exercise == null ? '모름' : inp.exercise ? '함' : '안 함'} · 가족 당뇨 ${inp.famDM ? '있음' : '없음'} · 혈압 응답 ${L.sbp != null ? `${L.sbp}/${L.dbp}` : BP_ANS[inp.bp]}`,
    dx, labs, mods,
    labLine: labs.length ? `반영한 검진값: ${labs.join(' · ')}` : '반영한 검진값: 없음',
    restLine: labs.length ? '그 밖의 항목은 몸 정보와 답변으로 추정했어요.' : '모든 항목을 몸 정보와 답변으로 추정했어요.',
  };
}

// ── 좋은 습관 (실제 답에 있는 것만) ──
/** [이어 쓰는 꼴, 끝맺는 꼴] */
function habitPairs(inp: AppInput): [string, string][] {
  const b = bmiOf(inp), waistOk = inp.waistCm != null && inp.waistCm < (inp.sex === 'F' ? 85 : 90), g: [string, string][] = [];
  if (inp.smoke === 'never') g.push(['담배를 피우지 않고', '담배를 피우지 않아요']); else if (inp.smoke === 'past') g.push(['담배를 끊었고', '담배를 끊었어요']);
  if (inp.exercise === true) g.push(['꾸준히 운동하고', '꾸준히 운동해요']);
  if (inp.alcohol === 'none') g.push(['술을 마시지 않고', '술을 마시지 않아요']);
  if (b >= 18.5 && b < 25) g.push(inp.waistCm != null && waistOk ? ['체중·허리둘레가 정상 범위이고', '체중·허리둘레가 정상 범위예요'] : ['체중이 정상 범위이고', '체중이 정상 범위예요']);
  return g;
}
export const goodHabits = (inp: AppInput) => habitPairs(inp).map((x) => x[1]);
/** '담배를 피우지 않고, 꾸준히 운동해요.' */
export const habitSentence = (inp: AppInput) => { const g = habitPairs(inp); return g.length ? g.map((x, k) => (k < g.length - 1 ? x[0] : x[1])).join(', ') + '.' : ''; };
/** 넣은 검진값 중 정상 범위인 것만 이름으로 (A버전 '정상' 기준과 같은 구간) */
export function normalLabs(inp: AppInput): string[] {
  const L = labOf(inp), n: string[] = [];
  if (L.sbp != null && L.dbp != null && L.sbp < 120 && L.dbp < 80) n.push('혈압');
  if (L.glu != null && L.glu < 100) n.push('공복혈당');
  if (L.tc != null && L.tc < 200) n.push('총콜레스테롤');
  if (L.tg != null && L.tg < 150) n.push('중성지방');
  if (L.hdl != null && L.hdl >= 40) n.push('HDL');
  if (L.egfr != null && L.egfr >= 60) n.push('eGFR');
  if (L.upro != null && L.upro < 2) n.push('요단백');
  return n;
}
const josa = (w: string, a: string, b: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };

/**
 * B 판정 카드: 단계(tier)·태그·할 일은 verdict() 그대로. ④ '지금처럼 유지'의 제목·설명만
 * 실제 답한 좋은 습관과 실제로 넣은 정상 검진값을 지목하는 문장으로 바꾼다(검진값이 없으면 검진 얘기를 하지 않음).
 */
export function verdictB(inp: AppInput, r: R, sc: Scenario): Verdict {
  const v = verdict(inp, r, sc);
  if (v.tier !== 4) return v;
  const habit = habitSentence(inp), nl = normalLabs(inp);
  const labs = nl.length ? ` 넣은 검진값 중 ${nl.join('·')}${josa(nl[nl.length - 1], '은', '는')} 정상 범위예요.` : '';
  return { ...v, title: '좋은 습관을 잘 이어가고 있어요', sub: `${habit}${labs} 지금처럼 이어가세요.`.trim() };
}
