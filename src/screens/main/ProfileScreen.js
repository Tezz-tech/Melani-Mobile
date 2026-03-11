// src/screens/main/ProfileScreen.js
//
//  FULLY API-CONNECTED:
//  ─────────────────────────────────────────────────────────────
//  • useAuth()           → user.firstName, lastName, email,
//                          subscription.plan, skinProfile, scanUsage
//  • AuthAPI.updateMe()  → PATCH /auth/update-me (inline name edit)
//  • ScanAPI.getStats()  → lastScan date, skin type, top concern
//  • AuthContext.logout()→ clears tokens + resets nav to Welcome
//  • useFocusEffect      → refreshes scan stats on tab focus
//
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, ScrollView, RefreshControl, Dimensions,
  ActivityIndicator, TextInput, Alert, Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { AuthAPI, ScanAPI } from '../../services/api';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg:          '#0F0500',
  bgCard:      '#1A0A02',
  bgCard2:     '#200E03',
  border:      'rgba(200,134,10,0.22)',
  borderBright:'rgba(200,134,10,0.50)',
  gold:        '#C8860A',
  goldLight:   '#E8A020',
  goldPale:    'rgba(200,134,10,0.14)',
  cream:       '#F5DEB3',
  creamDim:    'rgba(245,222,179,0.55)',
  creamFaint:  'rgba(245,222,179,0.18)',
  success:     '#5DBE8A',
  error:       '#E05C3A',
  errorPale:   'rgba(224,92,58,0.10)',
};

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
function capitalize(str) {
  if (!str || str === 'unknown') return '—';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────
//  Background
// ─────────────────────────────────────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[bg.b, { width: 480, height: 480, borderRadius: 240, backgroundColor: '#6B3000', opacity: 0.09, top: -150, left: -130 }]} />
      <View style={[bg.b, { width: 320, height: 320, borderRadius: 160, backgroundColor: C.gold, opacity: 0.05, bottom: -80, right: -80 }]} />
      <View style={[bg.b, { width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(200,134,10,0.10)', top: -65, left: -65 }]} />
      <View style={[bg.stripe, { top: H * 0.07 }]} />
      {[{ top: H * 0.12, left: W * 0.06, o: 0.24 }, { top: H * 0.8, left: W * 0.88, o: 0.16 }].map((d, i) => (
        <View key={i} style={[bg.dot, { top: d.top, left: d.left, opacity: d.o }]} />
      ))}
      {children}
    </View>
  );
}
const bg = StyleSheet.create({
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
//  Edit Name Modal
// ─────────────────────────────────────────────────────────────
function EditNameModal({ visible, currentFirst, currentLast, onSave, onClose }) {
  const [first,   setFirst]   = useState(currentFirst);
  const [last,    setLast]    = useState(currentLast);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (visible) { setFirst(currentFirst); setLast(currentLast); setError(''); }
  }, [visible]);

  const handleSave = async () => {
    if (!first.trim() || !last.trim()) { setError('Both fields are required.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ firstName: first.trim(), lastName: last.trim() });
      onClose();
    } catch (e) {
      setError(e?.message || 'Failed to update. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={enm.overlay}>
        <View style={enm.sheet}>
          <Text style={enm.title}>Edit Name</Text>

          <Text style={enm.label}>First Name</Text>
          <TextInput
            style={enm.input}
            value={first}
            onChangeText={setFirst}
            placeholder="First name"
            placeholderTextColor={C.creamFaint}
            autoCapitalize="words"
          />
          <Text style={enm.label}>Last Name</Text>
          <TextInput
            style={enm.input}
            value={last}
            onChangeText={setLast}
            placeholder="Last name"
            placeholderTextColor={C.creamFaint}
            autoCapitalize="words"
          />

          {error ? <Text style={enm.error}>{error}</Text> : null}

          <View style={enm.btnRow}>
            <TouchableOpacity style={enm.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={enm.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[enm.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#0F0500" />
                : <Text style={enm.saveText}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const enm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: C.border },
  title:     { color: C.cream, fontSize: 18, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  label:     { color: C.creamDim, fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  input:     { backgroundColor: C.bgCard2, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, color: C.cream, fontSize: 15, marginBottom: 14 },
  error:     { color: C.error, fontSize: 12, marginBottom: 12, textAlign: 'center' },
  btnRow:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelText:{ color: C.creamDim, fontSize: 14, fontWeight: '600' },
  saveBtn:   { flex: 1, backgroundColor: C.gold, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveText:  { color: '#0F0500', fontSize: 14, fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────
//  Avatar section — real name, email, plan from user object
// ─────────────────────────────────────────────────────────────
function AvatarSection({ user, onEditName }) {
  const spin  = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 14000, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 2000, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.9,  duration: 2000, useNativeDriver: true }),
    ])).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Skin Lover';
  const email    = user?.email || '';
  const plan     = user?.subscription?.plan || 'free';

  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const PLAN_CONFIG = {
    free:  { color: C.creamDim,   bg: 'rgba(245,222,179,0.08)', label: 'FREE PLAN',  icon: '◎' },
    pro:   { color: C.gold,       bg: C.goldPale,               label: 'PRO PLAN',   icon: '◈' },
    elite: { color: C.goldLight,  bg: 'rgba(232,160,32,0.14)',  label: 'ELITE PLAN', icon: '✦' },
  };
  const planCfg = PLAN_CONFIG[plan] || PLAN_CONFIG.free;

  return (
    <FadeSlide delay={0} style={av.wrap}>
      <View style={av.avatarContainer}>
        <Animated.View style={[av.outerRing, { transform: [{ rotate }] }]} />
        <Animated.View style={[av.innerRing, { transform: [{ scale: pulse }] }]} />
        <View style={av.avatar}>
          <Text style={av.initials}>{initials}</Text>
        </View>
      </View>

      {/* Tappable name — opens edit modal */}
      <TouchableOpacity onPress={onEditName} activeOpacity={0.7} style={{ alignItems: 'center' }}>
        <Text style={av.name}>{fullName}</Text>
        <Text style={{ color: C.creamFaint, fontSize: 10, marginTop: -2 }}>tap to edit ✎</Text>
      </TouchableOpacity>

      <Text style={av.email}>{email}</Text>

      <View style={[av.planBadge, { backgroundColor: planCfg.bg, borderColor: planCfg.color }]}>
        <Text style={[av.planIcon, { color: planCfg.color }]}>{planCfg.icon}</Text>
        <Text style={[av.planText, { color: planCfg.color }]}>{planCfg.label}</Text>
      </View>

      {/* Scan usage for free plan */}
      {plan === 'free' && user?.scanUsage?.monthlyCount != null && (
        <Text style={{ color: C.creamFaint, fontSize: 11, marginTop: 8 }}>
          {user.scanUsage.monthlyCount} scan{user.scanUsage.monthlyCount !== 1 ? 's' : ''} used this month
        </Text>
      )}
    </FadeSlide>
  );
}
const av = StyleSheet.create({
  wrap:            { alignItems: 'center', paddingTop: 20, marginBottom: 28 },
  avatarContainer: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  outerRing:       { position: 'absolute', width: 108, height: 108, borderRadius: 54, borderWidth: 1, borderColor: 'rgba(200,134,10,0.22)', borderStyle: 'dashed' },
  innerRing:       { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 1.5, borderColor: 'rgba(200,134,10,0.35)' },
  avatar:          { width: 80, height: 80, borderRadius: 40, backgroundColor: C.goldPale, borderWidth: 2, borderColor: C.gold, alignItems: 'center', justifyContent: 'center', shadowColor: C.gold, shadowOpacity: 0.45, shadowOffset: { width: 0, height: 0 }, shadowRadius: 16, elevation: 10 },
  initials:        { color: C.gold, fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  name:            { color: C.cream, fontSize: 22, fontWeight: '800', letterSpacing: 0.2, marginBottom: 4 },
  email:           { color: C.creamDim, fontSize: 13, marginBottom: 14 },
  planBadge:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  planIcon:        { fontSize: 12 },
  planText:        { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
});

// ─────────────────────────────────────────────────────────────
//  Upgrade card — only shown on free plan
// ─────────────────────────────────────────────────────────────
function UpgradeCard({ plan, onPress }) {
  const shimmer = useRef(new Animated.Value(-W)).current;
  useEffect(() => {
    if (plan === 'free') {
      Animated.loop(Animated.sequence([
        Animated.timing(shimmer, { toValue: W,  duration: 2600, delay: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: -W, duration: 0,              useNativeDriver: true }),
      ])).start();
    }
  }, [plan]);
  if (plan !== 'free') return null;
  return (
    <FadeSlide delay={150} style={{ marginBottom: 24 }}>
      <View style={uc.card}>
        <Animated.View style={[uc.shimmer, { transform: [{ translateX: shimmer }] }]} />
        <Text style={uc.tag}>UPGRADE</Text>
        <Text style={uc.title}>Unlock Pro Plan</Text>
        <Text style={uc.body}>Unlimited scans, advanced analysis, no watermarks & progress tracking.</Text>
        <TouchableOpacity style={uc.btn} onPress={onPress} activeOpacity={0.85}>
          <Text style={uc.btnText}>View Plans →</Text>
        </TouchableOpacity>
      </View>
    </FadeSlide>
  );
}
const uc = StyleSheet.create({
  card:    { backgroundColor: 'rgba(200,134,10,0.10)', borderWidth: 1.5, borderColor: C.gold, borderRadius: 16, padding: 18, overflow: 'hidden' },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 50 },
  tag:     { color: C.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  title:   { color: C.cream, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  body:    { color: C.creamDim, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  btn:     { backgroundColor: C.gold, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#0F0500', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
});

// ─────────────────────────────────────────────────────────────
//  Skin profile card — real data from user + latest scan stats
// ─────────────────────────────────────────────────────────────
function SkinProfileCard({ user, stats, statsLoading, onScan }) {
  const skinType   = user?.skinProfile?.skinType;
  const concerns   = user?.skinProfile?.primaryConcerns ?? [];
  const topConcern = concerns[0] || null;

  // Last scan date from stats
  const lastScanDate = stats?.scoreHistory?.length
    ? formatDate(stats.scoreHistory[stats.scoreHistory.length - 1]?.date)
    : '—';

  const cells = [
    { label: 'Skin Type',    value: capitalize(skinType),          icon: '◎' },
    { label: 'Last Scan',    value: statsLoading ? '…' : lastScanDate, icon: '◉' },
    { label: 'Top Concern',  value: topConcern ? capitalize(topConcern) : '—', icon: '◈' },
  ];

  return (
    <FadeSlide delay={200} style={spc.wrap}>
      <View style={spc.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: C.gold }} />
          <Text style={spc.title}>Skin Profile</Text>
        </View>
        <TouchableOpacity onPress={onScan}>
          <Text style={{ color: C.gold, fontSize: 12, fontWeight: '600' }}>Scan now →</Text>
        </TouchableOpacity>
      </View>

      <View style={spc.row}>
        {cells.map((item, i) => (
          <View key={i} style={spc.cell}>
            <Text style={spc.cellIcon}>{item.icon}</Text>
            <Text style={spc.cellValue} numberOfLines={1}>{item.value}</Text>
            <Text style={spc.cellLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Skin concerns chips */}
      {concerns.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border }}>
          <Text style={{ color: C.creamDim, fontSize: 11, fontWeight: '600', width: '100%', marginBottom: 4 }}>YOUR CONCERNS</Text>
          {concerns.slice(0, 5).map((c, i) => (
            <View key={i} style={{ backgroundColor: C.goldPale, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: C.creamDim, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>{c}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Score summary if available */}
      {stats?.totalScans > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: C.cream, fontSize: 20, fontWeight: '900' }}>{stats.totalScans}</Text>
            <Text style={{ color: C.creamDim, fontSize: 10, fontWeight: '600' }}>TOTAL SCANS</Text>
          </View>
          <View style={{ width: 1, backgroundColor: C.border }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: C.gold, fontSize: 20, fontWeight: '900' }}>{stats.latestScore ?? '—'}</Text>
            <Text style={{ color: C.creamDim, fontSize: 10, fontWeight: '600' }}>LATEST SCORE</Text>
          </View>
          <View style={{ width: 1, backgroundColor: C.border }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: stats.improvement >= 0 ? C.success : C.error, fontSize: 20, fontWeight: '900' }}>
              {stats.improvement != null ? `${stats.improvement >= 0 ? '+' : ''}${stats.improvement}` : '—'}
            </Text>
            <Text style={{ color: C.creamDim, fontSize: 10, fontWeight: '600' }}>IMPROVEMENT</Text>
          </View>
        </View>
      )}
    </FadeSlide>
  );
}
const spc = StyleSheet.create({
  wrap:      { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 24 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title:     { color: C.cream, fontSize: 16, fontWeight: '800' },
  row:       { flexDirection: 'row' },
  cell:      { flex: 1, alignItems: 'center', gap: 4 },
  cellIcon:  { color: C.gold, fontSize: 16 },
  cellValue: { color: C.cream, fontSize: 15, fontWeight: '800' },
  cellLabel: { color: C.creamDim, fontSize: 10, fontWeight: '600', textAlign: 'center' },
});

// ─────────────────────────────────────────────────────────────
//  Section label
// ─────────────────────────────────────────────────────────────
function SectionLabel({ text, delay }) {
  return (
    <FadeSlide delay={delay} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 }}>
      <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: C.gold }} />
      <Text style={{ color: C.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
        {text}
      </Text>
    </FadeSlide>
  );
}

// ─────────────────────────────────────────────────────────────
//  Menu item
// ─────────────────────────────────────────────────────────────
function MenuItem({ icon, label, sublabel, badge, badgeColor, onPress, delay, dangerous }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <FadeSlide delay={delay} style={{ marginBottom: 8 }}>
      <TouchableOpacity
        onPress={onPress} activeOpacity={1}
        onPressIn={()  => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start()}
      >
        <Animated.View style={[mi.root, dangerous && mi.dangerous, { transform: [{ scale }] }]}>
          <View style={[mi.iconWrap, dangerous && mi.iconWrapDangerous]}>
            <Text style={mi.icon}>{icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[mi.label, dangerous && mi.labelDangerous]}>{label}</Text>
            {sublabel && <Text style={mi.sublabel}>{sublabel}</Text>}
          </View>
          {badge && (
            <View style={[mi.badge, { backgroundColor: `${badgeColor}20`, borderColor: `${badgeColor}50` }]}>
              <Text style={[mi.badgeText, { color: badgeColor || C.gold }]}>{badge}</Text>
            </View>
          )}
          {!dangerous && <Text style={mi.arrow}>›</Text>}
        </Animated.View>
      </TouchableOpacity>
    </FadeSlide>
  );
}
const mi = StyleSheet.create({
  root:             { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, gap: 12 },
  dangerous:        { backgroundColor: C.errorPale, borderColor: 'rgba(224,92,58,0.30)' },
  iconWrap:         { width: 38, height: 38, borderRadius: 10, backgroundColor: C.goldPale, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  iconWrapDangerous:{ backgroundColor: 'rgba(224,92,58,0.10)', borderColor: 'rgba(224,92,58,0.25)' },
  icon:             { fontSize: 16 },
  label:            { color: C.cream, fontSize: 14, fontWeight: '600' },
  labelDangerous:   { color: C.error },
  sublabel:         { color: C.creamDim, fontSize: 11, marginTop: 2 },
  badge:            { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 },
  badgeText:        { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  arrow:            { color: C.creamDim, fontSize: 22, fontWeight: '300', lineHeight: 24 },
});

// ─────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout, updateUser } = useAuth();

  const [stats,       setStats]       = useState(null);
  const [statsLoading,setStatsLoading]= useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [signingOut,  setSigningOut]  = useState(false);

  // ── Fetch scan stats on focus ────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const s = await ScanAPI.getStats();
      setStats(s);
    } catch { /* no scans yet — stats stays null */ }
    finally { setStatsLoading(false); }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setStatsLoading(true);
      fetchStats();
    }, [fetchStats])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  // ── Update name via AuthAPI ──────────────────────────────
  const handleSaveName = useCallback(async (updates) => {
    const updated = await AuthAPI.updateMe(updates);
    // Sync AuthContext so header + avatar update everywhere
    updateUser(updated);
  }, [updateUser]);

  // ── Sign out ─────────────────────────────────────────────
  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await logout();
            } finally {
              setSigningOut(false);
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            }
          },
        },
      ]
    );
  }, [logout, navigation]);

  // ── Derived values ────────────────────────────────────────
  const plan     = user?.subscription?.plan || 'free';
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <EditNameModal
        visible={editVisible}
        currentFirst={user?.firstName || ''}
        currentLast={user?.lastName  || ''}
        onSave={handleSaveName}
        onClose={() => setEditVisible(false)}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.gold}
            colors={[C.gold]}
          />
        }
      >

        {/* ── Avatar + name + plan ── */}
        <AvatarSection
          user={user}
          onEditName={() => setEditVisible(true)}
        />

        {/* ── Upgrade card (free users only) ── */}
        <UpgradeCard
          plan={plan}
          onPress={() => navigation.navigate('Subscription')}
        />

        {/* ── Skin profile (live data) ── */}
        <SkinProfileCard
          user={user}
          stats={stats}
          statsLoading={statsLoading}
          onScan={() => navigation.navigate('ScanCamera')}
        />

        {/* ── Account ── */}
        <SectionLabel text="Account" delay={320} />
        <MenuItem
          icon="💎"
          label="Subscription Plan"
          sublabel={plan === 'free' ? 'Free — upgrade for more' : `${capitalize(plan)} Plan active`}
          badge={plan.toUpperCase()}
          badgeColor={C.gold}
          onPress={() => navigation.navigate('Subscription')}
          delay={360}
        />
        <MenuItem
          icon="◉"
          label="Edit Profile"
          sublabel="Name, phone, preferences"
          onPress={() => setEditVisible(true)}
          delay={410}
        />
        <MenuItem
          icon="🔒"
          label="Security"
          sublabel="Password & account security"
          onPress={() => navigation.navigate('Settings')}
          delay={460}
        />

        {/* ── Preferences ── */}
        <SectionLabel text="Preferences" delay={510} />
        <MenuItem
          icon="🔔"
          label="Notifications"
          sublabel="Routine reminders, scan alerts"
          onPress={() => navigation.navigate('Notifications')}
          delay={550}
        />
        <MenuItem
          icon="◈"
          label="Skin Concerns"
          sublabel={
            user?.skinProfile?.primaryConcerns?.length
              ? user.skinProfile.primaryConcerns.slice(0, 2).map(c => capitalize(c)).join(', ')
              : 'Update what you want to target'
          }
          onPress={() => navigation.navigate('ProfileSetup')}
          delay={600}
        />
        <MenuItem
          icon="🌍"
          label="Region & Currency"
          sublabel="Nigeria (₦ NGN)"
          onPress={() => {}}
          delay={650}
        />

        {/* ── Support ── */}
        <SectionLabel text="Support" delay={700} />
        <MenuItem
          icon="◎"
          label="Help & FAQ"
          sublabel="How to use Melanin Scan"
          onPress={() => navigation.navigate('Help')}
          delay={740}
        />
        <MenuItem
          icon="✦"
          label="Privacy & Data"
          sublabel="How we handle your information"
          onPress={() => navigation.navigate('Privacy')}
          delay={790}
        />
        <MenuItem
          icon="⚙"
          label="Settings"
          sublabel="App preferences"
          onPress={() => navigation.navigate('Settings')}
          delay={840}
        />

        {/* ── Account actions ── */}
        <SectionLabel text="Account Actions" delay={890} />
        <MenuItem
          icon="↩"
          label={signingOut ? 'Signing out…' : 'Sign Out'}
          dangerous
          onPress={handleSignOut}
          delay={930}
        />
        <FadeSlide delay={970} style={{ marginBottom: 8 }}>
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => navigation.navigate('DeleteAccount')}
            activeOpacity={0.85}
          >
            <Text style={s.deleteText}>Delete My Account</Text>
          </TouchableOpacity>
        </FadeSlide>

        {/* ── App version ── */}
        <FadeSlide delay={1020} style={s.version}>
          <Text style={s.versionText}>Melanin Scan v1.0.0</Text>
          <Text style={s.versionSub}>Built for melanin-rich skin, by design.</Text>
        </FadeSlide>

        <View style={{ height: 100 }} />
      </ScrollView>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll:     { paddingTop: 60, paddingHorizontal: 22 },
  deleteBtn:  { borderWidth: 1, borderColor: 'rgba(224,92,58,0.30)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: 'rgba(224,92,58,0.06)' },
  deleteText: { color: C.error, fontSize: 14, fontWeight: '700' },
  version:    { alignItems: 'center', paddingVertical: 20 },
  versionText:{ color: 'rgba(200,134,10,0.35)', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  versionSub: { color: 'rgba(245,222,179,0.18)', fontSize: 11, letterSpacing: 0.5 },
});