/**
 * services/dreamSeen.service.ts
 *
 * Tracks which Brain Dreams the user has already viewed.
 * Persisted in AsyncStorage so "seen" state survives app restarts.
 * Used by the HomeScreen stories row to sort unseen first and
 * show a highlight border on unseen dreams.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_KEY = '@dream_seen_ids';

/**
 * Get the set of dream IDs the user has already viewed.
 */
export async function getSeenDreamIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

/**
 * Mark a single dream as seen.
 */
export async function markDreamAsSeen(dreamId: string): Promise<void> {
  try {
    const seen = await getSeenDreamIds();
    seen.add(dreamId);
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // silent — non-critical
  }
}

/**
 * Mark all given dream IDs as seen.
 */
export async function markAllDreamsAsSeen(dreamIds: string[]): Promise<void> {
  try {
    const seen = await getSeenDreamIds();
    dreamIds.forEach(id => seen.add(id));
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // silent
  }
}
