// core.mjs — 십성/12운성/신살/공망/합충형파해 (zero-dep)
import {
  STEMS, BRANCHES, ELEMENTS, TEN_GODS, HIDDEN_STEMS, LIFE_STAGES, LIFE_STAGES_HAN,
  JANGSAENG, gen, ctrl,
} from './constants.mjs';

// ── 십성 (Ten Gods): 일간 stem 기준, 상대 stem 의 관계 index 0..9 ──────
export function tenGodIndex(dayStem, otherStem) {
  const de = STEMS[dayStem].el, oe = STEMS[otherStem].el;
  const same = STEMS[dayStem].yin === STEMS[otherStem].yin;
  let base; // 0 비겁 / 2 식상 / 4 재성 / 6 관성 / 8 인성
  if (oe === de) base = 0;
  else if (oe === gen(de)) base = 2;        // 일간이 생 → 식상
  else if (oe === ctrl(de)) base = 4;       // 일간이 극 → 재성
  else if (de === ctrl(oe)) base = 6;       // 상대가 극 일간 → 관성
  else base = 8;                            // 상대가 생 일간 → 인성
  return base + (same ? 0 : 1);
}
export function tenGod(dayStem, otherStem) {
  return TEN_GODS[tenGodIndex(dayStem, otherStem)];
}
// 지지 십성 — 정기(본기) 지장간 stem 으로 산출
export function branchTenGod(dayStem, branch) {
  return tenGod(dayStem, BRANCHES[branch].mainHidden);
}

// ── 12운성 — 일간 dayStem 기준 지지 branch 의 단계 ─────────────────────
export function lifeStage(dayStem, branch) {
  const js = JANGSAENG[dayStem];
  const forward = !STEMS[dayStem].yin; // 양간 순행, 음간 역행
  const idx = forward ? ((branch - js + 12) % 12) : ((js - branch + 12) % 12);
  return { kor: LIFE_STAGES[idx], han: LIFE_STAGES_HAN[idx], idx };
}

// ── 지장간 상세 ───────────────────────────────────────────────────────
export function hiddenStems(branch) {
  return HIDDEN_STEMS[branch].map((s) => ({ han: STEMS[s].han, kor: STEMS[s].kor, idx: s }));
}

// ── 공망 (空亡) — 일주 stem,branch 기준 2개 지지 ───────────────────────
export function gongmang(dayStem, dayBranch) {
  const leader = (dayBranch - dayStem + 12) % 12; // 旬首의 지지(甲에 해당하는 위치)
  const a = (leader + 10) % 12, b = (leader + 11) % 12;
  return [a, b].map((x) => ({ han: BRANCHES[x].han, kor: BRANCHES[x].kor, idx: x }));
}

// ── 삼합 그룹 (도화/역마/화개 산출 기준) ───────────────────────────────
// 그룹: 申子辰(0) 寅午戌(1) 巳酉丑(2) 亥卯未(3)
const SAMHAP_GROUP = { 8:0,0:0,4:0, 2:1,6:1,10:1, 5:2,9:2,1:2, 11:3,3:3,7:3 };
const DOHWA  = { 0:9, 1:3, 2:6, 3:0 };  // 도화(연살)
const YEOKMA = { 0:2, 1:8, 2:11, 3:5 }; // 역마
const HWAGAE = { 0:4, 1:10, 2:1, 3:7 }; // 화개

// 천을귀인 (일간 → 지지 2개)
const CHEONEUL = {
  0:[1,7], 4:[1,7], 6:[1,7],   // 甲戊庚 → 丑未
  1:[0,8], 5:[0,8],            // 乙己 → 子申
  2:[11,9], 3:[11,9],          // 丙丁 → 亥酉
  8:[5,3], 9:[5,3],            // 壬癸 → 巳卯
  7:[6,2],                     // 辛 → 午寅
};
// 문창귀인 (일간 → 지지)
const MUNCHANG = { 0:5, 1:6, 2:8, 3:9, 4:8, 5:9, 6:11, 7:0, 8:2, 9:3 };
// 양인 (양간 일간 → 지지)
const YANGIN = { 0:3, 2:6, 4:6, 6:9, 8:0 };

// 사주 4지지(+일간) 기준 신살 모음
export function computeSinsal(dayStem, branches /* [년,월,일,시] idx */) {
  const tags = {}; // pillarPos → [신살명...]
  const add = (bIdx, name) => {
    if (bIdx == null) return;
    for (let p = 0; p < branches.length; p++) {
      if (branches[p] === bIdx) { (tags[p] ??= []).push(name); }
    }
  };
  const refs = [branches[2], branches[0]]; // 일지, 년지 둘 다 기준
  for (const r of refs) {
    const g = SAMHAP_GROUP[r];
    if (g != null) { add(DOHWA[g], '도화'); add(YEOKMA[g], '역마'); add(HWAGAE[g], '화개'); }
  }
  // 천을/문창 — 일간 기준
  for (const b of (CHEONEUL[dayStem] || [])) add(b, '천을귀인');
  add(MUNCHANG[dayStem], '문창귀인');
  if (YANGIN[dayStem] != null) add(YANGIN[dayStem], '양인');
  // 공망 표시
  const gm = gongmang(dayStem, branches[2]).map((x) => x.idx);
  for (const b of gm) add(b, '공망');
  // dedupe
  const byPillar = ['년', '월', '일', '시'].map((label, i) => ({
    pillar: label, branch: BRANCHES[branches[i]].han,
    sinsal: [...new Set(tags[i] || [])],
  }));
  return byPillar;
}

// ── 합충형파해 (지지 4개 + 천간 4개 상호작용) ──────────────────────────
const BRANCH_CHUNG = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]]; // 子午 丑未 寅申 卯酉 辰戌 巳亥
const YUKHAP = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];        // 육합
const YUKHAP_EL = { '0-1':2, '2-11':0, '3-10':1, '4-9':3, '5-8':4, '6-7':1 }; // 합화 오행(전통)
const SAMHAP = [[8,0,4,4],[2,6,10,1],[5,9,1,3],[11,3,7,0]];    // [b,b,b, 오행]
const BANGHAP = [[2,3,4,0],[5,6,7,1],[8,9,10,3],[11,0,1,4]];
const PA = [[0,9],[1,4],[2,11],[3,6],[5,8],[10,7]];            // 파(破)
const HAE = [[0,7],[1,6],[2,5],[3,4],[8,11],[9,10]];           // 해(害)
const JAHYUNG = [4,6,9,11]; // 辰午酉亥 자형
// 천간합/충
const STEM_HAP = [[0,5],[1,6],[2,7],[3,8],[4,9]];             // 甲己 乙庚 丙辛 丁壬 戊癸
const STEM_HAP_EL = { '0-5':2,'1-6':3,'2-7':4,'3-8':0,'4-9':1 };
const STEM_CHUNG = [[0,6],[1,7],[2,8],[3,9]];                  // 甲庚 乙辛 丙壬 丁癸

function pairsPresent(list, branches) {
  const present = branches.map((b, i) => ({ b, i }));
  const found = [];
  for (const [x, y, ...rest] of list) {
    const px = present.filter((p) => p.b === x);
    const py = present.filter((p) => p.b === y);
    if (px.length && py.length) found.push({ a: x, b: y, rest });
  }
  return found;
}

export function computeInteractions(stems /* [4] idx */, branches /* [4] idx */) {
  const han = (b) => BRANCHES[b].han;
  const shan = (s) => STEMS[s].han;
  const result = { 천간합: [], 천간충: [], 지지육합: [], 지지삼합: [], 지지방합: [],
                   지지충: [], 지지형: [], 지지파: [], 지지해: [] };

  for (const { a, b } of pairsPresent(STEM_HAP, stems)) {
    const el = STEM_HAP_EL[[a, b].sort((x,y)=>x-y).join('-')];
    result.천간합.push(`${shan(a)}${shan(b)}합${ELEMENTS[el].han}`);
  }
  for (const { a, b } of pairsPresent(STEM_CHUNG, stems)) result.천간충.push(`${shan(a)}${shan(b)}충`);

  for (const { a, b } of pairsPresent(YUKHAP, branches)) {
    const el = YUKHAP_EL[[a, b].sort((x,y)=>x-y).join('-')];
    result.지지육합.push(`${han(a)}${han(b)}육합${el!=null?ELEMENTS[el].han:''}`);
  }
  // 삼합/반합
  for (const [x, y, z, el] of SAMHAP) {
    const has = [x, y, z].filter((b) => branches.includes(b));
    if (has.length === 3) result.지지삼합.push(`${han(x)}${han(y)}${han(z)}삼합${ELEMENTS[el].han}`);
    else if (has.length === 2) result.지지삼합.push(`${has.map(han).join('')}반합${ELEMENTS[el].han}`);
  }
  for (const [x, y, z, el] of BANGHAP) {
    const has = [x, y, z].filter((b) => branches.includes(b));
    if (has.length === 3) result.지지방합.push(`${han(x)}${han(y)}${han(z)}방합${ELEMENTS[el].han}`);
  }
  for (const { a, b } of pairsPresent(BRANCH_CHUNG, branches)) result.지지충.push(`${han(a)}${han(b)}충`);
  // 형: 삼형 + 상형 + 자형
  const present = branches;
  const cnt = (b) => present.filter((x) => x === b).length;
  if (cnt(2) && cnt(5) && cnt(8)) result.지지형.push('寅巳申 삼형');
  else { if (cnt(2)&&cnt(5)) result.지지형.push('寅巳형'); if (cnt(5)&&cnt(8)) result.지지형.push('巳申형'); if (cnt(2)&&cnt(8)) result.지지형.push('寅申형(+충)'); }
  if (cnt(1) && cnt(10) && cnt(7)) result.지지형.push('丑戌未 삼형');
  else { if (cnt(1)&&cnt(10)) result.지지형.push('丑戌형'); if (cnt(10)&&cnt(7)) result.지지형.push('戌未형'); if (cnt(1)&&cnt(7)) result.지지형.push('丑未형(+충)'); }
  if (cnt(0) && cnt(3)) result.지지형.push('子卯형');
  for (const b of JAHYUNG) if (cnt(b) >= 2) result.지지형.push(`${han(b)}${han(b)} 자형`);
  for (const { a, b } of pairsPresent(PA, branches)) result.지지파.push(`${han(a)}${han(b)}파`);
  for (const { a, b } of pairsPresent(HAE, branches)) result.지지해.push(`${han(a)}${han(b)}해`);

  // dedupe
  for (const k of Object.keys(result)) result[k] = [...new Set(result[k])];
  return result;
}
