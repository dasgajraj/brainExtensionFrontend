/**
 * app/bootstrap.ts
 *
 * Application bootstrap — runs ONCE on startup, before the user sees any UI.
 *
 * Responsibilities (in order):
 *  1. Dispatches `bootstrapThunk` which:
 *     a) Calls GET /health to wake the backend (with retry logic)
 *     b) Attempts to restore any existing auth session
 *
 * Why this is NOT in a component:
 *  - Bootstrap is infrastructure, not UI
 *  - It must complete before any auth action is permitted
 *  - Keeping it here ensures it is testable and mockable independently of React
 *
 * Usage:
 *   import { runBootstrap } from './app/bootstrap';
 *   // In App.tsx, inside a useEffect with [] dependency:
 *   runBootstrap(dispatch);
 */

import { bootstrapThunk } from '../store/auth/auth.thunks';

// Use a wide dispatch type to avoid importing store (which would be circular).
// AppDispatch is structurally compatible — this cast is safe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDispatch = (action: any) => any;

/**
 * Kicks off the full bootstrap sequence.
 *
 * Returns the dispatched thunk's promise so callers can await it or
 * attach .then()/.catch() as needed.
 *
 * @param dispatch - The Redux store's dispatch function
 */
export function runBootstrap(dispatch: AnyDispatch): Promise<unknown> {
  return dispatch(bootstrapThunk());
}
