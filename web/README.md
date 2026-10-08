# 1분체크 웹앱

`docs/spec.md`의 입력(§5)·결과(§7) 화면을 그대로 구현한 모바일 우선 웹앱입니다. 서버가 없고, 모든 계산은 브라우저 안에서 `engine/src/engine.ts`의 `runAll()`·`whatIf()`로 합니다(엔진 코드는 수정하지 않음).

```
npm install          # web 폴더에서
npm run dev          # http://localhost:5173/1mincheck/
npm test             # 화면 값 테스트 (예시 A/B/C가 캔버스 디자인과 같은지)
npm run build        # dist/ 생성 (GitHub Pages 주소 기준 base: /1mincheck/)
node scripts/e2e.mjs # (main 버전) 실제 브라우저 흐름 테스트
node scripts/e2e-v2.mjs # (simple-v2) 개발 서버를 켠 상태에서 v2 전체 흐름 테스트
node scripts/make-og.mjs # 공유 미리보기 이미지 public/og.png 다시 만들기
```

## simple-v2 브랜치 (계획: `docs/plan-2026-10-08-simple.md`)
- 결과는 카드 3장(`screens/Results.tsx`): 지금 내 상태 · 또래 100명 중 나(`lib/peer.ts`) · 이대로면 vs 바꾸면(`lib/lines.ts`, 기준선 방식). 나머지는 `#/all`.
- 검진 풀이 `#/labs`(`screens/Labs.tsx`, 구간 기준 `lib/labZones.ts`).
- 수면·마음·소화·식생활은 `lib/features.ts` 스위치로 숨김(코드 유지).
- 배포: 저장소 루트 `vercel.json`. Vercel 빌드(VERCEL=1)는 주소 기준 `/`·익명 방문 통계 켬, GitHub Pages(main)는 `/1mincheck/` 그대로.

- `src/state.ts` 답변 상태 → 엔진 `Input` 변환, 저장(답하는 중: sessionStorage, 기록: 사용자가 저장할 때만 localStorage)
- `src/lib/view.ts` 화면용 가공 (runAll·whatIf 호출만)
- `src/lib/content.ts` 항목별 설명·다음 할 일·근거 링크
- `src/screens/` 랜딩·온보딩·입력 7개·결과·상세(12항목)·바꿔보기·기록 비교
- `public/sw.js` 오프라인용 서비스 워커, `manifest.webmanifest` 홈 화면 추가
- 개발 모드(`npm run dev`)에서만 화면 왼쪽 아래에 예시 A/B/C 불러오기 버튼이 보입니다(`src/sampleData.ts`).
