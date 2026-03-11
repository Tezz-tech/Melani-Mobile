// src/screens/auth/WelcomeScreen.js
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated,
  TouchableOpacity, StatusBar, Image, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';

const { width: W, height: H } = Dimensions.get('window');
const LOGO = require('../../../assets/Melanin.png');

const C = {
  bg:         '#0F0500',
  gold:       '#C8860A',
  goldPale:   'rgba(200,134,10,0.15)',
  border:     'rgba(200,134,10,0.25)',
  cream:      '#F5DEB3',
  creamDim:   'rgba(245,222,179,0.55)',
};

// ── African geometric background ──────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Warm radial glows */}
      <View style={[styles.absCircle, { width: 440, height: 440, borderRadius: 220, backgroundColor: '#7B3F00', opacity: 0.14, top: -120, left: -80 }]} />
      <View style={[styles.absCircle, { width: 360, height: 360, borderRadius: 180, backgroundColor: '#C8860A', opacity: 0.07, bottom: -60, right: -60 }]} />
      {/* Adinkra ring outlines */}
      <View style={[styles.absCircle, { width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(200,134,10,0.18)', top: -60, left: -60 }]} />
      <View style={[styles.absCircle, { width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(200,134,10,0.18)', bottom: -60, right: -60 }]} />
      {/* Kente stripes */}
      <View style={[styles.absStripe, { top: H * 0.08 }]} />
      <View style={[styles.absStripe, { top: H * 0.083, height: 0.8, backgroundColor: 'rgba(240,192,64,0.12)' }]} />
      <View style={[styles.absStripe, { bottom: H * 0.06 }]} />
      <View style={[styles.absStripe, { bottom: H * 0.063, height: 0.8, backgroundColor: 'rgba(240,192,64,0.12)' }]} />
      {/* Dot motifs */}
      {[{top:H*0.12,left:W*0.08,o:0.35},{top:H*0.18,left:W*0.88,o:0.25},{top:H*0.72,left:W*0.06,o:0.20},{top:H*0.80,left:W*0.90,o:0.30}].map((d,i)=>(
        <View key={i} style={[styles.dot, { top: d.top, left: d.left, opacity: d.o }]} />
      ))}
      {children}
    </View>
  );
}

// ── FadeSlide entrance animation ──────────────────────────────
function FadeSlide({ delay = 0, from = 24, children, style }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 550, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 50, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

// ── Gold CTA button ───────────────────────────────────────────
function GoldButton({ label, onPress, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        style={styles.goldBtn} onPress={onPress} activeOpacity={1}
        onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      >
        <View style={styles.goldBtnShimmer} />
        <Text style={styles.goldBtnLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Ghost button ──────────────────────────────────────────────
function GhostButton({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.ghostBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.ghostBtnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Spinning orbit ring ───────────────────────────────────────
function OrbitRing({ size, duration, clockwise = true }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration, useNativeDriver: true })).start();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: clockwise ? ['0deg','360deg'] : ['360deg','0deg'] });
  return (
    <Animated.View style={[styles.orbitRing, { width: size, height: size, borderRadius: size/2 }, { transform: [{ rotate }] }]} />
  );
}

// ── Feature pill ──────────────────────────────────────────────
function FeaturePill({ icon, label, delay }) {
  return (
    <FadeSlide delay={delay} style={{ flex: 1 }}>
      <View style={styles.pill}>
        <Text style={styles.pillIcon}>{icon}</Text>
        <Text style={styles.pillLabel}>{label}</Text>
      </View>
    </FadeSlide>
  );
}

// ── Main screen ───────────────────────────────────────────────
export default function WelcomeScreen() {
  const navigation = useNavigation();

  // ── API: if already logged in, skip straight to Main ─────
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    }
  }, [isAuthenticated, isLoading]);

  // ── Animations (unchanged from original) ─────────────────
  const heroScale   = useRef(new Animated.Value(0.7)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse   = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heroScale,   { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.timing(heroOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 1,   duration: 1800, useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0.5, duration: 1800, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero logo area */}
      <View style={styles.heroArea}>
        <Animated.View style={[styles.glowHalo, { opacity: glowPulse }]} />
        <OrbitRing size={220} duration={9000} clockwise />
        <OrbitRing size={175} duration={6500} clockwise={false} />
        <Animated.View style={[styles.logoWrap, { opacity: heroOpacity, transform: [{ scale: heroScale }] }]}>
          <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
        </Animated.View>
      </View>

      {/* Headline */}
      <FadeSlide delay={300} style={styles.copyBlock}>
        <Text style={styles.headline}>Skin Intelligence{'\n'}for Melanin</Text>
      </FadeSlide>

      {/* Subtitle */}
      <FadeSlide delay={450} style={styles.subBlock}>
        <Text style={styles.subtitle}>
          The first AI skincare companion built exclusively for melanin-rich skin.
          Rooted in Africa. Trusted by your skin.
        </Text>
      </FadeSlide>

      {/* Feature pills */}
      <View style={styles.pillRow}>
        <FeaturePill icon="✦" label="AI Skin Scan"     delay={550} />
        <FeaturePill icon="◈" label="Melanin-First"    delay={650} />
        <FeaturePill icon="◎" label="African Products" delay={750} />
      </View>

      {/* Buttons */}
      <FadeSlide delay={850} style={styles.ctaBlock}>
        <GoldButton label="Get Started" onPress={() => navigation.navigate('Signup')} style={{ marginBottom: 14 }} />
        <GhostButton label="I already have an account" onPress={() => navigation.navigate('Login')} />
      </FadeSlide>

      {/* Footer note */}
      <FadeSlide delay={1000} style={styles.footer}>
        <Text style={styles.footerText}>Built for melanin-rich skin, by design.</Text>
      </FadeSlide>
    </AfricanBG>
  );
}

const styles = StyleSheet.create({
  // Background helpers
  absCircle:  { position: 'absolute' },
  absStripe:  { position: 'absolute', width: W, height: 1.5, backgroundColor: 'rgba(200,134,10,0.20)' },
  dot:        { position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.gold },

  // Hero
  heroArea:   { alignItems: 'center', justifyContent: 'center', height: H * 0.36, marginTop: 60 },
  glowHalo: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: C.gold, opacity: 0.18,
    shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 60, elevation: 20,
  },
  orbitRing: {
    position: 'absolute',
    borderWidth: 1, borderColor: 'rgba(200,134,10,0.22)', borderStyle: 'dashed',
  },
  logoWrap: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(200,134,10,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(200,134,10,0.45)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 14,
  },
  logoImg: { width: 76, height: 76 },

  // Text
  copyBlock:  { paddingHorizontal: 28, marginTop: 8 },
  headline: {
    color: C.cream, fontSize: 34, fontWeight: '800', lineHeight: 42, letterSpacing: 0.5,
    textShadowColor: 'rgba(200,134,10,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  subBlock:   { paddingHorizontal: 28, marginTop: 12 },
  subtitle:   { color: C.creamDim, fontSize: 15, lineHeight: 23 },

  // Pills
  pillRow:    { flexDirection: 'row', paddingHorizontal: 24, marginTop: 22, gap: 8 },
  pill: {
    backgroundColor: C.goldPale, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingVertical: 10, alignItems: 'center', gap: 4,
  },
  pillIcon:   { color: C.gold, fontSize: 14 },
  pillLabel:  { color: C.creamDim, fontSize: 10.5, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },

  // Buttons
  ctaBlock:   { paddingHorizontal: 24, marginTop: 28 },
  goldBtn: {
    backgroundColor: C.gold, borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', overflow: 'hidden',
    shadowColor: C.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 10,
  },
  goldBtnShimmer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '55%',
    backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 14,
  },
  goldBtnLabel: { color: '#0F0500', fontSize: 16, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  ghostBtn: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  ghostBtnLabel: { color: C.cream, fontSize: 15, fontWeight: '600' },

  // Footer
  footer:     { alignItems: 'center', marginTop: 18 },
  footerText: { color: 'rgba(200,134,10,0.4)', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
});