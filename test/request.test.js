import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAskRequest } from '../src/request.js';

test('허용된 mode와 질문을 검증한다', () => {
  assert.deepEqual(
    validateAskRequest({ mode: 'dev-guide', question: '팔레트를 추천해줘' }),
    { mode: 'dev-guide', question: '팔레트를 추천해줘', context: {} },
  );
});

test('빈 질문과 미지원 mode를 거부한다', () => {
  assert.throws(
    () => validateAskRequest({ mode: 'unknown', question: '   ' }),
    (error) => error.code === 'INVALID_REQUEST',
  );
});

test('2,001자 질문을 거부한다', () => {
  assert.throws(
    () => validateAskRequest({ mode: 'lore', question: 'a'.repeat(2001) }),
    (error) => error.code === 'INVALID_REQUEST',
  );
});
