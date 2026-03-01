import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import { getTokens } from '../../theme/tokens';
import { getDreams, DreamEntry } from '../../api/brain.api';

const { width } = Dimensions.get('window');
type T = ReturnType<typeof getTokens>;

// ─── Dream colour palette (always deep-space regardless of theme) ─────────────
const D = {
  bg: '#06030f',
  surface: '#0f0a1e',
  card: '#120d22',
  border: '#2d1f52',
  borderGlow: '#7c3aed',
  orb: '#7c3aed',
  orbInner: '#a855f7',
  ring1: '#7c3aed',
  ring2: '#4c1d95',
  particle: '#c4b5fd',
  textPrimary: '#f5f3ff',
  textSecondary: '#c4b5fd',
  textMuted: '#7c6faa',
  insightBg: '#1a0f35',
  insightBorder: '#4c1d95',
  actionBg: '#0e1a12',
  actionBorder: '#14532d',
  actionText: '#86efac',
  dateBadge: '#1e1040',
  gold: '#fbbf24',
};

// ─── BrainOrb  ────────────────────────────────────────────────────────────────
// A multi-ring pulsing orb that captures the "dreaming brain" vibe.
function BrainOrb({ isLoading }: { isLoading: boolean }) {
  const core = useRef(new Animated.Value(1)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Core slow breathe
    const coreAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(core, { toValue: 1.12, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(core, { toValue: 1.0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    // Ring 1 — expands from orb, fades out
    const ring1Anim = Animated.loop(
      Animated.sequence([
        Animated.timing(ring1, { toValue: 1, duration: 2200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ring1, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(600),
      ]),
    );
    // Ring 2 — same but delayed
    const ring2Anim = Animated.loop(
      Animated.sequence([
        Animated.delay(1100),
        Animated.timing(ring2, { toValue: 1, duration: 2200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(600),
      ]),
    );
    // Glow pulse
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.9, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.35, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    coreAnim.start();
    ring1Anim.start();
    ring2Anim.start();
    glowAnim.start();
    return () => { coreAnim.stop(); ring1Anim.stop(); ring2Anim.stop(); glowAnim.stop(); };
  }, [core, ring1, ring2, glow]);

  // interpolate ring1 progress → scale & opacity
  const r1Scale = ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const r1Opacity = ring1.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.55, 0.3, 0] });
  const r2Scale = ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
  const r2Opacity = ring2.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.35, 0.15, 0] });

  return (
    <View style={orbStyles.container}>
      {/* Ripple ring 2 (outermost) */}
      <Animated.View style={[orbStyles.ringBase, { transform: [{ scale: r2Scale }], opacity: r2Opacity, borderColor: D.ring2 }]} />
      {/* Ripple ring 1 */}
      <Animated.View style={[orbStyles.ringBase, { transform: [{ scale: r1Scale }], opacity: r1Opacity, borderColor: D.ring1 }]} />
      {/* Core orb */}
      <Animated.View style={[orbStyles.core, { transform: [{ scale: core }] }]}>
        <Animated.View style={[orbStyles.coreInner, { opacity: glow }]} />
        {isLoading ? (
          <ActivityIndicator color={D.textPrimary} size="small" />
        ) : (
          <Text style={orbStyles.coreChar}>{'\u2736'}</Text>
        )}
      </Animated.View>
    </View>
  );
}

const orbStyles = StyleSheet.create({
  container: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  ringBase: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1.5,
  },
  core: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: D.orb,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: D.orb,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 14,
    overflow: 'hidden',
  },
  coreInner: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: D.orbInner,
  },
  coreChar: {
    color: D.textPrimary,
    fontSize: 30,
    fontWeight: '300',
    zIndex: 2,
  },
});

// ─── FloatingParticle ─────────────────────────────────────────────────────────
function FloatingParticle({ x, delay, size }: { x: number; delay: number; size: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y, { toValue: -18, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(op, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0.1, duration: 2600, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(y, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [y, op, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: 30,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: D.particle,
        opacity: op,
        transform: [{ translateY: y }],
      }}
    />
  );
}

// ─── DreamCard ────────────────────────────────────────────────────────────────
function DreamCard({ item, index, entranceAnim }: {
  item: DreamEntry;
  index: number;
  entranceAnim: Animated.Value;
}) {
  const [expanded, setExpanded] = useState(false);

  const translateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const formattedDate = (() => {
    try {
      const d = new Date(item.date);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
        '  ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return item.date; }
  })();

  // Alternate soft accent hue per card to break monotony
  const hues = ['#7c3aed', '#6d28d9', '#5b21b6', '#7e22ce', '#6b21a8'];
  const accent = hues[index % hues.length];

  return (
    <Animated.View style={[
      cardStyles.wrap,
      { borderLeftColor: accent, opacity: entranceAnim, transform: [{ translateY }] },
    ]}>
      {/* ── Title row ── */}
      <TouchableOpacity
        style={cardStyles.titleRow}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.85}>
        <View style={cardStyles.titleLeft}>
          {/* Subtle index numbering */}
          <View style={[cardStyles.indexBadge, { backgroundColor: accent + '22' }]}>
            <Text style={[cardStyles.indexText, { color: accent }]}>
              {String(index + 1).padStart(2, '0')}
            </Text>
          </View>
          <Text style={[cardStyles.title, { color: D.textPrimary }]} numberOfLines={expanded ? undefined : 2}>
            {item.title}
          </Text>
        </View>
        <Text style={[cardStyles.chevron, { color: D.textMuted }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* ── Date ── */}
      <View style={[cardStyles.dateBadge, { backgroundColor: D.dateBadge }]}>
        <Text style={cardStyles.dateIcon}>{'\u25cb'}</Text>
        <Text style={cardStyles.dateText}>{formattedDate}</Text>
      </View>

      {/* ── Expanded body ── */}
      {expanded && (
        <>
          {/* Insight block */}
          <View style={[cardStyles.block, { backgroundColor: D.insightBg, borderColor: D.insightBorder }]}>
            <Text style={[cardStyles.blockLabel, { color: accent }]}>Insight</Text>
            <Text style={cardStyles.blockBody}>{item.insight}</Text>
          </View>

          {/* Action block */}
          <View style={[cardStyles.block, { backgroundColor: D.actionBg, borderColor: D.actionBorder }]}>
            <Text style={[cardStyles.blockLabel, { color: D.actionText }]}>Action</Text>
            <Text style={[cardStyles.blockBody, { color: D.actionText }]}>{item.action}</Text>
          </View>
        </>
      )}
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  wrap: {
    backgroundColor: D.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: D.border,
    borderLeftWidth: 3,
    padding: 16,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  titleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  indexBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    minWidth: 32,
    alignItems: 'center',
    marginTop: 1,
  },
  indexText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 22, letterSpacing: 0.1 },
  chevron: { fontSize: 11, marginTop: 4 },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    marginBottom: 2,
  },
  dateIcon: { color: D.textMuted, fontSize: 8 },
  dateText: { fontSize: 11, color: D.textMuted, letterSpacing: 0.2 },
  block: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  blockLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  blockBody: {
    fontSize: 13,
    lineHeight: 21,
    color: D.textSecondary,
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

interface DreamsScreenProps {
  onBack: () => void;
}

export default function DreamsScreen({ onBack }: DreamsScreenProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _t = getTokens(useSelector((state: RootState) => state.theme.mode));

  const [loading, setLoading] = useState(true);
  const [dreams, setDreams] = useState<DreamEntry[]>([]);
  const [count, setCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Per-card entrance animations
  const cardAnims = useRef<Animated.Value[]>([]).current;

  const runEntranceAnims = useCallback((n: number) => {
    // Ensure we have enough Animated.Values
    while (cardAnims.length < n) {
      cardAnims.push(new Animated.Value(0));
    }
    const subset = cardAnims.slice(0, n).map(a => {
      a.setValue(0);
      return Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 });
    });
    Animated.stagger(60, subset).start();
  }, [cardAnims]);

  const fetchDreams = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setDreams([]);
    try {
      const res = await getDreams();
      setDreams(res.journal);
      setCount(res.count);
      requestAnimationFrame(() => runEntranceAnims(res.journal.length));
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Failed to load dream journal.');
    } finally {
      setLoading(false);
    }
  }, [runEntranceAnims]);

  useEffect(() => { fetchDreams(); }, [fetchDreams]);

  return (
    <View style={screenStyles.root}>
      <StatusBar barStyle="light-content" backgroundColor={D.bg} />

      {/* Floating particles — purely decorative */}
      <View style={screenStyles.particleLayer} pointerEvents="none">
        <FloatingParticle x={width * 0.08} delay={0}    size={4} />
        <FloatingParticle x={width * 0.25} delay={700}  size={5} />
        <FloatingParticle x={width * 0.55} delay={300}  size={3} />
        <FloatingParticle x={width * 0.73} delay={1100} size={4} />
        <FloatingParticle x={width * 0.90} delay={500}  size={3} />
      </View>

      <SafeAreaView style={screenStyles.safe}>
        {/* ── Fixed header ── */}
        <View style={screenStyles.topBar}>
          <TouchableOpacity
            style={screenStyles.backBtn}
            onPress={onBack}
            activeOpacity={0.8}>
            <Text style={screenStyles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={screenStyles.topBarCenter}>
            <Text style={screenStyles.topBarTitle}>Brain Dreams</Text>
            <Text style={screenStyles.topBarSub}>subconscious insight journal</Text>
          </View>
          <TouchableOpacity style={screenStyles.refreshBtn} onPress={fetchDreams} activeOpacity={0.8}>
            <Text style={[screenStyles.refreshText, loading ? { opacity: 0.4 } : {}]}>↻</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={screenStyles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* ── Brain orb hero ── */}
          <BrainOrb isLoading={loading} />

          {/* ── Status strip ── */}
          {loading ? (
            <View style={screenStyles.statusStrip}>
              <Text style={screenStyles.statusText}>Entering dream state…</Text>
            </View>
          ) : errorMsg !== '' ? (
            <View style={[screenStyles.statusStrip, { backgroundColor: '#200a0a', borderColor: '#7f1d1d' }]}>
              <Text style={[screenStyles.statusText, { color: '#fca5a5' }]}>{errorMsg}</Text>
              <TouchableOpacity onPress={fetchDreams} style={screenStyles.retryBtn}>
                <Text style={screenStyles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={screenStyles.statusStrip}>
              <View style={[screenStyles.onlineDot, { backgroundColor: '#a78bfa' }]} />
              <Text style={screenStyles.statusText}>{count} dream{count !== 1 ? 's' : ''} recorded</Text>
              <View style={[screenStyles.statusDivider]} />
              <Text style={screenStyles.statusSub}>tap any dream to expand</Text>
            </View>
          )}

          {/* ── Dream cards ── */}
          {!loading && dreams.length > 0 && (
            <View style={{ marginTop: 10 }}>
              {dreams.map((item, index) => {
                // Lazily fill cardAnims if needed
                if (!cardAnims[index]) { cardAnims.push(new Animated.Value(1)); }
                return (
                  <DreamCard
                    key={item.id}
                    item={item}
                    index={index}
                    entranceAnim={cardAnims[index]}
                  />
                );
              })}
            </View>
          )}

          {/* ── Empty state ── */}
          {!loading && dreams.length === 0 && errorMsg === '' && (
            <View style={screenStyles.emptyState}>
              <Text style={screenStyles.emptyTitle}>No dreams yet</Text>
              <Text style={screenStyles.emptyHint}>
                Your brain hasn't recorded any dream journal entries. Start asking questions to generate dream insights.
              </Text>
            </View>
          )}

          <View style={{ height: 48 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const screenStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  safe: { flex: 1 },
  particleLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 0,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: D.border,
    backgroundColor: D.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: D.textPrimary, fontSize: 20, lineHeight: 22 },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: D.textPrimary,
    letterSpacing: 0.3,
  },
  topBarSub: {
    fontSize: 10,
    color: D.textMuted,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: { color: D.textSecondary, fontSize: 20 },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

  // Status strip
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 4,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 13, color: D.textSecondary, fontWeight: '500' },
  statusDivider: { width: 1, height: 12, backgroundColor: D.border },
  statusSub: { fontSize: 11, color: D.textMuted },
  retryBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: D.insightBg,
    borderWidth: 1,
    borderColor: D.insightBorder,
    marginLeft: 6,
  },
  retryText: { color: '#c4b5fd', fontSize: 12, fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 28, marginTop: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: D.textPrimary, marginBottom: 10 },
  emptyHint: { fontSize: 14, lineHeight: 22, color: D.textMuted, textAlign: 'center' },
});
