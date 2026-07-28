import { AppError } from './errors.js';

const agentByMode = {
  'dev-guide': 'art-guide',
  lore: 'lore',
};

function cacheKey(request) {
  const context = request.context ?? {};
  return JSON.stringify([
    request.mode,
    request.question,
    context.projectId ?? '',
    context.userId ?? '',
    context.workContext ?? '',
  ]);
}

export function createOrchestrator({ agents, lookup, cacheTtlMs = 60_000, cacheMaxEntries = 100 }) {
  const cache = new Map();

  function readCache(request) {
    if (cacheTtlMs <= 0) return null;
    const entry = cache.get(cacheKey(request));
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      cache.delete(cacheKey(request));
      return null;
    }
    return { ...entry.response, requestId: request.requestId };
  }

  function writeCache(request, response) {
    if (cacheTtlMs <= 0) return;
    const key = cacheKey(request);
    cache.set(key, { expiresAt: Date.now() + cacheTtlMs, response: { ...response, requestId: undefined } });
    while (cache.size > cacheMaxEntries) cache.delete(cache.keys().next().value);
  }

  return {
    async ask(request) {
      const cached = readCache(request);
      if (cached) return cached;

      const direct = lookup(request.mode, request.question);
      if (direct) {
        const response = {
          answer: direct.answer,
          mode: request.mode,
          agent: 'knowledge',
          sources: direct.sources,
          usage: null,
          requestId: request.requestId,
        };
        writeCache(request, response);
        return response;
      }

      if (request.mode === 'catalog' || request.mode === 'codex') {
        throw new AppError('KNOWLEDGE_NOT_FOUND', '요청과 일치하는 게임 자료를 찾지 못했습니다.', 404);
      }

      const agentName = agentByMode[request.mode];
      const agent = agents.get(agentName);
      if (!agent) {
        throw new AppError('INTERNAL_ERROR', `에이전트를 사용할 수 없습니다: ${agentName}`, 500);
      }
      const result = await agent.ask({ ...request, evidence: [] });
      const response = {
        answer: result.answer,
        mode: request.mode,
        agent: result.agent,
        sources: result.sources,
        usage: result.usage ?? null,
        requestId: request.requestId,
      };
      writeCache(request, response);
      return response;
    },
  };
}
