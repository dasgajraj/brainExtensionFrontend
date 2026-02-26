/**
 * services/brainHistory.service.ts
 *
 * Persists Brain Ask request history to AsyncStorage.
 * Stores the last MAX_ITEMS queries so the user can tap any
 * previous request in BrainResultScreen to load its result.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@brain_ask_history';
const MAX_ITEMS = 30;

export interface BrainHistoryItem {
  requestId: string;
  /** Truncated query preview (first 120 chars) */
  query: string;
  workspaceId: string;
  mode: string;
  targetLanguage: string;
  selectedLobe: string;
  confidence: number;
  /** ISO timestamp of when the question was asked */
  askedAt: string;
}

async function load(): Promise<BrainHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BrainHistoryItem[];
  } catch {
    return [];
  }
}

async function save(items: BrainHistoryItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // silent — history is non-critical
  }
}

/** Prepend a new item to history (newest first, max MAX_ITEMS). */
export async function addToHistory(item: BrainHistoryItem): Promise<void> {
  const existing = await load();
  // Deduplicate by requestId (re-asks overwrite)
  const filtered = existing.filter(i => i.requestId !== item.requestId);
  const updated = [item, ...filtered].slice(0, MAX_ITEMS);
  await save(updated);
}

/** Return all history items, newest first. */
export async function getHistory(): Promise<BrainHistoryItem[]> {
  return load();
}

/** Remove a single item by requestId. */
export async function removeFromHistory(requestId: string): Promise<BrainHistoryItem[]> {
  const existing = await load();
  const updated = existing.filter(i => i.requestId !== requestId);
  await save(updated);
  return updated;
}

/** Wipe everything. */
export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
