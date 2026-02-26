import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
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

function maskToken(token: string | null | undefined): string {
  if (!token) return '—';
  const head = token.slice(0, 12);
  const tail = token.slice(-6);
  return `${head}  •••••••••••••  ${tail}`;
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
        ? 'Yes ✓'
        : 'No ✗'
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

// ─── Main Screen ─────────────────────────────────────────────────────────────

interface ProfileScreenProps {
  onBack: () => void;
}

function ProfileScreen({ onBack }: ProfileScreenProps) {
  const dispatch = useDispatch<AppDispatch>();
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const t = getTokens(themeMode);

  // ── All auth state from Redux ─────────────────────────────────────────────
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const displayName = useSelector((state: RootState) => state.auth.displayName);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const refreshToken = useSelector((state: RootState) => state.auth.refreshToken);
  const authStatus = useSelector((state: RootState) => state.auth.status);
  const backendReady = useSelector((state: RootState) => state.auth.backendReady);
  const flowStep = useSelector((state: RootState) => state.auth.flowStep);
  const verifyPurpose = useSelector((state: RootState) => state.auth.verifyPurpose);
  const tempUserIdentifier = useSelector((state: RootState) => state.auth.tempUserIdentifier);
  const resetStatus = useSelector((state: RootState) => state.auth.resetStatus);
  const resetError = useSelector((state: RootState) => state.auth.resetError);
  const errorMessage = useSelector((state: RootState) => state.auth.errorMessage);

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
          <InfoRow label="User ID (_id)" value={user?._id} mono t={t} />
          <InfoRow label="Full Name" value={user?.name} t={t} />
          <InfoRow label="Email" value={user?.email} t={t} />
          <InfoRow label="Email Verified" value={user?.emailVerified} t={t} />
          <InfoRow label="Plan" value={user?.plan ?? 'free'} t={t} />
          <InfoRow label="Member Since" value={formatDate(user?.createdAt)} t={t} />
          <InfoRow label="Last Updated" value={formatDate(user?.updatedAt)} t={t} />
          <BadgeRow label="Roles" items={user?.roles ?? []} t={t} />
          {user?.avatarUrl ? (
            <InfoRow label="Avatar URL" value={user.avatarUrl} mono t={t} />
          ) : null}
        </View>

        {/* ── Session State ── */}
        <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
          <SectionHeader title="Session State (Redux)" t={t} />
          <InfoRow label="Authenticated" value={isAuthenticated} t={t} />
          <InfoRow label="Display Name" value={displayName} t={t} />
          <InfoRow label="Auth Status" value={authStatus} t={t} />
          <InfoRow label="Flow Step" value={flowStep} t={t} />
          <InfoRow label="Backend Ready" value={backendReady} t={t} />
          <InfoRow label="Verify Purpose" value={verifyPurpose} t={t} />
          {tempUserIdentifier ? (
            <InfoRow label="Temp Identifier" value={tempUserIdentifier} t={t} />
          ) : null}
          {errorMessage ? (
            <InfoRow label="Last Error" value={errorMessage} t={t} />
          ) : null}
        </View>

        {/* ── Reset Password State ── */}
        <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
          <SectionHeader title="Password Reset State" t={t} />
          <InfoRow label="Reset Status" value={resetStatus} t={t} />
          <InfoRow label="Reset Error" value={resetError} t={t} />
        </View>

        {/* ── Token Inspector ── */}
        <View style={[styles.card, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
          <SectionHeader title="Token Inspector" t={t} />
          <View style={styles.tokenBlock}>
            <Text style={[styles.tokenLabel, { color: t.text.muted }]}>Access Token</Text>
            <View style={[styles.tokenBox, { backgroundColor: t.background.input, borderColor: t.border.default }]}>
              <Text style={[styles.tokenValue, { color: t.primary.accent }]} numberOfLines={2} selectable>
                {maskToken(accessToken)}
              </Text>
            </View>
          </View>
          <View style={[styles.tokenBlock, { marginTop: 12 }]}>
            <Text style={[styles.tokenLabel, { color: t.text.muted }]}>Refresh Token</Text>
            <View style={[styles.tokenBox, { backgroundColor: t.background.input, borderColor: t.border.default }]}>
              <Text style={[styles.tokenValue, { color: t.text.secondary }]} numberOfLines={2} selectable>
                {maskToken(refreshToken)}
              </Text>
            </View>
          </View>
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

  // Token inspector
  tokenBlock: {},
  tokenLabel: { fontSize: 12, marginBottom: 6 },
  tokenBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  tokenValue: { fontSize: 12, fontFamily: 'monospace', letterSpacing: 0.3 },

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
