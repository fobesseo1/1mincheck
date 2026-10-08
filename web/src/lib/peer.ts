/**
 * '또래 100명 중 나' (v2 결과 2번째 카드). 숫자는 view.ts(runAll·cmpOf)와 engine/src/percentile.ts 그대로.
 * 그림은 같은 성별·나이(±5세) 100명을 위험이 낮은 순서로 세웠을 때 내 자리(백분위 표가 있으면),
 * 없으면 '비슷한 조건 100명 중 몇 명'. 한 단어도 그림과 같은 기준으로 고른다.
 */
import type { Input } from '../../../engine/src/engine.ts';
import { rankOf } from '../../../engine/src/percentile.ts';
import { runAll, byId, cmpOf, groupLabel, f1, pctText, statusNote } from './view.ts';
import type { ItemId } from './content.ts';

export const PEER_IDS: ItemId[] = ['dm', 'htn', 'nafld'];
export const PEER_NAME: Record<string, string> = { dm: '당뇨', htn: '고혈압', nafld: '지방간' };

export type PeerCard =
  | { id: ItemId; name: string; kind: 'rank'; rank: number; word: string; high: boolean; pct: string; peer: string; who: string; group: string }
  | { id: ItemId; name: string; kind: 'count'; n: number; word: string; high: boolean; pct: string; peer: string; who: string; group: string }
  | { id: ItemId; name: string; kind: 'status'; word: string; note: string; group: string };

/** 백분위 → 한 단어: 아래 1/3 낮은 편, 가운데 중간쯤, 위 1/3 높은 편 */
export const rankWord = (rank: number) => (rank <= 33 ? '또래보다 낮은 편' : rank >= 67 ? '또래보다 높은 편' : '또래 중간쯤');
const RATIO_WORD: Record<string, string> = { 낮음: '또래보다 낮은 편', 비슷: '또래와 비슷', 높음: '또래보다 높은 편', '매우 높음': '또래보다 높은 편' };
const STATUS_WORD: Record<string, string> = { managed: '진단받아 관리 중', criteria: '검진 수치가 기준 이상', measured: '검진 수치로 확인', excluded: '간 수치 검사로 확인해요', na: '대상 아님', needs_input: '답하면 볼 수 있어요' };

export function peerCards(inp: Input): PeerCard[] {
  const R = byId(runAll(inp)), group = groupLabel(inp);
  return PEER_IDS.map((id): PeerCard => {
    const r = R[id], name = PEER_NAME[id], c = cmpOf(id, r, inp);
    if (r.status === 'ok' && r.value != null && c) {
      const rank = rankOf(id, inp.sex, inp.age, r.value), base = { id, name, high: c.high, pct: pctText(r.value), peer: `${id === 'dm' ? '약 ' : ''}${f1(c.peer)}`, who: c.who, group };
      return rank != null ? { ...base, kind: 'rank', rank, word: rankWord(rank) } : { ...base, kind: 'count', n: Math.round(r.value), word: RATIO_WORD[c.label] ?? '또래와 비슷' };
    }
    if (r.status === 'ok' && r.range)
      return { id, name, kind: 'status', word: `비슷한 조건 100명 중 약 ${Math.round(r.range[0])}–${Math.round(r.range[1])}명`, note: '허리둘레 등을 몰라 범위로 보여드려요. 넣으면 또래 중 내 자리를 볼 수 있어요.', group };
    return { id, name, kind: 'status', word: STATUS_WORD[r.status] ?? '–', note: statusNote(id, r, inp), group };
  });
}
