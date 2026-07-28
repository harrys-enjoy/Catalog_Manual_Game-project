import { once } from 'node:events';
import http from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

test('POST /api/ask가 표준 응답을 반환한다', async () => {
  const server = createServer({
    orchestrator: { ask: async (request) => ({
      answer: '테스트 답변', mode: request.mode, agent: 'art-guide',
      sources: [], usage: null, requestId: request.requestId,
    }) },
  }).listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/ask`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'dev-guide', question: '질문' }),
  });
  const body = await response.json();
  server.close();
  assert.equal(response.status, 200);
  assert.equal(body.answer, '테스트 답변');
  assert.match(body.requestId, /^req_/);
});

test('잘못된 JSON은 INVALID_REQUEST JSON을 반환한다', async () => {
  const server = createServer({ orchestrator: { ask: async () => { throw new Error('호출되면 안 됨'); } } }).listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/ask`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
  });
  const body = await response.json();
  server.close();
  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'INVALID_REQUEST');
});

test('기본 서버를 의존성 주입 없이 생성할 수 있다', () => {
  const server = createServer();
  assert.equal(typeof server.listen, 'function');
  server.close();
});

test('GET /health가 모델 호출 없이 상태를 반환한다', async () => {
  const server = createServer({
    orchestrator: { ask: async () => { throw new Error('호출되면 안 됨'); } },
  }).listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  const body = await response.json();
  server.close();
  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: 'ok', service: 'game-qna-api' });
});

test('허용된 출처의 CORS preflight에 응답한다', async () => {
  const server = createServer({
    corsOrigin: 'https://productivity.example',
    orchestrator: { ask: async () => ({}) },
  }).listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/ask`, {
    method: 'OPTIONS',
    headers: { origin: 'https://productivity.example', 'access-control-request-method': 'POST' },
  });
  server.close();
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://productivity.example');
});
