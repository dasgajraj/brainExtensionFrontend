/**
 * redux/authSlice.ts
 *
 * Redux Toolkit slice for the authentication flow.
 *
 * Design decisions:
 *  - No real API calls are made.  Every async thunk is a mock that simulates
 *    network latency and resolves/rejects based on simple client-side rules.
 *  - Replace the mock implementations inside each thunk's try{} block with your
 *    real API calls when integrating the backend.
 *  - `tempUserIdentifier` stores the email/phone forwarded between screens so
 *    the OTP-verify and reset-password screens know who they're acting for.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AuthStatus = 'idle' | 'loading' | 'success' | 'error';

export type AuthFlowStep =
  | 'login'
  | 'signup'
  | 'forgotPassword'
  | 'verify'
  | 'resetPassword';

export interface AuthState {
  /** Current async operation state */
  status: AuthStatus;
  /** Which screen/step the auth flow is on */
  flowStep: AuthFlowStep;
  /** Email or phone carried through the flow (e.g. from Forgot → Verify → Reset) */
  tempUserIdentifier: string;
  /** Human-readable error message for the current failed operation */
  errorMessage: string | null;
  /** Whether the user has successfully authenticated */
  isAuthenticated: boolean;
  /** Display name for the logged-in user (populated after login/signup) */
  displayName: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request / Response payload shapes  (replace internals with real API shapes)
// ─────────────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyOtpPayload {
  identifier: string;
  otp: string;
}

export interface ResetPasswordPayload {
  identifier: string;
  otp: string;
  newPassword: string;
}

interface AuthUser {
  displayName: string;
  email: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock delay helper  (remove when hooking into real API)
// ─────────────────────────────────────────────────────────────────────────────

const mockDelay = (ms = 1200) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Async thunks  (mock implementations – swap bodies for real API calls)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mock login.
 * Integration point: replace the body with your API call.
 *   e.g. const res = await authApi.login(payload)
 */
export const loginThunk = createAsyncThunk<AuthUser, LoginPayload>(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    try {
      await mockDelay();

      // ── MOCK LOGIC ──────────────────────────────────────────────────────
      // Reject obviously invalid credentials so the UI can show an error.
      if (!payload.email.includes('@')) {
        return rejectWithValue('Please enter a valid email address.');
      }
      if (payload.password.length < 6) {
        return rejectWithValue('Password must be at least 6 characters.');
      }
      // ── END MOCK LOGIC ──────────────────────────────────────────────────

      return {
        displayName: payload.email.split('@')[0],
        email: payload.email,
      };
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Login failed. Please try again.');
    }
  }
);

/**
 * Mock sign-up.
 * Integration point: replace the body with your API call.
 */
export const signUpThunk = createAsyncThunk<AuthUser, SignUpPayload>(
  'auth/signUp',
  async (payload, { rejectWithValue }) => {
    try {
      await mockDelay();

      // ── MOCK LOGIC ──────────────────────────────────────────────────────
      if (!payload.email.includes('@')) {
        return rejectWithValue('Please enter a valid email address.');
      }
      if (payload.password.length < 8) {
        return rejectWithValue('Password must be at least 8 characters.');
      }
      if (!payload.name.trim()) {
        return rejectWithValue('Name cannot be empty.');
      }
      // ── END MOCK LOGIC ──────────────────────────────────────────────────

      return {
        displayName: payload.name,
        email: payload.email,
      };
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Sign up failed. Please try again.');
    }
  }
);

/**
 * Mock forgot-password request.
 * Integration point: call your "send OTP/reset email" endpoint.
 */
export const forgotPasswordThunk = createAsyncThunk<void, ForgotPasswordPayload>(
  'auth/forgotPassword',
  async (payload, { rejectWithValue }) => {
    try {
      await mockDelay();

      // ── MOCK LOGIC ──────────────────────────────────────────────────────
      if (!payload.email.includes('@')) {
        return rejectWithValue('Please enter a valid email address.');
      }
      // Simulate "user not found" for unknown domains
      if (payload.email.endsWith('@notfound.com')) {
        return rejectWithValue('No account found with that email.');
      }
      // ── END MOCK LOGIC ──────────────────────────────────────────────────
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Could not send reset code. Try again.');
    }
  }
);

/**
 * Mock OTP verification.
 * Integration point: call your "verify OTP" endpoint.
 */
export const verifyOtpThunk = createAsyncThunk<void, VerifyOtpPayload>(
  'auth/verifyOtp',
  async (payload, { rejectWithValue }) => {
    try {
      await mockDelay(900);

      // ── MOCK LOGIC ──────────────────────────────────────────────────────
      // Accept "123456" as the valid mock OTP
      if (payload.otp !== '123456') {
        return rejectWithValue('Invalid or expired code. Please try again.');
      }
      // ── END MOCK LOGIC ──────────────────────────────────────────────────
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Verification failed. Try again.');
    }
  }
);

/**
 * Mock reset-password.
 * Integration point: call your "reset password with OTP" endpoint.
 */
export const resetPasswordThunk = createAsyncThunk<void, ResetPasswordPayload>(
  'auth/resetPassword',
  async (payload, { rejectWithValue }) => {
    try {
      await mockDelay();

      // ── MOCK LOGIC ──────────────────────────────────────────────────────
      if (payload.newPassword.length < 8) {
        return rejectWithValue('Password must be at least 8 characters.');
      }
      if (payload.otp !== '123456') {
        return rejectWithValue('Session expired. Please restart the flow.');
      }
      // ── END MOCK LOGIC ──────────────────────────────────────────────────
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Password reset failed. Try again.');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────────────────────

const initialState: AuthState = {
  status: 'idle',
  flowStep: 'login',
  tempUserIdentifier: '',
  errorMessage: null,
  isAuthenticated: false,
  displayName: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Navigate to a different screen within the auth flow */
    setFlowStep(state, action: PayloadAction<AuthFlowStep>) {
      state.flowStep = action.payload;
      state.errorMessage = null;
      state.status = 'idle';
    },

    /** Store the email/phone while moving between flow screens */
    setTempIdentifier(state, action: PayloadAction<string>) {
      state.tempUserIdentifier = action.payload;
    },

    /** Clear any lingering error message without changing the step */
    clearError(state) {
      state.errorMessage = null;
      state.status = 'idle';
    },

    /** Reset the entire auth flow back to the login screen */
    resetAuthFlow(state) {
      state.status = 'idle';
      state.flowStep = 'login';
      state.tempUserIdentifier = '';
      state.errorMessage = null;
    },

    /** Sign out: clear authenticated state */
    signOut(state) {
      state.isAuthenticated = false;
      state.displayName = null;
      state.status = 'idle';
      state.flowStep = 'login';
      state.tempUserIdentifier = '';
      state.errorMessage = null;
    },
  },
  extraReducers: builder => {
    // ── Login ────────────────────────────────────────────────────────────────
    builder
      .addCase(loginThunk.pending, state => {
        state.status = 'loading';
        state.errorMessage = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.status = 'success';
        state.isAuthenticated = true;
        state.displayName = action.payload.displayName;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'error';
        state.errorMessage = (action.payload as string) ?? 'Login failed.';
      });

    // ── Sign Up ───────────────────────────────────────────────────────────────
    builder
      .addCase(signUpThunk.pending, state => {
        state.status = 'loading';
        state.errorMessage = null;
      })
      .addCase(signUpThunk.fulfilled, (state, action) => {
        state.status = 'success';
        state.isAuthenticated = true;
        state.displayName = action.payload.displayName;
      })
      .addCase(signUpThunk.rejected, (state, action) => {
        state.status = 'error';
        state.errorMessage = (action.payload as string) ?? 'Sign up failed.';
      });

    // ── Forgot Password ───────────────────────────────────────────────────────
    builder
      .addCase(forgotPasswordThunk.pending, state => {
        state.status = 'loading';
        state.errorMessage = null;
      })
      .addCase(forgotPasswordThunk.fulfilled, state => {
        state.status = 'success';
        state.flowStep = 'verify';
      })
      .addCase(forgotPasswordThunk.rejected, (state, action) => {
        state.status = 'error';
        state.errorMessage = (action.payload as string) ?? 'Request failed.';
      });

    // ── Verify OTP ────────────────────────────────────────────────────────────
    builder
      .addCase(verifyOtpThunk.pending, state => {
        state.status = 'loading';
        state.errorMessage = null;
      })
      .addCase(verifyOtpThunk.fulfilled, state => {
        state.status = 'success';
        state.flowStep = 'resetPassword';
      })
      .addCase(verifyOtpThunk.rejected, (state, action) => {
        state.status = 'error';
        state.errorMessage = (action.payload as string) ?? 'Verification failed.';
      });

    // ── Reset Password ────────────────────────────────────────────────────────
    builder
      .addCase(resetPasswordThunk.pending, state => {
        state.status = 'loading';
        state.errorMessage = null;
      })
      .addCase(resetPasswordThunk.fulfilled, state => {
        state.status = 'success';
        state.flowStep = 'login';
        state.tempUserIdentifier = '';
      })
      .addCase(resetPasswordThunk.rejected, (state, action) => {
        state.status = 'error';
        state.errorMessage = (action.payload as string) ?? 'Reset failed.';
      });
  },
});

export const {
  setFlowStep,
  setTempIdentifier,
  clearError,
  resetAuthFlow,
  signOut,
} = authSlice.actions;

export default authSlice.reducer;
