// src/screens/scan/ScanCameraScreen.js
//
//  Face detection removed — CTA enabled as soon as checklist is done.
//  The poll loop, faceDetected state, and FaceLockRing are stripped out.
//  Everything else (countdown, high-quality capture, scan flow) unchanged.

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, Dimensions, Platform, Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';

const { width: W, height: H } = Dimensions.get('window');
const VF = W * 0.80;
const SIDE = (W - VF) / 2;
const TOP_H = H * 0.16;

const C = {
  overlay: 'rgba(0,0,0,0.64)',
  gold: '#C8860A',
  cream: '#F5DEB3',
  creamDim: 'rgba(245,222,179,0.62)',
  success: '#5DBE8A',
  error: '#E05C3A',
};

// ─── Corner bracket ───────────────────────────────────────────
function CornerBracket({ pos, active }) {
  const op = useRef(new Animated.Value(0.55)).current;
  const color = active ? C.gold : 'rgba(255,255,255,0.38)';
  useEffect(() => {
    if (active) {
      Animated.loop(Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])).start();
    } else { op.setValue(0.55); }
  }, [active]);
  const base = { position: 'absolute', width: 26, height: 26, borderColor: color, borderWidth: 2.5 };
  const corners = {
    TL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
    TR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
    BL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
    BR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  };
  return <Animated.View style={[base, corners[pos], { opacity: op }]} />;
}

// ─── Gold sweep line ──────────────────────────────────────────
function ScanLine({ active }) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (active) {
      op.setValue(1);
      Animated.loop(Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 1900, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])).start();
    } else { op.setValue(0); }
  }, [active]);
  const tY = y.interpolate({ inputRange: [0, 1], outputRange: [0, VF - 2] });
  return (
    <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: 10, opacity: op, transform: [{ translateY: tY }] }}>
      <View style={{ height: 2, backgroundColor: C.gold }} />
      <View style={{ height: 8, shadowColor: C.gold, shadowOpacity: 1, shadowRadius: 10 }} />
    </Animated.View>
  );
}

// ─── Face oval guide ──────────────────────────────────────────
function FaceGuide({ ready }) {
  const sc = useRef(new Animated.Value(1)).current;
  const borderColor = ready ? C.gold : 'rgba(255,255,255,0.22)';
  useEffect(() => {
    if (ready) {
      Animated.loop(Animated.sequence([
        Animated.timing(sc, { toValue: 1.025, duration: 1500, useNativeDriver: true }),
        Animated.timing(sc, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])).start();
    }
  }, [ready]);
  return (
    <Animated.View style={{
      position: 'absolute',
      width: VF * 0.58, height: VF * 0.74,
      borderRadius: VF * 0.30,
      borderWidth: 1.5,
      borderColor,
      top: VF * 0.13, left: VF * 0.21,
      transform: [{ scale: sc }],
    }} />
  );
}

// ─── Checklist pill ───────────────────────────────────────────
function Pill({ icon, label, done }) {
  const sc = useRef(new Animated.Value(0.94)).current;
  const op = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, { toValue: done ? 1.02 : 0.94, friction: 6, useNativeDriver: true }),
      Animated.timing(op, { toValue: done ? 1 : 0.55, duration: 300, useNativeDriver: true }),
    ]).start();
    if (done) setTimeout(() => Animated.spring(sc, { toValue: 1, friction: 5, useNativeDriver: true }).start(), 220);
  }, [done]);
  return (
    <Animated.View style={[pp.row, done && pp.rowDone, { opacity: op, transform: [{ scale: sc }] }]}>
      <Text style={pp.icon}>{done ? '✓' : icon}</Text>
      <Text style={[pp.label, done && pp.labelDone]}>{label}</Text>
    </Animated.View>
  );
}
const pp = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.52)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 8 },
  rowDone: { borderColor: 'rgba(93,190,138,0.55)', backgroundColor: 'rgba(93,190,138,0.10)' },
  icon: { color: C.creamDim, fontSize: 13 },
  label: { color: C.creamDim, fontSize: 13, fontWeight: '500' },
  labelDone: { color: C.success, fontWeight: '700' },
});

// ─── Countdown overlay ────────────────────────────────────────
function Countdown({ n }) {
  const sc = useRef(new Animated.Value(1.7)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    sc.setValue(1.7); op.setValue(0);
    Animated.parallel([
      Animated.spring(sc, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [n]);
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <Animated.View style={{
        width: 130, height: 130, borderRadius: 65,
        backgroundColor: 'rgba(200,134,10,0.88)',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: C.gold, shadowOpacity: 0.9, shadowRadius: 32, elevation: 20,
        transform: [{ scale: sc }], opacity: op,
      }}>
        <Text style={{ color: '#0F0500', fontSize: 68, fontWeight: '900', lineHeight: 76 }}>{n}</Text>
      </Animated.View>
    </View>
  );
}

// ─── Permission denied ────────────────────────────────────────
function NoCamera({ canAskAgain, onRequest, onSettings, onBack }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0F0500', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ color: C.gold, fontSize: 44, marginBottom: 18 }}>📷</Text>
      <Text style={{ color: C.cream, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>Camera Access Needed</Text>
      <Text style={{ color: C.creamDim, fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 36 }}>
        {canAskAgain
          ? 'Melanin Scan needs your camera to analyse your skin. Please allow access to continue.'
          : 'Camera was permanently denied. Open Settings to enable it.'}
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: C.gold, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 36, marginBottom: 14 }}
        onPress={canAskAgain ? onRequest : onSettings}
        activeOpacity={0.85}
      >
        <Text style={{ color: '#0F0500', fontSize: 15, fontWeight: '900', letterSpacing: 1 }}>
          {canAskAgain ? 'Allow Camera' : 'Open Settings'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onBack}>
        <Text style={{ color: C.creamDim, fontSize: 14 }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────
export default function ScanCameraScreen() {
  const navigation = useNavigation();
  const camRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState('guide');
  const [countdown, setCountdown] = useState(3);
  const [checks, setChecks] = useState({ light: false, still: false, face: false });
  const [error, setError] = useState(null);

  const hasAutoTriggered = useRef(false);

  // ── Permission ────────────────────────────────────────────
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission]);

  // ── Entry animations + checklist ticks ───────────────────
  const hOp = useRef(new Animated.Value(0)).current;
  const bOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(hOp, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
      Animated.timing(bOp, { toValue: 1, duration: 500, delay: 350, useNativeDriver: true }),
    ]).start();
    const t1 = setTimeout(() => setChecks(c => ({ ...c, light: true })), 900);
    const t2 = setTimeout(() => setChecks(c => ({ ...c, still: true })), 1750);
    const t3 = setTimeout(() => setChecks(c => ({ ...c, face: true })), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    if (phase === 'guide') hasAutoTriggered.current = false;
  }, [phase]);

  const allReady = checks.light && checks.still && checks.face;

  // ── startScan ─────────────────────────────────────────────
  const startScan = useCallback(() => {
    if (hasAutoTriggered.current) return;
    hasAutoTriggered.current = true;
    setError(null);
    setPhase('countdown');
    setCountdown(3);
    let c = 3;
    const t = setInterval(() => {
      c -= 1;
      if (c <= 0) { clearInterval(t); setPhase('scanning'); capturePhoto(); }
      else setCountdown(c);
    }, 1000);
  }, []);

  // ── High-quality capture ──────────────────────────────────
  const capturePhoto = async () => {
    try {
      if (!camRef.current) throw new Error('Camera not initialised');
      const photo = await camRef.current.takePictureAsync({
        quality: 0.82, base64: true, exif: false,
        skipProcessing: Platform.OS === 'android',
      });
      if (!photo?.base64) throw new Error('Camera returned no base64 data');
      setPhase('captured');
      setTimeout(() => {
        navigation.navigate('ScanProcessing', {
          imageBase64: photo.base64,
          mimeType: 'image/jpeg',
          imageUri: photo.uri,
        });
      }, 420);
    } catch (e) {
      console.error('[ScanCamera] capture failed:', e);
      hasAutoTriggered.current = false;
      setPhase('guide');
      setError('Could not capture photo. Please try again.');
    }
  };

  const openSettings = () =>
    Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings();

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!permission.granted) {
    return (
      <NoCamera
        canAskAgain={permission.canAskAgain}
        onRequest={requestPermission}
        onSettings={openSettings}
        onBack={() => navigation.goBack()}
      />
    );
  }

  const isScanning = phase === 'scanning';
  const ctaEnabled = allReady;

  const ctaLabel = allReady ? 'Tap to Scan' : 'Getting ready…';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="front" zoom={0} />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={s.ovTop} />
        <View style={s.ovRow}>
          <View style={s.ovSide} />
          <View style={s.vf}>
            <CornerBracket pos="TL" active={allReady} />
            <CornerBracket pos="TR" active={allReady} />
            <CornerBracket pos="BL" active={allReady} />
            <CornerBracket pos="BR" active={allReady} />
            <FaceGuide ready={allReady} />
            <ScanLine active={isScanning} />
          </View>
          <View style={s.ovSide} />
        </View>
        <View style={s.ovBottom} />
      </View>

      {phase === 'countdown' && <Countdown n={countdown} />}
      {phase === 'captured' && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(245,222,179,0.20)' }]} pointerEvents="none" />
      )}

      <TouchableOpacity style={s.close} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <View style={s.closeInner}><Text style={s.closeX}>✕</Text></View>
      </TouchableOpacity>

      <Animated.View style={[s.badge, { opacity: hOp }]}>
        <View style={s.badgeDot} />
        <Text style={s.badgeLabel}>MELANIN SCAN  ·  FRONT CAMERA</Text>
      </Animated.View>

      <Animated.View style={[s.bottom, { opacity: bOp }]}>
        {phase === 'guide' && (
          <View style={s.checklist}>
            <Text style={s.checkTitle}>Before you scan</Text>
            <Pill icon="💡" label="Good natural light on your face" done={checks.light} />
            <Pill icon="🤳" label="Hold your phone steady" done={checks.still} />
            <Pill icon="◎" label="Centre your face in the frame" done={checks.face} />
          </View>
        )}

        {isScanning && (
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Text style={{ color: C.cream, fontSize: 19, fontWeight: '800', marginBottom: 4 }}>Capturing your skin…</Text>
            <Text style={{ color: C.creamDim, fontSize: 13 }}>Hold still</Text>
          </View>
        )}

        {!!error && (
          <View style={s.errBanner}>
            <Text style={s.errText}>⚠  {error}</Text>
          </View>
        )}

        {phase === 'guide' && (
          <TouchableOpacity
            style={[s.cta, !ctaEnabled && s.ctaOff]}
            onPress={ctaEnabled ? startScan : undefined}
            activeOpacity={ctaEnabled ? 0.85 : 1}
          >
            <View style={s.ctaInner}>
              {ctaEnabled && <View style={s.ctaShimmer} />}
              <Text style={[s.ctaLabel, !ctaEnabled && s.ctaLabelOff]}>{ctaLabel}</Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={s.disclaimer}>
          Image is processed immediately by AI and never stored on our servers.
        </Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  ovTop: { height: TOP_H, backgroundColor: C.overlay },
  ovRow: { flexDirection: 'row', height: VF },
  ovSide: { width: SIDE, backgroundColor: C.overlay },
  ovBottom: { flex: 1, backgroundColor: C.overlay },
  vf: { width: VF, height: VF, position: 'relative', overflow: 'hidden', borderRadius: 18 },
  close: { position: 'absolute', top: Platform.OS === 'ios' ? 58 : 38, left: 20, zIndex: 99 },
  closeInner: { width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  closeX: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  badge: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.52)', borderWidth: 1, borderColor: 'rgba(200,134,10,0.30)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, marginRight: 6 },
  badgeLabel: { color: 'rgba(245,222,179,0.65)', fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 50 : 32, alignItems: 'center' },
  checklist: { width: '100%', marginBottom: 22 },
  checkTitle: { color: C.creamDim, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, textAlign: 'center' },
  errBanner: { backgroundColor: 'rgba(224,92,58,0.14)', borderWidth: 1, borderColor: 'rgba(224,92,58,0.40)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 14, width: '100%' },
  errText: { color: C.error, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  cta: { width: W - 48, marginBottom: 14 },
  ctaOff: { opacity: 0.42 },
  ctaInner: { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 17, alignItems: 'center', overflow: 'hidden', shadowColor: C.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.55, shadowRadius: 18, elevation: 12 },
  ctaShimmer: { position: 'absolute', top: 0, left: 0, right: 0, height: '52%', backgroundColor: 'rgba(255,255,255,0.11)', borderRadius: 14 },
  ctaLabel: { color: '#0F0500', fontSize: 16, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  ctaLabelOff: { color: 'rgba(15,5,0,0.48)' },
  disclaimer: { color: 'rgba(245,222,179,0.26)', fontSize: 10, textAlign: 'center', lineHeight: 15 },
});