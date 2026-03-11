// src/screens/auth/OTPVerifyScreen.js
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Animated, StatusBar, Keyboard, Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthAPI } from '../../services/api';

const { width: W, height: H } = Dimensions.get('window');
const OTP_LENGTH = 6;

const C = {
  bg:        '#0F0500',
  bgCard:    '#1A0A02',
  bgInput:   '#251205',
  border:    'rgba(200,134,10,0.25)',
  gold:      '#C8860A',
  goldLight: '#E8A020',
  goldPale:  'rgba(200,134,10,0.15)',
  cream:     '#F5DEB3',
  creamDim:  'rgba(245,222,179,0.55)',
  creamFaint:'rgba(245,222,179,0.25)',
  error:     '#E05C3A',
};

// ── African background ────────────────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[ab.b, { width: 500, height: 500, borderRadius: 250, backgroundColor: '#7B3F00', opacity: 0.11, top: -160, left: -120 }]} />
      <View style={[ab.b, { width: 320, height: 320, borderRadius: 160, backgroundColor: '#C8860A', opacity: 0.06, bottom: -80, right: -80 }]} />
      <View style={[ab.b, { width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: 'rgba(200,134,10,0.12)', top: -70, left: -70 }]} />
      <View style={[ab.b, { width: 180, height: 180, borderRadius: 90,  borderWidth: 1, borderColor: 'rgba(200,134,10,0.09)', bottom: -50, right: -50 }]} />
      <View style={[ab.stripe, { top: H * 0.08 }]} />
      <View style={[ab.stripe, { bottom: H * 0.08 }]} />
      {[
        { top: H * 0.10, left: W * 0.07, o: 0.3  },
        { top: H * 0.15, left: W * 0.88, o: 0.2  },
        { top: H * 0.82, left: W * 0.05, o: 0.25 },
        { top: H * 0.88, left: W * 0.89, o: 0.2  },
      ].map((d, i) => (
        <View key={i} style={[ab.dot, { top: d.top, left: d.left, opacity: d.o }]} />
      ))}
      {children}
    </View>
  );
}
const ab = StyleSheet.create({
  b:      { position: 'absolute' },
  stripe: { position: 'absolute', width: W, height: 1.5, backgroundColor: 'rgba(200,134,10,0.18)' },
  dot:    { position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.gold },
});

// ── FadeSlide ─────────────────────────────────────────────────
function FadeSlide({ delay = 0, from = 20, children, style }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 520, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 50, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

// ── Gold button ───────────────────────────────────────────────
function GoldButton({ label, onPress, loading }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={gbs.root} onPress={onPress} activeOpacity={1} disabled={loading}
        onPressIn={()  => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start()}
      >
        <View style={gbs.shimmer} />
        {loading ? <LoadingDots /> : <Text style={gbs.label}>{label}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}
const gbs = StyleSheet.create({
  root:    { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 17, alignItems: 'center', overflow: 'hidden', shadowColor: C.gold, shadowOffset:{width:0,height:6}, shadowOpacity:0.45, shadowRadius:16, elevation:10 },
  shimmer: { position:'absolute', top:0, left:0, right:0, height:'55%', backgroundColor:'rgba(255,255,255,0.10)', borderRadius:14 },
  label:   { color: '#0F0500', fontSize: 16, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
});

// ── Three bouncing dots loader ────────────────────────────────
function LoadingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    dots.forEach((dot, i) => {
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(dot, { toValue: -6, duration: 280, useNativeDriver: true }),
        Animated.timing(dot, { toValue:  0, duration: 280, useNativeDriver: true }),
        Animated.delay((2 - i) * 150),
      ])).start();
    });
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', height: 20 }}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#0F0500', transform: [{ translateY: d }] }} />
      ))}
    </View>
  );
}

// ── Back button ───────────────────────────────────────────────
function BackButton({ onPress }) {
  return (
    <TouchableOpacity style={{ position:'absolute', top:56, left:24, zIndex:99 }} onPress={onPress} activeOpacity={0.7}>
      <View style={{ width:42, height:42, borderRadius:12, backgroundColor:'rgba(200,134,10,0.12)', borderWidth:1, borderColor:C.border, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ color: C.cream, fontSize: 18, lineHeight: 22 }}>←</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Blinking cursor ───────────────────────────────────────────
function BlinkCursor() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ position:'absolute', width:2, height:26, backgroundColor:C.gold, borderRadius:1, opacity }} />;
}

// ── OTP digit box ─────────────────────────────────────────────
function OTPBox({ digit, focused, hasError }) {
  const borderAnim = useRef(new Animated.Value(0)).current;
  const popAnim    = useRef(new Animated.Value(1)).current;
  const prevDigit  = useRef(digit);

  useEffect(() => {
    Animated.timing(borderAnim, { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [focused]);

  useEffect(() => {
    if (digit && digit !== prevDigit.current) {
      Animated.sequence([
        Animated.timing(popAnim, { toValue: 1.2, duration: 80, useNativeDriver: true }),
        Animated.spring(popAnim, { toValue: 1,   friction: 5,  useNativeDriver: true }),
      ]).start();
    }
    prevDigit.current = digit;
  }, [digit]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      hasError ? C.error : (digit ? C.gold : C.border),
      hasError ? C.error : C.goldLight,
    ],
  });
  const bgColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.bgInput, 'rgba(200,134,10,0.10)'],
  });

  const BOX_SIZE = (W - 48 - (OTP_LENGTH - 1) * 8) / OTP_LENGTH;

  return (
    <Animated.View style={[{
      width: BOX_SIZE, height: 62, borderRadius: 14, borderWidth: 1.5,
      alignItems: 'center', justifyContent: 'center',
      borderColor, backgroundColor: bgColor,
      transform: [{ scale: popAnim }],
      shadowColor: focused ? C.gold : 'transparent',
      shadowOpacity: focused ? 0.5 : 0,
      shadowOffset: { width: 0, height: 0 }, shadowRadius: 10, elevation: focused ? 6 : 0,
    }]}>
      {digit
        ? <Text style={{ color: hasError ? C.error : C.cream, fontSize: 24, fontWeight: '800' }}>{digit}</Text>
        : focused
          ? <BlinkCursor />
          : null
      }
    </Animated.View>
  );
}

// ── Countdown badge ───────────────────────────────────────────
function CountdownBadge({ seconds }) {
  return (
    <View style={{ backgroundColor: C.goldPale, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 }}>
      <Text style={{ color: C.gold, fontSize: 16, fontWeight: '800', letterSpacing: 2 }}>
        {String(Math.floor(seconds / 60)).padStart(2,'0')}:{String(seconds % 60).padStart(2,'0')}
      </Text>
    </View>
  );
}

// ── Decorative fingerprint motif ──────────────────────────────
function FingerprintMotif() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 120, height: 120 }}>
      {[120, 96, 72, 50, 30].map((size, i) => (
        <View key={i} style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2,
          borderWidth: 1.5, borderColor: C.gold, opacity: 0.05 + i * 0.04,
        }} />
      ))}
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.goldPale, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.gold, fontSize: 9 }}>✦</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────
export default function OTPVerifyScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { phone = '', context = 'signup' } = route.params || {};

  const [otp,         setOtp]         = useState(Array(OTP_LENGTH).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [countdown,   setCountdown]   = useState(30);
  const [canResend,   setCanResend]   = useState(false);

  const inputRef  = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Auto-focus input on mount
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 400); }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // ── Handle digit typing ───────────────────────────────────
  const handleOtpChange = useCallback((text) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    const arr    = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < digits.length; i++) arr[i] = digits[i];
    setOtp(arr);
    setActiveIndex(Math.min(digits.length, OTP_LENGTH - 1));
    setError('');

    // Auto-submit when all 6 digits entered
    if (digits.length === OTP_LENGTH) {
      Keyboard.dismiss();
      verifyCode(digits);
    }
  }, [phone, context]);

  // ── Verify OTP via API ────────────────────────────────────
  const verifyCode = async (code) => {
    const finalCode = code || otp.join('');
    if (finalCode.length < OTP_LENGTH) {
      setError('Please enter the complete 6-digit code');
      shake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      // ── REAL API CALL ──
      // The backend endpoint depends on your implementation.
      // If phone OTP verification is a separate endpoint, call it here.
      // For now we call a generic verify endpoint:
      //   POST /api/auth/verify-otp  { phone, code }
      // If your backend doesn't have this yet, replace with your actual endpoint.
      await AuthAPI.request('POST', '/auth/verify-otp', { phone, code: finalCode });

      // OTP verified — move to next step
      navigation.navigate(context === 'signup' ? 'Onboarding' : 'Main');
    } catch (err) {
      const msg = err.message || 'Invalid code. Please try again.';
      setError(msg);
      shake();
      // Clear boxes so user can re-enter
      setOtp(Array(OTP_LENGTH).fill(''));
      setActiveIndex(0);
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────
  const handleResend = async () => {
    if (!canResend) return;

    setOtp(Array(OTP_LENGTH).fill(''));
    setActiveIndex(0);
    setError('');
    setCountdown(30);
    setCanResend(false);
    inputRef.current?.focus();

    try {
      // ── REAL API CALL ──
      // POST /api/auth/resend-otp  { phone }
      await AuthAPI.request('POST', '/auth/resend-otp', { phone });
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    }
  };

  const maskedPhone = phone
    ? phone.slice(0, -4).replace(/./g, '•') + phone.slice(-4)
    : '••••••••';

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BackButton onPress={() => navigation.goBack()} />

      <View style={s.container}>

        {/* Header */}
        <FadeSlide delay={0} style={s.header}>
          <View style={s.logoRing}>
            <Text style={s.logoLetter}>M</Text>
          </View>
          <Text style={s.title}>Verify Your Number</Text>
          <Text style={s.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={{ color: C.cream, fontWeight: '700' }}>{maskedPhone}</Text>
          </Text>
        </FadeSlide>

        {/* OTP boxes */}
        <FadeSlide delay={250} style={{ width: '100%', marginBottom: 8 }}>
          <Animated.View style={[s.boxRow, { transform: [{ translateX: shakeAnim }] }]}>
            {otp.map((digit, i) => (
              <OTPBox key={i} digit={digit} focused={i === activeIndex} hasError={!!error} />
            ))}
          </Animated.View>
          {/* Hidden input that captures all keystrokes */}
          <TextInput
            ref={inputRef}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
            value={otp.join('')}
            onChangeText={handleOtpChange}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
          />
        </FadeSlide>

        {/* Error message */}
        {error ? (
          <FadeSlide delay={0} style={{ marginBottom: 8 }}>
            <Text style={{ color: C.error, fontSize: 13, fontWeight: '500', textAlign: 'center' }}>{error}</Text>
          </FadeSlide>
        ) : null}

        {/* Resend block */}
        <FadeSlide delay={380} style={s.resendBlock}>
          {!canResend ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: C.creamDim, fontSize: 13 }}>Resend code in </Text>
              <CountdownBadge seconds={countdown} />
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleResend}
              style={{ borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 10 }}
            >
              <Text style={{ color: C.gold, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 }}>↻  Resend Code</Text>
            </TouchableOpacity>
          )}
        </FadeSlide>

        {/* Verify CTA */}
        <FadeSlide delay={480} style={{ width: '100%', marginBottom: 16 }}>
          <GoldButton label="Verify & Continue" onPress={() => verifyCode()} loading={loading} />
        </FadeSlide>

        {/* Change number */}
        <FadeSlide delay={580} style={{ marginBottom: 36 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: C.creamDim, fontSize: 13, fontWeight: '500', textDecorationLine: 'underline' }}>
              Change phone number
            </Text>
          </TouchableOpacity>
        </FadeSlide>

        {/* Decorative motif */}
        <FadeSlide delay={700} style={{ alignItems: 'center' }}>
          <FingerprintMotif />
          <Text style={{ color: 'rgba(200,134,10,0.35)', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 6 }}>
            Secure Verification
          </Text>
        </FadeSlide>

      </View>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingTop: 110, paddingHorizontal: 24, alignItems: 'center' },

  header:     { alignItems: 'center', marginBottom: 36 },
  logoRing: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: C.gold,
    backgroundColor: C.goldPale, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.gold, shadowOpacity: 0.4, shadowOffset:{width:0,height:0}, shadowRadius:12, elevation:8,
  },
  logoLetter: { color: C.gold, fontSize: 22, fontWeight: '900' },
  title:      { color: C.cream, fontSize: 28, fontWeight: '800', letterSpacing: 0.3, marginTop: 16, marginBottom: 10 },
  subtitle:   { color: C.creamDim, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  boxRow:      { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  resendBlock: { marginTop: 18, alignItems: 'center', marginBottom: 28 },
});