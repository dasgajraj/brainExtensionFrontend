/**
 * types/api.types.ts
 *
 * Generic API response / error contracts.
 * All backend responses follow the same envelope shape.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Success envelope
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard success response returned by every endpoint.
 * `data` is generic so each API module can type it precisely.
 */
export interface ApiResponse<TData = undefined> {
  status: 'OK' | string;
  message: string;
  data?: TData;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error envelope
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape of API error responses (4xx / 5xx).
 * `errors` carries field-level validation messages from the backend.
 */
export interface ApiErrorBody {
  status: string;
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * Normalised error surfaced throughout the app.
 * Raw Axios / network errors are transformed into this shape
 * in `api/httpClient.ts` before being thrown.
 */
export interface NormalisedError {
  /** Human-readable, UI-safe message */
  message: string;
  /** Original HTTP status code, if available */
  httpStatus?: number;
  /** Field-level validation errors for form wiring */
  fieldErrors?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────────────────

export interface HealthResponse extends ApiResponse<undefined> {
  status: string;
  message: string;
}
