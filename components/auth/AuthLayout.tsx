/**
 * components/auth/AuthLayout.tsx
 *
 * Full-screen auth layout that wraps every auth screen.
 *
 * Responsibilities:
 *  - Renders the app's gradient background (reads existing tokens – no new colours)
 *  - Provides a safe-area-aware keyboard-avoiding scroll container
 *  - Optionally renders a back button
 *  - Fades in on mount (respects prefers-reduced-motion via AccessibilityInfo)
 *
 * Theme consumption: getTokens(mode).background.gradient / screen / text
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableOpacity,
  AccessibilityInfo,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import getTokens from '../../theme/tokens';

const { height } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AuthLayoutProps {
  children: React.ReactNode;
  /** Short screen title rendered below the optional back button */
  title?: string;
  /** Supporting copy below the title */
  subtitle?: string;
  /** When provided, renders a ← back button and calls this on press */
  onBack?: () => void;
  /** Disable scroll (e.g. OTP screen with fixed layout) */
  scrollable?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  onBack,
  scrollable = true,
}) => {
  const mode = useSelector((s: RootState) => s.theme.mode);
  const t = getTokens(mode);
  const insets = useSafeAreaInsets();

  // Mount fade-in – respects reduce-motion preference
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (reduced) {
        fadeAnim.setValue(1);
      } else {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }).start();
      }
    });
  }, [fadeAnim]);

  const containerStyle = {
    paddingTop: insets.top + t.spacing.sm,
    paddingBottom: insets.bottom + t.spacing.md,
  };

  const inner = (
    <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
      {/* Back button */}
      {onBack && (
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { marginTop: t.spacing.md }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <View
            style={[
              styles.backIconContainer,
              {
                backgroundColor: t.background.subtle,
                borderColor: t.border.default,
              },
            ]}
          >
            <Text style={[styles.backArrow, { color: t.primary.accent }]}>←</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Header */}
      {(title || subtitle) && (
        <View style={[styles.header, { marginTop: onBack ? t.spacing.lg : t.spacing.xl }]}>
          {title && (
            <Text
              style={[
                styles.title,
                {
                  color: t.text.primary,
                  fontSize: t.typography.h1,
                },
              ]}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                {
                  color: t.text.secondary,
                  fontSize: t.typography.body,
                  marginTop: t.spacing.sm,
                },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      )}

      {/* Screen content */}
      <View style={[styles.content, { marginTop: t.spacing.lg }]}>
        {children}
      </View>
    </Animated.View>
  );

  return (
    <LinearGradient colors={t.background.gradient} style={styles.gradient}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {scrollable ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, containerStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {inner}
          </ScrollView>
        ) : (
          <View style={[styles.flex, containerStyle]}>{inner}</View>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles  (only layout/structural – no colours)
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 32, // matches Onboarding1 content padding
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
  },
  header: {
    alignItems: 'flex-start',
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 44,
  },
  subtitle: {
    fontWeight: '400',
    lineHeight: 26,
  },
  content: {},
});

export default AuthLayout;
