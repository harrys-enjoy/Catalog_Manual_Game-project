import { AppError } from './errors.js';

export const ALLOWED_MODES = new Set(['dev-guide', 'catalog', 'codex', 'lore']);

export function parseJsonBody(rawBody) {
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new AppError('INVALID_REQUEST', '요청 본문은 유효한 JSON이어야 합니다.');
  }
}

export function validateAskRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('INVALID_REQUEST', '요청 본문은 JSON 객체여야 합니다.');
  }
  if (!ALLOWED_MODES.has(body.mode)) {
    throw new AppError('INVALID_REQUEST', 'mode는 지원되는 값이어야 합니다.');
  }
  if (typeof body.question !== 'string') {
    throw new AppError('INVALID_REQUEST', 'question은 문자열이어야 합니다.');
  }
  const question = body.question.trim();
  if (question.length < 1 || question.length > 2000) {
    throw new AppError('INVALID_REQUEST', 'question은 1~2,000자여야 합니다.');
  }
  const context = body.context ?? {};
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw new AppError('INVALID_REQUEST', 'context는 JSON 객체여야 합니다.');
  }
  return { mode: body.mode, question, context };
}

export function createRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
