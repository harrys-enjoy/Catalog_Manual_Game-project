# Codex Lore Cross-Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인물·세력 도감과 관련 세계관 항목을 양방향 ID와 클릭 가능한 UI 링크로 연결한다.

**Architecture:** `data/knowledge.json`의 관련 항목에 `relatedLoreIds`와 `relatedCodexIds`를 추가한다. `listKnowledge(..., { full: true })`는 해당 참조 배열을 그대로 반환하고, 데모 UI는 현재 모드와 반대 모드의 전체 목록을 함께 불러와 관련 항목 링크를 렌더링한다.

**Tech Stack:** Node.js, JSON, 브라우저 Fetch API, Node built-in test runner (`npm.cmd test`)

## Global Constraints

- 기존 답변 내용과 검색 API 동작은 변경하지 않는다.
- 일반 요약 목록은 기존 응답 구조를 유지한다.
- 전체 콘텐츠 응답에서만 `relatedLoreIds` 또는 `relatedCodexIds`를 노출한다.
- 참조 ID는 실제 `lore`·`codex` 항목의 `id`만 사용한다.
- 기존 작업 트리의 사용자 변경 사항은 보존한다.

---

### Task 1: 상호 참조 데이터 및 응답 테스트 추가

**Files:**
- Modify: `test/knowledge.test.js`

**Interfaces:**
- Consumes: `listKnowledge(mode, { full: true })`
- Produces: 인물·세력의 양방향 참조 검증

- [x] **Step 1: 실패 테스트 작성**

```js
test('인물·세력 도감과 세계관 항목이 양방향으로 연결된다', () => {
  const lore = listKnowledge('lore', { full: true });
  const codex = listKnowledge('codex', { full: true });
  const loreById = new Map(lore.map((entry) => [entry.id, entry]));
  const codexById = new Map(codex.map((entry) => [entry.id, entry]));

  for (const entry of codex.filter((item) => item.relatedLoreIds?.length)) {
    for (const loreId of entry.relatedLoreIds) {
      assert.ok(loreById.has(loreId));
      assert.ok(loreById.get(loreId).relatedCodexIds.includes(entry.id));
    }
  }
  for (const entry of lore.filter((item) => item.relatedCodexIds?.length)) {
    for (const codexId of entry.relatedCodexIds) {
      assert.ok(codexById.has(codexId));
      assert.ok(codexById.get(codexId).relatedLoreIds.includes(entry.id));
    }
  }
});
```

- [x] **Step 2: 실패 확인**

실행: `node --test test/knowledge.test.js`

예상 결과: 새 참조 필드가 없어 테스트가 실패한다.

### Task 2: 데이터 참조 필드 추가

**Files:**
- Modify: `data/knowledge.json`

**Interfaces:**
- Consumes: Task 1의 양방향 참조 계약
- Produces: 인물·세력 도감과 관련 세계관의 명시적 ID 연결

- [x] **Step 1: 도감 항목에 `relatedLoreIds` 추가**

인물과 세력 도감 6개에 설계 문서의 ID 목록을 배열로 추가한다. 전우치·홍길동·연화와 3개 세력의 모든 참조 대상은 실제 `lore` 항목이어야 한다.

- [x] **Step 2: 세계관 항목에 `relatedCodexIds` 추가**

도감에서 참조한 세계관 항목에 역방향 ID를 추가한다. 같은 사건을 공유하는 전우치·홍길동은 양쪽 도감 ID를 모두 포함할 수 있다.

- [x] **Step 3: JSON 파싱 확인**

실행: `node -e "JSON.parse(require('fs').readFileSync('data/knowledge.json', 'utf8')); console.log('valid')"`

예상 결과: `valid`

### Task 3: 전체 콘텐츠 API 응답 확장

**Files:**
- Modify: `src/knowledge.js`

**Interfaces:**
- Consumes: 데이터 항목의 `relatedLoreIds`·`relatedCodexIds`
- Produces: `listKnowledge(mode, { full: true })`의 선택적 참조 배열

- [x] **Step 1: 실패 테스트 확인**

Task 1의 테스트가 데이터와 API 응답에 참조 배열이 없어 실패하는 것을 확인한다.

- [x] **Step 2: 최소 구현**

`listKnowledge`의 `full` 반환 객체에 다음 두 필드를 추가한다.

```js
relatedLoreIds: entry.relatedLoreIds ?? [],
relatedCodexIds: entry.relatedCodexIds ?? [],
```

요약 응답(`full: false`)에는 필드를 추가하지 않는다.

- [x] **Step 3: 대상 테스트 통과 확인**

실행: `node --test test/knowledge.test.js`

예상 결과: 양방향 참조 테스트가 통과한다.

### Task 4: 데모 UI에 관련 항목 링크 표시

**Files:**
- Modify: `public/app.js`
- Modify: `test/demo-ui.test.js`

**Interfaces:**
- Consumes: 전체 콘텐츠 API의 참조 배열과 `entry.id`
- Produces: 관련 도감·세계관 항목을 클릭해 이동할 수 있는 카드 UI

- [x] **Step 1: UI 회귀 테스트 추가**

`test/demo-ui.test.js`에서 앱 스크립트에 `relatedLoreIds`, `relatedCodexIds`, 관련 항목 렌더링 및 항목 ID 기반 이동 코드가 포함되는지 검증한다.

- [x] **Step 2: 관련 목록 로드 구현**

`loadFullContent`에서 현재 모드와 반대 모드의 `full=true` 목록을 함께 가져와 ID→항목 맵을 만든다.

- [x] **Step 3: 관련 링크 렌더링 구현**

각 카드에 관련 항목 버튼을 추가하고 클릭 시 해당 카드로 스크롤·강조한다. 참조가 없으면 관련 영역을 표시하지 않는다.

- [x] **Step 4: UI 테스트 통과 확인**

실행: `node --test test/demo-ui.test.js`

예상 결과: 기존 UI 테스트와 신규 연결 UI 테스트가 통과한다.

### Task 5: 전체 검증

**Files:**
- Verify: `data/knowledge.json`
- Verify: `src/knowledge.js`
- Verify: `public/app.js`
- Verify: `test/knowledge.test.js`
- Verify: `test/demo-ui.test.js`

- [x] **Step 1: 전체 테스트 실행**

실행: `npm.cmd test`

예상 결과: 전체 테스트가 통과한다.

- [x] **Step 2: 변경 범위 점검**

실행: `git diff --check`

확인 내용: 참조 데이터·API 응답·UI·관련 테스트만 이번 작업으로 변경되며 기존 사용자 변경 파일은 건드리지 않는다.
