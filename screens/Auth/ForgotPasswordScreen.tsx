import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import { AppDispatch } from '../../redux/Store';
import getTokens from '../../theme/tokens';
import {
  forgotPasswordThunk,
  setFlowStep,
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
  const { resetStatus, resetError } = useSelector((s: RootState) => s.auth);
  const t = getTokens(mode);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const isLoading = resetStatus === 'loading';
  const isSuccess = resetStatus === 'success';

  const openEmailApp = () => {
    if (Platform.OS === 'android') {
      Linking.openURL(
        'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_EMAIL;end',
      ).catch(() => Linking.openURL('mailto:').catch(() => {}));
    } else {
      Linking.canOpenURL('googlegmail://')
        .then(supported =>
          Linking.openURL(supported ? 'googlegmail://' : 'message:'),
        )
        .catch(() => Linking.openURL('message:').catch(() => {}));
    }
  };

  const handleSubmit = async () => {
    const trimmed = email.trim();
    console.log('📧 [ForgotPasswordScreen] handleSubmit → validating email', { email: trimmed });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      console.log('⚠️ [ForgotPasswordScreen] handleSubmit → invalid email format');
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError(null);
    console.log('🚀 [ForgotPasswordScreen] handleSubmit → dispatching forgotPasswordThunk', { email: trimmed });
    const result = await dispatch(forgotPasswordThunk({ email: trimmed }));
    if (forgotPasswordThunk.fulfilled.match(result)) {
      console.log('✅ [ForgotPasswordScreen] handleSubmit ← fulfilled, opening email app');
      openEmailApp();
    } else {
      console.error('❌ [ForgotPasswordScreen] handleSubmit ← rejected', result.payload);
    }
  };

  // ── Success state — generic message (no email-existence confirmation) ──────
  if (isSuccess) {
    return (
      <AuthLayout
        title={`Check Your\nEmail`}
        subtitle="We've sent instructions to reset your password."
        onBack={() => dispatch(setFlowStep('login'))}
      >
        <View
          style={[
            styles.successBanner,
            {
              backgroundColor: t.status.successSubtle,
              borderColor: t.status.success,
              borderRadius: t.shape.card,
              padding: t.spacing.lg,
              marginBottom: t.spacing.lg,
            },
          ]}
        >
          <Text
            style={{
              color: t.status.success,
              fontSize: t.typography.label,
              lineHeight: 22,
              fontWeight: '600',
            }}
          >
            If an account exists with that email, a reset link has been sent.
          </Text>
          <Text
            style={{
              color: t.text.secondary,
              fontSize: t.typography.caption,
              lineHeight: 20,
              marginTop: t.spacing.sm,
            }}
          >
            Tap the link in your email to set a new password. Check your spam folder if you don't see it.
          </Text>
        </View>

        <AuthButton
          label="Open Email App"
          onPress={openEmailApp}
          loading={false}
        />

        <View style={{ marginTop: t.spacing.sm }}>
          <AuthButton
            label="Back to Login"
            onPress={() => dispatch(setFlowStep('login'))}
            loading={false}
          />
        </View>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={`Forgot\nPassword?`}
      subtitle="Enter your email and we'll send you a reset link."
      onBack={() => dispatch(setFlowStep('login'))}
    >
      {/* Info banner – shown when no error */}
      {!resetError && (
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
            A reset link will be sent to your email. Tap it to set a new password.
          </Text>
        </View>
      )}

      {/* Reset-flow error banner */}
      {resetError ? (
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
        <AuthButton label="Send Reset Link" onPress={handleSubmit} loading={isLoading} />
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  infoBanner: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorBanner: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  successBanner: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default ForgotPasswordScreen;
