// pillars.mjs — 생년월일시 → 사주 원국 4기둥 (년/월/일/시) (zero-dep)
import { BRANCHES, stemOf, branchOf } from './constants.mjs';
import {
  gregorianToJD, jdnAtNoon, deltaTSeconds, equationOfTimeMinutes,
  findSolarTermJD, jieMomentsAround,
} from './astronomy.mjs';

// 일주 60갑자 보정상수 — 알려진 일주(乙丑/辛未/戊辰…)로 캘리브레이션됨.
export const DAY_OFFSET = 49;
// 진태양시 기본 경도 — 서울(126.978°E) → 동경시 대비 약 −32분.
export const DEFAULT_LONGITUDE = 126.978;
export const KST_OFFSET_HOURS = 9; // 한국 표준시 = UTC+9 (동경 135°)

// 五虎遁: 년간 → 寅월 천간 index
function yinMonthStartStem(yearStem) { return (((yearStem % 5) * 2 + 2) % 10); }
// 五鼠遁: 일간 → 子시 천간 index
function zaHourStartStem(dayStem) { return ((dayStem % 5) * 2) % 10; }

/**
 * computePillars(opts)
 *  opts: { year, month, day, hour, minute=0, gender:'male'|'female',
 *          longitude=DEFAULT_LONGITUDE, tzOffsetHours=9, useEquationOfTime=false }
 *  (입력은 해당 표준시(기본 KST)의 민용시 양력)
 */
export function computePillars(opts) {
  const {
    year, month, day, hour, minute = 0,
    longitude = DEFAULT_LONGITUDE,
    tzOffsetHours = KST_OFFSET_HOURS,
    useEquationOfTime = false,
  } = opts;

  const warnings = [];

  // ── 출생 순간의 JD(UT) ──────────────────────────────────────────────
  const clockHours = hour + minute / 60;
  const jdUT = gregorianToJD(year, month, day) + clockHours / 24 - tzOffsetHours / 24;
  const jde = jdUT + deltaTSeconds(year) / 86400;

  // ── 진태양시(시주 경계용) ──────────────────────────────────────────
  const lonCorrMin = (longitude - tzOffsetHours * 15) * 4; // 경도차 4분/°
  const eot = useEquationOfTime ? equationOfTimeMinutes(jde) : 0;
  let trueSolarHours = clockHours + lonCorrMin / 60 + eot / 60;
  if (trueSolarHours < 0) trueSolarHours += 24;
  if (trueSolarHours >= 24) trueSolarHours -= 24;

  // ── 1) 년주 — 입춘 기준 ─────────────────────────────────────────────
  const ipchunJD = findSolarTermJD(year, 315);
  let solarYear = year;
  if (jdUT < ipchunJD) {
    solarYear = year - 1;
    warnings.push('입춘(立春) 이전 출생 — 년주는 전년(前年) 간지로 산출됨.');
  }
  const yStem = ((solarYear - 4) % 10 + 10) % 10;
  const yBranch = ((solarYear - 4) % 12 + 12) % 12;

  // ── 2) 월주 — 절(節) 구간 기준 ──────────────────────────────────────
  const jies = jieMomentsAround(year); // 전년~익년 절(節) 시계열
  let monthTerm = null;
  for (let i = 0; i < jies.length; i++) {
    if (jies[i].jd <= jdUT && (i + 1 >= jies.length || jdUT < jies[i + 1].jd)) {
      monthTerm = jies[i]; break;
    }
  }
  if (!monthTerm) monthTerm = jies[0];
  const mBranch = monthTerm.monthBranch;
  const startStem = yinMonthStartStem(yStem);
  const offsetMonths = ((mBranch - 2) % 12 + 12) % 12; // 寅(2)부터의 진행
  const mStem = (startStem + offsetMonths) % 10;

  // ── 3) 일주 — 민용시 자정 기준 날짜 ─────────────────────────────────
  const jdn = jdnAtNoon(year, month, day);
  const dayGz = ((jdn + DAY_OFFSET) % 60 + 60) % 60;
  const dStem = stemOf(dayGz);
  const dBranch = branchOf(dayGz);

  // ── 4) 시주 — 진태양시 기준 시지 + 五鼠遁 ───────────────────────────
  const hBranch = Math.floor((trueSolarHours + 1) / 2) % 12; // 子=23~01 ...
  const hStem = (zaHourStartStem(dStem) + hBranch) % 10;

  // ── 경계 경고 ──────────────────────────────────────────────────────
  // 시지 블록 경계는 홀수시(…23,01,03,…15…). branch=floor((t+1)/2) 와 동일 정렬로 +1 보정.
  const solarMinOfHour = (((trueSolarHours + 1) * 60) % 120 + 120) % 120;
  const edge = Math.min(solarMinOfHour, 120 - solarMinOfHour);
  if (edge <= 20) warnings.push(`출생시각이 시지(時支) 경계에서 약 ${Math.round(edge)}분 — 인접 시(時)일 가능성 점검 권장.`);
  // 진태양시 보정으로 시계시와 시지가 달라지면 안내(예: 23:30 KST → 진태양시 亥시)
  const rawHBranch = Math.floor(((clockHours % 24) + 1) / 2) % 12;
  if (rawHBranch !== hBranch) {
    warnings.push(`진태양시 보정(${Math.round(lonCorrMin)}분)으로 시지가 시계상 ${BRANCHES[rawHBranch].han}시 → 진태양시 ${BRANCHES[hBranch].han}시로 조정됨. 시계시(평균 동경시) 기준 학파라면 ${BRANCHES[rawHBranch].han}시로 볼 수도 있음.`);
  }
  if (trueSolarHours >= 23 || trueSolarHours < 1) warnings.push('자시(子時) 구간 — 야자시/조자시 학파 차이로 일주/시간 해석이 갈릴 수 있음(본 엔진: 민용시 자정 기준 일주).');
  // 입춘/절 경계 근접
  const nearJie = jies.find((j) => Math.abs(j.jd - jdUT) < 1);
  if (nearJie) warnings.push(`절기 ${nearJie.name}(${nearJie.han}) 경계 24시간 이내 — 월주 경계 정밀 확인 권장.`);

  const pillars = {
    year:  { stem: yStem, branch: yBranch },
    month: { stem: mStem, branch: mBranch },
    day:   { stem: dStem, branch: dBranch },
    hour:  { stem: hStem, branch: hBranch },
  };

  return {
    pillars,
    meta: {
      jdUT, jde, ipchunJD, solarYear,
      monthTerm: { name: monthTerm.name, han: monthTerm.han, jd: monthTerm.jd },
      trueSolarHours, lonCorrectionMin: lonCorrMin, equationOfTimeMin: eot,
      longitude, tzOffsetHours, dayGanzhiIndex: dayGz, jdn,
    },
    warnings,
  };
}

// 대운 계산은 daewoon.mjs 가 jies/pillars 를 재사용.
export { jieMomentsAround, findSolarTermJD };
