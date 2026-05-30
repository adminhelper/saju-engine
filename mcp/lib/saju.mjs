// saju.mjs — 최상위 조립: computeSaju() / computeGunghap()
import { STEMS, BRANCHES, ELEMENTS, pillarLabel, gen, ctrl } from './constants.mjs';
import { tenGod, branchTenGod, lifeStage, hiddenStems, gongmang, computeSinsal, computeInteractions } from './core.mjs';
import { computePillars, jieMomentsAround } from './pillars.mjs';
import { ohaengDistribution, ohaengWeighted, sipseongDistribution, strengthScore, yongsinCandidates } from './elements.mjs';
import { computeDaewoon, computeSaeun } from './daewoon.mjs';

const ENGINE_VERSION = '0.1.0';

function pillarDetail(dayStem, stem, branch, isDay) {
  const lab = pillarLabel(stem, branch);
  return {
    천간: { han: STEMS[stem].han, kor: STEMS[stem].kor, 오행: ELEMENTS[STEMS[stem].el].han, 음양: STEMS[stem].yin ? '음' : '양' },
    지지: { han: BRANCHES[branch].han, kor: BRANCHES[branch].kor, 오행: ELEMENTS[BRANCHES[branch].el].han, 띠: BRANCHES[branch].animal },
    간지: lab.ganzhi,
    천간십성: isDay ? '일간(日干)·본인' : tenGod(dayStem, stem).kor,
    지지십성: branchTenGod(dayStem, branch).kor,
    지장간: hiddenStems(branch).map((h) => h.han),
    십이운성: lifeStage(dayStem, branch).kor,
  };
}

/**
 * computeSaju(input)
 *  input: { name?, gender:'male'|'female', year, month, day, hour, minute=0,
 *           calendar='solar', longitude?, useEquationOfTime?, saeunFrom?, saeunTo? }
 */
export function computeSaju(input) {
  const { name = null, gender, year, month, day, hour, minute = 0,
          calendar = 'solar', saeunFrom = null, saeunTo = null } = input;

  const warnings = [];
  if (calendar !== 'solar') {
    warnings.push('현재 엔진은 양력(solar) 입력만 정밀 지원합니다. 음력 입력은 먼저 양력으로 변환해 주세요.');
  }

  const { pillars, meta, warnings: pw } = computePillars(input);
  warnings.push(...pw);

  const dayStem = pillars.day.stem;
  const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];
  const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];

  const detail = {
    년주: pillarDetail(dayStem, pillars.year.stem, pillars.year.branch, false),
    월주: pillarDetail(dayStem, pillars.month.stem, pillars.month.branch, false),
    일주: pillarDetail(dayStem, pillars.day.stem, pillars.day.branch, true),
    시주: pillarDetail(dayStem, pillars.hour.stem, pillars.hour.branch, false),
  };

  const strength = strengthScore(dayStem, stems, branches);
  const jies = jieMomentsAround(year);
  const daewoon = computeDaewoon({
    yearStem: pillars.year.stem, gender, monthStem: pillars.month.stem,
    monthBranch: pillars.month.branch, jdUT: meta.jdUT, jies, dayStem,
  });

  const result = {
    engine: { name: 'saju-engine', version: ENGINE_VERSION },
    input: { name, gender, 생년월일시: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`, calendar },
    원국: {
      간지: {
        년주: pillarLabel(pillars.year.stem, pillars.year.branch).ganzhi,
        월주: pillarLabel(pillars.month.stem, pillars.month.branch).ganzhi,
        일주: pillarLabel(pillars.day.stem, pillars.day.branch).ganzhi,
        시주: pillarLabel(pillars.hour.stem, pillars.hour.branch).ganzhi,
      },
      일간: { han: STEMS[dayStem].han, kor: STEMS[dayStem].kor, 오행: ELEMENTS[STEMS[dayStem].el].han, 음양: STEMS[dayStem].yin ? '음' : '양' },
      상세: detail,
    },
    오행분포: { 가시8자: ohaengDistribution(stems, branches), 지장간가중: ohaengWeighted(stems, branches) },
    십성분포: sipseongDistribution(dayStem, stems, branches),
    신강신약: strength,
    용신후보: yongsinCandidates(dayStem, branches, strength),
    신살: computeSinsal(dayStem, branches),
    공망: gongmang(dayStem, pillars.day.branch).map((g) => g.han),
    합충형파해: computeInteractions(stems, branches),
    대운: daewoon,
    메타: {
      진태양시: `${String(Math.floor(meta.trueSolarHours)).padStart(2,'0')}:${String(Math.round((meta.trueSolarHours%1)*60)).padStart(2,'0')}`,
      경도보정분: Math.round(meta.lonCorrectionMin * 10) / 10,
      절기: meta.monthTerm.name,
      입춘기준해: meta.solarYear,
      경도: meta.longitude,
    },
    warnings,
    disclaimer: '본 원국은 입력 양력 생년월일시로부터 태양황경 절기·JDN 일주·진태양시 환산으로 산출한 결과입니다. 한국천문연구원(KASI) 만세력과 1일 단위 교차검증을 권장합니다. 신살·용신은 휴리스틱이며 최종 해석은 명리 전문가/LLM의 통변이 필요합니다.',
  };

  if (saeunFrom && saeunTo) result.세운 = computeSaeun(dayStem, saeunFrom, saeunTo);
  return result;
}

// ── 궁합 (두 사람) ────────────────────────────────────────────────────
function dayStemRelation(aStem, bStem) {
  const ae = STEMS[aStem].el, be = STEMS[bStem].el;
  if (ae === be) return { type: '비화(比和)', desc: '같은 오행 — 동질감·이해 빠름, 단 경쟁/충돌 소지' };
  if (gen(ae) === be) return { type: '상생(A→B)', desc: `${ELEMENTS[ae].han}생${ELEMENTS[be].han} — A가 B를 북돋움` };
  if (gen(be) === ae) return { type: '상생(B→A)', desc: `${ELEMENTS[be].han}생${ELEMENTS[ae].han} — B가 A를 북돋움` };
  if (ctrl(ae) === be) return { type: '상극(A→B)', desc: `${ELEMENTS[ae].han}극${ELEMENTS[be].han} — A가 B를 제어/압박` };
  if (ctrl(be) === ae) return { type: '상극(B→A)', desc: `${ELEMENTS[be].han}극${ELEMENTS[ae].han} — B가 A를 제어/압박` };
  return { type: '무관', desc: '' };
}

function branchPairRelation(b1, b2) {
  const rel = [];
  const YUKHAP = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
  const CHUNG = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];
  const HAE = [[0,7],[1,6],[2,5],[3,4],[8,11],[9,10]];
  const has = (list) => list.some(([x,y]) => (x===b1&&y===b2)||(x===b2&&y===b1));
  const SAMHAP = [[8,0,4],[2,6,10],[5,9,1],[11,3,7]];
  if (has(YUKHAP)) rel.push('육합(六合)·강한 결합');
  if (SAMHAP.some(g => g.includes(b1) && g.includes(b2) && b1!==b2)) rel.push('삼합 협조');
  if (has(CHUNG)) rel.push('충(沖)·충돌');
  if (has(HAE)) rel.push('해(害)·은근한 갈등');
  if ((b1===0&&b2===3)||(b1===3&&b2===0)) rel.push('자묘형(子卯刑)');
  if (b1===b2) rel.push('동일 지지·동병상련');
  return rel;
}

export function computeGunghap(personA, personB) {
  const A = computeSaju(personA), B = computeSaju(personB);
  const aDay = STEMS.findIndex(s => s.han === A.원국.일간.han);
  const bDay = STEMS.findIndex(s => s.han === B.원국.일간.han);
  const aBranchDay = BRANCHES.findIndex(b => b.han === A.원국.상세.일주.지지.han);
  const bBranchDay = BRANCHES.findIndex(b => b.han === B.원국.상세.일주.지지.han);

  // 오행 상호보완: A의 결핍을 B가 채우나
  const aDist = Object.fromEntries(A.오행분포.가시8자.map(o => [o.el, o.count]));
  const bDist = Object.fromEntries(B.오행분포.가시8자.map(o => [o.el, o.count]));
  const complement = ELEMENTS.map(e => ({
    오행: e.han,
    A: aDist[e.han], B: bDist[e.han],
    보완: (aDist[e.han] === 0 && bDist[e.han] > 0) ? 'B가 A의 결핍 채움'
        : (bDist[e.han] === 0 && aDist[e.han] > 0) ? 'A가 B의 결핍 채움' : '',
  }));

  const dayRel = dayStemRelation(aDay, bDay);
  const branchRel = branchPairRelation(aBranchDay, bBranchDay);

  // 십성 교차: 서로를 무슨 십성으로 보는가
  const aSeesB = tenGod(aDay, bDay).kor;   // A 일간이 B 일간을 보는 십성
  const bSeesA = tenGod(bDay, aDay).kor;

  // 점수 휴리스틱
  let score = 70;
  const reasons = [];
  if (dayRel.type.startsWith('상생')) { score += 8; reasons.push('일간 상생(+8)'); }
  if (dayRel.type === '비화') { score += 2; reasons.push('일간 비화(+2)'); }
  if (dayRel.type.startsWith('상극')) { score -= 6; reasons.push('일간 상극(-6)'); }
  if (branchRel.some(r => r.includes('육합'))) { score += 10; reasons.push('일지 육합(+10)'); }
  if (branchRel.some(r => r.includes('삼합'))) { score += 6; reasons.push('일지 삼합(+6)'); }
  if (branchRel.some(r => r.includes('충'))) { score -= 8; reasons.push('일지 충(-8)'); }
  if (branchRel.some(r => r.includes('해'))) { score -= 4; reasons.push('일지 해(-4)'); }
  if (branchRel.some(r => r.includes('형'))) { score -= 5; reasons.push('일지 형(-5)'); }
  const compCount = complement.filter(c => c.보완).length;
  score += compCount * 3; if (compCount) reasons.push(`오행 상호보완 ${compCount}건(+${compCount*3})`);
  if (A.신강신약.score >= 60 && B.신강신약.score >= 60) { score -= 4; reasons.push('둘 다 신강(+자기주장 충돌, -4)'); }
  score = Math.max(0, Math.min(100, score));

  return {
    engine: { name: 'saju-engine', version: ENGINE_VERSION },
    A: { name: personA.name ?? null, 일간: A.원국.일간.han, 간지: A.원국.간지, 신강신약: A.신강신약.label, 용신후보: A.용신후보 },
    B: { name: personB.name ?? null, 일간: B.원국.일간.han, 간지: B.원국.간지, 신강신약: B.신강신약.label, 용신후보: B.용신후보 },
    일간관계: dayRel,
    일지관계: branchRel,
    십성교차: { 'A→B': aSeesB, 'B→A': bSeesA, 해설: 'A가 B를, B가 A를 각각 무슨 십성으로 받아들이는가(정관=남편상, 정재=처상 등)' },
    오행상호보완: complement,
    종합점수: { score, 'of': 100, 근거: reasons },
    sajuA: A, sajuB: B,
    disclaimer: '궁합 점수·관계 판정은 구조적 휴리스틱입니다. 일지·용신·대운 흐름을 종합한 최종 통변은 명리 전문가/LLM가 수행해야 합니다.',
  };
}

export { ENGINE_VERSION };
