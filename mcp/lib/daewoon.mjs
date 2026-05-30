// daewoon.mjs — 대운(大運) 방향·시작나이·배열 (zero-dep)
import { STEMS, BRANCHES, stemOf, branchOf, ganzhiIndex } from './constants.mjs';
import { tenGod } from './core.mjs';

/**
 * computeDaewoon(opts)
 *  opts: { yearStem, gender, monthStem, monthBranch, jdUT, jies, dayStem, count=10 }
 *   - jies: jieMomentsAround(year) 시계열 (절 12*3개)
 *  반환: { forward, startAge, startAgeYears, list:[{age, stem, branch, ganzhi, 천간십성, 지지십성}] }
 */
export function computeDaewoon({ yearStem, gender, monthStem, monthBranch, jdUT, jies, dayStem, count = 10 }) {
  const yangYear = !STEMS[yearStem].yin;          // 년간 양(陽)?
  const male = gender === 'male' || gender === '남' || gender === '남자';
  const forward = (yangYear && male) || (!yangYear && !male); // 순행 여부

  // 경계까지 일수
  let boundaryJD;
  if (forward) {
    const next = jies.find((j) => j.jd > jdUT);
    boundaryJD = next ? next.jd : jdUT;
  } else {
    const prevs = jies.filter((j) => j.jd <= jdUT);
    boundaryJD = prevs.length ? prevs[prevs.length - 1].jd : jdUT;
  }
  const days = Math.abs(boundaryJD - jdUT);
  const startAgeYears = days / 3;                 // 3일 = 1년
  const startAge = Math.max(1, Math.round(startAgeYears)); // 한국식 대운수(최소 1)

  // 배열 — 월주 간지에서 ±1
  const monthGz = ganzhiIndex(monthStem, monthBranch);
  const list = [];
  for (let i = 0; i < count; i++) {
    const gz = ((monthGz + (forward ? (i + 1) : -(i + 1))) % 60 + 60) % 60;
    const s = stemOf(gz), b = branchOf(gz);
    list.push({
      age: startAge + i * 10,
      stem: STEMS[s].han, branch: BRANCHES[b].han,
      ganzhi: STEMS[s].han + BRANCHES[b].han,
      ganzhiKor: STEMS[s].kor + BRANCHES[b].kor,
      천간십성: tenGod(dayStem, s).kor,
      지지십성: tenGod(dayStem, BRANCHES[b].mainHidden).kor,
    });
  }

  return {
    forward,
    direction: forward ? '순행(順行)' : '역행(逆行)',
    startAge,
    startAgeYears: Math.round(startAgeYears * 100) / 100,
    daysToBoundary: Math.round(days * 100) / 100,
    list,
  };
}

// 세운(歲運) — 특정 연도들의 간지/십성
export function computeSaeun(dayStem, fromYear, toYear) {
  const out = [];
  for (let y = fromYear; y <= toYear; y++) {
    const gz = ((y - 4) % 60 + 60) % 60;
    const s = stemOf(gz), b = branchOf(gz);
    out.push({
      year: y, ganzhi: STEMS[s].han + BRANCHES[b].han,
      천간십성: tenGod(dayStem, s).kor,
      지지십성: tenGod(dayStem, BRANCHES[b].mainHidden).kor,
    });
  }
  return out;
}
