# 로컬 Q&A 데모 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 외부 업무생산성 서비스와 연결하지 않고 Game Q&A API의 현재 구현 기능만 브라우저에서 확인할 수 있는 로컬 데모 UI를 제공한다.

**Architecture:** 기존 Node 기본 HTTP 서버가 `/`에서 정적 HTML을 반환한다. 브라우저 JavaScript는 같은 출처의 `/health`와 `/api/ask`를 호출하고, 입력된 API 키가 있을 때만 Bearer 인증 헤더를 추가한다. 별도 프론트엔드 프레임워크와 의존성은 추가하지 않는다.

**Tech Stack:** Node.js 20+, built-in `node:http`, HTML, CSS, browser JavaScript, Node test runner

## Global Constraints

- 외부 업무생산성 UI는 만들지 않는다.
- MCP Host는 구현하지 않는다.
- API 키는 브라우저 저장소에 저장하지 않는다.
- 기존 `POST /api/ask` 계약과 기존 테스트를 유지한다.
- 실행 명령은 기존 `npm start`를 유지한다.

---

### Task 1: 정적 데모 화면 응답 계약 추가

**Files:**
- Create: `public/index.html`
- Create: `public/app.js`
- Create: `public/styles.css`
- Modify: `src/server.js`
- Test: `test/demo-ui.test.js`

**Interfaces:**
- `GET /` returns `text/html; charset=utf-8` and the demo shell.
- `GET /app.js` returns browser JavaScript.
- `GET /styles.css` returns CSS.
- Unknown static paths return the existing JSON 404 response.

- [ ] **Step 1: Write the failing test**

Add tests that create the server on an ephemeral port and assert:

```js
test('GET /가 로컬 데모 UI HTML을 반환한다', async () => {
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(await response.text(), /Game Q&A/);
});

test('데모 UI 정적 자산을 반환한다', async () => {
  const script = await fetch(`${baseUrl}/app.js`);
  const styles = await fetch(`${baseUrl}/styles.css`);
  assert.equal(script.status, 200);
  assert.equal(styles.status, 200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/demo-ui.test.js`

Expected: FAIL because `/`, `/app.js`, and `/styles.css` are not currently registered.

- [ ] **Step 3: Write minimal implementation**

Add a small static asset map in `src/server.js` using `readFileSync` and explicit routes for `/`, `/app.js`, and `/styles.css`. Return the correct content type and avoid serving arbitrary filesystem paths.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/demo-ui.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add public src/server.js test/demo-ui.test.js
git commit -m "feat: serve local game qna demo UI"
```

### Task 2: 데모 UI 동작과 오류 안내 구현

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `test/demo-ui.test.js`

**Interfaces:**
- Browser sends `{ mode, question }` to `POST /api/ask`.
- If the API key field is non-empty, browser sends `Authorization: Bearer <key>`.
- Browser renders `answer`, `agent`, `confidence`, and `sources` when present.

- [ ] **Step 1: Write the failing test**

Extend the HTML contract tests to assert the presence of the mode selector, question input, API key input, send button, health status, and response container:

```js
const html = await response.text();
assert.match(html, /mode/);
assert.match(html, /question/);
assert.match(html, /api-key/);
assert.match(html, /send/);
assert.match(html, /response/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/demo-ui.test.js`

Expected: FAIL until the demo controls are present.

- [ ] **Step 3: Write minimal implementation**

Create a compact Korean UI with four modes (`dev-guide`, `catalog`, `codex`, `lore`), a question textarea, optional API key input, health badge, loading state, answer panel, source list, and human-readable error panel. `public/app.js` calls `/health` on load and `/api/ask` on submit; it does not use `localStorage` or cookies.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/demo-ui.test.js; npm test`

Expected: all demo and existing tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add public test/demo-ui.test.js
git commit -m "feat: add local game qna demo controls"
```

### Task 3: 실행 문서와 수동 검증

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the local demo**

Add exact commands:

```powershell
npm start
```

Then open `http://localhost:3000/`. Explain that `API_KEY=` allows local unauthenticated testing, while a non-empty `API_KEY` requires the same key in the UI field.

- [ ] **Step 2: Run automated verification**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 3: Run the server and verify endpoints**

Run `npm start`, open `http://localhost:3000/`, confirm the health badge becomes 정상, submit a `codex` or `lore` question, and verify the answer panel renders a response or a clear model/data error.

- [ ] **Step 4: Commit**

```powershell
git add README.md
git commit -m "docs: explain local game qna demo"
```

## Self-review

- The plan covers the design requirements for the root UI, health check, mode selection, question submission, auth behavior, metadata, errors, and existing API compatibility.
- Static file access is limited to three explicit routes; arbitrary file reads are not introduced.
- No placeholder steps or new external dependencies are required.
