/**
 * screens/Auth/ResetPasswordScreen.tsx
 *
 * Final step in the forgot-password flow.
 * User sets a new password with their OTP as a session token.
 *
 * Flow: dispatches resetPasswordThunk →
 *       on success: slice transitions flowStep back to 'login' (with a brief
 *       success animation shown here before yielding to LoginScreen).
 *
 * Theme: all colours/spacing sourced from getTokens(mode).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import { AppDispatch } from '../../redux/Store';
import getTokens from '../../theme/tokens';
import { resetPasswordThunk, clearError } from '../../redux/authSlice';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthPasswordField from '../../components/auth/AuthPasswordField';
import AuthButton from '../../components/auth/AuthButton';

// ─────────────────────────────────────────────────────────────────────────────
// Strength meter helper
// ─────────────────────────────────────────────────────────────────────────────

type StrengthLevel = 'weak' | 'fair' | 'strong' | 'very-strong';

function measureStrength(password: string): { level: StrengthLevel; score: number } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let level: StrengthLevel = 'weak';
  if (score >= 4) level = 'very-strong';
  else if (score === 3) level = 'strong';
  else if (score === 2) level = 'fair';

  return { level, score };
}

const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
  'very-strong': 'Very Strong',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ResetPasswordScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const mode = useSelector((s: RootState) => s.theme.mode);
  const { status, errorMessage, tempUserIdentifier } = useSelector(
    (s: RootState) => s.auth
  );
  const t = getTokens(mode);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ new?: string; confirm?: string }>({});

  // Success pulse animation
  const successAnim = useRef(new Animated.Value(0)).current;
  const isSuccess = status === 'success';
  const isLoading = status === 'loading';

  useEffect(() => {
    if (!isSuccess) return;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (reduced) return;
      Animated.sequence([
        Animated.spring(successAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 10,
        }),
        Animated.delay(1500),
        Animated.timing(successAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [isSuccess, successAnim]);

  // ── Derived strength data ─────────────────────────────────────────────────
  const { level: strengthLevel, score: strengthScore } = measureStrength(newPassword);

  const strengthColor = (): string => {
    switch (strengthLevel) {
      case 'very-strong':
      case 'strong':
        return t.status.success;
      case 'fair':
        return mode === 'dark' ? '#fbbf24' : '#d97706'; // amber – not in token map, inline
      case 'weak':
      default:
        return t.status.error;
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const errors: typeof fieldErrors = {};
    if (newPassword.length < 8) errors.new = 'Password must be at least 8 characters.';
    else if (strengthLevel === 'weak') errors.new = 'Please choose a stronger password.';
    if (newPassword !== confirmPassword) errors.confirm = 'Passwords do not match.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReset = async () => {
    dispatch(clearError());
    if (!validate()) return;
    // The OTP is still required by the API – retrieved from a mock context.
    // In production: pass the actual verified OTP stored in your session/state.
    await dispatch(
      resetPasswordThunk({
        identifier: tempUserIdentifier,
        otp: '123456', // ← replace with actual OTP from verify step in production
        newPassword,
      })
    );
    // On success the slice moves flowStep → 'login'
  };

  return (
    <AuthLayout
      title="New Password"
      subtitle="Choose a strong password for your account."
    >
      {/* Success overlay */}
      {isSuccess && (
        <Animated.View
          style={[
            styles.successBanner,
            {
              backgroundColor: t.status.successSubtle,
              borderColor: t.status.success,
              borderRadius: t.shape.card,
              padding: t.spacing.md,
              marginBottom: t.spacing.lg,
              transform: [{ scale: successAnim }],
              opacity: successAnim,
            },
          ]}
        >
          <Text style={{ color: t.status.success, fontSize: t.typography.label, fontWeight: '600' }}>
            ✓  Password changed successfully! Redirecting…
          </Text>
        </Animated.View>
      )}

      {/* Redux error banner */}
      {errorMessage && !isSuccess ? (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: t.status.errorSubtle,
              borderColor: t.status.error,
              borderRadius: t.shape.card,
              padding: t.spacing.md,
              marginBottom: t.spacing.lg,
            },
          ]}
        >
          <Text style={{ color: t.status.error, fontSize: t.typography.label }}>
            {errorMessage}
          </Text>
        </View>
      ) : null}

      <AuthPasswordField
        label="New Password"
        value={newPassword}
        onChangeText={v => {
          setNewPassword(v);
          setFieldErrors(p => ({ ...p, new: undefined }));
        }}
        error={fieldErrors.new}
        textContentType="newPassword"
        returnKeyType="next"
        placeholder="At least 8 characters"
      />

      {/* Strength meter */}
      {newPassword.length > 0 && (
        <View style={[styles.strengthContainer, { marginTop: -t.spacing.sm, marginBottom: t.spacing.md }]}>
          <View style={styles.strengthBars}>
            {[1, 2, 3, 4, 5].map(bar => (
              <View
                key={bar}
                style={[
                  styles.strengthBar,
                  {
                    backgroundColor:
                      bar <= strengthScore
                        ? strengthColor()
                        : t.border.subtle,
                    borderRadius: 4,
                  },
                ]}
              />
            ))}
          </View>
          <Text
            style={{
              color: strengthColor(),
              fontSize: t.typography.caption,
              marginLeft: t.spacing.sm,
              fontWeight: '600',
            }}
          >
            {STRENGTH_LABELS[strengthLevel]}
          </Text>
        </View>
      )}

      <AuthPasswordField
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={v => {
          setConfirmPassword(v);
          setFieldErrors(p => ({ ...p, confirm: undefined }));
        }}
        error={fieldErrors.confirm}
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleReset}
        placeholder="Repeat new password"
      />

      {/* Requirements checklist */}
      <View style={[styles.requirements, { marginBottom: t.spacing.xl }]}>
        {[
          { rule: 'At least 8 characters', met: newPassword.length >= 8 },
          { rule: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
          { rule: 'Contains a number', met: /[0-9]/.test(newPassword) },
        ].map(({ rule, met }) => (
          <Text
            key={rule}
            style={{
              color: met ? t.status.success : t.text.muted,
              fontSize: t.typography.caption,
              lineHeight: 20,
            }}
          >
            {met ? '✓' : '○'} {rule}
          </Text>
        ))}
      </View>

      <AuthButton label="Reset Password" onPress={handleReset} loading={isLoading} />
    </AuthLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  successBanner: {
    borderWidth: 1,
  },
  errorBanner: {
    borderWidth: 1,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    width: 28,
    height: 4,
  },
  requirements: {
    gap: 4,
  },
});

export default ResetPasswordScreen;
