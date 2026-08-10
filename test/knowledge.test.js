import test from 'node:test';
import assert from 'node:assert/strict';
import { listKnowledge, lookupKnowledge, lookupKnowledgeBest, validateKnowledgeSources } from '../src/knowledge.js';

test('세계관 일반 질문은 전체 설정 요약을 반환한다', () => {
  const result = lookupKnowledge('lore', '세계관');
  assert.equal(result.sources[0], 'lore:overview');
  assert.match(result.answer, /유리별/);
});

test('구체적인 스토리 요청은 일반 세계관 요약보다 관련 설정을 우선한다', () => {
  const result = lookupKnowledge('lore', '유리별의 빛과 기억의 항로 스토리');
  assert.notEqual(result.sources[0], 'lore:overview');
});

test('출처가 있는 지식 항목은 CC0 출처를 참조해야 한다', () => {
  assert.throws(
    () => validateKnowledgeSources(
      { lore: [{ id: 'lore-1', sourceRef: 'non-cc0' }] },
      [{ id: 'non-cc0', license: 'CC-BY-4.0' }],
    ),
    /CC0/,
  );
});

test('존재하지 않는 출처 ID는 거부한다', () => {
  assert.throws(
    () => validateKnowledgeSources(
      { codex: [{ id: 'codex-1', sourceRef: 'missing-source' }] },
      [],
    ),
    /missing-source/,
  );
});

test('카탈로그의 키워드 하나만 포함해도 항목을 찾는다', () => {
  const result = lookupKnowledge('catalog', '마을 정보를 보여줘');
  assert.deepEqual(result.sources, ['catalog:ember-village']);
});

test('CC0 오픈 게임 소스 기반 도감 항목을 조회한다', () => {
  const result = lookupKnowledge('codex', '무료 게임 오브젝트에 어떤 것이 있나요?');
  assert.deepEqual(result.sources, [
    'codex:oga-free-game-objects',
    'https://opengameart.org/content/free-game-objects',
  ]);
});

test('독자 세계관의 세력과 사건을 직접 조회한다', () => {
  assert.equal(
    lookupKnowledge('lore', '항로 감시단은 어떤 세력인가요?').sources[0],
    'lore:route-watch',
  );
  assert.equal(
    lookupKnowledge('lore', '빛바랜 항로 사건을 알려줘').sources[0],
    'lore:faded-route-incident',
  );
});

test('독자 세계관 항목에는 original:lore 표식을 포함한다', () => {
  const result = lookupKnowledge('lore', '유리별은 어떻게 생겼나요?');
  assert.deepEqual(result.sources, [
    'lore:glass-star-origin',
    'original:lore',
    'https://opengameart.org/content/starfields',
  ]);
});

test('codex 질문은 모델 없이 도감 데이터를 반환한다', () => {
  const result = lookupKnowledge('codex', '루멘의 약점은 무엇인가?');
  assert.equal(result.answer, '루멘의 약점은 냉기 속성입니다.');
  assert.deepEqual(result.sources, ['codex:lumens']);
});

test('일반 질문은 공통 키워드보다 정확한 catalog·codex 항목명을 우선한다', () => {
  assert.equal(lookupKnowledgeBest('잿불 등불').sources[0], 'codex:ash-lantern');
  assert.equal(lookupKnowledgeBest('항로 나침반').sources[0], 'codex:route-compass');
  assert.equal(lookupKnowledgeBest('잿불 마을').sources[0], 'catalog:ember-village');
});

test('자료가 없는 질문은 null을 반환한다', () => {
  assert.equal(lookupKnowledge('catalog', '없는 아이템을 보여줘'), null);
});
test('항목명 사이의 공백과 문장부호가 달라도 등록 자료를 찾는다', () => {
  const result = lookupKnowledge('codex', '루 멘이라는 인물');
  assert.equal(result.answer, '루멘의 약점은 냉기 속성입니다.');
});
test('기획·아트 가이드는 등록된 기본 가이드 자료를 직접 반환한다', () => {
  const result = lookupKnowledge('dev-guide', '게임 루프를 설계하는 방법을 알려줘');
  assert.equal(result.sources[0], 'dev-guide:game-loop');
  assert.match(result.answer, /핵심 행동/);
});

test('전우치와 홍길동의 신념 항목을 각각 조회한다', () => {
  assert.equal(lookupKnowledge('lore', '\uC804\uC6B0\uCE58').sources[0], 'lore:jeonuchi-freedom');
  assert.equal(lookupKnowledge('lore', '\uD64D\uAE38\uB3D9').sources[0], 'lore:honggildong-order');
});

test('전우치와 홍길동의 공동 사건을 조회한다', () => {
  const result = lookupKnowledge('lore', '\uC2DC\uBBFC \uAE30\uB85D \uC870\uC791 \uC0AC\uAC74');
  assert.equal(result.sources[0], 'lore:record-forgery-incident');
});

test('신규 전우치·홍길동 lore 항목은 독자 창작 메타데이터를 가진다', () => {
  const ids = [
    'jeonuchi-freedom', 'honggildong-order', 'record-forgery-incident',
    'wind-community', 'glass-star-heart', 'choice-axis-freedom-order',
    'campaign-record-choice', 'campaign-wind-thief', 'campaign-glass-heart',
    'campaign-choice-war', 'campaign-no-good-evil', 'ending-jeonuchi',
    'ending-honggildong', 'ending-cooperation', 'ending-independent',
  ];
  const entries = listKnowledge('lore', { full: true }).filter((entry) => ids.includes(entry.id));
  assert.equal(entries.length, ids.length);
  assert.ok(entries.every((entry) => entry.originalContent === true));
  assert.ok(entries.every((entry) => entry.inspirationSources.length === 2));
  assert.ok(entries.every((entry) => entry.sourceRef === null));
});

test('재의 장부 번외편의 핵심 항목을 검색할 수 있다', () => {
  const ids = [
    'side-ashes-ledger',
    'side-unnamed-society',
    'side-yeonhwa',
    'side-jeonuchi-fall',
    'side-honggildong-fall',
    'side-third-banner',
  ];
  const entries = listKnowledge('lore', { full: true })
    .filter((entry) => ids.includes(entry.id));
  assert.equal(entries.length, ids.length);
  assert.ok(entries.every((entry) => entry.originalContent === true));
  assert.ok(entries.every((entry) => entry.sourceRef === null));
});

test('재의 장부 키워드로 무명회와 연화의 번외 내용을 조회한다', () => {
  const society = lookupKnowledge('lore', '무명회는 어떤 세력인가');
  const yeonhwa = lookupKnowledge('lore', '연화는 누구인가');
  assert.equal(society.sources[0], 'lore:side-unnamed-society');
  assert.equal(yeonhwa.sources[0], 'lore:side-yeonhwa');
});

test('인물·세력 도감과 세계관 항목이 양방향으로 연결된다', () => {
  const lore = listKnowledge('lore', { full: true });
  const codex = listKnowledge('codex', { full: true });
  const loreById = new Map(lore.map((entry) => [entry.id, entry]));
  const codexById = new Map(codex.map((entry) => [entry.id, entry]));
  const linkedCodexIds = [
    'jeonuchi-codex', 'honggildong-codex', 'yeonhwa-codex',
    'wind-band-codex', 'alive-community-codex', 'unnamed-society-codex',
  ];
  assert.ok(linkedCodexIds.every((id) => codexById.get(id).relatedLoreIds.length > 0));

  for (const entry of codex.filter((item) => item.relatedLoreIds?.length)) {
    for (const loreId of entry.relatedLoreIds) {
      assert.ok(loreById.has(loreId));
      assert.ok(loreById.get(loreId).relatedCodexIds.includes(entry.id));
    }
  }
  for (const entry of lore.filter((item) => item.relatedCodexIds?.length)) {
    for (const codexId of entry.relatedCodexIds) {
      assert.ok(codexById.has(codexId));
      assert.ok(codexById.get(codexId).relatedLoreIds.includes(entry.id));
    }
  }
});
