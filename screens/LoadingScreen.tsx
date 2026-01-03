import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface LoadingScreenProps {
  onAnimationComplete?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onAnimationComplete }) => {
  const [currentPhase, setCurrentPhase] = useState(0);
  const phases = ['Data', 'Think', 'Create'];
  
  // Animation values
  const brainScale = useRef(new Animated.Value(0)).current;
  const brainRotate = useRef(new Animated.Value(0)).current;
  const brainGlow = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const phaseOpacity = useRef(new Animated.Value(0)).current;
  const phaseScale = useRef(new Animated.Value(0.8)).current;
  const nodeAnimations = useRef(
    Array.from({ length: 6 }, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;
  const connectionOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startAnimationSequence();
  }, []);

  const startAnimationSequence = () => {
    // Phase 1: Brain appears with scale and rotation
    Animated.sequence([
      // Brain entrance
      Animated.parallel([
        Animated.spring(brainScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(brainRotate, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Title appears
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Start neural network animation
      animateNeuralNodes();
      startPulseAnimation();
      startPhaseAnimation();
    });
  };

  const animateNeuralNodes = () => {
    const nodeSequence = nodeAnimations.map((node, index) =>
      Animated.sequence([
        Animated.delay(index * 150),
        Animated.parallel([
          Animated.spring(node.scale, {
            toValue: 1,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(node.opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    Animated.parallel([
      ...nodeSequence,
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(connectionOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(brainGlow, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(brainGlow, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startPhaseAnimation = () => {
    let phase = 0;
    
    const animatePhase = () => {
      setCurrentPhase(phase);
      
      Animated.sequence([
        Animated.parallel([
          Animated.timing(phaseOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(phaseScale, {
            toValue: 1,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(800),
        Animated.parallel([
          Animated.timing(phaseOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(phaseScale, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        phase = (phase + 1) % phases.length;
        if (phase === 0 && onAnimationComplete) {
          onAnimationComplete();
        } else {
          animatePhase();
        }
      });
    };

    animatePhase();
  };

  const brainRotation = brainRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = brainGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  // Neural node positions around the brain
  const nodePositions = [
    { top: -30, left: 20 },
    { top: -20, right: 10 },
    { top: 40, left: -20 },
    { top: 50, right: -15 },
    { top: 100, left: 30 },
    { top: 90, right: 25 },
  ];

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient} />
      
      {/* Animated brain container */}
      <Animated.View
        style={[
          styles.brainContainer,
          {
            transform: [
              { scale: Animated.multiply(brainScale, pulseAnim) },
            ],
          },
        ]}
      >
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.brainGlow,
            {
              opacity: glowOpacity,
            },
          ]}
        />
        
        {/* Brain SVG-like shape using views */}
        <Animated.View
          style={[
            styles.brain,
            {
              transform: [{ rotate: brainRotation }],
            },
          ]}
        >
          {/* Brain left hemisphere */}
          <View style={styles.brainLeftHemisphere}>
            <View style={styles.brainFold1} />
            <View style={styles.brainFold2} />
            <View style={styles.brainFold3} />
          </View>
          
          {/* Brain right hemisphere */}
          <View style={styles.brainRightHemisphere}>
            <View style={styles.brainFold1Right} />
            <View style={styles.brainFold2Right} />
            <View style={styles.brainFold3Right} />
          </View>
          
          {/* Brain center line */}
          <View style={styles.brainCenter} />
        </Animated.View>

        {/* Neural network nodes */}
        {nodePositions.map((pos, index) => (
          <Animated.View
            key={index}
            style={[
              styles.neuralNode,
              pos,
              {
                transform: [{ scale: nodeAnimations[index].scale }],
                opacity: nodeAnimations[index].opacity,
              },
            ]}
          >
            <View style={styles.neuralNodeInner} />
          </Animated.View>
        ))}

        {/* Connection lines */}
        <Animated.View
          style={[
            styles.connectionContainer,
            { opacity: connectionOpacity },
          ]}
        >
          <View style={[styles.connectionLine, { transform: [{ rotate: '45deg' }], top: 10, left: 40 }]} />
          <View style={[styles.connectionLine, { transform: [{ rotate: '-45deg' }], top: 10, right: 40 }]} />
          <View style={[styles.connectionLine, { transform: [{ rotate: '30deg' }], top: 60, left: 10 }]} />
          <View style={[styles.connectionLine, { transform: [{ rotate: '-30deg' }], top: 60, right: 10 }]} />
        </Animated.View>
      </Animated.View>

      {/* Title */}
      <Animated.View
        style={[
          styles.titleContainer,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        <Text style={styles.title}>Brain</Text>
        <Text style={styles.titleExtension}>Extension</Text>
      </Animated.View>

      {/* Phase indicator */}
      <Animated.View
        style={[
          styles.phaseContainer,
          {
            opacity: phaseOpacity,
            transform: [{ scale: phaseScale }],
          },
        ]}
      >
        <View style={styles.phaseIndicator}>
          <View style={styles.phaseDot} />
          <Text style={styles.phaseText}>{phases[currentPhase]}</Text>
          <View style={styles.phaseLineContainer}>
            <View style={styles.phaseLine} />
          </View>
        </View>
      </Animated.View>

      {/* Bottom loading dots */}
      <View style={styles.loadingDotsContainer}>
        {[0, 1, 2].map((index) => (
          <LoadingDot key={index} delay={index * 200} />
        ))}
      </View>
    </View>
  );
};

// Loading dot component with individual animation
const LoadingDot: React.FC<{ delay: number }> = ({ delay }) => {
  const dotOpacity = useRef(new Animated.Value(0.3)).current;
  const dotScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(dotOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dotScale, {
            toValue: 1.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(dotOpacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dotScale, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [delay]);

  return (
    <Animated.View
      style={[
        styles.loadingDot,
        {
          opacity: dotOpacity,
          transform: [{ scale: dotScale }],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundGradient: {
    position: 'absolute',
    width: width * 2,
    height: height * 2,
    borderRadius: width,
    backgroundColor: '#1a1a2e',
    opacity: 0.3,
  },
  brainContainer: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  brainGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  brain: {
    width: 100,
    height: 80,
    position: 'relative',
  },
  brainLeftHemisphere: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 48,
    height: 75,
    backgroundColor: '#8b5cf6',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 10,
    overflow: 'hidden',
  },
  brainRightHemisphere: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 48,
    height: 75,
    backgroundColor: '#a78bfa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 40,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 35,
    overflow: 'hidden',
  },
  brainFold1: {
    position: 'absolute',
    top: 15,
    left: 5,
    width: 35,
    height: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 4,
    transform: [{ rotate: '-10deg' }],
  },
  brainFold2: {
    position: 'absolute',
    top: 30,
    left: 8,
    width: 30,
    height: 6,
    backgroundColor: '#7c3aed',
    borderRadius: 3,
    transform: [{ rotate: '5deg' }],
  },
  brainFold3: {
    position: 'absolute',
    top: 45,
    left: 5,
    width: 32,
    height: 7,
    backgroundColor: '#7c3aed',
    borderRadius: 3.5,
    transform: [{ rotate: '-5deg' }],
  },
  brainFold1Right: {
    position: 'absolute',
    top: 15,
    right: 5,
    width: 35,
    height: 8,
    backgroundColor: '#8b5cf6',
    borderRadius: 4,
    transform: [{ rotate: '10deg' }],
  },
  brainFold2Right: {
    position: 'absolute',
    top: 30,
    right: 8,
    width: 30,
    height: 6,
    backgroundColor: '#8b5cf6',
    borderRadius: 3,
    transform: [{ rotate: '-5deg' }],
  },
  brainFold3Right: {
    position: 'absolute',
    top: 45,
    right: 5,
    width: 32,
    height: 7,
    backgroundColor: '#8b5cf6',
    borderRadius: 3.5,
    transform: [{ rotate: '5deg' }],
  },
  brainCenter: {
    position: 'absolute',
    left: '50%',
    top: 5,
    width: 4,
    height: 65,
    backgroundColor: '#6366f1',
    marginLeft: -2,
    borderRadius: 2,
  },
  neuralNode: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  neuralNodeInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
  },
  connectionContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  connectionLine: {
    position: 'absolute',
    width: 30,
    height: 2,
    backgroundColor: 'rgba(99, 102, 241, 0.4)',
    borderRadius: 1,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 42,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: 8,
  },
  titleExtension: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366f1',
    letterSpacing: 12,
    marginTop: 5,
    textTransform: 'uppercase',
  },
  phaseContainer: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseIndicator: {
    alignItems: 'center',
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    marginBottom: 10,
  },
  phaseText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  phaseLineContainer: {
    marginTop: 10,
    width: 40,
    height: 2,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  phaseLine: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6366f1',
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 80,
    gap: 12,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366f1',
  },
});

export default LoadingScreen;
