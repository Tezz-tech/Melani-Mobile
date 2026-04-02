// src/screens/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const MELANIN_LOGO = require('../../assets/Melanin.png');

// Adinkra-inspired decorative circle data
const CIRCLES = [
  { size: 340, top: -80,  left: -100, opacity: 0.07 },
  { size: 220, top: 60,   right: -60, opacity: 0.10 },
  { size: 180, bottom: 100, left: -40, opacity: 0.08 },
  { size: 260, bottom: -60, right: -80, opacity: 0.06 },
  { size: 120, top: height * 0.38, left: 30, opacity: 0.05 },
];

export default function SplashScreen() {
  const navigation = useNavigation();

  // ── Animations ──────────────────────────────────────────────
  const bgFade       = useRef(new Animated.Value(0)).current;
  const ringScale    = useRef(new Animated.Value(0.4)).current;
  const ringOpacity  = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.3)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoRotate   = useRef(new Animated.Value(-8)).current;  // slight tilt → 0
  const glowPulse    = useRef(new Animated.Value(0.6)).current;
  const textSlide    = useRef(new Animated.Value(30)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const taglineSlide = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const dotFade      = useRef(new Animated.Value(0)).current;
  // ────────────────────────────────────────────────────────────

  useEffect(() => {
    // 1. Background fades in
    Animated.timing(bgFade, {
      toValue: 1, duration: 600, useNativeDriver: true,
    }).start();

    // 2. Decorative rings expand + fade in
    Animated.parallel([
      Animated.spring(ringScale, {
        toValue: 1, friction: 6, tension: 40, useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 1, duration: 800, useNativeDriver: true,
      }),
    ]).start();

    // 3. Logo pops in with spring + rotation settle
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1, friction: 5, tension: 60, useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 500, useNativeDriver: true,
        }),
        Animated.spring(logoRotate, {
          toValue: 0, friction: 7, tension: 50, useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // 4. Glow pulse loop
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, {
            toValue: 1, duration: 1200, useNativeDriver: true,
          }),
          Animated.timing(glowPulse, {
            toValue: 0.6, duration: 1200, useNativeDriver: true,
          }),
        ])
      ).start();
    }, 800);

    // 5. App name slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(textSlide, {
          toValue: 0, friction: 8, tension: 50, useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1, duration: 500, useNativeDriver: true,
        }),
      ]).start();
    }, 750);

    // 6. Tagline slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(taglineSlide, {
          toValue: 0, friction: 8, tension: 50, useNativeDriver: true,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 1, duration: 500, useNativeDriver: true,
        }),
      ]).start();
    }, 1000);

    // 7. Loading dots fade in
    setTimeout(() => {
      Animated.timing(dotFade, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }).start();
    }, 1400);

    // 8. Navigate after animation settles
    const timer = setTimeout(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    }, 3200);

    return () => clearTimeout(timer);
  }, []);

  const spin = logoRotate.interpolate({
    inputRange: [-8, 0],
    outputRange: ['-8deg', '0deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1C0A00" translucent />

      {/* ── African geometric background ── */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.bgLayer, { opacity: bgFade }]}>
        {/* Radial gradient simulation — layered circles */}
        <View style={styles.gradientCenter} />
        <View style={styles.gradientMid} />
        <View style={styles.gradientOuter} />

        {/* Adinkra-inspired decorative rings */}
        <Animated.View style={[styles.decoRingsWrapper, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}>
          {CIRCLES.map((c, i) => (
            <View
              key={i}
              style={[
                styles.decoCircle,
                {
                  width: c.size,
                  height: c.size,
                  borderRadius: c.size / 2,
                  opacity: c.opacity,
                  ...(c.top    !== undefined ? { top: c.top }       : {}),
                  ...(c.bottom !== undefined ? { bottom: c.bottom } : {}),
                  ...(c.left   !== undefined ? { left: c.left }     : {}),
                  ...(c.right  !== undefined ? { right: c.right }   : {}),
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Kente-inspired horizontal stripe accents */}
        <View style={[styles.stripe, { top: height * 0.12, opacity: 0.18 }]} />
        <View style={[styles.stripe, styles.stripeGold, { top: height * 0.13, opacity: 0.10 }]} />
        <View style={[styles.stripe, { bottom: height * 0.10, opacity: 0.14 }]} />
        <View style={[styles.stripe, styles.stripeGold, { bottom: height * 0.09, opacity: 0.08 }]} />
      </Animated.View>

      {/* ── Logo block ── */}
      <View style={styles.content}>

        {/* Glow halo behind logo */}
        <Animated.View style={[styles.glow, { opacity: glowPulse }]} />

        {/* Logo image */}
        <Animated.View style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }, { rotate: spin }],
          },
        ]}>
          <Image source={MELANIN_LOGO} style={styles.logoImage} resizeMode="contain" />
        </Animated.View>

        {/* App name */}
        <Animated.Text style={[
          styles.appName,
          { opacity: textOpacity, transform: [{ translateY: textSlide }] },
        ]}>
          MELANI SCAN
        </Animated.Text>

        {/* Tagline with gold accent bar */}
        <Animated.View style={[
          styles.taglineRow,
          { opacity: taglineOpacity, transform: [{ translateY: taglineSlide }] },
        ]}>
          <View style={styles.taglineBar} />
          <Text style={styles.tagline}>Skin Intelligence for Melanin</Text>
          <View style={styles.taglineBar} />
        </Animated.View>

      </View>

      {/* ── Loading dots ── */}
      <Animated.View style={[styles.dotsRow, { opacity: dotFade }]}>
        {[0, 1, 2].map((i) => (
          <LoadingDot key={i} delay={i * 200} />
        ))}
      </Animated.View>

      {/* ── Bottom label ── */}
      <Animated.Text style={[styles.bottomLabel, { opacity: taglineOpacity }]}>
        Built for Melanin-Rich Skin
      </Animated.Text>
    </View>
  );
}

// Animated loading dot
function LoadingDot({ delay }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    }, delay + 1400);
  }, []);

  return (
    <Animated.View style={[styles.dot, { opacity: anim }]} />
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C0A00',  // Deep African earth brown
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Background layers
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientCenter: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: '#7B3F00',  // rich mahogany centre
    top: height / 2 - 250,
    left: width / 2 - 250,
    opacity: 0.22,
  },
  gradientMid: {
    position: 'absolute',
    width: 700,
    height: 700,
    borderRadius: 350,
    backgroundColor: '#4A1800',
    top: height / 2 - 350,
    left: width / 2 - 350,
    opacity: 0.15,
  },
  gradientOuter: {
    position: 'absolute',
    width: 900,
    height: 900,
    borderRadius: 450,
    backgroundColor: '#2E0D00',
    top: height / 2 - 450,
    left: width / 2 - 450,
    opacity: 0.10,
  },
  decoRingsWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  decoCircle: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#C8860A',  // Gold kente accent
  },
  stripe: {
    position: 'absolute',
    width: width * 1.2,
    height: 2,
    left: -width * 0.1,
    backgroundColor: '#C8860A',
  },
  stripeGold: {
    backgroundColor: '#F0C040',
    height: 1,
    marginTop: 4,
  },

  // Content
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#C8860A',
    // soft glow via shadow
    shadowColor: '#C8860A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 60,
    elevation: 20,
    opacity: 0.25,
  },
  logoWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(200,134,10,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(200,134,10,0.4)',
    marginBottom: 28,
    // shadow ring
    shadowColor: '#C8860A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  logoImage: {
    width: 100,
    height: 100,
  },

  // Typography
  appName: {
    color: '#F5DEB3',          // warm wheat — not harsh white
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 8,
    marginBottom: 14,
    textShadowColor: 'rgba(200,134,10,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taglineBar: {
    width: 22,
    height: 1.5,
    backgroundColor: '#C8860A',
    borderRadius: 1,
  },
  tagline: {
    color: '#C8860A',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },

  // Loading dots
  dotsRow: {
    position: 'absolute',
    bottom: height * 0.16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C8860A',
  },

  // Bottom label
  bottomLabel: {
    position: 'absolute',
    bottom: height * 0.07,
    color: 'rgba(200,134,10,0.45)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});