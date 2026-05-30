// elements.mjs — 오행 분포 / 십성 분포 / 신강·신약 점수 / 용신 후보 (heuristic)
import { STEMS, BRANCHES, ELEMENTS, TEN_GODS, HIDDEN_STEMS } from './constants.mjs';
import { tenGodIndex } from './core.mjs';

// 8자(천간4+지지4) 오행 분포 (가시 글자 기준)
export function ohaengDistribution(stems, branches) {
  const count = [0, 0, 0, 0, 0];
  for (const s of stems) count[STEMS[s].el]++;
  for (const b of branches) count[BRANCHES[b].el]++;
  return ELEMENTS.map((e, i) => ({ el: e.han, kor: e.kor, count: count[i] }));
}

// 지장간 가중 오행 점수 (정기 1.0, 중기 0.5, 여기 0.3)
export function ohaengWeighted(stems, branches) {
  const w = [0, 0, 0, 0, 0];
  for (const s of stems) w[STEMS[s].el] += 1;
  for (const b of branches) {
    const hs = HIDDEN_STEMS[b];
    const weights = hs.length === 3 ? [0.3, 0.5, 1.0] : [0.5, 1.0];
    hs.forEach((s, i) => { w[STEMS[s].el] += weights[i]; });
  }
  return ELEMENTS.map((e, i) => ({ el: e.han, kor: e.kor, score: Math.round(w[i] * 10) / 10 }));
}

// 십성 그룹 분포 (일간 기준 7자) — 비겁/식상/재성/관성/인성
export function sipseongDistribution(dayStem, stems, branches) {
  const groups = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  const groupOf = (idx) => TEN_GODS[idx].group;
  // 천간: 일간(일주 천간) 제외한 3개
  stems.forEach((s, i) => { if (i === 2) return; groups[groupOf(tenGodIndex(dayStem, s))]++; });
  // 지지 4개: 정기 지장간 기준
  branches.forEach((b) => { groups[groupOf(tenGodIndex(dayStem, BRANCHES[b].mainHidden))]++; });
  return groups;
}

// 신강·신약 점수 (가중 휴리스틱, 0~100). >=60 신강 / <=40 신약 / 그 사이 중화
export function strengthScore(dayStem, stems, branches) {
  // 위치 가중치: [년,월,일,시]
  const stemW = [1, 1.2, 0, 1];      // 일간(2) 제외
  const branchW = [1.3, 3.0, 2.0, 1.5]; // 월지(월령) 최대
  let support = 0, drain = 0;
  const addByGroup = (group, w) => {
    if (group === '인성' || group === '비겁') support += w; else drain += w;
  };
  stems.forEach((s, i) => {
    if (i === 2) return;
    addByGroup(TEN_GODS[tenGodIndex(dayStem, s)].group, stemW[i]);
  });
  branches.forEach((b, i) => {
    addByGroup(TEN_GODS[tenGodIndex(dayStem, BRANCHES[b].mainHidden)].group, branchW[i]);
  });
  const total = support + drain;
  const score = total > 0 ? Math.round((support / total) * 100) : 50;
  let label = '중화(中和)';
  if (score >= 60) label = '신강(身强)';
  else if (score <= 40) label = '신약(身弱)';
  // 득령(월지 본기가 인성/비겁인가)
  const wolGroup = TEN_GODS[tenGodIndex(dayStem, BRANCHES[branches[1]].mainHidden)].group;
  const deukRyeong = (wolGroup === '인성' || wolGroup === '비겁');
  return { score, label, support: Math.round(support * 10) / 10, drain: Math.round(drain * 10) / 10, deukRyeong };
}

// 용신 후보 (억부+조후 휴리스틱) — 최종 판단은 명리가/LLM 가 보정
export function yongsinCandidates(dayStem, branches, strength) {
  const dayEl = STEMS[dayStem].el; // 0목1화2토3금4수
  const gen = (a) => (a + 1) % 5, ctrl = (a) => (a + 2) % 5;
  const el = (i) => ELEMENTS[i].han;
  const strong = strength.score >= 55;
  // 억부
  let eokbu;
  if (strong) {
    // 설기(식상=일간이 생) · 극(관성=일간을 극) · 재성(일간이 극) 으로 덜어냄
    eokbu = {
      방향: '설·극(덜어냄)',
      후보: [
        { el: el(gen(dayEl)), 십성: '식상', 설명: '일간 기운을 빼주는 출구' },
        { el: el(ctrl(dayEl)), 십성: '재성', 설명: '일간이 다스리는 결실' },
        { el: el((dayEl + 3) % 5), 십성: '관성', 설명: '일간을 제어하는 규율(있을 때)' },
      ],
    };
  } else {
    eokbu = {
      방향: '생·조(보태줌)',
      후보: [
        { el: el((dayEl + 4) % 5), 십성: '인성', 설명: '일간을 생해주는 뿌리' },
        { el: el(dayEl), 십성: '비겁', 설명: '같은 편의 힘' },
      ],
    };
  }
  // 조후 (월지 계절)
  const wol = branches[1];
  const winter = [11, 0, 1].includes(wol); // 亥子丑
  const summer = [5, 6, 7].includes(wol);  // 巳午未
  let johu = null;
  if (winter) johu = { 필요: '火', 이유: '겨울생 — 한기(寒氣) 해소 위해 따뜻함 필요' };
  else if (summer) johu = { 필요: '水', 이유: '여름생 — 조열(燥熱) 해소 위해 물기 필요' };
  return { 억부: eokbu, 조후: johu, 비고: '용신 후보는 휴리스틱입니다. 격국·합충·통근을 종합해 명리가/LLM이 최종 확정해야 합니다.' };
}
