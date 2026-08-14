import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentRegistry } from '../src/agents.js';
import { MockModelAdapter } from '../src/model.js';
import { createOrchestrator } from '../src/orchestrator.js';

test('catalog과 codex의 일반 조회는 일치 항목이 없어도 로컬 목록을 반환한다', async () => {
  const orchestrator = createOrchestrator({
    lookup: () => null,
    listKnowledge: (mode) => [{ id: `${mode}-entry`, name: '루멘', keywords: ['루멘'] }],
    agents: new Map(),
  });
  const result = await orchestrator.ask({
    requestId: 'req_list', mode: 'codex', question: '도감에서 관련 캐릭터, 몬스터, 아이템을 찾아줘', context: {},
  });
  assert.equal(result.agent, 'knowledge');
  assert.match(result.answer, /루멘/);
});

test('/art 요청은 스토리 근거를 보존한 Video Agent로 라우팅한다', async () => {
  let received;
  const orchestrator = createOrchestrator({
    lookup: () => ({ answer: '지식 검색 결과', sources: [] }),
    agents: new Map([
      ['video-prompt-guide', { ask: async (request) => {
        received = request;
        return { answer: '영상 프롬프트', agent: 'video-prompt-guide', sources: request.evidence, usage: null };
      } }],
    ]),
  });

  const result = await orchestrator.ask({
    requestId: 'req_art',
    mode: 'dev-guide',
    question: '/art 폐허 도시에서 석궁을 준비하는 정찰병 영상 프롬프트',
    context: { storyReview: 'pass', character: '은회색 단발과 청록색 눈' },
    evidence: ['스토리 검토 통과: 캐릭터 외형과 행동 일관성 확인'],
  });

  assert.equal(result.agent, 'video-prompt-guide');
  assert.equal(received.context.storyReview, 'pass');
  assert.match(received.evidence[0], /일관성/);
});

test('/? video 명령도 Video Agent로 라우팅한다', async () => {
  const called = [];
  const orchestrator = createOrchestrator({
    lookup: () => ({ answer: '지식 검색 결과', sources: [] }),
    agents: new Map([
      ['video-prompt-guide', { ask: async () => {
        called.push('video-prompt-guide');
        return { answer: '영상 프롬프트', agent: 'video-prompt-guide', sources: [], usage: null };
      } }],
    ]),
  });

  const result = await orchestrator.ask({
    requestId: 'req_video_alias',
    mode: 'dev-guide',
    question: '/? video 캐릭터 등장 장면 프롬프트',
    context: {},
  });

  assert.equal(result.agent, 'video-prompt-guide');
  assert.deepEqual(called, ['video-prompt-guide']);
});

test('Video Agent는 영상 생성 프롬프트 구성 요소를 모델 지침으로 받는다', async () => {
  let generated;
  const registry = createAgentRegistry({
    modelAdapter: {
      async generate(input) {
        generated = input;
        return { answer: 'prompt', usage: null };
      },
    },
  });

  await registry.get('video-prompt-guide').ask({
    question: '/art 장면을 영상 프롬프트로 변환',
    context: { storyReview: 'pass' },
    evidence: ['캐릭터 외형: 은회색 단발'],
  });

  assert.match(generated.system, /카메라/);
  assert.match(generated.system, /일관성/);
  assert.match(generated.question, /storyReview/);
  assert.match(generated.evidence[0], /은회색/);
});

test('일반 lore 질문은 catalog과 codex까지 확장 검색한다', async () => {
  const orchestrator = createOrchestrator({
    lookup: (mode) => mode === 'codex'
      ? { answer: '별의 파편 설명', sources: ['codex:star-shard'] }
      : null,
    listKnowledge: () => [],
    agents: new Map(),
  });
  const result = await orchestrator.ask({
    requestId: 'req_cross_mode', mode: 'lore', question: '별의 파편', context: {},
  });
  assert.equal(result.agent, 'knowledge');
  assert.equal(result.mode, 'codex');
  assert.equal(result.answer, '[Source: Codex (characters / monsters / items)]\n별의 파편 설명');
});

test('isolates lore cache entries by A2A contextId', async () => {
  let calls = 0;
  const orchestrator = createOrchestrator({
    lookup: () => null,
    agents: new Map([['lore', { ask: async ({ context }) => {
      calls += 1;
      return {
        answer: `answer for ${context.contextId}`,
        agent: 'lore',
        sources: [],
        usage: null,
        confidence: null,
      };
    } }]]),
    cacheTtlMs: 60_000,
  });
  const baseRequest = {
    mode: 'lore',
    question: 'same lore question',
    context: {
      projectId: 'demo',
      userId: 'user-1',
      workContext: 'same work context',
    },
    evidence: ['same evidence'],
  };

  const first = await orchestrator.ask({
    ...baseRequest,
    requestId: 'req_ctx_a',
    context: { ...baseRequest.context, contextId: 'ctx-a' },
  });
  const second = await orchestrator.ask({
    ...baseRequest,
    requestId: 'req_ctx_b',
    context: { ...baseRequest.context, contextId: 'ctx-b' },
  });

  assert.equal(calls, 2);
  assert.equal(first.answer, 'answer for ctx-a');
  assert.equal(second.answer, 'answer for ctx-b');
});

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

test('구조화 데이터 응답은 모델을 호출하지 않는다', async () => {
  let calls = 0;
  const orchestrator = createOrchestrator({
    lookup: () => ({ answer: '직접 조회 결과', sources: ['codex:test'] }),
    agents: new Map([['codex', { ask: async () => { calls += 1; return {}; } }]]),
  });
  const result = await orchestrator.ask({
    requestId: 'req_test', mode: 'codex', question: '도감 질문', context: {},
  });
  assert.equal(result.agent, 'knowledge');
  assert.equal(calls, 0);
});

test('lore 질문은 lore agent만 호출한다', async () => {
  const called = [];
  const orchestrator = createOrchestrator({
    lookup: () => null,
    agents: new Map([
      ['lore', { ask: async () => { called.push('lore'); return { answer: '세계관 답변', agent: 'lore', sources: [], usage: null, confidence: null }; } }],
      ['art-guide', { ask: async () => { called.push('art-guide'); return {}; } }],
    ]),
  });
  await orchestrator.ask({ requestId: 'req_test', mode: 'lore', question: '세력 관계', context: {} });
  assert.deepEqual(called, ['lore']);
});

test('같은 질문은 TTL 동안 에이전트를 다시 호출하지 않는다', async () => {
  let calls = 0;
  const orchestrator = createOrchestrator({
    lookup: () => null,
    agents: new Map([['lore', { ask: async () => {
      calls += 1;
      return { answer: '캐시 가능한 답변', agent: 'lore', sources: [], usage: null, confidence: null };
    } }]]),
    cacheTtlMs: 60_000,
  });
  const first = await orchestrator.ask({ requestId: 'req_1', mode: 'lore', question: '세력 관계', context: { projectId: 'demo' } });
  const second = await orchestrator.ask({ requestId: 'req_2', mode: 'lore', question: '세력 관계', context: { projectId: 'demo' } });
  assert.equal(calls, 1);
  assert.equal(first.requestId, 'req_1');
  assert.equal(second.requestId, 'req_2');
});

test('/art 인물 요청은 Lore 근거를 Video Prompt Guide에 함께 전달한다', async () => {
  let received;
  const orchestrator = createOrchestrator({
    lookup: () => null,
    lookupBest: (question) => question.includes('홍길동')
      ? { answer: '홍길동은 불평등한 질서에 맞서는 공동체 지향 인물이다.', sources: ['lore:hong-gildong'], mode: 'lore' }
      : null,
    agents: new Map([['video-prompt-guide', { ask: async (request) => {
      received = request;
      return { answer: '홍길동 영상 프롬프트', agent: 'video-prompt-guide', sources: request.evidence, usage: null };
    } }]]),
  });

  await orchestrator.ask({ requestId: 'req_hong', mode: 'dev-guide', question: '/art 홍길동', context: {}, evidence: [] });

  assert.match(received.evidence[0], /홍길동은 불평등한 질서/);
});

test('dev-guide의 기획 질문은 planning-guide로 라우팅한다', async () => {
  const called = [];
  const makeAgent = (name) => ({ ask: async () => {
    called.push(name);
    return { answer: name, agent: name, sources: [], usage: null, confidence: null };
  } });
  const orchestrator = createOrchestrator({
    lookup: () => null,
    agents: new Map([
      ['planning-guide', makeAgent('planning-guide')],
      ['art-guide', makeAgent('art-guide')],
    ]),
  });
  const result = await orchestrator.ask({
    requestId: 'req_test', mode: 'dev-guide', question: '전투 시스템 기획안을 검토해줘', context: {},
  });
  assert.equal(result.agent, 'planning-guide');
  assert.deepEqual(called, ['planning-guide']);
});

test('오케스트레이터는 토큰 절감 경로별 호출 수를 제공한다', async () => {
  const orchestrator = createOrchestrator({
    lookup: (mode) => mode === 'codex' ? { answer: '직접 조회', sources: [] } : null,
    agents: new Map([['lore', { ask: async () => ({ answer: '에이전트', agent: 'lore', sources: [], usage: null }) }]]),
  });
  await orchestrator.ask({ requestId: 'req_1', mode: 'codex', question: '도감', context: {} });
  await orchestrator.ask({ requestId: 'req_2', mode: 'lore', question: '세계관', context: {} });
  await orchestrator.ask({ requestId: 'req_3', mode: 'lore', question: '세계관', context: {} });
  assert.deepEqual(orchestrator.getMetrics(), {
    cacheHits: 1,
    directKnowledgeResponses: 1,
    agentCalls: 1,
  });
});

test('근거 자료가 다르면 같은 질문도 별도로 처리한다', async () => {
  let calls = 0;
  const orchestrator = createOrchestrator({
    lookup: () => null,
    agents: new Map([['lore', { ask: async ({ evidence }) => {
      calls += 1;
      return { answer: evidence.join(','), agent: 'lore', sources: [], usage: null };
    } }]]),
  });
  const first = await orchestrator.ask({
    requestId: 'req_1', mode: 'lore', question: '세력 관계', context: {}, evidence: ['근거 A'],
  });
  const second = await orchestrator.ask({
    requestId: 'req_2', mode: 'lore', question: '세력 관계', context: {}, evidence: ['근거 B'],
  });
  assert.equal(calls, 2);
  assert.equal(first.answer, '근거 A');
  assert.equal(second.answer, '근거 B');
});
