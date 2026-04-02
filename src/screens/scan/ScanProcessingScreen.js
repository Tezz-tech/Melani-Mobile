// src/screens/scan/ScanProcessingScreen.js
//
//  Receives from ScanCameraScreen:
//    route.params.imageBase64  — pure base64 string (no data: prefix)
//    route.params.mimeType     — 'image/jpeg'
//    route.params.imageUri     — local URI (preview only, not sent to server)
//
//  Calls: ScanAPI.submitScan({ imageBase64, mimeType })
//    → POST /api/scans  with JSON body { imageBase64, mimeType }
//    → backend reads req.body.imageBase64
//    → geminiScanService passes it to Gemini as inlineData
//    → NO file is written to disk anywhere
//
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  StatusBar, Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScanAPI } from '../../services/api';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg:        '#0F0500',
  card:      '#1A0A02',
  border:    'rgba(200,134,10,0.22)',
  gold:      '#C8860A',
  goldLight: '#E8A020',
  goldPale:  'rgba(200,134,10,0.14)',
  cream:     '#F5DEB3',
  creamDim:  'rgba(245,222,179,0.55)',
  success:   '#5DBE8A',
  error:     '#E05C3A',
};

// ── Processing stages ──────────────────────────────────────────
const STAGES = [
  { id: 1, icon: '◉', label: 'Sending image to AI',     ms: 1600 },
  { id: 2, icon: '◈', label: 'Reading skin surface',           ms: 2000 },
  { id: 3, icon: '✦', label: 'Detecting melanin patterns',     ms: 2200 },
  { id: 4, icon: '◎', label: 'Identifying skin conditions',    ms: 2000 },
  { id: 5, icon: '🌿', label: 'Building your personalised routine', ms: 1800 },
];
const TOTAL_MS = STAGES.reduce((s, st) => s + st.ms, 0);

// ── Education tips ─────────────────────────────────────────────
const TIPS = [
  { tag: 'DID YOU KNOW',  body: 'Post-inflammatory hyperpigmentation (PIH) affects melanin-rich skin more intensely — but it\'s very manageable with targeted ingredients like niacinamide and alpha arbutin.' },
  { tag: 'MELANIN TIP',  body: 'Niacinamide reduces pigment transfer between cells rather than bleaching, making it a safer long-term option for melanin skin tones.' },
  { tag: 'SKIN SCIENCE', body: 'Melanin-rich skin has more active melanocytes. Any inflammation — acne, friction, even a scratch — can leave a dark mark more easily.' },
  { tag: 'PRODUCT TIP',  body: 'SPF is non-negotiable for melanin skin. UV damage accelerates hyperpigmentation. Tinted mineral SPF 50 prevents the white-cast problem.' },
  { tag: 'ROUTINE TIP',  body: 'The most effective skincare routine is the one you\'ll actually stick to. Consistency beats complexity every single time.' },
];

// ─────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────

function AfricanBG({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ position: 'absolute', width: 480, height: 480, borderRadius: 240, backgroundColor: '#6B3000', opacity: 0.10, top: -150, left: -120 }} />
      <View style={{ position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: C.gold, opacity: 0.05, bottom: -80, right: -80 }} />
      <View style={{ position: 'absolute', width: W, height: 1.5, backgroundColor: 'rgba(200,134,10,0.12)', top: H * 0.07 }} />
      <View style={{ position: 'absolute', width: W, height: 1.5, backgroundColor: 'rgba(200,134,10,0.12)', bottom: H * 0.08 }} />
      {children}
    </View>
  );
}

function AIOrb() {
  const spin1 = useRef(new Animated.Value(0)).current;
  const spin2 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.88)).current;
  const glow  = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spin1, { toValue: 1, duration: 5000, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(spin2, { toValue: 1, duration: 7500, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.88, duration: 1400, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 0.7, duration: 1800, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.3, duration: 1800, useNativeDriver: true }),
    ])).start();
  }, []);

  const r1 = spin1.interpolate({ inputRange: [0, 1], outputRange: ['0deg',   '360deg'] });
  const r2 = spin2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg']   });

  return (
    <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: C.gold, opacity: glow, shadowColor: C.gold, shadowRadius: 50, shadowOpacity: 1 }} />
      <Animated.View style={{ position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: 'rgba(200,134,10,0.30)', borderStyle: 'dashed', transform: [{ rotate: r1 }] }} />
      <Animated.View style={{ position: 'absolute', width: 155, height: 155, borderRadius: 77.5, borderWidth: 1.5, borderColor: 'rgba(200,134,10,0.40)', transform: [{ rotate: r2 }] }} />
      <Animated.View style={{ width: 106, height: 106, borderRadius: 53, backgroundColor: 'rgba(200,134,10,0.12)', borderWidth: 2, borderColor: C.gold, alignItems: 'center', justifyContent: 'center', shadowColor: C.gold, shadowOpacity: 0.5, shadowRadius: 16, transform: [{ scale: pulse }] }}>
        <View style={{ width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' }}>
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return <View key={i} style={{ position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, top: 50 + Math.sin(angle) * 28 - 3, left: 50 + Math.cos(angle) * 28 - 3, opacity: 0.4 + (i % 3) * 0.2 }} />;
          })}
          <Text style={{ color: C.gold, fontSize: 20, fontWeight: '900', letterSpacing: 2 }}>AI</Text>
        </View>
      </Animated.View>
    </View>
  );
}

function BlinkDot({ delay = 0 }) {
  const op = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    setTimeout(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(op, { toValue: 1,   duration: 400, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])).start();
    }, delay);
  }, []);
  return <Animated.View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.gold, marginLeft: 2, opacity: op }} />;
}

function StageRow({ stage, status }) {
  const op   = useRef(new Animated.Value(status === 'pending' ? 0.28 : 1)).current;
  const sc   = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(op, { toValue: status === 'pending' ? 0.28 : 1, duration: 400, useNativeDriver: true }).start();
    if (status === 'active') {
      Animated.loop(Animated.sequence([
        Animated.timing(sc, { toValue: 1.03, duration: 700, useNativeDriver: true }),
        Animated.timing(sc, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true })).start();
    } else {
      sc.setValue(1);
    }
  }, [status]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, opacity: op, transform: [{ scale: sc }] }}>
      <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
        {status === 'active'
          ? <Animated.Text style={{ fontSize: 16, fontWeight: '900', color: C.gold, transform: [{ rotate }] }}>{stage.icon}</Animated.Text>
          : status === 'done'
            ? <Text style={{ fontSize: 15, color: C.success, fontWeight: '900' }}>✓</Text>
            : <Text style={{ fontSize: 16, color: 'rgba(245,222,179,0.20)' }}>{stage.icon}</Text>
        }
      </View>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: status === 'active' ? '700' : '500', color: status === 'active' ? C.cream : status === 'done' ? C.creamDim : 'rgba(245,222,179,0.28)', textDecorationLine: status === 'done' ? 'line-through' : 'none' }}>
        {stage.label}
      </Text>
      {status === 'active' && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <BlinkDot delay={0} /><BlinkDot delay={200} /><BlinkDot delay={400} />
        </View>
      )}
    </Animated.View>
  );
}

function ProgressBar({ progress }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: progress, duration: 400, useNativeDriver: false }).start();
  }, [progress]);
  const barW = width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' }}>
      <Animated.View style={{ height: '100%', backgroundColor: C.gold, borderRadius: 2, width: barW }} />
    </View>
  );
}

function TipCarousel({ idx }) {
  const op = useRef(new Animated.Value(1)).current;
  const ty = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(op, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 10, duration: 0, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(ty, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]).start();
    });
  }, [idx]);
  const tip = TIPS[idx % TIPS.length];
  return (
    <Animated.View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 18, opacity: op, transform: [{ translateY: ty }] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.gold }} />
        <Text style={{ color: C.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>{tip.tag}</Text>
      </View>
      <Text style={{ color: C.creamDim, fontSize: 13, lineHeight: 20 }}>{tip.body}</Text>
    </Animated.View>
  );
}

function ErrorView({ message, onRetry, onHome }) {
  return (
    <AfricanBG>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ color: C.error, fontSize: 38, marginBottom: 16 }}>⚠</Text>
        <Text style={{ color: C.cream, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>Analysis Failed</Text>
        <Text style={{ color: C.creamDim, fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 32 }}>
          {message || 'Something went wrong. Please try again.'}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: C.gold, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, marginBottom: 14 }}
          onPress={onRetry}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#0F0500', fontSize: 15, fontWeight: '900', letterSpacing: 1 }}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onHome}>
          <Text style={{ color: C.creamDim, fontSize: 14 }}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    </AfricanBG>
  );
}

// ─────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────
export default function ScanProcessingScreen() {
  const navigation = useNavigation();
  const route      = useRoute();

  // Params from ScanCameraScreen
  const { imageBase64, mimeType = 'image/jpeg', imageUri } = route.params || {};

  const [stageIdx,  setStageIdx]  = useState(0);
  const [tipIdx,    setTipIdx]    = useState(0);
  const [progress,  setProgress]  = useState(0);
  const [apiError,  setApiError]  = useState(null);

  const entryOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entryOp, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Rotate tips every 3.2s
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => i + 1), 3200);
    return () => clearInterval(t);
  }, []);

  // ── Orchestrate: stages animation + API in parallel ───────
  useEffect(() => {
    const timers = [];
    let elapsed  = 0;

    // Schedule each stage activation
    STAGES.forEach((stage, i) => {
      const t = setTimeout(() => {
        setStageIdx(i);
        setProgress((i + 0.5) / STAGES.length);
      }, elapsed);
      timers.push(t);
      elapsed += stage.ms;
    });

    // Fire API immediately — runs in parallel with the animation
    let scanResult = null;
    let scanError  = null;

    const apiPromise = ScanAPI.submitScan({ imageBase64, mimeType })
      .then(r  => { scanResult = r; })
      .catch(e => { scanError  = e; });

    // After all stages finish, await the API result
    const done = setTimeout(async () => {
      setStageIdx(STAGES.length); // all done
      setProgress(1);

      await apiPromise; // blocks here only if API is still in-flight

      if (scanError) {
        setApiError(scanError.message || 'Skin analysis failed. Please try again.');
        return;
      }

      // Short pause so the user sees 100% complete before navigating
      setTimeout(() => {
        navigation.replace('ScanResults', {
          scanId: scanResult?._id || scanResult?.scanId,
          result: scanResult,
        });
      }, 700);
    }, elapsed + 200);

    timers.push(done);
    return () => timers.forEach(clearTimeout);
  }, []);

  if (apiError) {
    return (
      <ErrorView
        message={apiError}
        onRetry={() => {
          // Re-submit the same image — user doesn't need to re-take a photo
          setApiError(null);
          setStageIdx(0);
          setProgress(0);
        }}
        onHome={() => navigation.navigate('Main')}
      />
    );
  }

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Animated.ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        style={{ opacity: entryOp }}
      >
        {/* Top badge */}
        <View style={s.badge}>
          <View style={s.badgeDot} />
          <Text style={s.badgeLabel}>AI PROCESSING</Text>
        </View>

        {/* Animated orb */}
        <View style={s.orbWrap}>
          <AIOrb />
        </View>

        <Text style={s.headline}>Analysing Your{'\n'}Melanin Skin</Text>
        <Text style={s.sub}>
          Your image is being analysed by AI trained specifically on melanin-rich skin tones.
        </Text>

        {/* Progress */}
        <View style={s.progressWrap}>
          <ProgressBar progress={progress} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ color: C.creamDim, fontSize: 12, fontWeight: '600' }}>Processing…</Text>
            <Text style={{ color: C.gold, fontSize: 14, fontWeight: '900' }}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>

        {/* Stage list */}
        <View style={s.stages}>
          {STAGES.map((stage, i) => (
            <StageRow
              key={stage.id}
              stage={stage}
              status={i < stageIdx ? 'done' : i === stageIdx ? 'active' : 'pending'}
            />
          ))}
        </View>

        {/* Tip */}
        <View style={s.tipWrap}>
          <TipCarousel idx={tipIdx} />
        </View>

        <Text style={s.notice}>
          Do not close the app. This usually takes 10–25 seconds.
        </Text>
      </Animated.ScrollView>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll:       { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(200,134,10,0.12)', borderWidth: 1, borderColor: 'rgba(200,134,10,0.22)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 28 },
  badgeDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold },
  badgeLabel:   { color: C.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  orbWrap:      { marginBottom: 28 },
  headline:     { color: C.cream, fontSize: 28, fontWeight: '800', textAlign: 'center', lineHeight: 36, letterSpacing: 0.3, marginBottom: 10 },
  sub:          { color: C.creamDim, fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12, marginBottom: 20 },
  progressWrap: { width: '100%', marginBottom: 20 },
  stages:       { width: '100%', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 20 },
  tipWrap:      { width: '100%', marginBottom: 16 },
  notice:       { color: 'rgba(245,222,179,0.25)', fontSize: 10, textAlign: 'center', letterSpacing: 0.3 },
});