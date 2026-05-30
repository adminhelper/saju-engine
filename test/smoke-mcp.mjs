// smoke-mcp.mjs — MCP 서버를 실제 stdio 로 구동해 핸드셰이크+툴호출 검증
// 실행: node test/smoke-mcp.mjs
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const server = join(here, '..', 'mcp', 'server.mjs');
const child = spawn('node', [server], { stdio: ['pipe', 'pipe', 'inherit'] });

const queue = [];
let buf = '';
child.stdout.setEncoding('utf8');
child.stdout.on('data', (d) => {
  buf += d;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (line) queue.push(JSON.parse(line));
  }
});

const send = (obj) => child.stdin.write(JSON.stringify(obj) + '\n');
const waitFor = (id, ms = 4000) => new Promise((res, rej) => {
  const t0 = Date.now();
  const iv = setInterval(() => {
    const i = queue.findIndex((m) => m.id === id);
    if (i >= 0) { clearInterval(iv); res(queue.splice(i, 1)[0]); }
    else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('timeout id=' + id)); }
  }, 10);
});

let failed = false;
const check = (cond, label) => { console.log((cond ? '✅' : '❌') + ' ' + label); if (!cond) failed = true; };

try {
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } } });
  const init = await waitFor(1);
  check(init.result?.serverInfo?.name === 'saju-engine', 'initialize → serverInfo.name=saju-engine');

  send({ jsonrpc: '2.0', method: 'notifications/initialized' }); // 알림(무응답)

  send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const list = await waitFor(2);
  const names = (list.result?.tools || []).map((t) => t.name);
  check(names.includes('compute_saju') && names.includes('compute_gunghap'), 'tools/list → compute_saju, compute_gunghap');

  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'compute_saju', arguments: { name: '홍길동', gender: 'male', year: 2000, month: 3, day: 21, hour: 12, minute: 0 } } });
  const call = await waitFor(3);
  const payload = JSON.parse(call.result.content[0].text);
  const gz = payload.원국?.간지;
  check(gz?.년주 === '庚辰' && gz?.월주 === '己卯' && gz?.일주 === '戊寅' && gz?.시주 === '戊午', `compute_saju(홍길동) → ${gz?.년주}${gz?.월주}${gz?.일주}${gz?.시주} (기대 庚辰己卯戊寅戊午)`);
  check(payload.대운?.direction?.includes('순행'), 'compute_saju(홍길동) → 대운 순행');

  send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'compute_gunghap', arguments: {
    personA: { name: '김철수', gender: 'male', year: 2000, month: 3, day: 21, hour: 12, minute: 0 },
    personB: { name: '이영희', gender: 'female', year: 1990, month: 8, day: 15, hour: 6, minute: 30 },
  } } });
  const gh = await waitFor(4);
  const gp = JSON.parse(gh.result.content[0].text);
  check(typeof gp.종합점수?.score === 'number' && gp.일간관계?.type, `compute_gunghap(김철수×이영희) → 점수 ${gp.종합점수?.score}/100, 일간관계 ${gp.일간관계?.type}`);

  send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'compute_saju', arguments: { gender: 'male' } } });
  const bad = await waitFor(5);
  check(bad.result?.isError === true || bad.error, 'compute_saju(불완전 입력) → 오류 처리');
} catch (e) {
  console.error('스모크 실패:', e.message); failed = true;
} finally {
  child.stdin.end();
  child.kill();
  console.log(failed ? '\n❌ 스모크 테스트 실패' : '\n✔ MCP 스모크 테스트 전체 통과');
  process.exit(failed ? 1 : 0);
}
