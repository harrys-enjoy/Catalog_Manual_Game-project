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
};

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

async function loadFullContent() {
  elements.contentList.textContent = '콘텐츠를 불러오는 중입니다.';
  try {
    const response = await fetch(`/knowledge?mode=${encodeURIComponent(elements.mode.value)}&locale=${encodeURIComponent(elements.locale.value)}&full=true`);
    if (!response.ok) throw new Error('content request failed');
    const body = await response.json();
    elements.contentMeta.textContent = `${body.entries.length}개 항목`;
    elements.contentList.textContent = '';
    for (const entry of body.entries) {
      const card = document.createElement('article');
      card.className = 'content-card';
      const title = document.createElement('h3');
      title.textContent = entry.name;
      const answer = document.createElement('p');
      answer.textContent = entry.answer;
      const keywords = document.createElement('small');
      keywords.textContent = `키워드: ${(entry.keywords ?? []).join(', ')}`;
      card.append(title, answer, keywords);
      elements.contentList.append(card);
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
elements.question.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) ask();
});

checkHealth();
loadSuggestions();
