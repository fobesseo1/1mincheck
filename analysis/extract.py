"""국민건강영양조사 제9기(2022–2024) 기본DB → 엔진 입력 + 실측 결과 (개인 단위, 저장소에 올리지 않음)

실행:  python analysis/extract.py
입력:  docs/sas/HN22_ALL(SAS).zip, HN23_ALL, HN24_ALL   (git 제외)
출력:  analysis/.cache/people.jsonl                       (git 제외)

변수 정의는 「국민건강영양조사 제9기 원시자료 이용지침서」 표 18–20의 공식 지표 프로그램을 따른다.
필요 패키지: pandas
"""
import json, math, zipfile, io, os, sys
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAS = os.path.join(ROOT, 'docs', 'sas')
OUT = os.path.join(ROOT, 'analysis', '.cache')
os.makedirs(OUT, exist_ok=True)

COLS = ['year', 'age', 'sex', 'HE_ht', 'HE_wt', 'HE_wc', 'HE_sbp', 'HE_dbp', 'HE_glu', 'HE_HbA1c', 'HE_fst', 'HE_chol', 'HE_TG', 'HE_HDL_st2', 'HE_dprg',
        'BS1_1', 'BS3_1', 'BD1_11', 'BD2_1', 'BD2_14', 'HE_DMfh1', 'HE_DMfh2', 'HE_DMfh3', 'DI1_dg', 'DI1_2', 'DE1_dg', 'DE1_31', 'DE1_32', 'DI2_dg', 'DI2_2',
        'LW_ms', 'DX_OST', 'wt_itvex', 'kstrata', 'psu'] + [f'BP_PHQ_{k}' for k in range(1, 10)] + \
       [f'BE3_{k}' for k in (71, 72, 73, 74, 75, 76, 77, 78, 81, 82, 83, 84, 85, 86, 87, 88, 91, 92, 93, 94)]


def load(yr):
    with zipfile.ZipFile(os.path.join(SAS, f'HN{yr}_ALL(SAS).zip')) as z:
        name = [n for n in z.namelist() if n.lower().endswith('.sas7bdat')][0]
        df = pd.read_sas(io.BytesIO(z.read(name)), format='sas7bdat', encoding='latin1')
    for c in COLS:
        if c not in df.columns: df[c] = float('nan')
    return df[COLS]


def ok(v): return v is not None and not (isinstance(v, float) and math.isnan(v))
def num(v): return float(v) if ok(v) else None


def pa_aerobic(r):
    """이용지침서 표 19: 유산소 신체활동 실천 (중강도 150분 또는 고강도 75분/주)"""
    def t(flag, days, h, m):
        f, d, hh, mm = r[f'BE3_{flag}'], r[f'BE3_{days}'], r[f'BE3_{h}'], r[f'BE3_{m}']
        if f == 2: return 0.0
        if f == 1 and d in (1, 2, 3, 4, 5, 6, 7) and ok(hh) and ok(mm) and hh not in (88, 99) and mm not in (88, 99): return d * (hh * 60 + mm)
        return None
    vig1, mod1, vig2, mod2, walk = t(71, 72, 73, 74), t(81, 82, 83, 84), t(75, 76, 77, 78), t(85, 86, 87, 88), t(91, 92, 93, 94)
    if None in (vig1, mod1, vig2, mod2, walk): return None
    vig, mw = vig1 + vig2, mod1 + walk + mod2
    return mw >= 150 or vig >= 75 or (vig * 2 + mw) >= 150


FREQ = {1: 0.0, 2: 0.12, 3: 0.23, 4: 0.7, 5: 2.5, 6: 5.0, 8: 0.0}       # BD1_11 → 주당 횟수 (구간 대표값)
PER = {1: 1.5, 2: 3.5, 3: 5.5, 4: 8.0, 5: 11.0}                           # BD2_1 → 한 번 잔 수 (BD2_14 정확값이 없을 때)


def person(r):
    age, sex = r['age'], r['sex']
    if not ok(age) or age < 19 or sex not in (1, 2) or ok(r['HE_dprg']): return None   # 성인, 임신부 제외
    if not (ok(r['HE_ht']) and ok(r['HE_wt'])): return None
    # 흡연 (표 18 현재흡연율 정의)
    b1, b3 = r['BS1_1'], r['BS3_1']
    smoke = 'current' if b1 == 2 and b3 in (1, 2) else 'past' if b1 == 2 and b3 == 3 else 'never' if b1 in (1, 3) else None
    # 음주 → 하루 평균 잔 수 → 엔진 4단계 (앱과 같은 구간)
    f = r['BD1_11']
    if f not in FREQ: return None
    per = 0.0
    if FREQ[f] > 0:
        per = r['BD2_14'] if ok(r['BD2_14']) and 0 < r['BD2_14'] < 888 else PER.get(r['BD2_1'])
        if per is None: return None
    daily = FREQ[f] * per / 7
    alcohol = 'none' if FREQ[f] == 0 else 'lt1' if daily < 1 else 'd1_4' if daily < 5 else 'd5'
    if smoke is None: return None
    fam = any(r[c] == 1 for c in ('HE_DMfh1', 'HE_DMfh2', 'HE_DMfh3'))
    dx = {'htn': r['DI1_dg'] == 1, 'dm': r['DE1_dg'] == 1, 'chol': r['DI2_dg'] == 1}
    meno = None
    if sex == 2 and age >= 40: meno = True if r['LW_ms'] in (5, 6) else False if r['LW_ms'] in (2, 3, 4) else None
    phq = [r[f'BP_PHQ_{k}'] for k in range(1, 10)]
    inp = {'age': int(age), 'sex': 'M' if sex == 1 else 'F', 'heightCm': round(r['HE_ht'], 1), 'weightKg': round(r['HE_wt'], 1),
           'waistCm': round(r['HE_wc'], 1) if ok(r['HE_wc']) else None, 'smoke': smoke, 'alcohol': alcohol, 'famDM': bool(fam), 'dx': dx,
           'bp': 'unknown', 'exercise': pa_aerobic(r), 'meno': meno}
    if all(v in (0, 1, 2, 3) for v in phq): inp['mind'] = {'phq': [int(v) for v in phq], 'gad': [0, 0]}
    # 실측 결과 (이용지침서 표 20 정의)
    sbp, dbp, glu, a1c, fst = num(r['HE_sbp']), num(r['HE_dbp']), num(r['HE_glu']), num(r['HE_HbA1c']), num(r['HE_fst'])
    out = {}
    if sbp and dbp: out['htn'] = int(sbp >= 140 or dbp >= 90 or r['DI1_2'] in (1, 2, 3, 4))
    if glu and a1c and fst is not None and fst >= 8: out['dm'] = int(glu >= 126 or a1c >= 6.5 or r['DE1_31'] == 1 or r['DE1_32'] == 1 or r['DE1_dg'] == 1)
    if ok(r['HE_chol']) and fst is not None and fst >= 8: out['chol'] = int(r['HE_chol'] >= 240 or r['DI2_2'] in (1, 2, 3, 4))
    if r['DX_OST'] in (1, 2, 3): out['osteo'] = int(r['DX_OST'] == 3)
    lab = {'sbp': sbp, 'dbp': dbp, 'glu': glu if fst is not None and fst >= 8 else None, 'tc': num(r['HE_chol']), 'tg': num(r['HE_TG']), 'hdl': num(r['HE_HDL_st2'])}
    return {'year': int(r['year']), 'w': r['wt_itvex'] / 3, 'strata': r['kstrata'], 'psu': r['psu'], 'inp': inp, 'out': out,
            'lab': {k: v for k, v in lab.items() if v is not None}}


def main():
    n_all, rows = 0, []
    for yr in ('22', '23', '24'):
        df = load(yr)
        n_all += len(df)
        for r in df.to_dict('records'):
            if not ok(r['wt_itvex']) or r['wt_itvex'] <= 0: continue
            p = person(r)
            if p: rows.append(p)
    with open(os.path.join(OUT, 'people.jsonl'), 'w', encoding='utf-8') as f:
        for p in rows: f.write(json.dumps(p, ensure_ascii=False) + '\n')
    print(f'전체 {n_all}명 중 분석 대상 성인 {len(rows)}명 → analysis/.cache/people.jsonl')


if __name__ == '__main__':
    main()
