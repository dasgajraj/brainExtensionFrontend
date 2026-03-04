/**
 * components/ui/Sidebar.tsx
 *
 * Premium slide-in drawer — clean glass-morphism style.
 * Spring animations, minimal layout, premium user card.
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
  Platform,
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
  IconZap,
  IconMemory,
} from './Icons';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = Math.min(SCREEN_W * 0.82, 340);

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
  { key: 'memory', label: 'Memory', icon: IconMemory, accentColor: '#14b8a6' },
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
          damping: 24,
          stiffness: 300,
          mass: 0.7,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -DRAWER_W,
          useNativeDriver: true,
          damping: 24,
          stiffness: 300,
          mass: 0.7,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, overlayAnim]);

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 100 }]}
      pointerEvents={visible ? 'auto' : 'none'}>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.55)', opacity: overlayAnim },
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
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateX: slideAnim }],
          },
        ]}>
        {/* Close button */}
        <TouchableOpacity
          style={[s.closeBtn, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
          onPress={onClose}
          activeOpacity={0.7}>
          <IconX size={16} color={t.text.primary} />
        </TouchableOpacity>

        {/* User Card */}
        <TouchableOpacity
          style={[s.userCard, {
            backgroundColor: t.primary.tint,
            borderColor: t.border.default,
          }]}
          onPress={() => { onNavigate('profile'); onClose(); }}
          activeOpacity={0.7}>
          <View style={[s.avatar, { backgroundColor: t.primary.default + '15', borderColor: t.primary.default + '40' }]}>
            <Text style={[s.avatarText, { color: t.primary.accent }]}>{avatarLetters}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[s.userName, { color: t.text.primary }]} numberOfLines={1}>{displayName}</Text>
            <Text style={[s.userEmail, { color: t.text.muted }]} numberOfLines={1}>{email}</Text>
            <View style={[s.planBadge, { backgroundColor: t.primary.default + '12' }]}>
              <IconZap size={9} color={t.primary.accent} />
              <Text style={[s.planText, { color: t.primary.accent }]}>{plan}</Text>
            </View>
          </View>
        </TouchableOpacity>

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
                  active && { backgroundColor: item.accentColor + '12' },
                ]}
                onPress={() => { onNavigate(item.key); onClose(); }}
                activeOpacity={0.65}>
                <View style={[
                  s.navIconWrap,
                  { backgroundColor: active ? item.accentColor + '18' : 'transparent' },
                ]}>
                  <Icon size={17} color={active ? item.accentColor : t.text.muted} />
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

        {/* Footer */}
        <View style={[s.divider, { backgroundColor: t.border.subtle }]} />
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.footerBtn, { backgroundColor: t.background.surface }]}
            onPress={onToggleTheme}
            activeOpacity={0.7}>
            {isDark ? <IconSun size={16} color={t.text.secondary} /> : <IconMoon size={16} color={t.text.secondary} />}
            <Text style={[s.footerBtnText, { color: t.text.secondary }]}>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.footerBtn, { backgroundColor: t.status.errorSubtle }]}
            onPress={onLogout}
            activeOpacity={0.7}>
            <IconLogOut size={16} color={t.status.error} />
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
    borderRightWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: { elevation: 24 },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 12,
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
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800' },
  userName: { fontSize: 16, fontWeight: '700', marginBottom: 2, letterSpacing: -0.2 },
  userEmail: { fontSize: 12, marginBottom: 6 },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16, marginVertical: 14 },
  navList: { flex: 1, paddingHorizontal: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, paddingHorizontal: 8, marginBottom: 10, marginTop: 4 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 2,
  },
  navIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  navLabel: { fontSize: 14, flex: 1, letterSpacing: 0.1 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  footer: { paddingHorizontal: 16, gap: 8 },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  footerBtnText: { fontSize: 14, fontWeight: '600' },
});
