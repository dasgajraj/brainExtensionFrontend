/**
 * screens/Auth/index.tsx
 *
 * Auth flow container.
 *
 * Reads `state.auth.flowStep` from Redux and renders the corresponding screen.
 * This is the single entry point App.tsx uses for the entire auth flow.
 *
 * Supported steps:
 *   login            → LoginScreen
 *   signup           → SignUpScreen
 *   forgotPassword   → ForgotPasswordScreen
 *   verify           → AuthVerificationScreen
 *   resetPassword    → ResetPasswordScreen
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import LoginScreen from './LoginScreen';
import SignUpScreen from './SignUpScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import AuthVerificationScreen from './AuthVerificationScreen';
import ResetPasswordScreen from './ResetPasswordScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const AuthContainer: React.FC = () => {
  const flowStep = useSelector((s: RootState) => s.auth.flowStep);
  console.log('🗺️ [AuthContainer] flowStep =', flowStep);

  const renderStep = () => {
    switch (flowStep) {
      case 'signup':
        return <SignUpScreen />;
      case 'forgotPassword':
        return <ForgotPasswordScreen />;
      case 'verify':
        return <AuthVerificationScreen />;
      case 'resetPassword':
        return <ResetPasswordScreen />;
      case 'login':
      default:
        return <LoginScreen />;
    }
  };

  return <View style={styles.container}>{renderStep()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AuthContainer;
