const modeLabels = {
  'dev-guide': '기획·아트 가이드',
  catalog: '게임 카탈로그',
  codex: '게임 도감',
  lore: '세계관 Q&A',
};

const elements = {
  health: document.querySelector('#health-status'),
  mode: document.querySelector('#mode'),
  locale: document.querySelector('#locale'),
  modeHint: document.querySelector('#mode-hint'),
  apiKey: document.querySelector('#api-key'),
  question: document.querySelector('#question'),
  suggestions: document.querySelector('#suggestions'),
  toggleContent: document.querySelector('#toggle-content'),
  fullContent: document.querySelector('#full-content'),
  contentMeta: document.querySelector('#content-meta'),
  contentList: document.querySelector('#content-list'),
  send: document.querySelector('#send'),
  error: document.querySelector('#error'),
  responseTitle: document.querySelector('#response-title'),
  responseMeta: document.querySelector('#response-meta'),
  answer: document.querySelector('#answer'),
  details: document.querySelector('#details'),
  agent: document.querySelector('#agent'),
  confidence: document.querySelector('#confidence'),
  sources: document.querySelector('#sources'),
  storyName: document.querySelector('#story-name'),
  storyKeywords: document.querySelector('#story-keywords'),
  storyAnswer: document.querySelector('#story-answer'),
  storyLoreIds: document.querySelector('#story-lore-ids'),
  storyCodexIds: document.querySelector('#story-codex-ids'),
  reviewStory: document.querySelector('#review-story'),
  storyReviewResult: document.querySelector('#story-review-result'),
  storyReviewPanel: document.querySelector('#story-review-panel'),
};

let pendingContentFocus = null;

function showError(message) {
  elements.error.textContent = message;
  elements.error.hidden = false;
}

function clearError() {
  elements.error.hidden = true;
  elements.error.textContent = '';
}

function setHealth(online, message) {
  elements.health.textContent = message;
  elements.health.className = `status ${online ? 'status-ok' : 'status-error'}`;
}

async function checkHealth() {
  try {
    const response = await fetch('/health');
    if (!response.ok) throw new Error('health request failed');
    setHealth(true, 'API 정상');
  } catch {
    setHealth(false, 'API 연결 실패');
    showError('API 서버에 연결할 수 없습니다. VS Code 터미널에서 npm start가 실행 중인지 확인하세요.');
  }
}

async function loadSuggestions() {
  elements.suggestions.textContent = '';
  try {
    const response = await fetch(`/knowledge?mode=${encodeURIComponent(elements.mode.value)}&locale=${encodeURIComponent(elements.locale.value)}`);
    if (!response.ok) return;
    const body = await response.json();
    for (const entry of body.entries ?? []) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'suggestion';
      button.textContent = `${entry.name}에 대해 알려줘`;
      button.addEventListener('click', () => {
        elements.question.value = `${entry.name}에 대해 알려줘`;
        elements.question.focus();
      });
      elements.suggestions.append(button);
    }
  } catch {
    // Suggestions are optional; the question form remains usable if this request fails.
  }
}

function relatedModeFor(mode) {
  if (mode === 'lore') return 'codex';
  if (mode === 'codex') return 'lore';
  return null;
}

function focusContentCard(id) {
  const card = document.querySelector(`[data-content-id="${id}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('content-card-highlight');
  window.setTimeout(() => card.classList.remove('content-card-highlight'), 1600);
}

async function loadFullContent() {
  elements.contentList.textContent = '콘텐츠를 불러오는 중입니다.';
  try {
    const mode = elements.mode.value;
    const locale = elements.locale.value;
    const relatedMode = relatedModeFor(mode);
    const urls = [
      `/knowledge?mode=${encodeURIComponent(mode)}&locale=${encodeURIComponent(locale)}&full=true`,
      relatedMode
        ? `/knowledge?mode=${encodeURIComponent(relatedMode)}&locale=${encodeURIComponent(locale)}&full=true`
        : null,
    ].filter(Boolean);
    const responses = await Promise.all(urls.map((url) => fetch(url)));
    if (responses.some((response) => !response.ok)) throw new Error('content request failed');
    const bodies = await Promise.all(responses.map((response) => response.json()));
    const body = bodies[0];
    const relatedById = new Map((bodies[1]?.entries ?? []).map((entry) => [entry.id, entry]));
    elements.contentMeta.textContent = `${body.entries.length}개 항목`;
    elements.contentList.textContent = '';
    for (const entry of body.entries) {
      const card = document.createElement('article');
      card.className = 'content-card';
      card.dataset.contentId = entry.id;
      const title = document.createElement('h3');
      title.textContent = entry.name;
      const answer = document.createElement('p');
      answer.textContent = entry.answer;
      const keywords = document.createElement('small');
      keywords.textContent = `키워드: ${(entry.keywords ?? []).join(', ')}`;
      card.append(title, answer, keywords);
      const relatedIds = mode === 'lore' ? entry.relatedCodexIds : entry.relatedLoreIds;
      const relatedEntries = (relatedIds ?? []).map((id) => relatedById.get(id)).filter(Boolean);
      if (relatedEntries.length > 0) {
        const related = document.createElement('div');
        related.className = 'related-content';
        const relatedTitle = document.createElement('strong');
        relatedTitle.textContent = mode === 'lore' ? '관련 도감' : '관련 세계관';
        related.append(relatedTitle);
        for (const relatedEntry of relatedEntries) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'related-content-link';
          button.textContent = relatedEntry.name;
          button.addEventListener('click', () => {
            pendingContentFocus = { mode: relatedMode, id: relatedEntry.id };
            elements.mode.value = relatedMode;
            elements.modeHint.textContent = modeLabels[relatedMode];
            loadSuggestions();
            loadFullContent();
          });
          related.append(button);
        }
        card.append(related);
      }
      elements.contentList.append(card);
    }
    if (pendingContentFocus?.mode === mode) {
      const focusId = pendingContentFocus.id;
      pendingContentFocus = null;
      window.setTimeout(() => focusContentCard(focusId), 0);
    }
  } catch {
    elements.contentList.textContent = '콘텐츠를 불러오지 못했습니다.';
  }
}

function formatConfidence(value) {
  if (typeof value !== 'number') return '-';
  return `${Math.round(value * 100)}%`;
}

function renderResponse(result) {
  elements.responseTitle.textContent = '응답 완료';
  elements.responseMeta.textContent = new Date().toLocaleTimeString('ko-KR');
  elements.answer.textContent = result.answer || '응답 내용이 없습니다.';
  elements.answer.classList.remove('empty');
  elements.details.hidden = false;
  elements.agent.textContent = result.agent || '-';
  elements.confidence.textContent = formatConfidence(result.confidence);
  elements.sources.textContent = Array.isArray(result.sources) ? `${result.sources.length}개` : '-';
}

function explainError(response, body) {
  if (response.status === 401) return '인증이 필요합니다. .env의 API_KEY를 비우거나, 설정된 키를 API 키 입력란에 넣으세요.';
  if (response.status === 400) return body?.error?.message || '질문 형식이 올바르지 않습니다.';
  if (response.status >= 500) return body?.error?.message || '서버 또는 모델 처리 중 오류가 발생했습니다. MODEL_API_KEY와 모델 연결 설정을 확인하세요.';
  return body?.error?.message || `요청에 실패했습니다. (HTTP ${response.status})`;
}

async function ask() {
  const question = elements.question.value.trim();
  if (!question) {
    showError('질문을 입력하세요.');
    elements.question.focus();
    return;
  }

  clearError();
  elements.send.disabled = true;
  elements.send.textContent = '응답 받는 중…';
  elements.responseTitle.textContent = '응답 생성 중';
  elements.responseMeta.textContent = '잠시만 기다려 주세요.';

  try {
    const headers = { 'content-type': 'application/json' };
    const apiKey = elements.apiKey.value.trim();
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers,
      body: JSON.stringify({ mode: elements.mode.value, locale: elements.locale.value, question }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(explainError(response, body));
    renderResponse(body);
  } catch (error) {
    elements.responseTitle.textContent = '응답 실패';
    elements.responseMeta.textContent = '요청을 완료하지 못했습니다.';
    showError(error.message || '네트워크 오류가 발생했습니다.');
  } finally {
    elements.send.disabled = false;
    elements.send.textContent = '질문 보내기';
  }
}

function splitIds(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function renderStoryReview(result) {
  const sections = [
    ['연속성 충돌', result.continuityConflicts],
    ['타임라인 문제', result.timelineIssues],
    ['캐릭터 일관성', result.characterConsistency],
    ['세력 일관성', result.factionConsistency],
    ['누락된 관계', result.missingRelationships],
    ['개선안', result.suggestions],
  ];
  elements.storyReviewResult.hidden = false;
  elements.storyReviewResult.textContent = '';
  const verdict = document.createElement('h3');
  verdict.textContent = `검토 결과: ${result.verdict}`;
  elements.storyReviewResult.append(verdict);
  for (const [title, items] of sections) {
    const section = document.createElement('section');
    const heading = document.createElement('strong');
    heading.textContent = title;
    section.append(heading);
    const list = document.createElement('ul');
    for (const item of items ?? []) {
      const entry = document.createElement('li');
      entry.textContent = item;
      list.append(entry);
    }
    if (!list.children.length) {
      const entry = document.createElement('li');
      entry.textContent = '문제 없음';
      list.append(entry);
    }
    section.append(list);
    elements.storyReviewResult.append(section);
  }
}

async function reviewStory() {
  const draft = {
    name: elements.storyName.value.trim(),
    keywords: splitIds(elements.storyKeywords.value),
    answer: elements.storyAnswer.value.trim(),
    relatedLoreIds: splitIds(elements.storyLoreIds.value),
    relatedCodexIds: splitIds(elements.storyCodexIds.value),
  };
  if (!draft.name || !draft.keywords.length || !draft.answer) {
    showError('스토리 이름, 키워드, 초안을 모두 입력하세요.');
    return;
  }

  if (question === '/?') {
    renderResponse({
      answer: '사용 가능한 명령\n\n• /art: 스토리·캐릭터 설정을 Video Generation용 영상 프롬프트로 변환합니다.\n• 스토리 검토: 아래 RPG Story Review 영역에서 초안을 입력하고 검토합니다.\n• 일반 질문: 현재 선택한 모드의 게임 자료를 조회합니다.',
      agent: 'help',
      sources: [],
    });
    elements.storyReviewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  if (/^(스토리\s*검토|스토리\s*검토해줘|스토리\s*리뷰)$/i.test(question)) {
    elements.storyReviewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    elements.storyName.focus();
    showError('스토리 초안과 키워드를 아래 스토리 검토 영역에 입력한 뒤 검토를 실행하세요.');
    return;
  }
  clearError();
  elements.reviewStory.disabled = true;
  elements.reviewStory.textContent = '검토 중...';
  try {
    const headers = { 'content-type': 'application/json' };
    const apiKey = elements.apiKey.value.trim();
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;
    const response = await fetch('/api/story-review', {
      method: 'POST',
      headers,
      body: JSON.stringify(draft),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(explainError(response, body));
    renderStoryReview(body);
  } catch (error) {
    showError(error.message || '스토리 검토에 실패했습니다.');
  } finally {
    elements.reviewStory.disabled = false;
    elements.reviewStory.textContent = '스토리 검토하기';
  }
}

elements.mode.addEventListener('change', () => {
  elements.modeHint.textContent = modeLabels[elements.mode.value];
  loadSuggestions();
  if (!elements.fullContent.hidden) loadFullContent();
});
elements.locale.addEventListener('change', () => {
  loadSuggestions();
  if (!elements.fullContent.hidden) loadFullContent();
});
elements.toggleContent.addEventListener('click', () => {
  elements.fullContent.hidden = !elements.fullContent.hidden;
  elements.toggleContent.textContent = elements.fullContent.hidden ? '전체 콘텐츠 보기' : '전체 콘텐츠 닫기';
  if (!elements.fullContent.hidden) loadFullContent();
});
elements.send.addEventListener('click', ask);
elements.reviewStory.addEventListener('click', reviewStory);
elements.question.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) ask();
});

checkHealth();
loadSuggestions();
