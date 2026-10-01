// 항목별 고정 문구: 이름·설명·다음 할 일·근거 (docs/spec.md §6·§7·§12)
export type ItemId = 'dm' | 'htn' | 'chol' | 'obesity' | 'nafld' | 'osa' | 'isi' | 'dep' | 'gad' | 'osteo' | 'gerd' | 'diet';
export const ORDER: ItemId[] = ['dm', 'htn', 'chol', 'nafld', 'dep', 'osteo', 'obesity', 'isi', 'diet', 'osa', 'gad', 'gerd'];
export const PROB_IDS: ItemId[] = ['dm', 'htn', 'chol', 'nafld'];
export const SCORE_IDS: ItemId[] = ['obesity', 'dep', 'isi', 'diet', 'osa', 'gad', 'gerd'];

export const NAMES: Record<ItemId, string> = {
  dm: '당뇨', htn: '고혈압', chol: '고콜레스테롤', obesity: '비만', nafld: '지방간', osa: '수면무호흡',
  isi: '불면', dep: '우울', gad: '불안', osteo: '골다공증', gerd: '위식도역류', diet: '식생활',
};
export const TOOL: Record<ItemId, string> = {
  dm: '한국형 당뇨 선별점수', htn: '국민건강영양조사 + 비만 보정', chol: '국민건강영양조사 + 비만 보정', obesity: 'BMI · 허리둘레',
  nafld: '한국인 비혈액 지방간 점수', osa: 'STOP-Bang', isi: 'ISI 불면 척도', dep: 'PHQ-2 / PHQ-9', gad: 'GAD-2',
  osteo: 'OSTA', gerd: '한국판 GerdQ', diet: '식생활 간이 점검(참고 지표)',
};
export const BADGE: Record<string, string> = { A: '모형 확률', "A'": '점수표 확률', B: '추정', C: '점수 등급', D: '참고 지표' };
export const MODULE_OF: Partial<Record<ItemId, 'sleep' | 'mind' | 'gerd' | 'diet'>> = { osa: 'sleep', isi: 'sleep', dep: 'mind', gad: 'mind', gerd: 'gerd', diet: 'diet' };

export const WHAT: Record<ItemId, string> = {
  dm: '아직 진단받지 않은 당뇨가 있을 확률이에요.',
  htn: '혈압이 고혈압 기준에 해당할 확률이에요.',
  chol: '총콜레스테롤이 240 이상이거나 약을 먹고 있을 확률이에요.',
  obesity: '키와 몸무게로 계산한 BMI와 허리둘레 기준이에요.',
  nafld: '술 때문이 아닌 지방간이 있을 확률이에요(검진 코호트 기준이라 약간 높게 나올 수 있어요).',
  osa: '코골이·숨멈춤 등 8가지로 매긴 수면무호흡 선별 점수예요.',
  isi: '최근 2주 잠 문제를 7문항으로 매긴 점수예요.',
  dep: '최근 2주 기분을 PHQ 문항으로 매긴 우울 선별 점수예요. 진단이 아니에요.',
  gad: '최근 2주 불안을 2문항으로 매긴 선별 점수예요.',
  osteo: '나이와 체중으로 계산한 골다공증 확률이에요.',
  gerd: '최근 7일 증상으로 매긴 위식도역류 점수예요.',
  diet: '7가지 식습관으로 매긴 참고 점수예요. 검증된 척도는 아니에요.',
};

/** 상세 화면 '왜 중요한가' */
export const WHY: Partial<Record<ItemId, string>> = {
  osteo: '골다공증으로 고관절이 부러지면 1년 안에 약 17%가 사망해요(남성 21.5%, 여성 14.6%). 척추 골절은 약 6%예요. 골절 전에 골밀도 검사로 찾아 치료하는 게 중요해요.',
};

/** 카드·상세 제목 (목록에서는 NAMES 를 짧게 쓴다) */
export const TITLE: Record<ItemId, string> = { ...NAMES, dm: '이미 당뇨일 확률' };
/** 또래보다 높을 때 바로 보여줄 다음 행동 */
export const ACTION: Partial<Record<ItemId, string>> = {
  dm: '가까운 병원이나 국가건강검진에서 공복혈당·당화혈색소 검사를 받아 보세요.',
  htn: '며칠에 걸쳐 혈압을 재 보고, 높게 나오면 진료를 받아 보세요.',
  chol: '국가건강검진이나 병원에서 콜레스테롤 혈액검사를 받아 보세요.',
  nafld: '건강검진의 간 수치(AST·ALT)나 복부 초음파로 확인해 보세요.',
  dep: '정신건강복지센터나 병원에서 상담을 받아 보세요. 많이 힘들면 109(24시간).',
  osteo: '골밀도 검사를 받아 보세요. 학회는 여성 65세·남성 70세 이상, 위험요인이 있으면 더 일찍 권해요.',
  isi: '불면이 계속되면 수면 진료를 받아 보세요. 불면 인지행동치료가 도움이 돼요.',
  osa: '수면다원검사로 확인할 수 있어요. 건강보험이 적용돼요.',
  gad: '불안이 2주 넘게 이어지면 정신건강복지센터에서 상담받을 수 있어요.',
  gerd: '증상이 이어지면 소화기내과 진료를 받아 보세요.',
};
/** 이미 진단받은 항목(관리 중) 안내 */
export const MANAGED: Partial<Record<ItemId, string>> = {
  dm: '당뇨 진단을 받으셨어요. 처방대로 약을 챙기고, 혈당을 꾸준히 재며 정기 진료를 이어가세요.',
  htn: '고혈압 진단을 받으셨어요. 처방대로 약을 챙기고, 집에서 혈압을 재며 정기 진료를 이어가세요. 고혈압은 당뇨 위험도 함께 올려요.',
  chol: '고지혈증 진단을 받으셨어요. 처방대로 약을 챙기고, 정기 혈액검사로 수치를 확인하세요.',
};
/** 지방간 점수 원 연구의 음주 기준(남 주 140g·여 70g)을 넘을 때 */
export const EXCLUDED_NAFLD_STUDY = (sex: 'M' | 'F') => `지방간 점수는 술을 주 ${sex === 'M' ? '140' : '70'}g 이하로 마시는 사람으로 만든 도구라, 그보다 많이 드시면 이 점수로는 판단하지 않아요. 간 수치(AST·ALT·감마지티피) 검사로 확인해 보세요.`;
export const EXCLUDED_NAFLD ='술을 하루 평균 5잔 이상 드셔서, 지방간 점수(술 때문이 아닌 지방간을 보는 도구)로는 판단할 수 없어요. 술로 인한 간 손상(알코올성 간질환)이 있는지 간 수치 검사를 받아 보세요.';
export const CRITERIA_HTN = '측정 혈압이 고혈압 기준(140/90 이상)이에요. 며칠에 걸쳐 다시 재 보고 진료를 받아 보세요.';

/** % 항목이 '무엇의 가능성'인지 (앞으로가 아니라 지금 상태) */
export const MEANING: Partial<Record<ItemId, string>> = {
  dm: '아직 진단은 안 받았지만, 혈당 검사를 하면 당뇨로 나올 가능성',
  htn: '지금 고혈압 기준(140/90 이상 또는 약 복용)에 해당할 가능성',
  chol: '지금 콜레스테롤이 높을(240 이상 또는 약 복용) 가능성',
  nafld: '지금 지방간이 있을 가능성',
  osteo: '지금 골다공증이 있을 가능성',
};
/** 또래 평균값의 뜻이 내 값과 조금 다른 항목 */
export const PEER_NOTE: Partial<Record<ItemId, string>> = {
  nafld: '지방간 평균은 연령대 구분 없이 같은 성별 성인 전체 비율이에요.',
};
export const DISCLAIMER = '논문과 국가 통계를 바탕으로 한 수학적 추정이에요. 진단이 아니며, 실제 판정은 반드시 의사가 해요.';

export const HOW: Record<ItemId, string> = {
  dm: '나이·가족력·고혈압·허리둘레·흡연·음주에 논문 계수를 더해 확률로 바꿔요(개발 9,602명, 검증 8,391명). 상대 오차 ±약 25%.',
  htn: '같은 나이·성별 유병률(국민건강영양조사 2023–2025 평균)에서 시작해 비만 여부로 보정해요. 허리 변화 효과는 한국인 코호트(KoGES) 값을 써요. 집단 평균에 맞춘 추정이라 개인 예측 정확도는 따로 검증되지 않았어요.',
  chol: '같은 나이·성별 유병률에서 시작해 비만 여부로 보정해요. 체중 효과는 BMI 25를 넘나들 때만 반영돼 대략적이에요. 개인 예측 정확도는 따로 검증되지 않았어요.',
  obesity: '대한비만학회 기준: 23 미만 정상, 23–24.9 비만 전단계, 25 이상 비만. 복부비만은 허리 남 90cm·여 85cm 이상이에요.',
  nafld: '나이·허리·BMI·당뇨·이상지질혈증·음주·운동·폐경으로 점수를 매기고, 외부검증 66,868명의 점수별 실제 비율로 바꿔요.',
  osa: '0–2점 저위험, 5–8점 고위험이에요. 점수가 낮을 때 안심하기 좋은 도구이고, 높다고 확정되는 건 아니에요(특이도 낮음).',
  isi: '0–7 해당 없음, 8–14 경계, 15–21 중등도, 22–28 심함. 연구에서는 10점 이상을 불면으로 봐요.',
  dep: 'PHQ-2는 두 문항 합 3점 이상, PHQ-9는 10점 이상이면 선별 양성이에요. 점수로 다시 확률을 추정하지 않아요(같은 점수 기준을 두 번 쓰게 돼서). 또래 값은 같은 나이·성별에서 PHQ-9 10점 이상인 비율이에요.',
  gad: '두 문항 합 3점 이상이면 선별 양성이에요. 한국인 범불안장애 사전확률이 없어 등급만 보여줘요.',
  osteo: 'OSTA = (체중 − 나이) × 0.2. 여성은 한국 폐경 전후 여성 1,488명 연구의 민감도·특이도로 보정해요. 남성은 동년배 유병률만 보여줘요. 폐경 여부는 계산에 반영하지 않아요.',
  gerd: '6문항 합 8점 이상이면 가능성 높음이에요. 명치 통증·메스꺼움 문항은 거꾸로 채점해요.',
  diet: 'KHEI(한국형 건강식생활지수) 구성요소를 7문항으로 줄인 자체 점검이에요. 75 이상 양호, 50–74 보통, 50 미만 개선 필요.',
};

export const NEXT: Record<ItemId, { t: string; d: string }[]> = {
  dm: [{ t: '국가건강검진에서 혈당 확인', d: '20세 이상이면 2년마다 받을 수 있어요. 공복혈당 결과로 확인해요.' }, { t: '한 달에 한 번 허리둘레 재기', d: '배꼽 높이, 숨을 내쉰 상태로 재서 기록해 두세요.' }, { t: '주 2회·30분 운동', d: '허리와 체중을 지키는 가장 쉬운 방법이에요.' }],
  htn: [{ t: '혈압 한 번 재 보기', d: '가정용 혈압계나 보건소에서 재면 결과가 더 정확해져요.' }, { t: '국가건강검진 받기', d: '20세 이상이면 2년마다 혈압을 확인해요.' }, { t: '국물·짠 반찬 줄이기', d: '한국인 하루 나트륨 섭취는 목표(2,300mg)보다 높은 편이에요.' }],
  chol: [{ t: '혈액검사로 확인', d: '콜레스테롤은 피검사로만 알 수 있어요. 국가건강검진에 포함돼요.' }, { t: '체중 관리', d: 'BMI 25 아래로 내려오면 추정치가 낮아져요.' }],
  obesity: [{ t: '허리둘레 재기', d: '배꼽 높이에서 숨을 내쉰 상태로 재요.' }, { t: '주 2회·30분 운동', d: '체중과 허리 모두에 도움이 돼요.' }],
  nafld: [{ t: '국가건강검진 간기능 확인', d: '간 수치(AST·ALT)로 함께 확인할 수 있어요.' }, { t: '운동 이어가기', d: '규칙적인 운동만으로도 점수가 1점 낮아져요.' }, { t: '단 음료 줄이기', d: '가당 음료는 지방간과 관련이 있어요.' }],
  osa: [{ t: '점수가 높다면 수면다원검사', d: '2018년 7월부터 건강보험이 적용돼요.' }, { t: '체중 관리', d: '체중이 줄면 코골이와 숨멈춤이 줄어드는 경우가 많아요.' }],
  isi: [{ t: '불면이 계속되면 수면 진료', d: '불면 인지행동치료가 1차로 권장돼요.' }, { t: '매일 같은 시간에 일어나기', d: '잠드는 시간보다 일어나는 시간을 고정하는 게 먼저예요.' }],
  dep: [{ t: '정신건강복지센터 상담', d: '가까운 센터에서 무료로 상담받을 수 있어요.' }, { t: '많이 힘들 땐 109', d: '자살예방상담전화 109는 24시간 열려 있어요.' }],
  gad: [{ t: '불안이 계속되면 상담', d: '정신건강복지센터에서 이야기를 들어줘요.' }],
  osteo: [{ t: '골밀도 검사', d: '대한골대사학회는 여성 65세·남성 70세 이상에게 권하고, 위험요인이 있는 폐경 여성·50세 이상 남성은 더 일찍 권해요. 국가검진 대상인지는 ‘The건강보험’ 앱에서 확인하세요.' }, { t: '체중을 너무 줄이지 않기', d: '마른 체중은 골다공증 위험과 관련이 있어요.' }],
  gerd: [{ t: '증상이 이어지면 진료', d: '소화기내과에서 확인해 보세요.' }, { t: '식후 바로 눕지 않기', d: '야식 줄이기, 잘 때 머리 쪽 높이기도 권장돼요.' }],
  diet: [{ t: '부족한 항목 하나만 더하기', d: '한국인은 우유·유제품, 잡곡, 과일이 특히 부족한 편이에요.' }, { t: '국물은 남기기', d: '나트륨을 줄이는 가장 쉬운 방법이에요.' }],
};

/** 상태별 다음 할 일 (진단받음·술 때문에 계산 안 함 등) — 키: '항목:상태' */
export const NEXT_SPECIAL: Record<string, { t: string; d: string }[]> = {
  'nafld:excluded': [{ t: '간 수치 검사', d: '건강검진이나 병원에서 간 수치(AST·ALT·감마지티피)를 확인해요.' }, { t: '술 줄이기', d: '술을 줄이면 간 수치가 좋아지는 경우가 많아요. 바꿔보기에서 음주를 줄이면 지방간 점수도 볼 수 있어요.' }, { t: '혼자 줄이기 어렵다면', d: '가까운 보건소나 중독관리통합지원센터에서 상담받을 수 있어요.' }],
  'htn:managed': [{ t: '처방대로 약 챙기기', d: '혈압약은 증상이 없어도 꾸준히 먹는 게 중요해요.' }, { t: '집에서 혈압 재기', d: '아침·저녁으로 재서 기록해 두면 진료 때 도움이 돼요.' }, { t: '국물·짠 음식 줄이기', d: '나트륨을 줄이면 혈압 조절에 도움이 돼요.' }, { t: '콩팥 검사', d: '고혈압이 있으면 혈액 eGFR와 소변 알부민 검사로 콩팥 상태를 정기적으로 확인하세요.' }],
  'dm:managed': [{ t: '처방대로 약 챙기기', d: '정기 진료에서 당화혈색소로 조절 상태를 확인해요.' }, { t: '매년 합병증 검사', d: '눈(안저검사), 콩팥(혈액 eGFR·소변 알부민), 발 검사를 1년에 한 번 받으세요.' }, { t: '혈당 기록하기', d: '식사 전후 혈당을 기록해 두면 진료 때 도움이 돼요.' }],
  'chol:managed': [{ t: '처방대로 약 챙기기', d: '정기 혈액검사로 수치를 확인해요.' }, { t: '체중·운동 관리', d: '주 2회·30분 운동이 도움이 돼요.' }],
  'htn:criteria': [{ t: '며칠에 걸쳐 다시 재기', d: '5분 쉬고 앉아서, 아침·저녁으로 재 보세요.' }, { t: '계속 높으면 진료', d: '140/90 이상이 이어지면 병원에서 확인받아요.' }],
};

export const SRC: Record<ItemId, { t: string; d: string; u: string }[]> = {
  dm: [{ t: '한국형 당뇨 선별점수', d: 'Lee YH 외, Diabetes Care 2012', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3402268/' }, { t: 'Diabetes Fact Sheets in Korea 2024', d: '인지율·전단계 유병률', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12086556/' }],
  htn: [{ t: '고혈압 유병률 추이 2015–2024', d: '주간 건강과 질병 2026', u: 'https://www.phwr.org/journal/view.html?doi=10.56786%2FPHWR.2026.19.17.3' }, { t: '허리둘레·BMI와 고혈압 발생', d: 'KoGES · BMC Public Health 2015', u: 'https://link.springer.com/article/10.1186/s12889-015-1471-5' }],
  chol: [{ t: '고콜레스테롤혈증 유병률 추이', d: '주간 건강과 질병 2025', u: 'https://www.phwr.org/journal/view.html?doi=10.56786%2FPHWR.2025.18.36.3' }],
  obesity: [{ t: '2023 Obesity Fact Sheet', d: '대한비만학회 · JOMES 2024', u: 'https://doaj.org/article/52b16353b4ba495a9f9eaa9c514287b3' }],
  nafld: [{ t: '비혈액 지방간 자가진단 점수', d: 'Lee YH 외, PLoS One 2014', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4162644/' }, { t: '한국 NAFLD 유병률 추이', d: 'KNHANES 1998–2017', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7465994' }],
  osa: [{ t: 'STOP-Bang 공식 한국어판 (KR-kor)', d: 'University Health Network · 2015 개정 채점 기준', u: 'https://www.stopbang.ca' }, { t: '한국 수면클리닉 STOP-Bang 비교', d: 'Yonsei Med J 2015', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4397437/' }, { t: '한국 중년 수면호흡장애 유병률', d: 'Kim J 외, AJRCCM 2004', u: 'https://pubmed.ncbi.nlm.nih.gov/15347562/' }],
  isi: [{ t: '한국인 불면 성차 연구', d: 'PLoS One 2020', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6952093' }, { t: 'ISI 점수 구간', d: 'Bastien 2001', u: 'https://pubmed.ncbi.nlm.nih.gov/11438246/' }],
  dep: [{ t: '우울장애 유병률 추이 2016–2024', d: '주간 건강과 질병 2026', u: 'https://www.phwr.org/journal/view.html?doi=10.56786%2FPHWR.2026.19.15.4' }, { t: 'PHQ-2 타당도', d: 'Kroenke 2003', u: 'https://pubmed.ncbi.nlm.nih.gov/14583691/' }],
  gad: [{ t: '한국판 GAD-7·GAD-2', d: 'Front Psychiatry 2019', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6431620' }],
  osteo: [{ t: 'OSTA 한국 폐경 전후 여성 검증', d: '대한산부인과학회지 2003', u: 'https://search.bvsalud.org/gim/resource/es/wpr-84071' }, { t: '골다공증 및 골다공증 골절 팩트시트 2023', d: '대한골대사학회·국민건강보험공단 · 50세 이상 2002–2022 골절 후 1년 치명률', u: 'https://www.ksbmr.org' }],
  gerd: [{ t: '한국판 GerdQ 타당도', d: '2019', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6326199' }, { t: '미란성 식도염 위험요인', d: 'J Korean Med Sci 2011', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3082116/' }],
  diet: [{ t: '한국형 건강식생활지수 2022–24', d: '질병관리청 발표 보도', u: 'https://www.newsis.com/view/NISX20260804_0003735294' }],
};
export const KNHANES = { t: '2025 국민건강영양조사 주요결과', d: '질병관리청 · 2023–2025 3년 평균', u: 'https://www.kdca.go.kr/bbs/kdca/42/312791/artclView.do' };
