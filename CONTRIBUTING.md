# 기여 가이드 (Contributing)

saju-engine 에 관심 가져주셔서 감사합니다! 🙏 PR·이슈 모두 환영합니다.

## 시작하기

```bash
git clone https://github.com/adminhelper/saju-engine.git
cd saju-engine
node test/validate.mjs && node test/smoke-mcp.mjs   # 둘 다 통과하는지 먼저 확인
```

요구사항은 **Node.js ≥ 18** 뿐입니다(외부 의존성 없음, `npm install` 불필요).

## 어디를 고치나

무엇을 바꾸고 싶은지에 따라 파일이 다릅니다. 상세 레시피는 **[UPDATE.md](UPDATE.md)** 에 정리돼 있습니다.

| 바꾸려는 것 | 위치 |
|---|---|
| 디자인 / 색상 / 폰트 | `templates/*.html` 의 `<style>` (특히 `:root`) |
| 역술가 페르소나 / 12단계 구조 / 통변 규칙 | `skills/saju/SKILL.md` |
| 계산 로직 (원국·대운·신살·용신 등) | `mcp/lib/*.mjs` |
| MCP 툴 입출력 | `mcp/server.mjs` |

## 변경 → 검증 → PR

1. 브랜치를 만든다: `git checkout -b feat/내-기능`
2. 변경 후 **반드시 두 테스트를 통과**시킨다:
   ```bash
   node test/validate.mjs    # 골든 회귀 (계산 로직을 건드렸다면 필수)
   node test/smoke-mcp.mjs   # MCP 구동
   ```
   - 계산 로직 변경으로 골든값이 바뀌었다면, 그 변경이 **의도된 것인지 KASI 만세력 등으로 확인**한 뒤 `test/validate.mjs` 의 골든값을 갱신한다(자세한 내용은 UPDATE.md §2).
3. 커밋 메시지는 간결하게(예: `fix(engine): 시지 경계 정렬 수정`).
4. PR 을 연다. 무엇을·왜 바꿨는지, 어떻게 검증했는지 적어주세요.

## 코드 스타일

- ES Modules(`.mjs`), **외부 의존성 추가 금지**(zero-dependency 원칙 유지).
- 인덱스는 0-based(천간 0=甲, 지지 0=子). 상수는 `mcp/lib/constants.mjs` 에 모은다.
- 신살·용신 등 휴리스틱은 "엔진은 후보만, 확정은 LLM 통변" 원칙을 지킨다(너무 단정적으로 만들지 않기).

## ⚠️ 개인정보 (중요)

- **실제 인물의 이름·생년월일을 커밋하지 마세요.** 테스트/예시는 모두 **합성(synthetic)·가상 인물** 데이터만 사용합니다.
- 새 테스트 케이스가 필요하면 임의의 합성 날짜를 쓰세요(`test/validate.mjs` 참고).

## 버전

릴리스 시 버전을 **세 곳** 동기화: `.claude-plugin/plugin.json` · `mcp/package.json` · `mcp/lib/saju.mjs`(`ENGINE_VERSION`). SemVer 권장.

감사합니다! 🔮
