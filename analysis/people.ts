/**
 * 원시자료 읽기 (개인 단위 자료를 파일로 남기지 않는다). analysis/extract.py 를 하위 프로세스로 실행하고
 * 표준출력 파이프로만 받아 메모리에서 쓴다. 파이썬 경로·패키지 위치는 환경변수 PYTHON, PYTHONPATH 로 지정.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Input } from '../engine/src/engine.ts';

export type Person = { year: number; w: number; psu: string; strata: string; inp: Input; out: Record<string, number>; lab: Record<string, number> };

export function loadPeople(mode: 'checked' | 'legacy' = 'checked'): Person[] {
  const script = fileURLToPath(new URL('./extract.py', import.meta.url));
  const r = spawnSync(process.env.PYTHON ?? 'python', ['-X', 'utf8', script, '--pipe', mode], { encoding: 'utf8', maxBuffer: 1 << 30, env: process.env });
  if (r.status !== 0) throw new Error('원시자료 읽기 실패 (개인 정보는 출력하지 않음): exit ' + r.status);
  return r.stdout.trim().split('\n').map((l) => JSON.parse(l));
}
