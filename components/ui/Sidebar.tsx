/**
 * components/ui/Sidebar.tsx
 *
 * Animated slide-in drawer from the left.
 * Uses RN Animated API for smooth spring transitions.
 * Contains: user info, all nav items, theme toggle, logout.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTokens } from '../../theme/tokens';
import {
  IconHome,
  IconBrain,
  IconClipboard,
  IconGlobe,
  IconEye,
  IconStar,
  IconNetwork,
  IconFolder,
  IconBot,
  IconUser,
  IconSun,
  IconMoon,
  IconLogOut,
  IconX,
  IconSettings,
  IconZap,
} from './Icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const DRAWER_W = Math.min(SCREEN_W * 0.78, 320);

export interface SidebarItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color: string }>;
  accentColor: string;
}

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (key: string) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  activeKey: string;
  t: AppTokens;
  isDark: boolean;
  displayName: string;
  email: string;
  avatarLetters: string;
  plan: string;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'home', label: 'Dashboard', icon: IconHome, accentColor: '#8b5cf6' },
  { key: 'brainAsk', label: 'Ask Brain', icon: IconBrain, accentColor: '#8b5cf6' },
  { key: 'brainResult', label: 'Brain Result', icon: IconClipboard, accentColor: '#f59e0b' },
  { key: 'translate', label: 'Translate', icon: IconGlobe, accentColor: '#a78bfa' },
  { key: 'vision', label: 'Vision', icon: IconEye, accentColor: '#10b981' },
  { key: 'dreams', label: 'Brain Dreams', icon: IconStar, accentColor: '#7c3aed' },
  { key: 'neural', label: 'Neural Graph', icon: IconNetwork, accentColor: '#ec4899' },
  { key: 'files', label: 'My Files', icon: IconFolder, accentColor: '#0ea5e9' },
  { key: 'agent', label: 'AI Agent', icon: IconBot, accentColor: '#06b6d4' },
  { key: 'profile', label: 'Profile', icon: IconUser, accentColor: '#06b6d4' },
];

export default function Sidebar({
  visible,
  onClose,
  onNavigate,
  onToggleTheme,
  onLogout,
  activeKey,
  t,
  isDark,
  displayName,
  email,
  avatarLetters,
  plan,
}: SidebarProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 260,
          mass: 0.8,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -DRAWER_W,
          useNativeDriver: true,
          damping: 22,
          stiffness: 260,
          mass: 0.8,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, overlayAnim]);

  // Always render (for animation), but pointer-events none when hidden
  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 100 }]}
      pointerEvents={visible ? 'auto' : 'none'}>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayAnim },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View
        style={[
          s.drawer,
          {
            width: DRAWER_W,
            backgroundColor: t.background.screen,
            borderRightColor: t.border.subtle,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 8,
            transform: [{ translateX: slideAnim }],
          },
        ]}>
        {/* Close button */}
        <TouchableOpacity style={[s.closeBtn, { borderColor: t.border.default }]} onPress={onClose} activeOpacity={0.8}>
          <IconX size={18} color={t.text.primary} />
        </TouchableOpacity>

        {/* User Card */}
        <View style={[s.userCard, { backgroundColor: t.primary.default + '10', borderColor: t.primary.default + '30' }]}>
          <View style={[s.avatar, { backgroundColor: t.primary.default + '25', borderColor: t.primary.default }]}>
            <Text style={[s.avatarText, { color: t.primary.accent }]}>{avatarLetters}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[s.userName, { color: t.text.primary }]} numberOfLines={1}>{displayName}</Text>
            <Text style={[s.userEmail, { color: t.text.muted }]} numberOfLines={1}>{email}</Text>
            <View style={[s.planBadge, { backgroundColor: t.primary.default + '20' }]}>
              <IconZap size={10} color={t.primary.accent} />
              <Text style={[s.planText, { color: t.primary.accent }]}>{plan}</Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={[s.divider, { backgroundColor: t.border.subtle }]} />

        {/* Nav Items */}
        <ScrollView style={s.navList} showsVerticalScrollIndicator={false}>
          <Text style={[s.sectionLabel, { color: t.text.muted }]}>NAVIGATION</Text>
          {SIDEBAR_ITEMS.map((item) => {
            const active = item.key === activeKey;
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  s.navItem,
                  active && { backgroundColor: t.primary.default + '14' },
                ]}
                onPress={() => {
                  onNavigate(item.key);
                  onClose();
                }}
                activeOpacity={0.75}>
                <View style={[s.navIconWrap, { backgroundColor: active ? item.accentColor + '20' : 'transparent' }]}>
                  <Icon size={18} color={active ? item.accentColor : t.text.muted} />
                </View>
                <Text
                  style={[
                    s.navLabel,
                    { color: active ? t.text.primary : t.text.secondary },
                    active && { fontWeight: '700' },
                  ]}>
                  {item.label}
                </Text>
                {active && <View style={[s.activeDot, { backgroundColor: item.accentColor }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Footer actions */}
        <View style={[s.divider, { backgroundColor: t.border.subtle }]} />
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.footerBtn, { backgroundColor: t.background.surface }]}
            onPress={onToggleTheme}
            activeOpacity={0.8}>
            {isDark ? <IconSun size={17} color={t.text.secondary} /> : <IconMoon size={17} color={t.text.secondary} />}
            <Text style={[s.footerBtnText, { color: t.text.secondary }]}>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.footerBtn, { backgroundColor: t.status.errorSubtle }]}
            onPress={onLogout}
            activeOpacity={0.8}>
            <IconLogOut size={17} color={t.status.error} />
            <Text style={[s.footerBtnText, { color: t.status.error }]}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRightWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800' },
  userName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  userEmail: { fontSize: 11, marginBottom: 4 },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  planText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { height: 1, marginHorizontal: 16, marginVertical: 12 },
  navList: { flex: 1, paddingHorizontal: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, paddingHorizontal: 8, marginBottom: 8, marginTop: 4 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 2,
  },
  navIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navLabel: { fontSize: 14, flex: 1 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  footer: { paddingHorizontal: 16, gap: 8 },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  footerBtnText: { fontSize: 13, fontWeight: '600' },
});
