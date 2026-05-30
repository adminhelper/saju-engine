# UPDATE.md — saju-engine 를 계속 개선하는 실전 가이드

이 문서는 **이 플러그인의 주인(나)** 이 시간이 지나도 직접 손봐서 발전시키기 위한 정비 매뉴얼이다.
"어디를 → 무엇을 → 어떻게 검증" 까지 레시피로 정리했다. zero-dependency 라 `npm install` 없이 `node` 만 있으면 된다.

> 한 줄 요약: **디자인은 `templates/*.html` 의 `<style>`**, **말투/12단계/규칙은 `skills/saju/SKILL.md`**, **계산은 `mcp/lib/*.mjs`**, **MCP 입출력은 `mcp/server.mjs`** 에서 고친다. 무엇을 바꾸든 마지막엔 반드시 `node test/validate.mjs` + `node test/smoke-mcp.mjs` 둘 다 통과시킨다.

---

## 0. 파일 지도 — 무엇을 어디서 고치나

| 바꾸고 싶은 것 | 고치는 파일 | 비고 |
|---|---|---|
| **디자인 / 색상 / 폰트 / 레이아웃** | `templates/individual.html`, `templates/gunghap.html` 의 `<style>` (특히 `:root` 변수) | 계산과 무관. HTML/CSS 만 |
| **역술가 페르소나 / 어조 / 12단계 구조 / 통변 규칙** | `skills/saju/SKILL.md` | LLM 이 읽는 지시문. 코드 아님 |
| **보고서 섹션 추가·삭제·문구** | `skills/saju/SKILL.md`(구조 정의) + `templates/*.html`(마크업 자리) 둘 다 | 한쪽만 바꾸면 어긋남 |
| **계산 로직 (원국·대운·신살·용신 등)** | `mcp/lib/*.mjs` (아래 역할표) | 바꾸면 회귀 테스트로 검증 필수 |
| **MCP 툴 이름 / 입력 스키마 / 출력 포맷** | `mcp/server.mjs` | 툴: `compute_saju`, `compute_gunghap` |
| **검증 케이스 / 정답지** | `test/validate.mjs`, `test/smoke-mcp.mjs` | 회귀 가드 |
| **버전 / 메타데이터** | `.claude-plugin/plugin.json`, `mcp/package.json`, `mcp/lib/saju.mjs`(`ENGINE_VERSION`) | 셋 동기화 |
| **MCP 서버 등록 방식** | `.mcp.json` | `${CLAUDE_PLUGIN_ROOT}/mcp/server.mjs` 실행 |

### `mcp/lib/*.mjs` 각 파일 역할 (한 줄씩)

- **`constants.mjs`** — 천간(STEMS)·지지(BRANCHES)·오행(ELEMENTS)·지장간(HIDDEN_STEMS)·십성(TEN_GODS)·12운성(LIFE_STAGES/JANGSAENG) 등 모든 기본 상수 테이블. 인덱스는 0-based(천간 0=甲, 지지 0=子). 다른 모든 파일이 여기서 import 한다.
- **`astronomy.mjs`** — 율리우스일(JD) 변환, ΔT 근사, 태양 겉보기황경, 균시차(EoT), **24절기 시각(`findSolarTermJD`)** 과 절(節) 시계열(`jieMomentsAround`). 월주·대운 경계 판정의 천문 기반.
- **`core.mjs`** — 십성(`tenGodIndex`/`tenGod`), 12운성(`lifeStage`), 지장간(`hiddenStems`), 공망(`gongmang`), **신살(`computeSinsal`)**, **합충형파해(`computeInteractions`)**. 신살·합충 테이블이 여기 상수로 박혀 있다.
- **`pillars.mjs`** — 생년월일시 → **원국 4기둥(년/월/일/시)**. 입춘 기준 년주, 절 구간 기준 월주, JDN 기준 일주(`DAY_OFFSET=49`), 진태양시 기준 시주(경도보정 `DEFAULT_LONGITUDE=126.978`). 시지·자시·절기 경계 경고도 생성.
- **`elements.mjs`** — **오행분포**(가시8자/지장간가중), **십성분포**, **신강·신약 점수(`strengthScore`)**, **용신 후보(`yongsinCandidates`)**. 전부 휴리스틱 — 보정 시 여기.
- **`daewoon.mjs`** — **대운(방향·시작나이·배열, `computeDaewoon`)** 과 **세운(`computeSaeun`)**. 방향은 년간 음양 × 성별, 시작나이는 절기까지 잔여일수 ÷ 3.
- **`saju.mjs`** — 최상위 조립. 위 모듈을 묶어 `computeSaju()`(개인)·`computeGunghap()`(궁합) 의 **최종 JSON 형태**를 만든다. `ENGINE_VERSION` 상수가 여기 있다.

데이터 흐름: `server.mjs` → `saju.mjs` → (`pillars` ← `astronomy`, `constants`) + (`elements`, `core`, `daewoon` ← `constants`).

---

## 1. 자주 하는 변경 레시피

각 레시피는 **어느 파일 → 무엇을 → 어떻게 검증** 순서다. 변경 후에는 항상 §2 의 검증 루틴을 돌린다.

### 레시피 ① 디자인/색상 바꾸기 (`:root` 변수)

- **어디**: `templates/individual.html` 의 `<style>` 안 `:root { … }` (현재 23~40행 근방). 궁합은 `templates/gunghap.html` 에 동일 패턴.
- **무엇을**: 단청 팔레트가 CSS 변수로 모여 있다. 한 곳만 고치면 전체 톤이 바뀐다.
  ```css
  --accent:   #8b1a1a;   /* 단청 적색 — 제목/강조 */
  --accent2:  #1f3d2b;   /* 녹청 — 보조 제목 */
  --accent3:  #1a3a5c;   /* 청 */
  --gold:     #a87a2a;   /* 금박선 */
  --paper:    #f7f1e3;   /* 배경 종이색 */
  --ink:      #1a1410;   /* 본문 글자 */
  ```
  - 예) 더 차분하게: `--accent` 를 `#6e1414`, `--paper` 를 `#f4efe2` 로.
  - 폰트는 `:root` 위 `<link href="https://fonts.googleapis.com/css2?...">` 줄에서 교체(현재 Noto Serif KR / Gowun Batang / Nanum Myeongjo / Cormorant).
  - 섹션별 세부 스타일은 `/* ===== Cover ===== */`, `/* ===== Pillars ===== */`, `/* ===== Daewoon table ===== */` 처럼 주석으로 구획돼 있으니 해당 블록만 손댄다.
- **검증**: 계산과 무관하므로 테스트는 안 깨진다. **샘플 보고서를 실제로 1장 생성해 눈으로 확인**한다.
  ```bash
  cd /path/to/saju-engine
  # 샘플 데이터로 엔진 JSON 만 확인:
  node -e "import('./mcp/lib/saju.mjs').then(m=>console.log(JSON.stringify(m.computeSaju({name:'홍길동',gender:'male',year:2000,month:3,day:21,hour:12,minute:0}),null,2)))" | head -40
  # 디자인 자체는 템플릿을 브라우저로 열어 확인:
  open templates/individual.html   # {{ }} 자리는 비어 보이지만 색/폰트/레이아웃은 검수 가능
  ```

### 레시피 ② 보고서 섹션 추가 / 문구 수정

- **어디**: **두 파일을 함께** 고친다.
  1. `skills/saju/SKILL.md` 의 **"12단계 고정 구조"** 목록 — 섹션 번호·제목·요구사항을 정의.
  2. `templates/individual.html` — 그 섹션의 실제 마크업 자리(`<h2 class="section"><span class="num">N</span> …</h2>` + `{{ }}` 플레이스홀더).
- **무엇을**:
  - **문구만** 바꿀 때(예: 8번 건강운에 "한방 체질" 한 줄 추가): SKILL.md 의 해당 항목 설명을 고치고, 템플릿의 대응 `{{ }}` 안내문을 맞춰 수정.
  - **섹션을 새로 추가**할 때(예: 13번 "학업·시험운"): SKILL.md 의 12단계 목록에 항목을 추가하고(번호 규칙 유지), 템플릿에서 기존 섹션 블록을 복제해 `<span class="num">13</span>` 과 새 `{{ }}` 자리를 만든다. 신뢰도 칩 `<span class="conf h">상</span>` 패턴도 같이 복제.
- **주의**: SKILL.md 는 "12단계 순서·번호 **고정**, 누락 금지" 를 명시한다. 번호를 바꾸면 통변 규칙과 충돌하니, 추가는 **뒤에 덧붙이기**를 권장하고 규칙 문구도 함께 갱신한다.
- **검증**: 코드 미변경이면 테스트는 영향 없음. `/saju` 로 실제 보고서 1장을 생성해 새 섹션이 채워지는지 확인. 플레이스홀더(`{{ }}`)가 그대로 남아 있으면 SKILL.md 안내가 부족한 것 → 설명을 더 구체화.

### 레시피 ③ 신살(神殺) 추가

- **어디**: `mcp/lib/core.mjs` 상단의 신살 테이블 + `computeSinsal()`.
- **무엇을**: 기존 패턴을 그대로 따른다. 예로 **귀문관살(鬼門關殺)** 같이 "일지/년지 기준 특정 지지" 형이면:
  1. 매핑 상수를 추가(인덱스는 `constants.mjs` 기준: 子0…亥11). 천간 기준이면 `CHEONEUL`/`MUNCHANG`/`YANGIN` 처럼 `{ 일간idx: 지지idx }` 형태, 삼합 그룹 기준이면 `DOHWA`/`YEOKMA`/`HWAGAE` 처럼 `{ 그룹0..3: 지지idx }` 형태.
  2. `computeSinsal()` 안에서 `add(지지idx, '신살명')` 을 호출(일간 기준이면 `for (const b of (새테이블[dayStem]||[])) add(b, '이름')`, 삼합 기준이면 `refs` 루프 안에서 `add(새테이블[g], '이름')`).
  - `add(bIdx, name)` 는 4기둥 중 해당 지지가 있는 자리에 자동으로 태그를 붙이고, 마지막에 `[...new Set(...)]` 로 중복 제거된다.
- **검증**: `node test/validate.mjs` 는 원국 간지·대운방향만 보므로 **신살을 추가해도 통과해야 정상**(깨지면 인덱스 실수). 추가로 확인:
  ```bash
  node -e "import('./mcp/lib/saju.mjs').then(m=>console.log(JSON.stringify(m.computeSaju({gender:'female',year:1990,month:8,day:15,hour:6,minute:30}).신살,null,2)))"
  ```
  손계산 신살표(또는 KASI/만세력 앱)와 1~2명 대조해 새 신살이 맞는 자리에 뜨는지 확인.

### 레시피 ④ 용신 / 신강·신약 휴리스틱 보정

- **어디**: `mcp/lib/elements.mjs` 의 `strengthScore()` 와 `yongsinCandidates()`.
- **무엇을**:
  - **신강·신약 가중치**: `strengthScore()` 안의 `const stemW = [1, 1.2, 0, 1]`(천간 위치 가중, 일간 자리 0), `const branchW = [1.3, 3.0, 2.0, 1.5]`(지지 위치 가중, 월령=index1 이 최대). 월령 비중을 더 키우려면 `branchW[1]` 을 올린다. 신강/신약 경계는 `score >= 60` / `<= 40` 줄에서 조정.
  - **용신 방향 임계값**: `yongsinCandidates()` 의 `const strong = strength.score >= 55;`. 억부 후보(설·극 vs 생·조)와 조후(겨울→火, 여름→水) 로직이 그 아래에 있다.
- **주의**: 이건 의도된 **휴리스틱**이다. 코드 주석과 SKILL.md 모두 "최종 용신은 명리가/LLM 이 통변에서 확정" 이라고 못박는다. 즉 **엔진은 후보만, 확정은 SKILL.md 의 역술가 판단**. 너무 단정적으로 만들지 말 것.
- **검증**: 신강신약 라벨은 `validate.mjs` 골든값에 없으므로 회귀 테스트는 안 깨진다. 대신 합성 케이스(`test/validate.mjs`)로 점수 변화를 직접 비교:
  ```bash
  node -e "import('./mcp/lib/saju.mjs').then(m=>{const r=m.computeSaju({gender:'male',year:2000,month:3,day:21,hour:12,minute:0});console.log(r.신강신약, r.용신후보)})"
  ```
  보정 전후 점수를 적어두고, KASI 만세력 등 외부 기준의 신강/신약 판정과 어긋나지 않는지 본다.

### 레시피 ⑤ 음력 → 양력 변환 추가 (새 모듈)

- **현재 상태**: 엔진은 **양력만 정밀 지원**. `saju.mjs` 는 `calendar !== 'solar'` 면 warning 만 넣고, SKILL.md 는 "음력이면 먼저 양력으로 변환" 하라고 LLM 에 지시한다.
- **어디 → 무엇을** (네이티브 변환을 엔진에 넣고 싶을 때):
  1. **새 파일** `mcp/lib/lunar.mjs` 를 만들고 `export function lunarToSolar({year, month, day, isLeapMonth=false}) { … return {year, month, day} }` 를 구현. (한국 음력은 KASI 음양력 데이터 기반이 정확. zero-dep 원칙을 지키려면 변환표를 상수로 임베드하거나, 신뢰 가능한 알고리즘을 직접 포팅.)
  2. `mcp/lib/saju.mjs` `computeSaju()` 도입부에서 `if (calendar === 'lunar') { const s = lunarToSolar({year,month,day}); /* year/month/day 교체 + disclaimer 기록 */ }`.
  3. `mcp/server.mjs` 의 `personSchema` 에서 `calendar` enum 을 `['solar','lunar']` 로 넓히고 설명 갱신.
- **주의**: zero-dependency 원칙 유지(외부 npm 금지). 변환 근거(어느 데이터/알고리즘)를 결과 `disclaimer` 에 반드시 남긴다.
- **검증**: 음력 변환은 정답이 까다로우니 **양력 회귀(`validate.mjs`)부터 안 깨지는지** 확인(양력 경로는 그대로여야 함). 그 뒤 음력↔양력 쌍 몇 개를 KASI 음양력 변환과 대조하는 **새 케이스를 `test/validate.mjs` 에 추가**(레시피 ⑥).

### 레시피 ⑥ 새 인물 검증 케이스 추가

- **어디**: `test/validate.mjs` 의 `CASES` 배열(원국 회귀) — 필요하면 `test/smoke-mcp.mjs` 의 호출 인자도.
- **무엇을**: 손계산(또는 KASI 만세력)으로 **확정한** 정답을 한 줄 추가.
  ```js
  { name: '합성7', g: 'male', y: 2000, mo: 3, d: 21, h: 12, mi: 0,
    expect: { 년: '庚辰', 월: '己卯', 일: '戊寅', 시: '戊午', dir: '순행' } },
  ```
  - `g` 는 `'male'`/`'female'`, 시(`h`)는 24시간제, `dir` 은 `'순행'`/`'역행'`.
  - *정확도*를 검증할 새 케이스라면 **신뢰 가능한 만세력(KASI 등)과 대조해 맞는 값만** 골든으로 굳힌다(미검증 엔진 출력을 그대로 베끼면 회귀 가드 의미가 약해진다).
- **검증**: `node test/validate.mjs` 가 추가 케이스 포함 전부 ✅ 면 끝. 현재 베이스라인은 **9/9 통과**다.

---

## 2. 검증 루틴 (모든 변경 후 필수)

zero-dependency라 설치 없이 바로 돈다. **두 개 다** 통과해야 변경을 신뢰한다.

```bash
cd /path/to/saju-engine

node test/validate.mjs     # ① 골든 회귀: 합성 케이스의 4기둥·대운방향 + 시지경계경고 대조
node test/smoke-mcp.mjs     # ② MCP 구동: 서버 stdio 핸드셰이크 + 툴 호출 end-to-end
```

기대 출력:
- `validate.mjs` → 마지막 줄 `결과: 9/9 통과` + `✔ 골든 원국·대운방향·시지경계경고가 모두 고정값과 일치합니다.`
- `smoke-mcp.mjs` → 모든 항목 ✅ + `✔ MCP 스모크 테스트 전체 통과`

`npm test`(= `mcp/package.json` 의 스크립트)는 `validate.mjs` 만 돈다. 안전하려면 위 두 명령을 직접 실행.

> **핵심 주의 — 골든 회귀 가드**: `validate.mjs` 의 케이스는 검증된 엔진 출력을 고정한 **골든 회귀 가드**다(합성 날짜, 실제 인물 아님).
> 계산 로직(`pillars.mjs`/`astronomy.mjs`/`daewoon.mjs`/`constants.mjs`)을 고친 뒤 이게 **깨지면, 먼저 의도한 변경인지 확인**한다.
> 의도치 않은 회귀면 로직을 되돌리고, 의도된 개선(예: 더 정확한 절기·ΔT)이면 KASI 만세력 등으로 새 출력이 옳은지 확인한 뒤 골든값을 갱신한다.

---

## 3. 버전 올리기 (세 곳 동기화)

릴리스할 땐 버전을 **세 곳 모두** 같은 값으로 맞춘다. 현재 전부 `0.1.0`.

1. `.claude-plugin/plugin.json` → `"version": "0.2.0"`
2. `mcp/package.json` → `"version": "0.2.0"`
3. `mcp/lib/saju.mjs` → `const ENGINE_VERSION = '0.2.0';`  ← 이 값이 MCP `serverInfo.version` 과 결과 JSON `engine.version` 으로 그대로 노출된다.

확인:
```bash
grep -R "0.2.0" .claude-plugin/plugin.json mcp/package.json mcp/lib/saju.mjs
node test/smoke-mcp.mjs   # serverInfo.version 이 새 값인지 간접 확인
```
SemVer 권장: 버그수정 patch(0.1.x), 기능추가 minor(0.x.0), 출력 포맷/툴 시그니처 깨짐 major(x.0.0).

---

## 4. git 으로 배포 / 롤백

이 디렉터리는 이미 git 저장소다. 변경 → 테스트 통과 → 커밋 → 태그 순서.

```bash
cd /path/to/saju-engine

# 1) 변경 후 두 테스트 통과 확인 (§2)
node test/validate.mjs && node test/smoke-mcp.mjs

# 2) 커밋
git add -A
git commit -m "feat: 귀문관살 신살 추가 + 신강 가중치 보정"

# 3) 버전 태그 (§3 과 동일 버전)
git tag v0.2.0
```

**롤백**(문제가 생겼을 때):
```bash
git log --oneline -10            # 되돌릴 지점 확인
git revert <commit>              # 안전: 되돌리는 새 커밋 생성(이력 보존)
# 또는 아직 커밋 안 한 작업 폐기:
git checkout -- <파일>           # 특정 파일만 마지막 커밋 상태로
git stash                        # 통째로 잠시 치워두기
```

**다른 사람에게 배포**(GitHub plugin 으로 설치하게):
```bash
gh repo create saju-engine --public --source=. --push   # 최초 1회
git push && git push --tags                              # 이후 갱신
```
설치하는 쪽은 Claude Code 에서 이 저장소를 plugin 으로 추가하면 `.mcp.json`(`${CLAUDE_PLUGIN_ROOT}/mcp/server.mjs`)·`skills/saju`·`templates` 가 함께 따라간다. Node 18+ 만 있으면 동작(외부 의존성 없음).

---

## 5. 빠른 점검 체크리스트 (변경 직전/직후)

- [ ] 디자인만 바꿨나? → 코드/테스트 무관, **브라우저로 템플릿 눈 검수**.
- [ ] 계산 로직을 건드렸나? → `node test/validate.mjs` **8/8** 유지 확인. 깨지면 내 변경 재검토.
- [ ] MCP 스키마/툴을 바꿨나? → `node test/smoke-mcp.mjs` 전체 ✅.
- [ ] 섹션/문구를 바꿨나? → `SKILL.md` 와 `templates/*.html` **둘 다** 손봤나, `/saju` 로 실제 1장 생성해 `{{ }}` 가 안 남았나.
- [ ] 릴리스인가? → 버전 3곳 동기화 → 커밋 → `git tag` → (필요시) push.
