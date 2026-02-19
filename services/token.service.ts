/**
 * services/token.service.ts
 *
 * Single source of truth for token persistence in the app.
 *
 * Design decisions:
 *  - Tokens are stored in AsyncStorage (persistent across app restarts)
 *  - An in-memory cache mirrors the stored values to avoid repeated async
 *    reads on every outgoing request (important for the axios interceptor)
 *  - accessToken is also stored in AsyncStorage so it survives a JS bundle
 *    reload in development; in production it can be limited to memory only
 *  - refreshToken is the long-lived credential and is always persisted
 *  - clearTokens() wipes both storage and the in-memory cache atomically
 *
 * NOTE: Components and thunks MUST NOT import this file directly.
 *       They interact with tokens exclusively through Redux state.
 *       Only httpClient and bootstrap.ts use this service.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = '@brain_ext:access_token';
const REFRESH_TOKEN_KEY = '@brain_ext:refresh_token';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory cache
// ─────────────────────────────────────────────────────────────────────────────

interface TokenCache {
  accessToken: string | null;
  refreshToken: string | null;
  /** True once the cache has been initialised from AsyncStorage */
  hydrated: boolean;
}

const cache: TokenCache = {
  accessToken: null,
  refreshToken: null,
  hydrated: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Hydration — called once during bootstrap before any API requests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads persisted tokens from AsyncStorage into the in-memory cache.
 * Must be called once before any authenticated API call.
 */
async function hydrate(): Promise<void> {
  if (cache.hydrated) return;

  try {
    const [accessToken, refreshToken] = await AsyncStorage.multiGet([
      ACCESS_TOKEN_KEY,
      REFRESH_TOKEN_KEY,
    ]);

    cache.accessToken = accessToken[1] ?? null;
    cache.refreshToken = refreshToken[1] ?? null;
    cache.hydrated = true;
  } catch {
    // If AsyncStorage is unavailable, proceed with empty cache
    cache.hydrated = true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persists a new token pair and updates the in-memory cache.
 * Called after a successful login, signup, or token refresh.
 */
async function saveTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  cache.accessToken = accessToken;
  cache.refreshToken = refreshToken;

  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, accessToken],
    [REFRESH_TOKEN_KEY, refreshToken],
  ]);
}

/**
 * Returns the current access token from the in-memory cache.
 * Triggers hydration if the cache has not yet been loaded.
 */
async function getAccessToken(): Promise<string | null> {
  if (!cache.hydrated) await hydrate();
  return cache.accessToken;
}

/**
 * Returns the current refresh token from the in-memory cache.
 * Triggers hydration if the cache has not yet been loaded.
 */
async function getRefreshToken(): Promise<string | null> {
  if (!cache.hydrated) await hydrate();
  return cache.refreshToken;
}

/**
 * Returns true if a refresh token is present (i.e. a session exists).
 * Used by bootstrap to decide whether to attempt session restoration.
 */
async function hasSession(): Promise<boolean> {
  const rt = await getRefreshToken();
  return rt !== null && rt.length > 0;
}

/**
 * Wipes all tokens from both AsyncStorage and the in-memory cache.
 * Called on logout and on auth failure.
 */
async function clearTokens(): Promise<void> {
  cache.accessToken = null;
  cache.refreshToken = null;

  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

// Export as a singleton namespace — matches the spec's "service" pattern
export const tokenService = {
  hydrate,
  saveTokens,
  getAccessToken,
  getRefreshToken,
  hasSession,
  clearTokens,
};
