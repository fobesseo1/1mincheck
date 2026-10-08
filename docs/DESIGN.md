# 1분체크 디자인 기준 (Jeton 스타일, 2026-10-08)

근거: Jeton 스타일 레퍼런스(`DESIGNstyle-jeton.md`, jeton.com). 바뀐 점은 **글꼴만** — Sequel Sans 대신 **프리텐다드**, 자간 **-0.5%(-0.005em)** 전체 통일.
코드: 토큰은 `web/src/index.css`(Tailwind v4 `@theme`), 부품은 `web/src/components/ui/`(shadcn), 아이콘은 **lucide-react만**. 이모지·글자 기호(▶ ✕ ← → 등) 아이콘 대용 금지.

## 분위기
흰 바탕 위 잡지 같은 편집 디자인. 넓은 여백, 크고 촘촘한 제목, 한 가지 따뜻한 주황(#f73b20)이 유일한 브랜드 목소리. 무거운 그림자·테두리 없이 여백과 둥근 카드로 나눈다.

## 색
| 이름 | 값 | Tailwind | 쓰임 |
|---|---|---|---|
| Signal Orange | #f73b20 | `brand` | 로고, 주 버튼, 강조 글자·아이콘, 링크 |
| Orange Tint | #f84d35 | `brand-tint` | 눌림·작은 표시 |
| Ink Roast | #360802 | `ink` | 본문·제목 글자 (검정 대신) |
| Ink 70% | #6b4a45 | `ink-soft` | 보조 글자 |
| Ash Grey | #ababab | `ash` | 비활성·자리표시 |
| Sand Wash | #e7dcdb | `sand` | 구분선·막대 바탕 |
| Linen Blush | #fdedea | `blush` | 따뜻한 카드·입력 바탕 |
| Brand 5% | rgba(247,59,32,.05) | `brand/5` | 강조 카드·입력 바탕 |
| Citrus Wash | #f5ffbb | `citrus` | 하이라이트 띠 |
| Mint Wash | #bcffbb | `mint` | 좋음 하이라이트 |

### 상태 색 (Jeton 보조색으로)
| 상태 | 글자·점 | 바탕 | 뜻 |
|---|---|---|---|
| 좋음 `good` | Emerald #34c771 (글자는 #1e8a4c) | #e3f8ea | 정상·기준 아래·내려감 |
| 참고 `info` | Cobalt #477ee9 | #e8effc | 저체중·참고 |
| 주의 `warn` | #b7791f | #fdf3d8 | 경계·전단계 |
| 위험 `risk` | Coral Red #fb2d54 (글자 #d81e44) | #ffe8ed | 기준 이상·병원 확인·지금 바로 |
브랜드 주황은 상태를 뜻하지 않는다(버튼·강조 전용). 위험은 분홍빛 Coral Red로 브랜드 주황과 구분.

## 글자 (프리텐다드, 자간 -0.005em 전체)
| 역할 | 크기 / 줄간격 | 굵기 |
|---|---|---|
| display (랜딩 첫 제목) | 56–106px / 0.95 | 500 |
| heading-lg | 44–72px / 1.0 | 500 |
| heading | 33px / 1.1 | 500 |
| subheading (앱 화면 제목·카드 결론) | 23–28px / 1.2 | 500 |
| body | 16px / 1.5 | 400 |
| body-sm | 14px / 1.45 | 400 |
| caption | 12px / 1.5 | 450 |
굵기는 400·450·500만. 위계는 크기와 줄간격으로. 한 줄 안 강조는 주황 글자 또는 500.

## 모양
- 카드·입력 모서리 16px, 버튼 12px, 태그·토글 9999px, 상단 메뉴 84px.
- 그림자 두 가지만: 카드 `0 -4px 16px rgba(0,0,0,.05)`(아래에서 받쳐 올림), 떠 있는 패널 `0 8px 24px rgba(247,59,32,.10), 0 2px 8px rgba(247,59,32,.05)`.
- 간격 4px 단위, 카드 안쪽 16–24px, 섹션 사이 80px(모바일 48px), 최대 폭 1200px(앱 화면 440px).

## 부품 (shadcn)
Button(주: 주황 바탕 흰 글자 / 보조: 주황 글자 테두리 / 고스트), Card, Slider(몸무게·허리), Progress·구간 막대(기준선·검진 구간), Tabs(또래 항목), Accordion(자주 묻는 질문·접기), Dialog(영상), Badge(태그).

## 하지 말 것
- 이모지, 글자 기호 아이콘, 600 이상 굵기, 글자·버튼 그림자, 검정(#000) 본문, 0px 모서리.
- 한 카드 안에 여러 강조색 섞기(주황 제목이면 아이콘·본문은 잉크색).
