// constants.mjs — 천간/지지/오행/지장간 기본 상수 (zero-dep)
// 모든 인덱스는 0-based. 천간 0=甲 ... 9=癸, 지지 0=子 ... 11=亥.

// ── 천간 (Heavenly Stems) ─────────────────────────────────────────────
export const STEMS = [
  { han: '甲', kor: '갑', el: 0, yin: false }, // 양목
  { han: '乙', kor: '을', el: 0, yin: true  }, // 음목
  { han: '丙', kor: '병', el: 1, yin: false }, // 양화
  { han: '丁', kor: '정', el: 1, yin: true  }, // 음화
  { han: '戊', kor: '무', el: 2, yin: false }, // 양토
  { han: '己', kor: '기', el: 2, yin: true  }, // 음토
  { han: '庚', kor: '경', el: 3, yin: false }, // 양금
  { han: '辛', kor: '신', el: 3, yin: true  }, // 음금
  { han: '壬', kor: '임', el: 4, yin: false }, // 양수
  { han: '癸', kor: '계', el: 4, yin: true  }, // 음수
];

// ── 지지 (Earthly Branches) ───────────────────────────────────────────
// el: 오행, yin: 체(體)음양(위치음양). animal: 띠. mainHidden: 정기(본기) 지장간 stem index
export const BRANCHES = [
  { han: '子', kor: '자', el: 4, yin: false, animal: '쥐',   mainHidden: 9 }, // 양수 / 본기 癸
  { han: '丑', kor: '축', el: 2, yin: true,  animal: '소',   mainHidden: 5 }, // 음토 / 본기 己
  { han: '寅', kor: '인', el: 0, yin: false, animal: '범',   mainHidden: 0 }, // 양목 / 본기 甲
  { han: '卯', kor: '묘', el: 0, yin: true,  animal: '토끼', mainHidden: 1 }, // 음목 / 본기 乙
  { han: '辰', kor: '진', el: 2, yin: false, animal: '용',   mainHidden: 4 }, // 양토 / 본기 戊
  { han: '巳', kor: '사', el: 1, yin: true,  animal: '뱀',   mainHidden: 2 }, // 음화 / 본기 丙
  { han: '午', kor: '오', el: 1, yin: false, animal: '말',   mainHidden: 3 }, // 양화 / 본기 丁
  { han: '未', kor: '미', el: 2, yin: true,  animal: '양',   mainHidden: 5 }, // 음토 / 본기 己
  { han: '申', kor: '신', el: 3, yin: false, animal: '원숭이', mainHidden: 6 }, // 양금 / 본기 庚
  { han: '酉', kor: '유', el: 3, yin: true,  animal: '닭',   mainHidden: 7 }, // 음금 / 본기 辛
  { han: '戌', kor: '술', el: 2, yin: false, animal: '개',   mainHidden: 4 }, // 양토 / 본기 戊
  { han: '亥', kor: '해', el: 4, yin: true,  animal: '돼지', mainHidden: 8 }, // 음수 / 본기 壬
];

// ── 오행 (Five Elements) ──────────────────────────────────────────────
export const ELEMENTS = [
  { han: '木', kor: '목', en: 'wood'  },
  { han: '火', kor: '화', en: 'fire'  },
  { han: '土', kor: '토', en: 'earth' },
  { han: '金', kor: '금', en: 'metal' },
  { han: '水', kor: '수', en: 'water' },
];

// 오행 상생/상극. gen(a) = a가 생하는 오행, ctrl(a) = a가 극하는 오행
export const gen  = (a) => (a + 1) % 5;        // 목생화 화생토 토생금 금생수 수생목
export const ctrl = (a) => (a + 2) % 5;        // 목극토 토극수 수극화 화극금 금극목

// ── 지장간 (Hidden Stems) — [여기, 중기, 정기] stem indices ──────────────
// 정기(본기)는 배열의 마지막 원소.
export const HIDDEN_STEMS = [
  [8, 9],        // 子: 壬 癸
  [9, 7, 5],     // 丑: 癸 辛 己
  [4, 2, 0],     // 寅: 戊 丙 甲
  [0, 1],        // 卯: 甲 乙
  [1, 9, 4],     // 辰: 乙 癸 戊
  [4, 6, 2],     // 巳: 戊 庚 丙
  [2, 5, 3],     // 午: 丙 己 丁
  [3, 1, 5],     // 未: 丁 乙 己
  [4, 8, 6],     // 申: 戊 壬 庚
  [6, 7],        // 酉: 庚 辛
  [7, 3, 4],     // 戌: 辛 丁 戊
  [4, 0, 8],     // 亥: 戊 甲 壬
];

// ── 십성 (Ten Gods) 이름 — relation index 0..9 ─────────────────────────
//  0 비견 1 겁재 2 식신 3 상관 4 편재 5 정재 6 편관 7 정관 8 편인 9 정인
export const TEN_GODS = [
  { han: '比肩', kor: '비견', group: '비겁' },
  { han: '劫財', kor: '겁재', group: '비겁' },
  { han: '食神', kor: '식신', group: '식상' },
  { han: '傷官', kor: '상관', group: '식상' },
  { han: '偏財', kor: '편재', group: '재성' },
  { han: '正財', kor: '정재', group: '재성' },
  { han: '偏官', kor: '편관', group: '관성' }, // 칠살
  { han: '正官', kor: '정관', group: '관성' },
  { han: '偏印', kor: '편인', group: '인성' },
  { han: '正印', kor: '정인', group: '인성' },
];

// ── 12운성 (Twelve Life Stages) ───────────────────────────────────────
export const LIFE_STAGES = [
  '장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양',
];
export const LIFE_STAGES_HAN = [
  '長生', '沐浴', '冠帶', '建祿', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養',
];
// 일간별 장생 지지 index
export const JANGSAENG = {
  0: 11, // 甲 → 亥 (순행)
  1: 6,  // 乙 → 午 (역행)
  2: 2,  // 丙 → 寅 (순행)
  3: 9,  // 丁 → 酉 (역행)
  4: 2,  // 戊 → 寅 (순행)
  5: 9,  // 己 → 酉 (역행)
  6: 5,  // 庚 → 巳 (순행)
  7: 0,  // 辛 → 子 (역행)
  8: 8,  // 壬 → 申 (순행)
  9: 3,  // 癸 → 卯 (역행)
};

// ── 시지 경계용 12시 한자 이름은 BRANCHES 재사용 ───────────────────────

// helper: ganzhi 60갑자 index → {stem, branch}
export const stemOf   = (g) => ((g % 10) + 10) % 10;
export const branchOf = (g) => ((g % 12) + 12) % 12;
// stem,branch → 60갑자 index (0..59). stem,branch must have matching parity.
export function ganzhiIndex(stem, branch) {
  for (let g = 0; g < 60; g++) if (g % 10 === stem && g % 12 === branch) return g;
  return -1;
}
export function pillarLabel(stem, branch) {
  return {
    stem: STEMS[stem].han, branch: BRANCHES[branch].han,
    ganzhi: STEMS[stem].han + BRANCHES[branch].han,
    ganzhiKor: STEMS[stem].kor + BRANCHES[branch].kor,
  };
}
