import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizeLocale } from './locales.js';

const dataPath = fileURLToPath(new URL('../data/knowledge.json', import.meta.url));
const knowledge = JSON.parse(readFileSync(dataPath, 'utf8'));
const sourcesPath = fileURLToPath(new URL('../data/sources.json', import.meta.url));
const sourceData = JSON.parse(readFileSync(sourcesPath, 'utf8'));
const loreLocalesPath = fileURLToPath(new URL('../data/lore-locales.json', import.meta.url));
const loreLocales = JSON.parse(readFileSync(loreLocalesPath, 'utf8'));
const storyPath = fileURLToPath(new URL('../data/stories/side-story-ashes-ledger.json', import.meta.url));
const storyEntries = JSON.parse(readFileSync(storyPath, 'utf8'));
const storyLocalesPath = fileURLToPath(new URL('../data/story-locales.json', import.meta.url));
const storyLocales = JSON.parse(readFileSync(storyLocalesPath, 'utf8'));
const mergedKnowledge = {
  ...knowledge,
  lore: [...(knowledge.lore ?? []), ...storyEntries],
};

function localizedEntry(entry, locale = 'ko') {
  const selectedLocale = normalizeLocale(locale) || 'ko';
  const translation = selectedLocale === 'ko'
    ? null
    : storyLocales[entry.id]?.[selectedLocale] ?? loreLocales[entry.id]?.[selectedLocale];
  return {
    ...entry,
    name: translation?.name ?? entry.name,
    keywords: translation?.keywords ?? entry.keywords,
    answer: translation?.answer ?? entry.answer,
  };
}

export function validateKnowledgeSources(data, sources) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  for (const entries of Object.values(data)) {
    for (const entry of entries) {
      if (!entry.sourceRef) continue;
      const source = sourceById.get(entry.sourceRef);
      if (!source) throw new Error(`출처 ID를 찾을 수 없습니다: ${entry.sourceRef}`);
      if (source.license !== 'CC0') throw new Error(`출처는 CC0 라이선스여야 합니다: ${entry.sourceRef}`);
    }
  }
}

validateKnowledgeSources(mergedKnowledge, sourceData);
const sourceById = new Map(sourceData.map((source) => [source.id, source]));

export function listSources() {
  return sourceData.map(({ id, title, sourceUrl, license, licenseUrl, usage }) => ({
    id,
    title,
    sourceUrl,
    license,
    licenseUrl,
    usage,
  }));
}

export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function listKnowledge(mode, { full = false, locale = 'ko' } = {}) {
  return (mergedKnowledge[mode] ?? []).map((entry) => {
    const localized = localizedEntry(entry, locale);
    const summary = { id: entry.id, name: localized.name, keywords: [...localized.keywords] };
    if (!full) return summary;
    return {
      ...summary,
      answer: localized.answer,
      sourceRef: entry.sourceRef ?? null,
      originalContent: entry.originalContent ?? false,
      inspirationSources: entry.inspirationSources ?? [],
    };
  });
}

export function lookupKnowledge(mode, question, locale = 'ko') {
  const entries = mergedKnowledge[mode] ?? [];
  const normalizedQuestion = normalizeSearchText(question);
  const item = entries.find((entry) => {
    const localized = localizedEntry(entry, locale);
    return [localized.name, ...localized.keywords, entry.name, ...entry.keywords]
      .some((term) => normalizedQuestion.includes(normalizeSearchText(term)));
  });
  if (!item) return null;
  const localized = localizedEntry(item, locale);
  const sourceUrl = sourceById.get(item.sourceRef)?.sourceUrl;
  const sources = [`${mode}:${item.id}`];
  if (item.originalContent && mode === 'lore') sources.push('original:lore');
  if (sourceUrl) sources.push(sourceUrl);
  return { answer: localized.answer, sources };
}
