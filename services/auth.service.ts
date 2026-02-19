/**
 * services/auth.service.ts
 *
 * Business-logic layer for authentication operations.
 *
 * Responsibilities:
 *  - Orchestrate API calls (api/auth.api.ts) and token persistence
 *    (services/token.service.ts)
 *  - Transform raw API responses into Redux-compatible payloads
 *  - Centralise all auth-related side-effects (token save/clear)
 *
 * Rules:
 *  - No Redux imports (this layer is Redux-agnostic)
 *  - No UI imports
 *  - Throws NormalisedError on failures (already normalised by the API layer)
 */

import { apiSignUp, apiLogin, apiLogout, apiRefresh, apiVerifyRequest, apiVerifyConfirm } from '../api/auth.api';
import { tokenService } from './token.service';
import type { SignUpRequest, LoginRequest } from '../types/auth.types';
import type { User } from '../types/user.types';

// ─────────────────────────────────────────────────────────────────────────────
// Return types that thunks pass into Redux state
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// signUp
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registers a new user, persists the returned tokens, and returns the
 * auth payload for Redux.
 *
 * @throws NormalisedError from the API layer
 */
export async function signUp(payload: SignUpRequest): Promise<AuthResult> {
  // Backend returns a flat object: { status, accessToken, refreshToken, user }
  const response = await apiSignUp(payload);
  const { accessToken, refreshToken, user } = response;

  await tokenService.saveTokens(accessToken, refreshToken);

  return { user, accessToken, refreshToken };
}

// ─────────────────────────────────────────────────────────────────────────────
// login
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticates an existing user, persists the returned tokens, and returns
 * the auth payload for Redux.
 *
 * @throws NormalisedError from the API layer
 */
export async function login(payload: LoginRequest): Promise<AuthResult> {
  // Backend returns a flat object: { status, accessToken, refreshToken, user }
  const response = await apiLogin(payload);
  const { accessToken, refreshToken, user } = response;

  await tokenService.saveTokens(accessToken, refreshToken);

  return { user, accessToken, refreshToken };
}

// ─────────────────────────────────────────────────────────────────────────────
// logout
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invalidates the session on the server and clears all local tokens.
 * Best-effort: local tokens are always cleared even if the server call fails.
 */
export async function logout(): Promise<void> {
  const refreshToken = await tokenService.getRefreshToken();

  if (refreshToken) {
    try {
      await apiLogout({ refreshToken });
    } catch {
      // Swallow server errors — local cleanup must always succeed
      // The server will expire the token naturally
    }
  }

  await tokenService.clearTokens();
}

// ─────────────────────────────────────────────────────────────────────────────
// refreshSession
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exchanges a stored refresh token for a new access token.
 * Used during bootstrap to silently restore an existing session.
 *
 * NOTE: The user object is NOT returned here (the refresh endpoint only
 * issues new tokens).  Redux-persist restores the user from local storage.
 *
 * @throws NormalisedError when the refresh token is expired or invalid
 */
export async function refreshSession(storedRefreshToken: string): Promise<RefreshResult> {
  // Backend returns a flat object: { status, accessToken, refreshToken? }
  const response = await apiRefresh({ refreshToken: storedRefreshToken });

  const newAccessToken = response.accessToken;
  const newRefreshToken = response.refreshToken ?? storedRefreshToken;

  if (!newAccessToken) {
    throw new Error('Refresh response did not include a valid accessToken.');
  }

  await tokenService.saveTokens(newAccessToken, newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

// ─────────────────────────────────────────────────────────────────────────────
// restoreSession
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempts to restore an existing session from stored tokens.
 *
 * Hydrates the token cache, checks for a stored refresh token, and if found
 * calls `refreshSession` to obtain a fresh access token.
 *
 * Returns null if:
 *  - No refresh token is stored (first-time user or after logout)
 *  - The refresh token has expired or been revoked
 *
 * The caller (bootstrapThunk) should dispatch clearSession() on null return.
 */
export async function restoreSession(): Promise<RefreshResult | null> {
  await tokenService.hydrate();
  const hasSession = await tokenService.hasSession();
  if (!hasSession) return null;

  const storedRefreshToken = await tokenService.getRefreshToken();
  if (!storedRefreshToken) return null;

  try {
    return await refreshSession(storedRefreshToken);
  } catch {
    // Refresh failed — session is stale; clear tokens silently
    await tokenService.clearTokens();
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// requestEmailVerification / confirmEmailVerification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a 6-digit OTP to the user's registered email address.
 * Requires a valid access token (Bearer) — to be called right after signup.
 */
export async function requestEmailVerification(email: string): Promise<void> {
  await apiVerifyRequest({ email });
}

/**
 * Confirms the 6-digit OTP submitted by the user.
 * On success the backend marks emailVerified = true.
 */
export async function confirmEmailVerification(token: string): Promise<void> {
  await apiVerifyConfirm({ token });
}

export const authService = {
  signUp,
  login,
  logout,
  refreshSession,
  restoreSession,
  requestEmailVerification,
  confirmEmailVerification,
};
