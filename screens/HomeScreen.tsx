import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
  BackHandler,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/RootReducer';
import { AppDispatch } from '../redux/Store';
import { toggleTheme } from '../redux/Action';
import { logoutThunk } from '../redux/authSlice';
import { getTokens, AppTokens } from '../theme/tokens';
import { getDreams, DreamEntry } from '../api/brain.api';
import { getSeenDreamIds, markDreamAsSeen } from '../services/dreamSeen.service';
import { authenticateWithBiometrics } from '../services/biometric.service';

// ── Screens
import ProfileScreen from './ProfileScreen';
import BrainAskScreen from './BRAIN/BrainAskScreen';
import BrainResultScreen from './BRAIN/BrainResultScreen';
import TranslateScreen from './BRAIN/TranslateScreen';
import VisionScreen from './BRAIN/VisionScreen';
import DreamsScreen from './BRAIN/DreamsScreen';
import NeuralGraphScreen from './BRAIN/NeuralGraphScreen';
import FilesScreen from './Files/FilesScreen';
import AgentScreen from './BRAIN/AgentScreen';

// ── Shared UI
import {
  IconMenu,
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
  IconActivity,
  IconChevronRight,
  IconZap,
  IconLogOut,
} from '../components/ui/Icons';
import Sidebar from '../components/ui/Sidebar';
import BottomNavBar from '../components/ui/BottomNavBar';

// ─── Types ──────────────────────────────────────────────────────────────────
type Page =
  | 'home'
  | 'profile'
  | 'brainAsk'
  | 'brainResult'
  | 'translate'
  | 'vision'
  | 'dreams'
  | 'neural'
  | 'files'
  | 'agent';

/** Pages that show in the bottom nav bar (main tabs) */
const MAIN_TABS = new Set<Page>(['home', 'brainAsk', 'files', 'agent', 'profile']);

/** Pages rendered as full-screen overlays (their own back buttons) */
const OVERLAY_PAGES = new Set<Page>(['brainResult', 'translate', 'vision', 'dreams', 'neural']);

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48) / 2;

// ─── Feature Card Data ──────────────────────────────────────────────────────
interface FeatureCardData {
  key: Page;
  icon: React.ComponentType<{ size?: number; color: string }>;
  title: string;
  description: string;
  accentColor: string;
}

const FEATURE_CARDS: FeatureCardData[] = [
  { key: 'brainAsk', icon: IconBrain, title: 'Ask Brain', description: 'Query the Cognitive OS with any question across your workspaces', accentColor: '#8b5cf6' },
  { key: 'brainResult', icon: IconClipboard, title: 'Brain Result', description: 'Fetch the full output of any request using its ID', accentColor: '#f59e0b' },
  { key: 'translate', icon: IconGlobe, title: 'Translate', description: 'Translate any text into Hindi, Hinglish, Tamil and more', accentColor: '#a78bfa' },
  { key: 'vision', icon: IconEye, title: 'Vision', description: 'Analyse images with AI — get detailed explanations instantly', accentColor: '#10b981' },
  { key: 'dreams', icon: IconStar, title: 'Brain Dreams', description: 'Explore your cognitive dream journal — subconscious insights', accentColor: '#7c3aed' },
  { key: 'neural', icon: IconNetwork, title: 'Neural Graph', description: 'Visualise semantic connections between your memories and files', accentColor: '#ec4899' },
  { key: 'files', icon: IconFolder, title: 'My Files', description: 'Upload and manage files — images, PDFs, code and more', accentColor: '#0ea5e9' },
];

// ─── Feature Card ───────────────────────────────────────────────────────────
interface NavCardProps {
  data: FeatureCardData;
  onPress: () => void;
  t: AppTokens;
  index: number;
}
function NavCard({ data, onPress, t, index }: NavCardProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      delay: index * 50,
      damping: 18,
      stiffness: 200,
      mass: 0.7,
    }).start();
  }, [scaleAnim, index]);

  const Icon = data.icon;
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: scaleAnim }}>
      <TouchableOpacity
        style={[
          cardStyles.card,
          {
            width: CARD_W,
            backgroundColor: t.background.surface,
            borderColor: data.accentColor + '40',
          },
        ]}
        onPress={onPress}
        activeOpacity={0.82}>
        <View style={[cardStyles.iconWrap, { backgroundColor: data.accentColor + '1A' }]}>
          <Icon size={22} color={data.accentColor} />
        </View>
        <Text style={[cardStyles.title, { color: t.text.primary }]}>{data.title}</Text>
        <Text style={[cardStyles.desc, { color: t.text.muted }]} numberOfLines={2}>
          {data.description}
        </Text>
        <View style={[cardStyles.arrow, { backgroundColor: data.accentColor + '22' }]}>
          <IconChevronRight size={14} color={data.accentColor} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const cardStyles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12 },
  iconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  desc: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  arrow: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
});

// ─── Main Screen ────────────────────────────────────────────────────────────
function HomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const themeMode = useSelector((state: RootState) => state.theme.mode);
  const isDark = themeMode === 'dark';
  const user = useSelector((state: RootState) => state.auth?.user ?? null);
  const t = getTokens(themeMode);

  const [page, setPage] = useState<Page>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dreams stories state
  const [dreams, setDreams] = useState<DreamEntry[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [dreamStartIndex, setDreamStartIndex] = useState(0);

  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'Explorer';
  const userEmail = user?.email ?? '';
  const userPlan = user?.plan ?? 'Free';

  // Page transition animation
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const navigate = useCallback(
    (target: Page) => {
      if (target === page) return;
      // Animate out → switch → animate in
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 12, duration: 120, useNativeDriver: true }),
      ]).start(() => {
        setPage(target);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200, mass: 0.7 }),
        ]).start();
      });
    },
    [page, fadeAnim, slideAnim],
  );

  // Intercept Android hardware back
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sidebarOpen) {
        setSidebarOpen(false);
        return true;
      }
      if (page !== 'home') {
        navigate('home');
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [page, sidebarOpen, navigate]);

  const avatarLetters = displayName
    .trim()
    .split(/\s+/)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = () =>
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => dispatch(logoutThunk() as any),
      },
    ]);

  // ── Load dreams + seen tracking ─────────────────────────────────────────
  const loadDreams = useCallback(async () => {
    try {
      const res = await getDreams();
      const seen = await getSeenDreamIds();
      setSeenIds(seen);
      const unseen = res.journal.filter(d => !seen.has(d.id)).reverse();
      const seenList = res.journal.filter(d => seen.has(d.id));
      setDreams([...unseen, ...seenList]);
    } catch {
      // silent — dreams are optional
    }
  }, []);

  useEffect(() => { loadDreams(); }, [loadDreams]);

  // ── Biometric-aware tab press ─────────────────────────────────────────
  const handleTabPress = useCallback(async (key: string) => {
    if (key === 'agent') {
      const authed = await authenticateWithBiometrics();
      if (!authed) return;
    }
    navigate(key as Page);
  }, [navigate]);

  // ── Overlay pages — full-screen, managed by the sub-screen's own header
  if (OVERLAY_PAGES.has(page)) {
    const overlayMap: Record<string, React.ReactNode> = {
      brainResult: <BrainResultScreen onBack={() => navigate('home')} />,
      translate: <TranslateScreen onBack={() => navigate('home')} />,
      vision: <VisionScreen onBack={() => navigate('home')} />,
      dreams: <DreamsScreen onBack={() => { navigate('home'); loadDreams(); }} startIndex={dreamStartIndex} />,
      neural: <NeuralGraphScreen onBack={() => navigate('home')} />,
    };
    return <>{overlayMap[page]}</>;
  }

  // ── Render the active main-tab content
  const renderTabContent = () => {
    switch (page) {
      case 'brainAsk':
        return <BrainAskScreen onBack={() => navigate('home')} />;
      case 'files':
        return <FilesScreen onBack={() => navigate('home')} />;
      case 'agent':
        return <AgentScreen onBack={() => navigate('home')} />;
      case 'profile':
        return <ProfileScreen onBack={() => navigate('home')} />;
      default:
        return renderDashboard();
    }
  };

  // ── Dashboard (home tab)
  const renderDashboard = () => (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
          onPress={() => setSidebarOpen(true)}
          activeOpacity={0.8}>
          <IconMenu size={20} color={t.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.greeting, { color: t.text.muted }]}>Welcome back,</Text>
          <Text style={[styles.username, { color: t.text.primary }]}>{displayName}</Text>
        </View>
        <TouchableOpacity
          style={[styles.themeBtn, { backgroundColor: t.background.surface, borderColor: t.border.default }]}
          onPress={() => dispatch(toggleTheme())}
          activeOpacity={0.8}>
          {isDark ? <IconSun size={17} color={t.text.primary} /> : <IconMoon size={17} color={t.text.primary} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.avatarBtn, { backgroundColor: t.primary.default + '22', borderColor: t.primary.default }]}
          onPress={() => navigate('profile')}
          activeOpacity={0.8}>
          <Text style={[styles.avatarText, { color: t.primary.accent }]}>{avatarLetters}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Dreams Stories ─────────────────────────────────────────────── */}
      {dreams.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <View style={styles.storiesHeader}>
            <Text style={[styles.sectionTitle, { color: t.text.primary, marginBottom: 0 }]}>Brain Dreams</Text>
            {dreams.length > 5 && (
              <TouchableOpacity onPress={() => { setDreamStartIndex(0); navigate('dreams'); }} activeOpacity={0.7}>
                <Text style={[styles.seeAll, { color: t.primary.accent }]}>See all →</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={dreams.slice(0, 5)}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={d => d.id}
            contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
            renderItem={({ item, index }) => {
              const isSeen = seenIds.has(item.id);
              const STORY_COLORS = ['#6d28d9','#1d4ed8','#065f46','#92400e','#be185d'];
              const accent = STORY_COLORS[index % STORY_COLORS.length];
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={async () => {
                    await markDreamAsSeen(item.id);
                    setSeenIds(prev => new Set([...prev, item.id]));
                    setDreamStartIndex(index);
                    navigate('dreams');
                  }}
                  style={[
                    styles.storyCard,
                    { borderColor: isSeen ? (isDark ? '#333' : '#CCC') : accent, borderWidth: isSeen ? 1 : 2.5 },
                  ]}>
                  <View style={[styles.storyInner, { backgroundColor: isSeen ? (isDark ? '#111' : '#E8E8E8') : accent + 'CC' }]}>
                    <Text style={[styles.storyTitle, { color: isSeen ? (isDark ? '#555' : '#AAA') : '#FFF' }]} numberOfLines={3}>
                      {item.title}
                    </Text>
                    {!isSeen && (
                      <View style={[styles.storyBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                        <Text style={styles.storyBadgeText}>NEW</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: t.text.primary }]}>Quick Actions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
        {[
          { key: 'brainAsk' as Page, icon: IconBrain, label: 'Ask Brain', color: '#8b5cf6' },
          { key: 'agent' as Page, icon: IconBot, label: 'AI Agent', color: '#06b6d4' },
          { key: 'files' as Page, icon: IconFolder, label: 'Files', color: '#0ea5e9' },
          { key: 'neural' as Page, icon: IconNetwork, label: 'Neural Graph', color: '#ec4899' },
        ].map(q => (
          <TouchableOpacity
            key={q.key}
            style={[styles.quickChip, { backgroundColor: q.color + '14', borderColor: q.color + '30' }]}
            onPress={() => navigate(q.key)}
            activeOpacity={0.8}>
            <q.icon size={16} color={q.color} />
            <Text style={[styles.quickLabel, { color: q.color }]}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Features Grid ──────────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: t.text.primary }]}>All Features</Text>
      <View style={styles.grid}>
        {FEATURE_CARDS.map((card, idx) => (
          <NavCard
            key={card.key}
            data={card}
            index={idx}
            onPress={() => navigate(card.key)}
            t={t}
          />
        ))}
      </View>

      {/* ── Bottom spacer for nav bar */}
      <View style={{ height: 24 }} />
    </ScrollView>
  );

  return (
    <View style={[styles.root, { backgroundColor: t.background.screen }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={t.background.screen}
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Animated page content */}
        <Animated.View
          style={[
            styles.pageContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}>
          {renderTabContent()}
        </Animated.View>
      </SafeAreaView>

      {/* Bottom nav — only on main tabs */}
      {MAIN_TABS.has(page) && (
        <BottomNavBar
          activeTab={page}
          onTabPress={handleTabPress}
          t={t}
        />
      )}

      {/* Sidebar drawer */}
      <Sidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={key => navigate(key as Page)}
        onToggleTheme={() => dispatch(toggleTheme())}
        onLogout={handleLogout}
        activeKey={page}
        t={t}
        isDark={isDark}
        displayName={displayName}
        email={userEmail}
        avatarLetters={avatarLetters}
        plan={userPlan}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  pageContent: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 14 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  menuBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 12, marginBottom: 1, letterSpacing: 0.3 },
  username: { fontSize: 20, fontWeight: '800' },
  themeBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarText: { fontSize: 14, fontWeight: '700' },

  // Banner
  banner: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 14 },
  bannerIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  bannerSub: { fontSize: 12, lineHeight: 18 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },

  // Info strip
  infoStrip: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 10, marginBottom: 20 },
  infoItem: { flex: 1, alignItems: 'center', gap: 4 },
  infoValue: { fontSize: 13, fontWeight: '700' },
  infoLabel: { fontSize: 10, letterSpacing: 0.3 },
  infoDivider: { width: 1, marginVertical: 4 },

  // Quick actions
  quickRow: { marginBottom: 20 },
  quickChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginRight: 10 },
  quickLabel: { fontSize: 12, fontWeight: '700' },

  // Section
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12, letterSpacing: 0.1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  // Dreams stories
  storiesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  seeAll: { fontSize: 13, fontWeight: '600' },
  storyCard: { width: 80, height: 128, borderRadius: 14, overflow: 'hidden' },
  storyInner: { flex: 1, padding: 8, justifyContent: 'flex-end' },
  storyTitle: { fontSize: 10, fontWeight: '700', lineHeight: 14 },
  storyBadge: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, marginTop: 4 },
  storyBadgeText: { fontSize: 8, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
});

export default HomeScreen;