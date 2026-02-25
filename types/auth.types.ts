import type { User } from './user.types';
import type { ApiResponse } from './api.types';

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

export interface AuthApiResponse {
  status: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshApiResponse {
  status: string;
  accessToken: string;
  refreshToken?: string;
}

export type SignUpResponse = AuthApiResponse;
export type LoginResponse = AuthApiResponse;
export type RefreshResponse = RefreshApiResponse;
export type LogoutResponse = ApiResponse<undefined>;

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  status: string;
  message: string;
}

export interface ResetPasswordRequest {
  password: string;
}

export interface ResetPasswordResponse {
  status: string;
  message: string;
}

export interface VerifyRequestPayload {
  email: string;
}

export interface VerifyConfirmPayload {
  token: string;
}

export interface VerifyApiResponse {
  status: string;
  message: string;
}
