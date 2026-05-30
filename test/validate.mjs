// validate.mjs — 결정론 엔진 골든(golden) 회귀 테스트
// 실행: node test/validate.mjs
//
// ⚠ 아래 케이스는 실제 인물이 아니라 임의의 합성(synthetic) 날짜다.
//   expect 값은 "현재 검증된 엔진 출력"을 고정한 골든값이다. 엔진 로직(절기/일주/대운 등)을
//   수정했을 때 의도치 않은 회귀를 잡아내는 안전망 역할을 한다.
//   값이 바뀌어 실패하면, 그 변경이 의도된 것인지 검토한 뒤 골든값을 갱신할 것.
//   (날짜는 절기 경계에서 충분히 떨어뜨려 ΔT 미세조정에도 안정적이도록 골랐다.)
import { computeSaju } from '../mcp/lib/saju.mjs';

const CASES = [
  { name: '합성1', g: 'male',   y: 2000, mo: 3,  d: 21, h: 12, mi: 0,  expect: { 년: '庚辰', 월: '己卯', 일: '戊寅', 시: '戊午', dir: '순행' } },
  { name: '합성2', g: 'female', y: 1990, mo: 8,  d: 15, h: 6,  mi: 30, expect: { 년: '庚午', 월: '甲申', 일: '壬子', 시: '癸卯', dir: '역행' } },
  { name: '합성3', g: 'male',   y: 1984, mo: 6,  d: 10, h: 23, mi: 30, expect: { 년: '甲子', 월: '庚午', 일: '乙亥', 시: '丁亥', dir: '순행' } },
  { name: '합성4', g: 'female', y: 1995, mo: 11, d: 15, h: 9,  mi: 20, expect: { 년: '乙亥', 월: '丁亥', 일: '庚戌', 시: '庚辰', dir: '순행' } },
  { name: '합성5', g: 'male',   y: 2010, mo: 7,  d: 15, h: 14, mi: 30, expect: { 년: '庚寅', 월: '癸未', 일: '丙寅', 시: '乙未', dir: '순행' } },
  { name: '합성6', g: 'female', y: 1976, mo: 12, d: 21, h: 3,  mi: 0,  expect: { 년: '丙辰', 월: '庚子', 일: '丁未', 시: '辛丑', dir: '역행' } },
];

let pass = 0, fail = 0;
const fails = [];
for (const c of CASES) {
  const r = computeSaju({ name: c.name, gender: c.g, year: c.y, month: c.mo, day: c.d, hour: c.h, minute: c.mi });
  const got = {
    년: r.원국.간지.년주, 월: r.원국.간지.월주, 일: r.원국.간지.일주, 시: r.원국.간지.시주,
    dir: r.대운.forward ? '순행' : '역행',
  };
  const keys = ['년', '월', '일', '시', 'dir'];
  const diffs = keys.filter((k) => got[k] !== c.expect[k]);
  const ok = diffs.length === 0;
  if (ok) pass++; else { fail++; fails.push({ name: c.name, diffs: diffs.map((k) => `${k}: 기대 ${c.expect[k]} / 산출 ${got[k]}`) }); }
  console.log(`${ok ? '✅' : '❌'} ${c.name.padEnd(4)} 년 ${got.년} 월 ${got.월} 일 ${got.일} 시 ${got.시} 대운 ${got.dir}  (대운수 ${r.대운.startAge}세, ${r.대운.startAgeYears}년)`);
  if (!ok) for (const d of diffs) console.log(`     ↳ 불일치 ${d}: 기대 ${c.expect[d]} / 산출 ${got[d]}`);
}

// ── 시지 경계 경고 정확성 회귀 (홀수시 정렬 버그 가드) ──────────────────
const hasSijiEdge = (o) => computeSaju(o).warnings.some((w) => w.includes('시지'));
const EDGE = [
  { label: '午시 한가운데(오경고 없어야)', o: { gender: 'male',   year: 2000, month: 3, day: 21, hour: 12, minute: 0  }, want: false },
  { label: '卯시 한가운데(오경고 없어야)', o: { gender: 'female', year: 1990, month: 8, day: 15, hour: 6,  minute: 30 }, want: false },
  { label: '寅→卯 경계 2분전(경고 떠야)',   o: { gender: 'male',   year: 1988, month: 5, day: 20, hour: 5,  minute: 30 }, want: true },
];
for (const e of EDGE) {
  const got = hasSijiEdge(e.o);
  const ok = got === e.want;
  if (ok) pass++; else { fail++; fails.push({ name: e.label, diffs: [`시지경계경고 기대 ${e.want} / 산출 ${got}`] }); }
  console.log(`${ok ? '✅' : '❌'} 시지경계 ${e.label} → ${got}`);
}

const total = CASES.length + EDGE.length;
console.log(`\n결과: ${pass}/${total} 통과` + (fail ? `, ${fail} 실패` : ''));
if (fail) { console.log(JSON.stringify(fails, null, 2)); process.exit(1); }
console.log('✔ 골든 원국·대운방향·시지경계경고가 모두 고정값과 일치합니다.');
