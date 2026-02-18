/**
 * components/auth/AuthInput.tsx
 *
 * Reusable text input for all auth screens.
 *
 * Theme consumption:
 *  - background.input / surface
 *  - border.default / subtle
 *  - primary.focusBorder
 *  - text.primary / placeholder
 *  - typography.body / label
 *  - shape.input
 *  - status.error / errorSubtle
 *
 * No colours are hardcoded; every value comes from getTokens().
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import getTokens from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AuthInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  /** Slot for a trailing icon/action (e.g. the eye toggle in AuthPasswordField) */
  trailing?: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const AuthInput: React.FC<AuthInputProps> = ({
  label,
  error,
  trailing,
  onFocus,
  onBlur,
  ...rest
}) => {
  const mode = useSelector((s: RootState) => s.theme.mode);
  const t = getTokens(mode);

  const [isFocused, setIsFocused] = useState(false);

  // Animate border colour on focus (respects reduce-motion)
  const borderAnim = useRef(new Animated.Value(0)).current;

  const animateFocus = (focused: boolean) => {
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (reduced) {
        borderAnim.setValue(focused ? 1 : 0);
        return;
      }
      Animated.timing(borderAnim, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: false, // borderColor cannot use native driver
      }).start();
    });
  };

  const handleFocus: TextInputProps['onFocus'] = e => {
    setIsFocused(true);
    animateFocus(true);
    onFocus?.(e);
  };

  const handleBlur: TextInputProps['onBlur'] = e => {
    setIsFocused(false);
    animateFocus(false);
    onBlur?.(e);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? t.status.error : t.border.default,
      t.primary.focusBorder,
    ],
  });

  const containerBg = error ? t.status.errorSubtle : t.background.input;

  return (
    <View style={[styles.wrapper, { marginBottom: t.spacing.md }]}>
      {/* Label */}
      <Text
        style={[
          styles.label,
          {
            color: error ? t.status.error : isFocused ? t.primary.accent : t.text.secondary,
            fontSize: t.typography.label,
            marginBottom: t.spacing.xs,
            letterSpacing: t.typography.letterSpacing.wide,
          },
        ]}
      >
        {label.toUpperCase()}
      </Text>

      {/* Input row */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: containerBg,
            borderRadius: t.shape.input,
            borderColor,
            borderWidth: 1.5,
            paddingHorizontal: t.spacing.md,
          },
        ]}
      >
        <TextInput
          {...rest}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            {
              color: t.text.primary,
              fontSize: t.typography.body,
              flex: 1,
            },
          ]}
          placeholderTextColor={t.text.placeholder}
          selectionColor={t.primary.default}
        />
        {trailing && <View style={styles.trailing}>{trailing}</View>}
      </Animated.View>

      {/* Error message */}
      {error ? (
        <Text
          style={[
            styles.error,
            {
              color: t.status.error,
              fontSize: t.typography.caption,
              marginTop: t.spacing.xs,
            },
          ]}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles  (structural only)
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {},
  label: {
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  input: {
    paddingVertical: 0, // baseline alignment on Android
    fontWeight: '400',
  },
  trailing: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    fontWeight: '500',
  },
});

export default AuthInput;
