import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/RootReducer';
import { AppDispatch } from '../redux/Store';
import { toggleTheme } from '../redux/Action';
import { logoutThunk } from '../redux/authSlice';
import { getTokens } from '../theme/tokens';
import ProfileScreen from './ProfileScreen';
import BrainAskScreen from './BRAIN/BrainAskScreen';
import BrainResultScreen from './BRAIN/BrainResultScreen';
import TranslateScreen from './BRAIN/TranslateScreen';
import VisionScreen from './BRAIN/VisionScreen';
import DreamsScreen from './BRAIN/DreamsScreen';

type Page = 'home' | 'profile' | 'brainAsk' | 'brainResult' | 'translate' | 'vision' | 'dreams';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

type T = ReturnType<typeof getTokens>;

// ─── Nav Card ─────────────────────────────────────────────────────────────────
interface NavCardProps {
  icon: string;
  title: string;
  description: string;
  accentColor: string;
  onPress: () => void;
  t: T;
}
function NavCard({ icon, title, description, accentColor, onPress, t }: NavCardProps) {
  return (
    <TouchableOpacity
      style={[
        navCardStyles.card,
        {
          width: CARD_W,
          backgroundColor: t.background.surface,
          borderColor: accentColor + '40',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.82}>
      <View style={[navCardStyles.iconWrap, { backgroundColor: accentColor + '1A' }]}>
        <Text style={navCardStyles.iconText}>{icon}</Text>
      </View>
      <Text style={[navCardStyles.title, { color: t.text.primary }]}>{title}</Text>
      <Text style={[navCardStyles.desc, { color: t.text.muted }]} numberOfLines={2}>
        {description}
      </Text>
      <View style={[navCardStyles.arrow, { backgroundColor: accentColor + '22' }]}>
        <Text style={[navCardStyles.arrowText, { color: accentColor }]}>→</Text>
      </View>
    </TouchableOpacity>
  );
}
const navCardStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: { fontSize: 22 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  desc: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  arrow: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  arrowText: { fontSize: 14, fontWeight: '700' },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
function HomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const user = useSelector((state: RootState) => state.auth?.user ?? null);
  const t = getTokens(themeMode);

  const [page, setPage] = useState<Page>('home');
  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'Explorer';

  const avatarLetters = displayName
    .trim()
    .split(/\s+/)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const navigate = (target: Page) => {
    console.log(`🗺️ [HomeScreen] navigate: ${page} → ${target}`);
    setPage(target);
  };

  const handleLogout = () =>
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          console.log('🚪 [HomeScreen] user confirmed logout — dispatching logoutThunk');
          dispatch(logoutThunk() as any);
        },
      },
    ]);

  if (page === 'profile') return <ProfileScreen onBack={() => navigate('home')} />;
  if (page === 'brainAsk') return <BrainAskScreen onBack={() => navigate('home')} />;
  if (page === 'brainResult') return <BrainResultScreen onBack={() => navigate('home')} />;
  if (page === 'translate') return <TranslateScreen onBack={() => navigate('home')} />;
  if (page === 'vision') return <VisionScreen onBack={() => navigate('home')} />;
  if (page === 'dreams') return <DreamsScreen onBack={() => navigate('home')} />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background.screen }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={t.background.screen}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: t.text.muted }]}>Welcome back,</Text>
            <Text style={[styles.username, { color: t.text.primary }]}>{displayName} 👋</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
              onPress={() => dispatch(toggleTheme())}>
              <Text style={{ fontSize: 16 }}>{themeMode === 'dark' ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.avatarBtn, { backgroundColor: t.primary.default + '22', borderColor: t.primary.default }]}
              onPress={() => navigate('profile')}>
              <Text style={[styles.avatarText, { color: t.primary.accent }]}>{avatarLetters}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Brain Status Banner ─────────────────────────────────────────── */}
        <View style={[styles.banner, { backgroundColor: t.primary.default + '15', borderColor: t.primary.default + '40' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: t.primary.accent }]}>🧠 Cognitive OS  Active</Text>
            <Text style={[styles.bannerSub, { color: t.text.secondary }]}>
              AI-powered knowledge base — ask, learn &amp; remember
            </Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: t.status.success }]} />
        </View>

        {/* ── User info strip ─────────────────────────────────────────────── */}
        <View style={[styles.infoStrip, { backgroundColor: t.background.surface, borderColor: t.border.default }]}>
          <View style={styles.infoItem}>
            <Text style={[styles.infoValue, { color: t.primary.accent }]}>{user?.plan ?? 'Free'}</Text>
            <Text style={[styles.infoLabel, { color: t.text.muted }]}>Plan</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: t.border.subtle }]} />
          <View style={styles.infoItem}>
            <Text style={[styles.infoValue, { color: user?.emailVerified ? t.status.success : t.status.error }]}>
              {user?.emailVerified ? 'Verified' : 'Pending'}
            </Text>
            <Text style={[styles.infoLabel, { color: t.text.muted }]}>Email</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: t.border.subtle }]} />
          <View style={styles.infoItem}>
            <Text style={[styles.infoValue, { color: t.text.primary }]} numberOfLines={1}>
              {user?.email?.split('@')[0] ?? '—'}
            </Text>
            <Text style={[styles.infoLabel, { color: t.text.muted }]}>Username</Text>
          </View>
        </View>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: t.text.primary }]}>Features</Text>
        <View style={styles.grid}>
          <NavCard
            icon="🧠"
            title="Ask Brain"
            description="Query the Cognitive OS with any question across your workspaces"
            accentColor="#8b5cf6"
            onPress={() => navigate('brainAsk')}
            t={t}
          />
          <NavCard
            icon="👤"
            title="Profile"
            description="View your account info, analytics, settings &amp; cognitive profile"
            accentColor="#06b6d4"
            onPress={() => navigate('profile')}
            t={t}
          />
          <NavCard
            icon="📋"
            title="Brain Result"
            description="Fetch the full output of any request using its ID"
            accentColor="#f59e0b"
            onPress={() => navigate('brainResult')}
            t={t}
          />
          <NavCard
            icon="🌐"
            title="Translate"
            description="Translate any text into Hindi, Hinglish, Tamil and more"
            accentColor="#a78bfa"
            onPress={() => navigate('translate')}
            t={t}
          />
          <NavCard
            icon="👁️"
            title="Vision"
            description="Analyse images with AI — get detailed explanations instantly"
            accentColor="#10b981"
            onPress={() => navigate('vision')}
            t={t}
          />
          <NavCard
            icon="✶"
            title="Brain Dreams"
            description="Explore your cognitive dream journal — subconscious insights and actions"
            accentColor="#7c3aed"
            onPress={() => navigate('dreams')}
            t={t}
          />
        </View>

        {/* ── Log Out ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: t.status.error }]}
          onPress={handleLogout}
          activeOpacity={0.8}>
          <Text style={{ fontSize: 17, marginRight: 8 }}>🔴</Text>
          <Text style={[styles.logoutText, { color: t.status.error }]}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 14 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 13, marginBottom: 2 },
  username: { fontSize: 22, fontWeight: '700' },
  headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarText: { fontSize: 14, fontWeight: '700' },

  // Banner
  banner: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  bannerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  bannerSub: { fontSize: 12, lineHeight: 18 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 12 },

  // Info strip
  infoStrip: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 10, marginBottom: 24 },
  infoItem: { flex: 1, alignItems: 'center' },
  infoValue: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  infoLabel: { fontSize: 11, letterSpacing: 0.3 },
  infoDivider: { width: 1, marginVertical: 4 },

  // Section
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  // Logout
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingVertical: 14, marginTop: 6 },
  logoutText: { fontSize: 15, fontWeight: '700' },
});

export default HomeScreen;