import axios from 'axios';
import { normaliseAxiosError, BASE_URL } from './httpClient';
import { BRAIN_PIN } from '@env';
import { tokenService } from '../services/token.service';
import type {
  SignUpRequest,
  SignUpResponse,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RefreshResponse,
  LogoutRequest,
  LogoutResponse,
  VerifyRequestPayload,
  VerifyConfirmPayload,
  VerifyApiResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '../types/auth.types';

// Plain axios (not httpClient) — avoids async request-interceptor POST-body
// corruption on React Native New Architecture (Bridgeless/Hermes).
export async function apiSignUp(payload: SignUpRequest): Promise<SignUpResponse> {
  console.log('📝 [auth.api] apiSignUp → POST /auth/signup', { name: payload.name, email: payload.email });
  try {
    const response = await axios.post<SignUpResponse>(
      `${BASE_URL}/auth/signup`,
      payload,
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
    );
    console.log('✅ [auth.api] apiSignUp ← success', { userId: response.data.user?._id, email: response.data.user?.email });
    return response.data;
  } catch (error) {
    console.error('❌ [auth.api] apiSignUp ← error', error);
    throw normaliseAxiosError(error);
  }
}

// Plain axios (not httpClient) — same reason as apiSignUp above.
export async function apiLogin(payload: LoginRequest): Promise<LoginResponse> {
  console.log('🔐 [auth.api] apiLogin → POST /auth/login', { email: payload.email });
  try {
    const response = await axios.post<LoginResponse>(
      `${BASE_URL}/auth/login`,
      payload,
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
    );
    console.log('✅ [auth.api] apiLogin ← success', { userId: response.data.user?._id, email: response.data.user?.email });
    return response.data;
  } catch (error) {
    console.error('❌ [auth.api] apiLogin ← error', error);
    throw normaliseAxiosError(error);
  }
}

// raw axios — avoids the 401 interceptor loop
export async function apiRefresh(payload: RefreshRequest): Promise<RefreshResponse> {
  console.log('🔄 [auth.api] apiRefresh → POST /auth/refresh (raw axios, no interceptor)');
  try {
    const response = await axios.post<RefreshResponse>(
      `${BASE_URL}/auth/refresh`,
      payload,
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
    );
    console.log('✅ [auth.api] apiRefresh ← success — new tokens issued');
    return response.data;
  } catch (error) {
    console.error('❌ [auth.api] apiRefresh ← error — session may be expired', error);
    throw normaliseAxiosError(error);
  }
}

// Plain axios with manual token — avoids async-interceptor POST-body bug on New Architecture.
export async function apiLogout(payload: LogoutRequest): Promise<LogoutResponse> {
  console.log('🚪 [auth.api] apiLogout → POST /auth/logout');
  try {
    const accessToken = await tokenService.getAccessToken();
    const response = await axios.post<LogoutResponse>(
      `${BASE_URL}/auth/logout`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      },
    );
    console.log('✅ [auth.api] apiLogout ← success', response.data);
    return response.data;
  } catch (error) {
    // 401 is expected if token already expired — treat as success
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.warn('⚠️ [auth.api] apiLogout ← 401 (token already expired) — treating as success');
      return { status: 'OK', message: 'Already logged out.' };
    }
    console.error('❌ [auth.api] apiLogout ← error', error);
    throw normaliseAxiosError(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/verify/request  — send verification code to user's email
// Requires Bearer token (called after signup / for resend)
// ─────────────────────────────────────────────────────────────────────────────

export async function apiVerifyRequest(
  payload: VerifyRequestPayload,
): Promise<VerifyApiResponse> {
  console.log('📨 [auth.api] apiVerifyRequest → POST /auth/verify/request', { email: payload.email });
  try {
    const accessToken = await tokenService.getAccessToken();
    const response = await axios.post<VerifyApiResponse>(
      `${BASE_URL}/auth/verify/request`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      },
    );
    console.log('✅ [auth.api] apiVerifyRequest ← success — OTP sent to email');
    return response.data;
  } catch (error) {
    console.error('❌ [auth.api] apiVerifyRequest ← error', error);
    throw normaliseAxiosError(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/verify/confirm  — validate the 6-digit code
// Requires Bearer token; on success backend marks email as verified
// ─────────────────────────────────────────────────────────────────────────────

export async function apiVerifyConfirm(
  payload: VerifyConfirmPayload,
): Promise<VerifyApiResponse> {
  console.log('🔢 [auth.api] apiVerifyConfirm → POST /auth/verify/confirm', { token: payload.token ? `${String(payload.token).slice(0, 3)}***` : undefined });
  try {
    const accessToken = await tokenService.getAccessToken();
    const response = await axios.post<VerifyApiResponse>(
      `${BASE_URL}/auth/verify/confirm`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      },
    );
    console.log('✅ [auth.api] apiVerifyConfirm ← success — email verified');
    return response.data;
  } catch (error) {
    console.error('❌ [auth.api] apiVerifyConfirm ← error (wrong/expired OTP?)', error);
    throw normaliseAxiosError(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/forgot-password  — request a password reset email
// No auth token required (user is logged out)
// SECURITY: Always show generic success — never reveal if email exists
// ─────────────────────────────────────────────────────────────────────────────

export async function apiForgotPassword(
  payload: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> {
  console.log('🔑 [auth.api] apiForgotPassword → POST /auth/forgot-password (raw axios)', { email: payload.email });
  try {
    // Uses raw axios — user is unauthenticated at this point; no Bearer needed
    const response = await axios.post<ForgotPasswordResponse>(
      `${BASE_URL}/auth/forgot-password`,
      payload,
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
    );
    console.log('✅ [auth.api] apiForgotPassword ← success — reset email dispatched (generic, no leak)');
    return response.data;
  } catch (error) {
    console.error('❌ [auth.api] apiForgotPassword ← error', error);
    throw normaliseAxiosError(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /auth/reset-password/:token
// token → extracted from deep link (single-use, backend-generated)
// x-brain-pin header → static PIN from .env (BRAIN_PIN); NEVER logged
// ─────────────────────────────────────────────────────────────────────────────

export async function apiResetPassword(
  token: string,
  payload: ResetPasswordRequest,
): Promise<ResetPasswordResponse> {
  console.log('🔒 [auth.api] apiResetPassword → PATCH /auth/reset-password/:token (token masked)');
  try {
    // Uses raw axios with explicit headers — token is path param, NOT a Bearer
    const response = await axios.patch<ResetPasswordResponse>(
      `${BASE_URL}/auth/reset-password/${encodeURIComponent(token)}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-brain-pin': BRAIN_PIN, // static PIN from .env — never hardcoded
        },
      },
    );
    console.log('✅ [auth.api] apiResetPassword ← success — password updated');
    return response.data;
  } catch (error) {
    console.error('❌ [auth.api] apiResetPassword ← error', error);
    throw normaliseAxiosError(error);
  }
}
