import { AppError } from './errors.js';
import { LangChainModelAdapter } from './langchain-adapter.js';
import { MockModelAdapter } from './model.js';

class OpenAICompatibleChatModel {
  constructor({ modelName, baseUrl, apiKey, timeoutMs = 30_000, fetchImpl = fetch }) {
    this.modelName = modelName;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async invoke(messages) {
    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
        body: JSON.stringify({ model: this.modelName, messages, temperature: 0.2, max_tokens: 800 }),
      });
    } catch (error) {
      const cause = error?.cause;
      const nested = Array.isArray(cause?.errors) ? cause.errors[0] : cause;
      const code = nested?.code || error?.code || error?.name;
      const target = nested?.address && nested?.port ? ` ${nested.address}:${nested.port}` : '';
      const message = nested?.message || cause?.message || error?.message;
      const detail = code ? ` (${code}${target}${message ? `: ${String(message).slice(0, 160)}` : ''})` : '';
      throw new AppError('MODEL_UNAVAILABLE', `LLM endpoint에 연결할 수 없습니다${detail}.`, 503);
    }
    if (!response.ok) {
      let detail = '';
      try {
        const raw = await response.text();
        const payload = JSON.parse(raw);
        detail = payload.detail || payload.error?.message || payload.message || '';
      } catch {
        // Keep the provider status when the error body is not JSON.
      }
      const suffix = detail ? `: ${String(detail).slice(0, 300)}` : '';
      throw new AppError('MODEL_UNAVAILABLE', `LLM endpoint HTTP ${response.status}${suffix}`, 503);
    }
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new AppError('MODEL_UNAVAILABLE', 'LLM 응답 형식이 올바르지 않습니다.', 503);
    }
    const usage = payload.usage ?? {};
    return {
      content,
      usage_metadata: {
        input_tokens: usage.prompt_tokens,
        output_tokens: usage.completion_tokens,
      },
    };
  }
}

export function createModelAdapterFromEnv({ env = process.env, fetchImpl = fetch } = {}) {
  const modelName = env.MODEL_NAME;
  const baseUrl = env.MODEL_BASE_URL || env.QWEN_BASE_URL;
  const apiKey = env.MODEL_API_KEY;
  const configuredCount = [modelName, baseUrl, apiKey].filter(Boolean).length;
  if (configuredCount === 0) return new MockModelAdapter();
  if (configuredCount !== 3) {
    throw new AppError('MODEL_CONFIG_INVALID', 'MODEL_NAME, MODEL_BASE_URL 또는 QWEN_BASE_URL, MODEL_API_KEY를 모두 설정해야 합니다.', 500);
  }

  return new LangChainModelAdapter({
    model: new OpenAICompatibleChatModel({
      modelName,
      baseUrl,
      apiKey,
      timeoutMs: Number(env.MODEL_TIMEOUT_MS || 30_000),
      fetchImpl,
    }),
  });
}
