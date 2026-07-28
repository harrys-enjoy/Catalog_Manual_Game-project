import { AppError } from './errors.js';

const agentByMode = {
  'dev-guide': 'art-guide',
  lore: 'lore',
};

export function createOrchestrator({ agents, lookup }) {
  return {
    async ask(request) {
      const direct = lookup(request.mode, request.question);
      if (direct) {
        return {
          answer: direct.answer,
          mode: request.mode,
          agent: 'knowledge',
          sources: direct.sources,
          usage: null,
          requestId: request.requestId,
        };
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
      return {
        answer: result.answer,
        mode: request.mode,
        agent: result.agent,
        sources: result.sources,
        usage: result.usage ?? null,
        requestId: request.requestId,
      };
    },
  };
}
