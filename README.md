# Q&A Agent (CAT)

게임의 세계관(Lore), 캐릭터·몬스터·아이템 도감(Codex), 게임 카탈로그와 개발 가이드를 조회하는 독립형 Q&A Agent입니다.

CAT은 게임 지식의 단일 조회 창구이며, A2A 연결과 새 RPG 스토리의 설정 검토·승인 저장을 담당합니다. Main Agent는 UI와 오케스트레이션을 담당합니다.

## 빠른 시작

요구 사항: Node.js 20 이상

### 로컬 실행

```powershell
Copy-Item .env.example .env
npm install
npm test
npm start
```

기본 주소는 `http://127.0.0.1:3000`이며 `PORT` 환경변수로 변경할 수 있습니다.

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
```

### Docker 실행

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
Invoke-RestMethod http://127.0.0.1:3000/health
docker compose down
```

### Main Agent와 함께 실행

```powershell
& "C:\Users\희정\Downloads\Nvidia project\Main Agent(docker)\run-local-stack.ps1"
```

| 서비스 | 주소 |
| --- | --- |
| Main API | `http://127.0.0.1:8000` |
| CAT | `http://127.0.0.1:3010` |
| Main UI | `http://127.0.0.1:5173` |

바탕화면의 `Main Agent UI` 바로가기도 같은 로컬 스택 실행 스크립트를 사용합니다.

## 환경변수

`.env.example`을 기준으로 `.env`를 작성합니다. `.env`와 서비스 키는 Git에 커밋하지 않습니다.

| 변수 | 용도 |
| --- | --- |
| `PORT` | CAT 수신 포트. 기본값 `3000` |
| `API_KEY` | Q&A·A2A·스토리 검토 API의 Bearer 인증 키 |
| `CORS_ORIGIN` | 허용할 브라우저 출처 |
| `MODEL_NAME` | OpenAI 호환 LLM 모델명 |
| `MODEL_BASE_URL` 또는 `QWEN_BASE_URL` | `/chat/completions`를 제공하는 모델 주소 |
| `MODEL_API_KEY` | LLM 서비스 인증 키 |
| `MODEL_TIMEOUT_MS` | LLM 호출 제한 시간. 기본값 `30000` |
| `AGENT_PUBLIC_URL` | Agent Card에 표시할 CAT 주소 |
| `LORE_AGENT_URL` | 선택적 원격 Lore Agent 주소 |

`MODEL_NAME`, 모델 Base URL, `MODEL_API_KEY`가 모두 설정되면 OpenAI 호환 LLM을 사용합니다. 세 값이 모두 없으면 Mock으로 실행되고, 일부만 설정하면 설정 오류가 발생합니다.

스토리 검토에서 Mock은 실제 검토를 통과시키지 않고 `review_required`를 반환합니다. 새 스토리를 검토·승인하려면 실제 LLM을 설정해야 합니다.

```env
MODEL_NAME=meta/llama-3.1-8b-instruct
QWEN_BASE_URL=https://integrate.api.nvidia.com/v1
MODEL_API_KEY=your-model-key
MODEL_TIMEOUT_MS=120000
```

## 데이터 구조

CAT은 별도 데이터베이스 대신 JSON 파일을 읽습니다.

```text
data/
├─ knowledge.json                  # 기본 catalog·codex·lore·dev-guide
├─ lore-locales.json               # Lore 번역
├─ story-locales.json              # 스토리 번역
├─ sources.json                    # 외부 출처·라이선스
└─ stories/
   ├─ side-story-ashes-ledger.json # 기존 번외 스토리
   └─ reviewed-stories.json        # 승인된 신규 스토리
```

`knowledge.json`의 영역은 `catalog`(지역·아이템·콘텐츠), `codex`(캐릭터·몬스터·용어·아이템), `lore`(역사·인물·세력·사건·지형), `dev-guide`(기획·아트·개발 가이드)입니다.

서버 시작 시 두 스토리 파일의 항목이 `lore`에 병합됩니다. 작성 규칙은 [`docs/knowledge-authoring.md`](docs/knowledge-authoring.md)를 따릅니다.

## 스토리 작성 및 검토 정책

RPG 스토리는 기존 설정과의 충돌을 확인한 뒤 반영합니다.

```text
스토리 초안 작성
  ↓
Main UI의 Game Q&A → + Add story
  ↓
CAT 스토리 검토 API
  ↓
LLM 검토: 인과관계·타임라인·인물·세력·Lore/Codex 충돌 확인
  ↓
검토 결과 확인
  ↓
사용자 승인
  ↓
data/stories/reviewed-stories.json 저장
```

검토 항목은 사건 인과관계, 타임라인, 캐릭터 목표와 행동, 세력 이해관계와 관계 변화, 기존 Lore·Codex 충돌, 누락 관계, 게임 플레이 확장안입니다.

검토 중인 초안은 서버 메모리에 약 30분간만 보관됩니다. 서버가 재시작되면 승인되지 않은 초안은 사라지고, 승인된 항목만 `reviewed-stories.json`에 기록됩니다.

이미 편집자가 확정한 초기 설정은 데이터 파일에 직접 포함될 수 있지만, 이후 추가되는 스토리는 반드시 검토 결과를 확인한 뒤 반영합니다.

## HTTP API

### 기본 Q&A

```http
POST /api/ask
Content-Type: application/json
```

```json
{
  "mode": "lore",
  "question": "여명산은 어떤 곳인가?",
  "locale": "ko",
  "context": { "projectId": "demo-game", "userId": "user-123" }
}
```

지원 모드: `dev-guide`, `catalog`, `codex`, `lore`.

### 지식·상태·출처

```http
GET /knowledge?mode=lore
GET /knowledge?mode=codex&full=true
GET /health
GET /metrics
GET /sources
GET /.well-known/agent-card.json
```

### 스토리 검토

Main UI는 아래 CAT API를 호출합니다.

```http
POST /api/story-review
Content-Type: application/json
```

```json
{
  "name": "빛과 기억의 항로 발견",
  "keywords": ["빛과 기억의 항로", "항로 발견"],
  "answer": "얼음 구름과 서리 늑대의 서식지를 지나 새로운 항로를 발견한다.",
  "relatedLoreIds": ["glass-star-origin", "dawn-mountain"],
  "relatedCodexIds": []
}
```

결과의 `verdict`는 `pass`, `review_required`, `reject` 중 하나이며, 인과관계·타임라인·인물·세력·누락 관계·개선안·근거 정보를 포함합니다. `pass` 결과만 승인할 수 있습니다.

```http
POST /api/story-approve
Content-Type: application/json
```

```json
{
  "reviewId": "review-abc123",
  "draft": {
    "name": "빛과 기억의 항로 발견",
    "keywords": ["빛과 기억의 항로", "항로 발견"],
    "answer": "얼음 구름과 서리 늑대의 서식지를 지나 새로운 항로를 발견한다.",
    "relatedLoreIds": ["glass-star-origin", "dawn-mountain"],
    "relatedCodexIds": []
  }
}
```

승인 결과는 `data/stories/reviewed-stories.json`에 기록되며 실행 중인 CAT의 Lore 검색에도 즉시 반영됩니다.

### A2A HTTP+JSON

```http
POST /message:send
Content-Type: application/a2a+json
```

빠른 텍스트 Q&A를 위한 최소 A2A HTTP+JSON 경로입니다. Agent Card는 `GET /.well-known/agent-card.json`에서 제공합니다.

현재 제공 범위는 동기 텍스트 메시지, `application/a2a+json`, Bearer 인증, Agent Card입니다. Streaming, Task 조회·취소, Push Notification, 파일 파트는 아직 제공하지 않습니다. 일반 업무 오케스트레이터 연동에는 `POST /a2a`도 사용할 수 있습니다.

전체 HTTP 계약은 [`docs/api/openapi.yaml`](docs/api/openapi.yaml), 외부 연결 절차는 [`docs/integration/productivity-a2a.md`](docs/integration/productivity-a2a.md)를 참고합니다.

## Q&A 동작 원칙

- 구조화된 `catalog`·`codex`·`lore` 항목은 가능한 경우 LLM보다 로컬 근거를 먼저 사용합니다.
- 구체적인 항로·인물·사건 키워드는 일반 세계관 요약보다 우선 검색됩니다.
- 근거 없는 내용은 사실처럼 저장하지 않습니다.
- LLM은 설정 근거를 벗어난 내용을 추측하지 않도록 제한합니다.
- 외부 LLM 호출 오류는 `MODEL_UNAVAILABLE`로 반환합니다.
- API 키와 모델 키는 소스 코드, Agent Card, 로그, 브라우저에 넣지 않습니다.
- 동일한 프로젝트·사용자·모드·질문은 기본 60초 동안 인메모리 캐시에서 재사용됩니다.

## 테스트

```powershell
npm test
```

테스트는 Q&A 라우팅, Lore·Codex·Catalog 조회, 출처 검증, A2A, Agent Card, LLM·Mock 동작, 스토리 검토와 승인 저장을 확인합니다.

## 관련 문서

- [`docs/knowledge-authoring.md`](docs/knowledge-authoring.md): 지식 데이터 작성 규칙
- [`docs/api/openapi.yaml`](docs/api/openapi.yaml): HTTP API 계약
- [`docs/integration/productivity-a2a.md`](docs/integration/productivity-a2a.md): 외부 서비스 연결
- [`data/stories/reviewed-stories.json`](data/stories/reviewed-stories.json): 승인된 신규 스토리
