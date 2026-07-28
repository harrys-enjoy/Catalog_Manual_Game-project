import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dataPath = fileURLToPath(new URL('../data/knowledge.json', import.meta.url));
const knowledge = JSON.parse(readFileSync(dataPath, 'utf8'));

export function lookupKnowledge(mode, question) {
  const entries = knowledge[mode] ?? [];
  const item = entries.find((entry) => entry.keywords.every((keyword) => question.includes(keyword)));
  return item ? { answer: item.answer, sources: [`${mode}:${item.id}`] } : null;
}
