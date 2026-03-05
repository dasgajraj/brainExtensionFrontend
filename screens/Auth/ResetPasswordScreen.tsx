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
import { resetPasswordThunk, setFlowStep } from '../../redux/authSlice';
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
  const { resetToken, resetStatus, resetError } = useSelector(
    (s: RootState) => s.auth,
  );
  const t = getTokens(mode);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ new?: string; confirm?: string }>({});

  // Guard: if we arrive here without a reset token AND the reset hasn't just
  // completed successfully, bounce to login. Checking resetStatus prevents the
  // guard from firing immediately after success (token is wiped on success).
  useEffect(() => {
    if (!resetToken && resetStatus !== 'success') {
      dispatch(setFlowStep('login'));
    }
  }, [resetToken, resetStatus, dispatch]);

  // Auto-navigate to login 2.5 s after a successful reset
  useEffect(() => {
    if (resetStatus !== 'success') return;
    const timer = setTimeout(() => {
      dispatch(setFlowStep('login'));
    }, 2500);
    return () => clearTimeout(timer);
  }, [resetStatus, dispatch]);

  // Success pulse animation
  const successAnim = useRef(new Animated.Value(0)).current;
  const isSuccess = resetStatus === 'success';
  const isLoading = resetStatus === 'loading';

  useEffect(() => {
    if (!isSuccess) return;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (reduced) {
        // Skip animation — snap to visible immediately
        successAnim.setValue(1);
        return;
      }
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
    if (!validate()) return;
    await dispatch(resetPasswordThunk({ newPassword }));
    // On success the slice moves flowStep → 'login' and clears resetToken
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
            Password changed successfully! Redirecting...
          </Text>
        </Animated.View>
      )}

      {/* Redux error banner */}
      {resetError && !isSuccess ? (
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
            {resetError}
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
            {met ? '+' : '-'} {rule}
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorBanner: {
    borderWidth: StyleSheet.hairlineWidth,
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
