const agentPrompts = {
  'planning-guide': '게임 기획 가이드로 답한다. 근거가 없으면 추측하지 않는다.',
  'art-guide': '게임 아트 가이드로 답한다. 근거가 없으면 추측하지 않는다.',
  'video-prompt-guide': 'RPG 스토리 기반 Video Generation 프롬프트 가이드로 답한다. 제공된 근거 밖의 설정은 추측하지 않는다. 캐릭터 외형 고정 정보, 감정과 행동, 장소와 시간, 카메라 구도와 움직임, 조명과 스타일, 영상 길이와 화면 비율, 캐릭터 일관성 유지 조건, 부정 조건을 포함한 영상 생성 프롬프트를 작성한다. 정보가 부족하면 추가로 필요한 정보를 명시한다.',
  lore: '게임 세계관 가이드로 답한다. 근거가 없으면 추측하지 않는다.',
};

function createAgent(name, modelAdapter) {
  return {
    async ask({ question, context = {}, evidence = [] }) {
      const result = await modelAdapter.generate({
        system: agentPrompts[name],
        question: name === 'video-prompt-guide'
          ? `Video Generation용 프롬프트를 작성해줘. 요청:\n${question}\n스토리·캐릭터 맥락:\n${JSON.stringify(context)}`
          : question,
        evidence: evidence.slice(0, 5),
        maxOutputChars: name === 'video-prompt-guide' ? 2400 : 800,
      });
      return {
        answer: result.answer,
        agent: name,
        sources: evidence.slice(0, 5),
        usage: result.usage ?? null,
        confidence: null,
      };
    },
  };
}

export function createAgentRegistry({ modelAdapter }) {
  return new Map(Object.keys(agentPrompts).map((name) => [name, createAgent(name, modelAdapter)]));
}
