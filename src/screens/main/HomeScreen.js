// src/screens/main/HomeScreen.js
//
//  FULLY API-CONNECTED — every value comes from real data:
//  ─────────────────────────────────────────────────────────
//  • user.firstName, user.skinProfile  ← AuthContext (from /auth/me)
//  • stats (totalScans, latestScore)   ← ScanAPI.getStats()
//  • latestScan (score, type, conds)   ← ScanAPI.getHistory(1,1)
//  • streakDays                        ← RoutineAPI.getMyRoutine()
//  • Refetches on every tab focus so numbers update after a scan
//  • Pull-to-refresh on ScrollView
//
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, ScrollView, RefreshControl, Dimensions, ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { ScanAPI, RoutineAPI } from '../../services/api';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg:          '#0F0500',
  bgCard:      '#1A0A02',
  bgCard2:     '#200E03',
  border:      'rgba(200,134,10,0.22)',
  borderBright:'rgba(200,134,10,0.45)',
  gold:        '#C8860A',
  goldLight:   '#E8A020',
  goldPale:    'rgba(200,134,10,0.14)',
  cream:       '#F5DEB3',
  creamDim:    'rgba(245,222,179,0.55)',
  creamFaint:  'rgba(245,222,179,0.20)',
  success:     '#5DBE8A',
  successPale: 'rgba(93,190,138,0.12)',
  error:       '#E05C3A',
};

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
function scoreColor(score) {
  if (!score && score !== 0) return C.creamDim;
  if (score >= 70) return C.success;
  if (score >= 50) return C.goldLight;
  return C.error;
}

function capitalize(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────────────────────
//  Background
// ─────────────────────────────────────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[bg.b, { width: 500, height: 500, borderRadius: 250, backgroundColor: '#6B3000', opacity: 0.10, top: -160, left: -130 }]} />
      <View style={[bg.b, { width: 340, height: 340, borderRadius: 170, backgroundColor: C.gold, opacity: 0.05, bottom: -90, right: -90 }]} />
      <View style={[bg.b, { width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: 'rgba(200,134,10,0.11)', top: -70, left: -70 }]} />
      <View style={[bg.stripe, { top: H * 0.07 }]} />
      <View style={[bg.stripe, { top: H * 0.073, height: 0.8, backgroundColor: 'rgba(240,192,64,0.08)' }]} />
      {[{ top: H * 0.12, left: W * 0.06, o: 0.28 }, { top: H * 0.20, left: W * 0.90, o: 0.18 }, { top: H * 0.75, left: W * 0.88, o: 0.20 }].map((d, i) => (
        <View key={i} style={[bg.dot, { top: d.top, left: d.left, opacity: d.o }]} />
      ))}
      {children}
    </View>
  );
}
const bg = StyleSheet.create({
  b:      { position: 'absolute' },
  stripe: { position: 'absolute', width: W, height: 1.5, backgroundColor: 'rgba(200,134,10,0.14)' },
  dot:    { position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.gold },
});

// ─────────────────────────────────────────────────────────────
//  FadeSlide
// ─────────────────────────────────────────────────────────────
function FadeSlide({ delay = 0, from = 20, children, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 520, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, friction: 8, tension: 50, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
//  Pulsing scan orb button
// ─────────────────────────────────────────────────────────────
function ScanOrb({ onPress }) {
  const glow  = useRef(new Animated.Value(0.4)).current;
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1,   duration: 1600, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.4, duration: 1600, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(ring1, { toValue: 1.18, duration: 1800, useNativeDriver: true }),
      Animated.timing(ring1, { toValue: 1,    duration: 0,    useNativeDriver: true }),
    ])).start();
    setTimeout(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(ring2, { toValue: 1.32, duration: 1800, useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 1,    duration: 0,    useNativeDriver: true }),
      ])).start();
    }, 600);
  }, []);

  return (
    <View style={orb.wrap}>
      <Animated.View style={[orb.ringOuter, { transform: [{ scale: ring2 }] }]} />
      <Animated.View style={[orb.ringMid,   { transform: [{ scale: ring1 }] }]} />
      <Animated.View style={[orb.glow, { opacity: glow }]} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={orb.btn} onPress={onPress} activeOpacity={0.9}
          onPressIn={()  => Animated.spring(scale, { toValue: 0.93, friction: 5, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(scale, { toValue: 1,    friction: 5, useNativeDriver: true }).start()}
        >
          <View style={orb.btnShimmer} />
          <Text style={orb.btnIcon}>◉</Text>
          <Text style={orb.btnLabel}>SCAN MY SKIN</Text>
          <Text style={orb.btnSub}>Tap to begin</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
const orb = StyleSheet.create({
  wrap:      { alignItems: 'center', justifyContent: 'center', height: 240, marginVertical: 20 },
  ringOuter: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(200,134,10,0.12)', opacity: 0.6 },
  ringMid:   { position: 'absolute', width: 176, height: 176, borderRadius: 88, borderWidth: 1, borderColor: 'rgba(200,134,10,0.20)' },
  glow:      { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: C.gold, shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 40, elevation: 20 },
  btn:       { width: 148, height: 148, borderRadius: 74, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: C.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.55, shadowRadius: 20, elevation: 18 },
  btnShimmer:{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 74 },
  btnIcon:   { color: '#0F0500', fontSize: 26, marginBottom: 4 },
  btnLabel:  { color: '#0F0500', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  btnSub:    { color: 'rgba(15,5,0,0.5)', fontSize: 9, fontWeight: '600', marginTop: 2 },
});

// ─────────────────────────────────────────────────────────────
//  Stat chip  ← real values from API
// ─────────────────────────────────────────────────────────────
function StatChip({ icon, value, label, delay, loading }) {
  return (
    <FadeSlide delay={delay} style={{ flex: 1 }}>
      <View style={sc.card}>
        <Text style={sc.icon}>{icon}</Text>
        {loading
          ? <ActivityIndicator size="small" color={C.gold} style={{ marginVertical: 4 }} />
          : <Text style={sc.value}>{value ?? '—'}</Text>
        }
        <Text style={sc.label}>{label}</Text>
      </View>
    </FadeSlide>
  );
}
const sc = StyleSheet.create({
  card:  { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, alignItems: 'center', gap: 5 },
  icon:  { fontSize: 17 },
  value: { color: C.cream, fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  label: { color: C.creamDim, fontSize: 10, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },
});

// ─────────────────────────────────────────────────────────────
//  Section label
// ─────────────────────────────────────────────────────────────
function SectionLabel({ text, actionLabel, onAction }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: C.gold }} />
        <Text style={{ color: C.cream, fontSize: 16, fontWeight: '800' }}>{text}</Text>
      </View>
      {actionLabel && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ color: C.gold, fontSize: 12, fontWeight: '600' }}>{actionLabel} →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  Streak banner  ← real streakDays from API
// ─────────────────────────────────────────────────────────────
function StreakBanner({ streak }) {
  const shimmer  = useRef(new Animated.Value(-W)).current;
  const hasStreak = streak > 0;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: W,  duration: 2400, delay: 1000, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: -W, duration: 0,    useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <FadeSlide delay={180} style={sb.wrap}>
      <View style={sb.inner}>
        <Animated.View style={[sb.shimmer, { transform: [{ translateX: shimmer }] }]} />
        <View style={sb.left}>
          <Text style={sb.icon}>{hasStreak ? '🔥' : '⭕'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={sb.title}>{hasStreak ? `${streak}-day streak!` : 'Start your streak!'}</Text>
            <Text style={sb.sub}>
              {hasStreak
                ? 'Keep scanning. Your skin is improving.'
                : 'Scan today to begin tracking your skin journey.'}
            </Text>
          </View>
        </View>
        <Text style={sb.days}>Day {streak}</Text>
      </View>
    </FadeSlide>
  );
}
const sb = StyleSheet.create({
  wrap:    { marginBottom: 20 },
  inner:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(200,134,10,0.10)', borderWidth: 1, borderColor: 'rgba(200,134,10,0.35)', borderRadius: 14, padding: 14, overflow: 'hidden' },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: 80, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 40 },
  left:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  icon:    { fontSize: 22 },
  title:   { color: C.cream, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  sub:     { color: C.creamDim, fontSize: 11, lineHeight: 16 },
  days:    { color: C.gold, fontSize: 22, fontWeight: '900', letterSpacing: 1 },
});

// ─────────────────────────────────────────────────────────────
//  Skin status card  ← latestScan from API
//  Shows empty state before first scan, full data after
// ─────────────────────────────────────────────────────────────
function SkinStatusCard({ latestScan, loading, onPress, onScanPress }) {
  if (loading) {
    return (
      <View style={[ss.card, { alignItems: 'center', paddingVertical: 36 }]}>
        <ActivityIndicator size="large" color={C.gold} />
        <Text style={{ color: C.creamDim, fontSize: 12, marginTop: 12 }}>Loading your skin data…</Text>
      </View>
    );
  }

  if (!latestScan) {
    return (
      <View style={ss.card}>
        <View style={[ss.corner, ss.cTL]} /><View style={[ss.corner, ss.cTR]} />
        <View style={[ss.corner, ss.cBL]} /><View style={[ss.corner, ss.cBR]} />
        <View style={ss.empty}>
          <Text style={ss.emptyIcon}>◎</Text>
          <Text style={ss.emptyTitle}>No analysis yet</Text>
          <Text style={ss.emptyBody}>
            Your skin profile will appear here after your first scan. We'll identify your skin type and any visible conditions.
          </Text>
          <TouchableOpacity style={ss.emptyCta} onPress={onScanPress} activeOpacity={0.8}>
            <Text style={ss.emptyCtaText}>Start First Scan →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const score      = latestScan.overallScore ?? latestScan.score ?? 0;
  const skinType   = latestScan.skinType   ?? '—';
  const conditions = latestScan.conditions ?? [];
  const scanDate   = formatDate(latestScan.createdAt);
  const sColor     = scoreColor(score);

  return (
    <TouchableOpacity style={ss.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[ss.corner, ss.cTL]} /><View style={[ss.corner, ss.cTR]} />
      <View style={[ss.corner, ss.cBL]} /><View style={[ss.corner, ss.cBR]} />

      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.creamDim, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
            Latest Scan{scanDate ? ` · ${scanDate}` : ''}
          </Text>
          <Text style={{ color: C.cream, fontSize: 18, fontWeight: '800', textTransform: 'capitalize' }}>
            {capitalize(skinType)} Skin
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: sColor, fontSize: 38, fontWeight: '900', lineHeight: 42 }}>{score}</Text>
          <Text style={{ color: C.creamDim, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 }}>SKIN SCORE</Text>
        </View>
      </View>

      {/* Score bar */}
      <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
        <View style={{ width: `${score}%`, height: '100%', backgroundColor: sColor, borderRadius: 2 }} />
      </View>

      {/* Conditions chips */}
      {conditions.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {conditions.slice(0, 3).map((cond, i) => (
            <View key={i} style={{ backgroundColor: C.goldPale, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: C.cream, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>{cond.name}</Text>
            </View>
          ))}
          {conditions.length > 3 && (
            <View style={{ backgroundColor: C.goldPale, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: C.creamDim, fontSize: 11 }}>+{conditions.length - 3} more</Text>
            </View>
          )}
        </View>
      )}

      <Text style={{ color: C.gold, fontSize: 12, fontWeight: '700' }}>View Full Report →</Text>
    </TouchableOpacity>
  );
}
const ss = StyleSheet.create({
  card:      { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' },
  corner:    { position: 'absolute', width: 12, height: 12, borderColor: C.gold, borderWidth: 1.5 },
  cTL:       { top: 10, left: 10, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius:    3 },
  cTR:       { top: 10, right: 10, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius:   3 },
  cBL:       { bottom: 10, left: 10, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 3 },
  cBR:       { bottom: 10, right: 10, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 3 },
  empty:     { alignItems: 'center', paddingVertical: 12 },
  emptyIcon: { color: C.gold, fontSize: 36, marginBottom: 12 },
  emptyTitle:{ color: C.cream, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  emptyBody: { color: C.creamDim, fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 16, paddingHorizontal: 10 },
  emptyCta:  { backgroundColor: C.goldPale, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyCtaText:{ color: C.gold, fontSize: 13, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────
//  Quick action
// ─────────────────────────────────────────────────────────────
function QuickAction({ icon, label, onPress, delay }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <FadeSlide delay={delay} style={{ flex: 1 }}>
      <TouchableOpacity
        style={qa.card} onPress={onPress} activeOpacity={1}
        onPressIn={()  => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start()}
      >
        <Animated.View style={[qa.inner, { transform: [{ scale }] }]}>
          <Text style={qa.icon}>{icon}</Text>
          <Text style={qa.label}>{label}</Text>
        </Animated.View>
      </TouchableOpacity>
    </FadeSlide>
  );
}
const qa = StyleSheet.create({
  card:  { flex: 1, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, alignItems: 'center' },
  inner: { alignItems: 'center', gap: 6 },
  icon:  { fontSize: 22 },
  label: { color: C.creamDim, fontSize: 11, fontWeight: '600', textAlign: 'center', letterSpacing: 0.2 },
});

// ─────────────────────────────────────────────────────────────
//  Skin score progress card  ← improvement from API
// ─────────────────────────────────────────────────────────────
function ScoreProgressCard({ stats, loading }) {
  if (loading || !stats || stats.totalScans < 2) return null;

  const improvement = stats.improvement ?? 0;
  const isPositive  = improvement >= 0;
  const avg         = stats.averageScore ?? 0;
  const latest      = stats.latestScore  ?? 0;

  return (
    <FadeSlide delay={860} style={{ marginBottom: 26 }}>
      <SectionLabel text="Your Progress" />
      <View style={[ss.card, { padding: 18 }]}>
        <View style={[ss.corner, ss.cTL]} /><View style={[ss.corner, ss.cTR]} />
        <View style={[ss.corner, ss.cBL]} /><View style={[ss.corner, ss.cBR]} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: scoreColor(latest), fontSize: 32, fontWeight: '900' }}>{latest}</Text>
            <Text style={{ color: C.creamDim, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 }}>LATEST SCORE</Text>
          </View>
          <View style={{ width: 1, backgroundColor: C.border }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: scoreColor(avg), fontSize: 32, fontWeight: '900' }}>{avg}</Text>
            <Text style={{ color: C.creamDim, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 }}>AVERAGE</Text>
          </View>
          <View style={{ width: 1, backgroundColor: C.border }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: isPositive ? C.success : C.error, fontSize: 32, fontWeight: '900' }}>
              {isPositive ? '+' : ''}{improvement}
            </Text>
            <Text style={{ color: C.creamDim, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 }}>IMPROVEMENT</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ width: `${latest}%`, height: '100%', backgroundColor: scoreColor(latest), borderRadius: 3 }} />
          </View>
          <Text style={{ color: C.creamDim, fontSize: 11 }}>{stats.totalScans} scans</Text>
        </View>
      </View>
    </FadeSlide>
  );
}

// ─────────────────────────────────────────────────────────────
//  Tip card (static education content)
// ─────────────────────────────────────────────────────────────
function TipCard({ icon, title, body, accent, delay }) {
  return (
    <FadeSlide delay={delay} style={{ marginBottom: 10 }}>
      <View style={[tip.card, { borderColor: accent || C.border }]}>
        <View style={[tip.iconBadge, { backgroundColor: 'rgba(200,134,10,0.12)' }]}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={tip.title}>{title}</Text>
          <Text style={tip.body}>{body}</Text>
        </View>
      </View>
    </FadeSlide>
  );
}
const tip = StyleSheet.create({
  card:     { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: C.bgCard, borderWidth: 1, borderRadius: 14, padding: 14 },
  iconBadge:{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  title:    { color: C.cream, fontSize: 13, fontWeight: '700', marginBottom: 3 },
  body:     { color: C.creamDim, fontSize: 12, lineHeight: 18 },
});

// ─────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation();
  const { user }   = useAuth();

  // ── API state ─────────────────────────────────────────────
  const [stats,      setStats]      = useState(null);
  const [latestScan, setLatestScan] = useState(null);
  const [streakDays, setStreakDays] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Derived display values ────────────────────────────────
  const firstName  = user?.firstName ?? user?.name?.split(' ')[0] ?? 'You';
  const skinType   = user?.skinProfile?.skinType ?? latestScan?.skinType ?? null;
  const skinLabel  = skinType ? capitalize(skinType) : '—';
  const totalScans = stats?.totalScans ?? 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  // ── Data fetch ────────────────────────────────────────────
  const fetchData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      // Scan stats + latest scan run in parallel
      const [statsRes, historyRes] = await Promise.allSettled([
        ScanAPI.getStats(),
        ScanAPI.getHistory(1, 1),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }
      if (historyRes.status === 'fulfilled' && historyRes.value?.data?.length > 0) {
        // getHistory returns { data: scan[], meta } — data[0] is most recent scan
        setLatestScan(historyRes.value.data[0]);
      }

      // Routine streak — non-critical, ignore failure
      try {
        const routine = await RoutineAPI.getMyRoutine();
        if (routine?.streakDays != null) setStreakDays(routine.streakDays);
      } catch { /* no routine yet — stay at 0 */ }

    } catch {
      // Network error — stay showing empty states
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh every time tab comes into focus (picks up new scans immediately)
  useFocusEffect(
    useCallback(() => {
      fetchData(loading); // show loader only on very first load
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(false);
    setRefreshing(false);
  }, [fetchData]);

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.gold}
            colors={[C.gold]}
          />
        }
      >

        {/* ── Top bar ── */}
        <FadeSlide delay={0} style={s.topBar}>
          <View>
            <Text style={s.greetSub}>{greeting} ✦</Text>
            <Text style={s.greetName}>{firstName}'s Skin Journey</Text>
          </View>
          <View style={s.topActions}>
            <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Subscription')}>
              <Text style={s.iconBtnText}>◈</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Notifications')}>
              <Text style={s.iconBtnText}>🔔</Text>
            </TouchableOpacity>
          </View>
        </FadeSlide>

        {/* ── Streak banner — real streak ── */}
        <StreakBanner streak={streakDays} />

        {/* ── Scan orb ── */}
        <FadeSlide delay={250}>
          <ScanOrb onPress={() => navigation.navigate('ScanCamera')} />
        </FadeSlide>

        {/* ── Stats row — live from API ── */}
        <FadeSlide delay={380} style={s.statsRow}>
          <StatChip icon="◉" value={totalScans}  label="Scans Done"  delay={420} loading={loading} />
          <StatChip icon="◈" value={skinLabel}   label="Skin Type"   delay={490} loading={loading} />
          <StatChip icon="✦" value={streakDays}  label="Day Streak"  delay={560} loading={loading} />
        </FadeSlide>

        {/* ── Quick actions ── */}
        <FadeSlide delay={600} style={s.sectionWrap}>
          <SectionLabel text="Quick Actions" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <QuickAction icon="📋" label="My Routine"    onPress={() => navigation.navigate('Routine')}   delay={650} />
            <QuickAction icon="◎" label="Scan History"  onPress={() => navigation.navigate('ScanHistory')}   delay={710} />
            <QuickAction icon="💎" label="Upgrade Plan"  onPress={() => navigation.navigate('Subscription')} delay={770} />
          </View>
        </FadeSlide>

        {/* ── Skin status card — live from API ── */}
        <FadeSlide delay={820} style={s.sectionWrap}>
          <SectionLabel
            text="Skin Status"
            actionLabel={latestScan ? "View History" : undefined}
            onAction={() => navigation.navigate('HistoryTab')}
          />
          <SkinStatusCard
            latestScan={latestScan}
            loading={loading}
            onPress={() => {
              if (latestScan) {
                navigation.navigate('ScanResults', {
                  scanId: latestScan._id || latestScan.scanId,
                  result: latestScan,
                });
              }
            }}
            onScanPress={() => navigation.navigate('ScanCamera')}
          />
        </FadeSlide>

        {/* ── Score progress — shown only when user has ≥2 scans ── */}
        <ScoreProgressCard stats={stats} loading={loading} />

        {/* ── Melanin education tips (always shown) ── */}
        <FadeSlide delay={900} style={s.sectionWrap}>
          <SectionLabel text="Melanin Tips" />
          <TipCard
            icon="☀" delay={940}
            title="SPF is Non-Negotiable"
            body="Melanin skin still absorbs UV damage. Use SPF 30–50 — look for tinted mineral formulas with no white cast."
          />
          <TipCard
            icon="💧" delay={1000}
            title="Hydrate from Inside Out"
            body="Ashy, dull skin is often dehydration. Drink water and layer hyaluronic acid under your moisturiser."
          />
          <TipCard
            icon="◎" delay={1060}
            title="Niacinamide is Your BFF"
            body="For hyperpigmentation and uneven tone, niacinamide at 5–10% is safe, effective, and gentle for melanin skin."
          />
          <TipCard
            icon="⚠" delay={1120}
            title="Avoid These Ingredients"
            body="Fragrance, harsh alcohols, and high-strength retinoids can trigger post-inflammatory hyperpigmentation."
            accent="rgba(224,92,58,0.35)"
          />
        </FadeSlide>

        <View style={{ height: 100 }} />
      </ScrollView>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll:      { paddingTop: 60, paddingHorizontal: 22 },
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  greetSub:    { color: C.creamDim, fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginBottom: 3 },
  greetName:   { color: C.cream, fontSize: 24, fontWeight: '800', letterSpacing: 0.2 },
  topActions:  { flexDirection: 'row', gap: 8 },
  iconBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 16 },
  statsRow:    { flexDirection: 'row', gap: 10, marginBottom: 24 },
  sectionWrap: { marginBottom: 26 },
});