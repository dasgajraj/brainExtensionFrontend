/**
 * redux/authSlice.ts  — BACKWARD-COMPATIBILITY RE-EXPORT SHIM
 *
 * All existing screen components import from this path, so this file must
 * stay in place and export everything those screens need.
 *
 * The canonical implementation now lives in:
 *   store/auth/auth.slice.ts    ← slice + sync actions
 *   store/auth/auth.thunks.ts   ← async thunks
 *   store/auth/auth.types.ts    ← state types
 *   store/auth/auth.selectors.ts
 *
 * DO NOT add new logic here.  Add it to the store/auth/ files above.
 */

// ── Slice actions + reducer (default export) ──────────────────────────────────
export {
  setFlowStep,
  setTempIdentifier,
  clearError,
  resetAuthFlow,
  setTokens,
  signOut,
  setBackendReady,
  default,
} from '../store/auth/auth.slice';

// ── Async thunks ──────────────────────────────────────────────────────────────
export {
  bootstrapThunk,
  loginThunk,
  signUpThunk,
  logoutThunk,
  forgotPasswordThunk,  verifyRequestThunk,  verifyOtpThunk,
  resetPasswordThunk,
} from '../store/auth/auth.thunks';

// ── State types ────────────────────────────────────────────────────────────────
export type { AuthState, AuthFlowStep, AuthStatus } from '../store/auth/auth.types';

// ── Selectors ──────────────────────────────────────────────────────────────────
export {
  selectUser,
  selectAccessToken,
  selectRefreshToken,
  selectIsAuthenticated,
  selectAuthStatus,
  selectAuthError,
  selectIsAuthLoading,
  selectFlowStep,
  selectTempIdentifier,
  selectBackendReady,
  selectDisplayName,
} from '../store/auth/auth.selectors';
