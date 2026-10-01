# 1mincheck-engine v0.3

1분체크(1mincheck) 계산 엔진입니다. 기획서 `docs/spec.md`(= 1분체크_기획_근거_함수모형.md) §6의 모든 함수를 구현했고, 테스트 20개가 모두 통과한 상태입니다. 앱 코드는 이 폴더를 그대로 가져다 쓰기만 하면 됩니다. **계산 로직과 수치는 수정하지 마세요.**

```
src/prevalence.json   통계·계수 (기획서 §8과 동일, 2023–2025 국민건강영양조사 3년 평균)
src/engine.ts         순수 함수 (의존성 없음, 브라우저·React Native 공용)
test/engine.test.ts   테스트 20개
```

## 테스트 결과

```
cd engine && npx tsx --test test/engine.test.ts   →  pass 20 / fail 0
tsc --strict (engine.ts)             →  오류 0
```

테스트 20개가 확인하는 내용은 다음과 같습니다.

- 기획서 §6의 모든 테스트 벡터 (허용 오차 ±0.1%p)
- 49세 여성 사례
- 12개 칸 보정 검사 (평균 재현)
- 지방간 점수 단조성
- 무작위 입력 5,000건에서 확률이 0~100% 안에 있는지

## 사용법

```ts
import { runAll, whatIf } from './engine/src/engine';

const me = {
  age: 49, sex: 'F', heightCm: 160, weightKg: 62, waistCm: 81.3,
  smoke: 'never', alcohol: 'none', famDM: false,
  dx: { htn: false, dm: false, chol: false }, bp: 'unknown',
  exercise: true, meno: false,
};

runAll(me);                                   // 12개 결과 카드 데이터
whatIf(me, { ...me, waistCm: 76, weightKg: 58 });   // 생활습관 변경 전·후 비교
```

## 결과 카드 필드 (`Result`)

| 필드 | 뜻 |
|---|---|
| `status` | `ok` · `managed`(이미 진단) · `criteria`(측정 혈압 기준 해당) · `na` · `excluded` · `needs_input` |
| `value` / `range` | 확률(%) 또는 점수. 입력이 "모름"이면 `range`로 범위를 줌 |
| `peer`, `ratioLabel` | 동년배 유병률과 비교 라벨 |
| `flags` | 알림 표시 (예: `CRISIS` = PHQ-9 9번 문항 양성, `복부비만`, `주의 혈압`). 화면에서 어떻게 쓸지는 자유 |
