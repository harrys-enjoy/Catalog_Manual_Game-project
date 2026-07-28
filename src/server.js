import http from 'node:http';
import { AppError } from './errors.js';
import { createRequestId, parseJsonBody, validateAskRequest } from './request.js';

const MAX_BODY_BYTES = 1_048_576;

function writeJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
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

export function createServer({ orchestrator } = {}) {
  if (!orchestrator || typeof orchestrator.ask !== 'function') {
    throw new TypeError('orchestrator.ask가 필요합니다.');
  }

  return http.createServer(async (request, response) => {
    const requestId = createRequestId();
    try {
      if (request.method !== 'POST' || request.url !== '/api/ask') {
        throw new AppError('INTERNAL_ERROR', '요청 경로를 찾을 수 없습니다.', 404);
      }
      const body = validateAskRequest(parseJsonBody(await readBody(request)));
      const result = await orchestrator.ask({ ...body, requestId });
      writeJson(response, 200, result);
    } catch (error) {
      const appError = error instanceof AppError
        ? error
        : new AppError('INTERNAL_ERROR', '서버에서 요청을 처리하지 못했습니다.', 500);
      writeJson(response, appError.statusCode, {
        error: { code: appError.code, message: appError.message, requestId },
      });
    }
  });
}
