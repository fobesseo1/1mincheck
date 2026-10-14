// 체형 캐릭터 그림 불러오기. 그림과 목록은 public/characters/ 에 있고, 시안 폴더의 tools/build_chars.py 가 채운다.
//   characters.json = { version, size, sets: { m|f: { "50": { prefix, widths, bellyWidths }, "30": … } } }
// 성별 · 나이대 목록은 코드에 두지 않는다 — json 에 있는 세트만 쓴다. 그림이 늘면 폴더와 json 만 바뀐다.
import { useEffect, useState } from 'react';

export interface CharSetInfo { prefix: string; widths: number[]; bellyWidths: number[] }
export interface CharManifest { version: string; size: [number, number]; sets: Record<string, Record<string, CharSetInfo>> }

/** 지금 고른 성별 · 나이대에 쓸 그림 한 세트 (보통 1~5단계 + 배 나온 1~5단계) */
export interface CharSet extends CharSetInfo {
  sex: 'M' | 'F';
  group: number;       // 실제로 쓰는 나이대 (세트가 없으면 가장 가까운 나이대)
  wanted: number;      // 입력 나이로 정한 나이대
  files: string[];     // 보통 그림 5장 주소
  bellyFiles: string[];// 배 나온 그림 5장 주소
  size: [number, number];
}

const DIR = `${import.meta.env.BASE_URL}characters/`;
/** 입력 나이 → 10살 단위 나이대 (20 · 30 · 40 · 50 · 60 = 60대 이상). 그림은 60대까지만 만든다 */
export const ageGroup = (age: number) => Math.min(60, Math.max(20, Math.floor(age / 10) * 10));

let manifest: Promise<CharManifest | null> | null = null;
/** 목록은 한 번만 받는다. 늘 서버에 새로 물어본다(no-cache) — 그림이 늘었는지 알아야 하므로 */
export function loadManifest() {
  manifest ??= fetch(`${DIR}characters.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<CharManifest>) : null))
    .catch(() => null);
  return manifest;
}

export function pickSet(m: CharManifest, sex: 'M' | 'F', age: number): CharSet | null {
  const bySex = m.sets[sex === 'M' ? 'm' : 'f'];
  if (!bySex) return null;
  const wanted = ageGroup(age);
  // 그 나이대 세트가 없으면 같은 성별에서 가장 가까운 나이대 (거리가 같으면 더 높은 나이대). 목록은 json 에 있는 것만
  const have = Object.keys(bySex).map(Number).filter(Number.isFinite);
  if (!have.length) return null;
  const group = have.reduce((best, g) => { const d = Math.abs(g - wanted), e = Math.abs(best - wanted); return d < e || (d === e && g > best) ? g : best; });
  const set = bySex[String(group)];
  if (!set) return null;
  // 주소 뒤 ?v= : 그림이 바뀌면(version 이 바뀌면) 기기에 보관한 옛 그림 대신 새로 받는다
  const url = (name: string) => `${DIR}${name}.webp?v=${encodeURIComponent(m.version)}`;
  const stages = [1, 2, 3, 4, 5];
  return {
    ...set, sex, group, wanted, size: m.size,
    files: stages.map((i) => url(`${set.prefix}-${i}`)),
    bellyFiles: stages.map((i) => url(`${set.prefix}-${i}-belly`)),
  };
}

/** 성별 · 나이에 맞는 세트. 고른 세트의 그림만 미리 받아 둔다(다른 세트는 받지 않는다) */
export function useCharacterSet(sex: 'M' | 'F' | null, age: number | null) {
  const [m, setM] = useState<CharManifest | null>(null);
  useEffect(() => { let live = true; loadManifest().then((x) => live && setM(x)); return () => { live = false; }; }, []);
  const set = m && sex && age != null ? pickSet(m, sex, age) : null;
  const key = set ? set.files[0] : '';
  useEffect(() => {
    if (!set) return;
    for (const src of [...set.files, ...set.bellyFiles]) { const im = new Image(); im.decoding = 'async'; im.src = src; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return set;
}
