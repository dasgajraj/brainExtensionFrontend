/**
 * navigation/deepLinking.ts
 *
 * Handles incoming deep links for the brainextension:// URL scheme
 * and HTTPS App Links from the backend domain.
 *
 * Supported links
 * ───────────────
 *   brainextension://auth/reset-password/<TOKEN>
 *     → custom scheme (cold/warm start)
 *
 *   https://brain-extension-exng.onrender.com/auth/reset-password-bridge?token=<TOKEN>
 *   https://brain-extension-exng.onrender.com/auth/reset-password-bridge/<TOKEN>
 *     → HTTPS App Link (Android App Links / iOS Universal Links)
 *     → dispatches setResetToken(token) which sets flowStep = 'resetPassword'
 *
 * Security notes
 * ──────────────
 *   • The token is NEVER logged.
 *   • Malformed or missing tokens redirect to the login screen (not an error).
 */

import { Linking } from 'react-native';
import type { AppDispatch } from '../redux/Store';
import { setResetToken, setFlowStep } from '../store/auth/auth.slice';

// ─────────────────────────────────────────────────────────────────────────────
// URL patterns
// ─────────────────────────────────────────────────────────────────────────────

// Custom scheme: brainextension://auth/reset-password/<token>
const CUSTOM_SCHEME_PATTERN =
  /^brainextension:\/\/auth\/reset-password\/([A-Za-z0-9\-_.~%+=]{8,512})$/;

// HTTPS App Link — token as query param: ?token=<token>
const HTTPS_QUERY_PATTERN =
  /^https:\/\/brain-extension-exng\.onrender\.com\/auth\/reset-password-bridge(?:\/[^?]*)?\?(?:.*&)?token=([A-Za-z0-9\-_.~%+=]{8,512})/;

// HTTPS App Link — token as path segment: /auth/reset-password-bridge/<token>
const HTTPS_PATH_PATTERN =
  /^https:\/\/brain-extension-exng\.onrender\.com\/auth\/reset-password-bridge\/([A-Za-z0-9\-_.~%+=]{8,512})$/;

// ─────────────────────────────────────────────────────────────────────────────
// Token extraction
// ─────────────────────────────────────────────────────────────────────────────

export function parseResetToken(url: string): string | null {
  const trimmed = url.trim();

  // Try each pattern against raw URL, then once-decoded (for %XX mail clients)
  const patterns = [CUSTOM_SCHEME_PATTERN, HTTPS_QUERY_PATTERN, HTTPS_PATH_PATTERN];

  for (const pattern of patterns) {
    const match = pattern.exec(trimmed);
    if (match) return match[1];
  }

  try {
    const decoded = decodeURIComponent(trimmed);
    for (const pattern of patterns) {
      const match = pattern.exec(decoded);
      if (match) return match[1];
    }
  } catch {
    // decodeURIComponent can throw on malformed input — ignore
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch helper
// ─────────────────────────────────────────────────────────────────────────────

export function handleDeepLink(url: string, dispatch: AppDispatch): void {
  const token = parseResetToken(url);
  if (token) {
    // setResetToken also sets flowStep = 'resetPassword' (see auth.slice.ts)
    dispatch(setResetToken(token));
  } else {
    // Unknown / malformed link — navigate to login gracefully
    dispatch(setFlowStep('login'));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle setup — call from App.tsx on mount
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registers a `url` event listener and checks the initial URL (cold-start).
 * Returns a cleanup function to be used as the useEffect return value.
 */
export function setupDeepLinkingListeners(dispatch: AppDispatch): () => void {
  // Cold-start: app was not running when the link was tapped
  Linking.getInitialURL()
    .then(url => {
      if (url) {
        handleDeepLink(url, dispatch);
      }
    })
    .catch(() => {
      // getInitialURL can safely fail on some devices; gracefully ignore
    });

  // Warm-start / foreground: app is already open
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url, dispatch);
  });

  return () => subscription.remove();
}
