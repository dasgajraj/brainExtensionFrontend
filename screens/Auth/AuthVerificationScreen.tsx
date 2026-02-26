/**
 * screens/Auth/AuthVerificationScreen.tsx
 *
 * OTP / code verification screen.
 *
 * Renders 6 individual single-character inputs for the OTP code.
 * Auto-advances focus on each keystroke and auto-submits when all 6 digits
 * are entered.
 *
 * Mock OTP: 123456
 *
 * Theme: all colours/spacing sourced from getTokens(mode).
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import { AppDispatch } from '../../redux/Store';
import getTokens from '../../theme/tokens';
import {
  verifyOtpThunk,
  verifyRequestThunk,
  forgotPasswordThunk,
  setFlowStep,
  clearError,
} from '../../redux/authSlice';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthButton from '../../components/auth/AuthButton';

// ─────────────────────────────────────────────────────────────────────────────
// OTP digit count
// ─────────────────────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const AuthVerificationScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const mode = useSelector((s: RootState) => s.theme.mode);
  const { status, errorMessage, tempUserIdentifier, verifyPurpose } = useSelector(
    (s: RootState) => s.auth
  );
  const t = getTokens(mode);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0); // starts at 0; set to 30 after first send
  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  // Shake animation for error state
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const isLoading = status === 'loading';

  // ── Auto-send code on mount (email verification flow only) ───────────────
  useEffect(() => {
    if (verifyPurpose === 'email') {      console.log('📨 [AuthVerificationScreen] mount — auto-dispatching verifyRequestThunk for email verification');      dispatch(verifyRequestThunk());
      setResendCooldown(30);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Countdown for resend code ─────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ── Shake on error ────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'error') return;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (reduced) return;
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    });
  }, [status, shakeAnim]);

  // ── Input handling ────────────────────────────────────────────────────────
  const handleDigitChange = (value: string, index: number) => {
    dispatch(clearError());
    // Accept only numeric characters, take the last typed char
    const clean = value.replace(/[^0-9]/g, '').slice(-1);

    const updated = [...digits];
    updated[index] = clean;
    setDigits(updated);

    if (clean && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when last digit is entered
    if (clean && index === OTP_LENGTH - 1) {
      const code = [...updated].join('');
      if (code.length === OTP_LENGTH) {
        submitOtp(code);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const updated = [...digits];
      updated[index - 1] = '';
      setDigits(updated);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const submitOtp = (code?: string) => {
    const otp = code ?? digits.join('');
    if (otp.length < OTP_LENGTH) {
      console.log('⚠️ [AuthVerificationScreen] submitOtp → incomplete OTP, waiting for all digits');
      return;
    }
    console.log('🔢 [AuthVerificationScreen] submitOtp → dispatching verifyOtpThunk', { identifier: tempUserIdentifier, otp: '**masked**', purpose: verifyPurpose });
    dispatch(verifyOtpThunk({ identifier: tempUserIdentifier, otp }));
    // Slice transitions flowStep → 'resetPassword' on success
  };

  const handleResend = () => {
    console.log('🔁 [AuthVerificationScreen] handleResend → resending OTP', { purpose: verifyPurpose, identifier: tempUserIdentifier });
    setDigits(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
    setResendCooldown(30);
    if (verifyPurpose === 'email') {
      console.log('📨 [AuthVerificationScreen] handleResend → dispatching verifyRequestThunk');
      dispatch(verifyRequestThunk());
    } else {
      console.log('🔑 [AuthVerificationScreen] handleResend → dispatching forgotPasswordThunk');
      dispatch(forgotPasswordThunk({ email: tempUserIdentifier }));
    }
  };

  return (
    <AuthLayout
      title="Verify Email"
      subtitle={`A 6-digit code was sent to\n${tempUserIdentifier || 'your email'}.`}
      onBack={() => dispatch(setFlowStep(verifyPurpose === 'email' ? 'signup' : 'forgotPassword'))}
      scrollable={false}
    >
      {/* Error message */}
      {errorMessage ? (
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

      {/* OTP inputs */}
      <Animated.View
        style={[
          styles.otpRow,
          { marginBottom: t.spacing.xl, transform: [{ translateX: shakeAnim }] },
        ]}
      >
        {digits.map((digit, i) => {
          const isFocused = focusedIndex === i;
          const hasError = status === 'error';
          return (
            <TextInput
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              value={digit}
              onChangeText={v => handleDigitChange(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              onFocus={() => setFocusedIndex(i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              style={[
                styles.otpCell,
                {
                  color: t.text.primary,
                  backgroundColor: t.background.input,
                  borderColor: hasError
                    ? t.status.error
                    : isFocused
                    ? t.primary.focusBorder
                    : t.border.default,
                  borderRadius: t.shape.input,
                  fontSize: t.typography.h2,
                },
              ]}
              accessibilityLabel={`Digit ${i + 1} of ${OTP_LENGTH}`}
            />
          );
        })}
      </Animated.View>

      <AuthButton
        label="Verify Code"
        onPress={() => submitOtp()}
        loading={isLoading}
        disabled={digits.join('').length < OTP_LENGTH}
      />

      {/* Resend */}
      <View style={[styles.resendRow, { marginTop: t.spacing.xl }]}>
        <Text style={{ color: t.text.muted, fontSize: t.typography.label }}>
          Didn't receive a code?{' '}
        </Text>
        {resendCooldown > 0 ? (
          <Text style={{ color: t.text.muted, fontSize: t.typography.label }}>
            Resend in {resendCooldown}s
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResend} accessibilityRole="button">
            <Text
              style={{
                color: t.primary.accent,
                fontSize: t.typography.label,
                fontWeight: '700',
              }}
            >
              Resend
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </AuthLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpCell: {
    width: 48,
    height: 60,
    borderWidth: 1.5,
    textAlign: 'center',
    fontWeight: '700',
  },
  errorBanner: {
    borderWidth: 1,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AuthVerificationScreen;
