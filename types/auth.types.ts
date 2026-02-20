/**
 * types/auth.types.ts
 *
 * Request + response contracts for all authentication endpoints.
 *
 * Endpoint map:
 *   POST /auth/signup   → SignUpRequest / AuthSuccessData
 *   POST /auth/login    → LoginRequest  / AuthSuccessData
 *   POST /auth/refresh  → RefreshRequest / RefreshSuccessData
 *   POST /auth/logout   → LogoutRequest / (no data payload)
 */

import type { User } from './user.types';
import type { ApiResponse } from './api.types';

// ─────────────────────────────────────────────────────────────────────────────
// Requests
// ─────────────────────────────────────────────────────────────────────────────

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Actual backend response shapes
// The backend returns FLAT objects — tokens are at the root, not nested
// under a `data` field.  e.g.  { status, accessToken, refreshToken, user }
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flat response returned by POST /auth/signup and POST /auth/login.
 * accessToken / refreshToken / user are at the root level.
 */
export interface AuthApiResponse {
  status: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

/**
 * Flat response returned by POST /auth/refresh.
 * refreshToken is optional — the server may reuse the existing one.
 */
export interface RefreshApiResponse {
  status: string;
  accessToken: string;
  refreshToken?: string;
}

// Keep these for any code still referencing the old names
export type AuthSuccessData = AuthApiResponse;
export type RefreshSuccessData = RefreshApiResponse;

// ─────────────────────────────────────────────────────────────────────────────
// Typed API response aliases (used in the API layer)
// ─────────────────────────────────────────────────────────────────────────────

export type SignUpResponse = AuthApiResponse;
export type LoginResponse = AuthApiResponse;
export type RefreshResponse = RefreshApiResponse;
export type LogoutResponse = ApiResponse<undefined>;

// ─────────────────────────────────────────────────────────────────────────────
// Forgot-password flow  (POST /auth/forgot-password)
// ─────────────────────────────────────────────────────────────────────────────

export interface ForgotPasswordRequest {
  email: string;
}

/** Backend always returns the same shape regardless of whether email exists.
 *  Never reveal existence — always display a generic success message in UI. */
export interface ForgotPasswordResponse {
  status: string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset-password flow  (PATCH /auth/reset-password/:token)
// ─────────────────────────────────────────────────────────────────────────────

export interface ResetPasswordRequest {
  /** New password chosen by the user */
  password: string;
}

export interface ResetPasswordResponse {
  status: string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deep link parameters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parameters extracted from the deep link:
 *   brainextension://auth/reset-password/:token
 *
 * `token` is a single-use backend-generated reset token.  MUST be kept only
 * in memory (Redux: resetToken) and MUST NOT be persisted to AsyncStorage.
 */
export interface DeepLinkParams {
  token: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email verification  (POST /auth/verify/request · POST /auth/verify/confirm)
// ─────────────────────────────────────────────────────────────────────────────

export interface VerifyRequestPayload {
  email: string;
}

export interface VerifyConfirmPayload {
  /** The 6-digit code sent to the user's email */
  token: string;
}

/** Both verify endpoints return the same flat shape */
export interface VerifyApiResponse {
  status: string;
  message: string;
}
