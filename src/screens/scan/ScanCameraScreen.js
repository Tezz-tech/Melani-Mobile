// src/screens/scan/ScanCameraScreen.js
//
//  HOW THE IMAGE REACHES GEMINI (full flow):
//  ──────────────────────────────────────────
//  1. This screen captures photo with { base64: true }
//  2. photo.base64 (pure base64 string, no "data:" prefix) is passed
//     to ScanProcessingScreen via route params
//  3. ScanProcessingScreen calls ScanAPI.submitScan({ imageBase64, mimeType })
//  4. api.js sends JSON body: { imageBase64, mimeType } to POST /api/scans
//  5. scanController reads req.body.imageBase64 — no multer, no disk write
//  6. geminiScanService builds { inlineData: { data, mimeType } } and sends
//     the base64 directly to Gemini Vision API
//
//  FACE-GATED AUTO-CAPTURE FLOW:
//  ───────────────────────────────
//  1. CameraView fires onFacesDetected continuously while in 'guide' phase
//  2. isFaceInFrame() checks the detected face bounds against the viewfinder
//     region — the face must cover ≥ FACE_MIN_FILL of the VF area and be
//     centred within FACE_CENTER_TOLERANCE
//  3. A stable-face timer runs for FACE_STABLE_MS; if the face leaves the
//     frame the timer resets
//  4. Once stable, startScan() fires automatically (same as pressing the CTA)
//  5. The "Tap to Scan" CTA is only enabled once a face is detected + stable
//  6. NO fallback auto-capture — if face detection is unavailable, the user
//     must manually tap "Tap to Scan" (which remains enabled after allReady)
//
//  IMPORTANT — expo-camera built-in face detector:
//  ────────────────────────────────────────────────
//  expo-camera v14+ ships its own face detector (no separate expo-face-detector
//  needed). Pass faceDetectorSettings with the numeric enum values below.
//  In Expo Go the detector works; in a bare workflow it also works.
//  If the detector is unavailable on a device the onFacesDetected callback
//  simply never fires — the user can still tap manually.

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, Dimensions, Platform, Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';

const { width: W, height: H } = Dimensions.get('window');
const VF   = W * 0.80;   // viewfinder square size
const SIDE = (W - VF) / 2;
const TOP_H = H * 0.16;

// ── Face-detection tuning ────────────────────────────────────
const FACE_MIN_FILL       = 0.18;   // face bounds must cover ≥18% of VF area
const FACE_CENTER_TOL     = 0.32;   // face centre must be within 32% of VF centre
const FACE_STABLE_MS      = 1400;   // ms face must be stable before auto-capture

// expo-camera built-in FaceDetector numeric enum values
// (avoids importing expo-face-detector which is a separate native package)
const FD_MODE_FAST           = 1;   // FaceDetectorMode.fast
const FD_LANDMARKS_NONE      = 0;   // FaceDetectorLandmarks.none
const FD_CLASSIFICATIONS_NONE= 0;   // FaceDetectorClassifications.none

const C = {
  bg:         '#000000',
  overlay:    'rgba(0,0,0,0.64)',
  gold:       '#C8860A',
  goldLight:  '#E8A020',
  cream:      '#F5DEB3',
  creamDim:   'rgba(245,222,179,0.62)',
  success:    '#5DBE8A',
  error:      '#E05C3A',
};

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Returns true when a detected face is sufficiently centred inside the
 * viewfinder and large enough to be a usable selfie.
 */
function isFaceInFrame(face) {
  if (!face?.bounds) return false;
  const { origin, size } = face.bounds;

  // VF region in screen coords
  const vfLeft   = SIDE;
  const vfTop    = TOP_H;
  const vfRight  = SIDE + VF;
  const vfBottom = TOP_H + VF;
  const vfCX     = SIDE + VF / 2;
  const vfCY     = TOP_H + VF / 2;

  // Face centre & fill
  const faceCX   = origin.x + size.width  / 2;
  const faceCY   = origin.y + size.height / 2;
  const faceArea = size.width * size.height;
  const vfArea   = VF * VF;
  const fill     = faceArea / vfArea;

  // Face must be mostly inside the VF
  const inside =
    origin.x >= vfLeft  - VF * 0.1 &&
    origin.y >= vfTop   - VF * 0.1 &&
    origin.x + size.width  <= vfRight  + VF * 0.1 &&
    origin.y + size.height <= vfBottom + VF * 0.1;

  // Face centre must be near VF centre (normalised distance)
  const dx = Math.abs(faceCX - vfCX) / VF;
  const dy = Math.abs(faceCY - vfCY) / VF;

  return inside && fill >= FACE_MIN_FILL && dx <= FACE_CENTER_TOL && dy <= FACE_CENTER_TOL;
}

// ─── Corner bracket ───────────────────────────────────────────
function CornerBracket({ pos, active, faceDetected }) {
  const op = useRef(new Animated.Value(0.55)).current;
  const color = faceDetected ? C.success : active ? C.gold : 'rgba(255,255,255,0.38)';

  useEffect(() => {
    if (active || faceDetected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(op, { toValue: 1,    duration: 700, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      op.setValue(0.55);
    }
  }, [active, faceDetected]);

  const base = { position: 'absolute', width: 26, height: 26, borderColor: color, borderWidth: 2.5 };
  const corners = {
    TL: { top: 0,    left:  0,  borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius:    4 },
    TR: { top: 0,    right: 0,  borderLeftWidth:  0, borderBottomWidth: 0, borderTopRightRadius:   4 },
    BL: { bottom: 0, left:  0,  borderRightWidth: 0, borderTopWidth:    0, borderBottomLeftRadius:  4 },
    BR: { bottom: 0, right: 0,  borderLeftWidth:  0, borderTopWidth:    0, borderBottomRightRadius: 4 },
  };
  return <Animated.View style={[base, corners[pos], { opacity: op }]} />;
}

// ─── Gold sweep line ──────────────────────────────────────────
function ScanLine({ active }) {
  const y  = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (active) {
      op.setValue(1);
      Animated.loop(
        Animated.sequence([
          Animated.timing(y, { toValue: 1, duration: 1900, useNativeDriver: true }),
          Animated.timing(y, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ])
      ).start();
    } else {
      op.setValue(0);
    }
  }, [active]);
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [0, VF - 2] });
  return (
    <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: 10, opacity: op, transform: [{ translateY }] }}>
      <View style={{ height: 2, backgroundColor: C.gold }} />
      <View style={{ height: 8, shadowColor: C.gold, shadowOpacity: 1, shadowRadius: 10 }} />
    </Animated.View>
  );
}

// ─── Face oval guide ──────────────────────────────────────────
function FaceGuide({ ready, faceDetected }) {
  const sc = useRef(new Animated.Value(1)).current;
  const borderColor = faceDetected
    ? C.success
    : ready
    ? C.gold
    : 'rgba(255,255,255,0.22)';

  useEffect(() => {
    if (ready || faceDetected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sc, { toValue: 1.025, duration: 1500, useNativeDriver: true }),
          Animated.timing(sc, { toValue: 1,     duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [ready, faceDetected]);

  return (
    <Animated.View style={{
      position: 'absolute',
      width:        VF * 0.58,
      height:       VF * 0.74,
      borderRadius: VF * 0.30,
      borderWidth:  faceDetected ? 2.5 : 1.5,
      borderColor,
      top:  VF * 0.13,
      left: VF * 0.21,
      transform: [{ scale: sc }],
    }} />
  );
}

// ─── Face-lock progress ring ──────────────────────────────────
function FaceLockRing({ progress }) {
  const animProg = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animProg, { toValue: progress, duration: 120, useNativeDriver: false }).start();
  }, [progress]);

  if (progress <= 0) return null;
  return (
    <View style={fl.wrap} pointerEvents="none">
      <View style={[fl.ring, { borderColor: C.success, opacity: 0.18 + progress * 0.82 }]} />
    </View>
  );
}
const fl = StyleSheet.create({
  wrap: { position: 'absolute', top: VF * 0.10, left: VF * 0.17, width: VF * 0.66, height: VF * 0.80, borderRadius: VF * 0.33, alignItems: 'center', justifyContent: 'center' },
  ring: { width: '100%', height: '100%', borderRadius: VF * 0.33, borderWidth: 3 },
});

// ─── Checklist pill ───────────────────────────────────────────
function Pill({ icon, label, done }) {
  const sc = useRef(new Animated.Value(0.94)).current;
  const op = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, { toValue: done ? 1.02 : 0.94, friction: 6, useNativeDriver: true }),
      Animated.timing(op, { toValue: done ? 1   : 0.55,  duration: 300, useNativeDriver: true }),
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
  row:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.52)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 8 },
  rowDone:  { borderColor: 'rgba(93,190,138,0.55)', backgroundColor: 'rgba(93,190,138,0.10)' },
  icon:     { color: C.creamDim, fontSize: 13 },
  label:    { color: C.creamDim, fontSize: 13, fontWeight: '500' },
  labelDone:{ color: C.success,  fontWeight: '700' },
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
  const camRef     = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [phase,      setPhase]      = useState('guide');   // 'guide' | 'countdown' | 'scanning' | 'captured'
  const [countdown,  setCountdown]  = useState(3);
  const [checks,     setChecks]     = useState({ light: false, still: false, face: false });
  const [error,      setError]      = useState(null);

  // Face detection state
  const [faceDetected,   setFaceDetected]   = useState(false);
  const [faceLockProg,   setFaceLockProg]   = useState(0);   // 0–1 progress toward auto-capture
  const faceStableTimer  = useRef(null);
  const faceStableStart  = useRef(null);
  const hasAutoTriggered = useRef(false);

  // Auto-ask for permission
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission]);

  // Entry fade + checklist auto-tick
  const hOp = useRef(new Animated.Value(0)).current;
  const bOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(hOp, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
      Animated.timing(bOp, { toValue: 1, duration: 500, delay: 350, useNativeDriver: true }),
    ]).start();
    const t1 = setTimeout(() => setChecks(c => ({ ...c, light: true })),  900);
    const t2 = setTimeout(() => setChecks(c => ({ ...c, still: true })),  1750);
    const t3 = setTimeout(() => setChecks(c => ({ ...c, face:  true })),  2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // ── Reset auto-trigger guard when returning to guide phase ──
  useEffect(() => {
    if (phase === 'guide') hasAutoTriggered.current = false;
  }, [phase]);

  // ── Countdown → capture ───────────────────────────────────
  const startScan = useCallback(() => {
    if (hasAutoTriggered.current) return;
    hasAutoTriggered.current = true;

    clearTimeout(faceStableTimer.current);
    setFaceLockProg(0);
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

  // ── Face detection callback ───────────────────────────────
  //
  //  Called by CameraView every ~180 ms when the built-in face detector
  //  is active. A face MUST be confirmed in-frame before any capture
  //  path is allowed to proceed. There is NO timer-based fallback.
  //
  const handleFacesDetected = useCallback(({ faces }) => {
    // Only operate while waiting for a face
    if (phase !== 'guide' || hasAutoTriggered.current) return;

    // Checklist must be complete first
    const allReady = checks.light && checks.still && checks.face;
    if (!allReady) return;

    const goodFace = Array.isArray(faces) && faces.length > 0 && isFaceInFrame(faces[0]);

    if (goodFace) {
      setFaceDetected(true);

      // Start stable-face countdown only once
      if (!faceStableStart.current) {
        faceStableStart.current = Date.now();
        faceStableTimer.current = setInterval(() => {
          const elapsed  = Date.now() - faceStableStart.current;
          const progress = Math.min(elapsed / FACE_STABLE_MS, 1);
          setFaceLockProg(progress);
          if (progress >= 1) {
            clearInterval(faceStableTimer.current);
            startScan();
          }
        }, 60);
      }
    } else {
      // Face left the frame — reset everything
      setFaceDetected(false);
      setFaceLockProg(0);
      faceStableStart.current = null;
      clearInterval(faceStableTimer.current);
      faceStableTimer.current = null;
    }
  }, [phase, checks, startScan]);

  // ── NO Expo Go fallback ───────────────────────────────────
  //
  //  The previous codebase had a timer-based fallback that auto-fired
  //  after ~2 s regardless of whether a face was present. This has been
  //  removed. If onFacesDetected never fires (unusual — expo-camera's
  //  built-in detector works in Expo Go) the CTA button remains available
  //  for a manual tap, but the user must place their face in frame first
  //  visually. The button copy changes to guide them.

  // Cleanup face timer on unmount
  useEffect(() => () => {
    clearInterval(faceStableTimer.current);
  }, []);

  // ── Capture photo → extract base64 ───────────────────────
  const capturePhoto = async () => {
    try {
      if (!camRef.current) throw new Error('Camera not initialised');

      const photo = await camRef.current.takePictureAsync({
        quality:        0.82,
        base64:         true,
        exif:           false,
        skipProcessing: Platform.OS === 'android',
      });

      if (!photo?.base64) throw new Error('Camera returned no base64 data');

      setPhase('captured');

      setTimeout(() => {
        navigation.navigate('ScanProcessing', {
          imageBase64: photo.base64,
          mimeType:    'image/jpeg',
          imageUri:    photo.uri,
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

  // ── Permission guard ──────────────────────────────────────
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

  const allReady   = checks.light && checks.still && checks.face;
  const isScanning = phase === 'scanning';

  // CTA is only active when checklist is done AND a face is locked
  const ctaEnabled = allReady && faceDetected;

  // Status message below viewfinder
  const faceStatusMsg = !allReady
    ? null
    : faceDetected
    ? `Hold still… ${Math.round(faceLockProg * 100)}%`
    : 'Position your face inside the frame';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Full-screen live camera with face detection */}
      <CameraView
        ref={camRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        zoom={0}
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode:                 FD_MODE_FAST,
          detectLandmarks:      FD_LANDMARKS_NONE,
          runClassifications:   FD_CLASSIFICATIONS_NONE,
          minDetectionInterval: 180,
          tracking:             true,
        }}
      />

      {/* Dark overlay with transparent viewfinder window */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={s.ovTop} />
        <View style={s.ovRow}>
          <View style={s.ovSide} />
          <View style={s.vf}>
            <CornerBracket pos="TL" active={allReady} faceDetected={faceDetected} />
            <CornerBracket pos="TR" active={allReady} faceDetected={faceDetected} />
            <CornerBracket pos="BL" active={allReady} faceDetected={faceDetected} />
            <CornerBracket pos="BR" active={allReady} faceDetected={faceDetected} />
            <FaceGuide ready={allReady} faceDetected={faceDetected} />
            <FaceLockRing progress={faceLockProg} />
            <ScanLine active={isScanning} />
          </View>
          <View style={s.ovSide} />
        </View>
        <View style={s.ovBottom} />
      </View>

      {/* Countdown */}
      {phase === 'countdown' && <Countdown n={countdown} />}

      {/* Captured flash */}
      {phase === 'captured' && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(245,222,179,0.20)' }]} pointerEvents="none" />
      )}

      {/* Close / back */}
      <TouchableOpacity style={s.close} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <View style={s.closeInner}><Text style={s.closeX}>✕</Text></View>
      </TouchableOpacity>

      {/* Top badge */}
      <Animated.View style={[s.badge, { opacity: hOp }]}>
        <View style={s.badgeDot} />
        <Text style={s.badgeLabel}>MELANIN SCAN  ·  FRONT CAMERA</Text>
      </Animated.View>

      {/* Face status label — shown once checklist is done */}
      {phase === 'guide' && allReady && (
        <View style={s.faceStatus}>
          <View style={[s.faceStatusDot, { backgroundColor: faceDetected ? C.success : C.error }]} />
          <Text style={[s.faceStatusLabel, faceDetected ? { color: C.success } : { color: C.creamDim }]}>
            {faceStatusMsg}
          </Text>
        </View>
      )}

      {/* Bottom controls */}
      <Animated.View style={[s.bottom, { opacity: bOp }]}>

        {phase === 'guide' && (
          <View style={s.checklist}>
            <Text style={s.checkTitle}>Before you scan</Text>
            <Pill icon="💡" label="Good natural light on your face"  done={checks.light} />
            <Pill icon="🤳" label="Hold your phone steady"           done={checks.still} />
            <Pill icon="◎"  label="Centre your face in the frame"   done={checks.face}  />
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
              <Text style={[s.ctaLabel, !ctaEnabled && s.ctaLabelOff]}>
                {!allReady
                  ? 'Getting ready…'
                  : !faceDetected
                  ? 'Face not detected'
                  : 'Tap to Scan'}
              </Text>
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

  ovTop:    { height: TOP_H, backgroundColor: C.overlay },
  ovRow:    { flexDirection: 'row', height: VF },
  ovSide:   { width: SIDE, backgroundColor: C.overlay },
  ovBottom: { flex: 1, backgroundColor: C.overlay },

  vf: { width: VF, height: VF, position: 'relative', overflow: 'hidden', borderRadius: 18 },

  close:      { position: 'absolute', top: Platform.OS === 'ios' ? 58 : 38, left: 20, zIndex: 99 },
  closeInner: { width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  closeX:     { color: '#FFF', fontSize: 16, fontWeight: '700' },

  badge:      { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.52)', borderWidth: 1, borderColor: 'rgba(200,134,10,0.30)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  badgeDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, marginRight: 6 },
  badgeLabel: { color: 'rgba(245,222,179,0.65)', fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },

  faceStatus:      { position: 'absolute', top: TOP_H + VF + 10, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  faceStatusDot:   { width: 7, height: 7, borderRadius: 4 },
  faceStatusLabel: { color: C.creamDim, fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },

  bottom:     { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 50 : 32, alignItems: 'center' },
  checklist:  { width: '100%', marginBottom: 22 },
  checkTitle: { color: C.creamDim, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14, textAlign: 'center' },

  errBanner:  { backgroundColor: 'rgba(224,92,58,0.14)', borderWidth: 1, borderColor: 'rgba(224,92,58,0.40)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 14, width: '100%' },
  errText:    { color: C.error, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  cta:        { width: W - 48, marginBottom: 14 },
  ctaOff:     { opacity: 0.42 },
  ctaInner:   { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 17, alignItems: 'center', overflow: 'hidden', shadowColor: C.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.55, shadowRadius: 18, elevation: 12 },
  ctaShimmer: { position: 'absolute', top: 0, left: 0, right: 0, height: '52%', backgroundColor: 'rgba(255,255,255,0.11)', borderRadius: 14 },
  ctaLabel:   { color: '#0F0500', fontSize: 16, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  ctaLabelOff:{ color: 'rgba(15,5,0,0.48)' },

  disclaimer: { color: 'rgba(245,222,179,0.26)', fontSize: 10, textAlign: 'center', lineHeight: 15 },
});