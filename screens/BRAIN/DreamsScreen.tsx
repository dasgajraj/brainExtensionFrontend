/**
 * DreamsScreen — Spotify-Rewind / Google Moments story mode
 *
 * Audio setup (one-time, optional):
 *   Place any ambient .mp3 at
 *   android/app/src/main/res/raw/dreamy.mp3
 *   The app plays silently if the file is absent — no crash.
 *
 * Share: captures the current dream card as a PNG and opens the OS share sheet.
 */

import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ActivityIndicator, Animated, Easing, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import RNShare from 'react-native-share';
// @ts-ignore — bundled types vary by version
import Sound from 'react-native-sound';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/RootReducer';
import { getTokens } from '../../theme/tokens';
import { getDreams, DreamEntry } from '../../api/brain.api';
import { IconVolume, IconVolumeOff, IconX } from '../../components/ui/Icons';

const { width, height } = Dimensions.get('window');

// ─── Dreamy gradient palette — DARK mode ─────────────────────────────────────
const DARK_GRADIENTS: [string, string, string][] = [
  ['#1a0533', '#2d0a4e', '#07030d'],
  ['#0a0f33', '#1a0a4e', '#0d0520'],
  ['#0a2033', '#0a0a4e', '#1a0a2e'],
  ['#1a0f09', '#3d1200', '#0a0a1a'],
  ['#001020', '#003366', '#000a18'],
  ['#0a1a0a', '#0a1033', '#1a0a2e'],
  ['#1a1509', '#2e2200', '#0a0a1a'],
];

// ─── Dreamy gradient palette — LIGHT mode (soft, pastel, still cinematic) ────
const LIGHT_GRADIENTS: [string, string, string][] = [
  ['#e8d5ff', '#c4b5fd', '#f3e8ff'],
  ['#dbeafe', '#bfdbfe', '#ede9fe'],
  ['#d1fae5', '#99f6e4', '#e0f2fe'],
  ['#fef3c7', '#fde68a', '#fce7f3'],
  ['#fce7f3', '#fbcfe8', '#e0e7ff'],
  ['#e8f5e9', '#bbf7d0', '#dbeafe'],
  ['#fff7ed', '#fed7aa', '#fce7f3'],
];

const GRADIENTS = DARK_GRADIENTS; // default — overridden per render based on theme

const ACCENTS = ['#a78bfa', '#818cf8', '#60a5fa', '#fb923c', '#38bdf8', '#34d399', '#fbbf24'];
const LIGHT_ACCENTS = ['#7c3aed', '#4f46e5', '#0284c7', '#d97706', '#0369a1', '#059669', '#b45309'];

// ─── EQ Bars — animated audio visualiser ─────────────────────────────────────
function EqBars({ muted }: { muted: boolean }) {
  const b0 = useRef(new Animated.Value(0.3)).current;
  const b1 = useRef(new Animated.Value(0.6)).current;
  const b2 = useRef(new Animated.Value(0.9)).current;
  const b3 = useRef(new Animated.Value(0.4)).current;
  const b4 = useRef(new Animated.Value(0.7)).current;
  const bars = [b0, b1, b2, b3, b4];

  useEffect(() => {
    const anims: Animated.CompositeAnimation[] = [];
    if (muted) {
      bars.forEach(b => b.setValue(0.2));
      return;
    }
    const durations = [420, 360, 500, 390, 450];
    bars.forEach((b, i) => {
      const a = Animated.loop(Animated.sequence([
        Animated.timing(b, { toValue: 1, duration: durations[i], easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(b, { toValue: 0.15, duration: durations[i], easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]));
      anims.push(a);
      setTimeout(() => a.start(), i * 80);
    });
    return () => anims.forEach(a => a.stop());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  return (
    <View style={eqSt.row} pointerEvents="none">
      {bars.map((b, i) => (
        <Animated.View key={i} style={[eqSt.bar, {
          height: b.interpolate({ inputRange: [0, 1], outputRange: [3, 14] }),
        }]} />
      ))}
    </View>
  );
}
const eqSt = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 16 },
  bar: { width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.72)' },
});

// ─── Floating particle ────────────────────────────────────────────────────────
function Particle({ x, delay, size }: { x: number; delay: number; size: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, { toValue: -22, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(op, { toValue: 0.55, duration: 1400, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0, duration: 2800, useNativeDriver: true }),
        ]),
      ]),
      Animated.timing(y, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [y, op, delay]);
  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: height * 0.55,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: 'rgba(196,181,253,0.7)',
      opacity: op, transform: [{ translateY: y }],
    }} />
  );
}

// ─── Progress bars ────────────────────────────────────────────────────────────
function ProgressRow({ total, current, progressAnim }: {
  total: number; current: number; progressAnim: Animated.Value;
}) {
  return (
    <View style={pgSt.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={pgSt.track}>
          {i < current ? (
            <View style={[pgSt.fill, { width: '100%' }]} />
          ) : i === current ? (
            <Animated.View style={[pgSt.fill, {
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}
const pgSt = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, paddingHorizontal: 14, paddingTop: 10 },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 2 },
});

// ─── Dream card content (the capturable area) ─────────────────────────────────
interface CardProps {
  dream: DreamEntry;
  accent: string;
  gradColors: [string, string, string];
  titleSlide: Animated.Value;
  bodyFade: Animated.Value;
  cardRef: React.RefObject<View>;
  isDark: boolean;
}
function DreamCardContent({ dream, accent, gradColors, titleSlide, bodyFade, cardRef, isDark }: CardProps) {
  const date = (() => {
    try {
      return new Date(dream.date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
    } catch { return dream.date; }
  })();

  return (
    <View style={{ flex: 1 }} ref={cardRef} collapsable={false}>
      {/* Base gradient */}
      <LinearGradient
        colors={gradColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
      />
      {/* Top vignette */}
      <LinearGradient
        colors={isDark ? ['rgba(0,0,0,0.5)', 'transparent'] : ['rgba(0,0,0,0.15)', 'transparent']}
        style={[StyleSheet.absoluteFill, { height: 140 }]}
        pointerEvents="none"
      />
      {/* Bottom vignette */}
      <LinearGradient
        colors={isDark ? ['transparent', 'rgba(0,0,0,0.72)'] : ['transparent', 'rgba(0,0,0,0.18)']}
        style={[StyleSheet.absoluteFill, { top: undefined, bottom: 0, height: 220 }]}
        pointerEvents="none"
      />

      {/* Center dream content */}
      <View style={cdSt.center}>
        {/* Orb */}
        <View style={[cdSt.orbShadow, { shadowColor: accent }]}>
          <View style={[cdSt.orb, { backgroundColor: accent }]}>
            <Text style={cdSt.orbChar}>{'\u2736'}</Text>
          </View>
        </View>

        {/* Date */}
        <Animated.View style={[cdSt.datePill, { opacity: bodyFade }]}>
          <Text style={cdSt.dateText}>{date}</Text>
        </Animated.View>

        {/* Title */}
        <Animated.Text style={[cdSt.title, { color: isDark ? '#f5f3ff' : '#1e1b4b', transform: [{ translateY: titleSlide }] }]}
          numberOfLines={3}>
          {dream.title}
        </Animated.Text>

        {/* Divider */}
        <Animated.View style={[cdSt.divWrap, { opacity: bodyFade }]}>
          <View style={[cdSt.div, { backgroundColor: accent + '55' }]} />
        </Animated.View>

        {/* Insight */}
        <Animated.View style={[cdSt.block, { opacity: bodyFade }]}>
          <Text style={[cdSt.label, { color: accent }]}>Insight</Text>
          <Text style={[cdSt.body, { color: isDark ? 'rgba(196,181,253,0.88)' : '#3b0764' }]} numberOfLines={4}>{dream.insight}</Text>
        </Animated.View>

        {/* Action */}
        <Animated.View style={[cdSt.block, { opacity: bodyFade, marginTop: 14 }]}>
          <Text style={[cdSt.label, { color: isDark ? '#86efac' : '#059669' }]}>Action</Text>
          <Text style={[cdSt.body, { color: isDark ? '#bbf7d0' : '#065f46' }]} numberOfLines={2}>{dream.action}</Text>
        </Animated.View>

        {/* BrainExtension watermark — always visible on share */}
        <Animated.View style={[cdSt.watermarkRow, { opacity: bodyFade }]}>
          <View style={[cdSt.watermarkOrb, { backgroundColor: accent }]}>
            <Text style={cdSt.watermarkOrbChar}>{'*'}</Text>
          </View>
          <View>
            <Text style={[cdSt.watermarkTitle, { color: isDark ? 'rgba(255,255,255,0.92)' : accent }]}>BrainExtension</Text>
            <Text style={[cdSt.watermarkSub, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.38)' }]}>Cognitive Dream Journal</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
const cdSt = StyleSheet.create({
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 110, paddingBottom: 100,
  },
  orbShadow: {
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.75,
    shadowRadius: 22, elevation: 14, marginBottom: 20,
  },
  orb: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  orbChar: { color: '#fff', fontSize: 28, fontWeight: '300' },
  datePill: {
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  dateText: { color: 'rgba(255,255,255,0.78)', fontSize: 12, letterSpacing: 0.8 },
  title: {
    fontSize: 27, fontWeight: '800',
    textAlign: 'center', paddingHorizontal: 28, lineHeight: 35,
    letterSpacing: 0.2, marginBottom: 10,
  },
  divWrap: { width: '100%', paddingHorizontal: 28, marginBottom: 20 },
  div: { height: 1 },
  block: { width: '100%', paddingHorizontal: 28 },
  label: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.6,
    textTransform: 'uppercase', marginBottom: 8,
  },
  body: { fontSize: 14, lineHeight: 22, color: 'rgba(196,181,253,0.88)' },
  watermarkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 22, paddingHorizontal: 28,
  },
  watermarkOrb: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  watermarkOrbChar: { color: '#fff', fontSize: 13, fontWeight: '300' },
  watermarkTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },
  watermarkSub: { fontSize: 10, letterSpacing: 0.3, marginTop: 1 },
});

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingView() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.15, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [pulse]);
  return (
    <View style={ldSt.wrap}>
      <Animated.View style={[ldSt.orb, { transform: [{ scale: pulse }] }]}>
        <ActivityIndicator color="#fff" />
      </Animated.View>
      <Text style={ldSt.text}>Entering dream state…</Text>
    </View>
  );
}
const ldSt = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  orb: {
    width: 78, height: 78, borderRadius: 39, backgroundColor: '#7c3aed',
    alignItems: 'center', justifyContent: 'center',
    elevation: 14, shadowColor: '#7c3aed', shadowOpacity: 0.8, shadowRadius: 22,
  },
  text: { color: 'rgba(196,181,253,0.8)', fontSize: 15, letterSpacing: 0.6 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
interface DreamsScreenProps {
  onBack: () => void;
  startIndex?: number;
  /** Pre-sorted list from HomeScreen — skips internal fetch when provided */
  initialDreams?: DreamEntry[];
  /** Seen IDs from HomeScreen — used to skip to first unseen if no startIndex */
  seenIds?: Set<string>;
}

export default function DreamsScreen({ onBack, startIndex = 0, initialDreams, seenIds }: DreamsScreenProps) {
  const themeMode = useSelector((s: RootState) => s.theme.mode);
  const isDark = themeMode === 'dark';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _t = getTokens(themeMode);

  const [stage, setStage] = useState<'loading' | 'story' | 'error'>('loading');
  const [dreams, setDreams] = useState<DreamEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [muted, setMuted] = useState(false);
  const [sharing, setSharing] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(1)).current;
  const titleSlide = useRef(new Animated.Value(40)).current;
  const bodyFade = useRef(new Animated.Value(0)).current;
  const cardRef = useRef<View>(null);
  const soundRef = useRef<any>(null);
  const timerRef = useRef<Animated.CompositeAnimation | null>(null);

  // ── Fetch data (or use pre-sorted list from HomeScreen) ───────────────────
  useEffect(() => {
    if (initialDreams && initialDreams.length > 0) {
      setDreams(initialDreams);
      setStage('story');
      return;
    }
    (async () => {
      try {
        const res = await getDreams();
        if (res.journal.length === 0) {
          setErrorMsg('No dream entries recorded yet.');
          setStage('error');
          return;
        }
        setDreams(res.journal);
        setStage('story');
      } catch (e: any) {
        setErrorMsg(e?.message ?? 'Could not load dreams.');
        setStage('error');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Init sound ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'story') { return; }
    Sound.setCategory('Playback', true);
    const s = new Sound('dreamy.mp3', Sound.MAIN_BUNDLE, (err: Error | null) => {
      if (err) { return; } // file not present — silent
      s.setNumberOfLoops(-1);
      s.setVolume(0.35);
      if (!muted) { s.play(); }
      soundRef.current = s;
    });
    return () => {
      soundRef.current?.stop();
      soundRef.current?.release();
      soundRef.current = null;
    };
    // muted intentionally excluded — handled separately below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // ── Toggle mute ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!soundRef.current) { return; }
    soundRef.current.setVolume(muted ? 0 : 0.35);
  }, [muted]);

  // ── Card entrance animation ────────────────────────────────────────────────
  const runEntrance = useCallback(() => {
    cardFade.setValue(0);
    titleSlide.setValue(42);
    bodyFade.setValue(0);
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.spring(titleSlide, { toValue: 0, useNativeDriver: true, tension: 55, friction: 9 }),
      Animated.timing(bodyFade, { toValue: 1, duration: 520, delay: 220, useNativeDriver: true }),
    ]).start();
  }, [cardFade, titleSlide, bodyFade]);

  // ── Progress timer ─────────────────────────────────────────────────────────
  const startTimer = useCallback((idx: number, total: number) => {
    timerRef.current?.stop();
    progressAnim.setValue(0);
    timerRef.current = Animated.timing(progressAnim, {
      toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: false,
    });
    timerRef.current.start(({ finished }) => {
      if (!finished) { return; }
      if (idx < total - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        onBack();
      }
    });
  }, [progressAnim, onBack]);

  // ── On card change ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'story' || dreams.length === 0) { return; }
    runEntrance();
    startTimer(currentIndex, dreams.length);
    return () => { timerRef.current?.stop(); };
  }, [currentIndex, stage, dreams.length, runEntrance, startTimer]);

  // ── Navigate ───────────────────────────────────────────────────────────────
  const goPrev = useCallback(() => {
    if (currentIndex <= 0) { return; }
    timerRef.current?.stop();
    setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    timerRef.current?.stop();
    if (currentIndex >= dreams.length - 1) { onBack(); return; }
    setCurrentIndex(i => i + 1);
  }, [currentIndex, dreams.length, onBack]);

  // ── Share dream card as image ──────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!cardRef.current || sharing) { return; }
    setSharing(true);
    timerRef.current?.stop();
    try {
      // Capture the dream card
      const rawUri: string = await captureRef(cardRef, { format: 'png', quality: 0.95 });
      // Normalise URI
      const uri = Platform.OS === 'android' && !rawUri.startsWith('file://')
        ? `file://${rawUri}`
        : rawUri;
      await RNShare.open({
        url: uri,
        type: 'image/png',
        title: dreams[currentIndex]?.title ?? 'Brain Dream',
        failOnCancel: false,
      });
    } catch (_) { /* user dismissed share sheet */ }
    // Resume timer
    startTimer(currentIndex, dreams.length);
    setSharing(false);
  }, [sharing, dreams, currentIndex, startTimer]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const dream = dreams[currentIndex];
  const accent = isDark
    ? ACCENTS[currentIndex % ACCENTS.length]
    : LIGHT_ACCENTS[currentIndex % LIGHT_ACCENTS.length];
  const gradColors = isDark
    ? DARK_GRADIENTS[currentIndex % DARK_GRADIENTS.length]
    : LIGHT_GRADIENTS[currentIndex % LIGHT_GRADIENTS.length];
  const bgColor = isDark ? '#06030f' : '#f5f0ff';

  if (stage === 'loading') {
    return (
      <View style={[ss.root, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={bgColor} />
        <SafeAreaView style={{ flex: 1 }}><LoadingView /></SafeAreaView>
      </View>
    );
  }

  if (stage === 'error') {
    return (
      <View style={[ss.root, ss.center, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={bgColor} />
        <Text style={ss.errorMsg}>{errorMsg}</Text>
        <TouchableOpacity onPress={onBack} style={ss.errorBtn}>
          <Text style={ss.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[ss.root, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background particles */}
      <View style={ss.particles} pointerEvents="none">
        <Particle x={width * 0.07} delay={0}    size={4} />
        <Particle x={width * 0.22} delay={600}  size={5} />
        <Particle x={width * 0.50} delay={250}  size={3} />
        <Particle x={width * 0.75} delay={900}  size={4} />
        <Particle x={width * 0.92} delay={450}  size={3} />
      </View>

      {/* Dream card — the piece that gets screenshotted */}
      <Animated.View style={[ss.card, { opacity: cardFade }]}>
        {dream && (
          <DreamCardContent
            dream={dream}
            accent={accent}
            gradColors={gradColors}
            titleSlide={titleSlide}
            bodyFade={bodyFade}
            cardRef={cardRef as React.RefObject<View>}
            isDark={isDark}
          />
        )}
      </Animated.View>

      {/* Touch zones — prev (left 33%) / next (right 67%) */}
      <TouchableOpacity style={ss.touchLeft}  onPress={goPrev} activeOpacity={1} />
      <TouchableOpacity style={ss.touchRight} onPress={goNext} activeOpacity={1} />

      {/* Chrome overlay (progress, controls) — always on top */}
      <SafeAreaView style={ss.chrome} pointerEvents="box-none">
        <ProgressRow total={dreams.length} current={currentIndex} progressAnim={progressAnim} />

          {/* Top bar */}
        <View style={ss.topBar}>
          {/* EQ visualiser + mute toggle */}
          <TouchableOpacity style={ss.muteRow} onPress={() => setMuted(m => !m)} activeOpacity={0.8}>
            <EqBars muted={muted} />
            {muted ? <IconVolumeOff size={18} color='rgba(255,255,255,0.85)' /> : <IconVolume size={18} color='rgba(255,255,255,0.85)' />}
          </TouchableOpacity>

          {/* Progress label + share icon on right */}
          <View style={ss.topRight}>
            <Text style={ss.counter}>{currentIndex + 1} / {dreams.length}</Text>

            {/* Share icon button */}
            <TouchableOpacity
              style={[ss.shareIconBtn, sharing && { opacity: 0.4 }]}
              onPress={handleShare}
              disabled={sharing}
              activeOpacity={0.8}>
              <Text style={ss.shareIcon}>{sharing ? '…' : '↗'}</Text>
            </TouchableOpacity>

            {/* Close */}
            <TouchableOpacity style={ss.closeBtn} onPress={onBack} activeOpacity={0.8}>
              <IconX size={16} color='rgba(255,255,255,0.9)' />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom bar — Skip only now, Share moved to top */}
        <View style={ss.bottomBar}>
          <View />
          <TouchableOpacity style={ss.skipBtn} onPress={goNext} activeOpacity={0.8}>
            <Text style={ss.skipTxt}>
              {currentIndex >= dreams.length - 1 ? 'Finish' : 'Skip'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Root styles ──────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06030f' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  particles: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  card: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  chrome: { ...StyleSheet.absoluteFillObject, zIndex: 10 },

  touchLeft:  { position: 'absolute', left: 0,   top: '18%', width: '33%', height: '58%', zIndex: 6 },
  touchRight: { position: 'absolute', right: 0,  top: '18%', width: '67%', height: '58%', zIndex: 6 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  muteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.36)', borderRadius: 22,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  muteIcon: { fontSize: 14 },
  counter: { color: 'rgba(255,255,255,0.68)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center',
  },
  closeIcon: { color: 'rgba(255,255,255,0.82)', fontSize: 13 },
  shareIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center', justifyContent: 'center',
  },
  shareIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20, paddingBottom: 44, paddingTop: 14,
  },
  shareBtn: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 24, paddingHorizontal: 20, paddingVertical: 11,
  },
  shareTxt: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
  skipBtn: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 22, paddingHorizontal: 20, paddingVertical: 11,
  },
  skipTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700' },

  errorMsg: { color: '#fca5a5', fontSize: 16, textAlign: 'center', marginBottom: 26, lineHeight: 25 },
  errorBtn: { backgroundColor: '#7c3aed', borderRadius: 16, paddingHorizontal: 30, paddingVertical: 14 },
  errorBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: -0.2 },
});
