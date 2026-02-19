/**
 * store/auth/auth.thunks.ts
 *
 * All async Redux thunks for the authentication domain.
 *
 * Architecture rules enforced here:
 *  - No direct axios/fetch calls → delegate to authService
 *  - No token logic → handled by tokenService (via authService)
 *  - No UI concerns → errors are normalised strings dispatched into state
 *  - No hardcoded strings → all messages come from the API or constants below
 *
 * ─── API coverage ────────────────────────────────────────────────────────────
 * REAL API:  POST /auth/signup     → signUpThunk
 *            POST /auth/login      → loginThunk
 *            POST /auth/logout     → logoutThunk
 *            POST /auth/refresh    → bootstrapThunk (session restore)
 *            GET  /health          → bootstrapThunk (backend wake-up)
 *
 * STUB:      forgotPasswordThunk / verifyOtpThunk / resetPasswordThunk
 *            (No API endpoint provided; marked for future integration)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/auth.service';
import { checkHealth } from '../../api/health.api';
import type { AuthResult, RefreshResult } from '../../services/auth.service';
import type { NormalisedError } from '../../types/api.types';

// ─────────────────────────────────────────────────────────────────────────────
// Error helper — extracts the message string from a NormalisedError or unknown
// ─────────────────────────────────────────────────────────────────────────────

function extractMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as NormalisedError).message === 'string'
  ) {
    return (error as NormalisedError).message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// bootstrapThunk
// Runs on every app startup:
//   1. Wakes the backend via GET /health (mandatory — server sleeps after 15 min)
//   2. Attempts to restore an existing session via POST /auth/refresh
// Returns the restored RefreshResult or null (indicating no active session).
// ─────────────────────────────────────────────────────────────────────────────

const MAX_HEALTH_RETRIES = 3;
const HEALTH_RETRY_DELAY_MS = 3_000;

async function retryHealthCheck(attempt = 0): Promise<void> {
  try {
    await checkHealth();
  } catch (error) {
    if (attempt < MAX_HEALTH_RETRIES - 1) {
      await new Promise<void>(resolve =>
        setTimeout(resolve, HEALTH_RETRY_DELAY_MS),
      );
      return retryHealthCheck(attempt + 1);
    }
    throw error;
  }
}

export const bootstrapThunk = createAsyncThunk<RefreshResult | null, void>(
  'auth/bootstrap',
  async (_, { rejectWithValue }) => {
    try {
      // Step 1: Ensure the backend is awake (mandatory per spec)
      await retryHealthCheck();

      // Step 2: Attempt to restore an existing session
      const restored = await authService.restoreSession();
      return restored; // null = no session, the slice handles the transitions
    } catch (error) {
      return rejectWithValue(
        extractMessage(
          error,
          'Could not reach the server. Please check your connection.',
        ),
      );
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// loginThunk
// POST /auth/login — real API integration
// ─────────────────────────────────────────────────────────────────────────────

export interface LoginThunkPayload {
  email: string;
  password: string;
}

export const loginThunk = createAsyncThunk<AuthResult, LoginThunkPayload>(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    try {
      return await authService.login(payload);
    } catch (error) {
      return rejectWithValue(
        extractMessage(error, 'Login failed. Please try again.'),
      );
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// signUpThunk
// POST /auth/signup — real API integration
// ─────────────────────────────────────────────────────────────────────────────

export interface SignUpThunkPayload {
  name: string;
  email: string;
  password: string;
}

export const signUpThunk = createAsyncThunk<AuthResult, SignUpThunkPayload>(
  'auth/signUp',
  async (payload, { rejectWithValue }) => {
    try {
      return await authService.signUp(payload);
    } catch (error) {
      return rejectWithValue(
        extractMessage(error, 'Sign up failed. Please try again.'),
      );
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// logoutThunk
// POST /auth/logout — real API integration
// ─────────────────────────────────────────────────────────────────────────────

export const logoutThunk = createAsyncThunk<void, void>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (error) {
      // Logout errors are non-fatal; local cleanup happens in the slice
      return rejectWithValue(
        extractMessage(error, 'Logout encountered an issue.'),
      );
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// forgotPasswordThunk
// ⚠️  STUB — no API endpoint provided.
//     Replace the body of the try{} block when the backend is ready.
// ─────────────────────────────────────────────────────────────────────────────

export interface ForgotPasswordThunkPayload {
  email: string;
}

const FORGOT_PASSWORD_STUB_DELAY_MS = 1_200;

export const forgotPasswordThunk = createAsyncThunk<
  void,
  ForgotPasswordThunkPayload
>(
  'auth/forgotPassword',
  async (payload, { rejectWithValue }) => {
    try {
      // ── STUB — replace with: await authService.forgotPassword(payload) ──
      await new Promise<void>(resolve =>
        setTimeout(resolve, FORGOT_PASSWORD_STUB_DELAY_MS),
      );
      if (payload.email.endsWith('@notfound.com')) {
        return rejectWithValue('No account found with that email.');
      }
      // ── END STUB ──────────────────────────────────────────────────────────
    } catch (error) {
      return rejectWithValue(
        extractMessage(error, 'Could not send reset code. Try again.'),
      );
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// verifyRequestThunk
// POST /auth/verify/request — real API
// Sends a 6-digit OTP to the user's email. Requires Bearer token.
// Called automatically after signup and on "Resend" in the verify screen.
// ─────────────────────────────────────────────────────────────────────────────

export const verifyRequestThunk = createAsyncThunk<void, void>(
  'auth/verifyRequest',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState() as {
        auth: { user: { email: string } | null; tempUserIdentifier: string };
      };
      const email = auth.user?.email ?? auth.tempUserIdentifier;
      if (!email) {
        return rejectWithValue('No email address found. Please sign in again.');
      }
      await authService.requestEmailVerification(email);
    } catch (error) {
      return rejectWithValue(
        extractMessage(error, 'Could not send verification code. Please try again.'),
      );
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// verifyOtpThunk
// POST /auth/verify/confirm  — real API (email verification)
// ⚠️ forgotPassword purpose stays a stub until reset-password API is provided
// ─────────────────────────────────────────────────────────────────────────────

export interface VerifyOtpThunkPayload {
  identifier: string;
  otp: string;
}

const VERIFY_OTP_STUB_DELAY_MS = 900;
const MOCK_VALID_OTP = '123456';

export const verifyOtpThunk = createAsyncThunk<void, VerifyOtpThunkPayload>(
  'auth/verifyOtp',
  async (payload, { getState, rejectWithValue }) => {
    const { auth } = getState() as { auth: { verifyPurpose: string } };
    try {
      if (auth.verifyPurpose === 'email') {
        // Real API: POST /auth/verify/confirm
        await authService.confirmEmailVerification(payload.otp);
      } else {
        // ⚠️ STUB (forgotPassword) — no reset-password OTP API provided yet
        await new Promise<void>(resolve =>
          setTimeout(resolve, VERIFY_OTP_STUB_DELAY_MS),
        );
        if (payload.otp !== MOCK_VALID_OTP) {
          return rejectWithValue('Invalid or expired code. Please try again.');
        }
      }
    } catch (error) {
      return rejectWithValue(
        extractMessage(error, 'Verification failed. Try again.'),
      );
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// resetPasswordThunk
// ⚠️  STUB — no API endpoint provided.
// ─────────────────────────────────────────────────────────────────────────────

export interface ResetPasswordThunkPayload {
  identifier: string;
  otp: string;
  newPassword: string;
}

const RESET_PASSWORD_STUB_DELAY_MS = 1_200;

export const resetPasswordThunk = createAsyncThunk<
  void,
  ResetPasswordThunkPayload
>(
  'auth/resetPassword',
  async (payload, { rejectWithValue }) => {
    try {
      // ── STUB — replace with: await authService.resetPassword(payload) ──
      await new Promise<void>(resolve =>
        setTimeout(resolve, RESET_PASSWORD_STUB_DELAY_MS),
      );
      if (payload.newPassword.length < 8) {
        return rejectWithValue('Password must be at least 8 characters.');
      }
      if (payload.otp !== MOCK_VALID_OTP) {
        return rejectWithValue('Session expired. Please restart the flow.');
      }
      // ── END STUB ──────────────────────────────────────────────────────────
    } catch (error) {
      return rejectWithValue(
        extractMessage(error, 'Password reset failed. Try again.'),
      );
    }
  },
);
