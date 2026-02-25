import axios from 'axios';
import httpClient, { normaliseAxiosError, BASE_URL } from './httpClient';
import { BRAIN_PIN } from '@env';
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

export async function apiSignUp(payload: SignUpRequest): Promise<SignUpResponse> {
  try {
    const response = await httpClient.post<SignUpResponse>('/auth/signup', payload);
    return response.data;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}

export async function apiLogin(payload: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await httpClient.post<LoginResponse>('/auth/login', payload);
    return response.data;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}

// raw axios — avoids the 401 interceptor loop
export async function apiRefresh(payload: RefreshRequest): Promise<RefreshResponse> {
  try {
    const response = await axios.post<RefreshResponse>(
      `${BASE_URL}/auth/refresh`,
      payload,
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
    );
    return response.data;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}

export async function apiLogout(payload: LogoutRequest): Promise<LogoutResponse> {
  try {
    const response = await httpClient.post<LogoutResponse>('/auth/logout', payload);
    return response.data;
  } catch (error) {
    // 401 is expected if token already expired — treat as success
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return { status: 'OK', message: 'Already logged out.' };
    }
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
  try {
    const response = await httpClient.post<VerifyApiResponse>(
      '/auth/verify/request',
      payload,
    );
    return response.data;
  } catch (error) {
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
  try {
    const response = await httpClient.post<VerifyApiResponse>(
      '/auth/verify/confirm',
      payload,
    );
    return response.data;
  } catch (error) {
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
  try {
    // Uses raw axios — user is unauthenticated at this point; no Bearer needed
    const response = await axios.post<ForgotPasswordResponse>(
      `${BASE_URL}/auth/forgot-password`,
      payload,
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
    );
    return response.data;
  } catch (error) {
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
    return response.data;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}
