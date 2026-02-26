import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { height } = Dimensions.get('window');
const ANIMATION_DURATION = 600;

interface Onboarding1Props {
  onNext: () => void;
  onSkip: () => void;
  theme?: 'light' | 'dark';
}

const Onboarding1: React.FC<Onboarding1Props> = ({ onNext, onSkip, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  
  // Animation values
  const mainScale = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);
  const textY = useSharedValue(50);

  // Blob morphing animations
  const blob1 = useSharedValue(0);
  const blob2 = useSharedValue(0);
  const blob3 = useSharedValue(0);

  // Particle animations
  const particles = Array.from({ length: 6 }, () => ({
    x: useSharedValue(0),
    y: useSharedValue(0),
    scale: useSharedValue(0),
  }));

  useEffect(() => {
    // Main entrance
    opacity.value = withTiming(1, { duration: ANIMATION_DURATION });
    mainScale.value = withSpring(1, { damping: 12, stiffness: 90 });
    textY.value = withSpring(0, { damping: 15 });

    // Continuous rotation
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    // Blob morphing
    blob1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    blob2.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    blob3.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Particles drift
    particles.forEach((particle, index) => {
      const angle = (index / particles.length) * Math.PI * 2;
      const radius = 110;

      setTimeout(() => {
        particle.scale.value = withSpring(1, { damping: 10 });
        particle.x.value = withRepeat(
          withSequence(
            withTiming(Math.cos(angle) * radius, { duration: 2600 }),
            withTiming(Math.cos(angle + Math.PI) * radius, { duration: 2600 })
          ),
          -1,
          true
        );
        particle.y.value = withRepeat(
          withSequence(
            withTiming(Math.sin(angle) * radius, { duration: 2600 }),
            withTiming(Math.sin(angle + Math.PI) * radius, { duration: 2600 })
          ),
          -1,
          true
        );
      }, index * 120);
    });
  }, []);

  const mainAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mainScale.value }, { rotate: `${rotation.value}deg` }],
    opacity: opacity.value,
  }));
  
  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textY.value }],
    opacity: opacity.value,
  }));
  
  const blob1Style = useAnimatedStyle(() => {
    const scale = interpolate(blob1.value, [0, 1], [1, 1.25]);
    const translateX = interpolate(blob1.value, [0, 1], [0, 24]);
    return {
      transform: [{ scale }, { translateX }],
    };
  });

  const blob2Style = useAnimatedStyle(() => {
    const scale = interpolate(blob2.value, [0, 1], [1, 1.18]);
    const translateY = interpolate(blob2.value, [0, 1], [0, -36]);
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  const blob3Style = useAnimatedStyle(() => {
    const scale = interpolate(blob3.value, [0, 1], [1, 1.22]);
    const rotate = interpolate(blob3.value, [0, 1], [0, 150]);
    return {
      transform: [{ scale }, { rotate: `${rotate}deg` }],
    };
  });

  const colors = isDark 
    ? ['#0a0517', '#1a0f2e', '#2d1854'] 
    : ['#faf5ff', '#f3e8ff', '#e9d5ff'];

  return (
    <LinearGradient colors={colors} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Morphing Blobs */}
      <View style={styles.blobContainer}>
        <Animated.View
          style={[
            styles.blob1,
            { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.35)' : 'rgba(124, 58, 237, 0.18)' },
            blob1Style,
          ]}
        />
        <Animated.View
          style={[
            styles.blob2,
            { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.28)' : 'rgba(139, 92, 246, 0.14)' },
            blob2Style,
          ]}
        />
        <Animated.View
          style={[
            styles.blob3,
            { backgroundColor: isDark ? 'rgba(196, 181, 253, 0.22)' : 'rgba(167, 139, 250, 0.12)' },
            blob3Style,
          ]}
        />
      </View>

      {/* Center graphic with particles */}
      <View style={styles.graphicContainer}>
        <Animated.View
          style={[
            styles.mainCircle,
            mainAnimatedStyle,
            {
              backgroundColor: isDark
                ? 'rgba(139, 92, 246, 0.25)'
                : 'rgba(124, 58, 237, 0.18)',
              borderColor: isDark
                ? 'rgba(196, 181, 253, 0.4)'
                : 'rgba(124, 58, 237, 0.3)',
            },
          ]}
        >
          <View
            style={[
              styles.centerGlyph,
              { borderColor: isDark ? '#c4b5fd' : '#7c3aed' },
            ]}
          >
            <View
              style={[
                styles.centerGlyphDot,
                { backgroundColor: isDark ? '#c4b5fd' : '#7c3aed' },
              ]}
            />
          </View>
        </Animated.View>

        {particles.map((particle, index) => {
          const particleStyle = useAnimatedStyle(() => ({
            transform: [
              { translateX: particle.x.value },
              { translateY: particle.y.value },
              { scale: particle.scale.value },
            ],
          }));

          const particleColor = isDark
            ? 'rgba(196, 181, 253, 0.7)'
            : 'rgba(124, 58, 237, 0.6)';

          return (
            <Animated.View key={index} style={[styles.particle, particleStyle]}>
              <View style={[styles.particleDot, { backgroundColor: particleColor }]} />
            </Animated.View>
          );
        })}
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, textAnimatedStyle]}>
        <View style={styles.headerContainer}>
          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.2)' : 'rgba(124, 58, 237, 0.2)' }]}>
            <Text style={[styles.badgeText, { color: isDark ? '#c4b5fd' : '#7c3aed' }]}>
              INTELLIGENT ASSISTANT
            </Text>
          </View>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#1e1b4b' }]}>
            Your Brain,{'\n'}
            <Text style={[styles.titleAccent, { color: isDark ? '#c4b5fd' : '#8b5cf6' }]}>
              Extended
            </Text>
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(30,27,75,0.75)' }]}>
            Capture ideas instantly and let AI transform them into organized, actionable knowledge.
          </Text>
        </View>
      </Animated.View>

      {/* Footer */}
      <Animated.View style={[styles.footer, textAnimatedStyle]}>
        <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(30,27,75,0.5)' }]}>
            Skip
          </Text>
        </TouchableOpacity>
        
        <View style={styles.pagination}>
          <View style={[styles.dot, styles.dotActive, { backgroundColor: isDark ? '#c4b5fd' : '#8b5cf6' }]} />
          <View style={[styles.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(30,27,75,0.2)' }]} />
          <View style={[styles.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(30,27,75,0.2)' }]} />
        </View>
        
        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: isDark ? '#8b5cf6' : '#7c3aed' }]} 
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextIcon}>Next</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blobContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: '10%',
    left: -100,
  },
  blob2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    top: '50%',
    right: -80,
  },
  blob3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: '15%',
    left: '20%',
  },
  graphicContainer: {
    position: 'absolute',
    top: height * 0.18,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  mainCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderWidth: 3,
    borderColor: 'rgba(196, 181, 253, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  centerGlyph: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerGlyphDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  particle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  particleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 140,
  },
  headerContainer: {
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    marginBottom: 18,
    lineHeight: 58,
  },
  titleAccent: {
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '400',
  },
  footer: {
    position: 'absolute',
    bottom: 45,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    left: '50%',
    marginLeft: -28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 32,
  },
  nextButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  nextIcon: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default Onboarding1;
