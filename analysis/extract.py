"""국민건강영양조사 제9기(2022–2024) 기본DB → 엔진 입력 + 실측 결과

개인 단위 자료는 파일로 저장하지 않는다. 분석 스크립트(TypeScript)가 이 파일을 하위 프로세스로 실행해
표준출력 파이프로만 받는다(analysis/people.ts). 터미널에서 직접 --pipe 로 실행하지 않는다.

  python analysis/extract.py --pipe checked   # 이용지침서 기준 (기본)
  python analysis/extract.py --pipe legacy    # 보정 v1을 만들 때 쓴 예전 규칙 (비교용)
  python analysis/extract.py --audit          # 집계만 출력 (개인 정보 없음)

입력: docs/sas/HN22_ALL·HN23_ALL·HN24_ALL(SAS).zip (git 제외). 필요 패키지: pandas

checked 규칙 (이용지침서 표 18–20, 변수 설명):
- 임신(HE_dprg 값 있음 또는 HE_prg=1) 제외
- 당뇨 가족력: 부·모·형제 중 1이면 있음, 부=0·모=0·형제 0/8(형제 없음)이면 없음, 그 외(모름·무응답)는 제외
- 진단 여부(DI1_dg·DE1_dg·DI2_dg): 0/1만 사용, 그 외 제외
- 실측 정의: 고혈압은 DI1_2 유효코드(1–5,8)일 때, 당뇨는 공복 8시간↑·당화혈색소 있음·DE1_31/32 유효코드(0,1,8)일 때,
  고콜레스테롤은 공복 8시간↑·DI2_2 유효코드(1–5,8)일 때만 정의
legacy 규칙 (보정 v1): 가족력 모름 → 없음, 진단 9 → 없음, 복약 코드 유효성 확인 없음, HE_prg 미확인
"""
import io, json, math, os, sys, zipfile
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAS = os.path.join(ROOT, 'docs', 'sas')
FREQ = {1: 0.0, 2: 0.12, 3: 0.23, 4: 0.7, 5: 2.5, 6: 5.0, 8: 0.0}       # BD1_11 → 주당 횟수 (구간 대표값)
PER = {1: 1.5, 2: 3.5, 3: 5.5, 4: 8.0, 5: 11.0}                           # BD2_1 → 한 번 잔 수 (BD2_14 정확값이 없을 때)


def num(r, c):
    v = r.get(c)
    return float(v) if isinstance(v, (int, float)) and math.isfinite(v) else None


def exercise(r):
    """이용지침서 표 19 유산소 신체활동 실천(중강도 150분/주 상당). 앱 질문(주 2회·30분)의 대체 변수"""
    ts = []
    for f, d, h, m in [(71, 72, 73, 74), (81, 82, 83, 84), (75, 76, 77, 78), (85, 86, 87, 88), (91, 92, 93, 94)]:
        flag, days, hh, mm = r.get(f'BE3_{f}'), num(r, f'BE3_{d}'), num(r, f'BE3_{h}'), num(r, f'BE3_{m}')
        if flag == 2: ts.append(0)
        elif flag == 1 and days in range(1, 8) and hh is not None and mm is not None and hh not in (88, 99) and mm not in (88, 99): ts.append(days * (hh * 60 + mm))
        else: return None
    vig, mod1, vig2, mod2, walk = ts
    v, mw = vig + vig2, mod1 + mod2 + walk
    return bool(mw >= 150 or v >= 75 or 2 * v + mw >= 150)


def egfr_ckdepi2021(crea, sex, age):
    k, a = (0.7, -0.241) if sex == 2 else (0.9, -0.302)
    return 142 * min(crea / k, 1) ** a * max(crea / k, 1) ** -1.2 * 0.9938 ** age * (1.012 if sex == 2 else 1)


def person(r, mode, audit):
    age, sex, h, w, wt = num(r, 'age'), r.get('sex'), num(r, 'HE_ht'), num(r, 'HE_wt'), num(r, 'wt_itvex')
    if age is None or age < 19 or sex not in (1, 2) or not wt or wt <= 0 or h is None or w is None: return None
    if num(r, 'HE_dprg') is not None or (mode == 'checked' and r.get('HE_prg') == 1): return None
    b1, b3 = r.get('BS1_1'), r.get('BS3_1')
    smoke = 'current' if b1 == 2 and b3 in (1, 2) else 'past' if b1 == 2 and b3 == 3 else 'never' if b1 in (1, 3) else None
    f = r.get('BD1_11')
    if smoke is None or f not in FREQ: return None
    per = 0.0
    if FREQ[f] > 0:
        exact = num(r, 'BD2_14')
        per = exact if exact is not None and 0 < exact < 888 else PER.get(r.get('BD2_1'))
        if per is None: return None
    daily = FREQ[f] * per / 7
    alcohol = 'none' if FREQ[f] == 0 else 'lt1' if daily < 1 else 'd1_4' if daily < 5 else 'd5'
    fh = [r.get(c) for c in ('HE_DMfh1', 'HE_DMfh2', 'HE_DMfh3')]
    diag = [r.get(c) for c in ('DI1_dg', 'DE1_dg', 'DI2_dg')]
    if mode == 'checked':
        fam = True if 1 in fh else False if fh[0] == 0 and fh[1] == 0 and fh[2] in (0, 8) else None
        if fam is None: audit['family_unknown_excluded'] += 1; return None
        if any(v not in (0, 1) for v in diag): audit['diagnosis_unknown_excluded'] += 1; return None
    else:
        fam = 1 in fh
    dx = {'htn': diag[0] == 1, 'dm': diag[1] == 1, 'chol': diag[2] == 1}
    meno = None
    if sex == 2 and age >= 40: meno = True if r.get('LW_ms') in (5, 6) else False if r.get('LW_ms') in (2, 3, 4) else None
    waist = num(r, 'HE_wc')
    inp = {'age': int(age), 'sex': 'M' if sex == 1 else 'F', 'heightCm': round(h, 1), 'weightKg': round(w, 1), 'waistCm': round(waist, 1) if waist is not None else None,
           'smoke': smoke, 'alcohol': alcohol, 'famDM': fam, 'dx': dx, 'bp': 'unknown', 'exercise': exercise(r), 'meno': meno}
    sbp, dbp, glu, a1c, fst = num(r, 'HE_sbp'), num(r, 'HE_dbp'), num(r, 'HE_glu'), num(r, 'HE_HbA1c'), num(r, 'HE_fst')
    tc, tg, hdl, crea, upro = num(r, 'HE_chol'), num(r, 'HE_TG'), num(r, 'HE_HDL_st2'), num(r, 'HE_crea'), r.get('HE_Upro')
    medh, medc, ins, medd = r.get('DI1_2'), r.get('DI2_2'), r.get('DE1_31'), r.get('DE1_32')
    fasting = fst is not None and fst >= 8
    out = {}
    if mode == 'checked':
        if sbp and dbp and medh in (1, 2, 3, 4, 5, 8): out['htn'] = int(sbp >= 140 or dbp >= 90 or medh in (1, 2, 3, 4))
        if glu and a1c and fasting and ins in (0, 1, 8) and medd in (0, 1, 8): out['dm'] = int(glu >= 126 or a1c >= 6.5 or ins == 1 or medd == 1 or dx['dm'])
        if tc is not None and fasting and medc in (1, 2, 3, 4, 5, 8): out['chol'] = int(tc >= 240 or medc in (1, 2, 3, 4))
    else:
        if sbp and dbp: out['htn'] = int(sbp >= 140 or dbp >= 90 or medh in (1, 2, 3, 4))
        if glu and a1c and fasting: out['dm'] = int(glu >= 126 or a1c >= 6.5 or ins == 1 or medd == 1 or dx['dm'])
        if tc is not None and fasting: out['chol'] = int(tc >= 240 or medc in (1, 2, 3, 4))
    if r.get('DX_OST') in (1, 2, 3): out['osteo'] = int(r['DX_OST'] == 3)
    egfr = egfr_ckdepi2021(crea, sex, age) if crea and crea > 0 else None
    lab = {'sbp': sbp, 'dbp': dbp, 'glu': glu if fasting else None, 'a1c': a1c, 'tc': tc if fasting else None, 'tg': tg if fasting else None,
           'hdl': hdl if fasting else None, 'egfr': round(egfr, 1) if egfr else None, 'upro': min(int(upro), 3) if upro in (0, 1, 2, 3, 4, 5) else None}
    return {'year': int(r['year']), 'w': wt / 3, 'psu': str(r.get('psu')), 'strata': str(r.get('kstrata')), 'inp': inp, 'out': out, 'lab': {k: v for k, v in lab.items() if v is not None}}


def people(mode):
    audit = {'family_unknown_excluded': 0, 'diagnosis_unknown_excluded': 0}
    rows = []
    for yr in ('22', '23', '24'):
        with zipfile.ZipFile(os.path.join(SAS, f'HN{yr}_ALL(SAS).zip')) as z:
            name = next(n for n in z.namelist() if n.lower().endswith('.sas7bdat'))
            df = pd.read_sas(io.BytesIO(z.read(name)), format='sas7bdat', encoding='latin1')
        for r in df.to_dict('records'):
            p = person(r, mode, audit)
            if p: rows.append(p)
    return rows, audit


if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == '--pipe':
        if sys.stdout.isatty(): sys.exit('개인 단위 자료는 터미널에 출력하지 않아요. analysis/people.ts 로만 읽어요.')
        rows, _ = people(sys.argv[2])
        for p in rows: sys.stdout.write(json.dumps(p, ensure_ascii=False) + '\n')
    elif len(sys.argv) >= 2 and sys.argv[1] == '--audit':
        for m in ('legacy', 'checked'):
            rows, audit = people(m)
            print(m, '분석 대상', len(rows), '명', audit)
    else:
        print(__doc__)
