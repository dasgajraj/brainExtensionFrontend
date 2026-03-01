/**
 * components/ui/BottomNavBar.tsx
 *
 * Persistent bottom navigation bar with animated active indicator.
 * 5 tabs: Home, Brain, Files, Agent, Profile.
 * Uses RN Animated for smooth spring-based tab transitions.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTokens } from '../../theme/tokens';
import {
  IconHome,
  IconBrain,
  IconFolder,
  IconBot,
  IconUser,
} from './Icons';

const { width: SCREEN_W } = Dimensions.get('window');

interface Tab {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color: string }>;
}

const TABS: Tab[] = [
  { key: 'home', label: 'Home', icon: IconHome },
  { key: 'brainAsk', label: 'Brain', icon: IconBrain },
  { key: 'files', label: 'Files', icon: IconFolder },
  { key: 'agent', label: 'Agent', icon: IconBot },
  { key: 'profile', label: 'Profile', icon: IconUser },
];

interface BottomNavBarProps {
  activeTab: string;
  onTabPress: (key: string) => void;
  t: AppTokens;
}

export default function BottomNavBar({ activeTab, onTabPress, t }: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const TAB_W = SCREEN_W / TABS.length;
  const activeIndex = TABS.findIndex(tab => tab.key === activeTab);

  const indicatorAnim = useRef(new Animated.Value(activeIndex >= 0 ? activeIndex * TAB_W : 0)).current;
  const scaleAnims = useRef(TABS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    if (activeIndex >= 0) {
      Animated.spring(indicatorAnim, {
        toValue: activeIndex * TAB_W,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
        mass: 0.6,
      }).start();
    }
  }, [activeIndex, indicatorAnim, TAB_W]);

  const handlePress = (key: string, index: number) => {
    // Bounce animation
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
        damping: 10,
        stiffness: 300,
      }),
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
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}>
      {/* Animated indicator line */}
      <Animated.View
        style={[
          s.indicator,
          {
            width: TAB_W * 0.4,
            backgroundColor: t.primary.default,
            transform: [{ translateX: Animated.add(indicatorAnim, TAB_W * 0.3) }],
          },
        ]}
      />

      {TABS.map((tab, index) => {
        const active = tab.key === activeTab;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.key}
            style={s.tab}
            onPress={() => handlePress(tab.key, index)}
            activeOpacity={0.7}>
            <Animated.View
              style={[
                s.tabInner,
                { transform: [{ scale: scaleAnims[index] }] },
              ]}>
              <View
                style={[
                  s.iconContainer,
                  active && { backgroundColor: t.primary.default + '14' },
                ]}>
                <Icon
                  size={20}
                  color={active ? t.primary.default : t.text.muted}
                />
              </View>
              <Text
                style={[
                  s.label,
                  {
                    color: active ? t.primary.default : t.text.muted,
                    fontWeight: active ? '700' : '500',
                  },
                ]}>
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
    borderTopWidth: 1,
    paddingTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
