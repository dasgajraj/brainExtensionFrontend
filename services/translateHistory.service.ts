/**
 * translateHistory.service.ts
 *
 * Two-tier storage for Brain Translate results:
 *  - HISTORY_KEY  (@translate_history)  — visible list, can be cleared by user
 *  - ARCHIVE_KEY  (@translate_archive)  — permanent record, never cleared
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@translate_history';
const ARCHIVE_KEY = '@translate_archive';
const MAX_VISIBLE = 50;

export interface TranslateHistoryItem {
  id: string;
  sourceText: string;
  translation: string;
  targetLanguage: string;
  translatedAt: string; // ISO date string
}

// ── Writes ────────────────────────────────────────────────────────────────────

/** Save a new translation result to both visible history and permanent archive. */
export async function addTranslateResult(
  item: Omit<TranslateHistoryItem, 'id'>,
): Promise<void> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const full: TranslateHistoryItem = { id, ...item };

  // Visible history — trimmed to MAX_VISIBLE
  const rawH = await AsyncStorage.getItem(HISTORY_KEY);
  const history: TranslateHistoryItem[] = rawH ? JSON.parse(rawH) : [];
  await AsyncStorage.setItem(
    HISTORY_KEY,
    JSON.stringify([full, ...history].slice(0, MAX_VISIBLE)),
  );

  // Permanent archive — append-only, never removed
  const rawA = await AsyncStorage.getItem(ARCHIVE_KEY);
  const archive: TranslateHistoryItem[] = rawA ? JSON.parse(rawA) : [];
  await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify([full, ...archive]));
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/** Load the visible (clearable) translation history. */
export async function getTranslateHistory(): Promise<TranslateHistoryItem[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

// ── Clear ─────────────────────────────────────────────────────────────────────

/**
 * Clear the visible history list only.
 * The permanent archive (@translate_archive) is left untouched.
 */
export async function clearTranslateHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
