// 하나만 고르는 칸 (성별 · 네/아니요 · 혈압 등)을 화면 읽기 프로그램과 키보드로도 고를 수 있게 (출시 전 수정 B6)
// 칸 묶음은 role="radiogroup", 칸은 role="radio" + aria-checked. 여러 개 고르는 칸(진단받은 질환)은 checkbox 로 따로.
import type { KeyboardEvent } from 'react';

/** 화살표 키: 옆 칸을 고르고 초점도 옮긴다 (맨 끝에서는 반대쪽 끝으로) */
export function onRadioKeys<T>(e: KeyboardEvent<HTMLElement>, values: T[], value: T | null | undefined, pick: (v: T) => void) {
  const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
  if (!step) return;
  e.preventDefault();
  const i = values.indexOf(value as T), n = i < 0 ? (step > 0 ? 0 : values.length - 1) : (i + step + values.length) % values.length;
  pick(values[n]);
  e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[n]?.focus();
}
/** 탭 키로 묶음에 들어오면 고른 칸(없으면 첫 칸)에 초점 */
export const radioTab = (on: boolean, i: number, anyOn: boolean) => (on || (!anyOn && i === 0) ? 0 : -1);
