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
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface Onboarding3Props {
  onGetStarted: () => void;
  theme?: 'light' | 'dark';
}

const Onboarding3: React.FC<Onboarding3Props> = ({ onGetStarted, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  
  // Animation values
  const opacity = useSharedValue(0);
  const textY = useSharedValue(50);
  const buttonScale = useSharedValue(0);
  
  // Checkmark animation
  const checkScale = useSharedValue(0);
  const checkRotate = useSharedValue(-180);
  
  // Success rings
  const rings = Array.from({ length: 4 }, () => ({
    scale: useSharedValue(0),
    opacity: useSharedValue(0),
  }));
  
  // Confetti particles
  const confetti = Array.from({ length: 20 }, () => ({
    translateY: useSharedValue(-100),
    translateX: useSharedValue(0),
    rotate: useSharedValue(0),
    opacity: useSharedValue(0),
  }));

  useEffect(() => {
    // Entrance
    opacity.value = withTiming(1, { duration: 800 });
    textY.value = withSpring(0, { damping: 15 });
    
    // Checkmark pop in
    setTimeout(() => {
      checkScale.value = withSpring(1, { 
        damping: 8, 
        stiffness: 100,
        overshootClamping: false,
      });
      checkRotate.value = withSpring(0, { damping: 12 });
    }, 400);
    
    // Success rings expand
    setTimeout(() => {
      rings.forEach((ring, index) => {
        setTimeout(() => {
          ring.scale.value = withSpring(1, { damping: 10 });
          ring.opacity.value = withSequence(
            withTiming(0.8, { duration: 400 }),
            withTiming(0, { duration: 800 })
          );
        }, index * 200);
      });
    }, 700);
    
    // Confetti explosion
    setTimeout(() => {
      confetti.forEach((particle, index) => {
        const angle = (index / confetti.length) * Math.PI * 2;
        const distance = 80 + Math.random() * 100;
        const endX = Math.cos(angle) * distance;
        const endY = Math.sin(angle) * distance;
        
        particle.opacity.value = withTiming(1, { duration: 100 });
        particle.translateX.value = withSequence(
          withTiming(endX, { duration: 800, easing: Easing.out(Easing.cubic) }),
          withTiming(endX, { duration: 500 }),
          withTiming(endX + (Math.random() - 0.5) * 40, { duration: 1000 })
        );
        particle.translateY.value = withSequence(
          withTiming(endY, { duration: 800, easing: Easing.out(Easing.cubic) }),
          withTiming(endY + 200, { duration: 1500, easing: Easing.in(Easing.cubic) })
        );
        particle.rotate.value = withRepeat(
          withTiming(360, { duration: 1000, easing: Easing.linear }),
          -1,
          false
        );
      });
    }, 1000);
    
    // Button entrance
    setTimeout(() => {
      buttonScale.value = withSpring(1, { damping: 10 });
    }, 1400);
  }, []);

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textY.value }],
    opacity: opacity.value,
  }));
  
  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: checkScale.value },
      { rotate: `${checkRotate.value}deg` },
    ],
  }));
  
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: opacity.value,
  }));

  const colors = isDark 
    ? ['#0a0517', '#1a0f2e', '#2d1854'] 
    : ['#faf5ff', '#f3e8ff', '#e9d5ff'];
  
  const confettiColors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#f59e0b', '#ec4899', '#10b981'];
  const confettiShapes = ['●', '■', '▲', '★', '♦', '✦'];

  return (
    <LinearGradient colors={colors} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Success visualization */}
      <View style={styles.graphicContainer}>
        {/* Expanding rings */}
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
                },
                ringStyle,
              ]}
            />
          );
        })}
        
        {/* Center checkmark */}
        <Animated.View style={[styles.checkContainer, checkAnimatedStyle]}>
          <Text style={styles.checkmark}>✓</Text>
        </Animated.View>
        
        {/* Confetti */}
        {confetti.map((particle, index) => {
          const particleStyle = useAnimatedStyle(() => ({
            transform: [
              { translateX: particle.translateX.value },
              { translateY: particle.translateY.value },
              { rotate: `${particle.rotate.value}deg` },
            ],
            opacity: particle.opacity.value,
          }));
          
          const color = confettiColors[index % confettiColors.length];
          const shape = confettiShapes[index % confettiShapes.length];
          
          return (
            <Animated.View
              key={`confetti-${index}`}
              style={[styles.confetti, particleStyle]}
            >
              <Text style={[styles.confettiShape, { color }]}>{shape}</Text>
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
            activeOpacity={0.9}
          >
            <Text style={styles.startButtonText}>Get Started</Text>
            <Text style={styles.startButtonIcon}>✨</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.pagination}>
          <View style={[styles.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(30,27,75,0.2)' }]} />
          <View style={[styles.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(30,27,75,0.2)' }]} />
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
    top: height * 0.2,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
  },
  checkContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  checkmark: {
    fontSize: 80,
    color: '#fff',
    fontWeight: 'bold',
  },
  confetti: {
    position: 'absolute',
  },
  confettiShape: {
    fontSize: 24,
    fontWeight: 'bold',
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
    fontSize: 22,
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
