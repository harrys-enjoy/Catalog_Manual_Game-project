# 아키텍처 구성도

이 폴더에는 다음 3개의 구성도가 있습니다.

1. `main-architecture`: 현재 코드 기준의 Main API 서버 구조
2. `cat-architecture`: `mode=catalog` 요청의 Cat/Catalog 처리 흐름
3. `main-connected-services`: Main이 Cat, Video, Development, WorkMate를 연결하는 확장 구조

각 구성도는 `.mmd`를 원본으로 사용하며, 같은 내용을 `.svg`로 제공했습니다.

## 해석 기준

- `Main`은 현재 `src/server.js`와 `src/orchestrator.js`를 기준으로 정의했습니다.
- `Cat`은 현재 구현된 `catalog` 모드와 `data/knowledge.json` 기반 조회 흐름으로 정의했습니다.
- `Video`, `Development`, `WorkMate`는 현재 코드에서 독립 모듈로 확인되지 않아, 통합 구성도에서는 향후 연결 대상 서비스로 표현했습니다.
- 실제 연결 시에는 공통 요청 계약(`requestId`, `mode`, `context`, `evidence`)을 유지하는 방향으로 확장하는 것을 전제로 했습니다.
