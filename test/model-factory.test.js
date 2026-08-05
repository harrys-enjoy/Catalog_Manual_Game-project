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

test('모델 timeout을 초과하면 MODEL_UNAVAILABLE을 반환한다', async () => {
  let receivedSignal;
  const adapter = createModelAdapterFromEnv({
    env: {
      MODEL_PROVIDER: 'qwen', MODEL_NAME: 'qwen-test', MODEL_BASE_URL: 'https://qwen.example/v1',
      MODEL_API_KEY: 'test-key', MODEL_TIMEOUT_MS: '1',
    },
    fetchImpl: async (_url, options) => new Promise((resolve, reject) => {
      receivedSignal = options.signal;
      options.signal.addEventListener('abort', () => reject(new Error('timeout')));
    }),
  });
  await assert.rejects(
    () => adapter.generate({ system: '규칙', question: '질문', evidence: [] }),
    (error) => error.code === 'MODEL_UNAVAILABLE' && error.statusCode === 503,
  );
  assert.equal(receivedSignal instanceof AbortSignal, true);
});

test('모델 환경변수가 일부만 설정되면 명확한 설정 오류를 반환한다', () => {
  assert.throws(
    () => createModelAdapterFromEnv({
      env: { MODEL_NAME: 'qwen-test', MODEL_BASE_URL: 'https://qwen.example/v1' },
    }),
    (error) => error.code === 'MODEL_CONFIG_INVALID' && error.statusCode === 500,
  );
});

test('QWEN_BASE_URL도 OpenAI 호환 모델 endpoint로 사용한다', async () => {
  let calledUrl;
  const adapter = createModelAdapterFromEnv({
    env: {
      MODEL_NAME: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
      QWEN_BASE_URL: 'https://integrate.api.nvidia.com/v1',
      MODEL_API_KEY: 'test-key',
    },
    fetchImpl: async (url) => {
      calledUrl = url;
      return new Response(JSON.stringify({
        choices: [{ message: { content: '응답' } }],
      }), { status: 200 });
    },
  });

  await adapter.generate({ system: '규칙', question: '질문', evidence: [] });
  assert.equal(calledUrl, 'https://integrate.api.nvidia.com/v1/chat/completions');
});
test('모델 endpoint 오류는 upstream 상태와 본문을 보존한다', async () => {
  const adapter = createModelAdapterFromEnv({
    env: { MODEL_NAME: 'meta/llama-3.3-70b-instruct', MODEL_BASE_URL: 'https://nvidia.example/v1', MODEL_API_KEY: 'test-key' },
    fetchImpl: async () => new Response(JSON.stringify({ detail: 'model unavailable' }), { status: 410 }),
  });

  await assert.rejects(
    () => adapter.generate({ system: 'guide', question: 'question', evidence: [] }),
    (error) => error.code === 'MODEL_UNAVAILABLE'
      && error.statusCode === 503
      && error.message.includes('HTTP 410')
      && error.message.includes('model unavailable'),
  );
});

test('LLM 네트워크 오류는 원인 코드와 대상 주소를 보존한다', async () => {
  const adapter = createModelAdapterFromEnv({
    env: { MODEL_NAME: 'meta/llama-3.3-70b-instruct', MODEL_BASE_URL: 'https://nvidia.example/v1', MODEL_API_KEY: 'test-key' },
    fetchImpl: async () => {
      const error = new Error('fetch failed');
      error.cause = {
        code: 'EACCES',
        message: 'connect failed',
        errors: [{ code: 'EACCES', address: '99.83.136.103', port: 443 }],
      };
      throw error;
    },
  });

  await assert.rejects(
    () => adapter.generate({ system: 'guide', question: 'question', evidence: [] }),
    (error) => error.code === 'MODEL_UNAVAILABLE'
      && error.message.includes('EACCES')
      && error.message.includes('99.83.136.103:443')
      && error.message.includes('connect failed'),
  );
});
