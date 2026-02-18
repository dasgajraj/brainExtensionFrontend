/**
 * screens/Auth/SignUpScreen.tsx
 *
 * Sign-up screen – new account creation.
 *
 * Form fields : Full Name · Email · Password · Confirm Password
 * Actions     : Create Account (thunk) · Navigate back to Login
 *
 * Theme: all colours/spacing sourced from getTokens(mode).
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import { AppDispatch } from '../../redux/Store';
import getTokens from '../../theme/tokens';
import { signUpThunk, setFlowStep, clearError } from '../../redux/authSlice';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthInput from '../../components/auth/AuthInput';
import AuthPasswordField from '../../components/auth/AuthPasswordField';
import AuthButton from '../../components/auth/AuthButton';

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

const trimLen = (v: string) => v.trim().length;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (name: string, email: string, password: string, confirm: string) => {
  const errors: Record<string, string> = {};
  if (trimLen(name) < 2) errors.name = 'Enter your full name';
  if (!emailRe.test(email.trim())) errors.email = 'Enter a valid email';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (password !== confirm) errors.confirm = 'Passwords do not match';
  return errors;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const SignUpScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const mode = useSelector((s: RootState) => s.theme.mode);
  const { status, errorMessage } = useSelector((s: RootState) => s.auth);
  const t = getTokens(mode);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isLoading = status === 'loading';

  const clearField = (key: string) =>
    setFieldErrors(p => {
      const next = { ...p };
      delete next[key];
      return next;
    });

  const handleSignUp = async () => {
    dispatch(clearError());
    const errors = validate(name, email, password, confirm);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    await dispatch(signUpThunk({ name: name.trim(), email: email.trim(), password }));
  };

  return (
    <AuthLayout
      title={`Create\nAccount`}
      subtitle="Join Brain Extension and start extending your mind."
      onBack={() => dispatch(setFlowStep('login'))}
    >
      {/* Redux error banner */}
      {errorMessage ? (
        <View
          style={[
            styles.banner,
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
        label="Full Name"
        value={name}
        onChangeText={v => { setName(v); clearField('name'); }}
        error={fieldErrors.name}
        autoCapitalize="words"
        textContentType="name"
        returnKeyType="next"
        placeholder="Ada Lovelace"
      />

      <AuthInput
        label="Email"
        value={email}
        onChangeText={v => { setEmail(v); clearField('email'); }}
        error={fieldErrors.email}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
        textContentType="emailAddress"
        returnKeyType="next"
        placeholder="ada@example.com"
      />

      <AuthPasswordField
        label="Password"
        value={password}
        onChangeText={v => { setPassword(v); clearField('password'); }}
        error={fieldErrors.password}
        textContentType="newPassword"
        returnKeyType="next"
        placeholder="At least 8 characters"
      />

      <AuthPasswordField
        label="Confirm Password"
        value={confirm}
        onChangeText={v => { setConfirm(v); clearField('confirm'); }}
        error={fieldErrors.confirm}
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleSignUp}
        placeholder="Repeat password"
      />

      {/* Terms note */}
      <Text
        style={{
          color: t.text.muted,
          fontSize: t.typography.caption,
          lineHeight: 18,
          marginBottom: t.spacing.xl,
        }}
      >
        By creating an account you agree to our{' '}
        <Text style={{ color: t.primary.accent }}>Terms of Service</Text> and{' '}
        <Text style={{ color: t.primary.accent }}>Privacy Policy</Text>.
      </Text>

      <AuthButton label="Create Account" onPress={handleSignUp} loading={isLoading} />

      <View style={[styles.linkRow, { marginTop: t.spacing.xl }]}>
        <Text style={{ color: t.text.secondary, fontSize: t.typography.body }}>
          Already have an account?{' '}
        </Text>
        <TouchableOpacity
          onPress={() => dispatch(setFlowStep('login'))}
          accessibilityRole="link"
        >
          <Text
            style={{
              color: t.primary.accent,
              fontSize: t.typography.body,
              fontWeight: '700',
            }}
          >
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingBottom: 32,
  },
});

export default SignUpScreen;
