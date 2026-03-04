/**
 * screens/Auth/LoginScreen.tsx
 *
 * Login screen – first step of the auth flow.
 *
 * Form fields : Email · Password
 * Actions     : Login (thunk) · Navigate to Sign Up · Navigate to Forgot Password
 *
 * Theme: all colours/spacing sourced from getTokens(mode). No hardcoded values.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import { AppDispatch } from '../../redux/Store';
import getTokens from '../../theme/tokens';
import {
  loginThunk,
  setFlowStep,
  clearError,
} from '../../redux/authSlice';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthInput from '../../components/auth/AuthInput';
import AuthPasswordField from '../../components/auth/AuthPasswordField';
import AuthButton from '../../components/auth/AuthButton';

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

const validateEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Enter a valid email';

const validatePassword = (v: string) =>
  v.length >= 6 ? null : 'Password must be at least 6 characters';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const LoginScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const mode = useSelector((s: RootState) => s.theme.mode);
  const { status, errorMessage } = useSelector((s: RootState) => s.auth);
  const t = getTokens(mode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const isLoading = status === 'loading';

  const validate = () => {
    const errors: typeof fieldErrors = {};
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (emailErr) errors.email = emailErr;
    if (passErr) errors.password = passErr;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    console.log('🔐 [LoginScreen] handleLogin → validating fields', { email });
    dispatch(clearError());
    if (!validate()) {
      console.log('⚠️ [LoginScreen] handleLogin → validation failed, stopping');
      return;
    }
    console.log('🚀 [LoginScreen] handleLogin → dispatching loginThunk', { email: email.trim() });
    const result = await dispatch(loginThunk({ email: email.trim(), password }));
    if (loginThunk.rejected.match(result)) {
      console.error('❌ [LoginScreen] handleLogin ← loginThunk rejected', result.payload);
      // errorMessage is now in Redux state – AuthLayout / inline banner will show it
    } else {
      console.log('✅ [LoginScreen] handleLogin ← loginThunk fulfilled');
    }
  };

  return (
    <AuthLayout
      title={`Welcome\nBack`}
      subtitle="Sign in to your Brain Extension account."
    >
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
              marginBottom: t.spacing.md,
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
          if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: undefined }));
        }}
        error={fieldErrors.email}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
        textContentType="emailAddress"
        returnKeyType="next"
        placeholder="you@example.com"
      />

      <AuthPasswordField
        value={password}
        onChangeText={v => {
          setPassword(v);
          if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: undefined }));
        }}
        error={fieldErrors.password}
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={handleLogin}
        placeholder="••••••••"
      />

      {/* Forgot password link */}
      <TouchableOpacity
        onPress={() => {
          console.log('💭 [LoginScreen] navigate → forgotPassword');
          dispatch(setFlowStep('forgotPassword'));
        }}
        style={[styles.forgotBtn, { marginBottom: t.spacing.xl }]}
        accessibilityRole="link"
      >
        <Text
          style={{
            color: t.primary.accent,
            fontSize: t.typography.label,
            fontWeight: '600',
            textAlign: 'right',
          }}
        >
          Forgot password?
        </Text>
      </TouchableOpacity>

      <AuthButton label="Sign In" onPress={handleLogin} loading={isLoading} />

      {/* Divider */}
      <View style={[styles.divider, { marginVertical: t.spacing.xl }]}>
        <View style={[styles.dividerLine, { backgroundColor: t.border.subtle }]} />
        <Text style={{ color: t.text.muted, fontSize: t.typography.label, marginHorizontal: t.spacing.sm }}>
          or
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: t.border.subtle }]} />
      </View>

      {/* Sign up link */}
      <View style={styles.linkRow}>
        <Text style={{ color: t.text.secondary, fontSize: t.typography.body }}>
          Don't have an account?{' '}
        </Text>
        <TouchableOpacity
          onPress={() => {
            console.log('📝 [LoginScreen] navigate → signup');
            dispatch(setFlowStep('signup'));
          }}
          accessibilityRole="link"
        >
          <Text
            style={{
              color: t.primary.accent,
              fontSize: t.typography.body,
              fontWeight: '700',
            }}
          >
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  errorBanner: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingBottom: 32,
  },
});

export default LoginScreen;
