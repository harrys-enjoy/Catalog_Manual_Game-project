# 재의 장부 번외 스토리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전우치와 홍길동의 세력 몰락, 제3세력 무명회, 연화의 최종 선택을 검색 가능한 다국어 번외 스토리로 추가한다.

**Architecture:** 기존 `knowledge.json`을 직접 대규모로 확장하지 않고 `data/stories/side-story-ashes-ledger.json`에 번외편 원문을 분리한다. `src/knowledge.js`가 해당 파일을 Lore 지식에 병합하고, `data/story-locales.json`에서 한국어·영어·일본어·중국어 번역을 선택한다. 모든 번외 항목은 자체 창작 콘텐츠로 표시하며 외부 출처 검증 대상에서 제외한다.

**Tech Stack:** Node.js 20+, ES modules, Node built-in test runner, JSON data files.

## Global Constraints

- 기존 `knowledge.json`의 `lore` 검색과 API 응답 형식을 깨뜨리지 않는다.
- 번외 콘텐츠는 `originalContent: true`, `sourceRef: null`로 저장한다.
- 외부 문학 원문을 그대로 복사하지 않고, 전우치·홍길동의 공개 전승 모티프를 바탕으로 새로 작성한다.
- 한국어·영어·일본어·중국어(`zh-CN`)를 지원한다.
- API 키, 환경변수, 외부 LLM 호출은 이번 작업에 추가하지 않는다.
- 기존 사용자의 미커밋 변경사항은 되돌리지 않는다.

---

### Task 1: 번외 스토리 데이터 파일 추가

**Files:**
- Create: `data/stories/side-story-ashes-ledger.json`
- Test: `test/knowledge.test.js`

**Interfaces:**
- Produces a JSON array of lore entries with `id`, `name`, `keywords`, `answer`, `originalContent`, `sourceRef`, `inspirationSources`, and `storyArc`.

- [ ] **Step 1: Write the failing test**

```js
test('재의 장부 번외편의 핵심 항목을 검색할 수 있다', () => {
  const ids = [
    'side-ashes-ledger',
    'side-unnamed-society',
    'side-yeonhwa',
    'side-jeonuchi-fall',
    'side-honggildong-fall',
    'side-third-banner',
  ];
  const entries = listKnowledge('lore', { full: true })
    .filter((entry) => ids.includes(entry.id));
  assert.equal(entries.length, ids.length);
  assert.ok(entries.every((entry) => entry.originalContent === true));
  assert.ok(entries.every((entry) => entry.sourceRef === null));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="재의 장부"`

Expected: FAIL because the six side-story entries do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create six entries:

```json
[
  {
    "id": "side-ashes-ledger",
    "name": "재의 장부",
    "keywords": ["재의 장부", "번외편", "전우치 홍길동 외전"],
    "answer": "전우치와 홍길동의 세력이 몰락한 뒤, 세 세력의 죄와 희생자의 이름을 기록한 장부를 둘러싸고 연화와 무명회가 충돌하는 번외편이다.",
    "originalContent": true,
    "sourceRef": null,
    "inspirationSources": ["original-lore", "jeonuchi-honggildong-adaptation"],
    "storyArc": "side-story"
  }
]
```

Add the remaining five entries with these exact themes:

- `side-unnamed-society`: 영웅 없는 세상을 만들려는 제3세력 무명회
- `side-yeonhwa`: 세 세력의 신념을 검증하는 연화
- `side-jeonuchi-fall`: 자유가 방종과 사적 복수로 변해 전우치 세력이 분열하는 사건
- `side-honggildong-fall`: 질서가 감시와 강제 복종으로 변해 홍길동 세력이 해체되는 사건
- `side-third-banner`: 연화가 무명회의 감시 체계까지 비판하고 기록을 공개하는 결말

Each answer must contain a self-contained synopsis, not a reference to an unavailable chapter.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --test-name-pattern="재의 장부"`

Expected: The test still fails until the loader in Task 2 is connected; this confirms the data contract before integration.

- [ ] **Step 5: Commit**

```bash
git add data/stories/side-story-ashes-ledger.json test/knowledge.test.js
git commit -m "feat: add ashes ledger side story data"
```

### Task 2: Lore 로더에 번외 데이터 연결

**Files:**
- Modify: `src/knowledge.js`
- Test: `test/knowledge.test.js`

**Interfaces:**
- `listKnowledge('lore', options)` and `lookupKnowledge('lore', question, locale)` expose the merged core lore and side-story entries.

- [ ] **Step 1: Write the failing test**

```js
test('재의 장부 키워드로 무명회와 연화의 번외 내용을 조회한다', () => {
  const society = lookupKnowledge('lore', '무명회는 어떤 세력인가');
  const yeonhwa = lookupKnowledge('lore', '연화는 누구인가');
  assert.equal(society.sources[0], 'lore:side-unnamed-society');
  assert.equal(yeonhwa.sources[0], 'lore:side-yeonhwa');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="무명회와 연화"`

Expected: FAIL because `knowledge.js` currently loads only `data/knowledge.json`.

- [ ] **Step 3: Write minimal implementation**

Load the side-story JSON beside the existing knowledge JSON and merge only its `lore` entries:

```js
const sideStoryPath = fileURLToPath(
  new URL('../data/stories/side-story-ashes-ledger.json', import.meta.url),
);
const sideStory = JSON.parse(readFileSync(sideStoryPath, 'utf8'));
const mergedKnowledge = {
  ...knowledge,
  lore: [...(knowledge.lore ?? []), ...sideStory],
};
```

Use `mergedKnowledge` for validation, `listKnowledge`, and `lookupKnowledge`. Keep `sourceById` behavior unchanged; `sourceRef: null` must produce no external URL.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --test-name-pattern="재의 장부|무명회와 연화"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/knowledge.js test/knowledge.test.js
git commit -m "feat: load side stories into lore knowledge"
```

### Task 3: 번외편 다국어 데이터 추가

**Files:**
- Create: `data/story-locales.json`
- Modify: `src/knowledge.js`
- Test: `test/side-story.test.js`

**Interfaces:**
- `localizedEntry()` resolves a side-story translation from `story-locales.json` before falling back to the Korean source entry.

- [ ] **Step 1: Write the failing test**

```js
test('재의 장부 번외편은 영어·일본어·중국어로 조회된다', () => {
  for (const locale of ['en', 'ja', 'zh-CN']) {
    const result = lookupKnowledge('lore', 'Ashes Ledger', locale);
    assert.equal(result.sources[0], 'lore:side-ashes-ledger');
    assert.ok(result.answer.length > 20);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="재의 장부 번외편"`

Expected: FAIL because side-story translations are not registered.

- [ ] **Step 3: Write minimal implementation**

Create translations for all six IDs in `en`, `ja`, and `zh-CN`, each containing `name`, `keywords`, and `answer`. Extend `localizedEntry()` with a second translation map:

```js
const storyLocalesPath = fileURLToPath(
  new URL('../data/story-locales.json', import.meta.url),
);
const storyLocales = JSON.parse(readFileSync(storyLocalesPath, 'utf8'));
const translation = storyLocales[entry.id]?.[selectedLocale]
  ?? (selectedLocale === 'ko' ? null : loreLocales[entry.id]?.[selectedLocale]);
```

The English keyword `Ashes Ledger` must be present for the locale test. Japanese and Chinese keywords must use their localized titles.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --test-name-pattern="재의 장부 번외편"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add data/story-locales.json src/knowledge.js test/side-story.test.js
git commit -m "feat: localize ashes ledger side story"
```

### Task 4: API·전체 콘텐츠 노출 검증

**Files:**
- Modify: `README.md`
- Test: `test/side-story.test.js`

**Interfaces:**
- Existing lore list and ask endpoints return the side-story records without requiring an LLM.

- [ ] **Step 1: Write the failing test**

```js
test('lore 전체 콘텐츠 응답에 재의 장부 번외편이 포함된다', async () => {
  const response = await requestJson('/knowledge?mode=lore&full=true');
  assert.equal(response.status, 200);
  assert.ok(response.body.some((entry) => entry.id === 'side-third-banner'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern="재의 장부 번외편이 포함"`

Expected: FAIL until the API reads the merged knowledge collection.

- [ ] **Step 3: Write minimal implementation**

Update the README knowledge section with:

```text
번외편 검색 예시:
- 재의 장부가 무엇인가
- 무명회는 어떤 세력인가
- 전우치 세력은 왜 몰락했는가
- 홍길동 세력은 어떻게 해체되었는가
- 연화의 최종 선택은 무엇인가
```

If the API already delegates to `listKnowledge` and `lookupKnowledge`, make no route changes; only ensure the merged loader is used.

- [ ] **Step 4: Run full verification**

Run: `npm test`

Expected: all existing and new tests pass.

- [ ] **Step 5: Commit**

```bash
git add README.md test/side-story.test.js
git commit -m "docs: expose ashes ledger lore queries"
```

## Self-Review Checklist

- [ ] Six Korean side-story entries cover the third faction, Yeonhwa, both faction collapses, and the ending.
- [ ] All side-story entries are marked as original content and have no external source URL.
- [ ] Four locales are supported without changing existing locale identifiers.
- [ ] Search works without an LLM and existing API contracts remain unchanged.
- [ ] No secrets, environment variables, or external network calls are added.
