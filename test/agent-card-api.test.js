import { once } from 'node:events';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

test('Agent Card 응답은 캐시 가능한 ETag를 제공한다', async () => {
  const server = createServer({ publicUrl: 'https://game.example', orchestrator: { ask: async () => ({}) } }).listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/.well-known/agent-card.json`);
  server.close();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
  assert.equal(response.headers.get('etag'), '"game-qna-agent-0.1.0"');
});
