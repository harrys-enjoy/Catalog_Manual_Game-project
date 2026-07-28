import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupKnowledge } from '../src/knowledge.js';

test('codex 질문은 모델 없이 도감 데이터를 반환한다', () => {
  const result = lookupKnowledge('codex', '루멘의 약점은 무엇인가?');
  assert.equal(result.answer, '루멘의 약점은 냉기 속성입니다.');
  assert.deepEqual(result.sources, ['codex:lumens']);
});

test('자료가 없는 질문은 null을 반환한다', () => {
  assert.equal(lookupKnowledge('catalog', '없는 아이템을 보여줘'), null);
});
