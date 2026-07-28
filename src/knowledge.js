import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dataPath = fileURLToPath(new URL('../data/knowledge.json', import.meta.url));
const knowledge = JSON.parse(readFileSync(dataPath, 'utf8'));
const sourcesPath = fileURLToPath(new URL('../data/sources.json', import.meta.url));
const sourceById = new Map(JSON.parse(readFileSync(sourcesPath, 'utf8')).map((source) => [source.id, source]));

export function lookupKnowledge(mode, question) {
  const entries = knowledge[mode] ?? [];
  const item = entries.find((entry) => entry.keywords.some((keyword) => question.includes(keyword)));
  if (!item) return null;
  const sourceUrl = sourceById.get(item.sourceRef)?.sourceUrl;
  const sources = [`${mode}:${item.id}`];
  if (item.originalContent && mode === 'lore') sources.push('original:lore');
  if (sourceUrl) sources.push(sourceUrl);
  return { answer: item.answer, sources };
}
