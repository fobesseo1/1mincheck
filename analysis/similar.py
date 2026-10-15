"""'나 같은 한국인' 곡선 (2026-10-15, docs/plan-2026-10-15-result-redesign.md §4-1)

같은 성별에서 나이·허리·BMI·술·담배·운동이 이런 사람들 중, 실제로 잰 값이 기준을 넘은 사람의 비율을
가중 로지스틱 회귀(능선)로 부드럽게 만든다. 원인이 아니라 '이런 사람들 중에서는'이라는 단면 관계다.

결과(실측):
  bp   혈압 140/90 이상 또는 혈압약 복용
  dm   공복혈당 126 이상 · 당화혈색소 6.5 이상 · 당뇨약/인슐린 · 당뇨 진단
  alt  간 수치 ALT 40 초과 (B형·C형 간염 양성 제외)
  tg   중성지방 200 이상 (8시간 이상 공복)

설명 변수(성별마다 따로): 나이 (나이−50)/10, (나이−40)+/10, (나이−65)+/10 · 허리 (T−10−w)+, (w−T)+, (w−T−10)+ (5cm 단위, T=남90·여85)
  · BMI (b−23)+, (b−25)+, (b−30)+ · 술 하루 평균 잔(소주잔, 10잔에서 자름)과 (잔−2)+ · 현재 흡연 · 과거 흡연 · 운동 안 함
  · 허리 기준 초과분 × (나이−50)/10 (젊을수록 뱃살 영향이 다를 수 있음)
  허리·BMI·술 기울기는 0 이상으로 제약한다(의학 상식: 커질수록 위험이 내려가지 않음).

검증: 2022–23으로 맞추고 2024로 평가(logloss·AUC, 나이만 쓴 모형과 비교, 10분위 보정). 최종 계수는 3년 전체로.
개인 단위 자료는 파일로 남기지 않는다. 출력은 집계(계수·평가 지표·보정표)뿐이다.

  PYTHONPATH=<pandas 위치> python -X utf8 analysis/similar.py            # 평가 + analysis/results/similar.json
"""
import io, json, math, os, sys, zipfile
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import SAS, FREQ, PER, num, exercise  # 같은 규칙 재사용

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'analysis', 'results', 'similar.json')
OUTCOMES = ['bp', 'dm', 'alt', 'tg']
NAMES = ['age', 'age40', 'age65', 'wLow', 'wT', 'wT10', 'bmi23', 'bmi25', 'bmi30', 'alc', 'alc2', 'smokeNow', 'smokePast', 'noExercise', 'wTxAge']
MONO = {'wT', 'wT10', 'bmi23', 'bmi25', 'bmi30', 'alc', 'alc2'}   # 기울기 ≥ 0 (wLow 는 '기준보다 많이 가늘수록' 항이라 ≤ 0 이어야 같은 뜻 → 아래에서 부호 처리)
NEG = {'wLow'}


def features(sex, age, waist, bmi, glasses, smoke, noex):
    T = 90 if sex == 'M' else 85
    w = min(waist, T + 20)
    b = min(bmi, 35)
    g = min(glasses, 10)
    return [(age - 50) / 10, max(0, age - 40) / 10, max(0, age - 65) / 10,
            max(0, T - 10 - w) / 5, max(0, w - T) / 5, max(0, w - T - 10) / 5,
            max(0, b - 23), max(0, b - 25), max(0, b - 30),
            g, max(0, g - 2), 1.0 if smoke == 'current' else 0.0, 1.0 if smoke == 'past' else 0.0, 1.0 if noex else 0.0, max(0, w - T) / 5 * (age - 50) / 10]


def load():
    rows = []
    for yr in ('22', '23', '24'):
        with zipfile.ZipFile(os.path.join(SAS, f'HN{yr}_ALL(SAS).zip')) as z:
            name = next(n for n in z.namelist() if n.lower().endswith('.sas7bdat'))
            df = pd.read_sas(io.BytesIO(z.read(name)), format='sas7bdat', encoding='latin1')
        for r in df.to_dict('records'):
            age, sex, h, wt_, wc, wgt = num(r, 'age'), r.get('sex'), num(r, 'HE_ht'), num(r, 'HE_wt'), num(r, 'HE_wc'), num(r, 'wt_itvex')
            if age is None or age < 19 or sex not in (1, 2) or not wgt or wgt <= 0 or not h or not wt_ or not wc: continue
            if num(r, 'HE_dprg') is not None or r.get('HE_prg') == 1: continue
            b1, b3 = r.get('BS1_1'), r.get('BS3_1')
            smoke = 'current' if b1 == 2 and b3 in (1, 2) else 'past' if b1 == 2 and b3 == 3 else 'never' if b1 in (1, 3) else None
            f = r.get('BD1_11')
            if smoke is None or f not in FREQ: continue
            per = 0.0
            if FREQ[f] > 0:
                exact = num(r, 'BD2_14')
                per = exact if exact is not None and 0 < exact < 888 else PER.get(r.get('BD2_1'))
                if per is None: continue
            ex = exercise(r)
            if ex is None: continue
            s = 'M' if sex == 1 else 'F'
            x = features(s, age, wc, wt_ / (h / 100) ** 2, FREQ[f] * per / 7, smoke, not ex)
            sbp, dbp, glu, a1c, fst = num(r, 'HE_sbp'), num(r, 'HE_dbp'), num(r, 'HE_glu'), num(r, 'HE_HbA1c'), num(r, 'HE_fst')
            alt, tg = num(r, 'HE_alt'), num(r, 'HE_TG')
            medh, ins, medd, dgdm = r.get('DI1_2'), r.get('DE1_31'), r.get('DE1_32'), r.get('DE1_dg')
            fasting = fst is not None and fst >= 8
            y = {}
            if sbp and dbp and medh in (1, 2, 3, 4, 5, 8): y['bp'] = int(sbp >= 140 or dbp >= 90 or medh in (1, 2, 3, 4))
            if glu and a1c and fasting and ins in (0, 1, 8) and medd in (0, 1, 8) and dgdm in (0, 1):
                y['dm'] = int(glu >= 126 or a1c >= 6.5 or ins == 1 or medd == 1 or dgdm == 1)
            if alt is not None and r.get('HE_hepaB') in (0, 1) and r.get('HE_hepaC') in (0, 1):
                if r['HE_hepaB'] == 0 and r['HE_hepaC'] == 0: y['alt'] = int(alt > 40)
            if tg is not None and fasting: y['tg'] = int(tg >= 200)
            rows.append((int(r['year']), s, wgt, x, y, wc))
    return rows


def fit(X, y, w, lam=1.0):
    """가중 로지스틱 회귀(능선, 절편 제외) + 부호 제약(위반한 항은 0으로 두고 다시 맞춤)"""
    p = X.shape[1]
    fixed = set()
    for _ in range(p):
        beta = np.zeros(p + 1)
        Z = np.hstack([np.ones((len(X), 1)), X])
        keep = [0] + [k + 1 for k in range(p) if k not in fixed]
        Zk = Z[:, keep]
        b = np.zeros(len(keep))
        b[0] = math.log(max(1e-6, np.average(y, weights=w)) / max(1e-6, 1 - np.average(y, weights=w)))
        R = np.eye(len(keep)) * lam
        R[0, 0] = 0
        for _ in range(100):
            eta = Zk @ b
            mu = 1 / (1 + np.exp(-eta))
            W = w * mu * (1 - mu)
            g = Zk.T @ (w * (y - mu)) - R @ b
            H = (Zk * W[:, None]).T @ Zk + R
            step = np.linalg.solve(H, g)
            b += step
            if np.max(np.abs(step)) < 1e-8: break
        beta[keep] = b
        bad = [k for k in range(p) if k not in fixed and ((NAMES[k] in MONO and beta[k + 1] < 0) or (NAMES[k] in NEG and beta[k + 1] > 0))]
        if not bad: return beta
        fixed.add(bad[0])
    return beta


def predict(beta, X):
    return 1 / (1 + np.exp(-(beta[0] + X @ beta[1:])))


def logloss(p, y, w):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return float(-np.average(y * np.log(p) + (1 - y) * np.log(1 - p), weights=w))


def auc(p, y, w):
    o = np.argsort(p)
    p, y, w = p[o], y[o], w[o]
    pos, neg = w * y, w * (1 - y)
    cneg = np.cumsum(neg) - neg / 2
    return float(np.sum(pos * cneg) / (pos.sum() * neg.sum()))


def deciles(p, y, w):
    o = np.argsort(p)
    p, y, w = p[o], y[o], w[o]
    cw = np.cumsum(w) / w.sum()
    out = []
    for d in range(10):
        m = (cw > d / 10) & (cw <= (d + 1) / 10)
        if m.sum(): out.append([round(float(np.average(p[m], weights=w[m])) * 100, 1), round(float(np.average(y[m], weights=w[m])) * 100, 1), int(m.sum())])
    return out


def main():
    rows = load()
    report = {'source': '국민건강영양조사 제9기(2022–2024) 원시자료, 질병관리청', 'features': NAMES, 'n': len(rows), 'models': {}}
    for oc in OUTCOMES:
        for s in ('M', 'F'):
            sub = [(yr, wgt, x, y[oc], wc) for yr, sx, wgt, x, y, wc in rows if sx == s and oc in y]
            yr = np.array([r[0] for r in sub]); W = np.array([r[1] for r in sub]); X = np.array([r[2] for r in sub]); Y = np.array([r[3] for r in sub], float)
            tr, te = yr <= 2023, yr == 2024
            full = fit(X[tr], Y[tr], W[tr] / 2)
            base = fit(X[tr][:, :3], Y[tr], W[tr] / 2)
            pt, pb = predict(full, X[te]), predict(base, X[te][:, :3])
            final = fit(X, Y, W / 3)
            report['models'][f'{oc}.{s}'] = {
                'n': int(len(Y)), 'nTrain': int(tr.sum()), 'nTest': int(te.sum()), 'rate': round(float(np.average(Y, weights=W)) * 100, 1),
                'test': {'logloss': round(logloss(pt, Y[te], W[te]), 4), 'loglossAgeOnly': round(logloss(pb, Y[te], W[te]), 4),
                         'auc': round(auc(pt, Y[te], W[te]), 3), 'aucAgeOnly': round(auc(pb, Y[te], W[te]), 3), 'deciles': deciles(pt, Y[te], W[te])},
                'coef': {'intercept': round(float(final[0]), 5), **{k: round(float(v), 5) for k, v in zip(NAMES, final[1:])}},
            }
            # 칸별 대조 (전체 자료, 최종 계수): 나이대 × 허리 5cm. 30명 미만 칸은 내지 않는다
            pf = predict(final, X)
            ages = X[:, 0] * 10 + 50
            T = 90 if s == 'M' else 85
            wc = np.array([r[4] for r in sub])
            cells = []
            for lo in (30, 40, 50, 60, 70):
                for wlo in range(T - 10, T + 25, 5):
                    m_ = (ages >= lo) & (ages < lo + 10) & (wc >= wlo) & (wc < wlo + 5)
                    if m_.sum() >= 30:
                        cells.append([f'{lo}대', f'허리 {wlo}–{wlo + 4}', int(m_.sum()), round(float(np.average(pf[m_], weights=W[m_])) * 100, 1), round(float(np.average(Y[m_], weights=W[m_])) * 100, 1)])
            report['models'][f'{oc}.{s}']['cells'] = cells
            m = report['models'][f'{oc}.{s}']
            print(f"{oc}.{s} n={m['n']} 비율 {m['rate']}% | 2024 logloss {m['test']['logloss']} (나이만 {m['test']['loglossAgeOnly']}) AUC {m['test']['auc']} (나이만 {m['test']['aucAgeOnly']})")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f: json.dump(report, f, ensure_ascii=False, indent=1)
    print('저장', OUT)


if __name__ == '__main__':
    main()
