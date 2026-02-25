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

const CUSTOM_SCHEME_PATTERN =
  /^brainextension:\/\/auth\/reset-password\/([A-Za-z0-9\-_.~%+=]{8,512})$/;

const HTTPS_QUERY_PATTERN =
  /^https:\/\/brain-extension-exng\.onrender\.com\/auth\/reset-password-bridge(?:\/[^?]*)?\?(?:.*&)?token=([A-Za-z0-9\-_.~%+=]{8,512})/;

const HTTPS_PATH_PATTERN =
  /^https:\/\/brain-extension-exng\.onrender\.com\/auth\/reset-password-bridge\/([A-Za-z0-9\-_.~%+=]{8,512})$/;

export function parseResetToken(url: string): string | null {
  const trimmed = url.trim();

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
    // ignore malformed input
  }

  return null;
}

export function handleDeepLink(url: string, dispatch: AppDispatch): void {
  const token = parseResetToken(url);
  if (token) {
    dispatch(setResetToken(token));
  } else {
    dispatch(setFlowStep('login'));
  }
}

export function setupDeepLinkingListeners(dispatch: AppDispatch): () => void {
  Linking.getInitialURL()
    .then(url => { if (url) handleDeepLink(url, dispatch); })
    .catch(() => {});

  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url, dispatch);
  });

  return () => subscription.remove();
}
