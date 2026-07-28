import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentRegistry } from '../src/agents.js';
import { MockModelAdapter } from '../src/model.js';

test('art-guide agent는 제한된 컨텍스트로 응답한다', async () => {
  const registry = createAgentRegistry({ modelAdapter: new MockModelAdapter() });
  const result = await registry.get('art-guide').ask({
    requestId: 'req_test',
    mode: 'dev-guide',
    question: '마을 색상을 추천해줘',
    context: {},
    evidence: ['저채도 갈색과 청록색을 사용한다.'],
  });
  assert.equal(result.agent, 'art-guide');
  assert.match(result.answer, /저채도/);
  assert.equal(result.usage, null);
});

test('lore agent는 등록된 에이전트로 조회할 수 있다', () => {
  const registry = createAgentRegistry({ modelAdapter: new MockModelAdapter() });
  assert.equal(typeof registry.get('lore').ask, 'function');
});
