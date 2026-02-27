/**
 * visionHistory.service.ts
 *
 * Two-tier storage for Brain Vision results:
 *  - HISTORY_KEY  (@vision_history)  — visible list, can be cleared by user
 *  - ARCHIVE_KEY  (@vision_archive)  — permanent record, never cleared
 *
 * Note: Images are NOT stored (too large). Only the AI explanation is saved.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@vision_history';
const ARCHIVE_KEY = '@vision_archive';
const MAX_VISIBLE = 50;

export interface VisionHistoryItem {
  id: string;
  workspaceId: string;
  explanation: string;
  analyzedAt: string; // ISO date string
}

// ── Writes ────────────────────────────────────────────────────────────────────

/** Save a new vision analysis result to both visible history and permanent archive. */
export async function addVisionResult(
  item: Omit<VisionHistoryItem, 'id'>,
): Promise<void> {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const full: VisionHistoryItem = { id, ...item };

  // Visible history — trimmed to MAX_VISIBLE
  const rawH = await AsyncStorage.getItem(HISTORY_KEY);
  const history: VisionHistoryItem[] = rawH ? JSON.parse(rawH) : [];
  await AsyncStorage.setItem(
    HISTORY_KEY,
    JSON.stringify([full, ...history].slice(0, MAX_VISIBLE)),
  );

  // Permanent archive — append-only, never removed
  const rawA = await AsyncStorage.getItem(ARCHIVE_KEY);
  const archive: VisionHistoryItem[] = rawA ? JSON.parse(rawA) : [];
  await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify([full, ...archive]));
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/** Load the visible (clearable) vision history. */
export async function getVisionHistory(): Promise<VisionHistoryItem[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

// ── Clear ─────────────────────────────────────────────────────────────────────

/**
 * Clear the visible history list only.
 * The permanent archive (@vision_archive) is left untouched.
 */
export async function clearVisionHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
