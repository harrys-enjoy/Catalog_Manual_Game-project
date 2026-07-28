import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createHttpAgent } from './a2a.js';
import { createAgentCard } from './agent-card.js';
import { createAgentRegistry } from './agents.js';
import { AppError } from './errors.js';
import { lookupKnowledge } from './knowledge.js';
import { createModelAdapterFromEnv } from './model-factory.js';
import { createOrchestrator } from './orchestrator.js';
import { createRequestId, parseJsonBody, validateAgentRequest, validateAskRequest } from './request.js';
import { loadEnvFile } from './config.js';

loadEnvFile();

const MAX_BODY_BYTES = 1_048_576;

function writeJson(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8', ...headers });
  response.end(JSON.stringify(body));
}

function corsHeaders(request, corsOrigin) {
  const origin = request.headers.origin;
  return corsOrigin && origin === corsOrigin
    ? {
      'access-control-allow-origin': corsOrigin,
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      vary: 'Origin',
    }
    : {};
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new AppError('INVALID_REQUEST', '요청 본문은 1MB 이하이어야 합니다.'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

export function createDefaultOrchestrator({ modelAdapter = createModelAdapterFromEnv(), remoteAgents = {} } = {}) {
  const agents = createAgentRegistry({ modelAdapter });
  for (const [agentName, target] of Object.entries(remoteAgents)) {
    const agent = typeof target === 'string'
      ? createHttpAgent({ agentName, endpoint: target })
      : target;
    if (agent && typeof agent.ask === 'function') agents.set(agentName, agent);
  }
  return createOrchestrator({
    lookup: lookupKnowledge,
    agents,
  });
}

export function createServer({ orchestrator, modelAdapter, remoteAgents = {}, corsOrigin = process.env.CORS_ORIGIN || '', apiKey = process.env.API_KEY || '', publicUrl = process.env.AGENT_PUBLIC_URL || 'http://localhost:3000' } = {}) {
  orchestrator ??= createDefaultOrchestrator({ modelAdapter, remoteAgents });
  if (!orchestrator || typeof orchestrator.ask !== 'function') {
    throw new TypeError('orchestrator.ask가 필요합니다.');
  }

  return http.createServer(async (request, response) => {
    const requestId = createRequestId();
    const headers = corsHeaders(request, corsOrigin);
    try {
      if (request.method === 'OPTIONS' && ['/api/ask', '/a2a'].includes(request.url) && Object.keys(headers).length > 0) {
        response.writeHead(204, headers);
        response.end();
        return;
      }
      if (request.method === 'GET' && request.url === '/health') {
        writeJson(response, 200, { status: 'ok', service: 'game-qna-api' }, headers);
        return;
      }
      if (request.method === 'GET' && request.url === '/.well-known/agent-card.json') {
        writeJson(response, 200, createAgentCard({ publicUrl, requiresAuth: Boolean(apiKey) }), headers);
        return;
      }
      if (apiKey && ['/api/ask', '/a2a'].includes(request.url) && request.headers.authorization !== `Bearer ${apiKey}`) {
        throw new AppError('UNAUTHORIZED', '유효한 Bearer 인증이 필요합니다.', 401);
      }
      const isAskRequest = request.method === 'POST' && request.url === '/api/ask';
      const isA2ARequest = request.method === 'POST' && request.url === '/a2a';
      if (!isAskRequest && !isA2ARequest) {
        throw new AppError('INTERNAL_ERROR', '요청 경로를 찾을 수 없습니다.', 404);
      }
      const parsed = parseJsonBody(await readBody(request));
      const body = isA2ARequest ? validateAgentRequest(parsed) : validateAskRequest(parsed);
      const result = await orchestrator.ask({ ...body, requestId: isA2ARequest ? body.requestId : requestId });
      writeJson(response, 200, isA2ARequest ? { ...result, confidence: null } : result, headers);
    } catch (error) {
      const appError = error instanceof AppError
        ? error
        : new AppError('INTERNAL_ERROR', '서버에서 요청을 처리하지 못했습니다.', 500);
      writeJson(response, appError.statusCode, {
        error: { code: appError.code, message: appError.message, requestId },
      }, headers);
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => {
    console.log(`game-qna-api listening on ${port}`);
  });
}
