/* 1mincheck design bundle — 자동 생성 파일. 직접 고치지 말고 src/sampleData.ts 또는 engine 을 고친 뒤 다시 빌드 */
(function () {
/* ── engine/src/engine.ts (타입만 제거) ── */
const P = {
    "bands": [
        "19-29",
        "30-39",
        "40-49",
        "50-59",
        "60-69",
        "70+"
    ],
    "_src": "KDCA 2025 국민건강영양조사 [별첨] 주요결과 (2026-09-30, 2025 잠정치). pooled = 2023-2025 단순평균",
    "htn": {
        "byYear": {
            "M": {
                "2023": [
                    2.8,
                    8.6,
                    23.5,
                    38.8,
                    51.0,
                    68.4
                ],
                "2024": [
                    4.9,
                    13.2,
                    27.8,
                    41.6,
                    56.4,
                    59.4
                ],
                "2025": [
                    3.2,
                    16.4,
                    31.5,
                    47.0,
                    53.4,
                    64.1
                ]
            },
            "F": {
                "2023": [
                    0.0,
                    3.5,
                    10.6,
                    28.6,
                    43.8,
                    68.3
                ],
                "2024": [
                    1.0,
                    4.4,
                    12.9,
                    27.7,
                    46.6,
                    69.5
                ],
                "2025": [
                    1.6,
                    4.1,
                    13.9,
                    27.7,
                    42.9,
                    71.3
                ]
            }
        },
        "pooled": {
            "M": [
                3.6,
                12.7,
                27.6,
                42.5,
                53.6,
                64.0
            ],
            "F": [
                0.9,
                4.0,
                12.5,
                28.0,
                44.4,
                69.7
            ]
        },
        "lnOR_obese": 0.8475,
        "intercept": {
            "M": [
                -3.7388,
                -2.4408,
                -1.4718,
                -0.7458,
                -0.1697,
                0.3379
            ],
            "F": [
                -4.9499,
                -3.4752,
                -2.2332,
                -1.2235,
                -0.5212,
                0.541
            ]
        },
        "betaWaistPerCm": {
            "M": 0.0553,
            "F": 0.04
        },
        "betaBmiPerUnit": {
            "M": 0.1151,
            "F": 0.0874
        },
        "verified": true
    },
    "chol": {
        "byYear": {
            "M": {
                "2023": [
                    2.8,
                    15.9,
                    22.5,
                    33.3,
                    35.2,
                    32.0
                ],
                "2024": [
                    6.0,
                    16.3,
                    27.5,
                    36.5,
                    42.7,
                    36.5
                ],
                "2025": [
                    5.8,
                    16.5,
                    32.9,
                    45.9,
                    42.2,
                    39.4
                ]
            },
            "F": {
                "2023": [
                    3.7,
                    9.2,
                    16.0,
                    40.1,
                    53.6,
                    53.2
                ],
                "2024": [
                    6.0,
                    12.0,
                    15.0,
                    44.2,
                    58.7,
                    52.3
                ],
                "2025": [
                    5.5,
                    8.6,
                    15.6,
                    41.3,
                    56.9,
                    57.8
                ]
            }
        },
        "pooled": {
            "M": [
                4.9,
                16.2,
                27.6,
                38.6,
                40.0,
                36.0
            ],
            "F": [
                5.1,
                9.9,
                15.5,
                41.9,
                56.4,
                54.4
            ]
        },
        "lnOR_obese": 0.4974,
        "intercept": {
            "M": [
                -3.2097,
                -1.9268,
                -1.2523,
                -0.7234,
                -0.6003,
                -0.7358
            ],
            "F": [
                -3.0495,
                -2.3614,
                -1.849,
                -0.4759,
                0.0911,
                -0.0124
            ]
        },
        "verified": true
    },
    "dm": {
        "byYear": {
            "M": {
                "2023": [
                    2.7,
                    3.2,
                    11.3,
                    21.9,
                    29.3,
                    28.4
                ],
                "2024": [
                    1.2,
                    6.5,
                    13.7,
                    16.6,
                    35.5,
                    34.8
                ],
                "2025": [
                    1.2,
                    2.8,
                    13.8,
                    24.3,
                    31.8,
                    33.9
                ]
            },
            "F": {
                "2023": [
                    0.5,
                    1.7,
                    4.0,
                    12.0,
                    19.3,
                    26.1
                ],
                "2024": [
                    1.2,
                    2.1,
                    4.8,
                    12.5,
                    21.1,
                    28.5
                ],
                "2025": [
                    0.2,
                    2.5,
                    6.9,
                    10.4,
                    18.4,
                    29.1
                ]
            }
        },
        "pooled": {
            "M": [
                1.7,
                4.2,
                12.9,
                20.9,
                32.2,
                32.4
            ],
            "F": [
                0.6,
                2.1,
                5.2,
                11.6,
                19.6,
                27.9
            ]
        },
        "awareness": {
            "30+": 74.7,
            "19-39": 43.3,
            "src": "DMJ 2025 Fact Sheet"
        },
        "verified": true
    },
    "predm": {
        "M": [
            null,
            36.6,
            42.8,
            45.8,
            48.6,
            45.8
        ],
        "F": [
            null,
            21.0,
            28.9,
            43.4,
            50.5,
            48.0
        ],
        "year": "2021-22"
    },
    "dep": {
        "M": [
            4.8,
            4.0,
            3.5,
            2.5,
            2.3,
            1.9
        ],
        "F": [
            8.7,
            8.3,
            5.2,
            5.2,
            3.0,
            4.4
        ],
        "src": "PHWR 2026;19(15)",
        "year": 2024
    },
    "osteo": {
        "bands": [
            "50-59",
            "60-69",
            "70+"
        ],
        "byYear": {
            "M": {
                "2024": [
                    4.1,
                    4.4,
                    4.8
                ],
                "2025": [
                    2.8,
                    4.1,
                    4.5
                ]
            },
            "F": {
                "2024": [
                    12.7,
                    21.5,
                    38.0
                ],
                "2025": [
                    14.3,
                    22.5,
                    33.5
                ]
            }
        },
        "pooled": {
            "M": [
                3.5,
                4.3,
                4.7
            ],
            "F": [
                13.5,
                22.0,
                35.8
            ]
        },
        "verified": true
    },
    "obesityByAge": {
        "pooled": {
            "M": [
                43.5,
                52.8,
                55.1,
                50.7,
                38.1,
                30.9
            ],
            "F": [
                21.3,
                26.7,
                27.3,
                29.3,
                34.3,
                38.6
            ]
        },
        "verified": true
    },
    "insomnia": {
        "age": [
            10.9,
            8.8,
            10.8,
            11.9,
            12.0,
            null
        ],
        "sex": {
            "M": 8.7,
            "F": 12.8
        },
        "overall": 10.7
    },
    "sdb": {
        "age": "40-69",
        "ahi5": {
            "M": 27,
            "F": 16
        },
        "osas": {
            "M": 4.5,
            "F": 3.2
        },
        "year": 2004
    },
    "obesity": {
        "M": 48.8,
        "F": 26.2,
        "rr": {
            "htn": 1.9,
            "dm": 1.9,
            "chol": 1.45
        }
    },
    "dmModel": {
        "intercept": -5.608,
        "age": {
            "35-44": 1.068,
            "45+": 1.305
        },
        "fam": 0.621,
        "htn": 0.417,
        "waist": {
            "mid": 0.779,
            "high": 1.161,
            "cut": {
                "M": [
                    84,
                    90
                ],
                "F": [
                    77,
                    84
                ]
            }
        },
        "smoke": 0.386,
        "alc": {
            "1": 0.493,
            "2": 0.795
        }
    },
    "lr": {
        "phq2": [
            10.4,
            0.185
        ],
        "phq9": [
            7.33,
            0.136
        ],
        "osta": [
            2.79,
            0.177
        ]
    },
    "nafldPeer": {
        "M": {
            "19-34": 36.9,
            "35-49": 38.8,
            "50-64": 31.8,
            "60+": 14.1,
            "all": 30.7
        },
        "F": {
            "all": 21.6
        },
        "def": "HSI>36",
        "year": "2016-18"
    },
    "nafldScore": {
        "M": {
            "age35": 2,
            "waist": {
                "cuts": [
                    80,
                    90,
                    100
                ],
                "pts": [
                    0,
                    2,
                    3,
                    4
                ]
            },
            "bmi": {
                "cuts": [
                    23,
                    25,
                    27
                ],
                "pts": [
                    0,
                    1,
                    2,
                    3
                ]
            },
            "dm": 2,
            "dys": 2,
            "alcohol": 1,
            "noExercise": 1
        },
        "F": {
            "age35": 2,
            "waist": {
                "cuts": [
                    75,
                    85,
                    95
                ],
                "pts": [
                    0,
                    1,
                    2,
                    3
                ]
            },
            "bmi": {
                "cuts": [
                    23,
                    25,
                    27
                ],
                "pts": [
                    0,
                    2,
                    3,
                    4
                ]
            },
            "dm": 2,
            "dys": 2,
            "noExercise": 1,
            "menopause": 1
        },
        "highRisk": 8,
        "prevByScore": {
            "scores": [
                "<=2",
                3,
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                ">=12"
            ],
            "M": [
                5.9,
                7.5,
                13.8,
                18.8,
                28.9,
                40.1,
                49.1,
                60.2,
                71.9,
                80.7,
                88.1
            ],
            "F": [
                1.0,
                1.2,
                3.9,
                6.4,
                11.0,
                21.0,
                27.0,
                37.7,
                47.5,
                59.1,
                66.2
            ],
            "note": "외부검증 코호트 Fig1B, 원본 4637px 이미지 픽셀 추출 ±0.3%p"
        }
    },
    "gerd": {
        "peerRange": [
            3.5,
            7.1
        ],
        "gerdq": {
            "reverse": [
                "gq3",
                "gq4"
            ],
            "cut": 8,
            "sens": 64.9,
            "spec": 71.4
        },
        "eeOR": {
            "bmi25": 1.42,
            "smoke": 1.54,
            "alcohol": 1.34,
            "src": "JKMS 2011;26:642"
        }
    },
    "sarcopenia65": {
        "all": 9.4,
        "M": 9.5,
        "F": 9.3,
        "year": 2024
    },
    "anxiety1y": {
        "all": 5.7,
        "M": 3.8,
        "F": 7.5,
        "year": 2016,
        "note": "불안장애 전체"
    },
    "diet": {
        "khei": {
            "all": 58.6,
            "M": 57.6,
            "F": 59.6,
            "20s": 50.3,
            "30s": 52.8,
            "60s": 65.2,
            "70+": 66.1
        },
        "breakfastSkip": {
            "19-29": 59.2,
            "30-49": 41.9,
            "50-64": 20.4,
            "65+": 6.4,
            "year": 2022
        },
        "sodium": {
            "mean": 3043,
            "goal": 2300,
            "year": 2025
        },
        "fruitVeg500": {
            "M": 23.4,
            "F": 17.7,
            "20sM": 10.6,
            "20sF": 7.5,
            "year": 2025
        }
    }
};
const expit = (z)=>1 / (1 + Math.exp(-z));
const logit = (p)=>Math.log(p / (1 - p));
const round1 = (x)=>Math.round(x * 10) / 10;
const bayes = (p, lr)=>{
    const o = p / (1 - p) * lr;
    return o / (1 + o);
};
function band(age) {
    if (age < 19) throw new Error('19세 이상만 계산합니다');
    return age < 30 ? 0 : age < 40 ? 1 : age < 50 ? 2 : age < 60 ? 3 : age < 70 ? 4 : 5;
}
const bmiOf = (i)=>i.weightKg / (i.heightCm / 100) ** 2;
function ratioLabel(p1, p0) {
    const r = p1 / p0;
    return r < 0.8 ? '낮음' : r < 1.25 ? '비슷' : r < 2 ? '높음' : '매우 높음';
}
const rng = (xs)=>[
        round1(Math.min(...xs)),
        round1(Math.max(...xs))
    ];
const DMM = P.dmModel;
const alcCat = (a)=>a === 'd1_4' ? 1 : a === 'd5' ? 2 : 0;
const htnFlag = (i)=>i.dx.htn || i.bp === 'high';
function dmWaistCat(sex, waist) {
    const [mid, high] = DMM.waist.cut[sex];
    return waist < mid ? 0 : waist < high ? 1 : 2;
}
function dmCalc(i, wc) {
    const ageB = i.age >= 45 ? DMM.age['45+'] : i.age >= 35 ? DMM.age['35-44'] : 0;
    const ageP = i.age >= 45 ? 3 : i.age >= 35 ? 2 : 0;
    const a = alcCat(i.alcohol);
    const lp = DMM.intercept + ageB + (i.famDM ? DMM.fam : 0) + (htnFlag(i) ? DMM.htn : 0) + [
        0,
        DMM.waist.mid,
        DMM.waist.high
    ][wc] + (i.smoke === 'current' ? DMM.smoke : 0) + (a === 1 ? DMM.alc['1'] : a === 2 ? DMM.alc['2'] : 0);
    const pts = ageP + (i.famDM ? 1 : 0) + (htnFlag(i) ? 1 : 0) + [
        0,
        2,
        3
    ][wc] + (i.smoke === 'current' ? 1 : 0) + a;
    return {
        p: 100 * expit(lp),
        pts
    };
}
function diabetes(i) {
    const b = band(i.age);
    const peer = P.dm.pooled[i.sex][b];
    const base = {
        id: 'dm',
        name: '숨은 당뇨',
        type: 'A',
        unit: '%',
        peer
    };
    if (i.dx.dm) return {
        ...base,
        status: 'managed',
        value: null
    };
    if (i.waistCm == null) {
        const all = [
            0,
            1,
            2
        ].map((w)=>dmCalc(i, w));
        return {
            ...base,
            status: 'ok',
            value: null,
            range: rng(all.map((x)=>x.p)),
            notes: [
                '허리둘레를 입력하면 정확해져요'
            ]
        };
    }
    const r = dmCalc(i, dmWaistCat(i.sex, i.waistCm));
    return {
        ...base,
        status: 'ok',
        value: round1(r.p),
        score: r.pts,
        category: r.pts >= 5 ? '고위험' : '저위험',
        ratioLabel: ratioLabel(r.p, peer),
        notes: [
            '동년배 값은 진단된 당뇨 포함 유병률, 내 값은 "진단 안 된 당뇨" 확률',
            '상대 오차 ±약 25%'
        ]
    };
}
function calibratedLogit(kind, i) {
    const T = P[kind];
    const obese = bmiOf(i) >= 25;
    return T.intercept[i.sex][band(i.age)] + (obese ? T.lnOR_obese : 0);
}
function hypertension(i) {
    const peer = P.htn.pooled[i.sex][band(i.age)];
    const base = {
        id: 'htn',
        name: '고혈압',
        type: 'B',
        unit: '%',
        peer
    };
    if (i.dx.htn) return {
        ...base,
        status: 'managed',
        value: null
    };
    if (i.bp === 'high') return {
        ...base,
        status: 'criteria',
        value: null,
        notes: [
            '측정 혈압이 고혈압 기준에 해당해요. 재측정·진료 권장'
        ]
    };
    const p = 100 * expit(calibratedLogit('htn', i));
    return {
        ...base,
        status: 'ok',
        value: round1(p),
        ratioLabel: ratioLabel(p, peer),
        flags: i.bp === 'elevated' ? [
            '주의 혈압'
        ] : []
    };
}
function cholesterol(i) {
    const peer = P.chol.pooled[i.sex][band(i.age)];
    const base = {
        id: 'chol',
        name: '고콜레스테롤혈증',
        type: 'B',
        unit: '%',
        peer
    };
    if (i.dx.chol) return {
        ...base,
        status: 'managed',
        value: null
    };
    const p = 100 * expit(calibratedLogit('chol', i));
    return {
        ...base,
        status: 'ok',
        value: round1(p),
        ratioLabel: ratioLabel(p, peer),
        notes: [
            '혈액검사로만 확인 가능 → 국가건강검진'
        ]
    };
}
function hypertensionWhatIf(before, after) {
    const r = hypertension(before);
    if (r.status !== 'ok' || r.value == null) return null;
    const T = P.htn;
    const d = before.waistCm != null && after.waistCm != null ? T.betaWaistPerCm[before.sex] * (after.waistCm - before.waistCm) : T.betaBmiPerUnit[before.sex] * (bmiOf(after) - bmiOf(before));
    return round1(100 * expit(logit(r.value / 100) + d));
}
function obesity(i) {
    const bmi = bmiOf(i);
    const cat = bmi < 18.5 ? '저체중' : bmi < 23 ? '정상' : bmi < 25 ? '비만 전단계' : bmi < 30 ? '1단계 비만' : bmi < 35 ? '2단계 비만' : '3단계 비만';
    const abd = i.waistCm == null ? null : i.waistCm >= (i.sex === 'M' ? 90 : 85);
    const toBmi25 = 24.99 * (i.heightCm / 100) ** 2;
    return {
        id: 'obesity',
        name: '비만·복부비만',
        type: 'C',
        status: 'ok',
        unit: 'bmi',
        value: round1(bmi),
        category: cat,
        peer: P.obesityByAge.pooled[i.sex][band(i.age)],
        flags: abd == null ? [
            '허리 모름'
        ] : abd ? [
            '복부비만'
        ] : [],
        notes: [
            `BMI 25 미만 체중: ${round1(toBmi25)}kg 이하`
        ]
    };
}
function stopBang(i) {
    const base = {
        id: 'osa',
        name: '수면무호흡',
        type: 'C',
        unit: 'score'
    };
    if (!i.sleep) return {
        ...base,
        status: 'needs_input',
        value: null
    };
    const s = i.sleep, bmi = bmiOf(i);
    const S = +s.snore, T = +s.tired, O = +s.apnea, Pp = +htnFlag(i);
    const B = +(bmi > 35), A = +(i.age > 50), N = +s.neck, G = +(i.sex === 'M');
    const score = S + T + O + Pp + B + A + N + G;
    let cat = score <= 2 ? '저위험' : score >= 5 ? '고위험' : S + T + O + Pp >= 2 && (G || B || N) ? '고위험' : '중위험';
    const peer = i.age >= 40 && i.age <= 69 ? P.sdb.ahi5[i.sex] : null;
    return {
        ...base,
        status: 'ok',
        value: score,
        score,
        category: cat,
        peer,
        notes: [
            '점수가 낮으면 안심에 유용, 높다고 확정은 아님(특이도 낮음)'
        ]
    };
}
function insomnia(i) {
    const base = {
        id: 'isi',
        name: '불면',
        type: 'C',
        unit: 'score'
    };
    if (!i.sleep) return {
        ...base,
        status: 'needs_input',
        value: null
    };
    const I = P.insomnia, b = Math.min(band(i.age), 4);
    const peer = round1(I.age[b] * (I.sex[i.sex] / I.overall));
    if (!i.sleep.insGate) return {
        ...base,
        status: 'ok',
        value: 0,
        score: 0,
        category: '뚜렷한 불면 증상 없음',
        peer
    };
    const isi = i.sleep.isi;
    if (!isi || isi.length !== 7) return {
        ...base,
        status: 'needs_input',
        value: null,
        peer
    };
    const sc = isi.reduce((a, b)=>a + b, 0);
    const cat = sc <= 7 ? '해당 없음' : sc <= 14 ? '경계' : sc <= 21 ? '중등도' : '심함';
    return {
        ...base,
        status: 'ok',
        value: sc,
        score: sc,
        category: cat,
        peer,
        notes: i.age >= 70 ? [
            '70세 이상 동년배 값은 60대 값으로 추정'
        ] : []
    };
}
function depression(i) {
    const base = {
        id: 'dep',
        name: '우울',
        type: 'B',
        unit: '%'
    };
    if (!i.mind) return {
        ...base,
        status: 'needs_input',
        value: null
    };
    const p0 = P.dep[i.sex][band(i.age)] / 100;
    const phq = i.mind.phq;
    const flags = phq.length === 9 && phq[8] >= 1 ? [
        'CRISIS'
    ] : [];
    let post, score, category;
    if (phq.length === 9) {
        score = phq.reduce((a, b)=>a + b, 0);
        post = bayes(p0, score >= 10 ? P.lr.phq9[0] : P.lr.phq9[1]);
        category = score <= 4 ? '최소' : score <= 9 ? '경도' : score <= 14 ? '중등도' : score <= 19 ? '중등도-중증' : '중증';
    } else {
        score = phq[0] + phq[1];
        post = bayes(p0, score >= 3 ? P.lr.phq2[0] : P.lr.phq2[1]);
        category = score >= 3 ? 'PHQ-2 양성' : 'PHQ-2 음성';
    }
    return {
        ...base,
        status: 'ok',
        value: round1(100 * post),
        score,
        category,
        peer: p0 * 100,
        ratioLabel: ratioLabel(post, p0),
        flags
    };
}
function anxiety(i) {
    const base = {
        id: 'gad',
        name: '불안',
        type: 'C',
        unit: 'score'
    };
    if (!i.mind) return {
        ...base,
        status: 'needs_input',
        value: null
    };
    const sc = i.mind.gad[0] + i.mind.gad[1];
    return {
        ...base,
        status: 'ok',
        value: sc,
        score: sc,
        category: sc >= 3 ? '선별 양성' : '선별 음성',
        peer: P.anxiety1y[i.sex],
        notes: [
            '동년배 값은 불안장애 전체 1년 유병률(2016)'
        ]
    };
}
const osta = (weightKg, age)=>Math.trunc((weightKg - age) * 0.2);
function osteoporosis(i) {
    const base = {
        id: 'osteo',
        name: '골다공증',
        type: 'B',
        unit: '%'
    };
    if (i.age < 50) return {
        ...base,
        status: 'na',
        value: null,
        notes: [
            '50세 이상부터 계산'
        ]
    };
    const b = i.age < 60 ? 0 : i.age < 70 ? 1 : 2;
    const p0 = P.osteo.pooled[i.sex][b] / 100;
    const o = osta(i.weightKg, i.age);
    const category = o > -1 ? '저위험' : o >= -4 ? '중간위험' : '고위험';
    if (i.sex === 'M') return {
        ...base,
        status: 'ok',
        value: round1(p0 * 100),
        score: o,
        category,
        peer: p0 * 100,
        notes: [
            '남성은 동년배 유병률만 표시'
        ]
    };
    const post = bayes(p0, o <= -1 ? P.lr.osta[0] : P.lr.osta[1]);
    return {
        ...base,
        status: 'ok',
        value: round1(100 * post),
        score: o,
        category,
        peer: round1(p0 * 100),
        ratioLabel: ratioLabel(post, p0)
    };
}
const NS = P.nafldScore;
function nafldScoreWith(i, waist, exercise, meno) {
    const S = NS[i.sex];
    const bmi = bmiOf(i);
    const cut = (v, c, pts)=>pts[c.filter((x)=>v >= x).length];
    let s = (i.age >= 35 ? S.age35 : 0) + cut(waist, S.waist.cuts, S.waist.pts) + cut(bmi, S.bmi.cuts, S.bmi.pts) + (i.dx.dm ? S.dm : 0) + (i.dx.chol ? S.dys : 0) + (exercise ? 0 : S.noExercise);
    if (i.sex === 'M') s += i.alcohol !== 'none' ? S.alcohol : 0;
    else s += meno ? S.menopause : 0;
    return s;
}
const nafldProb = (sex, score)=>NS.prevByScore[sex][Math.min(Math.max(score, 2), 12) - 2];
function nafld(i) {
    const base = {
        id: 'nafld',
        name: '지방간',
        type: "A'",
        unit: '%',
        peer: i.sex === 'M' ? P.nafldPeer.M.all : P.nafldPeer.F.all
    };
    if (i.alcohol === 'd5') return {
        ...base,
        status: 'excluded',
        value: null,
        notes: [
            '과음: 알코올성 간질환 가능성 → 이 도구 대상 아님, 진료 권장'
        ]
    };
    const waists = i.waistCm != null ? [
        i.waistCm
    ] : i.sex === 'M' ? [
        70,
        85,
        95,
        105
    ] : [
        70,
        80,
        90,
        100
    ];
    const exs = i.exercise == null ? [
        true,
        false
    ] : [
        i.exercise
    ];
    const menos = i.sex === 'F' ? i.meno == null ? [
        false,
        true
    ] : [
        i.meno
    ] : [
        false
    ];
    const scores = [];
    for (const w of waists)for (const e of exs)for (const m of menos)scores.push(nafldScoreWith(i, w, e, m));
    if (scores.length === 1) {
        const s = scores[0], p = nafldProb(i.sex, s);
        return {
            ...base,
            status: 'ok',
            value: p,
            score: s,
            category: s >= 8 ? '고위험' : '저위험',
            ratioLabel: ratioLabel(p, base.peer)
        };
    }
    return {
        ...base,
        status: 'ok',
        value: null,
        range: rng(scores.map((s)=>nafldProb(i.sex, s))),
        notes: [
            '허리·운동·폐경 여부를 입력하면 하나의 값으로 좁혀져요'
        ]
    };
}
function gerd(i) {
    const base = {
        id: 'gerd',
        name: '위식도역류',
        type: 'C',
        unit: 'score',
        peer: null
    };
    if (!i.gerd) return {
        ...base,
        status: 'needs_input',
        value: null
    };
    if (!i.gerd.gate) return {
        ...base,
        status: 'ok',
        value: null,
        category: '역류 증상 없음'
    };
    const g = i.gerd.gq;
    if (!g || g.length !== 6) return {
        ...base,
        status: 'needs_input',
        value: null
    };
    const rev = (x)=>3 - x;
    const sc = g[0] + g[1] + rev(g[2]) + rev(g[3]) + g[4] + g[5];
    return {
        ...base,
        status: 'ok',
        value: sc,
        score: sc,
        category: sc >= 8 ? '가능성 높음' : '가능성 낮음',
        notes: [
            '한국 성인 약 4~7%가 주 1회 이상 증상'
        ]
    };
}
function gerdRelativeChange(before, after) {
    const O = P.gerd.eeOR;
    const f = (i)=>(bmiOf(i) >= 25 ? O.bmi25 : 1) * (i.smoke === 'current' ? O.smoke : 1) * (i.alcohol !== 'none' ? O.alcohol : 1);
    return f(after) / f(before);
}
function diet(i) {
    const base = {
        id: 'diet',
        name: '식생활',
        type: 'D',
        unit: 'score',
        peer: null
    };
    if (!i.diet || i.diet.length !== 7) return {
        ...base,
        status: 'needs_input',
        value: null
    };
    const v = Math.round(i.diet.reduce((a, b)=>a + b, 0) / 14 * 100);
    const names = [
        '아침식사',
        '잡곡',
        '과일',
        '채소',
        '우유·유제품',
        '나트륨(짠 음식)',
        '당류·음료'
    ];
    return {
        ...base,
        status: 'ok',
        value: v,
        score: v,
        category: v >= 75 ? '양호' : v >= 50 ? '보통' : '개선 필요',
        flags: i.diet.map((x, k)=>x === 0 ? names[k] : '').filter(Boolean),
        notes: [
            '검증되지 않은 참고 지표'
        ]
    };
}
function runAll(i) {
    return [
        diabetes,
        hypertension,
        cholesterol,
        obesity,
        nafld,
        stopBang,
        insomnia,
        depression,
        anxiety,
        osteoporosis,
        gerd,
        diet
    ].map((f)=>f(i));
}
function whatIf(before, after) {
    const val = (r)=>r.value ?? null;
    return [
        {
            id: 'dm',
            before: val(diabetes(before)),
            after: val(diabetes(after))
        },
        {
            id: 'htn',
            before: val(hypertension(before)),
            after: hypertensionWhatIf(before, after)
        },
        {
            id: 'chol',
            before: val(cholesterol(before)),
            after: val(cholesterol(after))
        },
        {
            id: 'obesity',
            before: val(obesity(before)),
            after: val(obesity(after))
        },
        {
            id: 'nafld',
            before: val(nafld(before)),
            after: val(nafld(after))
        },
        {
            id: 'osa',
            before: val(stopBang(before)),
            after: val(stopBang(after))
        }
    ];
}

/* ── src/sampleData.ts ── */
const base49F = {
    age: 49,
    sex: 'F',
    heightCm: 160,
    weightKg: 62,
    waistCm: 81.3,
    smoke: 'never',
    alcohol: 'none',
    famDM: false,
    dx: {
        htn: false,
        dm: false,
        chol: false
    },
    bp: 'unknown',
    exercise: true,
    meno: false
};
const aModules = {
    sleep: {
        snore: false,
        tired: true,
        apnea: false,
        neck: false,
        insGate: true,
        isi: [
            2,
            1,
            2,
            2,
            1,
            2,
            1
        ]
    },
    mind: {
        phq: [
            1,
            1
        ],
        gad: [
            1,
            1
        ]
    },
    gerd: {
        gate: true,
        gq: [
            1,
            0,
            0,
            0,
            0,
            0
        ]
    },
    diet: [
        2,
        1,
        1,
        1,
        0,
        1,
        2
    ]
};
const bModules = {
    sleep: {
        snore: false,
        tired: true,
        apnea: false,
        neck: false,
        insGate: true,
        isi: [
            3,
            3,
            2,
            3,
            2,
            3,
            2
        ]
    },
    mind: {
        phq: [
            2,
            2
        ],
        gad: [
            1,
            1
        ]
    },
    gerd: {
        gate: true,
        gq: [
            2,
            2,
            0,
            1,
            1,
            0
        ]
    },
    diet: [
        2,
        1,
        1,
        1,
        0,
        1,
        2
    ]
};
const cInput = {
    ...base49F,
    weightKg: 54,
    waistCm: 72,
    bp: 'normal',
    sleep: {
        snore: false,
        tired: false,
        apnea: false,
        neck: false,
        insGate: false
    },
    mind: {
        phq: [
            0,
            0
        ],
        gad: [
            0,
            0
        ]
    },
    gerd: {
        gate: false
    },
    diet: [
        2,
        2,
        2,
        2,
        2,
        2,
        2
    ]
};
const samples = [
    {
        id: 'A',
        label: 'A · 기본',
        desc: '49세 여성 · 요청하신 예시 사용자',
        date: '2026.09.30',
        input: {
            ...base49F,
            ...aModules
        },
        scenario: {
            weightKg: -4,
            waistCm: -5
        },
        previous: {
            date: '2026.06.30',
            input: {
                ...base49F,
                ...aModules,
                weightKg: 65,
                waistCm: 85.5,
                exercise: false
            }
        }
    },
    {
        id: 'B',
        label: 'B · 증상 있음',
        desc: '49세 여성 · 불면·우울 선별·역류 양성',
        date: '2026.09.30',
        input: {
            ...base49F,
            ...bModules
        },
        scenario: {
            weightKg: -4,
            waistCm: -5
        },
        previous: {
            date: '2026.06.30',
            input: {
                ...base49F,
                ...bModules,
                weightKg: 65,
                waistCm: 85.5,
                exercise: false
            }
        }
    },
    {
        id: 'C',
        label: 'C · 모두 양호',
        desc: '49세 여성 · 모든 항목 정상 범위',
        date: '2026.09.30',
        input: cInput,
        scenario: {
            weightKg: 0,
            waistCm: 0
        },
        previous: {
            date: '2026.06.30',
            input: {
                ...cInput,
                weightKg: 55,
                waistCm: 73.5
            }
        }
    }
];
const defaultSampleId = 'A';

/* ── 예시 사용자 전환 (화면 간 공유) ── */
var KEY = '1mincheck.sample';
function getSel() {
  var id = null;
  try { id = window.localStorage.getItem(KEY); } catch (e) {}
  if (!id && window.__oneminSel) id = window.__oneminSel;
  return samples.some(function (s) { return s.id === id; }) ? id : defaultSampleId;
}
function setSel(id) {
  window.__oneminSel = id;
  try { window.localStorage.setItem(KEY, id); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('onemin-sample', { detail: id })); } catch (e) {}
}
function subscribe(fn) {
  var h = function () { fn(getSel()); };
  window.addEventListener('onemin-sample', h);
  window.addEventListener('storage', h);
  return function () { window.removeEventListener('onemin-sample', h); window.removeEventListener('storage', h); };
}
function sample(id) { var k = id || getSel(); return samples.filter(function (s) { return s.id === k; })[0] || samples[0]; }
function applyScenario(input, sc) {
  return Object.assign({}, input, { weightKg: input.weightKg + sc.weightKg,
    waistCm: input.waistCm == null ? null : Math.round((input.waistCm + sc.waistCm) * 10) / 10 });
}
/* ── design/view.js (화면용 가공) ── */
/* 화면용 가공(표시 문구·막대 비율 등). 계산은 runAll()·whatIf() 호출 결과만 쓴다.
   build-bundle.mjs 가 engine·sampleData 뒤에 이 파일을 이어 붙인다. */
var NAMES = { dm: '숨은 당뇨', htn: '고혈압', chol: '고콜레스테롤', obesity: '비만', nafld: '지방간', osa: '수면무호흡',
  isi: '불면', dep: '우울', gad: '불안', osteo: '골다공증', gerd: '위식도역류', diet: '식생활' };
var BADGE = { A: '모형 확률', "A'": '점수표 확률', B: '추정', C: '점수 등급', D: '참고 지표' };
var INK = '#163300', LOOK = '#0b4c72', LOW_BG = '#e2f6d5', SAME_BG = '#f2f4f0', HIGH_BG = '#dfeaf1';

function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
function byId(list) { var o = {}; list.forEach(function (r) { o[r.id] = r; }); return o; }
function groupLabel(inp) { var d = Math.min(70, Math.max(20, Math.floor(inp.age / 10) * 10)); return (d === 70 ? '70대 이상' : d + '대') + ' ' + (inp.sex === 'F' ? '여성' : '남성'); }
function hasScenario(s) { return !!(s.scenario && (s.scenario.weightKg || s.scenario.waistCm)); }
function scenarioText(s) {
  var p = [];
  if (s.scenario.waistCm) p.push('허리 ' + (s.scenario.waistCm > 0 ? '+' : '−') + Math.abs(s.scenario.waistCm) + 'cm');
  if (s.scenario.weightKg) p.push('체중 ' + (s.scenario.weightKg > 0 ? '+' : '−') + Math.abs(s.scenario.weightKg) + 'kg');
  return p.join(' · ');
}
function ratioStyle(label) {
  return label === '낮음' ? { bg: LOW_BG, fg: INK, col: INK } : label === '비슷' ? { bg: SAME_BG, fg: INK, col: INK } : { bg: HIGH_BG, fg: LOOK, col: LOOK };
}
/** 챙겨볼 항목 판정: strong = '먼저 챙겨볼 것' 카드에 올림 */
function flagOf(r) {
  if (r.status !== 'ok') return null;
  if (r.unit === '%' && (r.ratioLabel === '높음' || r.ratioLabel === '매우 높음')) return 'strong';
  switch (r.id) {
    case 'obesity': return r.category !== '정상' || (r.flags || []).indexOf('복부비만') >= 0 ? 'mild' : null;
    case 'isi': return r.category === '중등도' || r.category === '심함' ? 'strong' : r.category === '경계' ? 'mild' : null;
    case 'osa': return r.category === '고위험' ? 'strong' : r.category === '중위험' ? 'mild' : null;
    case 'gad': return r.category === '선별 양성' ? 'strong' : null;
    case 'gerd': return r.category === '가능성 높음' ? 'strong' : null;
    case 'diet': return r.category === '양호' ? null : 'mild';
  }
  return null;
}
var NEXT = {
  dm: '국가건강검진(20세 이상, 2년마다)에서 공복혈당을 확인해요.',
  htn: '가정이나 보건소에서 혈압을 재 보고, 국가건강검진에서 확인해요.',
  chol: '혈액검사로만 알 수 있어요. 국가건강검진에 포함돼요.',
  nafld: '국가건강검진 간기능 검사와 함께, 운동을 이어가면 좋아요.',
  dep: '정신건강복지센터에서 상담받을 수 있어요. 많이 힘들 땐 언제든 109(24시간).',
  isi: '불면이 계속되면 수면 진료를 받아 보세요. 불면 인지행동치료가 도움이 돼요.',
  osa: '수면다원검사로 확인할 수 있어요. 2018년 7월부터 건강보험이 적용돼요.',
  gad: '불안이 계속되면 정신건강복지센터에서 상담받을 수 있어요.',
  gerd: '증상이 이어지면 소화기내과 진료를 받아 보세요. 식후 바로 눕지 않는 것도 도움이 돼요.'
};

function viewResults(s) {
  var inp = s.input, R = runAll(inp), by = byId(R);
  var sc = hasScenario(s), W = sc ? whatIf(inp, applyScenario(inp, s.scenario)) : [];
  var improved = W.filter(function (w) { return w.before != null && w.after != null && w.after < w.before; });
  var probIds = ['dm', 'htn', 'chol', 'nafld', 'dep'];
  var lower = probIds.filter(function (id) { return by[id].ratioLabel === '낮음'; }).length;
  var flags = R.map(function (r) { return { r: r, f: flagOf(r) }; }).filter(function (x) { return x.f; });
  var strong = flags.filter(function (x) { return x.f === 'strong'; }).map(function (x) {
    var r = x.r;
    var what = r.unit === '%' ? '100명 중 약 ' + Math.round(r.value) + '명 · ' + r.category : r.category + ' · ' + r.score + '점';
    if (r.id === 'dep') what = (r.category || '') + ' · 100명 중 약 ' + Math.round(r.value) + '명';
    return { name: NAMES[r.id], what: what, next: NEXT[r.id] || '' };
  });
  var crisis = R.some(function (r) { return (r.flags || []).indexOf('CRISIS') >= 0; });

  var pctW = W.filter(function (w) { return ['dm', 'htn', 'nafld', 'chol'].indexOf(w.id) >= 0 && w.after < w.before; })
    .sort(function (a, b) { return (a.after / a.before) - (b.after / b.before); }).slice(0, 2);
  var manage = pctW.map(function (w) { return { name: NAMES[w.id], a: f1(w.before), b: f1(w.after) }; });

  var rings = ['dm', 'htn', 'nafld'].map(function (id) {
    var r = by[id], C = 2 * Math.PI * 28;
    if (r.value == null || !r.peer) return { name: NAMES[id], idx: '–', dash: '0 ' + C, label: '–', col: INK };
    var f = r.value / r.peer, st = ratioStyle(r.ratioLabel);
    return { name: NAMES[id], idx: String(Math.round(f * 100)), dash: (C * Math.min(1, f)).toFixed(1) + ' ' + C.toFixed(1), label: r.ratioLabel, col: st.col };
  });

  var vals = []; probIds.forEach(function (id) { var r = by[id]; if (r.value != null) vals.push(r.value); if (r.peer) vals.push(r.peer); });
  var top = Math.max(30, Math.ceil(Math.max.apply(null, vals) * 1.15 / 10) * 10);
  var prob = probIds.map(function (id) {
    var r = by[id], st = ratioStyle(r.ratioLabel);
    var ok = r.status === 'ok' && r.value != null;
    return { name: NAMES[id], badge: BADGE[r.type] + (id === 'dep' ? ' · ' + r.category : ''), ok: ok,
      n: ok ? String(Math.round(r.value)) : '–', pct: ok ? f1(r.value) : (r.range ? r.range[0] + '–' + r.range[1] : '–'),
      peer: r.peer != null ? f1(r.peer) : '–', meW: ok ? (r.value / top * 100).toFixed(1) + '%' : '0%',
      peerX: r.peer != null ? (r.peer / top * 100).toFixed(1) + '%' : '0%', tag: r.ratioLabel || r.status, tagBg: st.bg, tagFg: st.fg, barC: st.col };
  });
  var o = by.osteo;
  var osteo = o.status === 'na' ? { na: true, text: '50세부터 계산해요' } : { na: false, text: '100명 중 약 ' + Math.round(o.value) + '명 · ' + (o.category || '') };

  var S = Math.PI * 48;
  function gauge(id, v, unit, frac, note) {
    var r = by[id], fl = flagOf(r);
    return { name: NAMES[id], v: v, unit: unit, cat: r.category || '–', col: fl ? LOOK : INK, note: note,
      dash: (S * Math.max(0, Math.min(1, frac))).toFixed(1) + ' ' + S.toFixed(1) };
  }
  var ob = by.obesity, isi = by.isi, dt = by.diet, osa = by.osa, gad = by.gad, gd = by.gerd;
  var score = [
    gauge('obesity', f1(ob.value), 'BMI', (ob.value - 15) / 20,
      ob.category === '정상' ? '정상 범위예요' : String((ob.notes || [''])[0]).replace('BMI 25 미만 체중: ', '') + '면 BMI 25 미만'),
    gauge('isi', String(isi.value == null ? '–' : isi.value), 'ISI / 28점', (isi.value || 0) / 28, '동년배 약 ' + isi.peer + '%가 10점 이상'),
    gauge('diet', String(dt.value), '참고 지표 / 100', dt.value / 100, (dt.flags || []).length ? '보완할 점: ' + dt.flags.join(', ') : '골고루 잘 드시고 있어요'),
    gauge('osa', String(osa.value), 'STOP-Bang / 8점', osa.value / 8, osa.category === '저위험' ? '낮을 때 안심하기 좋은 도구' : '높다고 확정은 아니에요'),
    gauge('gad', String(gad.value), 'GAD-2 / 6점', gad.value / 6, gad.category === '선별 양성' ? '2주 넘게 이어지면 상담을 권해요' : '3점부터 자세히 봐요'),
    gauge('gerd', gd.value == null ? '–' : String(gd.value), 'GerdQ / 18점', (gd.value || 0) / 18, gd.value == null ? '성인 약 4~7%가 주 1회 이상 겪어요' : '증상이 계속되면 진료를 받아 보세요')
  ];
  return {
    date: s.date, who: inp.age + '세 ' + (inp.sex === 'F' ? '여성' : '남성') + ' 기준', group: groupLabel(inp),
    lower: lower, improvedN: improved.length, hasManage: sc && improved.length > 0, look: flags.length,
    scenarioText: sc ? scenarioText(s) : '', manage: manage, rings: rings, prob: prob, osteo: osteo, score: score,
    strong: strong, hasStrong: strong.length > 0, crisis: crisis
  };
}

function viewDetailDm(s) {
  var inp = s.input, d = byId(runAll(inp)).dm;
  var sc = hasScenario(s), after = sc ? applyScenario(inp, s.scenario) : inp, dA = byId(runAll(after)).dm;
  var ok = d.status === 'ok' && d.value != null;
  var n = ok ? Math.round(d.value) : 0, m = ok && dA.value != null ? Math.round(dA.value) : n, removed = Math.max(0, n - m);
  var people = []; for (var k = 0; k < 100; k++) people.push({ c: k < Math.min(n, m) ? INK : k < n ? '#9fe870' : '#d3d6d0' });
  var ages = [25, 35, 45, 55, 65, 75], L = ['20대', '30대', '40대', '50대', '60대', '70+'];
  var peers = ages.map(function (a) { return byId(runAll(Object.assign({}, inp, { age: a }))).dm.peer; });
  var mine = Math.min(5, Math.max(0, Math.floor(inp.age / 10) - 2));
  var top = Math.max(30, Math.ceil(Math.max.apply(null, peers) * 1.1 / 10) * 10);
  var bands = peers.map(function (v, k) { return { v: f1(v) + '%', l: L[k], h: (v / top * 100).toFixed(1) + '%', c: k === mine ? INK : '#c2c6be',
    zone: k === mine ? '#eef6e8' : 'transparent', fw: k === mine ? 800 : 500, me: k === mine && ok, meY: ok ? (d.value / top * 100).toFixed(1) + '%' : '0%' }; });
  var sc0 = function (x) { return byId(runAll(x)).dm.score || 0; };
  var total = d.score || 0;
  var parts = [
    ['나이 ' + inp.age + '세', total - sc0(Object.assign({}, inp, { age: 30 }))],
    ['허리둘레 ' + inp.waistCm + 'cm', total - sc0(Object.assign({}, inp, { waistCm: 60 }))],
    ['부모·형제 당뇨', total - sc0(Object.assign({}, inp, { famDM: false }))],
    ['고혈압', total - sc0(Object.assign({}, inp, { dx: Object.assign({}, inp.dx, { htn: false }), bp: 'normal' }))],
    ['현재 흡연', total - sc0(Object.assign({}, inp, { smoke: 'never' }))],
    ['음주', total - sc0(Object.assign({}, inp, { alcohol: 'none' }))]
  ].map(function (p) { return { k: p[0], v: p[1] > 0 ? '+' + p[1] : '0', c: p[1] > 0 ? '#0e0f0c' : '#6a6c6a' }; });
  var drop = (dA.score || 0) - total;
  var st = ratioStyle(d.ratioLabel);
  var sName = scenarioText(s);
  return {
    ok: ok, n: String(n), pct: ok ? f1(d.value) : '–', ratio: d.ratioLabel || '',
    ratioTag: d.ratioLabel === '비슷' ? '동년배와 비슷' : '동년배보다 ' + (d.ratioLabel || ''), ratioBg: st.bg, ratioFg: st.fg, group: groupLabel(inp),
    peer: f1(d.peer), people: people, bands: bands, total: String(total),
    parts: parts, scoreNote: (total >= 5 ? '5점부터는 검진에서 혈당을 한 번 확인해 보길 권하는 구간이에요.' : '선별 기준(5점)보다 낮아요.') +
      (drop < 0 ? ' ' + sName + '이면 ' + (-drop) + '점이 빠져요.' : ''),
    hasManage: sc && dA.value < d.value, scenarioText: sName,
    before: ok ? f1(d.value) : '–', after: dA.value != null ? f1(dA.value) : '–', m: String(m), removed: String(removed),
    legendKeep: removed > 0 ? '관리해도 남는 ' + Math.min(n, m) + '명' : '100명 중 ' + n + '명', legendGone: sName + '이면 빠지는 ' + removed + '명', hasGone: removed > 0,
    headline: d.ratioLabel === '낮음' ? '같은 ' + groupLabel(inp) + '보다 낮은 편이에요.' : d.ratioLabel === '비슷' ? '같은 ' + groupLabel(inp) + '와 비슷해요.' : '같은 ' + groupLabel(inp) + '보다 높은 편이라, 검진으로 한 번 확인해 보면 좋아요.'
  };
}

function viewRecord(s) {
  if (!s.previous) return { has: false };
  var P = byId(runAll(s.previous.input)), N = byId(runAll(s.input));
  var ids = ['nafld', 'htn', 'chol', 'dm', 'dep', 'obesity', 'isi', 'osa', 'gad', 'gerd', 'diet'];
  var rows = [], same = [], down = 0;
  ids.forEach(function (id) {
    var a = P[id], b = N[id];
    if (a.value == null || b.value == null) { same.push(NAMES[id] + ' ' + (b.category || '–')); return; }
    var unit = b.unit === '%' ? '%' : b.unit === 'bmi' ? '' : '점', fmt = function (v) { return b.unit === 'score' ? v + '점' : f1(v) + unit; };
    var d = Math.round((b.value - a.value) * 10) / 10;
    if (d === 0) { same.push(NAMES[id] + ' ' + fmt(b.value)); return; }
    var better = id === 'diet' ? d > 0 : d < 0; if (better) down++;
    var max = b.unit === 'bmi' ? 20 : b.unit === '%' ? 30 : id === 'diet' ? 100 : id === 'isi' ? 28 : 18;
    var base = b.unit === 'bmi' ? 15 : 0;
    var y = function (v) { return (24 - Math.min(1, (v - base) / max) * 20).toFixed(1); };
    rows.push({ name: NAMES[id] + (b.unit === 'bmi' ? ' (BMI)' : ''), b: fmt(a.value), a: fmt(b.value), y1: y(a.value), y2: y(b.value),
      delta: (d > 0 ? '+' : '−') + (b.unit === 'score' ? Math.abs(d) + '점' : f1(Math.abs(d)) + (b.unit === '%' ? '%p' : '')), tagBg: better ? '#9fe870' : HIGH_BG, tagFg: better ? INK : LOOK,
      why: a.category && b.category && a.category !== b.category ? a.category + ' → ' + b.category : '' });
  });
  var pi = s.previous.input, ci = s.input, chips = [];
  function dl(v) { v = Math.round(v * 10) / 10; return (v > 0 ? '+' : '−') + Math.abs(v); }
  if (ci.weightKg !== pi.weightKg) chips.push({ k: '체중', v: dl(ci.weightKg - pi.weightKg) + 'kg', s: pi.weightKg + ' → ' + ci.weightKg });
  if (ci.waistCm != null && pi.waistCm != null && ci.waistCm !== pi.waistCm) chips.push({ k: '허리', v: dl(ci.waistCm - pi.waistCm) + 'cm', s: pi.waistCm + ' → ' + ci.waistCm });
  var habits = [];
  if (ci.exercise !== pi.exercise) habits.push(ci.exercise ? '운동을 시작했어요' : '운동을 쉬었어요');
  if (ci.smoke !== pi.smoke) habits.push(ci.smoke === 'current' ? '흡연' : '금연했어요');
  if (ci.alcohol !== pi.alcohol) habits.push('음주 습관이 바뀌었어요');
  while (chips.length < 2) chips.push({ k: chips.length ? '허리' : '체중', v: '그대로', s: '' });
  return { has: true, prevDate: s.previous.date, date: s.date, down: down, rows: rows, same: same, sameN: same.length, sameText: same.join(' · '),
    left: chips[0], right: chips[1], habit: habits.join(' · ') || '생활습관은 그대로예요', hasRows: rows.length > 0 };
}

function viewInputs(s) {
  var i = s.input, ob = byId(runAll(i)).obesity;
  var alc = ['none', 'lt1', 'd1_4', 'd5'].indexOf(i.alcohol), bp = ['unknown', 'normal', 'elevated', 'high'].indexOf(i.bp);
  var sl = i.sleep || null, md = i.mind || null, gq = i.gerd || null;
  var phq2 = md ? md.phq[0] + md.phq[1] : 0;
  return {
    age: i.age, sexF: i.sex === 'F', height: i.heightCm, weight: i.weightKg, waist: i.waistCm == null ? '' : i.waistCm, waistUnknown: i.waistCm == null,
    bmi: f1(ob.value), bmiCat: ob.category,
    smoke: ['never', 'past', 'current'].indexOf(i.smoke), alc: alc, ex: i.exercise === true ? 0 : i.exercise === false ? 1 : -1,
    menoShown: i.sex === 'F' && i.age >= 40, meno: i.meno === true ? 0 : i.meno === false ? 1 : -1, fam: i.famDM ? 0 : 1,
    dx: [i.dx.htn, i.dx.dm, i.dx.chol, !i.dx.htn && !i.dx.dm && !i.dx.chol], bp: bp,
    sleep: sl, isiOpen: !!(sl && sl.insGate), isi: sl && sl.isi ? sl.isi : [],
    mind: md, phq2: phq2, phq9Open: phq2 >= 3, phqMore: md && md.phq.length === 9 ? md.phq.slice(2) : [],
    gerd: gq, gerdOpen: !!(gq && gq.gate), gq: gq && gq.gq ? gq.gq : [],
    diet: i.diet || []
  };
}

function sampleList(sel) {
  return samples.map(function (x) { return { id: x.id, label: x.label, desc: x.desc, on: x.id === sel }; });
}

window.OneMin = { runAll: runAll, whatIf: whatIf, samples: samples, defaultSampleId: defaultSampleId,
  getSel: getSel, setSel: setSel, subscribe: subscribe, sample: sample, applyScenario: applyScenario,
  viewResults: viewResults, viewDetailDm: viewDetailDm, viewRecord: viewRecord, viewInputs: viewInputs, sampleList: sampleList };
})();
