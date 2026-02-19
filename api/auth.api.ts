/**
 * api/auth.api.ts
 *
 * Raw HTTP calls for every /auth/* endpoint.
 *
 * Rules:
 *  - No business logic here — only transport
 *  - Every function throws a NormalisedError on failure
 *  - All functions are async and return typed payloads
 *  - Uses httpClient (with interceptors) for authenticated endpoints
 *  - apiRefresh uses raw axios (NOT httpClient) to avoid re-triggering the
 *    401-interceptor and causing infinite refresh loops
 */

import axios from 'axios';
import httpClient, { normaliseAxiosError, BASE_URL } from './httpClient';
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
} from '../types/auth.types';

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/signup
// ─────────────────────────────────────────────────────────────────────────────

export async function apiSignUp(payload: SignUpRequest): Promise<SignUpResponse> {
  try {
    const response = await httpClient.post<SignUpResponse>('/auth/signup', payload);
    return response.data;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────────────────────────────────────────

export async function apiLogin(payload: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await httpClient.post<LoginResponse>('/auth/login', payload);
    return response.data;
  } catch (error) {
    throw normaliseAxiosError(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/refresh  — uses raw axios to avoid the 401 interceptor loop
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/logout
// ─────────────────────────────────────────────────────────────────────────────

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
