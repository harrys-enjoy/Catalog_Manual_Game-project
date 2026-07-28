# Game Q&A API

외부 업무생산성 서비스가 업무 중 게임 제작 정보를 요청할 수 있는 독립형 API입니다.

## 실행

요구 사항: Node.js 20 이상

```bash
npm test
npm start
```

기본 포트는 `3000`이며 `PORT` 환경변수로 변경할 수 있습니다.

## API

```http
POST /api/ask
Content-Type: application/json
```

```json
{
  "mode": "dev-guide",
  "question": "중세 판타지 마을의 색상 팔레트를 추천해줘",
  "context": {
    "projectId": "demo-game",
    "userId": "user-123",
    "workContext": "morning-briefing"
  }
}
```

지원 모드:

- `dev-guide`: 기획·아트 가이드 Q&A
- `catalog`: 게임 카탈로그
- `codex`: 캐릭터·몬스터·아이템 도감
- `lore`: 세계관 Q&A

예시:

```bash
curl -X POST http://127.0.0.1:3000/api/ask \
  -H "content-type: application/json" \
  -d '{"mode":"codex","question":"루멘의 약점은 무엇인가?","context":{"workContext":"in-progress"}}'
```

구조화 데이터로 답할 수 있는 `catalog`·`codex` 질문은 모델을 호출하지 않습니다. 자료가 없는 경우 `KNOWLEDGE_NOT_FOUND`를 반환합니다.

## LangChain 연결

기본 실행은 외부 패키지가 없는 Mock 모델을 사용합니다. LangChain을 사용할 때는 LangChain 모델의 `invoke(messages)`를 `LangChainModelAdapter`에 주입합니다.

```js
import { LangChainModelAdapter } from './src/langchain-adapter.js';
import { createDefaultOrchestrator, createServer } from './src/server.js';

const langChainModel = {
  async invoke(messages) {
    // 실제 LangChain ChatModel 또는 Runnable을 연결한다.
    return { content: `응답: ${messages[1].content}` };
  },
};

const server = createServer({
  orchestrator: createDefaultOrchestrator({
    modelAdapter: new LangChainModelAdapter({ model: langChainModel }),
  }),
});
server.listen(3000);
```

실제 LangChain provider 패키지와 모델 설정은 사용하는 제공자의 공식 문서를 따릅니다. Elice ML API의 엔드포인트·인증·요청 형식은 기술 명세가 확보된 뒤 별도 어댑터로 연결하며, 이 API의 외부 계약은 변경하지 않습니다.

## A2A 에이전트 연결

외부 에이전트는 `createHttpAgent()`로 내부 에이전트와 같은 `ask()` 계약으로 감쌀 수 있습니다.

```js
import { createHttpAgent } from './src/a2a.js';

const remoteLoreAgent = createHttpAgent({
  agentName: 'remote-lore',
  endpoint: process.env.LORE_AGENT_URL,
});
```

오케스트레이터의 `agents` 맵에서 같은 이름의 에이전트를 교체하면 됩니다. 요청은 `requestId`, `mode`, `question`, `context`, `evidence`를 포함하고, 응답은 `answer`, `agent`, `sources`, `usage`, `confidence`로 정규화됩니다. 외부 A2A 서버·레지스트리·재시도 큐는 현재 API가 소유하지 않습니다.

## 외부 연동 원칙

- 업무생산성 메인페이지와 아침 업무 브리핑 UI는 이 프로젝트가 만들지 않습니다.
- 외부 서비스는 `POST /api/ask`를 호출하고 `context.workContext`에 호출 맥락을 전달합니다.
- API 키는 클라이언트나 저장소에 넣지 않습니다.
- 모든 응답에는 추적용 `requestId`가 포함됩니다.
- 모델 제공자가 측정하지 않은 토큰 수는 임의로 표시하지 않습니다.
