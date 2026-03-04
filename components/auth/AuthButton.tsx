/**
 * components/auth/AuthButton.tsx
 *
 * Primary CTA button used throughout the auth flow.
 *
 * Variants:
 *  - "primary"  → filled with theme primary colour (default)
 *  - "ghost"    → transparent with primary-coloured label / border
 *  - "danger"   → filled with status.error colour (e.g. "Delete account")
 *
 * Loading state:
 *  - Disables interaction and shows a simple animated dot-pulse indicator.
 *
 * Theme consumption:
 *  - primary.default / accent / shadow
 *  - text.onPrimary / text.primary
 *  - status.error
 *  - border.default
 *  - shape.button
 *  - spacing.md
 *  - typography.body
 */

import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
  ActivityIndicator,
  AccessibilityInfo,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import getTokens from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const AuthButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
}) => {
  const mode = useSelector((s: RootState) => s.theme.mode);
  const t = getTokens(mode);

  // Press-scale micro-interaction
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (reduced) return;
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 40,
        bounciness: 4,
      }).start();
    });
  };

  const handlePressOut = () => {
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (reduced) return;
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 4,
      }).start();
    });
  };

  // ── Derive surface & text colours from variant ────────────────────────────
  let backgroundColor: string;
  let labelColor: string;
  let borderColor: string | undefined;

  switch (variant) {
    case 'ghost':
      backgroundColor = 'transparent';
      labelColor = t.primary.accent;
      borderColor = t.border.default;
      break;
    case 'danger':
      backgroundColor = t.status.error;
      labelColor = '#ffffff';
      borderColor = undefined;
      break;
    default: // 'primary'
      backgroundColor = t.primary.default;
      labelColor = t.text.onPrimary;
      borderColor = undefined;
  }

  const isInteractive = !loading && !disabled;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        fullWidth && styles.fullWidth,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        onPress={isInteractive ? onPress : undefined}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !isInteractive, busy: loading }}
        style={[
          styles.button,
          {
            backgroundColor: disabled ? t.background.subtle : backgroundColor,
            borderRadius: t.shape.button,
            paddingVertical: t.spacing.md,
            paddingHorizontal: t.spacing.xl,
            borderWidth: borderColor ? StyleSheet.hairlineWidth : 0,
            borderColor: borderColor ?? 'transparent',
            // Elevation / shadow (matches Onboarding1 nextButton shadow values)
            shadowColor: variant === 'primary' ? t.primary.shadow : 'transparent',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: variant === 'primary' ? 0.4 : 0,
            shadowRadius: 16,
            elevation: variant === 'primary' ? 8 : 0,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={labelColor}
            accessibilityLabel="Loading"
          />
        ) : (
          <Text
            style={[
              styles.label,
              {
                color: disabled ? t.text.muted : labelColor,
                fontSize: t.typography.body,
              },
            ]}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles  (structural / layout only)
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {},
  fullWidth: {
    alignSelf: 'stretch',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});

export default AuthButton;
