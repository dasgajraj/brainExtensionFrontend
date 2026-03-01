/**
 * components/ui/AnimatedPageTransition.tsx
 *
 * Wraps a child component with a fade + translateY enter animation.
 * Runs once on mount. Uses RN Animated for 60fps native-driven transitions.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface AnimatedPageTransitionProps {
  children: React.ReactNode;
  /** Unique key — triggers re-animation when changed */
  pageKey: string;
}

export default function AnimatedPageTransition({
  children,
  pageKey,
}: AnimatedPageTransitionProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(18);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
        mass: 0.7,
      }),
    ]).start();
  }, [pageKey, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}
