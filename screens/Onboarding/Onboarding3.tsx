import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { height } = Dimensions.get('window');

interface Onboarding3Props {
  onGetStarted: () => void;
  theme?: 'light' | 'dark';
}

const Onboarding3: React.FC<Onboarding3Props> = ({ onGetStarted, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  
  // Animation values
  const opacity = useSharedValue(0);
  const textY = useSharedValue(50);
  const buttonScale = useSharedValue(0.9);

  // Logo animation
  const checkScale = useSharedValue(0.85);

  // Success rings
  const rings = Array.from({ length: 2 }, () => ({
    scale: useSharedValue(0),
    opacity: useSharedValue(0),
  }));

  // Confetti particles
  const confetti = Array.from({ length: 16 }, () => ({
    translateY: useSharedValue(-100),
    translateX: useSharedValue(0),
    opacity: useSharedValue(0),
  }));

  useEffect(() => {
    // Entrance
    opacity.value = withTiming(1, { duration: 700 });
    textY.value = withTiming(0, { duration: 700 });

    // Logo pop in
    setTimeout(() => {
      checkScale.value = withTiming(1, { duration: 500 });
    }, 400);

    // Success rings expand
    setTimeout(() => {
      rings.forEach((ring, index) => {
        setTimeout(() => {
          ring.scale.value = withTiming(1, { duration: 700 });
          ring.opacity.value = withSequence(
            withTiming(0.8, { duration: 400 }),
            withTiming(0, { duration: 800 })
          );
        }, index * 200);
      });
    }, 700);

    // Confetti burst
    setTimeout(() => {
      confetti.forEach((particle, index) => {
        const angle = (index / confetti.length) * Math.PI * 2;
        const distance = 70 + Math.random() * 80;
        const endX = Math.cos(angle) * distance;
        const endY = Math.sin(angle) * distance;

        particle.opacity.value = withSequence(
          withTiming(1, { duration: 120 }),
          withDelay(700, withTiming(0, { duration: 600 }))
        );
        particle.translateX.value = withSequence(
          withTiming(endX, { duration: 800, easing: Easing.out(Easing.cubic) }),
          withTiming(endX, { duration: 500 })
        );
        particle.translateY.value = withSequence(
          withTiming(endY, { duration: 800, easing: Easing.out(Easing.cubic) }),
          withTiming(endY + 180, { duration: 1300, easing: Easing.in(Easing.cubic) })
        );
      });
    }, 1000);

    // Button entrance
    setTimeout(() => {
      buttonScale.value = withTiming(1, { duration: 500 });
    }, 1400);
  }, []);

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textY.value }],
    opacity: opacity.value,
  }));
  
  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));
  
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: opacity.value,
  }));

  const colors = isDark 
    ? ['#0a0517', '#1a0f2e', '#2d1854'] 
    : ['#faf5ff', '#f3e8ff', '#e9d5ff'];
  
  const confettiColors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#f59e0b', '#10b981'];
  const confettiSizes = [6, 8, 10, 12];

  return (
    <LinearGradient colors={colors} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Success visualization */}
      <View style={styles.graphicContainer}>
        {rings.map((ring, index) => {
          const ringStyle = useAnimatedStyle(() => ({
            transform: [{ scale: ring.scale.value }],
            opacity: ring.opacity.value,
          }));
          const ringSize = 160 + index * 60;
          return (
            <Animated.View
              key={`ring-${index}`}
              style={[
                styles.ring,
                {
                  width: ringSize,
                  height: ringSize,
                  borderRadius: ringSize / 2,
                  borderWidth: 3,
                  borderColor: isDark ? '#c4b5fd' : '#8b5cf6',
                  marginTop: 60,
                },
                ringStyle,
              ]}
            />
          );
        })}

        {/* Checkmark badge */}
        <Animated.View style={[styles.checkContainer, checkAnimatedStyle]}>
          <Image
            source={require('../../assets/app-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Confetti particles */}
        {confetti.map((particle, index) => {
          const particleStyle = useAnimatedStyle(() => ({
            transform: [
              { translateX: particle.translateX.value },
              { translateY: particle.translateY.value },
            ],
            opacity: particle.opacity.value,
          }));

          const color = confettiColors[index % confettiColors.length];
          const size = confettiSizes[index % confettiSizes.length];
          const isCircle = index % 2 === 0;

          return (
            <Animated.View
              key={`confetti-${index}`}
              style={[styles.confetti, particleStyle]}
            >
              <View
                style={[
                  styles.confettiShape,
                  {
                    backgroundColor: color,
                    width: size,
                    height: size,
                    borderRadius: isCircle ? size / 2 : 2,
                  },
                ]}
              />
            </Animated.View>
          );
        })}
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, textAnimatedStyle]}>
        <View style={styles.headerContainer}>
          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.2)' : 'rgba(124, 58, 237, 0.2)' }]}>
            <Text style={[styles.badgeText, { color: isDark ? '#c4b5fd' : '#7c3aed' }]}>
              YOU'RE ALL SET
            </Text>
          </View>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#1e1b4b' }]}>
            Ready to{'\n'}
            <Text style={[styles.titleAccent, { color: isDark ? '#c4b5fd' : '#8b5cf6' }]}>
              Transform
            </Text>
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(30,27,75,0.75)' }]}>
            Your intelligent workspace awaits. Start capturing and organizing your ideas effortlessly.
          </Text>
        </View>

        <Animated.View style={buttonAnimatedStyle}>
          <TouchableOpacity 
            style={[styles.startButton, { backgroundColor: isDark ? '#8b5cf6' : '#7c3aed' }]}
            onPress={onGetStarted}
            activeOpacity={0.85}
          >
            <Text style={styles.startButtonText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Footer pagination */}
      <View style={styles.footer}>
        <View style={styles.pagination}>
          <View style={[styles.dot, { backgroundColor: isDark ? 'rgba(196, 181, 253, 0.3)' : 'rgba(139, 92, 246, 0.3)' }]} />
          <View style={[styles.dot, { backgroundColor: isDark ? 'rgba(196, 181, 253, 0.3)' : 'rgba(139, 92, 246, 0.3)' }]} />
          <View style={[styles.dot, styles.dotActive, { backgroundColor: isDark ? '#c4b5fd' : '#8b5cf6' }]} />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  graphicContainer: {
    position: 'absolute',
    top: height * 0.24,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  checkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 300,
    height: 300,
    marginTop: 60,
  },
  confetti: {
    position: 'absolute',
  },
  confettiShape: {
    opacity: 0.95,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 140,
  },
  headerContainer: {
    alignItems: 'flex-start',
    marginBottom: 32,
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
    paddingBottom:350,
    lineHeight: 58,
  },
  titleAccent: {
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '400',
    marginBottom: 8,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    paddingHorizontal: 40,
    borderRadius: 32,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  startButtonText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
    marginRight: 10,
  },
  startButtonIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 32,
  },
});

export default Onboarding3;
