/**
 * store/auth/auth.selectors.ts
 *
 * Memoised selectors for the auth slice.
 *
 * Consumers should always use these rather than accessing state.auth.*
 * directly, so that internal state shape changes are isolated here.
 */

import type { RootState } from '../../redux/RootReducer';

// ─────────────────────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────────────────────

export const selectUser = (state: RootState) => state.auth.user;

export const selectAccessToken = (state: RootState) => state.auth.accessToken;

export const selectRefreshToken = (state: RootState) => state.auth.refreshToken;

export const selectIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;

export const selectDisplayName = (state: RootState) => state.auth.displayName;

// ─────────────────────────────────────────────────────────────────────────────
// Async / UI
// ─────────────────────────────────────────────────────────────────────────────

export const selectAuthStatus = (state: RootState) => state.auth.status;

export const selectAuthError = (state: RootState) => state.auth.errorMessage;

export const selectIsAuthLoading = (state: RootState) =>
  state.auth.status === 'loading';

// ─────────────────────────────────────────────────────────────────────────────
// Flow routing
// ─────────────────────────────────────────────────────────────────────────────

export const selectFlowStep = (state: RootState) => state.auth.flowStep;

export const selectTempIdentifier = (state: RootState) =>
  state.auth.tempUserIdentifier;

// ─────────────────────────────────────────────────────────────────────────────
// Backend readiness
// ─────────────────────────────────────────────────────────────────────────────

export const selectBackendReady = (state: RootState) => state.auth.backendReady;

// ─────────────────────────────────────────────────────────────────────────────
// Password reset (deep-link flow)
// ─────────────────────────────────────────────────────────────────────────────

/** In-memory only — never persisted. Drives the ResetPasswordScreen. */
export const selectResetToken = (state: RootState) => state.auth.resetToken;

export const selectResetStatus = (state: RootState) => state.auth.resetStatus;

export const selectResetError = (state: RootState) => state.auth.resetError;
