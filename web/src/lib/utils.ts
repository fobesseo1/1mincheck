import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** index.css @theme 의 글자 크기 이름을 알려 준다(모르면 text-heading-sm 을 글자 색으로 보고 text-risk 와 합칠 때 지워 버린다) */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['caption', 'body-sm', 'body', 'subheading', 'heading-sm', 'heading', 'heading-lg', 'display'] }] } },
});

/** shadcn 공통: 조건부 클래스 합치기(뒤에 오는 Tailwind 클래스가 이김) */
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
