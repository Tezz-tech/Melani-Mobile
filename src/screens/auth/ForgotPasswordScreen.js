// src/screens/auth/ForgotPasswordScreen.js
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, TextInput, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthAPI } from '../../services/api';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg:         '#0F0500',
  bgCard:     '#1A0A02',
  border:     'rgba(200,134,10,0.22)',
  gold:       '#C8860A',
  goldPale:   'rgba(200,134,10,0.14)',
  cream:      '#F5DEB3',
  creamDim:   'rgba(245,222,179,0.55)',
  creamFaint: 'rgba(245,222,179,0.18)',
  success:    '#5DBE8A',
  error:      '#E05C3A',
};

function AfricanBG({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ position: 'absolute', width: 480, height: 480, borderRadius: 240, backgroundColor: '#6B3000', opacity: 0.09, top: -150, left: -120 }} />
      <View style={{ position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: C.gold, opacity: 0.05, bottom: -80, right: -80 }} />
      <View style={{ position: 'absolute', width: W, height: 1.5, backgroundColor: 'rgba(200,134,10,0.12)', top: H * 0.07 }} />
      {children}
    </View>
  );
}

function FadeSlide({ delay = 0, children, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, friction: 8, tension: 50, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>{children}</Animated.View>;
}

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();

  // step: 'email' → 'otp' → 'password'
  const [step,        setStep]        = useState('email');
  const [email,       setEmail]       = useState('');
  const [otp,         setOtp]         = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const handleSend = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return; }
    setLoading(true);
    setError('');
    try {
      await AuthAPI.forgotPassword(email.trim().toLowerCase());
      setStep('otp');
    } catch (e) {
      setError(e?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) { setError('Please enter the 6-digit code from your email.'); return; }
    setLoading(true);
    setError('');
    try {
      // We don't verify the OTP separately — we'll validate it along with the new password.
      // Just move to the next step.
      setStep('password');
    } catch (e) {
      setError(e?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      await AuthAPI.resetPasswordWithOTP(email.trim().toLowerCase(), otp.trim(), newPassword);
      // Success — tokens are updated, navigate to main
      navigation.navigate('Login');
    } catch (e) {
      setError(e?.message || 'Failed to reset password. Please try again.');
      // If OTP was wrong/expired, go back to OTP step
      if (e?.message?.toLowerCase().includes('code') || e?.message?.toLowerCase().includes('otp')) {
        setStep('otp');
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Back */}
          <FadeSlide delay={0}>
            <TouchableOpacity style={s.back}
              onPress={() => step === 'email' ? navigation.goBack() : setStep(step === 'password' ? 'otp' : 'email')}>
              <Text style={s.backArrow}>←</Text>
              <Text style={s.backLabel}>{step === 'email' ? 'Back to Login' : 'Go Back'}</Text>
            </TouchableOpacity>
          </FadeSlide>

          {/* Logo mark */}
          <FadeSlide delay={80} style={s.logoWrap}>
            <View style={s.logoMark}>
              <Text style={s.logoM}>M</Text>
            </View>
          </FadeSlide>

          {/* ── STEP 1: Enter email ── */}
          {step === 'email' && (
            <>
              <FadeSlide delay={160} style={s.headWrap}>
                <Text style={s.title}>Forgot Password?</Text>
                <Text style={s.subtitle}>
                  Enter your email and we'll send a 6-digit reset code.
                </Text>
              </FadeSlide>

              <FadeSlide delay={240} style={s.form}>
                <Text style={s.label}>Email Address</Text>
                <TextInput
                  style={[s.input, error && s.inputError]}
                  value={email}
                  onChangeText={v => { setEmail(v); setError(''); }}
                  placeholder="you@example.com"
                  placeholderTextColor={C.creamFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />
                {!!error && <View style={s.errorBox}><Text style={s.errorText}>⚠  {error}</Text></View>}
                <TouchableOpacity style={[s.cta, loading && { opacity: 0.7 }]} onPress={handleSend} disabled={loading} activeOpacity={0.85}>
                  <View style={s.ctaShimmer} />
                  {loading ? <ActivityIndicator size="small" color="#0F0500" /> : <Text style={s.ctaLabel}>Send Reset Code</Text>}
                </TouchableOpacity>
              </FadeSlide>
            </>
          )}

          {/* ── STEP 2: Enter OTP ── */}
          {step === 'otp' && (
            <>
              <FadeSlide delay={0} style={s.headWrap}>
                <Text style={s.title}>Check Your Email</Text>
                <Text style={s.subtitle}>
                  We sent a 6-digit code to{'\n'}
                  <Text style={{ color: C.gold, fontWeight: '700' }}>{email}</Text>
                  {'\n'}Check your inbox and spam folder.
                </Text>
              </FadeSlide>

              <FadeSlide delay={120} style={s.form}>
                <Text style={s.label}>6-Digit Reset Code</Text>
                <TextInput
                  style={[s.input, s.otpInput, error && s.inputError]}
                  value={otp}
                  onChangeText={v => { setOtp(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  placeholder="• • • • • •"
                  placeholderTextColor={C.creamFaint}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="next"
                  onSubmitEditing={handleVerifyOTP}
                />
                {!!error && <View style={s.errorBox}><Text style={s.errorText}>⚠  {error}</Text></View>}
                <TouchableOpacity style={[s.cta, (loading || otp.length < 6) && { opacity: 0.7 }]} onPress={handleVerifyOTP} disabled={loading || otp.length < 6} activeOpacity={0.85}>
                  <View style={s.ctaShimmer} />
                  {loading ? <ActivityIndicator size="small" color="#0F0500" /> : <Text style={s.ctaLabel}>Continue →</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={handleSend}>
                  <Text style={{ color: C.creamDim, fontSize: 13, textDecorationLine: 'underline' }}>Resend code</Text>
                </TouchableOpacity>
              </FadeSlide>
            </>
          )}

          {/* ── STEP 3: Set new password ── */}
          {step === 'password' && (
            <>
              <FadeSlide delay={0} style={s.headWrap}>
                <Text style={s.title}>Set New Password</Text>
                <Text style={s.subtitle}>
                  Choose a strong password for your account.
                </Text>
              </FadeSlide>

              <FadeSlide delay={120} style={s.form}>
                <Text style={s.label}>New Password</Text>
                <View style={s.passWrap}>
                  <TextInput
                    style={[s.input, s.passInput, error && s.inputError]}
                    value={newPassword}
                    onChangeText={v => { setNewPassword(v); setError(''); }}
                    placeholder="Minimum 8 characters"
                    placeholderTextColor={C.creamFaint}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                  />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(p => !p)}>
                    <Text style={{ color: C.creamDim, fontSize: 13 }}>{showPass ? '○' : '●'}</Text>
                  </TouchableOpacity>
                </View>
                {!!error && <View style={s.errorBox}><Text style={s.errorText}>⚠  {error}</Text></View>}
                <TouchableOpacity style={[s.cta, loading && { opacity: 0.7 }]} onPress={handleResetPassword} disabled={loading} activeOpacity={0.85}>
                  <View style={s.ctaShimmer} />
                  {loading ? <ActivityIndicator size="small" color="#0F0500" /> : <Text style={s.ctaLabel}>Reset Password</Text>}
                </TouchableOpacity>
              </FadeSlide>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll:       { flexGrow: 1, paddingHorizontal: 28, paddingTop: Platform.OS === 'ios' ? 64 : 44, paddingBottom: 40 },
  back:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
  backArrow:    { color: C.gold, fontSize: 20 },
  backLabel:    { color: C.creamDim, fontSize: 14, fontWeight: '600' },
  logoWrap:     { alignItems: 'center', marginBottom: 28 },
  logoMark:     { width: 60, height: 60, borderRadius: 30, backgroundColor: C.goldPale, borderWidth: 2, borderColor: C.gold, alignItems: 'center', justifyContent: 'center', shadowColor: C.gold, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 0 }, shadowRadius: 16, elevation: 8 },
  logoM:        { color: C.gold, fontSize: 26, fontWeight: '900' },
  headWrap:     { alignItems: 'center', marginBottom: 32 },
  title:        { color: C.cream, fontSize: 26, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  subtitle:     { color: C.creamDim, fontSize: 14, lineHeight: 21, textAlign: 'center', paddingHorizontal: 12 },
  form:         {},
  label:        { color: C.creamDim, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  input:        { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 15, color: C.cream, fontSize: 15, marginBottom: 16 },
  inputError:   { borderColor: 'rgba(224,92,58,0.60)' },
  errorBox:     { backgroundColor: 'rgba(224,92,58,0.10)', borderWidth: 1, borderColor: 'rgba(224,92,58,0.30)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  errorText:    { color: C.error, fontSize: 13, fontWeight: '600' },
  cta:          { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 17, alignItems: 'center', overflow: 'hidden', shadowColor: C.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 10 },
  ctaShimmer:   { position: 'absolute', top: 0, left: 0, right: 0, height: '55%', backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 14 },
  ctaLabel:     { color: '#0F0500', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  otpInput:  { textAlign: 'center', fontSize: 24, fontWeight: '800', letterSpacing: 10, color: C.gold },
  passWrap:  { position: 'relative' },
  passInput: { paddingRight: 48 },
  eyeBtn:    { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
});
