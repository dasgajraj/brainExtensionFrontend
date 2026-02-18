/**
 * screens/Auth/ForgotPasswordScreen.tsx
 *
 * Forgot-password request screen.
 *
 * Flow: User enters email → dispatch forgotPasswordThunk
 *       → on success: Redux sets flowStep = 'verify' (slice handles this)
 *
 * Theme: all colours/spacing sourced from getTokens(mode).
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import { AppDispatch } from '../../redux/Store';
import getTokens from '../../theme/tokens';
import {
  forgotPasswordThunk,
  setTempIdentifier,
  setFlowStep,
  clearError,
} from '../../redux/authSlice';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ForgotPasswordScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const mode = useSelector((s: RootState) => s.theme.mode);
  const { status, errorMessage } = useSelector((s: RootState) => s.auth);
  const t = getTokens(mode);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const isLoading = status === 'loading';

  const handleSubmit = async () => {
    dispatch(clearError());
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError(null);
    dispatch(setTempIdentifier(trimmed));
    await dispatch(forgotPasswordThunk({ email: trimmed }));
    // Slice transitions flowStep to 'verify' on success
  };

  return (
    <AuthLayout
      title={`Forgot\nPassword?`}
      subtitle="Enter your email and we'll send you a reset code."
      onBack={() => dispatch(setFlowStep('login'))}
    >
      {/* Info banner – shown when no error */}
      {!errorMessage && (
        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor: t.background.subtle,
              borderColor: t.border.default,
              borderRadius: t.shape.card,
              padding: t.spacing.md,
              marginBottom: t.spacing.lg,
            },
          ]}
        >
          <Text style={{ color: t.primary.accent, fontSize: t.typography.label, lineHeight: 20 }}>
            💡  A 6-digit code will be sent to your email address.
          </Text>
        </View>
      )}

      {/* Redux error banner */}
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

      <AuthInput
        label="Email"
        value={email}
        onChangeText={v => {
          setEmail(v);
          if (emailError) setEmailError(null);
        }}
        error={emailError}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
        textContentType="emailAddress"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        placeholder="you@example.com"
      />

      <View style={{ marginTop: t.spacing.sm }}>
        <AuthButton label="Send Reset Code" onPress={handleSubmit} loading={isLoading} />
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  infoBanner: {
    borderWidth: 1,
  },
  errorBanner: {
    borderWidth: 1,
  },
});

export default ForgotPasswordScreen;
