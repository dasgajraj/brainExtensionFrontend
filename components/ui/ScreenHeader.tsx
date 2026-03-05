/**
 * components/ui/ScreenHeader.tsx
 *
 * Premium reusable header bar. Clean, minimal, tactile.
 * Back button with subtle surface tint, centered title, optional right action.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AppTokens } from '../../theme/tokens';
import { IconArrowLeft, IconX } from './Icons';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  t: AppTokens;
  closeStyle?: boolean;
  rightElement?: React.ReactNode;
}

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  t,
  closeStyle,
  rightElement,
}: ScreenHeaderProps) {
  const BackIcon = closeStyle ? IconX : IconArrowLeft;
  return (
    <View style={[s.wrap, { borderBottomColor: t.border.subtle }]}>
      <TouchableOpacity
        style={[
          s.backBtn,
          {
            backgroundColor: t.background.surface,
            borderColor: t.border.default,
          },
        ]}
        onPress={onBack}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <BackIcon size={18} color={t.text.primary} />
      </TouchableOpacity>
      <View style={s.center}>
        <Text style={[s.title, { color: t.text.primary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[s.subtitle, { color: t.text.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightElement ? (
        <View style={s.right}>{rightElement}</View>
      ) : (
        <View style={s.placeholder} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  center: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  right: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 40,
  },
});
