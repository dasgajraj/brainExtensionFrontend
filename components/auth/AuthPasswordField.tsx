/**
 * components/auth/AuthPasswordField.tsx
 *
 * Wraps AuthInput to provide a show/hide password toggle.
 *
 * Theme consumption: delegated entirely to AuthInput + getTokens() for the
 * icon tint colour.  No additional hardcoded values.
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, TextInputProps } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import getTokens from '../../theme/tokens';
import AuthInput from './AuthInput';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AuthPasswordFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  label?: string;
  error?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const AuthPasswordField: React.FC<AuthPasswordFieldProps> = ({
  label = 'Password',
  error,
  ...rest
}) => {
  const mode = useSelector((s: RootState) => s.theme.mode);
  const t = getTokens(mode);

  const [visible, setVisible] = useState(false);

  const toggle = (
    <TouchableOpacity
      onPress={() => setVisible(v => !v)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: t.text.muted, letterSpacing: 0.3 }}>
        {visible ? 'HIDE' : 'SHOW'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <AuthInput
      label={label}
      error={error}
      secureTextEntry={!visible}
      trailing={toggle}
      autoCapitalize="none"
      autoCorrect={false}
      {...rest}
    />
  );
};

export default AuthPasswordField;
