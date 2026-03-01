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

// One long attempt (120 s) is preferable for Render cold-starts.
// Keep one retry in case of a transient network hiccup.
const MAX_HEALTH_RETRIES = 2;
const HEALTH_RETRY_DELAY_MS = 5_000;

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
    console.log('🚀 [auth/bootstrap] starting — health check + session restore');
    try {
      // Step 1: Ensure the backend is awake (mandatory per spec)
      console.log('🏥 [auth/bootstrap] step 1: pinging /health...');
      await retryHealthCheck();
      console.log('✅ [auth/bootstrap] step 1: /health OK — server is awake');

      // Step 2: Attempt to restore an existing session
      console.log('🔍 [auth/bootstrap] step 2: restoring session via /auth/refresh...');
      const restored = await authService.restoreSession();
      console.log('ℹ️ [auth/bootstrap] step 2: session restore result =', restored ? '✅ session found' : '⚠️ no session');
      return restored; // null = no session, the slice handles the transitions
    } catch (error) {
      console.error('❌ [auth/bootstrap] failed', error);
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
    console.log('🔐 [auth/login] → POST /auth/login', { email: payload.email });
    try {
      const result = await authService.login(payload);
      console.log('✅ [auth/login] ← success', { userId: result.user?._id, email: result.user?.email });
      return result;
    } catch (error) {
      console.error('❌ [auth/login] ← failed', error);
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
    console.log('📝 [auth/signUp] → POST /auth/signup', { name: payload.name, email: payload.email });
    try {
      const result = await authService.signUp(payload);
      console.log('✅ [auth/signUp] ← success', { userId: result.user?._id });
      return result;
    } catch (error) {
      console.error('❌ [auth/signUp] ← failed', error);
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
    console.log('🚪 [auth/logout] → POST /auth/logout');
    try {
      await authService.logout();
      console.log('✅ [auth/logout] ← success — session cleared');
    } catch (error) {
      // Logout errors are non-fatal; local cleanup happens in the slice
      console.warn('⚠️ [auth/logout] ← error (non-fatal, local state still cleared)', error);
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
    console.log('🔑 [auth/forgotPassword] → POST /auth/forgot-password', { email: payload.email });
    try {
      await authService.requestPasswordReset(payload.email);
      console.log('✅ [auth/forgotPassword] ← success — reset email dispatched');
    } catch (error) {
      console.error('❌ [auth/forgotPassword] ← failed', error);
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
    const { auth } = getState() as {
      auth: { user: { email: string } | null; tempUserIdentifier: string };
    };
    const email = auth.user?.email ?? auth.tempUserIdentifier;
    console.log('📨 [auth/verifyRequest] → POST /auth/verify/request', { email });
    if (!email) {
      console.error('❌ [auth/verifyRequest] ← no email found in state');
      return rejectWithValue('No email address found. Please sign in again.');
    }
    try {
      await authService.requestEmailVerification(email);
      console.log('✅ [auth/verifyRequest] ← OTP sent to', email);
    } catch (error) {
      console.error('❌ [auth/verifyRequest] ← failed', error);
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
    console.log('🔢 [auth/verifyOtp] → POST /auth/verify/confirm', { identifier: payload.identifier, otp: '**masked**' });
    try {
      await authService.confirmEmailVerification(payload.otp);
      console.log('✅ [auth/verifyOtp] ← email verified successfully');
    } catch (error) {
      console.error('❌ [auth/verifyOtp] ← failed (wrong or expired OTP?)', error);
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
    console.log('🔒 [auth/resetPassword] → PATCH /auth/reset-password/:token', { hasToken: !!auth.resetToken });

    if (!auth.resetToken) {
      console.error('❌ [auth/resetPassword] ← no resetToken in state');
      return rejectWithValue(
        'Reset session expired. Please request a new reset link.',
      );
    }

    try {
      await authService.resetPassword(auth.resetToken, payload.newPassword);
      console.log('✅ [auth/resetPassword] ← password updated successfully');
    } catch (error) {
      console.error('❌ [auth/resetPassword] ← failed', error);
      return rejectWithValue(
        extractMessage(error, 'Password reset failed. Please try again.'),
      );
    }
  },
);
