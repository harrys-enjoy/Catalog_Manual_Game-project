import { once } from 'node:events';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

test('POST /message:send가 A2A HTTP+JSON 메시지 응답을 반환한다', async () => {
  const server = createServer({
    orchestrator: { ask: async (request) => ({
      answer: `응답: ${request.question}`,
      requestId: request.requestId,
    }) },
  }).listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/message:send`, {
    method: 'POST',
    headers: { 'content-type': 'application/a2a+json' },
    body: JSON.stringify({
      message: { messageId: 'message-1', role: 'ROLE_USER', parts: [{ text: '전투 기획' }] },
      metadata: { mode: 'dev-guide' },
    }),
  });
  const body = await response.json();
  server.close();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/a2a+json; charset=utf-8');
  assert.deepEqual(body, {
    message: { messageId: 'message-1', role: 'ROLE_AGENT', parts: [{ text: '응답: 전투 기획' }] },
  });
});
