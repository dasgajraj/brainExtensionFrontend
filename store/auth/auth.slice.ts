/**
 * store/auth/auth.slice.ts
 *
 * Redux Toolkit slice for authentication state.
 *
 * This is the canonical auth slice. redux/authSlice.ts re-exports everything
 * from here for backward compatibility with the existing screen imports.
 *
 * State persistence strategy (via redux-persist):
 *  Persisted   : user, isAuthenticated, displayName, flowStep
 *  NOT persisted: accessToken, refreshToken, status, errorMessage, backendReady
 *  Reason       : tokens live in AsyncStorage via token.service.ts;
 *                 transient state should always restart clean
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, VerifyPurpose } from './auth.types';
import type { AuthResult, RefreshResult } from '../../services/auth.service';
import {
  bootstrapThunk,
  loginThunk,
  signUpThunk,
  logoutThunk,
  forgotPasswordThunk,
  verifyOtpThunk,
  verifyRequestThunk,
  resetPasswordThunk,
} from './auth.thunks';

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  displayName: null,
  status: 'idle',
  errorMessage: null,
  flowStep: 'login',
  tempUserIdentifier: '',
  backendReady: false,
  verifyPurpose: 'email',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — applies an AuthResult into state (login / signup fulfillment)
// ─────────────────────────────────────────────────────────────────────────────

function applyAuthResult(state: AuthState, payload: AuthResult): void {
  state.user = payload.user;
  state.accessToken = payload.accessToken;
  state.refreshToken = payload.refreshToken;
  state.isAuthenticated = true;
  state.displayName = payload.user.name;
  state.status = 'authenticated';
  state.errorMessage = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────────────────────

const authSliceDefinition = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // ── Navigation ────────────────────────────────────────────────────────────
    /** Move to a different screen within the auth flow */
    setFlowStep(state, action: PayloadAction<AuthState['flowStep']>) {
      state.flowStep = action.payload;
      state.errorMessage = null;
      state.status = 'idle';
    },

    /** Carry the email/phone between forgot-password → verify → reset steps */
    setTempIdentifier(state, action: PayloadAction<string>) {
      state.tempUserIdentifier = action.payload;
    },

    // ── Error management ───────────────────────────────────────────────────
    /** Clear the most recent error without changing the flow step */
    clearError(state) {
      state.errorMessage = null;
      if (state.status === 'error') state.status = 'idle';
    },

    /** Reset the entire auth flow to the login screen */
    resetAuthFlow(state) {
      state.status = 'idle';
      state.flowStep = 'login';
      state.tempUserIdentifier = '';
      state.errorMessage = null;
    },

    // ── Session management ─────────────────────────────────────────────────
    /**
     * Called by the httpClient interceptor (via redux/Store.tsx callback) when
     * a token refresh succeeds mid-request.  Updates in-memory tokens.
     */
    setTokens(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },

    /**
     * Hard sign-out — wipes all session state.
     * Called on user-initiated logout and on failed token refresh.
     */
    signOut(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.displayName = null;
      state.status = 'idle';
      state.flowStep = 'login';
      state.tempUserIdentifier = '';
      state.errorMessage = null;
      // backendReady stays true — the server is still up
    },

    /** Mark the backend as reachable (called after a successful /health check) */
    setBackendReady(state, action: PayloadAction<boolean>) {
      state.backendReady = action.payload;
    },
  },

  extraReducers: builder => {
    // ── bootstrapThunk ────────────────────────────────────────────────────────
    builder
      .addCase(bootstrapThunk.pending, state => {
        state.status = 'loading';
        state.errorMessage = null;
        state.backendReady = false;
      })
      .addCase(
        bootstrapThunk.fulfilled,
        (state, action: PayloadAction<RefreshResult | null>) => {
          state.backendReady = true;
          if (action.payload) {
            // Session successfully restored — apply fresh tokens
            state.accessToken = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
            // user and isAuthenticated are already in persisted state
            state.status = 'authenticated';
          } else {
            // No stored session — show login flow
            state.isAuthenticated = false;
            state.status = 'idle';
          }
        },
      )
      .addCase(bootstrapThunk.rejected, (state, action) => {
        // Health check failed after retries
        state.backendReady = false;
        state.status = 'error';
        state.errorMessage =
          (action.payload as string) ??
          'Server is unreachable. Please try again later.';
      });

    // ── loginThunk ────────────────────────────────────────────────────────────
    builder
      .addCase(loginThunk.pending, state => {
        state.status = 'loading';
        state.errorMessage = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        applyAuthResult(state, action.payload);
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'error';
        state.errorMessage =
          (action.payload as string) ?? 'Login failed. Please try again.';
      });

    // ── signUpThunk ───────────────────────────────────────────────────────────
    builder
      .addCase(signUpThunk.pending, state => {
        state.status = 'loading';
        state.errorMessage = null;
      })
      .addCase(signUpThunk.fulfilled, (state, action) => {
        // Store user + tokens but keep isAuthenticated=false until email is verified.
        // The verify screen uses the accessToken (via httpClient Bearer) to call
        // /auth/verify/confirm, so tokens must be saved before we navigate there.
        const { user, accessToken, refreshToken } = action.payload;
        state.user = user;
        state.accessToken = accessToken;
        state.refreshToken = refreshToken;
        state.displayName = user.name;
        state.isAuthenticated = false;   // gated until email verification
        state.status = 'success';
        state.errorMessage = null;
        state.tempUserIdentifier = user.email; // verify screen shows this
        state.verifyPurpose = 'email';
        state.flowStep = 'verify';
      })
      .addCase(signUpThunk.rejected, (state, action) => {
        state.status = 'error';
        state.errorMessage =
          (action.payload as string) ?? 'Sign up failed. Please try again.';
      });

    // ── logoutThunk ───────────────────────────────────────────────────────────
    builder
      .addCase(logoutThunk.pending, state => {
        state.status = 'loading';
      })
      .addCase(logoutThunk.fulfilled, state => {
        // Full sign-out state reset (mirrored from signOut sync action)
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.displayName = null;
        state.status = 'idle';
        state.flowStep = 'login';
        state.tempUserIdentifier = '';
        state.errorMessage = null;
      })
      .addCase(logoutThunk.rejected, state => {
        // Even if the server call failed, clear the local session
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.displayName = null;
        state.status = 'idle';
        state.flowStep = 'login';
        state.errorMessage = null;
      });

    // ── forgotPasswordThunk ───────────────────────────────────────────────────
    builder
      .addCase(forgotPasswordThunk.pending, state => {
        state.status = 'loading';
        state.errorMessage = null;
      })
      .addCase(forgotPasswordThunk.fulfilled, state => {
        state.status = 'success';
        state.verifyPurpose = 'forgotPassword';
        state.flowStep = 'verify';
      })
      .addCase(forgotPasswordThunk.rejected, (state, action) => {
        state.status = 'error';
        state.errorMessage = (action.payload as string) ?? 'Request failed.';
      });

    // ── verifyRequestThunk ────────────────────────────────────────────────────
    builder
      .addCase(verifyRequestThunk.pending, state => {
        state.status = 'loading';
        state.errorMessage = null;
      })
      .addCase(verifyRequestThunk.fulfilled, state => {
        state.status = 'idle'; // code sent — back to waiting for input
      })
      .addCase(verifyRequestThunk.rejected, (state, action) => {
        state.status = 'error';
        state.errorMessage =
          (action.payload as string) ?? 'Could not send verification code.';
      });

    // ── verifyOtpThunk ────────────────────────────────────────────────────────
    builder
      .addCase(verifyOtpThunk.pending, state => {
        state.status = 'loading';
        state.errorMessage = null;
      })
      .addCase(verifyOtpThunk.fulfilled, state => {
        if (state.verifyPurpose === 'email') {
          // Email verified — grant full access, App.tsx shows HomeScreen
          state.isAuthenticated = true;
          state.status = 'authenticated';
        } else {
          // Forgot-password flow — proceed to reset screen
          state.status = 'success';
          state.flowStep = 'resetPassword';
        }
        state.errorMessage = null;
      })
      .addCase(verifyOtpThunk.rejected, (state, action) => {
        state.status = 'error';
        state.errorMessage = (action.payload as string) ?? 'Verification failed.';
      });

    // ── resetPasswordThunk ────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const {
  setFlowStep,
  setTempIdentifier,
  clearError,
  resetAuthFlow,
  setTokens,
  signOut,
  setBackendReady,
} = authSliceDefinition.actions;

export default authSliceDefinition.reducer;

// Re-export types for convenience
export type { AuthState, AuthFlowStep, AuthStatus } from './auth.types';
