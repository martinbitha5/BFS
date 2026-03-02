import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

const DEEP_NAVY = '#0a1628';
const ACCENT = '#00b4d8';
const WHITE = '#ffffff';
const MUTED = 'rgba(255,255,255,0.78)';

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const planeX = useRef(new Animated.Value(-120)).current;
  const planeOpacity = useRef(new Animated.Value(0)).current;
  const planeRotate = useRef(new Animated.Value(0)).current;
  const bagX = useRef(new Animated.Value(120)).current;
  const bagOpacity = useRef(new Animated.Value(0)).current;
  const centerScale = useRef(new Animated.Value(0.3)).current;
  const centerOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0.7)).current;
  const ring2Scale = useRef(new Animated.Value(0)).current;
  const ring2Opacity = useRef(new Animated.Value(0.4)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(28)).current;
  const titleScale = useRef(new Animated.Value(0.92)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const lineGlow = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const particles = useRef(
    Array.from({ length: 6 }, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      // Avion + bagage convergent
      Animated.parallel([
        Animated.timing(planeX, { toValue: -42, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(planeOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(planeRotate, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(bagX, { toValue: 42, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(bagOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      // Cercles + anneaux + particules
      Animated.parallel([
        Animated.spring(centerScale, { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
        Animated.timing(centerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 2.2, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(120),
          Animated.parallel([
            Animated.timing(ring2Scale, { toValue: 2.4, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(ring2Opacity, { toValue: 0, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          ]),
        ]),
        ...particles.map((p, i) =>
          Animated.sequence([
            Animated.delay(350 + i * 90),
            Animated.parallel([
              Animated.spring(p.scale, { toValue: 1, tension: 100, friction: 6, useNativeDriver: true }),
              Animated.timing(p.opacity, { toValue: 0.6, duration: 350, useNativeDriver: true }),
            ]),
          ])
        ),
      ]),
      // Double pulse sur les cercles
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.06, duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(120),
        Animated.timing(pulseScale, { toValue: 1.04, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
      // Texte + ligne runway
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(titleScale, { toValue: 1, duration: 650, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(200),
          Animated.parallel([
            Animated.timing(lineWidth, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.sequence([
              Animated.delay(400),
              Animated.timing(lineGlow, { toValue: 1, duration: 500, useNativeDriver: true }),
            ]),
          ]),
        ]),
      ]),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 500, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
      ]),
      Animated.delay(1500),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 0, duration: 550, useNativeDriver: true }),
        Animated.timing(centerOpacity, { toValue: 0, duration: 550, useNativeDriver: true }),
        Animated.timing(planeOpacity, { toValue: 0, duration: 550, useNativeDriver: true }),
        Animated.timing(bagOpacity, { toValue: 0, duration: 550, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 0, duration: 550, useNativeDriver: true }),
        Animated.timing(subtitleOpacity, { toValue: 0, duration: 550, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 0, duration: 550, useNativeDriver: true }),
        Animated.timing(lineWidth, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(lineGlow, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onFinish());
    });
  }, []);

  const planeRotateInterpolate = planeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-20deg', '0deg'],
  });

  const lineScaleX = lineWidth;

  const lineGlowInterpolate = lineGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const particlePositions = [
    { top: -25, left: -20 },
    { top: -15, right: -35 },
    { top: 10, right: -40 },
    { bottom: -5, right: -25 },
    { bottom: -20, left: -15 },
    { top: 5, left: -40 },
  ];

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>
      {/* Anneaux en cascade */}
      <Animated.View
        style={[
          styles.ring,
          {
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          styles.ring2,
          {
            transform: [{ scale: ring2Scale }],
            opacity: ring2Opacity,
          },
        ]}
      />

      {/* Zone centrale */}
      <View style={styles.centerZone}>
        {/* Particules autour */}
        {particles.map((p, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              particlePositions[i],
              {
                transform: [
                  { scale: Animated.multiply(p.scale, pulseScale) },
                ],
                opacity: p.opacity,
              },
            ]}
          />
        ))}
        <Animated.View
          style={[
            styles.iconCircle,
            {
              transform: [
                { scale: Animated.multiply(centerScale, pulseScale) },
                { translateX: planeX },
                { rotate: planeRotateInterpolate },
              ],
              opacity: Animated.multiply(planeOpacity, centerOpacity),
            },
          ]}>
          <Ionicons name="airplane" size={36} color={WHITE} />
        </Animated.View>
        <Animated.View
          style={[
            styles.iconCircle,
            {
              transform: [
                { scale: Animated.multiply(centerScale, pulseScale) },
                { translateX: bagX },
              ],
              opacity: Animated.multiply(bagOpacity, centerOpacity),
            },
          ]}>
          <Ionicons name="briefcase" size={36} color={WHITE} />
        </Animated.View>
      </View>

      {/* Texte */}
      <Animated.View
        style={[
          styles.textBlock,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleY }, { scale: titleScale }],
          },
        ]}>
        <Text style={styles.title}>Police Bagages</Text>
        <Animated.View style={[styles.runwayLine, { transform: [{ scaleX: lineScaleX }], opacity: lineGlowInterpolate }]} />
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Gestion intelligente des bagages aéroportuaires
        </Animated.Text>
        <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoClip} collapsable={false}>
            <Image
              source={require('../../assets/images/csi-logo.png')}
              style={styles.csiLogo}
              contentFit="cover"
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DEEP_NAVY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 140,
    height: 140,
    marginLeft: -70,
    marginTop: -80,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: ACCENT,
  },
  ring2: {
    borderColor: 'rgba(0,180,216,0.5)',
  },
  centerZone: {
    position: 'absolute',
    width: 220,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 55,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  iconCircle: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 14,
  },
  textBlock: {
    position: 'absolute',
    bottom: '18%',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: WHITE,
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 12,
  },
  runwayLine: {
    width: 180,
    height: 2,
    backgroundColor: ACCENT,
    borderRadius: 1,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 20,
  },
  logoContainer: {
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoClip: {
    width: 170,
    height: 68,
    borderRadius: 24,
    overflow: 'hidden',
  },
  csiLogo: {
    width: 170,
    height: 68,
  },
});
