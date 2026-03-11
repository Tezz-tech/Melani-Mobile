// src/screens/main/RoutineScreen.js
//
//  FULLY API-CONNECTED:
//  ─────────────────────────────────────────────────────────────
//  • RoutineAPI.getMyRoutine()            → routine.morning[], routine.night[]
//  • RoutineAPI.completeStep(id, tod, n)  → toggles step on backend, updates streak
//  • useFocusEffect refetches on tab focus (keeps streak + completed state fresh)
//  • Pull-to-refresh
//  • 404 from backend = no routine yet → EmptyRoutine with generate flow
//  • RoutineAPI.generate(skinData)        → POST /routine/generate (AI-generated)
//  • All mock data removed
//
//  BACKEND FIELD MAPPING:
//  routine._id              → used in completeStep(routineId, ...)
//  routine.morning[]        → AM steps (timeOfDay: 'morning' | 'both')
//  routine.night[]          → PM steps (timeOfDay: 'night' | 'both')
//  step.order               → step number (used as key + passed to completeStep)
//  step.step                → action label ("Cleanse", "Serum"…)
//  step.productType         → product description
//  step.keyIngredient       → hero ingredient
//  step.notes               → usage note
//  step.completed           → boolean (persisted on backend)
//  routine.streakDays       → current streak
//  routine.skinType         → used for generate UI
//
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  StatusBar, ScrollView, RefreshControl, Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { RoutineAPI, ScanAPI } from '../../services/api';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg:          '#0F0500',
  bgCard:      '#1A0A02',
  bgCard2:     '#1E0D03',
  border:      'rgba(200,134,10,0.22)',
  gold:        '#C8860A',
  goldPale:    'rgba(200,134,10,0.14)',
  cream:       '#F5DEB3',
  creamDim:    'rgba(245,222,179,0.55)',
  creamFaint:  'rgba(245,222,179,0.18)',
  success:     '#5DBE8A',
  successPale: 'rgba(93,190,138,0.12)',
  error:       '#E05C3A',
  amColor:     '#E8A020',
  pmColor:     '#7B6DC8',
  amPale:      'rgba(232,160,32,0.12)',
  pmPale:      'rgba(123,109,200,0.12)',
};

// Step icon map — maps step action names to icons
const STEP_ICONS = {
  cleanse:        '💧',
  'double cleanse':'💧',
  tone:           '◎',
  toner:          '◎',
  serum:          '✦',
  treatment:      '✦',
  moisturise:     '🌿',
  moisturizer:    '🌿',
  moisturiser:    '🌿',
  spf:            '☀',
  sunscreen:      '☀',
  exfoliate:      '◈',
  exfoliator:     '◈',
  'eye cream':    '◎',
  eye:            '◎',
  oil:            '🌿',
  mask:           '🧴',
};

function getStepIcon(stepName) {
  if (!stepName) return '◉';
  const key = stepName.toLowerCase();
  for (const [k, v] of Object.entries(STEP_ICONS)) {
    if (key.includes(k)) return v;
  }
  return '◉';
}

// ─────────────────────────────────────────────────────────────
//  Background
// ─────────────────────────────────────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[bg.b, { width: 460, height: 460, borderRadius: 230, backgroundColor: '#6B3000', opacity: 0.09, top: -140, left: -120 }]} />
      <View style={[bg.b, { width: 300, height: 300, borderRadius: 150, backgroundColor: C.gold, opacity: 0.05, bottom: -80, right: -80 }]} />
      <View style={[bg.stripe, { top: H * 0.07 }]} />
      {[{ top: H * 0.10, left: W * 0.06, o: 0.24 }, { top: H * 0.82, left: W * 0.88, o: 0.16 }].map((d, i) => (
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
//  AM / PM tab switcher
// ─────────────────────────────────────────────────────────────
function TabSwitcher({ active, onChange }) {
  const slideX = useRef(new Animated.Value(active === 'AM' ? 0 : 1)).current;
  useEffect(() => {
    Animated.spring(slideX, { toValue: active === 'AM' ? 0 : 1, friction: 7, tension: 50, useNativeDriver: true }).start();
  }, [active]);
  const translateX = slideX.interpolate({ inputRange: [0, 1], outputRange: [0, (W - 48) / 2] });
  return (
    <View style={ts.wrap}>
      <Animated.View style={[ts.slider, { transform: [{ translateX }] }]} />
      {['AM', 'PM'].map(tab => (
        <TouchableOpacity key={tab} style={ts.tab} onPress={() => onChange(tab)} activeOpacity={0.8}>
          <Text style={[ts.label, active === tab && ts.labelActive]}>
            {tab === 'AM' ? '☀  Morning' : '🌙  Night'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const ts = StyleSheet.create({
  wrap:       { flexDirection: 'row', backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 4, marginBottom: 24, position: 'relative' },
  slider:     { position: 'absolute', top: 4, left: 4, width: (W - 48) / 2 - 4, height: 40, backgroundColor: 'rgba(200,134,10,0.18)', borderRadius: 10, borderWidth: 1.5, borderColor: C.gold },
  tab:        { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  label:      { color: C.creamDim, fontSize: 14, fontWeight: '600' },
  labelActive:{ color: C.gold, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────
//  Progress bar
// ─────────────────────────────────────────────────────────────
function RoutineProgress({ done, total, isAM }) {
  const pct   = total > 0 ? done / total : 0;
  const anim  = useRef(new Animated.Value(0)).current;
  const color = isAM ? C.amColor : C.pmColor;
  useEffect(() => {
    Animated.spring(anim, { toValue: pct, friction: 7, tension: 40, useNativeDriver: false }).start();
  }, [pct]);
  const barW = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <FadeSlide delay={100} style={rp.wrap}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={rp.label}>{done} of {total} steps done</Text>
        <Text style={[rp.pct, { color }]}>{Math.round(pct * 100)}%</Text>
      </View>
      <View style={rp.track}>
        <Animated.View style={[rp.fill, { width: barW, backgroundColor: color }]} />
      </View>
    </FadeSlide>
  );
}
const rp = StyleSheet.create({
  wrap:  { marginBottom: 20 },
  label: { color: C.creamDim, fontSize: 12, fontWeight: '600' },
  pct:   { fontSize: 13, fontWeight: '800' },
  track: { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 2 },
});

// ─────────────────────────────────────────────────────────────
//  Streak badge
// ─────────────────────────────────────────────────────────────
function StreakBadge({ days }) {
  if (!days || days < 1) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(232,160,32,0.12)', borderWidth: 1, borderColor: 'rgba(232,160,32,0.30)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text style={{ fontSize: 14 }}>🔥</Text>
      <Text style={{ color: C.amColor, fontSize: 12, fontWeight: '800' }}>{days}-day streak</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  Step card — real data from routine.morning[] / routine.night[]
// ─────────────────────────────────────────────────────────────
function StepCard({ item, isAM, index, completed, onToggle, saving }) {
  const [expanded,  setExpanded]  = useState(false);
  const expandAnim  = useRef(new Animated.Value(0)).current;
  const checkScale  = useRef(new Animated.Value(completed ? 1 : 0)).current;
  const cardScale   = useRef(new Animated.Value(1)).current;

  // Sync checkmark when completed changes from outside (e.g. reset)
  useEffect(() => {
    Animated.spring(checkScale, { toValue: completed ? 1 : 0, friction: 5, useNativeDriver: true }).start();
  }, [completed]);

  const toggleExpand = () => {
    setExpanded(e => {
      Animated.timing(expandAnim, { toValue: e ? 0 : 1, duration: 240, useNativeDriver: false }).start();
      return !e;
    });
  };

  const handleCheck = () => {
    if (saving) return;
    onToggle();
    if (!completed) {
      Animated.sequence([
        Animated.spring(checkScale, { toValue: 1.25, friction: 4, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1,    friction: 4, useNativeDriver: true }),
      ]).start();
    }
  };

  const extraH  = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 96] });
  const extraOp = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1]  });
  const accentColor = isAM ? C.amColor : C.pmColor;
  const accentPale  = isAM ? C.amPale  : C.pmPale;
  const icon        = getStepIcon(item.step);

  // Build why text from notes field
  const whyText      = item.notes || `Apply ${item.productType} focusing on cleansed skin.`;
  const ingredientList = item.keyIngredient
    ? item.keyIngredient.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <FadeSlide delay={index * 65} style={{ marginBottom: 10 }}>
      <TouchableOpacity
        onPressIn={()  => Animated.spring(cardScale, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(cardScale, { toValue: 1,    useNativeDriver: true }).start()}
        onPress={toggleExpand}
        activeOpacity={1}
      >
        <Animated.View style={[sc.root, completed && sc.rootDone, { transform: [{ scale: cardScale }] }]}>

          {/* Step number badge */}
          <View style={[sc.stepBadge, { backgroundColor: accentPale, borderColor: accentColor }]}>
            <Text style={[sc.stepNum, { color: accentColor }]}>{item.order}</Text>
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <View style={sc.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={sc.action}>{(item.step || '').toUpperCase()}</Text>
                <Text style={[sc.product, completed && sc.productDone]} numberOfLines={expanded ? 0 : 2}>
                  {item.productType || '—'}
                </Text>
              </View>
              <Text style={sc.icon}>{icon}</Text>
            </View>

            {/* Key ingredient badge */}
            {item.keyIngredient && (
              <View style={{ flexDirection: 'row', marginTop: 6, gap: 6, flexWrap: 'wrap' }}>
                {ingredientList.map((ing, i) => (
                  <View key={i} style={sc.ingPill}>
                    <Text style={sc.ingText}>{ing}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Expandable notes */}
            <Animated.View style={{ height: extraH, overflow: 'hidden' }}>
              <Animated.View style={{ opacity: extraOp, paddingTop: 10 }}>
                <Text style={sc.why}>{whyText}</Text>
              </Animated.View>
            </Animated.View>
          </View>

          {/* Check button */}
          <TouchableOpacity onPress={handleCheck} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={[sc.checkBox, completed && sc.checkBoxDone]}>
              {saving
                ? <ActivityIndicator size="small" color={C.success} />
                : <Animated.Text style={[sc.checkMark, { transform: [{ scale: checkScale }] }]}>✓</Animated.Text>
              }
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </FadeSlide>
  );
}
const sc = StyleSheet.create({
  root:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
  rootDone:    { borderColor: 'rgba(93,190,138,0.30)', backgroundColor: 'rgba(93,190,138,0.04)' },
  stepBadge:   { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNum:     { fontSize: 12, fontWeight: '900' },
  topRow:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  action:      { color: C.creamDim, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 3 },
  product:     { color: C.cream, fontSize: 14, fontWeight: '700', flex: 1, paddingRight: 4 },
  productDone: { textDecorationLine: 'line-through', color: C.creamDim },
  icon:        { fontSize: 18, marginLeft: 8 },
  ingPill:     { backgroundColor: C.goldPale, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  ingText:     { color: C.creamDim, fontSize: 10, fontWeight: '600' },
  why:         { color: C.creamDim, fontSize: 12, lineHeight: 18 },
  checkBox:    { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  checkBoxDone:{ backgroundColor: 'rgba(93,190,138,0.18)', borderColor: C.success },
  checkMark:   { color: C.success, fontSize: 14, fontWeight: '900' },
});

// ─────────────────────────────────────────────────────────────
//  Weekly schedule card
// ─────────────────────────────────────────────────────────────
function WeeklySchedule({ schedule }) {
  if (!schedule?.length) return null;
  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  return (
    <FadeSlide delay={600} style={ws.wrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: C.gold }} />
        <Text style={ws.title}>Weekly Schedule</Text>
      </View>
      <View style={ws.days}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
          const entry   = schedule.find(s => s.day === day);
          const isToday = day === today;
          const hasTasks = entry?.tasks?.length > 0;
          return (
            <View key={day} style={[ws.dayBox, isToday && ws.dayBoxToday, hasTasks && ws.dayBoxActive]}>
              <Text style={[ws.dayLabel, isToday && ws.dayLabelToday]}>{day}</Text>
              {hasTasks && <View style={ws.taskDot} />}
            </View>
          );
        })}
      </View>
      {/* Today's extra tasks */}
      {schedule.filter(s => s.day === today && s.tasks?.length > 0).map((entry, i) => (
        <View key={i} style={{ marginTop: 10 }}>
          <Text style={{ color: C.creamDim, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 }}>TODAY'S EXTRAS</Text>
          {entry.tasks.map((task, ti) => (
            <View key={ti} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <Text style={{ color: C.gold, fontSize: 11 }}>◉</Text>
              <Text style={{ color: C.creamDim, fontSize: 12, flex: 1 }}>{task}</Text>
            </View>
          ))}
        </View>
      ))}
    </FadeSlide>
  );
}
const ws = StyleSheet.create({
  wrap:          { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 20 },
  title:         { color: C.cream, fontSize: 14, fontWeight: '700' },
  days:          { flexDirection: 'row', gap: 6 },
  dayBox:        { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard2, gap: 4 },
  dayBoxToday:   { borderColor: C.gold, backgroundColor: C.goldPale },
  dayBoxActive:  { borderColor: 'rgba(93,190,138,0.35)' },
  dayLabel:      { color: C.creamDim, fontSize: 10, fontWeight: '700' },
  dayLabelToday: { color: C.gold },
  taskDot:       { width: 4, height: 4, borderRadius: 2, backgroundColor: C.success },
});

// ─────────────────────────────────────────────────────────────
//  Empty / no routine state
// ─────────────────────────────────────────────────────────────
function EmptyRoutine({ onScan, onGenerate, generating, latestScan }) {
  const pulse = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.9,  duration: 1800, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={{ alignItems: 'center', paddingTop: 30, paddingBottom: 40 }}>
      <Animated.View style={[emp.iconWrap, { transform: [{ scale: pulse }] }]}>
        <Text style={{ color: C.gold, fontSize: 30 }}>✦</Text>
      </Animated.View>
      <Text style={emp.title}>No routine yet</Text>
      <Text style={emp.body}>
        {latestScan
          ? 'Your last scan is ready. Tap below to generate your personalised AM + PM routine.'
          : 'Complete your first skin scan and we\'ll generate a personalised AM + PM routine built for your melanin skin.'}
      </Text>

      {latestScan ? (
        <TouchableOpacity
          style={[emp.cta, generating && { opacity: 0.6 }]}
          onPress={onGenerate}
          disabled={generating}
          activeOpacity={0.85}
        >
          {generating
            ? <ActivityIndicator size="small" color={C.gold} />
            : <Text style={emp.ctaText}>Generate My Routine ✦</Text>
          }
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={emp.cta} onPress={onScan} activeOpacity={0.85}>
          <Text style={emp.ctaText}>Scan to Get Routine →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const emp = StyleSheet.create({
  iconWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: C.goldPale, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: C.gold, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 0 }, shadowRadius: 12, elevation: 6 },
  title:    { color: C.cream, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  body:     { color: C.creamDim, fontSize: 14, lineHeight: 22, textAlign: 'center', paddingHorizontal: 24, marginBottom: 24 },
  cta:      { backgroundColor: C.goldPale, borderWidth: 1.5, borderColor: C.gold, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13, minWidth: 200, alignItems: 'center' },
  ctaText:  { color: C.gold, fontSize: 14, fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────
export default function RoutineScreen() {
  const navigation = useNavigation();
  const { user }   = useAuth();

  const [routine,    setRoutine]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab,  setActiveTab]  = useState('AM');
  const [savingStep, setSavingStep] = useState(null);    // step order being saved
  const [generating, setGenerating] = useState(false);
  const [latestScan, setLatestScan] = useState(null);
  const [genError,   setGenError]   = useState(null);

  // ── Fetch routine ──────────────────────────────────────────
  const fetchRoutine = useCallback(async () => {
    try {
      const r = await RoutineAPI.getMyRoutine();
      // r is the routine object directly: { _id, morning:[], night:[], streakDays, ... }
      if (r && (r.morning || r.night)) {
        setRoutine(r);
      } else {
        // Unexpected shape — treat as no routine
        setRoutine(null);
      }
    } catch {
      // 404 = no routine yet; any other error = show empty state + generate option
      setRoutine(null);
      try {
        const hist = await ScanAPI.getHistory(1, 1);
        if (hist?.data?.length > 0) setLatestScan(hist.data[0]);
      } catch { /* no scans yet */ }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchRoutine();
    }, [fetchRoutine])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRoutine();
    setRefreshing(false);
  }, [fetchRoutine]);

  // ── Toggle a step (calls backend, updates locally) ────────
  const toggleStep = useCallback(async (order) => {
    if (!routine?._id) return;
    const timeOfDay = activeTab === 'AM' ? 'morning' : 'night';

    // Optimistic update
    setRoutine(prev => {
      if (!prev) return prev;
      const updated = prev[timeOfDay].map(s =>
        s.order === order ? { ...s, completed: !s.completed } : s
      );
      return { ...prev, [timeOfDay]: updated };
    });

    setSavingStep(order);
    try {
      const updated = await RoutineAPI.completeStep(routine._id, timeOfDay, order);
      setRoutine(updated);   // sync with server state (includes updated streakDays)
    } catch {
      // Revert on failure
      setRoutine(prev => {
        if (!prev) return prev;
        const reverted = prev[timeOfDay].map(s =>
          s.order === order ? { ...s, completed: !s.completed } : s
        );
        return { ...prev, [timeOfDay]: reverted };
      });
    } finally {
      setSavingStep(null);
    }
  }, [routine, activeTab]);

  // ── Generate routine from latest scan ─────────────────────
  const generateRoutine = useCallback(async () => {
    if (!latestScan) return;
    setGenerating(true);
    setGenError(null);
    try {
      const generated = await RoutineAPI.generate({
        skinType:    latestScan.skinType,
        conditions:  (latestScan.conditions ?? []).map(c => c.name),
        concerns:    latestScan.melaninInsights ? [
          latestScan.melaninInsights.pihRisk === 'high' ? 'hyperpigmentation' : null,
        ].filter(Boolean) : [],
        fitzpatrick: latestScan.fitzpatrickEst,
      });
      setRoutine(generated);
    } catch (err) {
      setGenError(err?.message || 'Failed to generate routine. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [latestScan]);

  // ── Reset all steps for current tab ───────────────────────
  // (local only — no API for bulk reset, each step persists individually)
  const resetSteps = useCallback(() => {
    if (!routine?._id) return;
    const timeOfDay = activeTab === 'AM' ? 'morning' : 'night';
    setRoutine(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [timeOfDay]: prev[timeOfDay].map(s => ({ ...s, completed: false })),
      };
    });
  }, [routine, activeTab]);

  // ── Derived values ─────────────────────────────
  // routine.morning[] and routine.night[] ARE the tabs — the backend puts AM steps
  // in morning[] and PM steps in night[] already. No timeOfDay sub-filter needed.
  const activeSteps = routine
    ? (activeTab === 'AM' ? routine.morning ?? [] : routine.night ?? [])
    : [];


  const doneCount = activeSteps.filter(s => s.completed).length;
  const allDone   = activeSteps.length > 0 && doneCount === activeSteps.length;

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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

        {/* ── Header ── */}
        <FadeSlide delay={0} style={s.header}>
          <View>
            <Text style={s.title}>My Routine</Text>
            <Text style={s.subtitle}>Your personalised skincare schedule</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {routine && <StreakBadge days={routine.streakDays} />}
            {routine && doneCount > 0 && (
              <TouchableOpacity style={s.resetBtn} onPress={resetSteps}>
                <Text style={s.resetText}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>
        </FadeSlide>

        {/* ── Initial loader ── */}
        {loading && (
          <View style={{ paddingVertical: 80, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={C.gold} />
            <Text style={{ color: C.creamDim, fontSize: 13, marginTop: 14 }}>Loading your routine…</Text>
          </View>
        )}

        {/* ── No routine yet ── */}
        {!loading && !routine && (
          <>
            {genError && (
              <View style={{ backgroundColor: 'rgba(224,92,58,0.12)', borderWidth: 1, borderColor: 'rgba(224,92,58,0.35)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <Text style={{ color: C.error, fontSize: 13, textAlign: 'center' }}>⚠  {genError}</Text>
              </View>
            )}
            <EmptyRoutine
              onScan={() => navigation.navigate('ScanCamera')}
              onGenerate={generateRoutine}
              generating={generating}
              latestScan={latestScan}
            />
          </>
        )}

        {/* ── Has routine ── */}
        {!loading && routine && (
          <>
            {/* AM/PM switcher */}
            <FadeSlide delay={80}>
              <TabSwitcher
                active={activeTab}
                onChange={(t) => setActiveTab(t)}
              />
            </FadeSlide>

            {/* Progress */}
            <RoutineProgress done={doneCount} total={activeSteps.length} isAM={activeTab === 'AM'} />

            {/* Time banner */}
            <FadeSlide delay={180} style={s.timeBanner}>
              <Text style={s.timeBannerIcon}>{activeTab === 'AM' ? '☀' : '🌙'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.timeBannerTitle}>
                  {activeTab === 'AM' ? 'Morning Routine' : 'Night Routine'}
                </Text>
                <Text style={s.timeBannerSub}>
                  {activeTab === 'AM' ? 'Best done within 30 min of waking' : 'Do this 30 min before bed'}
                </Text>
              </View>
              <Text style={{ color: C.creamFaint, fontSize: 11 }}>{activeSteps.length} steps</Text>
            </FadeSlide>

            {/* Tap hint */}
            <FadeSlide delay={240} style={{ marginBottom: 14 }}>
              <Text style={{ color: C.creamFaint, fontSize: 11, letterSpacing: 0.3 }}>
                Tap a step to see why it works. Check off as you go.
              </Text>
            </FadeSlide>

            {/* Steps */}
            {activeSteps.length === 0 ? (
              <FadeSlide delay={300} style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Text style={{ color: C.creamDim, fontSize: 14, textAlign: 'center' }}>
                  No {activeTab === 'AM' ? 'morning' : 'night'} steps in your routine.{'\n'}Pull to refresh or regenerate your routine.
                </Text>
              </FadeSlide>
            ) : (
              activeSteps.map((item, i) => (
                <StepCard
                  key={`${activeTab}-${item.order ?? i}`}
                  item={item}
                  isAM={activeTab === 'AM'}
                  index={i}
                  completed={!!item.completed}
                  onToggle={() => toggleStep(item.order)}
                  saving={savingStep === item.order}
                />
              ))
            )}

            {/* Completion celebration */}
            {allDone && (
              <FadeSlide delay={0} style={s.doneCard}>
                <Text style={s.doneIcon}>✦</Text>
                <Text style={s.doneTitle}>Routine Complete!</Text>
                <Text style={s.doneSub}>
                  Amazing consistency. Come back {activeTab === 'AM' ? 'tonight' : 'tomorrow morning'} for your next routine.
                </Text>
                {routine.streakDays > 0 && (
                  <Text style={{ color: C.amColor, fontSize: 13, fontWeight: '800', marginTop: 8 }}>
                    🔥 {routine.streakDays}-day streak
                  </Text>
                )}
              </FadeSlide>
            )}

            {/* Weekly schedule */}
            {routine.weeklySchedule?.length > 0 && (
              <WeeklySchedule schedule={routine.weeklySchedule} />
            )}

            {/* Regenerate option */}
            <FadeSlide delay={700} style={{ marginBottom: 10 }}>
              <TouchableOpacity
                style={s.regenBtn}
                onPress={generateRoutine}
                disabled={generating || !latestScan}
                activeOpacity={0.8}
              >
                {generating
                  ? <ActivityIndicator size="small" color={C.creamDim} />
                  : <Text style={s.regenText}>↺  Regenerate from latest scan</Text>
                }
              </TouchableOpacity>
            </FadeSlide>
          </>
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
  resetBtn:     { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  resetText:    { color: C.creamDim, fontSize: 12, fontWeight: '600' },

  timeBanner:    { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 16 },
  timeBannerIcon:{ fontSize: 24 },
  timeBannerTitle:{ color: C.cream, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  timeBannerSub: { color: C.creamDim, fontSize: 12 },

  doneCard:  { backgroundColor: 'rgba(93,190,138,0.08)', borderWidth: 1, borderColor: 'rgba(93,190,138,0.30)', borderRadius: 14, padding: 20, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  doneIcon:  { color: C.success, fontSize: 28, marginBottom: 10 },
  doneTitle: { color: C.success, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  doneSub:   { color: C.creamDim, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  regenBtn:  { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  regenText: { color: C.creamDim, fontSize: 12, fontWeight: '600' },
});