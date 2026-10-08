// 화면에서 켜고 끄는 분야 (v2 심플). 코드와 저장된 답은 그대로 두고 보이지만 않게 한다.
// 다시 켜려면 true 로 바꾸면 입력 흐름·결과·상세·기록에 함께 돌아온다.
import type { ItemId } from './content.ts';

export type ModKey = 'sleep' | 'mind' | 'gerd' | 'diet';
export const MODULES_ON: Record<ModKey, boolean> = { sleep: false, mind: false, gerd: false, diet: false };
export const modOn = (k: ModKey) => MODULES_ON[k];
export const anyModOn = () => (Object.keys(MODULES_ON) as ModKey[]).some(modOn);

/** 분야별 항목 (content.ts MODULE_OF 와 같다) */
const MOD_ITEMS: Record<ModKey, ItemId[]> = { sleep: ['osa', 'isi'], mind: ['dep', 'gad'], gerd: ['gerd'], diet: ['diet'] };
/** 지금 숨긴 항목 */
export const HIDDEN: ItemId[] = (Object.keys(MOD_ITEMS) as ModKey[]).filter((k) => !modOn(k)).flatMap((k) => MOD_ITEMS[k]);
export const shown = (id: string) => !HIDDEN.includes(id as ItemId);
