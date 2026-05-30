#!/usr/bin/env node
// server.mjs — saju-engine MCP 서버 (zero-dependency, stdio JSON-RPC 2.0)
// 노출 툴: compute_saju, compute_gunghap
// 프로토콜: MCP stdio (newline-delimited JSON-RPC). 외부 의존성 없음.
import { computeSaju, computeGunghap, ENGINE_VERSION } from './lib/saju.mjs';

const SERVER_INFO = { name: 'saju-engine', version: ENGINE_VERSION };
const DEFAULT_PROTOCOL = '2025-06-18';

// ── 입력 스키마 (사람 1명) ────────────────────────────────────────────
const personSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: '이름(선택)' },
    gender: { type: 'string', enum: ['male', 'female'], description: '성별 — 대운 방향 결정에 필수' },
    year: { type: 'integer', description: '양력 출생 연도' },
    month: { type: 'integer', minimum: 1, maximum: 12 },
    day: { type: 'integer', minimum: 1, maximum: 31 },
    hour: { type: 'integer', minimum: 0, maximum: 23, description: '24시간제 시(時)' },
    minute: { type: 'integer', minimum: 0, maximum: 59, default: 0 },
    calendar: { type: 'string', enum: ['solar'], default: 'solar', description: '현재 양력만 지원' },
    longitude: { type: 'number', description: '진태양시 보정 경도(기본 서울 126.978)' },
    useEquationOfTime: { type: 'boolean', default: false, description: '균시차(EoT) 포함 여부' },
    saeunFrom: { type: 'integer', description: '세운 시작 연도(선택)' },
    saeunTo: { type: 'integer', description: '세운 종료 연도(선택)' },
  },
  required: ['gender', 'year', 'month', 'day', 'hour'],
};

const TOOLS = [
  {
    name: 'compute_saju',
    description: '양력 생년월일시 + 성별로 사주 원국(년월일시 4기둥), 십성, 지장간, 오행분포, 12운성, 신살, 공망, 합충형파해, 신강·신약 점수, 용신 후보, 대운(방향·시작나이·배열)을 결정론적으로 계산해 JSON으로 반환한다. 해석/통변은 호출자(LLM)가 수행.',
    inputSchema: personSchema,
  },
  {
    name: 'compute_gunghap',
    description: '두 사람(personA, personB)의 사주를 각각 계산한 뒤 궁합 분석(일간 관계, 일지 합충형해, 오행 상호보완, 십성 교차, 종합 점수)을 결정론적으로 반환한다. 각 사람 인자는 compute_saju와 동일.',
    inputSchema: {
      type: 'object',
      properties: { personA: personSchema, personB: personSchema },
      required: ['personA', 'personB'],
    },
  },
];

function ok(id, result) { return { jsonrpc: '2.0', id, result }; }
function err(id, code, message, data) { return { jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } }; }
function textResult(obj) { return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] }; }

function handle(msg) {
  const { id, method, params } = msg;
  // 알림(notification) — id 없음 → 응답 안 함
  if (id === undefined || id === null) {
    return null;
  }
  switch (method) {
    case 'initialize': {
      const proto = params?.protocolVersion || DEFAULT_PROTOCOL;
      return ok(id, { protocolVersion: proto, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO });
    }
    case 'ping':
      return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: TOOLS });
    case 'tools/call': {
      const name = params?.name;
      const args = params?.arguments || {};
      try {
        if (name === 'compute_saju') return ok(id, textResult(computeSaju(args)));
        if (name === 'compute_gunghap') {
          if (!args.personA || !args.personB) throw new Error('personA, personB 가 모두 필요합니다.');
          return ok(id, textResult(computeGunghap(args.personA, args.personB)));
        }
        return err(id, -32602, `알 수 없는 툴: ${name}`);
      } catch (e) {
        // 툴 실행 오류는 isError content 로 반환 (MCP 권장)
        return ok(id, { content: [{ type: 'text', text: `오류: ${e.message}` }], isError: true });
      }
    }
    default:
      return err(id, -32601, `지원하지 않는 메서드: ${method}`);
  }
}

// ── stdio 루프 (newline-delimited JSON) ───────────────────────────────
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); }
    catch { process.stdout.write(JSON.stringify(err(null, -32700, 'JSON 파싱 오류')) + '\n'); continue; }
    const messages = Array.isArray(msg) ? msg : [msg];
    for (const m of messages) {
      const res = handle(m);
      if (res) process.stdout.write(JSON.stringify(res) + '\n');
    }
  }
});
process.stdin.on('end', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// stderr 로 기동 로그(스펙상 stdout 은 프로토콜 전용)
process.stderr.write(`[saju-engine] MCP server v${ENGINE_VERSION} ready (stdio)\n`);
