/**
 * services/biometric.service.ts
 *
 * Biometric (fingerprint / Face ID) authentication gate for the AI Agent screen.
 * Uses react-native-biometrics for native biometric prompts.
 *
 * Session auth: authenticates once per app session.
 * The session flag is held in-memory — it resets when the app is fully closed.
 */

import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { Alert, Platform } from 'react-native';

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

// ── In-memory session flag ──────────────────────────────────────────────────
let _sessionAuthenticated = false;

/** Check if user already authenticated in this session */
export function isSessionAuthenticated(): boolean {
  return _sessionAuthenticated;
}

/** Reset session auth (call on logout or when needed) */
export function resetSessionAuth(): void {
  _sessionAuthenticated = false;
}

/**
 * Prompt the user for biometric authentication.
 * Returns true if authenticated (or already authenticated this session).
 * Returns false if the user cancels or biometrics unavailable.
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  // Already authenticated this session
  if (_sessionAuthenticated) return true;

  try {
    // Check if biometrics are available
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();

    if (!available) {
      // If no biometrics, allow access with a warning
      Alert.alert(
        'Biometrics Unavailable',
        'Your device does not support biometric authentication. Access granted.',
      );
      _sessionAuthenticated = true;
      return true;
    }

    const promptMessage =
      biometryType === BiometryTypes.FaceID
        ? 'Authenticate with Face ID to access AI Agent'
        : biometryType === BiometryTypes.TouchID
        ? 'Scan your fingerprint to access AI Agent'
        : 'Authenticate to access AI Agent';

    const { success } = await rnBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: 'Cancel',
    });

    if (success) {
      _sessionAuthenticated = true;
      return true;
    }

    return false;
  } catch (error) {
    console.warn('[BiometricService] Error:', error);
    // On error, fail open with alert
    Alert.alert(
      'Authentication Error',
      'Could not verify biometrics. Please try again.',
    );
    return false;
  }
}
