import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentCard } from '../src/agent-card.js';

test('Agent Card에 공개 가능한 기능과 A2A endpoint를 포함한다', () => {
  const card = createAgentCard({ publicUrl: 'https://game.example' });
  assert.equal(card.url, 'https://game.example/a2a');
  assert.equal(card.capabilities.streaming, false);
  assert.deepEqual(card.skills.map((skill) => skill.id), ['dev-guide', 'catalog', 'codex', 'lore']);
  assert.equal(card.securitySchemes.bearerAuth.scheme, 'bearer');
});
