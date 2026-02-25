import { createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/auth.service';
import { checkHealth } from '../../api/health.api';
import type { AuthResult, RefreshResult } from '../../services/auth.service';
import type { NormalisedError } from '../../types/api.types';

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
// POST /auth/forgot-password — real API
// No auth token — user is unauthenticated at this point.
// SECURITY: UI always shows a generic success message regardless of outcome.
// ─────────────────────────────────────────────────────────────────────────────

export interface ForgotPasswordThunkPayload {
  email: string;
}

export const forgotPasswordThunk = createAsyncThunk<
  void,
  ForgotPasswordThunkPayload
>(
  'auth/forgotPassword',
  async (payload, { rejectWithValue }) => {
    try {
      await authService.requestPasswordReset(payload.email);
    } catch (error) {
      return rejectWithValue(
        extractMessage(error, 'Could not send reset link. Please try again.'),
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
// POST /auth/verify/confirm  — real API
// Confirms the 6-digit OTP sent after signup.
// Forgot-password now uses deep links; this thunk is email-verification only.
// ─────────────────────────────────────────────────────────────────────────────

export interface VerifyOtpThunkPayload {
  identifier: string;
  otp: string;
}

export const verifyOtpThunk = createAsyncThunk<void, VerifyOtpThunkPayload>(
  'auth/verifyOtp',
  async (payload, { rejectWithValue }) => {
    try {
      await authService.confirmEmailVerification(payload.otp);
    } catch (error) {
      return rejectWithValue(
        extractMessage(error, 'Verification failed. Try again.'),
      );
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// resetPasswordThunk
// PATCH /auth/reset-password/:token — real API
// token is sourced from state.auth.resetToken (set by the deep link handler).
// x-brain-pin is attached by apiResetPassword in the API layer.
// ─────────────────────────────────────────────────────────────────────────────

export interface ResetPasswordThunkPayload {
  /** New password chosen by the user */
  newPassword: string;
}

export const resetPasswordThunk = createAsyncThunk<
  void,
  ResetPasswordThunkPayload
>(
  'auth/resetPassword',
  async (payload, { getState, rejectWithValue }) => {
    const { auth } = getState() as { auth: { resetToken: string | null } };

    if (!auth.resetToken) {
      return rejectWithValue(
        'Reset session expired. Please request a new reset link.',
      );
    }

    try {
      await authService.resetPassword(auth.resetToken, payload.newPassword);
    } catch (error) {
      return rejectWithValue(
        extractMessage(error, 'Password reset failed. Please try again.'),
      );
    }
  },
);
