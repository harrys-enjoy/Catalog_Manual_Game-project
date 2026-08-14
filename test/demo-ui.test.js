import { once } from 'node:events';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

async function startServer(options = {}) {
  const server = createServer(options).listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

test('GET /가 로컬 데모 UI HTML을 반환한다', async () => {
  const { server, baseUrl } = await startServer();
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();
  server.close();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(html, /Game Q&A/);
  assert.match(html, /mode/);
  assert.match(html, /locale/);
  assert.match(html, /question/);
  assert.match(html, /api-key/);
  assert.match(html, /send/);
  assert.match(html, /response/);
  assert.match(html, /full-content/);
  assert.match(html, /story-review-title/);
  assert.match(html, /review-story/);
});

test('데모 UI 정적 자산을 반환한다', async () => {
  const { server, baseUrl } = await startServer();
  const script = await fetch(`${baseUrl}/app.js`);
  const styles = await fetch(`${baseUrl}/styles.css`);
  server.close();

  assert.equal(script.status, 200);
  assert.match(script.headers.get('content-type'), /javascript/);
  assert.equal(styles.status, 200);
  assert.match(styles.headers.get('content-type'), /css/);
  const scriptText = await script.text();
  assert.match(scriptText, /relatedLoreIds/);
  assert.match(scriptText, /relatedCodexIds/);
  assert.match(scriptText, /scrollIntoView/);
  assert.match(scriptText, /api\/story-review/);
  assert.match(scriptText, /continuityConflicts/);
  assert.match(scriptText, /스토리 검토/);
  assert.match(scriptText, /story-review-panel/);
  assert.match(scriptText, /사용 가능한 명령/);
  assert.match(scriptText, /스토리 초안과 키워드를/);
});

test('GET /knowledge?mode=codex가 질문용 항목 목록을 반환한다', async () => {
  const { server, baseUrl } = await startServer();
  const response = await fetch(`${baseUrl}/knowledge?mode=codex`);
  const body = await response.json();
  server.close();

  assert.equal(response.status, 200);
  assert.equal(body.mode, 'codex');
  assert.ok(body.entries.some((entry) => entry.name === '루멘'));
  assert.ok(body.entries.every((entry) => Array.isArray(entry.keywords)));
});

test('GET /knowledge?mode=catalog&full=true가 전체 콘텐츠를 반환한다', async () => {
  const { server, baseUrl } = await startServer();
  const response = await fetch(`${baseUrl}/knowledge?mode=catalog&full=true`);
  const body = await response.json();
  server.close();

  assert.equal(response.status, 200);
  assert.ok(body.entries.some((entry) => entry.name === '잿불 마을'));
  assert.ok(body.entries.every((entry) => typeof entry.answer === 'string'));
});

test('GET /knowledge?mode=lore&full=true가 전우치·홍길동 콘텐츠와 모티프를 반환한다', async () => {
  const { server, baseUrl } = await startServer();
  const response = await fetch(`${baseUrl}/knowledge?mode=lore&full=true`);
  const body = await response.json();
  server.close();

  assert.equal(response.status, 200);
  const jeonuchi = body.entries.find((entry) => entry.id === 'jeonuchi-freedom');
  const honggildong = body.entries.find((entry) => entry.id === 'honggildong-order');
  assert.equal(jeonuchi.sourceRef, null);
  assert.equal(honggildong.sourceRef, null);
  assert.equal(jeonuchi.originalContent, true);
  assert.equal(honggildong.originalContent, true);
  assert.equal(jeonuchi.inspirationSources.length, 2);
  assert.equal(honggildong.inspirationSources.length, 2);
});

test('전체 세계관 콘텐츠는 관련 도감 ID를 반환한다', async () => {
  const { server, baseUrl } = await startServer();
  const response = await fetch(`${baseUrl}/knowledge?mode=lore&full=true`);
  const body = await response.json();
  server.close();

  const entry = body.entries.find((item) => item.id === 'honggildong-order');
  assert.ok(entry.relatedCodexIds.includes('honggildong-codex'));
  assert.ok(entry.relatedCodexIds.includes('alive-community-codex'));
});
