import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelAdapterFromEnv } from '../src/model-factory.js';

test('Qwen 환경변수로 OpenAI 호환 모델 어댑터를 만든다', async () => {
  let call;
  const adapter = createModelAdapterFromEnv({
    env: {
      MODEL_PROVIDER: 'qwen',
      MODEL_NAME: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
      MODEL_BASE_URL: 'https://qwen.example/v1',
      MODEL_API_KEY: 'test-key',
    },
    fetchImpl: async (url, options) => {
      call = { url, options };
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'Qwen 답변' } }],
        usage: { prompt_tokens: 10, completion_tokens: 4 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const result = await adapter.generate({ system: '규칙', question: '질문', evidence: [] });
  assert.equal(result.answer, 'Qwen 답변');
  assert.deepEqual(result.usage, { inputTokens: 10, outputTokens: 4 });
  assert.equal(call.url, 'https://qwen.example/v1/chat/completions');
  assert.equal(call.options.headers.authorization, 'Bearer test-key');
});

test('모델 환경변수가 없으면 Mock 어댑터를 사용한다', () => {
  const adapter = createModelAdapterFromEnv({ env: {} });
  assert.equal(adapter.constructor.name, 'MockModelAdapter');
});
