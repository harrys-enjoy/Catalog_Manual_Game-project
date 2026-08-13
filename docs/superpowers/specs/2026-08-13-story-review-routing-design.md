# 스토리 검토 라우팅 설계

## 목표

일반 World Lore Q&A와 RPG 스토리 검토를 분리한다. 사용자가 스토리 초안을 검토할 때는 관련 Lore/Codex 근거를 함께 LLM에 전달하고, 서사 품질 검토 결과를 구조화해 표시한다.

## 동작

- 일반 질문은 기존 `/api/ask` 흐름을 유지한다.
- 스토리 검토는 전용 입력 영역에서 `name`, `keywords`, `answer`, 관련 Lore/Codex ID를 구성해 `/api/story-review`로 보낸다.
- 검토 결과는 `verdict`, 연속성 충돌, 타임라인 문제, 캐릭터/세력 일관성, 누락 관계, 개선안을 표시한다.
- `pass` 결과만 승인 저장 흐름을 사용할 수 있다.
- LLM이 비활성화된 경우 Mock 결과는 자동 승인하지 않고 `review_required`로 표시한다.

## 검토 기준

스토리 검토 LLM은 세계관 사실성만 요약하지 않고 다음을 평가한다.

1. 사건 인과관계와 갈등 구조
2. 시간 순서와 기존 사건과의 충돌
3. 캐릭터 목표·동기·행동 일관성
4. 세력의 이해관계와 관계 변화
5. 기존 Lore/Codex와의 설정 충돌
6. 플레이어가 경험할 수 있는 서사적 갈등과 개선 방향

## 구현 범위

- `public/index.html`, `public/app.js`, `public/styles.css`: 검토 UI와 API 호출 추가
- `src/story-review.js`: 검토 프롬프트를 RPG 서사 검토 기준으로 명확화
- `test/`: UI/API 경로와 LLM 검토 입력을 회귀 테스트로 고정

일반 Q&A의 지식 직접 응답 정책은 변경하지 않는다.
