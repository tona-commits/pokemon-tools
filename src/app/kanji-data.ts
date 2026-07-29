export interface KanjiItem {
  kanji: string;
  readings: string[];
}

export interface KanjiResult {
  correct: boolean;
  answeredAt: string;
}

export type KanjiResultMap = Record<string, KanjiResult>;

export const SET_SIZE = 10;
export const STORAGE_KEY = 'kanji-grade4-results';

export function loadResults(): KanjiResultMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as KanjiResultMap) : {};
  } catch {
    return {};
  }
}

export function saveResults(results: KanjiResultMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

export function chunkIntoSets(items: KanjiItem[]): KanjiItem[][] {
  const sets: KanjiItem[][] = [];
  for (let i = 0; i < items.length; i += SET_SIZE) {
    sets.push(items.slice(i, i + SET_SIZE));
  }
  return sets;
}
