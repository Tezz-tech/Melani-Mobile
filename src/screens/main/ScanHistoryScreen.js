// src/screens/main/ScanHistoryScreen.js
//
//  FULLY API-CONNECTED:
//  ─────────────────────────────────────────────────────────────
//  • ScanAPI.getHistory(page, 10)  → paginated scan list
//  • ScanAPI.getStats()            → totalScans, averageScore, improvement
//  • Infinite scroll (load more on scroll-to-bottom)
//  • Pull-to-refresh
//  • useFocusEffect — refetches every time tab comes into focus
//  • Swipe-to-delete with confirmation (ScanAPI.deleteScan)
//  • Real score trend mini-chart from scoreHistory[]
//  • Filter tabs filter locally (no extra API calls)
//  • All mock data removed
//
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, ScrollView, RefreshControl, Dimensions,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScanAPI } from '../../services/api';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg:         '#0F0500',
  bgCard:     '#1A0A02',
  bgCard2:    '#200E03',
  border:     'rgba(200,134,10,0.22)',
  gold:       '#C8860A',
  goldLight:  '#E8A020',
  goldPale:   'rgba(200,134,10,0.14)',
  cream:      '#F5DEB3',
  creamDim:   'rgba(245,222,179,0.55)',
  creamFaint: 'rgba(245,222,179,0.18)',
  success:    '#5DBE8A',
  successPale:'rgba(93,190,138,0.12)',
  warn:       '#E8A020',
  error:      '#E05C3A',
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

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function capitalize(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// derive trend from current score vs previous
function deriveTrend(scans, index) {
  if (index >= scans.length - 1) return 'stable';
  const curr = scans[index].overallScore     ?? 0;
  const prev = scans[index + 1].overallScore ?? 0;
  const diff = curr - prev;
  if (diff >= 3)  return 'improving';
  if (diff <= -3) return 'declining';
  return 'stable';
}

// ─────────────────────────────────────────────────────────────
//  Background
// ─────────────────────────────────────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[abg.b, { width: 460, height: 460, borderRadius: 230, backgroundColor: '#6B3000', opacity: 0.09, top: -140, left: -120 }]} />
      <View style={[abg.b, { width: 300, height: 300, borderRadius: 150, backgroundColor: C.gold, opacity: 0.05, bottom: -80, right: -80 }]} />
      <View style={[abg.stripe, { top: H * 0.07 }]} />
      {[{ top: H * 0.10, left: W * 0.06, o: 0.26 }, { top: H * 0.82, left: W * 0.88, o: 0.18 }].map((d, i) => (
        <View key={i} style={[abg.dot, { top: d.top, left: d.left, opacity: d.o }]} />
      ))}
      {children}
    </View>
  );
}
const abg = StyleSheet.create({
  b:      { position: 'absolute' },
  stripe: { position: 'absolute', width: W, height: 1.5, backgroundColor: 'rgba(200,134,10,0.12)' },
  dot:    { position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.gold },
});

// ─────────────────────────────────────────────────────────────
//  FadeSlide
// ─────────────────────────────────────────────────────────────
function FadeSlide({ delay = 0, from = 18, children, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(ty,  { toValue: 0, friction: 8, tension: 50, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>{children}</Animated.View>;
}

// ─────────────────────────────────────────────────────────────
//  Filter tab
// ─────────────────────────────────────────────────────────────
function FilterTab({ label, active, onPress }) {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: active ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [active]);
  const bgColor     = anim.interpolate({ inputRange: [0, 1], outputRange: [C.bgCard, 'rgba(200,134,10,0.18)'] });
  const borderColor = anim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.gold] });
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[ft.tab, { backgroundColor: bgColor, borderColor }]}>
        <Text style={[ft.label, active && ft.labelActive]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}
const ft = StyleSheet.create({
  tab:        { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  label:      { color: C.creamDim, fontSize: 13, fontWeight: '600' },
  labelActive:{ color: C.gold },
});

// ─────────────────────────────────────────────────────────────
//  Stats bar (real data from ScanAPI.getStats)
// ─────────────────────────────────────────────────────────────
function StatsBar({ stats }) {
  if (!stats) return null;
  const improvement = stats.improvement ?? 0;
  const isPos       = improvement >= 0;
  return (
    <FadeSlide delay={120} style={stb.row}>
      <View style={stb.box}>
        <Text style={stb.val}>{stats.totalScans ?? 0}</Text>
        <Text style={stb.lbl}>Total Scans</Text>
      </View>
      <View style={stb.div} />
      <View style={stb.box}>
        <Text style={[stb.val, { color: scoreColor(stats.latestScore) }]}>
          {stats.latestScore ?? '—'}
        </Text>
        <Text style={stb.lbl}>Latest Score</Text>
      </View>
      <View style={stb.div} />
      <View style={stb.box}>
        <Text style={[stb.val, { color: isPos ? C.success : C.error }]}>
          {isPos ? '+' : ''}{improvement}
        </Text>
        <Text style={stb.lbl}>Score Change</Text>
      </View>
    </FadeSlide>
  );
}
const stb = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 20, alignItems: 'center' },
  box: { flex: 1, alignItems: 'center' },
  val: { color: C.cream, fontSize: 22, fontWeight: '900', marginBottom: 2 },
  lbl: { color: C.creamDim, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  div: { width: 1, height: 36, backgroundColor: C.border },
});

// ─────────────────────────────────────────────────────────────
//  Score trend chart (from stats.scoreHistory[])
// ─────────────────────────────────────────────────────────────
function ScoreTrendChart({ scoreHistory }) {
  if (!scoreHistory || scoreHistory.length < 2) return null;
  // show most recent 8
  const data    = scoreHistory.slice(-8);
  const maxScore = Math.max(...data.map(d => d.score), 1);

  return (
    <FadeSlide delay={200} style={stc.wrap}>
      <View style={stc.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: C.gold }} />
          <Text style={stc.title}>Score Trend</Text>
        </View>
        <Text style={{ color: C.creamDim, fontSize: 11 }}>Last {data.length} scans</Text>
      </View>
      <View style={stc.chart}>
        {data.map((d, i) => {
          const h   = Math.max(4, (d.score / maxScore) * 64);
          const col = scoreColor(d.score);
          const isLast = i === data.length - 1;
          return (
            <View key={i} style={stc.barWrap}>
              {isLast && (
                <View style={{ position: 'absolute', top: 64 - h - 20, alignItems: 'center' }}>
                  <Text style={{ color: col, fontSize: 9, fontWeight: '800' }}>{d.score}</Text>
                </View>
              )}
              <View style={[stc.bar, { height: h, backgroundColor: isLast ? col : col + '66' }]} />
              <Text style={stc.barDate}>
                {d.date ? new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).split(' ')[0] : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </FadeSlide>
  );
}
const stc = StyleSheet.create({
  wrap:    { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 20 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title:   { color: C.cream, fontSize: 14, fontWeight: '700' },
  chart:   { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80 },
  barWrap: { flex: 1, alignItems: 'center', gap: 4, position: 'relative' },
  bar:     { width: '100%', borderRadius: 3, minHeight: 4 },
  barDate: { color: C.creamDim, fontSize: 8, marginTop: 2 },
});

// ─────────────────────────────────────────────────────────────
//  Trend badge
// ─────────────────────────────────────────────────────────────
function TrendBadge({ trend }) {
  const cfg = {
    improving:{ icon: '↑', color: C.success, bg: 'rgba(93,190,138,0.12)',  label: 'Improving' },
    stable:   { icon: '→', color: C.warn,    bg: 'rgba(232,160,32,0.12)', label: 'Stable'    },
    declining:{ icon: '↓', color: C.error,   bg: 'rgba(224,92,58,0.12)',  label: 'Declining' },
  };
  const t = cfg[trend] || cfg.stable;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ color: t.color, fontSize: 11, fontWeight: '700' }}>{t.icon} {t.label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  Scan card (real API data)
// ─────────────────────────────────────────────────────────────
function ScanCard({ scan, index, trend, onPress, onDelete }) {
  const scale = useRef(new Animated.Value(1)).current;

  const score      = scan.overallScore ?? 0;
  const skinType   = scan.skinType     ?? '—';
  const conditions = (scan.conditions  ?? []).slice(0, 3);
  const sColor     = scoreColor(score);

  const confirmDelete = () => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(scan._id || scan.scanId) },
      ]
    );
  };

  return (
    <FadeSlide delay={index * 70} style={{ marginBottom: 12 }}>
      <TouchableOpacity
        onPress={onPress} activeOpacity={1}
        onPressIn={()  => Animated.spring(scale, { toValue: 0.97, friction: 6, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    friction: 6, useNativeDriver: true }).start()}
      >
        <Animated.View style={[crd.root, { transform: [{ scale }] }]}>

          {/* Top row: date + trend */}
          <View style={crd.topRow}>
            <View>
              <Text style={crd.date}>{formatDate(scan.createdAt)}</Text>
              <Text style={crd.time}>{formatTime(scan.createdAt)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TrendBadge trend={trend} />
              <TouchableOpacity onPress={confirmDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: C.creamFaint, fontSize: 15 }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Body: skin info + score */}
          <View style={crd.body}>
            <View style={{ flex: 1 }}>
              {/* Skin type */}
              <View style={crd.typeRow}>
                <View style={crd.typeDot} />
                <Text style={crd.typeLabel}>Skin Type</Text>
                <Text style={crd.typeValue}>{capitalize(skinType)}</Text>
              </View>

              {/* Score breakdown mini bars */}
              {scan.scoreBreakdown && (
                <View style={{ gap: 5, marginBottom: 10 }}>
                  {Object.entries(scan.scoreBreakdown).slice(0, 3).map(([key, val]) => (
                    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: C.creamFaint, fontSize: 10, width: 56, textTransform: 'capitalize' }}>{key}</Text>
                      <View style={{ flex: 1, height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' }}>
                        <View style={{ width: `${val}%`, height: '100%', backgroundColor: scoreColor(val), borderRadius: 2 }} />
                      </View>
                      <Text style={{ color: C.creamDim, fontSize: 10, width: 22, textAlign: 'right' }}>{val}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Conditions */}
              {conditions.length > 0 && (
                <View style={crd.condRow}>
                  {conditions.map((c, i) => (
                    <View key={i} style={crd.condPill}>
                      <Text style={crd.condText}>{c.name}</Text>
                    </View>
                  ))}
                  {(scan.conditions?.length ?? 0) > 3 && (
                    <View style={crd.condPill}>
                      <Text style={crd.condText}>+{scan.conditions.length - 3}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Score circle */}
            <View style={[crd.scoreRing, { borderColor: sColor + '88' }]}>
              <Text style={[crd.scoreNum, { color: sColor }]}>{score}</Text>
              <Text style={crd.scoreLabel}>score</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={crd.footer}>
            <Text style={crd.footerText}>View full report →</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </FadeSlide>
  );
}
const crd = StyleSheet.create({
  root:       { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 },
  topRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  date:       { color: C.cream, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  time:       { color: C.creamDim, fontSize: 12 },
  body:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  typeRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  typeDot:    { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.gold },
  typeLabel:  { color: C.creamDim, fontSize: 12 },
  typeValue:  { color: C.cream, fontSize: 13, fontWeight: '700' },
  condRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  condPill:   { backgroundColor: C.goldPale, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  condText:   { color: C.creamDim, fontSize: 11, fontWeight: '600' },
  scoreRing:  { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scoreNum:   { fontSize: 20, fontWeight: '900', lineHeight: 22 },
  scoreLabel: { color: C.creamDim, fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  footer:     { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  footerText: { color: C.gold, fontSize: 12, fontWeight: '600' },
});

// ─────────────────────────────────────────────────────────────
//  Empty state
// ─────────────────────────────────────────────────────────────
function EmptyHistory({ onScan }) {
  const pulse = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.9,  duration: 1800, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={emp.wrap}>
      <Animated.View style={[emp.iconWrap, { transform: [{ scale: pulse }] }]}>
        <Text style={emp.icon}>◎</Text>
      </Animated.View>
      <Text style={emp.title}>No scans yet</Text>
      <Text style={emp.body}>
        Your scan results and analysis history will appear here. Each scan tracks your skin's progress over time.
      </Text>
      <TouchableOpacity style={emp.cta} onPress={onScan} activeOpacity={0.85}>
        <Text style={emp.ctaText}>Take Your First Scan →</Text>
      </TouchableOpacity>
    </View>
  );
}
const emp = StyleSheet.create({
  wrap:     { alignItems: 'center', paddingTop: 40, paddingBottom: 60 },
  iconWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: C.goldPale, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: C.gold, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 0 }, shadowRadius: 12, elevation: 6 },
  icon:     { color: C.gold, fontSize: 34 },
  title:    { color: C.cream, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  body:     { color: C.creamDim, fontSize: 14, lineHeight: 22, textAlign: 'center', paddingHorizontal: 24, marginBottom: 24 },
  cta:      { backgroundColor: C.goldPale, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  ctaText:  { color: C.gold, fontSize: 14, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────
//  Filter logic
// ─────────────────────────────────────────────────────────────
const FILTERS = ['All', 'This Month', 'Last 3 Months'];

function applyFilter(scans, filter) {
  if (filter === 'All') return scans;
  const now   = new Date();
  const cutoff = new Date(now);
  if (filter === 'This Month') {
    cutoff.setDate(1);
    cutoff.setHours(0, 0, 0, 0);
  } else if (filter === 'Last 3 Months') {
    cutoff.setMonth(cutoff.getMonth() - 3);
  }
  return scans.filter(s => s.createdAt && new Date(s.createdAt) >= cutoff);
}

// ─────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

export default function ScanHistoryScreen() {
  const navigation = useNavigation();

  const [scans,       setScans]       = useState([]);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [activeFilter,setActiveFilter]= useState('All');

  // ── Initial / refresh fetch ────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [histRes, statsRes] = await Promise.allSettled([
        ScanAPI.getHistory(1, PAGE_SIZE),
        ScanAPI.getStats(),
      ]);

      if (histRes.status === 'fulfilled' && histRes.value) {
        // getHistory returns { data: scan[], meta: { totalPages, ... } }
        setScans(histRes.value.data ?? []);
        setTotalPages(histRes.value.meta?.totalPages ?? 1);
        setPage(1);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }
    } catch { /* silent — show empty state */ }
    finally { setLoading(false); }
  }, []);

  // Refetch whenever tab is focused (picks up new scans immediately)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ── Load next page on scroll-to-bottom ────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const res = await ScanAPI.getHistory(page + 1, PAGE_SIZE);
      // res = { data: scan[], meta: { totalPages, ... } }
      if (res?.data?.length) {
        setScans(prev => [...prev, ...res.data]);
        setPage(p => p + 1);
      }
    } catch { /* silent */ }
    finally { setLoadingMore(false); }
  }, [loadingMore, page, totalPages]);

  const handleScroll = useCallback(({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) {
      loadMore();
    }
  }, [loadMore]);

  // ── Delete a scan ──────────────────────────────────────────
  const deleteScan = useCallback(async (id) => {
    // Optimistic removal
    setScans(prev => prev.filter(s => (s._id || s.scanId) !== id));
    try {
      await ScanAPI.deleteScan(id);
      // Refresh stats after delete
      const statsRes = await ScanAPI.getStats();
      setStats(statsRes);
    } catch {
      // Revert on failure — refetch
      fetchData();
    }
  }, [fetchData]);

  // ── Filtered view ──────────────────────────────────────────
  const filtered = applyFilter(scans, activeFilter);

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={300}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.gold}
            colors={[C.gold]}
          />
        }
      >

        {/* ── Header ── */}
        <FadeSlide delay={0} style={s.header}>
          <View>
            <Text style={s.title}>Scan History</Text>
            <Text style={s.subtitle}>
              {scans.length > 0
                ? `${scans.length} scan${scans.length !== 1 ? 's' : ''} recorded`
                : "Track your skin's journey over time"}
            </Text>
          </View>
          {scans.length > 0 && (
            <TouchableOpacity
              style={s.newScanBtn}
              onPress={() => navigation.navigate('ScanCamera')}
              activeOpacity={0.85}
            >
              <Text style={s.newScanText}>+ Scan</Text>
            </TouchableOpacity>
          )}
        </FadeSlide>

        {/* ── Initial loader ── */}
        {loading && (
          <View style={{ paddingVertical: 80, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={C.gold} />
            <Text style={{ color: C.creamDim, fontSize: 13, marginTop: 14 }}>Loading your scans…</Text>
          </View>
        )}

        {/* ── Has scans ── */}
        {!loading && scans.length > 0 && (
          <>
            {/* Stats bar */}
            <StatsBar stats={stats} />

            {/* Score trend chart — only when we have history data */}
            {stats?.scoreHistory?.length >= 2 && (
              <ScoreTrendChart scoreHistory={stats.scoreHistory} />
            )}

            {/* Filter tabs */}
            <FadeSlide delay={260}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
                contentContainerStyle={{ paddingRight: 24 }}
              >
                {FILTERS.map(f => (
                  <FilterTab
                    key={f}
                    label={f}
                    active={activeFilter === f}
                    onPress={() => setActiveFilter(f)}
                  />
                ))}
              </ScrollView>
            </FadeSlide>

            {/* Section label */}
            <FadeSlide delay={320} style={s.listHeader}>
              <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: C.gold }} />
              <Text style={s.listHeaderText}>
                {filtered.length} Scan{filtered.length !== 1 ? 's' : ''}
                {activeFilter !== 'All' ? ` · ${activeFilter}` : ''}
              </Text>
            </FadeSlide>

            {/* Filtered empty state */}
            {filtered.length === 0 && (
              <FadeSlide delay={380} style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: C.creamDim, fontSize: 14, textAlign: 'center' }}>
                  No scans in this period.{'\n'}Try a different filter or pull to refresh.
                </Text>
              </FadeSlide>
            )}

            {/* Scan cards */}
            {filtered.map((scan, i) => (
              <ScanCard
                key={scan._id || scan.scanId || i}
                scan={scan}
                index={i}
                trend={deriveTrend(filtered, i)}
                onPress={() => navigation.navigate('ScanResults', {
                  scanId: scan._id || scan.scanId,
                  result: scan,
                })}
                onDelete={deleteScan}
              />
            ))}

            {/* Load more spinner */}
            {loadingMore && (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={C.gold} />
                <Text style={{ color: C.creamDim, fontSize: 11, marginTop: 8 }}>Loading more…</Text>
              </View>
            )}

            {/* End of list indicator */}
            {!loadingMore && page >= totalPages && scans.length >= PAGE_SIZE && (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <Text style={{ color: C.creamFaint, fontSize: 11 }}>All scans loaded</Text>
              </View>
            )}
          </>
        )}

        {/* ── Empty state ── */}
        {!loading && scans.length === 0 && (
          <EmptyHistory onScan={() => navigation.navigate('ScanCamera')} />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll:       { paddingTop: 60, paddingHorizontal: 22 },
  header:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  title:        { color: C.cream, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle:     { color: C.creamDim, fontSize: 13 },
  newScanBtn:   { backgroundColor: C.goldPale, borderWidth: 1.5, borderColor: C.gold, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  newScanText:  { color: C.gold, fontSize: 13, fontWeight: '700' },
  listHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  listHeaderText:{ color: C.cream, fontSize: 16, fontWeight: '800' },
});