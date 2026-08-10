import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from './errors.js';
import { MockModelAdapter } from './model.js';

const defaultStoryPath = fileURLToPath(new URL('../data/stories/reviewed-stories.json', import.meta.url));
const REVIEW_TTL_MS = 30 * 60 * 1000;

function validateDraft(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) throw new AppError('INVALID_REQUEST', '스토리 초안은 JSON 객체여야 합니다.', 400);
  for (const field of ['name', 'answer']) {
    if (typeof draft[field] !== 'string' || !draft[field].trim()) throw new AppError('INVALID_REQUEST', `${field}는 필수 문자열입니다.`, 400);
  }
  if (!Array.isArray(draft.keywords) || draft.keywords.length < 1 || draft.keywords.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new AppError('INVALID_REQUEST', 'keywords는 비어 있지 않은 문자열 배열이어야 합니다.', 400);
  }
  for (const field of ['relatedLoreIds', 'relatedCodexIds']) {
    if (draft[field] !== undefined && (!Array.isArray(draft[field]) || draft[field].some((item) => typeof item !== 'string'))) {
      throw new AppError('INVALID_REQUEST', `${field}는 문자열 배열이어야 합니다.`, 400);
    }
  }
  return {
    name: draft.name.trim(),
    keywords: draft.keywords.map((item) => item.trim()),
    answer: draft.answer.trim(),
    relatedLoreIds: draft.relatedLoreIds ?? [],
    relatedCodexIds: draft.relatedCodexIds ?? [],
  };
}

function readStore(storyPath) {
  try {
    const value = JSON.parse(readFileSync(storyPath, 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeStore(storyPath, entries) {
  mkdirSync(dirname(storyPath), { recursive: true });
  writeFileSync(storyPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}

function buildEvidence(draft, listKnowledge) {
  const evidence = [];
  for (const [mode, ids] of [['lore', draft.relatedLoreIds], ['codex', draft.relatedCodexIds]]) {
    const entries = listKnowledge(mode, { full: true }) ?? [];
    for (const id of ids) {
      const entry = entries.find((item) => item.id === id);
      if (entry) evidence.push(`${mode}:${entry.id}\n${entry.name}\n${entry.answer}`);
    }
  }
  if (evidence.length === 0) {
    const query = `${draft.name} ${draft.keywords.join(' ')} ${draft.answer}`;
    for (const mode of ['lore', 'codex']) {
      const entries = listKnowledge(mode, { full: true }) ?? [];
      for (const entry of entries) {
        if ([entry.name, ...(entry.keywords ?? [])].some((term) => query.includes(term))) {
          evidence.push(`${mode}:${entry.id}\n${entry.name}\n${entry.answer}`);
        }
      }
    }
  }
  return evidence.slice(0, 5);
}

function normalizeReview(raw, evidence, usage, reviewId) {
  let parsed;
  try {
    parsed = JSON.parse(String(raw).replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim());
  } catch {
    parsed = { verdict: 'review_required', suggestions: ['LLM 검토 결과를 구조화된 JSON으로 해석하지 못했습니다.'] };
  }
  const arrays = ['continuityConflicts', 'timelineIssues', 'characterConsistency', 'factionConsistency', 'missingRelationships', 'suggestions'];
  const result = Object.fromEntries(arrays.map((key) => [key, Array.isArray(parsed[key]) ? parsed[key] : []]));
  const verdict = ['pass', 'review_required', 'reject'].includes(parsed.verdict) ? parsed.verdict : 'review_required';
  return { reviewId, verdict, ...result, evidence: evidence.map((item) => item.split('\n', 1)[0]), usage: usage ?? null, approvalRequired: verdict !== 'pass' };
}

export function createStoryReviewService({ modelAdapter, listKnowledge, storyPath = defaultStoryPath, onApproved }) {
  if (!modelAdapter || typeof modelAdapter.generate !== 'function') throw new TypeError('modelAdapter.generate가 필요합니다.');
  if (typeof listKnowledge !== 'function') throw new TypeError('listKnowledge가 필요합니다.');
  const reviews = new Map();

  return {
    async review(input) {
      const draft = validateDraft(input);
      const reviewId = `review-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const evidence = buildEvidence(draft, listKnowledge);
      if (modelAdapter instanceof MockModelAdapter) {
        const result = normalizeReview('', evidence, null, reviewId);
        reviews.set(reviewId, { draft, result, expiresAt: Date.now() + REVIEW_TTL_MS });
        return result;
      }
      const result = await modelAdapter.generate({
        system: '스토리 검토자다. 제공된 근거만 사실로 사용한다. 근거 밖의 설정은 추측하지 않는다. 반드시 verdict와 배열 필드를 가진 JSON만 반환한다.',
        question: `다음 스토리 초안의 기존 설정 충돌, 전후관계, 인물·세력 일관성, 누락된 관계를 검토해줘. 초안:\n${JSON.stringify(draft)}`,
        evidence,
        maxOutputChars: 6000,
      });
      const normalized = normalizeReview(result.answer, evidence, result.usage, reviewId);
      reviews.set(reviewId, { draft, result: normalized, expiresAt: Date.now() + REVIEW_TTL_MS });
      return normalized;
    },
    approve(reviewId, input) {
      const stored = reviews.get(reviewId);
      if (!stored || stored.expiresAt <= Date.now()) throw new AppError('STORY_REVIEW_EXPIRED', '승인 가능한 검토 결과가 없습니다.', 409);
      const draft = validateDraft(input);
      if (JSON.stringify(draft) !== JSON.stringify(stored.draft) || stored.result.verdict !== 'pass') throw new AppError('STORY_REVIEW_REQUIRED', '승인 가능한 검토 결과가 없습니다.', 409);
      const entries = readStore(storyPath);
      const id = draft.id ?? `${draft.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
      if (entries.some((entry) => entry.id === id)) throw new AppError('STORY_DUPLICATE', '같은 스토리 ID가 이미 존재합니다.', 409);
      const entry = { id, ...draft, originalContent: true, sourceRef: null, inspirationSources: [], storyArc: 'reviewed' };
      writeStore(storyPath, [...entries, entry]);
      onApproved?.(entry);
      reviews.delete(reviewId);
      return { status: 'saved', entry };
    },
  };
}
