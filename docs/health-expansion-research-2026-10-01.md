# 입력을 늘리지 않는 건강 체크 확장 조사

조사일: 2026-10-01 (한국 시간). 대상: 현재 저장소의 코드와 공개 논문·학회 진료지침·공공 의료자료. 이번 작업은 조사이며 실행 코드와 입력 화면은 변경하지 않았다.

## 1. 결론

현재 입력으로 건강 체크 범위를 넓힐 수 있다. 가장 근거가 명확한 확장은 **허리/키 비율, 저체중에 따른 영양 평가 안내, 전당뇨·당뇨 검사 안내, 만성콩팥병 검사 안내, 간 섬유화 평가 안내, 연령·성별에 따른 암검진 안내, 당뇨 합병증 관리 안내**다.

반면 질병별 개인 확률을 많이 추가하는 데에는 한계가 있다. 위험요인이 있다는 사실과 그 사람이 질병을 가졌을 확률은 다르다. 따라서 아래 세 가지 출력을 구분해야 한다.

1. **직접 지표/검증 척도:** 입력과 도구가 정확히 맞는 계산값·점수.
2. **검사·진료 안내:** 진료지침에 근거한 조건부 안내. 질병 양성이나 개인 확률로 표현하지 않는다.
3. **관련 위험요인 정보:** 생활습관과 질환의 연관성. 미측정 증상을 있다고 가정하지 않는다.

이 문서의 '우선'은 제품 적용 우선순위이며, 학회가 정한 근거 등급이 아니다. 각 출처의 실제 권고 수준과 한국인 적용 한계는 별도로 설명한다. 새로운 카드는 의학적 검토와 원문 규칙 확인을 거쳐 적용한다.

## 2. 코드에서 실제로 확보되는 정보

검토 파일: `engine/src/engine.ts`, `engine/src/prevalence.json`, `web/src/state.ts`, `web/src/screens/Inputs.tsx`, `web/src/lib/content.ts`, `docs/spec.md`.

| 구분 | 현재 입력 | 재사용할 때 주의점 |
|---|---|---|
| 신체 | 나이 19–100세, 성별, 키, 체중, 허리둘레/모름 | 임신, 부종, 근육량, 체중감소의 의도는 알 수 없음 |
| 생활 | 현재/과거/비흡연, 음주 빈도와 회당 소주·맥주·와인 양, 운동 여부 | 갑년·금연 시점 없음. 운동은 주 2회·30분 여부여서 총량·강도와 다름 |
| 병력 | 당뇨 가족력, 고혈압·당뇨·고콜레스테롤 진단 여부, 폐경 | 약물·진단 시점·합병증·골절·다른 가족력 없음 |
| 혈압 | unknown / normal / elevated / high | 수축기·이완기 수치 없음. elevated는 120–139 **또는** 80–89로 넓음 |
| 수면 선택 | 코골이, 피로/졸림, 목격 무호흡, 목둘레 >40, 불면 게이트와 ISI | 모름을 아니요로 답하게 하는 문구가 있어 실제 음성과 구별 안 됨 |
| 마음 선택 | PHQ-2 또는 PHQ-9, GAD-2 | PHQ-9는 분기 이후 전부 답한 경우만 확보됨 |
| 소화 선택 | 최근 역류 게이트, 지난 7일 GerdQ 6문항 | 수년간 지속 여부, 연하곤란, 출혈, 체중감소 없음 |
| 식생활 선택 | 아침·잡곡·과일·채소·유제품·짠 음식·가당음료 빈도 | 섭취량·영양소·총열량·단백질을 계산할 수 없음 |

현재 `runAll()`은 당뇨, 고혈압, 고콜레스테롤, 비만, 지방간, 수면무호흡, 불면, 우울, 불안, 골다공증, 역류, 식생활의 12개 결과를 만든다. 선택 모듈 미응답은 새 체크에서도 결측으로 유지해야 한다.

**새 질문 없이 되살릴 수 있는 데이터:** `Draft.alcFreq`, `Draft.alcAmt`는 `toInput()`에서 하루 평균 4범주로 축약된다. 빈도와 회당 섭취량을 보존하면 폭음 관련 상담을 개선할 수 있다. 다만 현재 잔 정의는 술 종류마다 순수 알코올량이 같지 않고, 도수·와인 용량도 고정되어 있지 않다. 국제 기준의 g/day 또는 AUDIT-C 점수를 정확히 계산할 수 있는 입력은 아니다. 과거 기록을 `fromInput()`으로 읽으면 음주 빈도·양이 대표값으로 복원되므로 원응답으로 취급하면 안 된다.

## 3. 바로 검토할 가치가 큰 확장 후보

| 후보 | 재사용 입력 | 가능한 결과와 다음 행동 | 근거·제약 |
|---|---|---|---|
| 허리/키 비율(WHtR) | 허리, 키, BMI | 복부지방 분포 지표와 건강 위험 안내 | NICE NG246: BMI <35 성인에서 BMI와 함께 사용. 0.5–0.59 증가, ≥0.6 더 증가. 질병 확률 아님 [S01] |
| 정상 BMI라도 복부지방 증가 | BMI + WHtR/한국 허리 기준 | “체중이 정상 범위여도 복부지방을 확인하세요” | 기존 비만 카드에 통합. 별도 질환으로 중복 계산하지 않음 [S01, S02] |
| 저체중·영양 평가 | BMI | BMI <18.5이면 식사·영양 상태 상담 안내 | NICE CG32의 영양지원 고려 조건. 영양결핍 종류나 근감소증 확진 아님 [S03] |
| 전당뇨 포함 혈당검사 필요성 | 나이, BMI, 허리, 가족력, 고혈압, 기존 당뇨 | 공복혈당·HbA1c 검사 안내 | 한국 KDA 2025: 35세 이상 전체, 위험인자 있는 19세 이상. 전당뇨 개인 확률은 없음 [S04] |
| 만성콩팥병 검사 필요성 | 기존 당뇨·고혈압 | eGFR와 소변 ACR 확인 안내 | KDIGO 2024와 NIDDK. 확률·병기·신부전 예측은 불가 [S05, S06] |
| 간 섬유화 평가 필요성 | 당뇨, 비만/복부비만, 다른 대사 위험 | 간질환 위험을 진료에서 평가하도록 안내 | EASL–EASD–EASO 2024. FIB-4에 필요한 AST·ALT·혈소판 없음 [S07] |
| 골밀도 검사 상담 보강 | 나이, 성별, 폐경, 체중, 흡연 | 65세 이상 여성, 그 미만 폐경 여성의 위험 평가 안내 | USPSTF 2025. 남성 선별 근거는 불충분. 미국 지침이며 한국 보험 대상과 구분 [S08] |
| 복부대동맥류 검사 상담 | 남성, 65–75세, 과거/현재 흡연 | 1회 초음파에 관해 의료진 상담 | USPSTF B 권고. ever smoker의 통상 정의는 평생 100개비 이상; 현 입력으로 확정 불가. 한국 검진 정책 아님 [S09] |
| 위암 검진 연령 안내 | 나이 | 40세 이상: 국가검진 위내시경 주기 안내 | 현재 검진 완료·당해연도 대상·증상은 모름 [S10] |
| 대장암 검진 연령 안내 | 나이 | 50세 이상: 연 1회 분변잠혈검사 안내 | 질병 확률이 아니라 검진 정보 [S10] |
| 유방암 검진 연령 안내 | 나이, 여성 | 40세 이상: 2년마다 유방촬영 안내 | 가족력·이전 암·검사 이력 없음 [S10] |
| 자궁경부암 검진 연령 안내 | 나이, 여성 | 20세 이상: 2년마다 세포검사 안내 | 수술·장기 유무·개인 상황을 모름; 대상 확정 문구 금지 [S10] |
| 당뇨성 안질환 관리 안내 | 기존 당뇨 | 정기 안과검진 안내 | NIDDK: 대부분 당뇨 환자에서 연 1회 종합 안과검진. 개인 일정은 진료에 따름 [S11] |

권장 사용자 문구 예시:

- 콩팥: “당뇨나 고혈압이 있으면 콩팥 상태를 확인하는 검사가 중요해요. 혈액검사의 eGFR와 소변 알부민 검사를 진료 때 확인해 보세요.”
- 전당뇨: “현재 입력만으로 전당뇨 여부는 알 수 없어요. 나이와 위험요인을 보면 혈당검사를 확인할 이유가 있어요.”
- 간: “당뇨·복부비만 등은 간질환 평가에 참고하는 위험요인이에요. 지방간뿐 아니라 간 섬유화 평가가 필요한지 상담해 보세요.”

검사 안내가 안 뜨는 사람에게 “콩팥 정상”, “전당뇨 없음”, “간 섬유화 없음”으로 표시하면 안 된다.

## 4. 넓게 조사했지만 정보·상담 수준으로 제한할 후보

| 질환/건강문제 | 현재 입력에서 관련되는 정보 | 적절한 활용 | 제한과 출처 |
|---|---|---|---|
| 관상동맥질환·심근경색·뇌졸중 | 나이, 성별, 흡연, BMI, 당뇨·고혈압 | 심혈관 위험요인 요약, 혈압·지질 관리 안내 | WHO 비혈액 모델도 수축기혈압 필요. 정확한 10년 확률 추가 보류 [S12] |
| 대사증후군 | 복부비만, 당뇨, 고혈압 | 확인된 요소와 필요한 검사를 설명 | TG·HDL·공복혈당 없음. dx.chol은 TG/HDL 이상이 아님. elevated로 130/85 기준 판정 불가 [S13] |
| 심방세동 | 비만, 음주, 흡연, 고혈압 | 관련 생활습관 정보 | 맥박·심전도·부정맥 병력 없음. 진단·확률·CHA2DS2-VASc 계산 금지 [S14] |
| 비만 저환기 증후군 | 비만 + 수면호흡 관련 응답 | 고도비만과 호흡 문제가 겹칠 때 의료진 평가 고려 | 깨어 있을 때 CO2 등 필요. 비만+졸림만으로 OHS 고위험 점수를 만들지 않음 [S15] |
| 무릎 골관절염 | 체중, BMI | 체중과 관절 부담의 관계 안내 | 관절통·기능제한·외상 없음; 선별검사 아님 [S16] |
| 담석·담낭질환 | BMI | 관련 위험요인 설명 | 복통 위치·기간·발열·초음파 없음. 무증상에게 일괄 초음파 권고하지 않음 [S16] |
| 통풍·고요산혈증 | 비만, 음주 | 체중·음주 관련 정보 | 관절 증상·요산 없음; 무증상 요산검사를 자동 권고하지 않음 [S17] |
| 알코올 관련 건강 손상 | 음주 빈도·회당 양 | 과음/회당 다량 섭취 상담 | 의존·통제상실 질문 없음. 알코올사용장애 확률이나 AUDIT-C라고 표시 불가 [S18] |
| 흡연 관련 암 | 현재/과거 흡연 | 금연과 관련 암 예방 정보 | 폐·구강·후두·식도·방광 등과 인과 근거. 노출량·기간 없으므로 개별 암 확률 불가 [S19] |
| 음주 관련 암 | 음주 | 음주량 감소의 예방 의미 | 구강·인두·후두·식도·간·대장직장·유방암 관련 정보. 개인 확률로 전환 불가 [S18] |
| 비만 관련 암 | BMI, 여성 폐경 | 체중관리의 장기 건강 의미 | NCI의 관련 암군 정보. 암 13개 카드를 모두 경고로 띄우는 방식은 권하지 않음 [S20] |
| 바렛식도 | 역류, 나이, 남성, 비만, 흡연 | 장기 역류 평가에 대한 일반 정보 | ACG는 만성 GERD+추가 위험인자 조건. 현재 7일 설문으로 만성 여부를 확인 못 함; 조건부 권고·근거 매우 낮음 [S21] |
| 신체활동 관련 건강 | 운동, 선택적 기분·수면 | 운동 목표의 교육 정보 | 주 2회·30분은 WHO 총량 충족 여부가 아님. '네'를 충분한 운동으로 판정 금지 [S22] |

이 목록은 관련 질환을 넓게 찾은 결과다. 각 질환을 현 입력으로 선별할 수 있다는 뜻은 아니다. BMI 하나로 여러 질환을 '고위험' 처리하면 사용자는 동일한 위험요인을 독립된 여러 이상소견으로 오해할 수 있다.

## 5. 기존 입력을 활용하는 새 모형 후보

### 5.1 한국 일반인 수정 STOP-Bang

2021년 논문 *Evaluation of a Modified STOP-BANG Questionnaire for Sleep Apnea in Adults from the Korean General Population*은 현재 질문과 상당 부분 겹친다. BMI, 나이, 성별, 당뇨, 허리, 코골이·무호흡·고혈압 변수를 재사용할 가능성이 있다. 새 질문 없이 기존 수면 카드의 한국인 적합성을 개선할 후보다. [원문 PDF S23](https://www.sleepmedres.org/upload/pdf/smr-2020-00808.pdf)

이번 조사에서는 출판사 HTML/PDF 직접 접근이 403으로 막혔다. 검색 색인에서 연구와 변수 목록을 확인했지만 **원문 점수표·연령 배점·절단값·검증 설계는 검증하지 못했다**. 기존 명세의 민감도 79.1%와 66.0%를 새로운 확인 수치로 인용하지 않는다. 원문 확보 전 구현 보류.

### 5.2 한국인 10년 당뇨 발생 예측

*Development of a clinical risk score for incident diabetes: A 10-year prospective cohort study* (2021, PMID 32750227)는 비혈액 임상정보 기반 KDR와 10년 위험표를 제시한다. 현 입력으로 가능한지 확인할 가치가 있다. 다만 이번에는 원문 본문 접근이 CAPTCHA로 막혀 **전체 변수 정의·점수표·기저위험·검증 성능을 확보하지 못했다**. 검색 색인만으로 함수를 작성하지 않는다. [S24](https://pmc.ncbi.nlm.nih.gov/articles/PMC8015827/)

현재 엔진의 한국 당뇨 점수는 '지금 진단되지 않은 당뇨' 선별용이다. 이를 미래 발생 확률로 이름만 바꾸면 안 된다. 한국 외부검증 연구에서도 현재 당뇨 선별과 미래 당뇨 예측 성능이 달랐다. [S25](https://pmc.ncbi.nlm.nih.gov/articles/PMC4877115/)

### 5.3 WHO 비혈액 심혈관 모형

WHO 2019 모델은 나이·성별·현재흡연·BMI·수축기혈압을 활용한다. 혈액검사 없이 가능하지만 **현재 앱에는 수축기혈압 수치가 없다**. [공식 차트 S12](https://www.who.int/docs/default-source/ncds/cvd-risk-non-laboratory-based-charts.pdf)

혈압 범주마다 115/130/150 같은 대표값을 넣는 것은 원모형과 다른 추정이다. elevated는 이완기만 높아도 선택 가능하고, high는 상한이 없다. 범주별 확률 범위도 실제 측정 범위나 검증된 개인 신뢰구간으로 표현할 수 없다. 현재 조건에서는 위험요인 설명을 제공하고 10년 확률 구현을 보류한다.

## 6. 추가 보류/제외 항목

| 후보 | 현재 정보가 부족한 핵심 이유 |
|---|---|
| 근감소증·노쇠 | 악력, 보행속도, 의자 일어나기, 낙상 등 없음. BMI/피로만으로 대체 불가 |
| 과민성장증후군 | 복통·배변 관련성·변 형태·기간 없음. GerdQ는 상부소화기 도구 |
| 기능성 소화불량 | GerdQ의 명치통증·메스꺼움만으로 기간·식후포만감·조기포만감 조건 충족 못 함 |
| 빈혈·철결핍·갑상선질환 | 피로는 비특이적. 혈액검사와 병력 없이 위험점수 구성 보류 |
| 치매·인지저하 | 기억·일상 기능 평가 없음. 나이만으로 개인 위험 확률 제공 보류 |
| PCOS | 월경·고안드로겐 증상·초음파 정보 없음 |
| 우울 이외의 정신질환 | PHQ/GAD로 조울증·ADHD·공황·PTSD 등을 구별할 수 없음 |
| COPD | 호흡 증상·폐기능·노출량 없음. USPSTF는 무증상 성인 선별을 권하지 않음 [S26] |
| 국가 폐암검진 대상 확정 | 54–74세와 흡연 여부는 알지만 30갑년·금연 경과 정보 부족 [S10] |
| 국가 간암검진 대상 확정 | 간염·간경변 병력 없음. 비만·음주만으로 대상이라고 표시 불가 [S10] |
| FRAX 골절 확률 | 골절·부모 고관절골절·스테로이드·류마티스 등 미입력. 빈값을 '없음'으로 채워 계산 금지 |
| FIB-4, FLI, HSI, KFRE | 필요한 간효소·혈소판·GGT·TG·eGFR·ACR 등 없음 |

미평가 항목은 '확인 못 함'이지 '낮은 위험'이 아니다.

## 7. 코드 검토에서 발견한 기존 계산 보완점

### 7.1 지방간 모델의 음주 제외 기준 — 우선 점검

`nafld()`는 `alcohol === 'd5'`만 제외한다. 원 논문은 남성 >140g/week, 여성 >70g/week 음주자를 제외했다. 따라서 현 입력에서 하루 1–4.9잔 범주 전체를 모델 적용 대상으로 취급하면 원 연구 대상과 어긋날 수 있다. 술 종류별 잔을 동일 알코올량으로 보는 현 환산도 함께 점검해야 한다. [원 논문 Methods S27](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0107584)

또한 원 논문의 dyslipidemia와 앱의 '고콜레스테롤 진단' 범위가 같은지 확인해야 한다. 기존 NAFLD 모델을 최신 MASLD/MASH 또는 간 섬유화 모델로 이름만 바꾸지 않는다. 여기서 계산하는 지방간 추정값은 간경변·간암 확률이 아니다.

### 7.2 우울 확률의 목표 질환 불일치

`depression()`은 PHQ-9 ≥10 유병률을 사전확률로 사용하고 PHQ 도구의 우도비로 베이즈 갱신한다. 면담으로 진단한 주요우울장애와 PHQ ≥10은 다른 표적이다. 특히 PHQ-9 응답으로 같은 PHQ ≥10 결과를 이미 알 수 있는 상황에서 '그 점수에 해당할 확률'을 다시 추정하는 것은 부적절하다.

우선 점수·증상 정도·선별 결과를 보여주고, 개인 확률은 면담 진단에 대한 사전확률·검증 성능·분기 방식이 맞는지 확인 후 재설계하는 편이 타당하다. 최신 개별참여자 메타분석은 PHQ-9 ≥10의 면담 기준 민감도와 특이도를 각각 0.85로 보고한다. 기존 고정 LR의 유일한 근거로 한 연구만 쓰기보다 검증 환경을 확인해야 한다. [S28](https://pubmed.ncbi.nlm.nih.gov/34610915/)

### 7.3 유병률 보정과 개인 검증을 구별

고혈압·콜레스테롤은 성별·연령 유병률에 비만 계수를 적용한 자체 모형이다. 집단 평균을 재현하는 것은 개인 확률의 정확성을 입증하지 않는다. 특히 진단자를 '관리 중'으로 제외하고도 전체 인구 유병률에 보정된 값으로 미진단자 확률을 제공하면 적용 집단이 달라진다. 독립 자료의 calibration과 판별력 검증이 필요하다.

`prevalence.json`의 `verified: true`는 코드상의 표시이지 검증 보고서가 아니다. 2023–2025 단순평균도 조사 가중치·표준오차를 반영한 통계적 pooled estimate와 구분해야 한다. 질병관리청 2025 결과의 공개 사실은 확인했으나 이번 조사에서 모든 표 수치를 재대조하지 않았다. 상세 통계보고서·원시자료는 2026년 12월 공개 예정이라고 안내되어 있다. [S29](https://www.kdca.go.kr/bbs/kdca/42/310041/download.do), [공식 발표 페이지](https://www.kdca.go.kr/kdca/2848/subview.do%3Bjsessionid%3DBeKhaQnkLwtVeyaaKDpimlC9OD9NPb3_tImcX-5u.kdca_10?enc=Zm5jdDF8QEB8JTJGYmJzJTJGa2RjYSUyRjQyJTJGMzEyNzkxJTJGYXJ0Y2xWaWV3LmRvJTNG)

### 7.4 what-if를 치료 효과로 해석하지 않기

단면 OR나 관찰 코호트 HR을 입력 변화에 적용한 값은 금연·감량 직후의 치료 효과가 아니다. `gerdRelativeChange()`의 관찰 OR 곱, 고혈압의 기존 모형+다른 연구의 연속 HR, 단면 당뇨 선별모형에 대한 가상 변경은 그 한계를 표시해야 한다. 모형 출력 변화와 실제 개인 발병 감소율을 구별한다.

### 7.5 불면·수면무호흡과 골다공증 대상

불면 게이트 음성에서 ISI=0으로 처리하는 것은 실제 7문항 점수 0을 측정한 것과 다르다. 수면 질문의 '모르면 아니요'도 낮은 점수의 안심 의미를 약화시킨다. 새 질문 없이도 '미확인'을 보존하는 데이터 처리를 검토할 수 있다.

OSTA 여성 모델은 폐경 여부와 연구 적용 대상을 검토해야 한다. 현재 `osteoporosis()`는 입력받은 `meno`를 사용하지 않는다. 남성에서 유병률만 표시하는 값을 개인화된 OSTA 확률로 설명하지 않아야 한다.

## 8. 적용 순서와 구현 설계 제안

**1단계:** 지방간 음주 적용 범위, 우울 확률 표적, 모름 처리, 유병률/개인 확률 설명을 먼저 정리한다.

**2단계:** 기존 비만 카드에 WHtR·저체중 안내를 추가하고, 별도 검사 안내 영역에 혈당·콩팥·간 섬유화·골밀도·암검진·당뇨 안과검진을 제공한다. 추가 질문 0개. 복부대동맥류는 한국 적용성과 흡연 정의 차이를 명시한 상담 안내로 후순위 검토한다.

**3단계:** 흡연·음주·비만 관련 질환 정보는 생활습관 영역에서 묶어 설명한다. 개인에게 수십 개의 질환 경고를 나열하지 않는다. 수정 STOP-Bang/KDR는 원문 점수표와 검증 성능 확보 후 도입을 판단한다.

권장 데이터 계약:

```ts
type CheckKind = 'measurement' | 'screening' | 'care_advice' | 'risk_factor_info';
interface AdditionalCheck {
  id: string;
  kind: CheckKind;
  status: 'shown' | 'unknown' | 'not_applicable';
  usedInputs: string[];
  missingInputs: string[];
  message: string;
  action?: string;
  sourceIds: string[];
  applicabilityNote?: string;
  // 질병 확률은 검증된 모형을 별도로 승인한 경우에만 추가
}
```

`Result`의 `%`/`score` 타입에 모든 안내를 억지로 넣기보다 별도 배열을 둔다. `web/src/lib/content.ts`의 `ItemId`, `ORDER`, `PROB_IDS`, `SCORE_IDS`는 12개에 고정되어 있어 실제 구현 시 해당 렌더링 경로도 조정해야 한다.

검증에서 중요한 사례: 허리 모름, 수면 모듈 미선택, PHQ-2만 응답, 폐경 모름, 과거 기록의 음주 대표값, BMI 정상+복부지방 증가, 당뇨 진단자, 여성 음주 제외 경계, 혈압 elevated의 수축기/이완기 모호성. 정량모형은 독립 한국인 데이터의 calibration·AUC·민감도/특이도·나이/성별 성능·결측 처리를 확인한다. 수학적 경계 테스트만 통과해도 의학적으로 검증되었다고 표시하지 않는다.

## 9. 근거 자료 목록과 확인 수준

'원문'은 이번 조사에서 본문 또는 공식 지침 내용을 확인했다는 뜻이고, 해당 자료의 모든 표·수치를 대조했다는 뜻은 아니다. 검색 색인 확인만 가능한 자료는 별도 표시했다. 아래는 체계적 문헌고찰이 아닌 코드 입력 조건에 맞춘 광범위 탐색이다.

| ID | 자료 | 용도 / 확인 수준 |
|---|---|---|
| S01 | [NICE NG246: central adiposity](https://www.nice.org.uk/guidance/ng246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity) | WHtR 기준. 공식 검색 색인 확인, 직접 페이지 403 |
| S02 | [NIDDK: Health tips for adults](https://www.niddk.nih.gov/health-information/weight-management/healthy-eating-physical-activity-for-life/health-tips-for-adults) | 정상 체중에서도 복부지방의 의미. 공식 색인 |
| S03 | [NICE CG32](https://www.nice.org.uk/guidance/cg32/chapter/Recommendations) | 저체중·영양지원 고려 조건. 공식 색인 |
| S04 | [KDA 2025 진료지침](https://diabetes.or.kr/bbs/download.php?code=guide&number=1596) | 한국 혈당검사 대상. 공식 PDF 색인; [학회 게시글](https://diabetes.or.kr/bbs/?code=guide&mode=view&number=2078&page=1) |
| S05 | [KDIGO 2024: evaluation takeaways](https://kdigo.org/wp-content/uploads/2024/07/07232024-KDIGO-CKD.pdf) | 콩팥 검사·평가. 공식 PDF 원문 |
| S06 | [NIDDK: Evaluate CKD](https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/kidney-disease/identify-manage-patients/evaluate-ckd) | 당뇨·고혈압과 CKD. 공식 색인 |
| S07 | [EASL–EASD–EASO 2024 MASLD executive summary](https://pmc.ncbi.nlm.nih.gov/articles/11519095/) | 간 섬유화 case finding. 논문 색인 |
| S08 | [USPSTF osteoporosis 2025](https://www.uspreventiveservicestaskforce.org/uspstf/index.php/recommendation/osteoporosis-screening) | 골밀도 선별 대상. 공식 내용 확인 |
| S09 | [USPSTF AAA screening](https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/abdominal-aortic-aneurysm-screening) | 남성 65–75세 흡연력. 공식 내용 확인 |
| S10 | [국립암센터 국가암검진](https://www1.ncc.re.kr/main.ncc?uri=manage01_4) | 검진 연령·주기·제약. 공식 원문 표 확인 |
| S11 | [NIDDK diabetic eye disease](https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/diabetic-eye-disease) | 당뇨 안과 관리. 공식 색인 |
| S12 | [WHO 2019 non-laboratory charts](https://www.who.int/docs/default-source/ncds/cvd-risk-non-laboratory-based-charts.pdf) / [모형 논문](https://pmc.ncbi.nlm.nih.gov/articles/PMC7025029/) | 심혈관 모델 필수 변수. 공식 PDF 원문·논문 색인 |
| S13 | [NHLBI metabolic syndrome diagnosis](https://www.nhlbi.nih.gov/health/metabolic-syndrome/diagnosis) | TG/HDL/혈압/혈당 판정. 공식 원문 |
| S14 | [ACC/AHA/ACCP/HRS AF guideline 2023](https://www.ahajournals.org/doi/10.1161/CIR.0000000000001193) | 심방세동 위험요인 관리. 학회 지침 색인 |
| S15 | [ATS OHS guideline 2019](https://pmc.ncbi.nlm.nih.gov/articles/6680300/) | 저환기 검사와 한계. 지침 색인 |
| S16 | [NIDDK obesity health risks](https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/health-risks) | 관절·담석 등 연관성. 공식 색인 |
| S17 | [NICE NG219 gout](https://www.nice.org.uk/guidance/ng219/chapter/Recommendations) | 통풍 진단·음주/체중 관련성. 공식 색인 |
| S18 | [WHO alcohol and health 2023](https://www.who.int/europe/news/item/04-01-2023-no-level-of-alcohol-consumption-is-safe-for-our-health/) | 음주·암 예방 정보. 공식 색인 |
| S19 | [NCI tobacco](https://www.cancer.gov/about-cancer/causes-prevention/risk/tobacco) | 흡연 관련 암. 공식 색인 |
| S20 | [NCI obesity and cancer](https://www.cancer.gov/about-cancer/causes-prevention/risk/obesity/obesity-fact-sheet) | 비만 관련 암. 공식 색인 |
| S21 | [ACG Barrett guideline 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC10259184/) | 만성 GERD와 선별 제약. 지침 내용 확인 |
| S22 | [WHO physical activity guidelines](https://www.ncbi.nlm.nih.gov/books/NBK566046/) | 150–300분 중강도/75–150분 고강도. 지침 색인 |
| S23 | [한국 수정 STOP-Bang 2021 PDF](https://www.sleepmedres.org/upload/pdf/smr-2020-00808.pdf) | 색인만 확인, 원문 403; 점수표 미확보 |
| S24 | [KDR 10-year cohort study 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8015827/) | 색인만 확인, 본문 CAPTCHA; 구현 보류 |
| S25 | [한국 당뇨 점수 외부검증 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4877115/) | 현재/미래 당뇨 표적 차이. 원문 |
| S26 | [USPSTF COPD 2022](https://www.uspreventiveservicestaskforce.org/uspstf/announcements/final-recommendation-statement-screening-copd) | 무증상 COPD 선별 반대. 공식 내용 확인 |
| S27 | [PLOS NAFLD self-assessment score 2014](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0107584) | 원문 Methods의 음주 제외 확인 |
| S28 | [PHQ-9 IPD meta-analysis 2021](https://pubmed.ncbi.nlm.nih.gov/34610915/) | 진단 정확도/표적 정합성. 논문 초록 색인 |
| S29 | [KDCA 2025 국민건강영양조사 발표 PDF](https://www.kdca.go.kr/bbs/kdca/42/310041/download.do) | 발표 사실·통계 공개 일정 확인, 모든 수치 대조는 미수행 |

보완 참고: [ADA 2026 당뇨 진단·선별](https://diabetesjournals.org/care/article/49/Supplement_1/S27/163926/2-Diagnosis-and-Classification-of-Diabetes), [USPSTF 전당뇨·당뇨 선별](https://www.uspreventiveservicestaskforce.org/uspstf/document/RecommendationStatementFinal/screening-for-prediabetes-and-type-2-diabetes), [한국 당뇨 점수 개발 원문](https://pmc.ncbi.nlm.nih.gov/articles/PMC3402268/), [PHQ-2와 PHQ-9 분기 메타분석](https://jamanetwork.com/journals/jama/fullarticle/2766865). 해외 선별 기준을 한국 대상 앱의 국내 기준으로 그대로 표시하지 않는다.
