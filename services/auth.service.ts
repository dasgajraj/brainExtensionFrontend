import { apiSignUp, apiLogin, apiLogout, apiRefresh, apiVerifyRequest, apiVerifyConfirm, apiForgotPassword, apiResetPassword } from '../api/auth.api';
import { tokenService } from './token.service';
import type { SignUpRequest, LoginRequest } from '../types/auth.types';
import type { User } from '../types/user.types';

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export async function signUp(payload: SignUpRequest): Promise<AuthResult> {
  const response = await apiSignUp(payload);
  const { accessToken, refreshToken, user } = response;

  await tokenService.saveTokens(accessToken, refreshToken);

  return { user, accessToken, refreshToken };
}

export async function login(payload: LoginRequest): Promise<AuthResult> {
  const response = await apiLogin(payload);
  const { accessToken, refreshToken, user } = response;

  await tokenService.saveTokens(accessToken, refreshToken);

  return { user, accessToken, refreshToken };
}

export async function logout(): Promise<void> {
  const refreshToken = await tokenService.getRefreshToken();

  if (refreshToken) {
    try {
      await apiLogout({ refreshToken });
    } catch {
      // local cleanup always runs even if server call fails
    }
  }

  await tokenService.clearTokens();
}

export async function refreshSession(storedRefreshToken: string): Promise<RefreshResult> {
  const response = await apiRefresh({ refreshToken: storedRefreshToken });

  const newAccessToken = response.accessToken;
  const newRefreshToken = response.refreshToken ?? storedRefreshToken;

  if (!newAccessToken) {
    throw new Error('Refresh response did not include a valid accessToken.');
  }

  await tokenService.saveTokens(newAccessToken, newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function restoreSession(): Promise<RefreshResult | null> {
  await tokenService.hydrate();
  const hasSession = await tokenService.hasSession();
  if (!hasSession) return null;

  const storedRefreshToken = await tokenService.getRefreshToken();
  if (!storedRefreshToken) return null;

  try {
    return await refreshSession(storedRefreshToken);
  } catch {
    await tokenService.clearTokens();
    return null;
  }
}

export async function requestEmailVerification(email: string): Promise<void> {
  await apiVerifyRequest({ email });
}

export async function confirmEmailVerification(token: string): Promise<void> {
  await apiVerifyConfirm({ token });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiForgotPassword({ email });
}

export async function resetPassword(
  resetToken: string,
  newPassword: string,
): Promise<void> {
  await apiResetPassword(resetToken, { password: newPassword });
}

export const authService = {
  signUp,
  login,
  logout,
  refreshSession,
  restoreSession,
  requestEmailVerification,
  confirmEmailVerification,
  requestPasswordReset,
  resetPassword,
};
