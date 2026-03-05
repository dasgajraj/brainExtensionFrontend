import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Relative-time helper for dream story cards ─────────────────────────────
function dreamTimeAgo(dateStr: string): string {
  try {
    const num = Number(dateStr);
    const ms = !isNaN(num) && String(dateStr).trim().length >= 8
      ? (num < 1e12 ? num * 1000 : num)
      : new Date(dateStr).getTime();
    const diff = Date.now() - ms;
    if (isNaN(diff) || diff < 0) {
      // fallback: just return the raw string if we can't compute
      return dateStr.length > 12 ? dateStr.slice(0, 10) : dateStr;
    }
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hrs  = Math.floor(mins / 60);
    const days = Math.floor(hrs  / 24);
    if (secs < 60)  return `${secs}s ago`;
    if (mins < 60)  return `${mins}m ago`;
    if (hrs  < 24)  return `${hrs}h ago`;
    if (days < 7)   return `${days}d ago`;
    // older — show short date
    return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr.length > 10 ? dateStr.slice(0, 10) : dateStr;
  }
}
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
  Image,
  Platform,
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
import MemoryScreen from './Memory/MemoryScreen';

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
  IconMemory,
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
  | 'agent'
  | 'memory';

/** Pages that show in the bottom nav bar (main tabs) */
const MAIN_TABS = new Set<Page>(['home', 'brainAsk', 'files', 'agent', 'memory']);

/** Pages rendered as full-screen overlays (their own back buttons) */
const OVERLAY_PAGES = new Set<Page>(['brainResult', 'translate', 'vision', 'dreams', 'neural']);

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48) / 2;

// ─── Background images for dream story cards ─────────────────────────────────
const HOME_BG_IMAGES = [
  require('../assets/1.webp'),
  require('../assets/2.webp'),
  require('../assets/3.webp'),
  require('../assets/4.webp'),
  require('../assets/5.webp'),
  require('../assets/6.webp'),
];

// ─── Feature Card Data ──────────────────────────────────────────────────────
interface FeatureCardData {
  key: Page;
  icon: React.ComponentType<{ size?: number; color: string }>;
  title: string;
  description: string;
  accentColor: string;
  useLogo?: boolean;
}

const FEATURE_CARDS: FeatureCardData[] = [
  { key: 'brainAsk', icon: IconBrain, title: 'Ask Brain', description: 'Query the Cognitive OS with any question across your workspaces', accentColor: '#8b5cf6' },
  { key: 'brainResult', icon: IconClipboard, title: 'Brain Result', description: 'Fetch the full output of any request using its ID', accentColor: '#f59e0b' },
  { key: 'translate', icon: IconGlobe, title: 'Translate', description: 'Translate any text into Hindi, Hinglish, Tamil and more', accentColor: '#a78bfa' },
  { key: 'vision', icon: IconEye, title: 'Vision', description: 'Analyse images with AI — get detailed explanations instantly', accentColor: '#10b981' },
  { key: 'dreams', icon: IconStar, title: 'Brain Dreams', description: 'Explore your cognitive dream journal — subconscious insights', accentColor: '#7c3aed', useLogo: true },  
  { key: 'neural', icon: IconNetwork, title: 'Neural Graph', description: 'Visualise semantic connections between your memories and files', accentColor: '#ec4899' },
  { key: 'files', icon: IconFolder, title: 'My Files', description: 'Upload and manage files — images, PDFs, code and more', accentColor: '#0ea5e9' },
  { key: 'memory', icon: IconMemory, title: 'Memory', description: 'Store, search and manage long-term memories in your Cognitive OS', accentColor: '#14b8a6' },
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
      delay: index * 65,
      damping: 16,
      stiffness: 180,
      mass: 0.8,
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
            borderColor: t.border.subtle,
            ...Platform.select({
              ios: {
                shadowColor: t.shadow.card.color,
                shadowOffset: t.shadow.card.offset,
                shadowOpacity: t.shadow.card.opacity,
                shadowRadius: t.shadow.card.radius,
              },
              android: { elevation: t.shadow.card.elevation },
            }),
          },
        ]}
        onPress={onPress}
        activeOpacity={0.78}>
        <View style={[cardStyles.iconWrap, { backgroundColor: data.accentColor + '12' }]}>
          {data.useLogo
            ? <Image source={require('../assets/app-logo.png')} style={{ width: 24, height: 24, tintColor: data.accentColor }} resizeMode="contain" />
            : <Icon size={20} color={data.accentColor} />}
        </View>
        <Text style={[cardStyles.title, { color: t.text.primary }]}>{data.title}</Text>
        <Text style={[cardStyles.desc, { color: t.text.secondary }]} numberOfLines={2}>
          {data.description}
        </Text>
        <View style={cardStyles.arrowRow}>
          <Text style={[cardStyles.arrowLabel, { color: data.accentColor }]}>Open</Text>
          <IconChevronRight size={12} color={data.accentColor} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const cardStyles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 18, marginBottom: 14 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 4, letterSpacing: -0.3 },
  desc: { fontSize: 12.5, lineHeight: 18, marginBottom: 14 },
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrowLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
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
  const [showAllDreams, setShowAllDreams] = useState(false);

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
      // Sort: latest date first within each group
      const byDateDesc = (a: DreamEntry, b: DreamEntry) =>
        new Date(b.date).getTime() - new Date(a.date).getTime();
      const unseen = res.journal.filter(d => !seen.has(d.id)).sort(byDateDesc);
      const seenList = res.journal.filter(d => seen.has(d.id)).sort(byDateDesc);
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
      dreams: <DreamsScreen onBack={() => { navigate('home'); loadDreams(); }} startIndex={dreamStartIndex} initialDreams={dreams} seenIds={seenIds} />,
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
      case 'memory':
        return <MemoryScreen onBack={() => navigate('home')} />;
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
          style={[
            styles.menuBtn,
            {
              backgroundColor: t.background.elevated,
              ...Platform.select({
                ios: { shadowColor: t.shadow.card.color, shadowOffset: { width: 0, height: 1 }, shadowOpacity: t.shadow.card.opacity * 0.6, shadowRadius: 4 },
                android: { elevation: 2 },
              }),
            },
          ]}
          onPress={() => setSidebarOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.75}>
          <IconMenu size={19} color={t.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.greeting, { color: t.text.muted }]}>Welcome back,</Text>
          <Text style={[styles.username, { color: t.text.primary }]} numberOfLines={1}>{displayName}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.themeBtn,
            {
              backgroundColor: t.background.elevated,
              ...Platform.select({
                ios: { shadowColor: t.shadow.card.color, shadowOffset: { width: 0, height: 1 }, shadowOpacity: t.shadow.card.opacity * 0.6, shadowRadius: 4 },
                android: { elevation: 2 },
              }),
            },
          ]}
          onPress={() => dispatch(toggleTheme())}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          activeOpacity={0.75}>
          {isDark ? <IconSun size={16} color={t.text.primary} /> : <IconMoon size={16} color={t.text.primary} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.avatarBtn, { backgroundColor: t.primary.tint, borderColor: t.border.strong }]}
          onPress={() => navigate('profile')}
          activeOpacity={0.75}>
          <Text style={[styles.avatarText, { color: t.text.primary }]}>{avatarLetters}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Dreams Stories ─────────────────────────────────────────────── */}
      {dreams.length > 0 && (() => {
        const STORY_COLORS = ['#6d28d9','#1d4ed8','#065f46','#92400e','#be185d','#b45309','#0369a1'];
        const INITIAL_COUNT = 5;
        const displayedDreams = showAllDreams ? dreams : dreams.slice(0, INITIAL_COUNT);
        const hasMore = dreams.length > INITIAL_COUNT;
        const unseenCount = dreams.filter(d => !seenIds.has(d.id)).length;
        return (
          <View style={{ marginBottom: 24 }}>
            {/* Header row */}
            <View style={styles.storiesHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.sectionTitle, { color: t.text.primary, marginBottom: 0 }]}>Brain Dreams</Text>
                {unseenCount > 0 && (
                  <View style={[styles.unseenBadge, { backgroundColor: t.text.primary }]}>
                    <Text style={[styles.unseenBadgeText, { color: t.text.onPrimary }]}>{unseenCount}</Text>
                  </View>
                )}
              </View>
              {hasMore && (
                <TouchableOpacity
                  onPress={() => setShowAllDreams(v => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.65}>
                  <Text style={[styles.seeAll, { color: t.text.secondary }]}>
                    {showAllDreams ? 'Show less' : `See all ${dreams.length}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Horizontal dream cards */}
            <FlatList
              data={displayedDreams}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={d => d.id}
              contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
              renderItem={({ item, index }) => {
                const isSeen = seenIds.has(item.id);
                const colorIdx = dreams.indexOf(item) % STORY_COLORS.length;
                const accent = STORY_COLORS[colorIdx];
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={async () => {
                      await markDreamAsSeen(item.id);
                      setSeenIds(prev => new Set([...prev, item.id]));
                      setDreamStartIndex(dreams.indexOf(item));
                      navigate('dreams');
                    }}
                    style={[
                      styles.storyCard,
                      isSeen
                        ? { borderColor: t.border.default, borderWidth: 1.5, opacity: 0.5 }
                        : { borderColor: accent, borderWidth: 2.5 },
                    ]}>
                    {/* Blurred image background */}
                    <Image
                      source={HOME_BG_IMAGES[colorIdx % HOME_BG_IMAGES.length]}
                      style={StyleSheet.absoluteFill}
                      blurRadius={0.5}
                      resizeMode="cover"
                    />
                    <View style={[
                      styles.storyInner,
                      { backgroundColor: isSeen
                          ? 'rgba(0,0,0,0.45)'
                          : accent + '99' },
                    ]}>
                      {!isSeen && item.date ? (
                        <Text style={styles.storyDate} numberOfLines={1}>{dreamTimeAgo(item.date)}</Text>
                      ) : null}
                      <Text
                        style={[styles.storyTitle, {
                          color: isSeen ? t.text.muted : '#FFF',
                        }]}
                        numberOfLines={3}>
                        {item.title}
                      </Text>
                      {!isSeen && (
                        <View style={styles.storyBadge}>
                          <Text style={styles.storyBadgeText}>NEW</Text>
                        </View>
                      )}
                      {isSeen && (
                        <Text style={[styles.storySeenLabel, { color: t.text.ghost }]}>seen</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        );
      })()}

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: t.text.primary }]}>Quick Actions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
        {[
          { key: 'brainAsk' as Page, icon: IconBrain, label: 'Ask Brain' },
          { key: 'agent' as Page, icon: IconBot, label: 'AI Agent' },
          { key: 'files' as Page, icon: IconFolder, label: 'Files' },
          { key: 'neural' as Page, icon: IconNetwork, label: 'Neural Graph' },
        ].map(q => (
          <TouchableOpacity
            key={q.key}
            style={[
              styles.quickChip,
              {
                backgroundColor: t.background.elevated,
                borderColor: t.border.default,
              },
            ]}
            onPress={() => navigate(q.key)}
            activeOpacity={0.72}>
            <q.icon size={14} color={t.text.secondary} />
            <Text style={[styles.quickLabel, { color: t.text.primary }]}>{q.label}</Text>
            <IconChevronRight size={11} color={t.text.muted} />
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
      <View style={{ height: 32 }} />
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
  scroll: { paddingHorizontal: 18, paddingTop: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  headerText: { flex: 1, marginLeft: 14 },
  menuBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 11, marginBottom: 2, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: '500' },
  username: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  themeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  avatarText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },

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
  quickRow: { marginBottom: 28 },
  quickChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginRight: 10 },
  quickLabel: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },

  // Section
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 14, letterSpacing: -0.2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  // Dreams stories
  storiesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  seeAll: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  storyCard: { width: 90, height: 180, borderRadius: 18, overflow: 'hidden' },
  storyInner: { flex: 1, padding: 10, justifyContent: 'flex-end' },
  storyDate: { fontSize: 8, color: 'rgba(255,255,255,0.75)', marginBottom: 4, fontWeight: '600', letterSpacing: 0.2 },
  storyTitle: { fontSize: 10, fontWeight: '700', lineHeight: 14, letterSpacing: -0.1 },
  storyBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 5, backgroundColor: 'rgba(255,255,255,0.2)' },
  storyBadgeText: { fontSize: 7, fontWeight: '800', color: '#FFF', letterSpacing: 0.8, textTransform: 'uppercase' },
  storySeenLabel: { fontSize: 8, fontWeight: '600', marginTop: 5, letterSpacing: 0.5 },
  unseenBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unseenBadgeText: { fontSize: 10, fontWeight: '800' },
  seeMoreBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  seeMoreTxt: { fontSize: 12, fontWeight: '600' },
});

export default HomeScreen;