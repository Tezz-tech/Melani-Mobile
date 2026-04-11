// src/screens/main/RoutineScreen.js
//
//  FIXES vs previous version:
//  ─────────────────────────────────────────────────────────────
//  FIX 1 — Header layout: streak badge and reset btn were pushing the
//           header off-screen on narrow devices. Now uses a two-row
//           layout: title row on top, streak + reset on row below.
//
//  FIX 2 — Auto-reset: when all steps in a tab are completed, a
//           2-second celebration is shown then all steps reset
//           automatically. The manual Reset button is removed.
//
//  FIX 3 — Products under each step: each StepCard now shows the
//           products[] from the routine step (if present) as a
//           scrollable list of product cards in the expanded section.
//
//  FIX 4 — Auto-regenerate on new scan: on focus, the latest scan ID
//           is compared to the scan ID that generated the current
//           routine. If they differ, the routine is silently
//           regenerated so it always reflects the most recent analysis.
//
//  FIX 5 — Daily completion reset:
//           Completion state is stamped with a date string (YYYY-MM-DD)
//           in AsyncStorage when a routine tab is finished. On every
//           app focus / fetch, if the stored completion date is NOT
//           today, all `completed` flags are wiped locally before
//           rendering — so yesterday's ticks never bleed into today.
//
//  FIX 6 — [NEW] Time-aware tab defaulting:
//           On mount and on focus, the active tab (AM/PM) is
//           automatically selected based on the phone's local time:
//             • 05:00–11:59 → AM (Morning)
//             • 12:00–04:59 → PM (Night)
//           If the routine for the time-appropriate tab has already
//           been completed today (cooldown active), we flip to the
//           other tab so the user always sees something actionable.
//
//  FIX 7 — [NEW] Steps stay checked through cooldown:
//           Previously, steps were immediately cleared as soon as the
//           celebration animation finished, making it look like nothing
//           happened. Now the `completed` flags remain visible during
//           the 6-hour cooldown window. Steps are only reset locally
//           when the cooldown expires naturally OR when the user taps
//           "Skip" — giving clear visual feedback that the routine was
//           actually completed.
//
import React, { useRef, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../store/AuthContext";
import { RoutineAPI, ScanAPI } from "../../services/api";

const { width: W, height: H } = Dimensions.get("window");

const C = {
  bg: "#0F0500",
  bgCard: "#1A0A02",
  bgCard2: "#1E0D03",
  border: "rgba(200,134,10,0.22)",
  gold: "#C8860A",
  goldPale: "rgba(200,134,10,0.14)",
  cream: "#F5DEB3",
  creamDim: "rgba(245,222,179,0.55)",
  creamFaint: "rgba(245,222,179,0.18)",
  success: "#5DBE8A",
  successPale: "rgba(93,190,138,0.12)",
  error: "#E05C3A",
  amColor: "#E8A020",
  pmColor: "#7B6DC8",
  amPale: "rgba(232,160,32,0.12)",
  pmPale: "rgba(123,109,200,0.12)",
};

const STEP_ICONS = {
  cleanse: "💧",
  "double cleanse": "💧",
  tone: "◎",
  toner: "◎",
  serum: "✦",
  treatment: "✦",
  moisturise: "🌿",
  moisturizer: "🌿",
  moisturiser: "🌿",
  spf: "☀",
  sunscreen: "☀",
  exfoliate: "◈",
  exfoliator: "◈",
  "eye cream": "◎",
  eye: "◎",
  oil: "🌿",
  mask: "🧴",
};

function getStepIcon(stepName) {
  if (!stepName) return "◉";
  const key = stepName.toLowerCase();
  for (const [k, v] of Object.entries(STEP_ICONS)) {
    if (key.includes(k)) return v;
  }
  return "◉";
}

// ── Storage keys ─────────────────────────────────────────────
const COOLDOWN_KEY       = (userId, tab) => `routine_done_${userId}_${tab}`;
const COMPLETION_DATE_KEY = (userId, tab) => `routine_done_date_${userId}_${tab}`;

const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

// ── FIX 6: Derive the "right" tab from the phone's local time ─
// Morning window: 05:00 → 11:59
// Night  window: 12:00 → 04:59 (next day)
function getTimeBasedTab() {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 12 ? "AM" : "PM";
}

// ── Helper: returns today as "YYYY-MM-DD" in local time ──────
function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ── Helper: human-readable greeting based on time ────────────
function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return "Good morning ☀";
  if (hour >= 12 && hour < 17) return "Good afternoon 🌤";
  if (hour >= 17 && hour < 21) return "Good evening 🌆";
  return "Good night 🌙";
}

function formatCountdown(ms) {
  if (ms <= 0) return "0h 0m";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

// ── Apply daily reset to a routine object ────────────────────
function applyDailyReset(routine, completionDates) {
  if (!routine) return routine;
  const today = todayString();
  let result = { ...routine };

  const tabMap = { AM: "morning", PM: "night" };
  for (const [tab, timeOfDay] of Object.entries(tabMap)) {
    const lastDoneDate = completionDates[tab];
    const isFromToday  = lastDoneDate === today;

    if (!isFromToday && Array.isArray(result[timeOfDay])) {
      result = {
        ...result,
        [timeOfDay]: result[timeOfDay].map((s) => ({ ...s, completed: false })),
      };
    }
  }
  return result;
}

// ── Build "why this step matters" explanation ─────────────────
function buildWhyThisStep(stepName) {
  const key = (stepName || '').toLowerCase().trim();

  const reasons = {
    cleanse:          'Cleansing removes dirt, sweat, excess oil and pollutants that settle on your skin throughout the day. Skipping this step means everything else sits on top of debris and barely absorbs.',
    'double cleanse': 'The first cleanse dissolves sunscreen and makeup; the second cleanse actually cleans your pores. One cleanse alone cannot do both jobs — this is especially important for melanin skin prone to clogged pores and dark spots.',
    tone:             'Toners restore your skin\'s pH after cleansing and prep the skin to absorb serums more efficiently. For melanin skin, balancing pH also reduces the risk of post-inflammatory hyperpigmentation.',
    toner:            'Toners restore your skin\'s pH after cleansing and prep the skin to absorb serums more efficiently. For melanin skin, balancing pH also reduces the risk of post-inflammatory hyperpigmentation.',
    essence:          'Essences deliver a concentrated dose of hydration and actives right after toning, while your skin is still damp. They significantly boost the effectiveness of every product layered on top.',
    serum:            'Serums carry the highest concentration of active ingredients — niacinamide, vitamin C, retinol — that target your specific concerns. This is where most of the real skin transformation happens.',
    treatment:        'Treatments address your primary concern directly — whether that\'s dark spots, acne, or uneven texture. Consistent use builds up results over weeks, so daily application is key.',
    'eye cream':      'The skin around the eye is 5× thinner than the rest of your face and has fewer oil glands. It needs its own dedicated hydration and treatment to prevent dark circles, puffiness, and fine lines.',
    moisturise:       'Moisturiser seals in all the active products underneath and strengthens your skin barrier. A healthy barrier keeps irritants out and moisture in — crucial for preventing the ashy, dull look that affects melanin skin.',
    moisturizer:      'Moisturiser seals in all the active products underneath and strengthens your skin barrier. A healthy barrier keeps irritants out and moisture in — crucial for preventing the ashy, dull look that affects melanin skin.',
    moisturiser:      'Moisturiser seals in all the active products underneath and strengthens your skin barrier. A healthy barrier keeps irritants out and moisture in — crucial for preventing the ashy, dull look that affects melanin skin.',
    spf:              'UV radiation triggers melanin overproduction, which is the root cause of hyperpigmentation on dark skin. SPF 30–50 every single morning — rain or shine — is the single most impactful thing you can do for your skin.',
    sunscreen:        'UV radiation triggers melanin overproduction, which is the root cause of hyperpigmentation on dark skin. SPF 30–50 every single morning — rain or shine — is the single most impactful thing you can do for your skin.',
    exfoliate:        'Exfoliation removes the build-up of dead skin cells that make melanin skin look dull and grey. It also allows serums and moisturisers to penetrate deeper. Limit to 2–3× per week to avoid triggering irritation or dark spots.',
    oil:              'Facial oils mimic your skin\'s natural sebum and lock in moisture at the final layer. For melanin skin, oils rich in linoleic acid (rosehip, marula) specifically help fade dark spots and strengthen the barrier.',
    mask:             'Masks deliver an intensive treatment in a concentrated session. Weekly masking targets specific concerns — hydration, detox, brightening — beyond what your daily routine can achieve alone.',
  };

  for (const [k, reason] of Object.entries(reasons)) {
    if (key.includes(k) || k.includes(key)) return reason;
  }

  return 'This step supports your overall skin health by maintaining the balance and function of your skin barrier. Consistency is key — results build up over weeks of daily use.';
}

// ── Build how-to-use instructions ────────────────────────────
function buildHowToUse(item) {
  const key = (item.step || "").toLowerCase();
  const product = item.productType || "product";

  const instructions = {
    cleanse: [
      `Wet your face with lukewarm water.`,
      `Dispense a pea-sized amount of ${product} onto your fingertips.`,
      `Gently massage in circular motions for 30–60 seconds, avoiding the eye area.`,
      `Rinse thoroughly with cool water and pat dry with a clean towel.`,
    ],
    "double cleanse": [
      `Start with an oil cleanser — massage over dry skin to dissolve sunscreen and makeup.`,
      `Emulsify with a little water, then rinse off.`,
      `Follow with ${product} as your water-based second cleanse.`,
      `Rinse with cool water and pat dry — skin should feel clean, not tight.`,
    ],
    tone: [
      `After cleansing, pour a small amount of ${product} onto a cotton pad or your palm.`,
      `Apply gently across your face by pressing or sweeping — avoid rubbing.`,
      `Focus on areas prone to congestion (nose, forehead) and let absorb for 30 seconds.`,
      `Proceed immediately to the next step while skin is still slightly damp.`,
    ],
    toner: [
      `After cleansing, pour a small amount of ${product} onto a cotton pad or your palm.`,
      `Apply gently across your face by pressing or sweeping — avoid rubbing.`,
      `Focus on areas prone to congestion (nose, forehead) and let absorb for 30 seconds.`,
      `Proceed immediately to the next step while skin is still slightly damp.`,
    ],
    serum: [
      `Apply 2–3 drops of ${product} to clean, toned skin.`,
      `Warm between your fingertips and press gently against cheeks, forehead, and chin.`,
      `Use patting motions — not rubbing — to help absorption.`,
      `Wait 60 seconds before layering the next product.`,
    ],
    treatment: [
      `Apply a thin layer of ${product} to the targeted area.`,
      `Use your ring finger for gentle application to avoid tugging.`,
      `Allow to fully absorb (2 min) before applying moisturiser on top.`,
      `Start 2–3× per week if it's an active treatment and build up gradually.`,
    ],
    spf: [
      `This is the LAST step of your morning routine — always after moisturiser.`,
      `Use a generous amount of ${product} — about half a teaspoon for the face.`,
      `Apply evenly over your entire face and neck. Don't forget ears and the hairline.`,
      `Reapply every 2 hours when outdoors or after sweating.`,
    ],
    sunscreen: [
      `This is the LAST step of your morning routine — always after moisturiser.`,
      `Use a generous amount of ${product} — about half a teaspoon for the face.`,
      `Apply evenly over your entire face and neck. Don't forget ears and the hairline.`,
      `Reapply every 2 hours when outdoors or after sweating.`,
    ],
    moisturise: [
      `Take a 5–10p coin-sized amount of ${product}.`,
      `Warm between palms and press onto face, starting from the centre and blending outward.`,
      `Pay extra attention to dry patches around the nose and cheeks.`,
      `Gently press any excess into your neck and décolletage.`,
    ],
    moisturizer: [
      `Take a 5–10p coin-sized amount of ${product}.`,
      `Warm between palms and press onto face, starting from the centre and blending outward.`,
      `Pay extra attention to dry patches around the nose and cheeks.`,
      `Gently press any excess into your neck and décolletage.`,
    ],
    exfoliate: [
      `Use on freshly cleansed, damp skin.`,
      `Apply ${product} in gentle circular motions for 30 seconds — don't press hard.`,
      `Rinse thoroughly with cool water.`,
      `Always follow with moisturiser. Limit use to 2–3× per week to avoid over-exfoliation.`,
    ],
    "eye cream": [
      `Dispense a rice-grain-sized amount of ${product} (a little goes a long way).`,
      `Use your ring finger — it applies the least pressure.`,
      `Tap gently along the orbital bone, moving from inner to outer corner.`,
      `Never drag or rub the delicate skin — always tap and press.`,
    ],
    oil: [
      `Warm 3–4 drops of ${product} between your palms.`,
      `Press your palms against your cheeks, then glide outward and upward.`,
      `Apply over or under moisturiser depending on the oil's weight.`,
      `Avoid the nose and chin if prone to breakouts.`,
    ],
    mask: [
      `Apply a generous, even layer of ${product} over clean skin, avoiding eyes and lips.`,
      `Leave on for the time specified (usually 10–15 min).`,
      `Rinse off thoroughly with lukewarm water.`,
      `Follow with toner and moisturiser while skin is still slightly damp.`,
    ],
  };

  for (const [k, steps] of Object.entries(instructions)) {
    if (key.includes(k)) return steps;
  }

  return [
    `Apply ${product} to clean, dry skin.`,
    `Use gentle, upward strokes across your face and neck.`,
    `Allow to fully absorb before applying the next product.`,
    item.notes || `This step supports your skin's overall health and balance.`,
  ];
}

function getAmountGuide(stepName) {
  const key = (stepName || "").toLowerCase();
  if (key.includes("cleanse"))    return "Pea-sized amount";
  if (key.includes("serum"))      return "2–3 drops";
  if (key.includes("oil"))        return "3–4 drops";
  if (key.includes("spf") || key.includes("sunscreen")) return "½ teaspoon";
  if (key.includes("eye"))        return "Rice-grain size";
  if (key.includes("mask"))       return "Generous even layer";
  if (key.includes("tone") || key.includes("toner")) return "Soaked cotton pad";
  return "Pea to coin-sized amount";
}

// ─────────────────────────────────────────────────────────────
//  Background
// ─────────────────────────────────────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[bgst.b, { width: 460, height: 460, borderRadius: 230, backgroundColor: "#6B3000", opacity: 0.09, top: -140, left: -120 }]} />
      <View style={[bgst.b, { width: 300, height: 300, borderRadius: 150, backgroundColor: C.gold, opacity: 0.05, bottom: -80, right: -80 }]} />
      <View style={[bgst.stripe, { top: H * 0.07 }]} />
      {[
        { top: H * 0.1, left: W * 0.06, o: 0.24 },
        { top: H * 0.82, left: W * 0.88, o: 0.16 },
      ].map((d, i) => (
        <View key={i} style={[bgst.dot, { top: d.top, left: d.left, opacity: d.o }]} />
      ))}
      {children}
    </View>
  );
}
const bgst = StyleSheet.create({
  b:      { position: "absolute" },
  stripe: { position: "absolute", width: W, height: 1.5, backgroundColor: "rgba(200,134,10,0.12)" },
  dot:    { position: "absolute", width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.gold },
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
//  AM / PM tab switcher
//  FIX 6: shows a "recommended" pill on the time-appropriate tab
// ─────────────────────────────────────────────────────────────
function TabSwitcher({ active, onChange, recommendedTab }) {
  const slideX = useRef(new Animated.Value(active === "AM" ? 0 : 1)).current;
  useEffect(() => {
    Animated.spring(slideX, { toValue: active === "AM" ? 0 : 1, friction: 7, tension: 50, useNativeDriver: true }).start();
  }, [active]);
  const translateX = slideX.interpolate({ inputRange: [0, 1], outputRange: [0, (W - 48) / 2] });
  return (
    <View style={ts.wrap}>
      <Animated.View style={[ts.slider, { transform: [{ translateX }] }]} />
      {["AM", "PM"].map((tab) => {
        const isRecommended = tab === recommendedTab;
        return (
          <TouchableOpacity key={tab} style={ts.tab} onPress={() => onChange(tab)} activeOpacity={0.8}>
            <Text style={[ts.label, active === tab && ts.labelActive]}>
              {tab === "AM" ? "☀  Morning" : "🌙  Night"}
            </Text>
            {isRecommended && (
              <View style={ts.nowPill}>
                <Text style={ts.nowText}>NOW</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const ts = StyleSheet.create({
  wrap:        { flexDirection: "row", backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 4, marginBottom: 24, position: "relative" },
  slider:      { position: "absolute", top: 4, left: 4, width: (W - 48) / 2 - 4, height: 40, backgroundColor: "rgba(200,134,10,0.18)", borderRadius: 10, borderWidth: 1.5, borderColor: C.gold },
  tab:         { flex: 1, height: 40, alignItems: "center", justifyContent: "center", zIndex: 1, flexDirection: "row", gap: 6 },
  label:       { color: C.creamDim, fontSize: 14, fontWeight: "600" },
  labelActive: { color: C.gold, fontWeight: "700" },
  nowPill:     { backgroundColor: "rgba(93,190,138,0.18)", borderWidth: 1, borderColor: "rgba(93,190,138,0.40)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  nowText:     { color: "#5DBE8A", fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
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
  const barW = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return (
    <FadeSlide delay={100} style={rp.wrap}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
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
  label: { color: C.creamDim, fontSize: 12, fontWeight: "600" },
  pct:   { fontSize: 13, fontWeight: "800" },
  track: { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: "hidden" },
  fill:  { height: "100%", borderRadius: 2 },
});

// ─────────────────────────────────────────────────────────────
//  Streak badge
// ─────────────────────────────────────────────────────────────
function StreakBadge({ days }) {
  if (!days || days < 1) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(232,160,32,0.12)", borderWidth: 1, borderColor: "rgba(232,160,32,0.30)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text style={{ fontSize: 14 }}>🔥</Text>
      <Text style={{ color: C.amColor, fontSize: 12, fontWeight: "800" }}>{days}-day streak</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  Product card — rich version with sourcing links
// ─────────────────────────────────────────────────────────────
const STORE_ICONS = { Jumia: '🛒', Konga: '🛍', GlowRoad: '✦', default: '🔗' };

function ProductCard({ product }) {
  if (!product) return null;
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    setExpanded((e) => {
      Animated.timing(expandAnim, { toValue: e ? 0 : 1, duration: 240, useNativeDriver: false }).start();
      return !e;
    });
  };

  const isNigerian  = (product.brandOrigin || '').toLowerCase().includes('nigerian') ||
                      (product.brandOrigin || '').toLowerCase().includes('african') ||
                      (product.brandOrigin || '').toLowerCase().includes('ghana');
  const links       = Array.isArray(product.affiliateLinks) ? product.affiliateLinks : [];

  const [detailH, setDetailH] = useState(0);
  const detailHAnim = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, detailH || 220] });
  const detailOp    = expandAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  return (
    <View style={pc.root}>
      {/* ── Header row ── */}
      <TouchableOpacity onPress={toggleExpand} activeOpacity={0.85}>
        <View style={pc.header}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={pc.brand}>{(product.brand || '').toUpperCase()}</Text>
              {isNigerian && (
                <View style={pc.originBadge}>
                  <Text style={pc.originText}>🌍 Local</Text>
                </View>
              )}
            </View>
            <Text style={pc.name}>{product.name || '—'}</Text>
          </View>
          <Text style={pc.expandHint}>{expanded ? '▲' : '▼'}</Text>
        </View>

        {/* ── Description ── */}
        {product.description ? (
          <Text style={pc.desc} numberOfLines={expanded ? 0 : 2}>{product.description}</Text>
        ) : null}

        {/* ── Key ingredients chips ── */}
        {product.keyIngredients?.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
            {product.keyIngredients.map((ing, i) => (
              <View key={i} style={pc.ingPill}><Text style={pc.ingText}>{ing}</Text></View>
            ))}
          </View>
        )}

        {/* ── Quick meta row ── */}
        <View style={pc.metaRow}>
          {product.frequency ? (
            <View style={pc.metaChip}>
              <Text style={pc.metaIcon}>🕐</Text>
              <Text style={pc.metaText}>{product.frequency}</Text>
            </View>
          ) : null}
          {product.amountToUse ? (
            <View style={pc.metaChip}>
              <Text style={pc.metaIcon}>⚗</Text>
              <Text style={pc.metaText}>{product.amountToUse}</Text>
            </View>
          ) : null}
          {product.rating != null && (
            <View style={[pc.metaChip, { marginLeft: 'auto' }]}>
              <Text style={pc.ratingText}>★ {Number(product.rating).toFixed(1)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ── Expandable detail ── */}
      <Animated.View style={{ height: detailHAnim, overflow: 'hidden' }}>
        {/* invisible measurer */}
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: 0, zIndex: -1 }}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && h !== detailH) setDetailH(h);
          }}
        >
          <View style={{ paddingTop: 12 }}>
            {product.howToUse ? (
              <View style={pc.howToBox}>
                <Text style={pc.sectionTitle}>HOW TO USE</Text>
                <Text style={pc.howToText}>{product.howToUse}</Text>
              </View>
            ) : null}
            {links.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={pc.sectionTitle}>BUY IN NIGERIA</Text>
                {links.map((lnk, li) => (
                  <View key={li} style={pc.storeRow}>
                    <Text style={pc.storeIcon}>{STORE_ICONS[lnk.store] || STORE_ICONS.default}</Text>
                    <Text style={pc.storeName}>{lnk.store}</Text>
                  </View>
                ))}
              </View>
            )}
            {!links.length && product.availability ? (
              <Text style={[pc.howToText, { marginTop: 8 }]}>Available at: {product.availability}</Text>
            ) : null}
          </View>
        </View>
        {/* actual animated content */}
        <Animated.View style={{ opacity: detailOp, paddingTop: 12 }}>
          {product.howToUse ? (
            <View style={pc.howToBox}>
              <Text style={pc.sectionTitle}>HOW TO USE</Text>
              <Text style={pc.howToText}>{product.howToUse}</Text>
            </View>
          ) : null}
          {links.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={pc.sectionTitle}>BUY IN NIGERIA</Text>
              {links.map((lnk, li) => (
                <View key={li} style={pc.storeRow}>
                  <Text style={pc.storeIcon}>{STORE_ICONS[lnk.store] || STORE_ICONS.default}</Text>
                  <Text style={pc.storeName}>{lnk.store}</Text>
                  {lnk.priceNGN != null && (
                    <Text style={pc.storePrice}>₦{Number(lnk.priceNGN).toLocaleString()}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
          {!links.length && product.availability ? (
            <Text style={[pc.howToText, { marginTop: 8 }]}>Available at: {product.availability}</Text>
          ) : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}
const pc = StyleSheet.create({
  root:        { backgroundColor: 'rgba(200,134,10,0.06)', borderWidth: 1, borderColor: 'rgba(200,134,10,0.22)', borderRadius: 12, padding: 13, marginTop: 10 },
  header:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  brand:       { color: C.creamFaint, fontSize: 9, fontWeight: '700', letterSpacing: 1, flexShrink: 1 },
  name:        { color: C.cream, fontSize: 13, fontWeight: '800', flexShrink: 1 },
  originBadge: { backgroundColor: 'rgba(93,190,138,0.14)', borderWidth: 1, borderColor: 'rgba(93,190,138,0.35)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  originText:  { color: '#5DBE8A', fontSize: 9, fontWeight: '700' },
  price:       { color: C.gold, fontSize: 13, fontWeight: '900', flexShrink: 0 },
  expandHint:  { color: C.creamFaint, fontSize: 9, fontWeight: '700' },
  desc:        { color: C.creamDim, fontSize: 12, lineHeight: 17, marginBottom: 4 },
  ingPill:     { backgroundColor: C.goldPale, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  ingText:     { color: C.creamDim, fontSize: 10, fontWeight: '600' },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9, alignItems: 'center' },
  metaChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,222,179,0.06)', borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  metaIcon:    { fontSize: 11 },
  metaText:    { color: C.creamDim, fontSize: 10, fontWeight: '600' },
  ratingText:  { color: C.amColor, fontSize: 11, fontWeight: '800' },
  sectionTitle:{ color: C.gold, fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  howToBox:    { backgroundColor: 'rgba(245,222,179,0.04)', borderLeftWidth: 2, borderLeftColor: C.gold, borderRadius: 8, padding: 10 },
  howToText:   { color: C.creamDim, fontSize: 12, lineHeight: 18 },
  storeRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  storeIcon:   { fontSize: 14, width: 22 },
  storeName:   { color: C.cream, fontSize: 12, fontWeight: '700', flex: 1 },
  storePrice:  { color: C.gold, fontSize: 12, fontWeight: '800' },
});

// ─────────────────────────────────────────────────────────────
//  Step card
// ─────────────────────────────────────────────────────────────
function StepCard({ item, isAM, index, completed, onToggle, saving }) {
  const [expanded, setExpanded] = useState(false);
  const expandAnim  = useRef(new Animated.Value(0)).current;
  const checkScale  = useRef(new Animated.Value(completed ? 1 : 0)).current;
  const cardScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(checkScale, { toValue: completed ? 1 : 0, friction: 5, useNativeDriver: true }).start();
  }, [completed]);

  const toggleExpand = () => {
    setExpanded((e) => {
      Animated.timing(expandAnim, { toValue: e ? 0 : 1, duration: 280, useNativeDriver: false }).start();
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

  const accentColor = isAM ? C.amColor : C.pmColor;
  const accentPale  = isAM ? C.amPale  : C.pmPale;
  const icon        = getStepIcon(item.step);
  const howToSteps  = buildHowToUse(item);
  const amountGuide = getAmountGuide(item.step);

  const ingredientList = item.keyIngredient
    ? item.keyIngredient.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // Support both 'matchedProducts' (from server) and legacy 'products' field
  const stepProducts = Array.isArray(item.matchedProducts)
    ? item.matchedProducts
    : Array.isArray(item.products) ? item.products : [];

  // ── Layout-driven expand: measure real content height ─────
  const [contentHeight, setContentHeight] = useState(0);
  const extraH  = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight || 200] });
  const extraOp = expandAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });

  return (
    <FadeSlide delay={index * 65} style={{ marginBottom: 10 }}>
      <TouchableOpacity
        onPressIn={()  => Animated.spring(cardScale, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(cardScale, { toValue: 1,    useNativeDriver: true }).start()}
        onPress={toggleExpand}
        activeOpacity={1}
      >
        <Animated.View style={[sc.root, completed && sc.rootDone, { transform: [{ scale: cardScale }] }]}>

          <View style={[sc.stepBadge, { backgroundColor: accentPale, borderColor: accentColor }]}>
            <Text style={[sc.stepNum, { color: accentColor }]}>{item.order}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={sc.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={sc.action}>{(item.step || "").toUpperCase()}</Text>
                <Text style={[sc.product, completed && sc.productDone]} numberOfLines={expanded ? 0 : 2}>
                  {item.productType || "—"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={sc.icon}>{icon}</Text>
                <Text style={[sc.expandHint, expanded && { opacity: 0.3 }]}>{expanded ? "▲" : "▼"}</Text>
              </View>
            </View>

            {item.keyIngredient && (
              <View style={{ flexDirection: "row", marginTop: 6, gap: 6, flexWrap: "wrap" }}>
                {ingredientList.map((ing, i) => (
                  <View key={i} style={sc.ingPill}><Text style={sc.ingText}>{ing}</Text></View>
                ))}
              </View>
            )}

            <Animated.View style={{ height: extraH, overflow: "hidden" }}>
              {/* Hidden measurer — renders off-screen to capture real height */}
              <View
                style={{ position: "absolute", top: 0, left: 0, right: 0, opacity: 0, zIndex: -1 }}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 0 && h !== contentHeight) setContentHeight(h);
                }}
              >
                <View style={{ paddingTop: 12 }}>
                  <View style={sc.amountRow}>
                    <Text style={sc.amountIcon}>⚗</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={sc.amountLabel}>HOW MUCH TO USE</Text>
                      <Text style={sc.amountValue}>{amountGuide}</Text>
                    </View>
                  </View>
                  <View style={sc.sectionHeader}><View style={sc.sectionBar} /><Text style={sc.sectionTitle}>HOW TO USE</Text></View>
                  {howToSteps.map((step, si) => (
                    <View key={si} style={sc.instrRow}>
                      <View style={[sc.instrNum, { backgroundColor: accentPale, borderColor: accentColor }]}>
                        <Text style={[sc.instrNumText, { color: accentColor }]}>{si + 1}</Text>
                      </View>
                      <Text style={sc.instrText}>{step}</Text>
                    </View>
                  ))}
                  <View style={sc.whyBox}><Text style={sc.whyLabel}>💡  WHY THIS STEP</Text><Text style={sc.why}>{buildWhyThisStep(item.step)}</Text></View>
                  {stepProducts.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <View style={sc.sectionHeader}><View style={sc.sectionBar} /><Text style={sc.sectionTitle}>RECOMMENDED PRODUCTS</Text></View>
                      {stepProducts.map((prod, pi) => <ProductCard key={pi} product={prod} />)}
                    </View>
                  )}
                </View>
              </View>
              {/* Actual animated content */}
              <Animated.View style={{ opacity: extraOp, paddingTop: 12 }}>

                <View style={sc.amountRow}>
                  <Text style={sc.amountIcon}>⚗</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={sc.amountLabel}>HOW MUCH TO USE</Text>
                    <Text style={sc.amountValue}>{amountGuide}</Text>
                  </View>
                </View>

                <View style={sc.sectionHeader}>
                  <View style={sc.sectionBar} />
                  <Text style={sc.sectionTitle}>HOW TO USE</Text>
                </View>

                {howToSteps.map((step, si) => (
                  <View key={si} style={sc.instrRow}>
                    <View style={[sc.instrNum, { backgroundColor: accentPale, borderColor: accentColor }]}>
                      <Text style={[sc.instrNumText, { color: accentColor }]}>{si + 1}</Text>
                    </View>
                    <Text style={sc.instrText}>{step}</Text>
                  </View>
                ))}

                <View style={sc.whyBox}>
                  <Text style={sc.whyLabel}>💡  WHY THIS STEP</Text>
                  <Text style={sc.why}>{buildWhyThisStep(item.step)}</Text>
                </View>

                {stepProducts.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <View style={sc.sectionHeader}>
                      <View style={sc.sectionBar} />
                      <Text style={sc.sectionTitle}>RECOMMENDED PRODUCTS</Text>
                    </View>
                    {stepProducts.map((prod, pi) => <ProductCard key={pi} product={prod} />)}
                  </View>
                )}

              </Animated.View>
            </Animated.View>
          </View>

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
  root:        { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
  rootDone:    { borderColor: "rgba(93,190,138,0.30)", backgroundColor: "rgba(93,190,138,0.04)" },
  stepBadge:   { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNum:     { fontSize: 12, fontWeight: "900" },
  topRow:      { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  action:      { color: C.creamDim, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 3 },
  product:     { color: C.cream, fontSize: 14, fontWeight: "700", flex: 1, paddingRight: 4 },
  productDone: { textDecorationLine: "line-through", color: C.creamDim },
  icon:        { fontSize: 18 },
  expandHint:  { color: C.creamFaint, fontSize: 9, fontWeight: "700" },
  ingPill:     { backgroundColor: C.goldPale, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  ingText:     { color: C.creamDim, fontSize: 10, fontWeight: "600" },

  amountRow:   { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(200,134,10,0.07)", borderWidth: 1, borderColor: "rgba(200,134,10,0.18)", borderRadius: 10, padding: 10, marginBottom: 12 },
  amountIcon:  { fontSize: 18 },
  amountLabel: { color: C.creamFaint, fontSize: 9, fontWeight: "700", letterSpacing: 0.8, marginBottom: 1 },
  amountValue: { color: C.gold, fontSize: 13, fontWeight: "700" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionBar:    { width: 3, height: 12, borderRadius: 1.5, backgroundColor: C.gold },
  sectionTitle:  { color: C.gold, fontSize: 9, fontWeight: "700", letterSpacing: 1.2 },

  instrRow:     { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  instrNum:     { width: 22, height: 22, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  instrNumText: { fontSize: 11, fontWeight: "800" },
  instrText:    { color: C.creamDim, fontSize: 12, lineHeight: 18, flex: 1 },

  whyBox:   { backgroundColor: "rgba(245,222,179,0.05)", borderLeftWidth: 2, borderLeftColor: C.gold, borderRadius: 8, padding: 10, marginTop: 8 },
  whyLabel: { color: C.gold, fontSize: 9, fontWeight: "700", letterSpacing: 0.8, marginBottom: 4 },
  why:      { color: C.creamDim, fontSize: 12, lineHeight: 18 },

  checkBox:     { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  checkBoxDone: { backgroundColor: "rgba(93,190,138,0.18)", borderColor: C.success },
  checkMark:    { color: C.success, fontSize: 14, fontWeight: "900" },
});

// ─────────────────────────────────────────────────────────────
//  Weekly schedule card
// ─────────────────────────────────────────────────────────────
function WeeklySchedule({ schedule }) {
  if (!schedule?.length) return null;
  const today = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
  return (
    <FadeSlide delay={600} style={ws.wrap}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: C.gold }} />
        <Text style={ws.title}>Weekly Schedule</Text>
      </View>
      <View style={ws.days}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
          const entry   = schedule.find((s) => s.day === day);
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
      {schedule
        .filter((s) => s.day === today && s.tasks?.length > 0)
        .map((entry, i) => (
          <View key={i} style={{ marginTop: 10 }}>
            <Text style={{ color: C.creamDim, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6 }}>TODAY'S EXTRAS</Text>
            {entry.tasks.map((task, ti) => (
              <View key={ti} style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
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
  wrap:         { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 20 },
  title:        { color: C.cream, fontSize: 14, fontWeight: "700" },
  days:         { flexDirection: "row", gap: 6 },
  dayBox:       { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard2, gap: 4 },
  dayBoxToday:  { borderColor: C.gold, backgroundColor: C.goldPale },
  dayBoxActive: { borderColor: "rgba(93,190,138,0.35)" },
  dayLabel:     { color: C.creamDim, fontSize: 10, fontWeight: "700" },
  dayLabelToday:{ color: C.gold },
  taskDot:      { width: 4, height: 4, borderRadius: 2, backgroundColor: C.success },
});

// ─────────────────────────────────────────────────────────────
//  Empty / no routine state
// ─────────────────────────────────────────────────────────────
function EmptyRoutine({ onScan, onGenerate, generating, latestScan }) {
  const pulse = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.9,  duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ alignItems: "center", paddingTop: 30, paddingBottom: 40 }}>
      <Animated.View style={[emp.iconWrap, { transform: [{ scale: pulse }] }]}>
        <Text style={{ color: C.gold, fontSize: 30 }}>✦</Text>
      </Animated.View>
      <Text style={emp.title}>No routine yet</Text>
      <Text style={emp.body}>
        {latestScan
          ? "Your last scan is ready. Tap below to generate your personalised AM + PM routine."
          : "Complete your first skin scan and we'll generate a personalised AM + PM routine built for your melanin skin."}
      </Text>
      {latestScan ? (
        <TouchableOpacity style={[emp.cta, generating && { opacity: 0.6 }]} onPress={onGenerate} disabled={generating} activeOpacity={0.85}>
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
  iconWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: C.goldPale, borderWidth: 1.5, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 20, shadowColor: C.gold, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 0 }, shadowRadius: 12, elevation: 6 },
  title:    { color: C.cream, fontSize: 20, fontWeight: "800", marginBottom: 10 },
  body:     { color: C.creamDim, fontSize: 14, lineHeight: 22, textAlign: "center", paddingHorizontal: 24, marginBottom: 24 },
  cta:      { backgroundColor: C.goldPale, borderWidth: 1.5, borderColor: C.gold, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13, minWidth: 200, alignItems: "center" },
  ctaText:  { color: C.gold, fontSize: 14, fontWeight: "800" },
});

// ─────────────────────────────────────────────────────────────
//  Cooldown banner
//  FIX 7: dismissing the banner NOW resets step checkboxes,
//  not the celebration animation. While the banner is showing,
//  steps remain visually checked so the user can see their work.
// ─────────────────────────────────────────────────────────────
function CooldownBanner({ tab, remainingMs, onDismiss }) {
  const [timeLeft, setTimeLeft] = useState(remainingMs);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1000;
        if (next <= 0) { clearInterval(interval); onDismiss(); return 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const isAM        = tab === "AM";
  const accentColor = isAM ? C.amColor : C.pmColor;
  const accentPale  = isAM ? C.amPale  : C.pmPale;

  return (
    <FadeSlide delay={0}>
      <Animated.View style={[cd.wrap, { borderColor: accentColor, backgroundColor: accentPale, transform: [{ scale: pulseAnim }] }]}>
        <Text style={cd.icon}>{isAM ? "☀" : "🌙"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[cd.title, { color: accentColor }]}>
            {isAM ? "Morning Routine Done!" : "Night Routine Done!"}
          </Text>
          <Text style={cd.sub}>Great work! Your skin will thank you.</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
            <Text style={cd.clockIcon}>⏱</Text>
            <Text style={cd.countdown}>
              Resets in <Text style={[cd.countdownBold, { color: accentColor }]}>{formatCountdown(timeLeft)}</Text>
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onDismiss} style={cd.skipBtn}>
          <Text style={cd.skipText}>Skip</Text>
        </TouchableOpacity>
      </Animated.View>
    </FadeSlide>
  );
}
const cd = StyleSheet.create({
  wrap:          { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 20 },
  icon:          { fontSize: 30 },
  title:         { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  sub:           { color: C.creamDim, fontSize: 12 },
  clockIcon:     { fontSize: 14 },
  countdown:     { color: C.creamDim, fontSize: 13, fontWeight: "600" },
  countdownBold: { fontWeight: "900" },
  skipBtn:       { borderWidth: 1, borderColor: C.creamFaint, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  skipText:      { color: C.creamDim, fontSize: 11, fontWeight: "700" },
});

// ─────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────
export default function RoutineScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [routine,    setRoutine]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── FIX 6: Default tab uses phone time; updated on every focus ─
  const [activeTab,  setActiveTab]  = useState(getTimeBasedTab);

  const [savingStep, setSavingStep] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [latestScan, setLatestScan] = useState(null);
  const [genError,   setGenError]   = useState(null);

  // ── Add-my-product modal state ────────────────────────────
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productInput,   setProductInput]   = useState('');
  const [fittingProduct, setFittingProduct] = useState(false);
  const [fitSuccess,     setFitSuccess]     = useState(null);
  const [fitError,       setFitError]       = useState(null);

  // completionDates: { AM: "YYYY-MM-DD" | null, PM: "YYYY-MM-DD" | null }
  const [completionDates, setCompletionDates] = useState({ AM: null, PM: null });

  // 6-hour cooldown timestamps: { AM: unixMs|null, PM: unixMs|null }
  const [cooldownAt,  setCooldownAt]  = useState({ AM: null, PM: null });

  const [celebrating, setCelebrating] = useState(false);
  const celebrateAnim = useRef(new Animated.Value(0)).current;

  // ── FIX 6: greeting updates on focus too ──────────────────
  const [greeting, setGreeting] = useState(getTimeGreeting);

  // ── userId helper ─────────────────────────────────────────
  const uid = user?._id || user?.id || "guest";

  // ── Load stored state ─────────────────────────────────────
  const loadStoredState = useCallback(async () => {
    try {
      const [amCoolRaw, pmCoolRaw, amDateRaw, pmDateRaw] = await Promise.all([
        AsyncStorage.getItem(COOLDOWN_KEY(uid, "AM")),
        AsyncStorage.getItem(COOLDOWN_KEY(uid, "PM")),
        AsyncStorage.getItem(COMPLETION_DATE_KEY(uid, "AM")),
        AsyncStorage.getItem(COMPLETION_DATE_KEY(uid, "PM")),
      ]);

      const now  = Date.now();
      const amTs = amCoolRaw ? parseInt(amCoolRaw, 10) : null;
      const pmTs = pmCoolRaw ? parseInt(pmCoolRaw, 10) : null;

      const newCooldownAt = {
        AM: amTs && now - amTs < COOLDOWN_MS ? amTs : null,
        PM: pmTs && now - pmTs < COOLDOWN_MS ? pmTs : null,
      };

      setCooldownAt(newCooldownAt);

      const newDates = {
        AM: amDateRaw || null,
        PM: pmDateRaw || null,
      };
      setCompletionDates(newDates);

      return { dates: newDates, cooldowns: newCooldownAt };
    } catch {
      return { dates: { AM: null, PM: null }, cooldowns: { AM: null, PM: null } };
    }
  }, [uid]);

  // ── Fetch routine + latest scan ──────────────────────────
  const fetchRoutine = useCallback(async () => {
    try {
      const { dates, cooldowns } = await loadStoredState();

      // ── FIX 6: Update greeting + auto-select time-based tab ──
      setGreeting(getTimeGreeting());
      const timeTab = getTimeBasedTab();

      // If the time-appropriate tab is in cooldown, show the other one
      const isCooldown = (tab) => {
        const ts = cooldowns[tab];
        return ts && Date.now() - ts < COOLDOWN_MS;
      };
      if (isCooldown(timeTab)) {
        const otherTab = timeTab === "AM" ? "PM" : "AM";
        setActiveTab(otherTab);
      } else {
        setActiveTab(timeTab);
      }

      // Fetch latest scan
      let scan = null;
      try {
        const hist = await ScanAPI.getHistory(1, 1);
        if (hist?.data?.length > 0) {
          scan = hist.data[0];
          setLatestScan(scan);
        }
      } catch { /* no scans yet */ }

      // Fetch routine
      const r = await RoutineAPI.getMyRoutine();

      if (r && (r.morning || r.night)) {
        const resetRoutine = applyDailyReset(r, dates);

        // r.scan is the MongoDB ObjectId of the scan that generated this routine
        const routineScanId = r.scan || r.scanId || r.generatedFromScan;
        const latestScanId  = scan?._id || scan?.scanId;
        const isStale = latestScanId && routineScanId &&
          String(routineScanId) !== String(latestScanId);

        if (isStale && scan) {
          setRoutine(resetRoutine);
          regenerateFromScan(scan);
        } else {
          setRoutine(resetRoutine);
        }
      } else {
        setRoutine(null);
      }
    } catch {
      setRoutine(null);
    } finally {
      setLoading(false);
    }
  }, [loadStoredState]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchRoutine();
    }, [fetchRoutine]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRoutine();
    setRefreshing(false);
  }, [fetchRoutine]);

  // ── Generate / regenerate routine ─────────────────────────
  const regenerateFromScan = useCallback(async (scan) => {
    if (!scan) return;
    setGenerating(true);
    setGenError(null);
    try {
      const generated = await RoutineAPI.generate({
        scanId:      scan._id || scan.scanId,
        skinType:    scan.skinType,
        conditions:  (scan.conditions ?? []).map((c) => c.name),
        concerns:    scan.melaninInsights?.pihRisk === "high" ? ["hyperpigmentation"] : [],
        fitzpatrick: scan.fitzpatrickEst,
      });
      const resetGenerated = applyDailyReset(generated, completionDates);
      setRoutine(resetGenerated);
    } catch (err) {
      setGenError(err?.message || "Failed to generate routine. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [completionDates]);

  const generateRoutine = useCallback(() => {
    regenerateFromScan(latestScan);
  }, [latestScan, regenerateFromScan]);

  // ── Fit a user-owned product into the routine ────────────────
  const handleFitProduct = useCallback(async () => {
    if (!productInput.trim()) return;
    setFittingProduct(true);
    setFitError(null);
    setFitSuccess(null);
    try {
      const result = await RoutineAPI.fitProduct(productInput.trim());
      if (result?.data?.routine) {
        setRoutine(result.data.routine);
      } else {
        const r = await RoutineAPI.getMyRoutine();
        if (r) setRoutine(r);
      }
      setFitSuccess(result?.message || `"${productInput.trim()}" added to your routine!`);
      setProductInput('');
      setTimeout(() => { setShowAddProduct(false); setFitSuccess(null); }, 2200);
    } catch (err) {
      setFitError(err?.message || 'Could not fit this product. Please try again.');
    } finally {
      setFittingProduct(false);
    }
  }, [productInput, completionDates]);

  // ── Toggle a step ─────────────────────────────────────────
  const toggleStep = useCallback(
    async (order) => {
      if (!routine?._id) return;
      const timeOfDay = activeTab === "AM" ? "morning" : "night";

      // Optimistic update
      setRoutine((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [timeOfDay]: prev[timeOfDay].map((s) =>
            s.order === order ? { ...s, completed: !s.completed } : s
          ),
        };
      });

      setSavingStep(order);
      try {
        const updated = await RoutineAPI.completeStep(routine._id, timeOfDay, order);
        // Use server state directly — do NOT run applyDailyReset here.
        // applyDailyReset checks completionDates which is only written
        // 1800ms after the last step is done, so calling it immediately
        // after the API response would falsely wipe all completed flags.
        if (updated) setRoutine(updated);
      } catch {
        // Roll back optimistic update on error
        setRoutine((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [timeOfDay]: prev[timeOfDay].map((s) =>
              s.order === order ? { ...s, completed: !s.completed } : s
            ),
          };
        });
      } finally {
        setSavingStep(null);
      }
    },
    [routine, activeTab],
  );

  // ── Derived state ─────────────────────────────────────────
  const activeSteps = routine
    ? activeTab === "AM" ? (routine.morning ?? []) : (routine.night ?? [])
    : [];
  const doneCount = activeSteps.filter((s) => s.completed).length;
  const allDone   = activeSteps.length > 0 && doneCount === activeSteps.length;

  const activeCooldownTs  = cooldownAt[activeTab];
  const cooldownRemaining = activeCooldownTs
    ? Math.max(0, COOLDOWN_MS - (Date.now() - activeCooldownTs))
    : 0;
  const inCooldown = cooldownRemaining > 0;

  // ── FIX 6: the tab the phone's clock recommends right now ─
  const recommendedTab = getTimeBasedTab();

  // ── All steps done → celebration + stamp storage ─────────
  // FIX 7: We do NOT reset completed flags here anymore.
  // Steps stay checked and remain visible to the user.
  // The reset happens when the cooldown banner is dismissed.
  useEffect(() => {
    if (!allDone || celebrating || inCooldown) return;

    setCelebrating(true);
    Animated.timing(celebrateAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    const timer = setTimeout(async () => {
      Animated.timing(celebrateAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      setCelebrating(false);

      try {
        const now        = Date.now();
        const dateString = todayString();

        await Promise.all([
          AsyncStorage.setItem(COOLDOWN_KEY(uid, activeTab),          String(now)),
          AsyncStorage.setItem(COMPLETION_DATE_KEY(uid, activeTab),   dateString),
        ]);

        setCooldownAt((prev) => ({ ...prev, [activeTab]: now }));
        setCompletionDates((prev) => ({ ...prev, [activeTab]: dateString }));

        // ── FIX 7: Steps are intentionally NOT reset here.
        //    They will remain checked so the user can see what
        //    they completed. The reset happens in clearCooldown()
        //    below, which is triggered by Skip or timer expiry.
      } catch { /* ignore storage errors */ }
    }, 1800);

    return () => clearTimeout(timer);
  }, [allDone]);

  // ── Clear cooldown (Skip / timer expired) ────────────────
  // FIX 7: This is now the ONLY place where completed flags get
  // wiped locally — giving a clear cause-and-effect for the user.
  const clearCooldown = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(COOLDOWN_KEY(uid, activeTab));
    } catch { /* ignore */ }

    // Reset steps for the completed tab now that banner is dismissed
    const timeOfDay = activeTab === "AM" ? "morning" : "night";
    setRoutine((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [timeOfDay]: prev[timeOfDay].map((s) => ({ ...s, completed: false })),
      };
    });

    setCooldownAt((prev) => ({ ...prev, [activeTab]: null }));

    // ── FIX 6: After resetting, switch to the currently recommended
    //    tab if it differs from the one we just cleared ─────────────
    const timeTab = getTimeBasedTab();
    if (timeTab !== activeTab) setActiveTab(timeTab);
  }, [activeTab, uid]);

  // ─────────────────────────────────────────────────────────
  //  Plan gating
  // ─────────────────────────────────────────────────────────
  const userPlan = user?.subscription?.plan || 'free';
  if (userPlan === 'free') {
    return (
      <AfricanBG>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <FadeSlide delay={0} style={s.header}>
            <Text style={s.greeting}>{greeting}</Text>
            <Text style={s.title}>My Routine</Text>
            <Text style={s.subtitle}>Your personalised skincare schedule</Text>
          </FadeSlide>

          <FadeSlide delay={120} style={{ marginTop: 32 }}>
            <View style={{
              backgroundColor: '#1A0A02',
              borderWidth: 1,
              borderColor: 'rgba(200,134,10,0.30)',
              borderRadius: 20,
              padding: 28,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>🌿</Text>
              <Text style={{ color: C.cream, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 }}>
                Routines are a Pro feature
              </Text>
              <Text style={{ color: C.creamDim, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
                Upgrade to Pro to unlock your personalised skincare routine — morning and night steps, product matching, and streak tracking built around your scan.
              </Text>
              <View style={{ width: '100%', gap: 10, marginBottom: 24 }}>
                {[
                  'Personalised AM & PM routine',
                  'Products matched to each step',
                  'Streak tracking & progress',
                  'Weekly schedule extras',
                ].map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: 'rgba(200,134,10,0.15)', borderWidth: 1, borderColor: 'rgba(200,134,10,0.40)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: C.gold, fontSize: 11, fontWeight: '900' }}>✓</Text>
                    </View>
                    <Text style={{ color: C.cream, fontSize: 13, fontWeight: '500' }}>{f}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={{ backgroundColor: C.gold, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, width: '100%', alignItems: 'center' }}
                onPress={() => navigation.navigate('Subscription')}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#0B0300', fontSize: 15, fontWeight: '900', letterSpacing: 1 }}>UPGRADE TO PRO →</Text>
              </TouchableOpacity>
              <Text style={{ color: C.creamFaint, fontSize: 11, marginTop: 12 }}>Cancel anytime · Starting ₦2,500/mo</Text>
            </View>
          </FadeSlide>
          <View style={{ height: 100 }} />
        </ScrollView>
      </AfricanBG>
    );
  }

  // ─────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────
  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.gold} colors={[C.gold]} />
        }
      >
        {/* ── Header ── */}
        <FadeSlide delay={0} style={s.header}>
          {/* FIX 6: show time-aware greeting */}
          <Text style={s.greeting}>{greeting}</Text>
          <Text style={s.title}>My Routine</Text>
          <Text style={s.subtitle}>Your personalised skincare schedule</Text>
          <View style={s.headerMeta}>
            {routine && <StreakBadge days={routine.streakDays} />}
            {routine && (
              <TouchableOpacity
                style={s.regenBtn}
                onPress={generateRoutine}
                disabled={generating || !latestScan}
                activeOpacity={0.8}
              >
                {generating
                  ? <ActivityIndicator size="small" color={C.creamDim} />
                  : <Text style={s.regenText}>↺ Refresh from scan</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </FadeSlide>

        {/* ── Loading ── */}
        {loading && (
          <View style={{ paddingVertical: 80, alignItems: "center" }}>
            <ActivityIndicator size="large" color={C.gold} />
            <Text style={{ color: C.creamDim, fontSize: 13, marginTop: 14 }}>Loading your routine…</Text>
          </View>
        )}

        {/* ── No routine ── */}
        {!loading && !routine && (
          <>
            {genError && (
              <View style={{ backgroundColor: "rgba(224,92,58,0.12)", borderWidth: 1, borderColor: "rgba(224,92,58,0.35)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <Text style={{ color: C.error, fontSize: 13, textAlign: "center" }}>⚠ {genError}</Text>
              </View>
            )}
            <EmptyRoutine
              onScan={() => navigation.navigate("ScanCamera")}
              onGenerate={generateRoutine}
              generating={generating}
              latestScan={latestScan}
            />
          </>
        )}

        {/* ── Has routine ── */}
        {!loading && routine && (
          <>
            <FadeSlide delay={80}>
              {/* FIX 6: pass recommendedTab so the NOW pill knows which tab to mark */}
              <TabSwitcher active={activeTab} onChange={setActiveTab} recommendedTab={recommendedTab} />
            </FadeSlide>

            <RoutineProgress done={doneCount} total={activeSteps.length} isAM={activeTab === "AM"} />

            <FadeSlide delay={180} style={s.timeBanner}>
              <Text style={s.timeBannerIcon}>{activeTab === "AM" ? "☀" : "🌙"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.timeBannerTitle}>{activeTab === "AM" ? "Morning Routine" : "Night Routine"}</Text>
                <Text style={s.timeBannerSub}>{activeTab === "AM" ? "Best done within 30 min of waking" : "Do this 30 min before bed"}</Text>
              </View>
              <Text style={{ color: C.creamFaint, fontSize: 11 }}>{activeSteps.length} steps</Text>
            </FadeSlide>

            <FadeSlide delay={240} style={{ marginBottom: 14 }}>
              <Text style={{ color: C.creamFaint, fontSize: 11, letterSpacing: 0.3 }}>
                Tap a step to see why it works + product recommendations. Check off as you go.
              </Text>
            </FadeSlide>

            {/* ── 6-hour cooldown banner ── */}
            {inCooldown && (
              // FIX 7: banner shows ABOVE the step list, and steps below
              // remain rendered as checked so user can see what they did.
              <CooldownBanner tab={activeTab} remainingMs={cooldownRemaining} onDismiss={clearCooldown} />
            )}

            {/* ── Routine steps ── */}
            {activeSteps.length === 0 ? (
              <FadeSlide delay={300} style={{ alignItems: "center", paddingVertical: 30 }}>
                <Text style={{ color: C.creamDim, fontSize: 14, textAlign: "center" }}>
                  No {activeTab === "AM" ? "morning" : "night"} steps in your routine.{"\n"}Pull to refresh or tap ↺ above.
                </Text>
              </FadeSlide>
            ) : (
              activeSteps.map((item, i) => (
                <StepCard
                  key={`${activeTab}-${item.order ?? i}`}
                  item={item}
                  isAM={activeTab === "AM"}
                  index={i}
                  completed={!!item.completed}
                  onToggle={inCooldown ? () => {} : () => toggleStep(item.order)}
                  saving={savingStep === item.order}
                />
              ))
            )}

            {/* ── Celebration card ── */}
            {celebrating && (
              <Animated.View style={[s.doneCard, { opacity: celebrateAnim }]}>
                <Text style={s.doneIcon}>✦</Text>
                <Text style={s.doneTitle}>Routine Complete!</Text>
                <Text style={s.doneSub}>Amazing consistency. See you next session!</Text>
                {routine.streakDays > 0 && (
                  <Text style={{ color: C.amColor, fontSize: 13, fontWeight: "800", marginTop: 8 }}>
                    🔥 {routine.streakDays}-day streak
                  </Text>
                )}
              </Animated.View>
            )}

            {/* ── Add My Product button (Elite only) ── */}
            <FadeSlide delay={700} style={{ marginTop: 6, marginBottom: 4 }}>
              {userPlan === 'elite' ? (
                <TouchableOpacity
                  style={s.addProductBtn}
                  onPress={() => { setShowAddProduct(true); setFitError(null); setFitSuccess(null); }}
                  activeOpacity={0.85}
                >
                  <Text style={s.addProductBtnIcon}>+</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.addProductBtnText}>I already use a product</Text>
                    <Text style={s.addProductBtnSub}>Tap to add it to your routine</Text>
                  </View>
                  <Text style={{ color: C.gold, fontSize: 16 }}>→</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[s.addProductBtn, { borderStyle: 'dashed', opacity: 0.75 }]}
                  onPress={() => navigation.navigate('Subscription')}
                  activeOpacity={0.85}
                >
                  <Text style={s.addProductBtnIcon}>✦</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.addProductBtnText}>Add your own products</Text>
                    <Text style={s.addProductBtnSub}>Elite plan feature — tap to upgrade</Text>
                  </View>
                  <Text style={{ color: C.gold, fontSize: 13, fontWeight: '700' }}>Elite →</Text>
                </TouchableOpacity>
              )}
            </FadeSlide>

            {routine.weeklySchedule?.length > 0 && (
              <WeeklySchedule schedule={routine.weeklySchedule} />
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Add-My-Product Modal ── */}
      <Modal
        visible={showAddProduct}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddProduct(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={apm.overlay}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowAddProduct(false)} />
          <View style={apm.sheet}>
            <View style={apm.handle} />
            <Text style={apm.title}>Add Your Product 🧪</Text>
            <Text style={apm.subtitle}>
              Already using a product? Type its name and we’ll figure out where it fits in your daily routine.
            </Text>

            <TextInput
              style={apm.input}
              placeholder="e.g. Neutrogena Hydro Boost, Dove Body Lotion..."
              placeholderTextColor={C.creamFaint}
              value={productInput}
              onChangeText={setProductInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleFitProduct}
            />

            {fitSuccess && (
              <View style={apm.successBox}>
                <Text style={apm.successText}>✓  {fitSuccess}</Text>
              </View>
            )}
            {fitError && (
              <View style={apm.errorBox}>
                <Text style={apm.errorText}>⚠  {fitError}</Text>
              </View>
            )}

            <View style={apm.btnRow}>
              <TouchableOpacity
                style={apm.cancelBtn}
                onPress={() => { setShowAddProduct(false); setProductInput(''); setFitError(null); }}
              >
                <Text style={apm.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[apm.fitBtn, (!productInput.trim() || fittingProduct) && { opacity: 0.5 }]}
                onPress={handleFitProduct}
                disabled={!productInput.trim() || fittingProduct}
                activeOpacity={0.85}
              >
                {fittingProduct
                  ? <ActivityIndicator size="small" color="#0F0500" />
                  : <Text style={apm.fitBtnText}>Fit to My Routine ✨</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop: 60, paddingHorizontal: 22 },

  header:   { marginBottom: 24 },
  greeting: { color: C.gold, fontSize: 12, fontWeight: "700", letterSpacing: 0.8, marginBottom: 4, opacity: 0.8 },
  title:    { color: C.cream, fontSize: 28, fontWeight: "800", marginBottom: 4 },
  subtitle: { color: C.creamDim, fontSize: 13, marginBottom: 12 },
  headerMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  regenBtn:   { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  regenText:  { color: C.creamDim, fontSize: 12, fontWeight: "600" },

  timeBanner:      { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 16 },
  timeBannerIcon:  { fontSize: 24 },
  timeBannerTitle: { color: C.cream, fontSize: 14, fontWeight: "700", marginBottom: 2 },
  timeBannerSub:   { color: C.creamDim, fontSize: 12 },

  doneCard:  { backgroundColor: "rgba(93,190,138,0.08)", borderWidth: 1, borderColor: "rgba(93,190,138,0.30)", borderRadius: 14, padding: 20, alignItems: "center", marginTop: 4, marginBottom: 20 },
  doneIcon:  { color: C.success, fontSize: 28, marginBottom: 10 },
  doneTitle: { color: C.success, fontSize: 18, fontWeight: "800", marginBottom: 6 },
  doneSub:   { color: C.creamDim, fontSize: 13, textAlign: "center", lineHeight: 20 },

  addProductBtn:     { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(200,134,10,0.07)", borderWidth: 1.5, borderColor: "rgba(200,134,10,0.28)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginTop: 8, marginBottom: 20 },
  addProductBtnIcon: { color: C.gold, fontSize: 22, fontWeight: "300", width: 28, textAlign: "center" },
  addProductBtnText: { color: C.cream, fontSize: 13, fontWeight: "700" },
  addProductBtnSub:  { color: C.creamDim, fontSize: 11, marginTop: 2 },
});

// ── Add-my-product modal styles ───────────────────────────────
const apm = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#1A0A02', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(200,134,10,0.25)' },
  handle:     { width: 44, height: 4, borderRadius: 2, backgroundColor: 'rgba(200,134,10,0.35)', alignSelf: 'center', marginBottom: 20 },
  title:      { color: '#F5DEB3', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  subtitle:   { color: 'rgba(245,222,179,0.55)', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  input:      { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(200,134,10,0.35)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#F5DEB3', fontSize: 14, marginBottom: 16 },
  successBox: { backgroundColor: 'rgba(93,190,138,0.10)', borderWidth: 1, borderColor: 'rgba(93,190,138,0.35)', borderRadius: 10, padding: 12, marginBottom: 14 },
  successText:{ color: '#5DBE8A', fontSize: 13, fontWeight: '700' },
  errorBox:   { backgroundColor: 'rgba(224,92,58,0.10)', borderWidth: 1, borderColor: 'rgba(224,92,58,0.35)', borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText:  { color: '#E05C3A', fontSize: 13, fontWeight: '700' },
  btnRow:     { flexDirection: 'row', gap: 12 },
  cancelBtn:  { flex: 1, borderWidth: 1.5, borderColor: 'rgba(245,222,179,0.18)', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  cancelText: { color: 'rgba(245,222,179,0.55)', fontSize: 14, fontWeight: '700' },
  fitBtn:     { flex: 2, backgroundColor: '#C8860A', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  fitBtnText: { color: '#0F0500', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
});