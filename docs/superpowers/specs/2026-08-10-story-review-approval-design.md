# 스토리 LLM 검토·승인 반영 설계

## 목표

MAIN의 기존 Game Q&A 채팅 아래 `+ Add story` 기능을 즉시 저장 방식에서 LLM 검토 후 사용자 승인 반영 방식으로 변경한다. CAT의 기존 세계관·도감·사건 데이터를 근거로 사용하며, 승인 전에는 Catalog 파일을 수정하지 않는다.

## 현재 상태

- MAIN `frontend/src/App.tsx`에 `+ Add story` 폼이 이미 있다.
- 현재 입력값은 제목, 키워드, 본문이며 `POST /api/stories`로 즉시 저장을 시도한다.
- MAIN `backend/app/main.py`의 `/api/stories`는 CAT의 `POST /knowledge/lore`를 호출한다.
- 현재 CAT 서버에는 `GET /knowledge`는 있으나 승인 저장용 `POST /knowledge/lore` 계약이 없다.
- CAT의 LLM은 `MODEL_ENABLED=true`일 때 OpenAI 호환 NVIDIA Endpoint를 사용한다.

## 사용자 흐름

```text
+ Add story
  ↓
초안 입력
  ↓
Review story
  ↓
기존 lore·codex·사건 근거 수집
  ↓
LLM 충돌·전후관계 검토
  ↓
검토 결과 표시
  ↓
Approve and save
  ↓
CAT 승인 저장
```

## API 설계

### MAIN

- `POST /api/stories/review`: MAIN이 CAT에 검토 요청을 중계한다.
- `POST /api/stories/approve`: 사용자가 검토 결과를 확인한 뒤 승인된 초안을 CAT에 중계한다.
- MAIN은 스토리 내용을 직접 저장하지 않는다.

### CAT

- `POST /api/story-review`: 초안과 관련 근거를 받아 검토 결과를 반환한다.
- `POST /api/story-approve`: 승인된 초안을 별도 승인 스토리 저장소에 추가한다.
- 기존 정적 `knowledge.json`과 기존 스토리 파일은 자동으로 덮어쓰지 않는다.

CAT은 `reviewId`별로 초안과 검토 결과를 메모리에 보관한다. 검토 상태는 30분 후 만료되며, 서버 재시작 후에는 승인할 수 없다. 따라서 승인 요청은 반드시 같은 실행 세션에서 새로 발급된 `reviewId`를 사용해야 한다.

## 초안 입력 계약

```json
{
  "name": "스토리 제목",
  "keywords": ["키워드"],
  "answer": "스토리 본문",
  "relatedLoreIds": [],
  "relatedCodexIds": []
}
```

제목·키워드·본문은 필수이며, 관련 ID는 선택 입력으로 한다. CAT은 ID가 지정된 경우 해당 항목을 우선 근거로 수집하고, 지정되지 않은 경우 제목·키워드·본문에서 관련 항목을 검색한다.

## 검토 결과 계약

```json
{
  "reviewId": "review-...",
  "verdict": "pass | review_required | reject",
  "continuityConflicts": [],
  "timelineIssues": [],
  "characterConsistency": [],
  "factionConsistency": [],
  "missingRelationships": [],
  "suggestions": [],
  "evidence": ["lore:...", "codex:..."],
  "approvalRequired": true
}
```

LLM은 제공된 근거 밖의 설정을 사실로 단정하지 않는다. 근거가 부족한 내용은 충돌이 아니라 `suggestions` 또는 경고로 표시한다. 검토 결과는 자동 승인하지 않는다.

## 저장 정책

승인된 항목은 기존 파일을 직접 수정하지 않고 다음 별도 파일에 저장한다.

```text
data/stories/reviewed-stories.json
```

CAT의 knowledge loader가 해당 파일을 읽어 lore 목록에 병합한다. 저장 시 ID 중복과 관련 ID 존재 여부를 검증한다. 검증 실패 시 저장하지 않는다.

## LLM·Mock 정책

- `MODEL_ENABLED=true`: 실제 LLM 검토
- `MODEL_ENABLED=false`: Mock은 API·UI 테스트용으로만 사용
- Mock 검토 결과는 실제 품질 판정으로 표시하지 않고 `review_required` 상태로 반환한다.
- LLM 오류·timeout·구조화 응답 파싱 실패 시 저장하지 않고 오류를 반환한다.

## UI 변경

기존 `+ Add story`를 유지한다.

- `Save story`를 `Review story`로 변경
- 검토 중 로딩·오류 표시
- 충돌·전후관계·인물·세력 검토 결과 표시
- 검토 완료 후 `Approve and save`와 `Cancel` 제공
- 승인 전 새로고침 또는 닫기 시 초안은 저장하지 않음

## 보안·무결성

- API Key와 Model Key는 브라우저에 전달하지 않는다.
- 초안 길이와 키워드 수를 제한한다.
- 승인 API는 reviewId와 검토 대상 초안의 일치 여부를 확인한다.
- 승인 API는 저장 전에 reviewId의 검토 상태와 verdict를 다시 확인한다.
- 사용자가 검토 결과를 보지 않고 임의의 승인 요청을 보내도 CAT이 검토 상태를 확인해야 한다.
- 기존 지식 파일의 삭제·덮어쓰기는 수행하지 않는다.

## 테스트 기준

- MAIN의 Review API가 CAT 검토 Endpoint를 호출한다.
- CAT은 관련 lore·codex 근거를 수집한다.
- LLM 구조화 결과가 정상적으로 반환된다.
- 근거 부족 결과는 `review_required`로 반환된다.
- 충돌 결과는 승인 저장을 막는다.
- 정상 승인만 `reviewed-stories.json`에 저장된다.
- 중복 ID와 잘못된 related ID는 저장되지 않는다.
- 기존 `+ Add story` UI는 Review → Approve 순서를 지킨다.
- 기존 Q&A·A2A·정적 지식 조회 테스트는 계속 통과한다.
