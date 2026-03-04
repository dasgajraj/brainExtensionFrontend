/**
 * components/ui/BottomNavBar.tsx
 *
 * Material 3 NavigationBar — 5 tabs.
 * Tabs: Home · Brain · Agent (elevated FAB center) · Files · Memory
 *
 * Active indicator: pill-shaped background behind icon (Material 3 style).
 * No dot below label. Agent tab is a circular elevated FAB.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTokens } from '../../theme/tokens';
import { IconHome, IconBrain, IconFolder, IconBot, IconMemory } from './Icons';

interface Tab {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color: string }>;
  isCenter?: boolean;
}

const TABS: Tab[] = [
  { key: 'home',     label: 'Home',    icon: IconHome   },
  { key: 'brainAsk', label: 'Brain',   icon: IconBrain  },
  { key: 'agent',    label: 'Agent',   icon: IconBot,   isCenter: true },
  { key: 'files',    label: 'Files',   icon: IconFolder },
  { key: 'memory',   label: 'Memory',  icon: IconMemory },
];

interface BottomNavBarProps {
  activeTab: string;
  onTabPress: (key: string) => void;
  t: AppTokens;
}

export default function BottomNavBar({ activeTab, onTabPress, t }: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const scaleAnims = useRef(TABS.map(() => new Animated.Value(1))).current;
  const pillWidths  = useRef(TABS.map((tab) => new Animated.Value(tab.key === activeTab ? 1 : 0))).current;

  const isDark = t.text.primary === '#FFFFFF';
  const ACTIVE_BG   = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const ACTIVE_COL  = t.text.primary;
  const INACTIVE_COL = t.text.muted;

  useEffect(() => {
    TABS.forEach((tab, idx) => {
      Animated.spring(pillWidths[idx], {
        toValue: tab.key === activeTab ? 1 : 0,
        useNativeDriver: false,
        damping: 20, stiffness: 260, mass: 0.7,
      }).start();
    });
  }, [activeTab]);

  const handlePress = (key: string, index: number) => {
    Animated.sequence([
      Animated.spring(scaleAnims[index], { toValue: 0.82, useNativeDriver: true, damping: 15, stiffness: 400 }),
      Animated.spring(scaleAnims[index], { toValue: 1,    useNativeDriver: true, damping: 10, stiffness: 300 }),
    ]).start();
    onTabPress(key);
  };

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: t.background.screen,
          borderTopColor: t.border.subtle,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}>
      {TABS.map((tab, index) => {
        const active = tab.key === activeTab;
        const Icon   = tab.icon;

        /* ── Elevated center FAB (Agent) ── */
        if (tab.isCenter) {
          const fabBg        = active ? (isDark ? '#FFFFFF' : '#ffffff') : (isDark ? '#ffffff' : '#EBEBEB');
          const fabIconColor = active ? (isDark ? '#000000' : '#000000') : '#000000';
          return (
            <View key={tab.key} style={s.centerWrap}>
              <Animated.View style={{ transform: [{ scale: scaleAnims[index] }] }}>
                <TouchableOpacity
                  style={[s.fab, { backgroundColor: fabBg, borderColor: t.border.default }]}
                  onPress={() => handlePress(tab.key, index)}
                  activeOpacity={0.75}>
                  <Icon size={22} color={fabIconColor} />
                </TouchableOpacity>
              </Animated.View>
              <Text style={[s.label, { color: active ? ACTIVE_COL : INACTIVE_COL, fontWeight: active ? '700' : '400' }]}>
                {tab.label}
              </Text>
            </View>
          );
        }

        /* ── Regular tab with Material 3 pill indicator ── */
        const pillW = pillWidths[index].interpolate({ inputRange: [0, 1], outputRange: [0, 64] });

        return (
          <TouchableOpacity
            key={tab.key}
            style={s.tab}
            onPress={() => handlePress(tab.key, index)}
            activeOpacity={0.7}>
            <Animated.View style={[s.tabInner, { transform: [{ scale: scaleAnims[index] }] }]}>
              {/* Icon + pill indicator */}
              <View style={s.iconWrap}>
                <Animated.View
                  style={[
                    s.pill,
                    { width: pillW, backgroundColor: ACTIVE_BG, opacity: pillWidths[index] },
                  ]}
                />
                <Icon size={20} color={active ? ACTIVE_COL : INACTIVE_COL} />
              </View>
              <Text style={[s.label, { color: active ? ACTIVE_COL : INACTIVE_COL, fontWeight: active ? '700' : '400' }]}>
                {tab.label}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    alignItems: 'flex-start',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.07, shadowRadius: 10 },
      android: { elevation: 14 },
    }),
  },
  /* Regular tabs */
  tab:      { flex: 1, alignItems: 'center', paddingVertical: 2 },
  tabInner: { alignItems: 'center' },
  iconWrap: { width: 64, height: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  /* Material 3 pill */
  pill: { position: 'absolute', height: 32, borderRadius: 16 },
  label: { fontSize: 10, letterSpacing: 0.2 },
  /* Center FAB */
  centerWrap: { flex: 1, alignItems: 'center', paddingTop: 2 },
  fab: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    marginTop: -20,
    marginBottom: 4,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10 },
      android: { elevation: 8 },
    }),
  },
});

