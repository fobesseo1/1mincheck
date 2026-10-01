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
