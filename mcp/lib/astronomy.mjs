// astronomy.mjs — 태양 겉보기황경 기반 절기(節氣) 계산 + 율리우스일 (zero-dep)
// 정밀도: 절기 시각 오차 < ~1분. 사주 월주/대운 경계 판정에 충분.

const DEG = Math.PI / 180;

// ── 율리우스일 (Julian Day) ───────────────────────────────────────────
// Gregorian calendar. y,m,d 는 UTC 기준 (소수 day 가능: d=1.5 → 정오)
export function gregorianToJD(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

// 정수 JDN — 일주(60갑자) 계산용. 지역 민용시 자정 기준 날짜를 그대로 넣음.
export function jdnAtNoon(y, m, d) {
  return Math.floor(gregorianToJD(y, m, d) + 0.5);
}

// JS Date(UTC) → JD
export function dateToJD(dt) {
  return dt.getTime() / 86400000 + 2440587.5;
}
export function jdToDate(jd) {
  return new Date((jd - 2440587.5) * 86400000);
}

// ── ΔT (TT − UT), 초 단위. Espenak & Meeus 근사 (1900~2150 충분) ────────
export function deltaTSeconds(year) {
  let t, dt;
  if (year >= 2005 && year < 2050) {
    t = year - 2000;
    dt = 62.92 + 0.32217 * t + 0.005589 * t * t;
  } else if (year >= 1986 && year < 2005) {
    t = year - 2000;
    dt = 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t
       + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  } else if (year >= 1961 && year < 1986) {
    t = year - 1975;
    dt = 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718;
  } else if (year >= 1941 && year < 1961) {
    t = year - 1950;
    dt = 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547;
  } else if (year >= 1920 && year < 1941) {
    t = year - 1920;
    dt = 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t;
  } else if (year >= 1900 && year < 1920) {
    t = year - 1900;
    dt = -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t ** 4;
  } else if (year >= 2050) {
    dt = -20 + 32 * Math.pow((year - 1820) / 100, 2) - 0.5628 * (2150 - year);
  } else {
    t = (year - 1820) / 100;
    dt = -20 + 32 * t * t;
  }
  return dt;
}

// ── 태양 겉보기 황경 (apparent ecliptic longitude), degrees 0..360 ──────
// jde: Julian Ephemeris Day (TT 기준)
export function sunApparentLongitude(jde) {
  const T = (jde - 2451545.0) / 36525.0;
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;       // 평균황경
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;      // 평균근점이각
  const Mr = M * DEG;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
          + 0.000289 * Math.sin(3 * Mr);                          // 중심차
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG); // 장동+광행차 보정
  return ((lambda % 360) + 360) % 360;
}

// 균시차 (Equation of Time), 분 단위. 진태양시 = 평균태양시 + EoT
export function equationOfTimeMinutes(jde) {
  const T = (jde - 2451545.0) / 36525.0;
  const L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const eps = (23.439291 - 0.0130042 * T) * DEG;
  const y = Math.tan(eps / 2) ** 2;
  const L0r = L0 * DEG;
  const E = y * Math.sin(2 * L0r) - 2 * e * Math.sin(M)
          + 4 * e * y * Math.sin(M) * Math.cos(2 * L0r)
          - 0.5 * y * y * Math.sin(4 * L0r)
          - 1.25 * e * e * Math.sin(2 * M);
  return (E / DEG) * 4; // radians → degrees → minutes (1° = 4분)
}

// ── 절기 (24절기) 정의 — index 0..23, 목표 황경 ────────────────────────
// 절(節, 월의 시작)은 짝수 index가 아니라 아래 표의 'jie:true' 항목.
// 황경 315°(입춘)부터 시작하는 전통 순서로 정렬.
export const SOLAR_TERMS = [
  { name: '입춘', han: '立春', lon: 315, jie: true,  monthBranch: 2  }, // 寅월 시작
  { name: '우수', han: '雨水', lon: 330, jie: false },
  { name: '경칩', han: '驚蟄', lon: 345, jie: true,  monthBranch: 3  }, // 卯월
  { name: '춘분', han: '春分', lon: 0,   jie: false },
  { name: '청명', han: '淸明', lon: 15,  jie: true,  monthBranch: 4  }, // 辰월
  { name: '곡우', han: '穀雨', lon: 30,  jie: false },
  { name: '입하', han: '立夏', lon: 45,  jie: true,  monthBranch: 5  }, // 巳월
  { name: '소만', han: '小滿', lon: 60,  jie: false },
  { name: '망종', han: '芒種', lon: 75,  jie: true,  monthBranch: 6  }, // 午월
  { name: '하지', han: '夏至', lon: 90,  jie: false },
  { name: '소서', han: '小暑', lon: 105, jie: true,  monthBranch: 7  }, // 未월
  { name: '대서', han: '大暑', lon: 120, jie: false },
  { name: '입추', han: '立秋', lon: 135, jie: true,  monthBranch: 8  }, // 申월
  { name: '처서', han: '處暑', lon: 150, jie: false },
  { name: '백로', han: '白露', lon: 165, jie: true,  monthBranch: 9  }, // 酉월
  { name: '추분', han: '秋分', lon: 180, jie: false },
  { name: '한로', han: '寒露', lon: 195, jie: true,  monthBranch: 10 }, // 戌월
  { name: '상강', han: '霜降', lon: 210, jie: false },
  { name: '입동', han: '立冬', lon: 225, jie: true,  monthBranch: 11 }, // 亥월
  { name: '소설', han: '小雪', lon: 240, jie: false },
  { name: '대설', han: '大雪', lon: 255, jie: true,  monthBranch: 0  }, // 子월
  { name: '동지', han: '冬至', lon: 270, jie: false },
  { name: '소한', han: '小寒', lon: 285, jie: true,  monthBranch: 1  }, // 丑월
  { name: '대한', han: '大寒', lon: 300, jie: false },
];

// 목표 황경 targetLon 에 도달하는 시각(JD, UT)을 연도 근방에서 찾는다.
// 반환: JD(UT). bisection on apparent longitude. 황경 wrap 처리 포함.
export function findSolarTermJD(year, targetLon) {
  // 근사 시작일: 황경 0°(춘분)≈3/20. 하루 ≈ 0.9856°.
  // 목표까지 각거리로 대략적 날짜 추정 후 bisection.
  const approxDayOfYear = ((targetLon - 280 + 360) % 360) / 0.98565 + 1; // 거친 근사
  let lo = gregorianToJD(year, 1, 1) + approxDayOfYear - 8;
  let hi = lo + 16;
  // 황경 차이(목표 기준 -180..180)를 부호함수로 사용
  const diff = (jdUT) => {
    const jde = jdUT + deltaTSeconds(year) / 86400;
    let d = sunApparentLongitude(jde) - targetLon;
    d = ((d + 180) % 360 + 360) % 360 - 180;
    return d;
  };
  let flo = diff(lo), fhi = diff(hi);
  // 구간 안에 부호변화가 없으면 창을 확장
  let guard = 0;
  while (flo * fhi > 0 && guard < 40) {
    lo -= 2; hi += 2; flo = diff(lo); fhi = diff(hi); guard++;
  }
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const fm = diff(mid);
    if (Math.abs(fm) < 1e-6) return mid;
    if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

// 주어진 절(節) 12개의 JD(UT)를 연도 기준으로 반환 — 월주/대운 경계용.
// jieList: 입춘~소한까지 12개의 절(節). 전년 대설~당년 대설을 모두 다루기 위해
// year-1, year, year+1 세 해를 모두 계산해 시계열로 정렬해 반환.
export function jieMomentsAround(year) {
  const jies = SOLAR_TERMS.filter((t) => t.jie);
  const out = [];
  for (const y of [year - 1, year, year + 1]) {
    for (const t of jies) {
      out.push({ year: y, name: t.name, han: t.han, lon: t.lon,
                 monthBranch: t.monthBranch, jd: findSolarTermJD(y, t.lon) });
    }
  }
  out.sort((a, b) => a.jd - b.jd);
  return out;
}
