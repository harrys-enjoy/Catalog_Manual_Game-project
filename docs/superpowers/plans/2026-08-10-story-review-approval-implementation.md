# 스토리 LLM 검토·승인 반영 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MAIN의 기존 `+ Add story`를 LLM 검토 후 사용자 승인 시에만 CAT에 저장하는 흐름으로 변경한다.

**Architecture:** CAT이 스토리 초안의 근거 수집, LLM 검토, 승인 상태, 승인 저장을 소유한다. MAIN은 기존 UI와 `/api/stories` 프록시를 Review/Approve 두 API로 확장하고, CAT은 승인된 스토리를 별도 파일에 병합한다. 기존 Q&A·A2A·정적 지식 데이터는 유지한다.

**Tech Stack:** CAT Node.js 20+, Node built-in test runner, 기존 OpenAI 호환 LLM adapter, JSON file store; MAIN Python FastAPI, Pydantic, React/TypeScript.

## Global Constraints

- LLM 검토 전용 설정은 기존 `MODEL_ENABLED`를 사용하며, `false`에서는 자동 승인하지 않는다.
- 기존 `data/knowledge.json`과 `data/stories/side-story-ashes-ledger.json`은 덮어쓰지 않는다.
- 승인 스토리는 `data/stories/reviewed-stories.json`에 저장하고 CAT 시작 시 Lore에 병합한다.
- API Key와 Model Key는 브라우저·저장소·로그에 노출하지 않는다.
- 사용자가 검토 결과를 확인하기 전에는 Catalog 파일을 수정하지 않는다.
- 현재 작업 트리의 사용자 변경인 `src/knowledge.js`, `test/knowledge.test.js`, `diagrams/`를 보존한다.

---

### Task 1: CAT 승인 스토리지와 Lore 병합

**Files:**
- Create: `data/stories/reviewed-stories.json`
- Modify: `src/knowledge.js`
- Test: `test/knowledge.test.js`

**Interfaces:**
- `reviewed-stories.json`은 승인된 Lore entry 배열을 저장한다.
- `src/knowledge.js`는 파일이 없으면 빈 배열로 처리하고, 기존 storyEntries 뒤에 승인 entry를 병합한다.

- [ ] **Step 1: 빈 승인 스토리지 파일과 실패 테스트 작성**

```js
test('승인된 스토리는 lore 목록에 병합된다', () => {
  const entry = listKnowledge('lore', { full: true }).find((item) => item.id === 'reviewed-story-seed');
  assert.equal(entry?.originalContent, true);
});
```

- [ ] **Step 2: 테스트가 새 seed 부재로 실패하는지 확인**

Run: `npm.cmd test -- test/knowledge.test.js`
Expected: FAIL because `reviewed-story-seed` is not present.

- [ ] **Step 3: 승인 스토리지 seed와 병합 로직 구현**

`reviewed-stories.json`에는 테스트용 승인 entry를 넣고, `knowledge.js`에서 `readFileSync` 실패 시 `[]`를 사용해 기존 설치가 깨지지 않게 한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm.cmd test -- test/knowledge.test.js`
Expected: PASS.

- [ ] **Step 5: CAT 데이터 계약 커밋**

```powershell
git add data/stories/reviewed-stories.json src/knowledge.js test/knowledge.test.js
git commit -m "feat: merge approved stories into lore"
```

### Task 2: CAT 스토리 검토·승인 서비스

**Files:**
- Create: `src/story-review.js`
- Modify: `src/agents.js`
- Modify: `src/server.js`
- Test: `test/story-review.test.js`
- Test: `test/api.test.js`

**Interfaces:**
- `createStoryReviewService({ modelAdapter, listKnowledge, lookupKnowledge })`를 제공한다.
- `review(draft)`는 `{ reviewId, verdict, continuityConflicts, timelineIssues, characterConsistency, factionConsistency, missingRelationships, suggestions, evidence, approvalRequired }`를 반환한다.
- `approve(reviewId, draft)`는 승인된 draft를 파일에 추가하고 `{ status: 'saved', entry }`를 반환한다.
- 검토 상태는 `reviewId`별 Map에 30분 저장한다. 서버 재시작 후 승인할 수 없다.

- [ ] **Step 1: 검토 서비스의 실패 테스트 작성**

```js
test('근거 없는 스토리 검토는 review_required이며 승인 전 저장하지 않는다', async () => {
  const service = createStoryReviewService({ modelAdapter: new MockModelAdapter(), listKnowledge: () => [], lookupKnowledge: () => null });
  const result = await service.review({ name: '새 이야기', keywords: ['새 이야기'], answer: '본문' });
  assert.equal(result.verdict, 'review_required');
  await assert.rejects(() => service.approve(result.reviewId, { name: '새 이야기', keywords: ['새 이야기'], answer: '본문' }));
});
```

- [ ] **Step 2: 실패 테스트 실행**

Run: `npm.cmd test -- test/story-review.test.js`
Expected: FAIL because the service and endpoints do not exist.

- [ ] **Step 3: 초안 검증·근거 수집·검토 결과 파싱 구현**

검토 프롬프트는 제공된 evidence만 사실 근거로 사용하도록 지시한다. Mock에서는 저장 가능한 `pass`를 만들지 않고 `review_required`를 반환한다. 실제 LLM 응답은 JSON fenced block 또는 JSON 문자열을 파싱하고, 필수 배열 필드가 없으면 `review_required`로 정규화한다.

- [ ] **Step 4: 승인 저장 구현**

승인 시 ID 중복, `relatedLoreIds`, `relatedCodexIds` 존재 여부를 검사하고 `reviewed-stories.json`에 원자적으로 추가한다. 기존 파일과 동일 ID면 409 오류를 반환한다.

- [ ] **Step 5: CAT HTTP Endpoint 연결**

`POST /api/story-review`와 `POST /api/story-approve`를 `server.js`에 추가한다. 요청 길이·키워드 수·관련 ID를 검증하고, 오류 시 기존 JSON 오류 형식을 유지한다.

- [ ] **Step 6: API 테스트 통과 확인**

Run: `npm.cmd test -- test/story-review.test.js test/api.test.js`
Expected: PASS.

- [ ] **Step 7: CAT 서비스 커밋**

```powershell
git add src/story-review.js src/agents.js src/server.js test/story-review.test.js test/api.test.js
git commit -m "feat: add story review and approval api"
```

### Task 3: MAIN API 프록시 분리

**Files:**
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- `POST /api/stories/review`는 CAT의 `/api/story-review`를 호출한다.
- `POST /api/stories/approve`는 CAT의 `/api/story-approve`를 호출한다.
- 기존 `/api/stories`는 새 UI가 사용하지 않도록 유지하거나 명확한 410 응답으로 전환한다.

- [ ] **Step 1: MAIN 프록시 계약 실패 테스트 작성**

FastAPI test client에서 CAT 호출을 monkeypatch해 review 응답과 approve 응답을 확인하고, CAT 오류가 502로 매핑되는지 검증한다.

- [ ] **Step 2: MAIN 테스트 실행**

Run: `pytest backend/tests/test_api.py -q`
Expected: 새 테스트가 실패한다.

- [ ] **Step 3: Pydantic 요청 모델과 프록시 구현**

`StoryDraftRequest`에 `name`, `keywords`, `answer`, `relatedLoreIds`, `relatedCodexIds`를 정의하고 CAT URL에서 `/message:send` 또는 `/a2a` suffix를 제거해 새 API 경로를 호출한다.

- [ ] **Step 4: MAIN 테스트 통과 확인**

Run: `pytest backend/tests/test_api.py -q`
Expected: PASS.

### Task 4: MAIN Add Story UI를 Review → Approve 흐름으로 변경

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/chat-answer.css`
- Test: `frontend/src` 기존 테스트 또는 `frontend` 테스트 설정에 맞는 UI 테스트 파일

**Interfaces:**
- 기존 `+ Add story` 버튼과 폼을 유지한다.
- `Save story`를 `Review story`로 바꾼다.
- 검토 결과를 표시하고 `Approve and save`를 누를 때만 승인 API를 호출한다.

- [ ] **Step 1: UI 상태와 버튼 동작 실패 테스트 작성**

초안 제출이 `/api/stories/review`를 호출하고, 검토 전에는 `/api/stories/approve`를 호출하지 않으며, 승인 버튼에서만 approve 요청을 보내는 시나리오를 추가한다.

- [ ] **Step 2: UI 테스트 실행**

Run: `npm test` 또는 저장소에 설정된 frontend test 명령
Expected: 새 시나리오가 실패한다.

- [ ] **Step 3: UI 구현**

`reviewId`, `reviewResult`, `reviewState`를 관리한다. 충돌과 경고를 화면에 표시하고, `review_required` 또는 `reject`에서는 승인 버튼을 비활성화하거나 사용자 확인을 요구한다. 초안 닫기·리셋 시 review 상태를 폐기한다.

- [ ] **Step 4: UI 테스트 통과와 빌드 확인**

Run: 저장소의 frontend test 및 build 명령
Expected: PASS와 production build 성공.

### Task 5: 통합 검증과 문서 업데이트

**Files:**
- Modify: `README.md`
- Modify: `docs/api/openapi.yaml`
- Test: `test/` 전체, `backend/tests/` 전체

- [ ] **Step 1: 전체 CAT 테스트 실행**

Run: `npm.cmd test`
Expected: 전체 PASS.

- [ ] **Step 2: 전체 MAIN 테스트 실행**

Run: `pytest -q`
Expected: 전체 PASS.

- [ ] **Step 3: Docker 환경에서 CAT 저장소 쓰기 권한 확인**

Compose 실행 시 승인 스토리지에 쓸 수 있는 volume 또는 writable application directory를 지정하고, 컨테이너에서 review → approve → `/knowledge?mode=lore&full=true` 조회를 확인한다.

- [ ] **Step 4: API 문서·README 갱신**

Review/Approve 요청·응답, `MODEL_ENABLED`, 승인 전 자동 저장 금지, `reviewed-stories.json` 위치를 문서화한다.

- [ ] **Step 5: 최종 검증 후 통합 준비**

`git status --short`에서 기존 사용자 변경을 제외한 새 변경만 확인하고, 테스트 결과와 변경 파일을 보고한다.
