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
  console.log('📝 [authService] signUp → calling apiSignUp', { name: payload.name, email: payload.email });
  const response = await apiSignUp(payload);
  const { accessToken, refreshToken, user } = response;
  console.log('💾 [authService] signUp ← saving tokens to storage', { userId: user?._id });
  await tokenService.saveTokens(accessToken, refreshToken);
  console.log('✅ [authService] signUp ← complete', { userId: user?._id, email: user?.email });
  return { user, accessToken, refreshToken };
}

export async function login(payload: LoginRequest): Promise<AuthResult> {
  console.log('🔐 [authService] login → calling apiLogin', { email: payload.email });
  const response = await apiLogin(payload);
  const { accessToken, refreshToken, user } = response;
  console.log('💾 [authService] login ← saving tokens to storage', { userId: user?._id });
  await tokenService.saveTokens(accessToken, refreshToken);
  console.log('✅ [authService] login ← complete', { userId: user?._id, email: user?.email, plan: user?.plan });
  return { user, accessToken, refreshToken };
}

export async function logout(): Promise<void> {
  console.log('🚪 [authService] logout → retrieving refresh token');
  const refreshToken = await tokenService.getRefreshToken();

  if (refreshToken) {
    console.log('🚪 [authService] logout → calling apiLogout with refresh token');
    try {
      await apiLogout({ refreshToken });
      console.log('✅ [authService] logout ← server session invalidated');
    } catch {
      // local cleanup always runs even if server call fails
      console.warn('⚠️ [authService] logout ← server call failed (non-fatal, clearing local tokens anyway)');
    }
  } else {
    console.log('⚠️ [authService] logout → no refresh token found, skipping server call');
  }

  console.log('🧹 [authService] logout → clearing local tokens from storage');
  await tokenService.clearTokens();
  console.log('✅ [authService] logout ← local tokens cleared');
}

export async function refreshSession(storedRefreshToken: string): Promise<RefreshResult> {
  console.log('🔄 [authService] refreshSession → calling apiRefresh');
  const response = await apiRefresh({ refreshToken: storedRefreshToken });

  const newAccessToken = response.accessToken;
  const newRefreshToken = response.refreshToken ?? storedRefreshToken;

  if (!newAccessToken) {
    console.error('❌ [authService] refreshSession ← no accessToken in refresh response');
    throw new Error('Refresh response did not include a valid accessToken.');
  }

  console.log('💾 [authService] refreshSession ← saving new tokens');
  await tokenService.saveTokens(newAccessToken, newRefreshToken);
  console.log('✅ [authService] refreshSession ← session renewed');
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function restoreSession(): Promise<RefreshResult | null> {
  console.log('🔍 [authService] restoreSession → hydrating token cache');
  await tokenService.hydrate();
  const hasSession = await tokenService.hasSession();
  if (!hasSession) {
    console.log('ℹ️ [authService] restoreSession ← no stored session found');
    return null;
  }

  const storedRefreshToken = await tokenService.getRefreshToken();
  if (!storedRefreshToken) {
    console.log('ℹ️ [authService] restoreSession ← refresh token missing, aborting restore');
    return null;
  }

  console.log('🔄 [authService] restoreSession → attempting session refresh');
  try {
    const result = await refreshSession(storedRefreshToken);
    console.log('✅ [authService] restoreSession ← session restored successfully');
    return result;
  } catch {
    console.warn('⚠️ [authService] restoreSession ← refresh failed, clearing tokens and starting fresh');
    await tokenService.clearTokens();
    return null;
  }
}

export async function requestEmailVerification(email: string): Promise<void> {
  console.log('📧 [authService] requestEmailVerification → sending OTP to', email);
  await apiVerifyRequest({ email });
  console.log('✅ [authService] requestEmailVerification ← OTP sent');
}

export async function confirmEmailVerification(token: string): Promise<void> {
  console.log('🔢 [authService] confirmEmailVerification → confirming OTP');
  await apiVerifyConfirm({ token });
  console.log('✅ [authService] confirmEmailVerification ← email verified');
}

export async function requestPasswordReset(email: string): Promise<void> {
  console.log('🔑 [authService] requestPasswordReset → sending reset link to', email);
  await apiForgotPassword({ email });
  console.log('✅ [authService] requestPasswordReset ← reset email dispatched');
}

export async function resetPassword(
  resetToken: string,
  newPassword: string,
): Promise<void> {
  console.log('🔒 [authService] resetPassword → patching password (token masked)');
  await apiResetPassword(resetToken, { password: newPassword });
  console.log('✅ [authService] resetPassword ← password updated successfully');
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
