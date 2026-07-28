import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttpAgent, createAgentRequest } from '../src/a2a.js';

test('A2A 요청을 공통 AgentRequest 형식으로 만든다', () => {
  assert.deepEqual(
    createAgentRequest({
      requestId: 'req_test',
      mode: 'lore',
      question: '세력 관계는?',
      context: { projectId: 'demo' },
      evidence: ['자료 1'],
    }),
    {
      requestId: 'req_test',
      mode: 'lore',
      question: '세력 관계는?',
      context: { projectId: 'demo' },
      evidence: ['자료 1'],
    },
  );
});

test('HTTP 에이전트는 응답을 표준 AgentResponse로 정규화한다', async () => {
  let request;
  const agent = createHttpAgent({
    agentName: 'remote-lore',
    endpoint: 'https://agent.example/a2a',
    fetchImpl: async (_endpoint, options) => {
      request = { endpoint: _endpoint, options };
      return new Response(JSON.stringify({
        answer: '원격 세계관 답변',
        sources: ['lore:remote'],
        usage: null,
        confidence: 0.9,
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const result = await agent.ask({
    requestId: 'req_test', mode: 'lore', question: '질문', context: {}, evidence: [],
  });
  assert.equal(request.endpoint, 'https://agent.example/a2a');
  assert.equal(request.options.method, 'POST');
  assert.equal(JSON.parse(request.options.body).requestId, 'req_test');
  assert.deepEqual(result, {
    answer: '원격 세계관 답변',
    agent: 'remote-lore',
    sources: ['lore:remote'],
    usage: null,
    confidence: 0.9,
  });
});

test('원격 에이전트 오류는 MODEL_UNAVAILABLE로 변환한다', async () => {
  const agent = createHttpAgent({
    agentName: 'remote-lore',
    endpoint: 'https://agent.example/a2a',
    fetchImpl: async () => new Response('{}', { status: 503 }),
  });
  await assert.rejects(
    () => agent.ask({ requestId: 'req_test', mode: 'lore', question: '질문', context: {}, evidence: [] }),
    (error) => error.code === 'MODEL_UNAVAILABLE' && error.statusCode === 503,
  );
});
