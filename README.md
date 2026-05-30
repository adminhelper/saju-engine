# 🔮 saju-engine

> **양력 생년월일시·성별만 넣으면, 30년 역술가 수준의 사주(四柱/명리) 상담 보고서를 단청(丹靑) 디자인 HTML 파일로 만들어 주는 Claude Code 플러그인.**
> *A deterministic Korean Four-Pillars (四柱/사주) engine + diviner persona for Claude Code. Produces beautiful, in-depth saju & compatibility reports as standalone HTML.*

Claude Code 채팅에 `홍길동 2000.03.21 12:00 남자 사주 봐줘` 한 줄이면 끝.
**만세력 계산은 코드(결정론 엔진)가** 정확히 하고, **해석은 역술가 페르소나(LLM)가** 깊이 있게 얹어, `~/Desktop` 에 12단계 보고서 HTML을 떨궈줍니다. 두 사람을 주면 **궁합(연애·결혼) 보고서**도 만듭니다.

---

## ✨ 무엇을 얻나요

- 📜 **개인 사주 보고서** — 12단계(원국·평생총운·금전·직업·연애·결혼·건강·인간관계·대운·세운·총평)
- 💞 **궁합 보고서** — 10단계(일간관계·오행상보·용신교환·일지합충·결혼적기·종합점수)
- 🎨 **단청 디자인** HTML — 한지 질감 배경, 4기둥 표, 오행 막대, 대운 표, 인쇄/모바일 대응
- 🧮 **결정론 만세력** — 절기·일주·진태양시·대운을 천문 계산으로 산출 (손계산 오차 제거)
- 🗣️ **쉬운 풀이** — 모든 전문용어를 "쉽게 말하면…" 으로 실생활 번역

> 👀 **출력 예시**: [`examples/sample-individual-report.html`](examples/sample-individual-report.html) 를 브라우저로 열어 보세요 (가상 인물 데모).

---

## 🚀 빠른 시작

```bash
# 1) 내려받기
git clone https://github.com/adminhelper/saju-engine.git
cd saju-engine

# 2) (선택) 엔진이 잘 도는지 확인 — Node 18+ 만 있으면 됨, 설치 불필요
node test/validate.mjs     # 골든 회귀 테스트
node test/smoke-mcp.mjs    # MCP 서버 구동 테스트
```

그다음 아래 **설치 (A) 또는 (B)** 중 하나로 Claude Code 에 연결하면, 채팅에서 바로 쓸 수 있습니다.

---

## 📦 설치

> 요구사항: **Node.js ≥ 18**. 외부 의존성 없음(zero-dependency, `npm install` 불필요).

### (A) Claude Code 플러그인으로 — 권장

skill(`/saju`)과 MCP 서버가 함께 활성화됩니다. 플러그인 등록 시 `.mcp.json` 의 `${CLAUDE_PLUGIN_ROOT}` 가 설치 경로로 자동 치환됩니다.

```jsonc
// .mcp.json (저장소에 포함되어 있음 — 플러그인이 자동 인식)
{
  "mcpServers": {
    "saju-engine": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/server.mjs"]
    }
  }
}
```

Claude Code 에서 이 저장소를 플러그인으로 추가하면 `skills/saju`, `templates/`, MCP 서버가 함께 따라옵니다.

### (B) MCP 서버만 단독 등록

`/saju` skill 없이 `compute_saju` / `compute_gunghap` 툴만 쓰려면, **절대경로**로 등록합니다.

```bash
# gh/claude CLI 사용 시
claude mcp add saju-engine -s user -- node /절대경로/saju-engine/mcp/server.mjs
```

또는 `~/.claude/settings.json` (또는 프로젝트 `.mcp.json`)에 직접:

```json
{
  "mcpServers": {
    "saju-engine": {
      "command": "node",
      "args": ["/절대경로/saju-engine/mcp/server.mjs"]
    }
  }
}
```

> 새 MCP 서버는 **Claude Code 재시작 후** 세션에 반영됩니다.

---

## 💬 사용법

채팅에 자연어로 던지면 `/saju` skill 이 발동합니다.

**개인 사주**
```
홍길동 金道潤 2000.03.21 12:00 남자 양력 사주 봐줘
```

**궁합 (두 사람 + "궁합")**
```
A 1995.05.20 09:00 남자 / B 1996.08.11 14:30 여자 궁합 봐줘
```

입력 형식 (대충 줘도 알아서 파싱하고, 확인 카드로 한 번 되물어봅니다):

| 항목 | 예 | 비고 |
|---|---|---|
| 이름 / 한자 | 홍길동 / 洪吉童 | 한자는 선택(디자인용) |
| 생년월일 | 2000-03-21 | **양력** 권장 |
| 출생시각 | 12:00 | 모르면 시주 제외 |
| **성별** | 남자 / 여자 | **필수** — 대운 방향이 갈림 |
| 양/음력 | 양력 | 음력은 양력으로 변환 후 |

- 결과는 채팅에 나열하지 않고 **`~/Desktop/saju-<이름>-<연도>.html`** 파일로 저장됩니다.
- 풀 보고서(긴 생성) 전에 **확인 카드**(4기둥·신강약·대운·경고)를 먼저 보여줘, 잘못된 입력으로 인한 재생성을 막습니다.

---

## ⚙️ 작동 원리

```
사용자 입력  →  결정론 만세력 엔진  →  MCP 서버  →  /saju skill(역술가 통변)  →  단청 HTML 템플릿  →  ~/Desktop/*.html
                (mcp/lib/*.mjs)      (compute_saju /      (해석·용신확정·             (individual /
                 절기·JDN·진태양시·     compute_gunghap)     신뢰도·경계 명시)            gunghap.html)
                 대운을 코드로 산출)
```

- **엔진은 구조적 "사실"만** 결정론적으로 계산합니다: 4기둥 간지, 십성, 지장간, 12운성, 신살, 공망, 합충형파해, 신강·신약 점수, 용신 후보, 대운(방향·시작나이·배열).
- **해석/통변은 LLM(skill)** 의 몫입니다: 용신 확정, 신강신약 보정, 신뢰도(상/중/하), 경계 모호성 명시.

| 파일 | 역할 |
|---|---|
| `mcp/lib/*.mjs` | 결정론 만세력 엔진 (constants·astronomy·core·pillars·elements·daewoon·saju) |
| `mcp/server.mjs` | 무설치 stdio MCP 서버 (`compute_saju`, `compute_gunghap`) |
| `skills/saju/SKILL.md` | 역술가 페르소나 · 12단계 구조 · 통변 규칙 |
| `templates/*.html` | 단청 HTML 템플릿 (개인 12섹션 / 궁합 10섹션) |
| `test/*.mjs` | 골든 회귀 · MCP 스모크 테스트 |

---

## 🧰 MCP 툴

### `compute_saju` — 개인 1명 원국

| 필드 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `gender` | `"male"`\|`"female"` | ✔ | **대운 방향 결정** |
| `year` `month` `day` `hour` | integer | ✔ | 양력 생년월일 + 24시간제 시 |
| `minute` | integer | | 분 (기본 0) |
| `name` | string | | 이름(선택) |
| `longitude` | number | | 진태양시 보정 경도 (기본 서울 126.978) |
| `saeunFrom` `saeunTo` | integer | | 세운 계산 연도 범위(선택) |

반환: `원국`(간지·십성·지장간·12운성), `오행분포`, `신강신약`, `용신후보`, `신살`, `공망`, `합충형파해`, `대운`, `세운`, `warnings`.

### `compute_gunghap` — 두 사람 궁합

`personA`, `personB` 각각 위 `compute_saju` 인자와 동일. 반환: `일간관계`, `일지관계`, `오행상호보완`, `십성교차`, `종합점수`, 각자의 전체 원국.

---

## ✅ 정확도 / 검증

```bash
node test/validate.mjs    # 골든 회귀: 합성 케이스의 4기둥·대운방향·시지경계경고 고정값 대조
node test/smoke-mcp.mjs   # MCP: stdio 핸드셰이크 + 두 툴 호출 end-to-end
```

- `validate.mjs` 의 케이스는 **검증된 엔진 출력을 고정한 골든값**(실제 인물 아닌 합성 날짜)으로, 계산 로직을 수정했을 때 회귀를 잡아냅니다.
- 정밀도가 중요하면 **KASI(한국천문연구원) 만세력과 1일 교차검증**을 권장합니다.

---

## ⚠️ 한계

- **양력만 정밀 지원** — 음력은 먼저 양력으로 변환해 입력 (변환 근거는 보고서에 명시).
- **신살·용신은 휴리스틱** — 엔진은 후보만 내고, 최종 통변은 LLM(역술가 skill)이 확정합니다.
- **진태양시 기본 경도는 서울(126.978°)** — 출생지가 다르면 `longitude` 로 보정.
- 시지·자시·절기 근접 등 **경계 모호성**은 숨기지 않고 `warnings` 로 명시합니다.

---

## 🔧 업데이트 & 라이선스

- 디자인·페르소나·계산 로직을 직접 손보는 방법은 **[UPDATE.md](./UPDATE.md)** 참고 (파일 지도 + 변경 레시피 + 검증 루틴).
- License: **[MIT](./LICENSE)** — 보고서는 명리학적 해석이며 의료·법률·재무 자문을 대체하지 않습니다.
