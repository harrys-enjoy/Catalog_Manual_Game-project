# 도감·세계관 상호 참조 설계

## 목표

`codex`의 요약 정보와 `lore`의 서사 정보를 명시적인 ID로 연결해, 사용자가 인물·세력의 기본 정보에서 관련 사건과 역사로 이동하고 다시 도감으로 돌아올 수 있게 한다.

## 범위

- `data/knowledge.json`의 관련 인물·세력 항목에 양방향 참조 필드 추가
- `src/knowledge.js`의 전체 콘텐츠 응답에 참조 정보 포함
- `public/app.js`에 관련 항목 표시 및 클릭 조회 추가
- `test/knowledge.test.js`, `test/demo-ui.test.js`에 참조 계약 검증 추가
- 기존 답변 내용과 검색 API는 유지한다.

## 연결 데이터 규칙

도감 항목에는 `relatedLoreIds`를, 세계관 항목에는 `relatedCodexIds`를 추가한다. 참조값은 배열이며 항목의 실제 `id`만 사용한다.

### 인물 연결

- `jeonuchi-codex` ↔ `jeonuchi-freedom`, `record-forgery-incident`, `wind-community`, `glass-star-heart`, `ending-jeonuchi`
- `honggildong-codex` ↔ `honggildong-order`, `record-forgery-incident`, `wind-community`, `glass-star-heart`, `ending-honggildong`
- `yeonhwa-codex` ↔ `side-yeonhwa`, `side-third-banner`, `record-forgery-incident`, `glass-star-heart`

### 세력 연결

- `wind-band-codex` ↔ `wind-community`, `record-forgery-incident`, `side-jeonuchi-fall`, `ending-jeonuchi`
- `alive-community-codex` ↔ `honggildong-order`, `wind-community`, `record-forgery-incident`, `side-honggildong-fall`, `ending-honggildong`
- `unnamed-society-codex` ↔ `side-unnamed-society`, `side-third-banner`, `side-ashes-ledger`, `side-yeonhwa`

세계관 항목에는 연결된 도감 ID를 역방향으로 기록해 어느 쪽에서 조회해도 관계가 드러나도록 한다.

## API·UI 동작

- `listKnowledge(mode, { full: true })`가 `relatedLoreIds` 또는 `relatedCodexIds`를 반환한다.
- 일반 요약 목록은 기존 응답 크기와 계약을 유지한다.
- 전체 콘텐츠 카드에 관련 항목 이름을 표시한다.
- 관련 항목 클릭 시 같은 전체 콘텐츠 목록에서 해당 항목으로 스크롤하고 강조한다.
- 참조 대상이 없는 항목은 기존처럼 답변과 키워드만 표시한다.

## 검증

1. 모든 참조 ID가 실제 항목을 가리키는지 검사한다.
2. 인물·세력의 양방향 참조가 일치하는지 검사한다.
3. 전체 `npm test`를 실행한다.

