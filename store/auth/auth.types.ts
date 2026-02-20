/**
 * store/auth/auth.types.ts
 *
 * TypeScript interfaces for the Redux auth state.
 * Imported by the slice and by external selectors.
 */

import type { User } from '../../types/user.types';

// ─────────────────────────────────────────────────────────────────────────────
// Status enum
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lifecycle states for auth operations.
 *
 * - idle          → no operation in flight
 * - loading       → async operation in progress (drives spinner/disabled state)
 * - success       → a non-login operation completed (e.g. OTP sent, password reset)
 * - authenticated → user is fully authenticated with a valid access token
 * - error         → the last operation failed
 */
export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'authenticated'
  | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// Flow step — drives screen routing inside AuthContainer
// ─────────────────────────────────────────────────────────────────────────────

export type AuthFlowStep =
  | 'login'
  | 'signup'
  | 'forgotPassword'
  | 'verify'
  | 'resetPassword';

/**
 * Distinguishes why the verify screen is shown:
 *  - 'email'          → post-signup email verification (real API)
 *  - 'forgotPassword' → password-reset OTP (stub until API is provided)
 */
export type VerifyPurpose = 'email' | 'forgotPassword';

// ─────────────────────────────────────────────────────────────────────────────
// Root state shape
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthState {
  // ── Session ────────────────────────────────────────────────────────────────
  /** Full user object from the backend */
  user: User | null;
  /**
   * Short-lived JWT; stored in Redux memory only (NOT persisted by redux-persist).
   * Refreshed automatically by the httpClient interceptor on 401.
   */
  accessToken: string | null;
  /**
   * Long-lived token; also persisted to AsyncStorage by token.service.ts.
   * Stored in Redux for convenience but AsyncStorage is the authoritative source.
   */
  refreshToken: string | null;
  /** True once the user has a valid authenticated session */
  isAuthenticated: boolean;
  /** Display name derived from user.name; kept for backward compatibility */
  displayName: string | null;

  // ── Async / UI ─────────────────────────────────────────────────────────────
  status: AuthStatus;
  /** Human-readable, UI-safe error message from the most recent failed operation */
  errorMessage: string | null;

  // ── Flow routing ───────────────────────────────────────────────────────────
  flowStep: AuthFlowStep;
  /** Email/phone carried between forgot-password → verify → reset steps */
  tempUserIdentifier: string;

  // ── Backend readiness ──────────────────────────────────────────────────────
  /**
   * Set to true once the /health check responds successfully.
   * Auth operations are blocked until this is true.
   */
  backendReady: boolean;

  // ── Verify screen context ──────────────────────────────────────────────────
  /**
   * Determines which API path the verify screen uses.
   * 'email'          → POST /auth/verify/confirm (real)
   * 'forgotPassword' → stub until reset-password API is provided
   */
  verifyPurpose: VerifyPurpose;

  // ── Password-reset deep-link token ──────────────────────────────────────────
  /**
   * Single-use reset token extracted from the deep link.
   * MUST remain in-memory only — never persisted to AsyncStorage.
   * Cleared after a successful password reset or on logout.
   */
  resetToken: string | null;

  /** Lifecycle of the reset-password sub-flow (separate from main `status`
   *  so the ForgotPasswordScreen and the ResetPasswordScreen can track
   *  their own loading/error states independently of each other). */
  resetStatus: 'idle' | 'loading' | 'success' | 'error';

  /** Human-readable UI-safe error for the reset-password sub-flow. */
  resetError: string | null;
}
