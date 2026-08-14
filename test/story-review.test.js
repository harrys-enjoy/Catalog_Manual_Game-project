import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStoryReviewService } from '../src/story-review.js';
import { MockModelAdapter } from '../src/model.js';

const draft = {
  name: '새로운 항로의 기록',
  keywords: ['새로운 항로', '기록'],
  answer: '연화가 사라진 항로의 기록을 발견한다.',
  relatedLoreIds: ['glass-star-origin'],
  relatedCodexIds: ['yeonhwa-codex'],
};

test('LLM review extracts JSON when the model wraps it in prose and a code fence', async () => {
  const service = createStoryReviewService({
    modelAdapter: {
      async generate() {
        return { answer: '검토 결과입니다.\n```json\n{"verdict":"pass","suggestions":[]}\n```' };
      },
    },
    listKnowledge: () => [],
  });

  const result = await service.review({ name: 'Story', keywords: ['story'], answer: 'A story.' });

  assert.equal(result.verdict, 'pass');
});

test('LLM review preserves a useful prose review when structured output fails', async () => {
  const prose = '후인의 목표와 홍길동의 기존 신념이 어떻게 충돌하는지 구체화해 주세요.';
  const service = createStoryReviewService({
    modelAdapter: { async generate() { return { answer: prose }; } },
    listKnowledge: () => [],
  });

  const result = await service.review({ name: 'Story', keywords: ['story'], answer: 'A story idea.' });

  assert.equal(result.verdict, 'review_required');
  assert.deepEqual(result.suggestions, [prose]);
});

test('LLM review converts structured findings into readable messages', async () => {
  const service = createStoryReviewService({
    modelAdapter: {
      async generate() {
        return { answer: JSON.stringify({ verdict: 'review_required', continuityConflicts: [{ content: '인과관계가 약함', reason: '사건의 원인이 설명되지 않음' }] }) };
      },
    },
    listKnowledge: () => [],
  });

  const result = await service.review({ name: 'Story', keywords: ['story'], answer: 'A story.' });

  assert.deepEqual(result.continuityConflicts, ['인과관계가 약함 — 사건의 원인이 설명되지 않음']);
});

test('review required without findings explains that the story needs more detail', async () => {
  const service = createStoryReviewService({
    modelAdapter: { async generate() { return { answer: JSON.stringify({ verdict: 'review_required' }) }; } },
    listKnowledge: () => [],
  });

  const result = await service.review({ name: 'Story', keywords: ['story'], answer: 'A short idea.' });

  assert.deepEqual(result.suggestions, ['스토리 본문, 사건 인과관계, 캐릭터 목표와 행동을 더 구체적으로 입력해 주세요.']);
});

test('근거가 부족한 Mock 검토는 review_required이며 승인하지 않는다', async () => {
  const service = createStoryReviewService({
    modelAdapter: new MockModelAdapter(),
    listKnowledge: () => [],
  });

  const result = await service.review(draft);

  assert.equal(result.verdict, 'review_required');
  assert.equal(result.approvalRequired, true);
  await assert.rejects(async () => {
    try {
      service.approve(result.reviewId, draft);
    } catch (error) {
      assert.equal(error.code, 'STORY_REVIEW_REQUIRED');
      throw error;
    }
  });
});

test('구조화된 LLM 검토 결과는 reviewId와 근거를 보존한다', async () => {
  const modelAdapter = {
    async generate() {
      return {
        answer: JSON.stringify({
          verdict: 'pass',
          continuityConflicts: [],
          timelineIssues: [],
          characterConsistency: ['연화의 중립자 역할과 일치'],
          factionConsistency: [],
          missingRelationships: [],
          suggestions: [],
        }),
        usage: { inputTokens: 10, outputTokens: 20 },
      };
    },
  };
  const service = createStoryReviewService({
    modelAdapter,
    listKnowledge: (mode) => mode === 'lore'
      ? [{ id: 'glass-star-origin', name: '유리별의 기원', keywords: ['유리별'], answer: '유리별 설정' }]
      : [{ id: 'yeonhwa-codex', name: '연화', keywords: ['연화'], answer: '연화 설정' }],
  });

  const result = await service.review(draft);

  assert.match(result.reviewId, /^review-/);
  assert.equal(result.verdict, 'pass');
  assert.deepEqual(result.evidence, ['lore:glass-star-origin', 'codex:yeonhwa-codex']);
  assert.deepEqual(result.usage, { inputTokens: 10, outputTokens: 20 });
});
test('approved pass review is persisted', async () => {
  const storyPath = join(mkdtempSync(join(tmpdir(), 'story-review-')), 'reviewed-stories.json');
  const service = createStoryReviewService({
    modelAdapter: { async generate() { return { answer: JSON.stringify({ verdict: 'pass' }) }; } },
    listKnowledge: () => [],
    storyPath,
    onApproved: (entry) => { entry.approvedInMemory = true; },
  });
  const draft = { name: '새 사건', keywords: ['새 사건'], answer: '기록' };
  const result = await service.review(draft);
  const saved = service.approve(result.reviewId, draft);

  assert.equal(saved.status, 'saved');
  assert.equal(JSON.parse(readFileSync(storyPath, 'utf8')).length, 1);
  assert.equal(saved.entry.approvedInMemory, true);
});

test('스토리 검토는 Lore 요약이 아니라 RPG 서사 검토 기준을 LLM에 전달한다', async () => {
  let request;
  const service = createStoryReviewService({
    modelAdapter: {
      async generate(input) {
        request = input;
        return { answer: JSON.stringify({ verdict: 'review_required' }) };
      },
    },
    listKnowledge: () => [],
  });

  await service.review({
    name: '기억의 문',
    keywords: ['기억', '문'],
    answer: '주인공이 봉인된 문을 연다.',
  });

  assert.match(request.system, /인과관계|타임라인|캐릭터|세력/);
  assert.match(request.question, /스토리|서사|검토/);
});
