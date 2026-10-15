"""허리를 모를 때의 '보통 허리' (2026-10-15, 결과 화면 '예상' 뱃지용)

같은 성별에서 BMI·나이가 같은 사람의 평균 허리둘레를 가중 선형 회귀로 구한다.
  허리(cm) = a + b·BMI + c·(BMI−25)+ + d·(나이−50)/10 + e·((나이−50)/10)²
2022–23으로 맞추고 2024로 평균 절대 오차를 본 뒤, 최종 계수는 3년 전체로. 개인 단위 자료는 남기지 않는다.

  PYTHONPATH=<pandas 위치> python -X utf8 analysis/waist_typical.py   → analysis/results/waist_typical.json
"""
import io, json, os, sys, zipfile
import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAS = os.path.join(ROOT, 'docs', 'sas')
OUT = os.path.join(ROOT, 'analysis', 'results', 'waist_typical.json')


def rows():
    out = []
    for yr in ('22', '23', '24'):
        with zipfile.ZipFile(os.path.join(SAS, f'HN{yr}_ALL(SAS).zip')) as z:
            name = next(n for n in z.namelist() if n.lower().endswith('.sas7bdat'))
            df = pd.read_sas(io.BytesIO(z.read(name)), format='sas7bdat', encoding='latin1')
        df = df[(df['age'] >= 19) & df['sex'].isin([1, 2]) & df['HE_wc'].notna() & df['HE_ht'].notna() & df['HE_wt'].notna() & (df['wt_itvex'] > 0)]
        df = df[df['HE_dprg'].isna() & (df['HE_prg'] != 1)]
        for r in df[['sex', 'age', 'HE_wc', 'HE_ht', 'HE_wt', 'wt_itvex']].itertuples(index=False):
            out.append((int(yr), 'M' if r.sex == 1 else 'F', float(r.age), float(r.HE_wc), float(r.HE_wt) / (float(r.HE_ht) / 100) ** 2, float(r.wt_itvex)))
    return out


def X(b, a):
    t = (a - 50) / 10
    return np.column_stack([np.ones_like(b), b, np.maximum(0, b - 25), t, t * t])


def fit(x, y, w):
    W = np.sqrt(w)
    return np.linalg.lstsq(x * W[:, None], y * W, rcond=None)[0]


def main():
    R = rows()
    res = {'source': '국민건강영양조사 제9기(2022–2024) 원시자료, 질병관리청', 'terms': ['1', 'BMI', '(BMI-25)+', '(age-50)/10', '((age-50)/10)^2'], 'coef': {}, 'test': {}}
    for s in ('M', 'F'):
        d = [r for r in R if r[1] == s]
        yr = np.array([r[0] for r in d]); a = np.array([r[2] for r in d]); y = np.array([r[3] for r in d]); b = np.array([r[4] for r in d]); w = np.array([r[5] for r in d])
        tr, te = yr <= 23, yr == 24
        c = fit(X(b[tr], a[tr]), y[tr], w[tr] / 2)
        mae = float(np.average(np.abs(X(b[te], a[te]) @ c - y[te]), weights=w[te]))
        res['coef'][s] = [round(float(v), 4) for v in fit(X(b, a), y, w / 3)]
        res['test'][s] = {'n': int(len(y)), 'mae2024_cm': round(mae, 2)}
        print(s, res['coef'][s], '2024 평균 절대 오차', round(mae, 2), 'cm')
    with open(OUT, 'w', encoding='utf-8') as f: json.dump(res, f, ensure_ascii=False, indent=1)
    print('저장', OUT)


if __name__ == '__main__':
    main()
