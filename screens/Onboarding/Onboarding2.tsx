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
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface Onboarding2Props {
  onNext: () => void;
  onSkip: () => void;
  theme?: 'light' | 'dark';
}

const Onboarding2: React.FC<Onboarding2Props> = ({ onNext, onSkip, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  
  // Animation values
  const opacity = useSharedValue(0);
  const textY = useSharedValue(50);

  // Wave animations
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const wave3 = useSharedValue(0);

  // Cards stacking animation
  const cards = Array.from({ length: 5 }, () => ({
    translateY: useSharedValue(200),
    rotate: useSharedValue(0),
    scale: useSharedValue(0.8),
    opacity: useSharedValue(0),
  }));

  // Connecting lines
  const lines = Array.from({ length: 6 }, () => ({
    scaleX: useSharedValue(0),
    opacity: useSharedValue(0),
  }));

  useEffect(() => {
    // Entrance
    opacity.value = withTiming(1, { duration: 800 });
    textY.value = withSpring(0, { damping: 15 });

    // Waves
    wave1.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    wave2.value = withDelay(
      300,
      withRepeat(
        withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
    wave3.value = withDelay(
      600,
      withRepeat(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    // Cards stack with cascade
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.translateY.value = withSpring(0, { damping: 12, stiffness: 80 });
        card.scale.value = withSpring(1, { damping: 10 });
        card.opacity.value = withTiming(1, { duration: 400 });
        card.rotate.value = withSpring((index - 2) * 3, { damping: 15 });
      }, index * 150);
    });

    // Lines draw
    setTimeout(() => {
      lines.forEach((line, index) => {
        setTimeout(() => {
          line.scaleX.value = withTiming(1, {
            duration: 600,
            easing: Easing.out(Easing.cubic),
          });
          line.opacity.value = withTiming(0.6, { duration: 600 });
        }, index * 100);
      });
    }, 800);
  }, []);

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textY.value }],
    opacity: opacity.value,
  }));
  
  const wave1Style = useAnimatedStyle(() => {
    const translateY = interpolate(wave1.value, [0, 1], [0, 20]);
    const scale = interpolate(wave1.value, [0, 1], [1, 1.05]);
    return {
      transform: [{ translateY }, { scale }],
      opacity: interpolate(wave1.value, [0, 1], [0.5, 0.8]),
    };
  });

  const wave2Style = useAnimatedStyle(() => {
    const translateY = interpolate(wave2.value, [0, 1], [0, -15]);
    const scale = interpolate(wave2.value, [0, 1], [1, 1.03]);
    return {
      transform: [{ translateY }, { scale }],
      opacity: interpolate(wave2.value, [0, 1], [0.4, 0.7]),
    };
  });

  const wave3Style = useAnimatedStyle(() => {
    const translateY = interpolate(wave3.value, [0, 1], [0, 10]);
    const scale = interpolate(wave3.value, [0, 1], [1, 1.04]);
    return {
      transform: [{ translateY }, { scale }],
      opacity: interpolate(wave3.value, [0, 1], [0.3, 0.6]),
    };
  });

  const colors = isDark 
    ? ['#000000', '#0a0a0a', '#111111'] 
    : ['#FFFFFF', '#FAFAFA', '#F5F5F5'];
  
  const cardColors = ['#555555', '#777777', '#999999', '#BBBBBB', '#DDDDDD'];

  return (
    <LinearGradient colors={colors} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Animated waves */}
      <View style={styles.wavesContainer}>
        <Animated.View style={[styles.wave, styles.wave1, wave1Style]} />
        <Animated.View style={[styles.wave, styles.wave2, wave2Style]} />
        <Animated.View style={[styles.wave, styles.wave3, wave3Style]} />
      </View>

      {/* Stacked cards visualization */}
      <View style={styles.cardsContainer}>
        {/* Connecting lines */}
        {lines.map((line, index) => {
          const lineStyle = useAnimatedStyle(() => ({
            transform: [{ scaleX: line.scaleX.value }],
            opacity: line.opacity.value,
          }));

          return (
            <Animated.View
              key={`line-${index}`}
              style={[
                styles.connectLine,
                { top: 80 + index * 45 },
                lineStyle,
              ]}
            />
          );
        })}

        {/* Cards */}
        {cards.map((card, index) => {
          const cardStyle = useAnimatedStyle(() => ({
            transform: [
              { translateY: card.translateY.value },
              { rotate: `${card.rotate.value}deg` },
              { scale: card.scale.value },
            ],
            opacity: card.opacity.value,
            zIndex: 5 - index,
          }));

          return (
            <Animated.View
              key={`card-${index}`}
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  top: 20 + index * 50,
                },
                cardStyle,
              ]}
            >
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: `${cardColors[index]}30` },
                ]}
              >
                <View
                  style={[
                    styles.cardIconDot,
                    { backgroundColor: isDark ? '#FFFFFF' : '#000000' },
                  ]}
                />
                <View
                  style={[
                    styles.cardIconLine,
                    { backgroundColor: isDark ? '#FFFFFF' : '#000000' },
                  ]}
                />
              </View>
              <View style={styles.cardContent}>
                <View style={[styles.cardLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }]} />
                <View style={[styles.cardLine, styles.cardLineShort, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, textAnimatedStyle]}>
        <View style={styles.headerContainer}>
          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)' }]}>
            <Text style={[styles.badgeText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              ORGANIZE SMARTLY
            </Text>
          </View>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Everything{'\n'}
            <Text style={[styles.titleAccent, { color: isDark ? '#AAAAAA' : '#444444' }]}>
              Connected
            </Text>
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(30,27,75,0.75)' }]}>
            AI automatically organizes and links your thoughts, creating a seamless knowledge network.
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
          <View style={[styles.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(30,27,75,0.2)' }]} />
          <View style={[styles.dot, styles.dotActive, { backgroundColor: isDark ? '#AAAAAA' : '#444444' }]} />
          <View style={[styles.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(30,27,75,0.2)' }]} />
        </View>
        
        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} 
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextIcon, { color: isDark ? '#000' : '#fff' }]}>Next</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wavesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  wave: {
    position: 'absolute',
    width: width * 1.5,
    height: 200,
    borderRadius: 100,
    left: -width * 0.25,
  },
  wave1: {
    backgroundColor: '#888888',
    opacity: 0.12,
    top: '20%',
  },
  wave2: {
    backgroundColor: '#AAAAAA',
    opacity: 0.09,
    top: '30%',
  },
  wave3: {
    backgroundColor: '#CCCCCC',
    opacity: 0.07,
    top: '40%',
  },
  cardsContainer: {
    position: 'absolute',
    top: height * 0.15,
    left: 40,
    right: 40,
    height: 350,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: 85,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150, 150, 150, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardIconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  cardIconLine: {
    width: 22,
    height: 2,
    borderRadius: 1,
  },
  cardContent: {
    flex: 1,
    gap: 8,
  },
  cardLine: {
    height: 12,
    borderRadius: 6,
    width: '100%',
  },
  cardLineShort: {
    width: '65%',
  },
  connectLine: {
    position: 'absolute',
    left: '50%',
    width: 2,
    height: 40,
    backgroundColor: 'rgba(150, 150, 150, 0.4)',
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
    shadowColor: '#000000',
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

export default Onboarding2;
