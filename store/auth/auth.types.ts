import type { User } from '../../types/user.types';

export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'authenticated'
  | 'error';

export type AuthFlowStep =
  | 'login'
  | 'signup'
  | 'forgotPassword'
  | 'verify'
  | 'resetPassword';

export type VerifyPurpose = 'email' | 'forgotPassword';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  displayName: string | null;
  status: AuthStatus;
  errorMessage: string | null;
  flowStep: AuthFlowStep;
  tempUserIdentifier: string;
  backendReady: boolean;
  verifyPurpose: VerifyPurpose;
  resetToken: string | null;
  resetStatus: 'idle' | 'loading' | 'success' | 'error';
  resetError: string | null;
}
