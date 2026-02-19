/**
 * api/httpClient.ts
 *
 * Axios instance that is the ONLY HTTP entry-point for the app.
 *
 * Responsibilities:
 *  1. Attach the Authorization: Bearer <token> header on every request
 *  2. Intercept HTTP 401 responses, silently refresh the token, and
 *     retry the failed request — queueing concurrent failures to avoid
 *     multiple simultaneous refresh calls
 *  3. Force logout when a refresh attempt fails
 *
 * Circular-dependency strategy:
 *  The interceptors need to dispatch Redux actions (setTokens / signOut).
 *  Importing the slice directly here would create a cycle:
 *    httpClient → auth.slice → auth.thunks → auth.service → httpClient
 *
 *  Solution: `injectStoreCallbacks()` is called ONCE from redux/Store.tsx
 *  after the store is created, injecting lightweight callbacks.
 *  httpClient itself imports NO Redux files.
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import type { ApiErrorBody, NormalisedError } from '../types/api.types';
import { tokenService } from '../services/token.service';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_URL = 'https://brain-extension-exng.onrender.com';
const REFRESH_ENDPOINT = '/auth/refresh';
const REQUEST_TIMEOUT_MS = 15_000;

// ─────────────────────────────────────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────────────────────────────────────

export const httpClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Store callback injection  (breaks circular dependency)
// ─────────────────────────────────────────────────────────────────────────────

type OnTokensRefreshed = (accessToken: string, refreshToken: string) => void;
type OnForceLogout = () => void;

let _onTokensRefreshed: OnTokensRefreshed | null = null;
let _onForceLogout: OnForceLogout | null = null;

/**
 * Call this once from redux/Store.tsx immediately after creating the store.
 * Provides the interceptors with Redux dispatch capability without a
 * static import cycle.
 */
export function injectStoreCallbacks(
  onTokensRefreshed: OnTokensRefreshed,
  onForceLogout: OnForceLogout,
): void {
  _onTokensRefreshed = onTokensRefreshed;
  _onForceLogout = onForceLogout;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error normalisation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts any thrown Axios error into a `NormalisedError` that is safe to
 * display in the UI without leaking internal implementation details.
 */
export function normaliseAxiosError(error: unknown): NormalisedError {
  if (!axios.isAxiosError(error)) {
    return {
      message: 'An unexpected error occurred. Please try again.',
    };
  }

  const axiosError = error as AxiosError<ApiErrorBody>;

  if (!axiosError.response) {
    // Network error — server is unreachable / no internet
    return {
      message:
        'Unable to reach the server. Please check your connection and try again.',
    };
  }

  const { status, data } = axiosError.response;

  // Flatten field-level errors to a single-level Record<string, string>
  const fieldErrors: Record<string, string> | undefined =
    data?.errors != null
      ? Object.fromEntries(
          Object.entries(data.errors).map(([key, messages]) => [key, messages[0]]),
        )
      : undefined;

  const message =
    data?.message ??
    HTTP_STATUS_MESSAGES[status] ??
    'Something went wrong. Please try again.';

  return { message, httpStatus: status, fieldErrors };
}

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Invalid credentials. Please try again.',
  403: 'You do not have permission to perform this action.',
  404: 'Resource not found.',
  409: 'An account with this email already exists.',
  422: 'Validation failed. Please check your input.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Server error. Our team has been notified.',
  502: 'Server is temporarily unavailable. Please try again.',
  503: 'Service unavailable. Please try again later.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Request interceptor — attach Bearer token
// ─────────────────────────────────────────────────────────────────────────────

httpClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const accessToken = await tokenService.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ─────────────────────────────────────────────────────────────────────────────
// Response interceptor — handle 401 + token refresh queue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Internal flag — prevents multiple simultaneous refresh calls when several
 * requests fail with 401 at the same time.
 */
let isRefreshing = false;

/**
 * Requests that arrived during an active refresh are queued here.
 * On success they each resolve with the new accessToken; on failure they reject.
 */
interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: NormalisedError) => void;
}
let failedRequestQueue: QueueItem[] = [];

function flushQueue(error: NormalisedError | null, token: string | null): void {
  failedRequestQueue.forEach(item => {
    if (error) {
      item.reject(error);
    } else if (token) {
      item.resolve(token);
    }
  });
  failedRequestQueue = [];
}

/** Extended config type to track one-time retry attempts */
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

httpClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,

  async (error: unknown): Promise<AxiosResponse> => {
    // Non-Axios errors (e.g. thrown inside request interceptor) pass through
    // raw so the API-layer catch can call normaliseAxiosError once.
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const axiosError = error as AxiosError<ApiErrorBody>;
    const originalRequest = axiosError.config as RetryableRequestConfig | undefined;

    // Only intercept 401 for the refresh flow.
    // All other status codes are rejected with the original Axios error so
    // the API layer's normaliseAxiosError call runs exactly once.
    if (axiosError.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Avoid infinite retry loop on a second 401
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // If a refresh is already in-flight, queue this request
    if (isRefreshing) {
      return new Promise<AxiosResponse>((resolve, reject) => {
        failedRequestQueue.push({
          resolve: (newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(httpClient(originalRequest));
          },
          reject,
        });
      });
    }

    // ── Start refresh ────────────────────────────────────────────────────────
    originalRequest._retry = true;
    isRefreshing = true;

    const normalisedError = normaliseAxiosError(error);

    try {
      const storedRefreshToken = await tokenService.getRefreshToken();

      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      // Use a raw axios call (not httpClient) to avoid triggering this interceptor again.
      // Backend returns a FLAT object: { status, accessToken, refreshToken? }
      const refreshResponse = await axios.post<{
        status: string;
        accessToken: string;
        refreshToken?: string;
      }>(
        `${BASE_URL}${REFRESH_ENDPOINT}`,
        { refreshToken: storedRefreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );

      const newAccessToken = refreshResponse.data?.accessToken;
      const newRefreshToken =
        refreshResponse.data?.refreshToken ?? storedRefreshToken;

      if (!newAccessToken) {
        throw new Error('Refresh response missing accessToken');
      }

      // Persist refreshed tokens
      await tokenService.saveTokens(newAccessToken, newRefreshToken);

      // Notify Redux store (via injected callback – no static import of slice)
      _onTokensRefreshed?.(newAccessToken, newRefreshToken);

      // Resolve all queued requests with the new token
      flushQueue(null, newAccessToken);

      // Retry the original request
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return httpClient(originalRequest);
    } catch {
      // Refresh failed — force full logout
      flushQueue(normalisedError, null);
      await tokenService.clearTokens();
      _onForceLogout?.();
      return Promise.reject(normalisedError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default httpClient;
