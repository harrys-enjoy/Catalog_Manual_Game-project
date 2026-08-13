# `/art` Video Generation Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/art` 요청을 스토리 기반 Video Generation 프롬프트 생성 에이전트로 라우팅한다.

**Architecture:** 오케스트레이터가 `/art` 접두사를 우선 식별하고 `video-prompt-guide` 에이전트를 선택한다. 에이전트는 `context`와 `evidence`를 포함한 요청을 모델에 전달하며, 기존 일반 Q&A·지식 검색 경로는 유지한다.

**Tech Stack:** Node.js ES modules, `node:test`, 기존 모델 어댑터·오케스트레이터 구조.

## Global Constraints

- 실제 Video Generation API 호출은 구현하지 않는다.
- 근거 밖의 RPG 설정을 추측하지 않는다.
- 기존 `planning-guide`, `art-guide`, `lore`와 직접 지식 응답 동작을 보존한다.
- RPG 스토리 검토는 기존 `/api/story-review`에서 수행하며 `/art`는 전달받은 결과를 사용한다.

---

### Task 1: `/art` 라우팅과 Video Agent 계약

**Files:**
- Modify: `src/orchestrator.js`
- Modify: `src/agents.js`
- Test: `test/orchestrator.test.js`

**Interfaces:**
- `/art` 식별 함수는 `dev-guide` 질문이 `/art`로 시작할 때만 true를 반환한다.
- `video-prompt-guide` 에이전트는 기존 `ask({ question, context, evidence })` 계약을 사용한다.

- [ ] **Step 1: `/art`가 Video Agent를 선택하는 실패 테스트 작성**
- [ ] **Step 2: 해당 테스트가 라우팅 실패로 실패하는지 확인**
- [ ] **Step 3: `video-prompt-guide` 등록과 `/art` 우선 라우팅 구현**
- [ ] **Step 4: 모델 질문에 context와 evidence를 보존하도록 구현**
- [ ] **Step 5: 대상 테스트와 전체 테스트 실행**

### Task 2: Video Generation 프롬프트 지침과 문서

**Files:**
- Modify: `src/agents.js`
- Modify: `README.md`
- Test: `test/orchestrator.test.js`

- [ ] **Step 1: Video Agent가 외형·행동·카메라·일관성 조건을 요구하는 실패 테스트 작성**
- [ ] **Step 2: 시스템 지침과 출력 계약 구현**
- [ ] **Step 3: `/art` 사용법과 입력 예시 문서화**
- [ ] **Step 4: 전체 테스트 실행 및 회귀 확인**
