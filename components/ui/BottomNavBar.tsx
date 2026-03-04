/**
 * components/ui/BottomNavBar.tsx
 *
 * Premium floating bottom navigation bar.
 * Glass-morphism effect, smooth spring animations, center FAB.
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
  const pillWidths = useRef(TABS.map((tab) => new Animated.Value(tab.key === activeTab ? 1 : 0))).current;
  const fabRotate = useRef(new Animated.Value(0)).current;

  const isDark = t.text.primary === '#FFFFFF';
  const ACTIVE_BG   = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';
  const ACTIVE_COL  = t.text.primary;
  const INACTIVE_COL = t.text.muted;

  useEffect(() => {
    TABS.forEach((tab, idx) => {
      Animated.spring(pillWidths[idx], {
        toValue: tab.key === activeTab ? 1 : 0,
        useNativeDriver: false,
        damping: 22,
        stiffness: 280,
        mass: 0.6,
      }).start();
    });
  }, [activeTab]);

  const handlePress = (key: string, index: number) => {
    Animated.sequence([
      Animated.spring(scaleAnims[index], {
        toValue: 0.85,
        useNativeDriver: true,
        damping: 15,
        stiffness: 400,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 280,
      }),
    ]).start();

    if (TABS[index].isCenter) {
      Animated.sequence([
        Animated.timing(fabRotate, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(fabRotate, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }

    onTabPress(key);
  };

  const fabSpin = fabRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg'],
  });

  return (
    <View style={[s.outerWrap, { paddingBottom: Math.max(insets.bottom, 4) }]}>
      <View
        style={[
          s.container,
          {
            backgroundColor: isDark ? 'rgba(12,12,12,0.92)' : 'rgba(255,255,255,0.94)',
            borderColor: t.border.subtle,
          },
        ]}>
        {TABS.map((tab, index) => {
          const active = tab.key === activeTab;
          const Icon = tab.icon;

          if (tab.isCenter) {
            const fabBg = active
              ? (isDark ? '#FFFFFF' : '#000000')
              : (isDark ? '#1A1A1A' : '#F0F0F0');
            const fabIconColor = active
              ? (isDark ? '#000000' : '#FFFFFF')
              : (isDark ? '#999999' : '#666666');
            return (
              <View key={tab.key} style={s.centerWrap}>
                <Animated.View style={{
                  transform: [{ scale: scaleAnims[index] }, { rotate: fabSpin }],
                }}>
                  <TouchableOpacity
                    style={[s.fab, {
                      backgroundColor: fabBg,
                      ...Platform.select({
                        ios: {
                          shadowColor: active ? (isDark ? '#fff' : '#000') : 'transparent',
                          shadowOffset: { width: 0, height: active ? 6 : 2 },
                          shadowOpacity: active ? 0.25 : 0.08,
                          shadowRadius: active ? 16 : 6,
                        },
                        android: { elevation: active ? 12 : 4 },
                      }),
                    }]}
                    onPress={() => handlePress(tab.key, index)}
                    activeOpacity={0.75}>
                    <Icon size={22} color={fabIconColor} />
                  </TouchableOpacity>
                </Animated.View>
                <Text style={[s.label, {
                  color: active ? ACTIVE_COL : INACTIVE_COL,
                  fontWeight: active ? '700' : '500',
                  marginTop: 6,
                }]}>
                  {tab.label}
                </Text>
              </View>
            );
          }

          const pillW = pillWidths[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, 56],
          });

          return (
            <TouchableOpacity
              key={tab.key}
              style={s.tab}
              onPress={() => handlePress(tab.key, index)}
              activeOpacity={0.7}>
              <Animated.View style={[s.tabInner, { transform: [{ scale: scaleAnims[index] }] }]}>
                <View style={s.iconWrap}>
                  <Animated.View
                    style={[s.pill, {
                      width: pillW,
                      backgroundColor: ACTIVE_BG,
                      opacity: pillWidths[index],
                    }]}
                  />
                  <Icon size={20} color={active ? ACTIVE_COL : INACTIVE_COL} />
                </View>
                <Text style={[s.label, {
                  color: active ? ACTIVE_COL : INACTIVE_COL,
                  fontWeight: active ? '700' : '500',
                }]}>
                  {tab.label}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 12,
  },
  container: {
    flexDirection: 'row',
    borderRadius: 28,
    borderWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'flex-start',
    marginBottom: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
    }),
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  tabInner: { alignItems: 'center' },
  iconWrap: { width: 56, height: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  pill: { position: 'absolute', height: 30, borderRadius: 15 },
  label: { fontSize: 10, letterSpacing: 0.3 },
  centerWrap: { flex: 1, alignItems: 'center' },
  fab: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -22,
  },
});

