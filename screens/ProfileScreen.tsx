import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/RootReducer';
import { AppDispatch } from '../redux/Store';
import { getTokens } from '../theme/tokens';
import { logoutThunk } from '../store/auth/auth.thunks';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type TokensType = ReturnType<typeof getTokens>;

function SectionHeader({ title, t }: { title: string; t: TokensType }) {
  return (
    <View style={sectionHeaderStyles.wrap}>
      <Text style={[sectionHeaderStyles.title, { color: t.text.muted }]}>{title}</Text>
    </View>
  );
}
const sectionHeaderStyles = StyleSheet.create({
  wrap: { paddingBottom: 8, marginBottom: 4, marginTop: 22 },
  title: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase' },
});

function InfoRow({
  label,
  value,
  mono = false,
  t,
}: {
  label: string;
  value: string | boolean | null | undefined;
  mono?: boolean;
  t: TokensType;
}) {
  const display =
    value === null || value === undefined
      ? '—'
      : typeof value === 'boolean'
      ? value
        ? 'Yes'
        : 'No'
      : String(value) || '—';

  const valueColor =
    typeof value === 'boolean'
      ? value
        ? t.status.success
        : t.status.error
      : t.text.primary;

  return (
    <View style={[infoRowStyles.row, { borderBottomColor: t.border.subtle }]}>
      <Text style={[infoRowStyles.label, { color: t.text.muted }]}>{label}</Text>
      <Text
        style={[
          infoRowStyles.value,
          { color: valueColor, fontFamily: mono ? 'monospace' : undefined },
        ]}
        numberOfLines={mono ? 2 : 1}
        ellipsizeMode="middle">
        {display}
      </Text>
    </View>
  );
}
const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 13, flex: 1, letterSpacing: 0.1 },
  value: { fontSize: 13, fontWeight: '600', flex: 1.4, textAlign: 'right', letterSpacing: -0.1 },
});

function BadgeRow({ label, items, t }: { label: string; items: string[]; t: TokensType }) {
  return (
    <View style={[badgeRowStyles.wrap, { borderBottomColor: t.border.subtle }]}>
      <Text style={[badgeRowStyles.label, { color: t.text.muted }]}>{label}</Text>
      <View style={badgeRowStyles.badges}>
        {items.length === 0 ? (
          <Text style={[badgeRowStyles.empty, { color: t.text.muted }]}>—</Text>
        ) : (
          items.map(item => (
            <View
              key={item}
              style={[badgeRowStyles.badge, { backgroundColor: t.primary.default + '22', borderColor: t.border.default }]}>
              <Text style={[badgeRowStyles.badgeText, { color: t.primary.accent }]}>{item}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
const badgeRowStyles = StyleSheet.create({
  wrap: {
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 13, marginBottom: 10, letterSpacing: 0.1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  empty: { fontSize: 13 },
});

function SettingChip({
  label,
  enabled,
  t,
}: {
  label: string;
  enabled?: boolean;
  t: TokensType;
}) {
  const on = enabled ?? false;
  return (
    <View
      style={[
        settingChipStyles.chip,
        {
          backgroundColor: on ? t.status.success + '1A' : t.background.screen,
          borderColor: on ? t.status.success + '70' : t.border.subtle,
        },
      ]}>
      <View style={[settingChipStyles.dot, { backgroundColor: on ? t.status.success : t.text.muted + '60' }]} />
      <Text style={[settingChipStyles.label, { color: on ? t.status.success : t.text.muted }]}>
        {label}
      </Text>
    </View>
  );
}
const settingChipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    width: '47%',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: 12, fontWeight: '600', flexShrink: 1, letterSpacing: 0.1 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

interface ProfileScreenProps {
  onBack: () => void;
}

function ProfileScreen({ onBack }: ProfileScreenProps) {
  const dispatch = useDispatch<AppDispatch>();
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const t = getTokens(themeMode);

  // ── Auth state from Redux ─────────────────────────────────────────────────
  const user = useSelector((state: RootState) => state.auth.user);
  const displayName = useSelector((state: RootState) => state.auth.displayName);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => dispatch(logoutThunk() as any),
      },
    ]);
  };

  return (
    <SafeAreaView edges={[]} style={[styles.safe, { backgroundColor: t.background.screen }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={t.background.screen}
      />

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { borderBottomColor: t.border.subtle }]}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            {
              backgroundColor: t.background.elevated,
              ...Platform.select({
                ios: { shadowColor: t.shadow.card.color, shadowOffset: { width: 0, height: 1 }, shadowOpacity: t.shadow.card.opacity * 0.5, shadowRadius: 3 },
                android: { elevation: 2 },
              }),
            },
          ]}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.75}>
          <Text style={[styles.backIcon, { color: t.text.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: t.text.primary }]}>Profile</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* ── Avatar + Name Hero ── */}
        <View style={styles.hero}>
          <View style={[
            styles.avatarCircle,
            {
              backgroundColor: t.primary.tint,
              borderColor: t.border.strong,
              ...Platform.select({
                ios: { shadowColor: t.shadow.elevated.color, shadowOffset: t.shadow.elevated.offset, shadowOpacity: t.shadow.elevated.opacity * 0.5, shadowRadius: 12 },
                android: { elevation: 6 },
              }),
            },
          ]}>
            <Text style={[styles.avatarText, { color: t.text.primary }]}>
              {initials(user?.name ?? displayName)}
            </Text>
          </View>
          <Text style={[styles.heroName, { color: t.text.primary }]}>
            {user?.name ?? displayName ?? 'Unknown'}
          </Text>
          <Text style={[styles.heroEmail, { color: t.text.secondary }]}>
            {user?.email ?? '—'}
          </Text>
          <View style={[styles.planBadge, { backgroundColor: t.background.elevated, borderColor: t.border.default }]}>
            <Text style={[styles.planText, { color: t.text.primary }]}>
              {user?.plan ?? 'free'} plan
            </Text>
          </View>
        </View>

        {/* ── User Info ── */}
        <View style={[
          styles.card,
          {
            backgroundColor: t.background.surface,
            borderColor: t.border.subtle,
            ...Platform.select({
              ios: { shadowColor: t.shadow.card.color, shadowOffset: t.shadow.card.offset, shadowOpacity: t.shadow.card.opacity, shadowRadius: t.shadow.card.radius },
              android: { elevation: t.shadow.card.elevation },
            }),
          },
        ]}>
          <SectionHeader title="Account Info" t={t} />
          <InfoRow label="Full Name" value={user?.name} t={t} />
          <InfoRow label="Email" value={user?.email} t={t} />
          <InfoRow label="Email Verified" value={user?.emailVerified} t={t} />
          <InfoRow label="Plan" value={user?.plan ?? 'free'} t={t} />
          <InfoRow label="Member Since" value={formatDate(user?.createdAt)} t={t} />
          <BadgeRow label="Roles" items={user?.roles ?? []} t={t} />
        </View>

        {/* ── Analytics ── */}
        <View style={[
          styles.card,
          {
            backgroundColor: t.background.surface,
            borderColor: t.border.subtle,
            ...Platform.select({
              ios: { shadowColor: t.shadow.card.color, shadowOffset: t.shadow.card.offset, shadowOpacity: t.shadow.card.opacity, shadowRadius: t.shadow.card.radius },
              android: { elevation: t.shadow.card.elevation },
            }),
          },
        ]}>
          <SectionHeader title="Analytics" t={t} />
          <InfoRow label="Total Memories" value={String(user?.analytics?.totalMemories ?? 0)} t={t} />
          <InfoRow label="Total Files" value={String(user?.analytics?.totalFiles ?? 0)} t={t} />
          <InfoRow label="Streak Days" value={String(user?.analytics?.streakDays ?? 0)} t={t} />
          <InfoRow label="Last Login" value={formatDate(user?.analytics?.lastLogin)} t={t} />
        </View>

        {/* ── Settings ── */}
        <View style={[
          styles.card,
          {
            backgroundColor: t.background.surface,
            borderColor: t.border.subtle,
            ...Platform.select({
              ios: { shadowColor: t.shadow.card.color, shadowOffset: t.shadow.card.offset, shadowOpacity: t.shadow.card.opacity, shadowRadius: t.shadow.card.radius },
              android: { elevation: t.shadow.card.elevation },
            }),
          },
        ]}>
          <SectionHeader title="Settings" t={t} />
          <View style={styles.settingsGrid}>
            <SettingChip label="Memory" enabled={user?.settings?.memoryEnabled} t={t} />
            <SettingChip label="Vision" enabled={user?.settings?.visionEnabled} t={t} />
            <SettingChip label="Notifications" enabled={user?.settings?.notificationsEnabled} t={t} />
            <SettingChip label="Reasoning" enabled={user?.settings?.reasoningEnabled} t={t} />
            <SettingChip label="Auto Tagging" enabled={user?.settings?.autoTagging} t={t} />
            <SettingChip label="Personalized LLM" enabled={user?.settings?.personalizedLLM} t={t} />
          </View>
        </View>

        {/* ── Cognitive Profile ── */}
        <View style={[
          styles.card,
          {
            backgroundColor: t.background.surface,
            borderColor: t.border.subtle,
            ...Platform.select({
              ios: { shadowColor: t.shadow.card.color, shadowOffset: t.shadow.card.offset, shadowOpacity: t.shadow.card.opacity, shadowRadius: t.shadow.card.radius },
              android: { elevation: t.shadow.card.elevation },
            }),
          },
        ]}>
          <SectionHeader title="Cognitive Profile" t={t} />
          <InfoRow label="Learning Style" value={user?.cognitiveProfile?.learningStyle} t={t} />
          <InfoRow label="Reasoning Style" value={user?.cognitiveProfile?.reasoningStyle} t={t} />
          <BadgeRow label="Interests" items={user?.cognitiveProfile?.interests ?? []} t={t} />
          <BadgeRow label="Difficulty Areas" items={user?.cognitiveProfile?.difficultyAreas ?? []} t={t} />
        </View>

        {/* ── Log Out ── */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: t.status.error }]}
          onPress={handleLogout}
          activeOpacity={0.8}>
          <Text style={[styles.logoutText, { color: t.status.error }]}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  spacer: { width: 40, height: 40 },
  backIcon: { fontSize: 20, lineHeight: 22 },
  topBarTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 18 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  heroName: { fontSize: 24, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
  heroEmail: { fontSize: 14, marginBottom: 12, letterSpacing: 0.1 },
  planBadge: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 6 },
  planText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingBottom: 6,
    marginHorizontal: 18,
    marginBottom: 16,
  },

  scroll: { paddingBottom: 36 },

  // Settings grid
  settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 14 },

  // Logout
  logoutBtn: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginHorizontal: 18,
    marginTop: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  bottomSpacer: { height: 32 },
});

export default ProfileScreen;
