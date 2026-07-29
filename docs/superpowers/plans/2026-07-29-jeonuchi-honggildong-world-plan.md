# 전우치·홍길동 대립 세계관 확장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 유리별 `lore` 데이터에 전우치와 홍길동의 신념 대립을 기반으로 한 신규 스토리라인과 선택형 결말을 추가한다.

**Architecture:** 기존 `data/knowledge.json`의 `lore` 배열에 신규 독자 창작 항목을 추가하고, 기존 `lookupKnowledge`·`/knowledge`·`/api/ask` 계약은 유지한다. 각 항목은 `originalContent: true`와 모티프를 설명하는 `inspirationSources`를 사용하며, 기존 CC0 `sourceRef`와 혼합하지 않는다.

**Tech Stack:** Node.js 20+, JSON knowledge store, Node built-in test runner, existing HTTP API and demo UI.

## Global Constraints

- 원전의 현대 번역문·특정 출판사 문장·영상 각색 대사를 복사하지 않는다.
- 새로 작성한 인물·사건·세력·선택지·결말만 저장한다.
- 전우치와 홍길동을 선악으로 분류하지 않고 자유와 질서의 가치 충돌로 표현한다.
- 기존 API 경로와 A2A 계약을 변경하지 않는다.
- 신규 항목은 `originalContent: true`를 사용한다.
- 신규 문학 모티프는 `inspirationSources`로 기록하고 `sourceRef`는 CC0 에셋에만 사용한다.

---

### Task 1: Add failing lore lookup tests

**Files:**
- Modify: `test/knowledge.test.js`
- Modify: `test/api.test.js`

**Interfaces:**
- Consumes: existing `lookupKnowledge`, `createServer`, and `/api/ask` behavior.
- Produces: regression tests proving both characters, the shared incident, and the non-binary conflict are searchable.

- [ ] **Step 1: Write the failing tests**

Add tests that call `lookupKnowledge('lore', question)` for `전우치`, `홍길동`, and `시민 기록 조작 사건`, and assert that the returned entries contain the expected IDs. Add an HTTP test that posts `{ mode: 'lore', question: '전우치와 홍길동은 왜 대립하나요?' }` and asserts a non-null answer with both names.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/knowledge.test.js test/api.test.js`

Expected: FAIL because the new lore IDs are not yet present.

- [ ] **Step 3: Keep the test scope limited**

Do not change matching logic or API contracts in this task; the expected failure must be missing data, not a validation or syntax error.

### Task 2: Add the original conflict storyline data

**Files:**
- Modify: `data/knowledge.json`

**Interfaces:**
- Consumes: existing `lore` entry schema and current `listKnowledge`/`lookupKnowledge` behavior.
- Produces: searchable lore entries for the two characters, their values, the central incident, campaign chapters, choice axes, and four endings.

- [ ] **Step 1: Add character and conflict entries**

Add unique IDs for:

```text
jeonuchi-freedom
honggildong-order
record-forgery-incident
wind-community
glass-star-heart
choice-axis-freedom-order
ending-jeonuchi
ending-honggildong
ending-cooperation
ending-independent
```

Each entry must include Korean `name`, Korean `keywords`, a newly written Korean `answer`, `originalContent: true`, and the same two `inspirationSources` strings describing the relevant motifs.

- [ ] **Step 2: Add campaign chapter entries**

Add entries for the five chapters: same incident/different solutions, thief of wind and designer of a new nation, glass-star heart, choice war, and morally non-binary endings. Each chapter must explain both sides’ motivations and consequences without labeling either as inherently good or evil.

- [ ] **Step 3: Run the focused tests**

Run: `node --test test/knowledge.test.js test/api.test.js`

Expected: PASS for the new lookup and API assertions.

### Task 3: Verify metadata and full-content exposure

**Files:**
- Modify: `test/sources-api.test.js` only if an existing metadata assertion needs coverage.
- Modify: `test/demo-ui.test.js`
- Modify: `test/knowledge.test.js`

**Interfaces:**
- Consumes: `listKnowledge('lore', { full: true })`, `/knowledge?mode=lore&full=true`, and existing UI asset behavior.
- Produces: tests proving the new content is visible in full-content mode and never treated as a CC0 `sourceRef`.

- [ ] **Step 1: Write metadata assertions**

Assert that all new lore entries have `originalContent === true`, contain non-empty `inspirationSources`, and do not require a `sourceRef`.

- [ ] **Step 2: Write full-content API assertions**

Call `GET /knowledge?mode=lore&full=true` and assert that the response includes the two character entries, their full `answer`, and `inspirationSources`.

- [ ] **Step 3: Run the full test suite**

Run: `npm.cmd test`

Expected: all existing tests plus the new lore tests pass with zero failures.

### Task 4: Review content and working-tree status

**Files:**
- Review: `data/knowledge.json`
- Review: `docs/superpowers/specs/2026-07-29-jeonuchi-honggildong-world-design.md`
- Review: `docs/superpowers/plans/2026-07-29-jeonuchi-honggildong-world-plan.md`

**Interfaces:**
- Consumes: the completed lore entries and test results.
- Produces: a final verification report; no changes to API keys or `.env`.

- [ ] **Step 1: Check for prohibited copied text**

Search the new entries for quotation marks, long source-like passages, or modern adaptation dialogue. Replace any such text with concise original summaries before final verification.

- [ ] **Step 2: Confirm only intended files changed**

Run: `git status --short`

Confirm that the changes are limited to the lore data, tests, and approved design/plan documents. Do not delete or reset unrelated user changes.

- [ ] **Step 3: Re-run tests before handoff**

Run: `npm.cmd test`

Expected: all tests pass.

- [ ] **Step 4: Report Git limitation if present**

If `.git/index.lock` still prevents staging or committing, report that the files and tests are complete but the commit remains pending due to the existing Windows permission issue.
