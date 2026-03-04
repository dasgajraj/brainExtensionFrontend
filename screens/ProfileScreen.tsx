import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
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
    <View style={[sectionHeaderStyles.wrap, { borderBottomColor: t.border.subtle }]}>
      <Text style={[sectionHeaderStyles.title, { color: t.primary.accent }]}>{title}</Text>
    </View>
  );
}
const sectionHeaderStyles = StyleSheet.create({
  wrap: { borderBottomWidth: 1, paddingBottom: 6, marginBottom: 4, marginTop: 20 },
  title: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  label: { fontSize: 13, flex: 1 },
  value: { fontSize: 13, fontWeight: '600', flex: 1.4, textAlign: 'right' },
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  label: { fontSize: 13, marginBottom: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
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
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
    width: '47%',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
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
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background.screen }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={t.background.screen}
      />

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { borderBottomColor: t.border.subtle }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
          onPress={onBack}
          activeOpacity={0.8}>
          <Text style={[styles.backIcon, { color: t.text.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: t.text.primary }]}>Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* ── Avatar + Name Hero ── */}
        <View style={styles.hero}>
          <View style={[styles.avatarCircle, { backgroundColor: t.primary.default + '30', borderColor: t.primary.default }]}>
            <Text style={[styles.avatarText, { color: t.primary.accent }]}>
              {initials(user?.name ?? displayName)}
            </Text>
          </View>
          <Text style={[styles.heroName, { color: t.text.primary }]}>
            {user?.name ?? displayName ?? 'Unknown'}
          </Text>
          <Text style={[styles.heroEmail, { color: t.text.secondary }]}>
            {user?.email ?? '—'}
          </Text>
          <View style={[styles.planBadge, { backgroundColor: t.primary.default + '22', borderColor: t.border.default }]}>
            <Text style={[styles.planText, { color: t.primary.accent }]}>
              {user?.plan ?? 'free'} plan
            </Text>
          </View>
        </View>

        {/* ── User Info ── */}
        <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
          <SectionHeader title="Account Info" t={t} />
          <InfoRow label="Full Name" value={user?.name} t={t} />
          <InfoRow label="Email" value={user?.email} t={t} />
          <InfoRow label="Email Verified" value={user?.emailVerified} t={t} />
          <InfoRow label="Plan" value={user?.plan ?? 'free'} t={t} />
          <InfoRow label="Member Since" value={formatDate(user?.createdAt)} t={t} />
          <BadgeRow label="Roles" items={user?.roles ?? []} t={t} />
        </View>

        {/* ── Analytics ── */}
        <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
          <SectionHeader title="Analytics" t={t} />
          <InfoRow label="Total Memories" value={String(user?.analytics?.totalMemories ?? 0)} t={t} />
          <InfoRow label="Total Files" value={String(user?.analytics?.totalFiles ?? 0)} t={t} />
          <InfoRow label="Streak Days" value={String(user?.analytics?.streakDays ?? 0)} t={t} />
          <InfoRow label="Last Login" value={formatDate(user?.analytics?.lastLogin)} t={t} />
        </View>

        {/* ── Settings ── */}
        <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
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
        <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1 },
  backIcon: { fontSize: 20, lineHeight: 22 },
  topBarTitle: { fontSize: 17, fontWeight: '700' },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700' },
  heroName: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  heroEmail: { fontSize: 14, marginBottom: 10 },
  planBadge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  planText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize', letterSpacing: 0.5 },

  // Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 4,
    marginHorizontal: 16,
    marginBottom: 14,
  },

  scroll: { paddingBottom: 32 },

  // Settings grid
  settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 },

  // Logout
  logoutBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 6,
  },
  logoutText: { fontSize: 15, fontWeight: '600' },

  bottomSpacer: { height: 24 },
});

export default ProfileScreen;
