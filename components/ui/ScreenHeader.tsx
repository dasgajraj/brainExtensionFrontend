/**
 * components/ui/ScreenHeader.tsx
 *
 * Reusable header bar for all screens.
 * Consistent back button, title, optional subtitle, optional right action.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppTokens } from '../../theme/tokens';
import { IconArrowLeft, IconX } from './Icons';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  t: AppTokens;
  /** Use X icon instead of arrow (for modals / close) */
  closeStyle?: boolean;
  /** Optional element rendered on the right */
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
        activeOpacity={0.8}>
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
        <View style={s.backBtn} />
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  right: {
    minWidth: 38,
    alignItems: 'flex-end',
  },
});
