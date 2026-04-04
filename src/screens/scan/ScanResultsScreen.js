// src/screens/scan/ScanResultsScreen.js
import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ScanAPI } from "../../services/api";

const { width: W, height: H } = Dimensions.get("window");

const C = {
  bg: "#0F0500",
  bgCard: "#1A0A02",
  bgCard2: "#200E03",
  border: "rgba(200,134,10,0.22)",
  borderBright: "rgba(200,134,10,0.50)",
  gold: "#C8860A",
  goldLight: "#E8A020",
  goldPale: "rgba(200,134,10,0.14)",
  cream: "#F5DEB3",
  creamDim: "rgba(245,222,179,0.55)",
  creamFaint: "rgba(245,222,179,0.18)",
  success: "#5DBE8A",
  successPale: "rgba(93,190,138,0.12)",
  warn: "#E8A020",
  warnPale: "rgba(232,160,32,0.12)",
  error: "#E05C3A",
  errorPale: "rgba(224,92,58,0.10)",
};

// ── African background ────────────────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View
        style={[
          ab.b,
          {
            width: 480,
            height: 480,
            borderRadius: 240,
            backgroundColor: "#6B3000",
            opacity: 0.09,
            top: -150,
            left: -120,
          },
        ]}
      />
      <View
        style={[
          ab.b,
          {
            width: 320,
            height: 320,
            borderRadius: 160,
            backgroundColor: C.gold,
            opacity: 0.05,
            bottom: -80,
            right: -80,
          },
        ]}
      />
      <View style={[ab.stripe, { top: H * 0.07 }]} />
      {[
        { top: H * 0.1, left: W * 0.06, o: 0.22 },
        { top: H * 0.82, left: W * 0.88, o: 0.15 },
      ].map((d, i) => (
        <View
          key={i}
          style={[ab.dot, { top: d.top, left: d.left, opacity: d.o }]}
        />
      ))}
      {children}
    </View>
  );
}
const ab = StyleSheet.create({
  b: { position: "absolute" },
  stripe: {
    position: "absolute",
    width: W,
    height: 1.5,
    backgroundColor: "rgba(200,134,10,0.12)",
  },
  dot: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.gold,
  },
});

// ── FadeSlide ─────────────────────────────────────────────────
function FadeSlide({ delay = 0, from = 18, children, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, {
        toValue: 1,
        duration: 520,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(ty, {
        toValue: 0,
        friction: 8,
        tension: 50,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return (
    <Animated.View
      style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}
    >
      {children}
    </Animated.View>
  );
}

// ── Gold button ───────────────────────────────────────────────
function GoldButton({ label, onPress, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        style={gb.root}
        onPress={onPress}
        activeOpacity={1}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.96,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
        }
      >
        <View style={gb.shimmer} />
        <Text style={gb.label}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
const gb = StyleSheet.create({
  root: {
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
  },
  label: {
    color: "#0F0500",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});

// ── Section label ─────────────────────────────────────────────
function SectionLabel({ text, sub }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: sub ? 4 : 0,
        }}
      >
        <View
          style={{
            width: 4,
            height: 16,
            borderRadius: 2,
            backgroundColor: C.gold,
          }}
        />
        <Text style={{ color: C.cream, fontSize: 17, fontWeight: "800" }}>
          {text}
        </Text>
      </View>
      {sub && (
        <Text style={{ color: C.creamDim, fontSize: 12, marginLeft: 12 }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

// ── Score ring ────────────────────────────────────────────────
function ScoreRing({ score }) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 50,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(op, {
        toValue: 1,
        duration: 500,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const color = score >= 75 ? C.success : score >= 55 ? C.warn : C.error;
  const label = score >= 75 ? "Great" : score >= 55 ? "Good" : "Needs Work";

  return (
    <Animated.View style={[sr2.wrap, { opacity: op, transform: [{ scale }] }]}>
      <View style={[sr2.ring, { borderColor: color, shadowColor: color }]}>
        <Text style={[sr2.score, { color }]}>{score}</Text>
        <Text style={sr2.sub}>/100</Text>
      </View>
      <Text style={[sr2.label, { color }]}>{label}</Text>
    </Animated.View>
  );
}
const sr2 = StyleSheet.create({
  wrap: { alignItems: "center", gap: 8 },
  ring: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: C.bgCard,
  },
  score: { fontSize: 28, fontWeight: "900", lineHeight: 30 },
  sub: { color: C.creamDim, fontSize: 10, fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
});

// ── Fitzpatrick → plain tone label ───────────────────────────
function toneLabel(fitzpatrick) {
  const map = {
    III: "Light-medium brown tone",
    IV:  "Medium-deep brown tone",
    V:   "Deep brown tone",
    VI:  "Very deep brown / ebony tone",
  };
  return map[fitzpatrick] || "Rich melanin tone";
}

// ── Skin type card ────────────────────────────────────────────
function SkinTypeCard({ skinType, confidence, fitzpatrick }) {
  const TYPES = {
    Oily: {
      color: "#E8A020",
      icon: "💧",
      desc: "Your skin produces excess oil, especially around the nose and forehead. Your routine should balance oil without drying you out.",
    },
    Dry: {
      color: "#5BA4E8",
      icon: "🌵",
      desc: "Your skin needs more moisture. It may feel tight or look dull. A rich hydrating routine will help your skin feel soft and protected.",
    },
    Combination: {
      color: "#C8860A",
      icon: "◎",
      desc: "Your T-zone (nose, forehead) is oilier while your cheeks may feel drier. Your routine needs to gently balance both areas.",
    },
    Normal: {
      color: "#5DBE8A",
      icon: "✦",
      desc: "Your skin is well-balanced — not too oily or dry. Focus on maintaining what's working and protecting against sun damage.",
    },
  };
  const key = skinType ? skinType.charAt(0).toUpperCase() + skinType.slice(1).toLowerCase() : 'Normal';
  const cfg = TYPES[key] || TYPES.Normal;
  return (
    <View style={[stc.card, { borderColor: `${cfg.color}40` }]}>
      <View
        style={[
          stc.iconBox,
          { backgroundColor: `${cfg.color}18`, borderColor: `${cfg.color}40` },
        ]}
      >
        <Text style={{ fontSize: 22 }}>{cfg.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Text style={[stc.typeName, { color: cfg.color }]}>
            {key} Skin
          </Text>
          <View style={[stc.confidenceBadge, { backgroundColor: `${cfg.color}18`, borderColor: `${cfg.color}40` }]}>
            <Text style={[stc.confidenceText, { color: cfg.color }]}>
              {confidence}% match
            </Text>
          </View>
        </View>
        <Text style={stc.desc}>{cfg.desc}</Text>
        {fitzpatrick && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: "rgba(200,134,10,0.08)", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "rgba(200,134,10,0.20)" }}>
            <Text style={{ fontSize: 13 }}>🎨</Text>
            <Text style={{ color: C.creamDim, fontSize: 12 }}>{toneLabel(fitzpatrick)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
const stc = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: C.bgCard,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  typeName: { fontSize: 18, fontWeight: "900" },
  confidenceBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confidenceText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  desc: { color: C.creamDim, fontSize: 13, lineHeight: 19 },
});

// ── Severity label → plain English ───────────────────────────
function severityLabel(severity) {
  if (!severity) return 'Minor';
  const s = severity.toLowerCase();
  if (s === 'severe')   return 'Needs attention';
  if (s === 'moderate') return 'Worth addressing';
  return 'Minor';
}

// ── Condition card ────────────────────────────────────────────
function ConditionCard({ item, index }) {
  const [expanded, setExpanded] = useState(false);
  const expandH = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    setExpanded((e) => {
      Animated.timing(expandH, {
        toValue: e ? 0 : 1,
        duration: 260,
        useNativeDriver: false,
      }).start();
      return !e;
    });
  };

  const sev = item.severity?.toLowerCase();
  const sevColor = sev === 'severe' ? C.error : sev === 'moderate' ? C.warn : C.success;
  const sevBg    = sev === 'severe' ? C.errorPale : sev === 'moderate' ? C.warnPale : C.successPale;
  // Affected areas as plain text
  const areas = Array.isArray(item.affectedAreas) && item.affectedAreas.length > 0
    ? item.affectedAreas.join(', ')
    : null;

  const detailHeight = expandH.interpolate({ inputRange: [0, 1], outputRange: [0, 90] });

  return (
    <FadeSlide delay={index * 80} style={{ marginBottom: 10 }}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.85}>
        <View style={cc.card}>
          <View style={cc.row}>
            <View style={[cc.iconBox, { backgroundColor: `${sevColor}18`, borderColor: `${sevColor}35` }]}>
              <Text style={{ color: sevColor, fontSize: 16 }}>◉</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={cc.name}>{item.name}</Text>
              {areas && <Text style={cc.areaText}>On your {areas}</Text>}
              <View style={[cc.sevBadge, { backgroundColor: sevBg, borderColor: `${sevColor}40` }]}>
                <Text style={[cc.sevText, { color: sevColor }]}>{severityLabel(item.severity)}</Text>
              </View>
            </View>
            <Text style={cc.expand}>{expanded ? "−" : "+"}</Text>
          </View>
          <Animated.View style={{ height: detailHeight, overflow: "hidden" }}>
            <View style={cc.detail}>
              <Text style={cc.detailText}>💡 {item.melaninNote}</Text>
            </View>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </FadeSlide>
  );
}
const cc = StyleSheet.create({
  card: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
  },
  row:      { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox:  { width: 36, height: 36, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  name:     { color: C.cream, fontSize: 14, fontWeight: "700", marginBottom: 3 },
  areaText: { color: C.creamDim, fontSize: 11, marginBottom: 4 },
  sevBadge: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  sevText:  { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  expand:   { color: C.gold, fontSize: 20, fontWeight: "300", width: 24, textAlign: "center" },
  detail:   { paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, marginTop: 12 },
  detailText: { color: C.creamDim, fontSize: 12, lineHeight: 18 },
});

// ── Dark spot risk → plain label ─────────────────────────────
function darkSpotLabel(pihRisk) {
  const r = (pihRisk || '').toLowerCase();
  if (r === 'high')     return { text: 'High risk — dark spots can form easily', short: 'High' };
  if (r === 'moderate') return { text: 'Moderate risk — take care to avoid irritation', short: 'Moderate' };
  return { text: 'Low risk — your skin handles marks well', short: 'Low' };
}

// ── Skin Tips card (replaces jargon-heavy Melanin Insights) ──
function SkinTipsCard({ insights }) {
  const pihColors = { low: C.success, moderate: C.warn, high: C.error };
  const riskKey   = (insights.pihRisk || 'moderate').toLowerCase();
  const color     = pihColors[riskKey] || C.warn;
  const darkSpot  = darkSpotLabel(insights.pihRisk);
  // ── FIX: use spfGuidance (correct field name) not spfNote ──
  const spfText   = insights.spfGuidance || insights.spfNote || 'Apply SPF 50 every morning — sun protection is essential for dark skin.';
  const flags     = Array.isArray(insights.sensitivityFlags) ? insights.sensitivityFlags : [];

  return (
    <FadeSlide delay={200} style={mi.wrap}>
      <View style={mi.card}>
        {/* Dark spot risk */}
        <View style={mi.row}>
          <View style={mi.rowLeft}>
            <Text style={mi.rowIcon}>◑</Text>
            <View>
              <Text style={mi.rowLabel}>Dark Spot Risk</Text>
              <Text style={[mi.rowValue, { color }]}>{darkSpot.short}</Text>
            </View>
          </View>
          <View style={[mi.riskBar, { borderColor: `${color}40` }]}>
            <View style={[mi.riskFill, { width: riskKey === 'low' ? '30%' : riskKey === 'moderate' ? '60%' : '90%', backgroundColor: color }]} />
          </View>
        </View>
        <Text style={mi.riskExplain}>{darkSpot.text}</Text>

        <View style={mi.divider} />

        {/* SPF */}
        <View style={mi.infoRow}>
          <Text style={mi.infoIcon}>☀</Text>
          <View style={{ flex: 1 }}>
            <Text style={mi.infoLabel}>Sun Protection</Text>
            <Text style={mi.infoText}>{spfText}</Text>
          </View>
        </View>

        {/* Ingredients to watch */}
        {flags.length > 0 && (
          <>
            <View style={mi.divider} />
            <View style={mi.infoRow}>
              <Text style={mi.infoIcon}>⚠</Text>
              <View style={{ flex: 1 }}>
                <Text style={mi.infoLabel}>Ingredients to avoid</Text>
                <Text style={mi.infoText}>{flags.join(',  ')}</Text>
              </View>
            </View>
          </>
        )}
      </View>
    </FadeSlide>
  );
}
const mi = StyleSheet.create({
  wrap: { marginBottom: 0 },
  card: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowIcon: { color: C.gold, fontSize: 20 },
  rowLabel: { color: C.creamDim, fontSize: 11, fontWeight: "600", marginBottom: 3 },
  rowValue: { fontSize: 16, fontWeight: "900" },
  riskBar: {
    width: 80,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  riskFill:    { height: "100%", borderRadius: 4 },
  riskExplain: { color: C.creamDim, fontSize: 12, lineHeight: 17, marginBottom: 4 },
  divider:     { height: 1, backgroundColor: C.border, marginVertical: 14 },
  infoRow:     { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoIcon:    { fontSize: 16, marginTop: 1 },
  infoLabel:   { color: C.creamDim, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  infoText:    { color: C.cream, fontSize: 12, lineHeight: 18 },
});

// ── Ingredient chips ──────────────────────────────────────────
function IngredientChips({ items, type }) {
  const isAvoid = type === "avoid";
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {(items || []).map((ing, i) => (
        <View key={i} style={[ic.chip, isAvoid && ic.chipAvoid]}>
          <Text style={[ic.icon, isAvoid && ic.iconAvoid]}>
            {isAvoid ? "✕" : "✓"}
          </Text>
          <Text style={[ic.text, isAvoid && ic.textAvoid]}>{ing}</Text>
        </View>
      ))}
    </View>
  );
}
const ic = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.goldPale,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipAvoid: {
    backgroundColor: "rgba(224,92,58,0.10)",
    borderColor: "rgba(224,92,58,0.30)",
  },
  icon: { color: C.success, fontSize: 10, fontWeight: "900" },
  iconAvoid: { color: C.error },
  text: { color: C.creamDim, fontSize: 12, fontWeight: "600" },
  textAvoid: { color: "rgba(224,92,58,0.80)" },
});

// ── Routine preview ───────────────────────────────────────────
function RoutinePreview({ routine }) {
  const [tab, setTab] = useState("morning");
  const rawSteps =
    tab === "morning" ? routine?.morning || [] : routine?.night || [];
  const steps = rawSteps.map((s) =>
    typeof s === "string" ? s : s.product || s.action || s,
  );

  return (
    <FadeSlide delay={200} style={rp2.wrap}>
      <View style={rp2.tabs}>
        {["morning", "night"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[rp2.tab, tab === t && rp2.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[rp2.tabText, tab === t && rp2.tabTextActive]}>
              {t === "morning" ? "☀  AM" : "🌙  PM"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={rp2.steps}>
        {steps.map((step, i) => (
          <View key={i} style={rp2.stepRow}>
            <View style={rp2.stepNum}>
              <Text style={rp2.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={rp2.stepText}>{step}</Text>
          </View>
        ))}
        {steps.length === 0 && (
          <Text
            style={{
              color: C.creamDim,
              fontSize: 13,
              textAlign: "center",
              paddingVertical: 12,
            }}
          >
            No steps yet — check the Routine tab after your scan.
          </Text>
        )}
      </View>
    </FadeSlide>
  );
}
const rp2 = StyleSheet.create({
  wrap: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    overflow: "hidden",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: {
    backgroundColor: C.goldPale,
    borderBottomWidth: 2,
    borderBottomColor: C.gold,
  },
  tabText: { color: C.creamDim, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: C.gold, fontWeight: "700" },
  steps: { padding: 16, gap: 10 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: C.goldPale,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: C.gold, fontSize: 11, fontWeight: "800" },
  stepText: { color: C.cream, fontSize: 13, fontWeight: "600", flex: 1 },
});

// ── Disclaimer banner ─────────────────────────────────────────
function DisclaimerBanner({ text }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(200,134,10,0.06)",
        borderWidth: 1,
        borderColor: "rgba(200,134,10,0.20)",
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
      }}
    >
      <Text
        style={{
          color: "rgba(200,134,10,0.60)",
          fontSize: 11,
          lineHeight: 17,
          textAlign: "center",
          letterSpacing: 0.2,
        }}
      >
        ⚕ {text}
      </Text>
    </View>
  );
}

// ── Loading skeleton ──────────────────────────────────────────
function LoadingSkeleton() {
  const op = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(op, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <AfricanBG>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator
          size="large"
          color={C.gold}
          style={{ marginBottom: 16 }}
        />
        <Animated.Text style={{ color: C.creamDim, fontSize: 14, opacity: op }}>
          Loading your results...
        </Animated.Text>
      </View>
    </AfricanBG>
  );
}

// ── Face Not Found screen ─────────────────────────────────────
function FaceNotFoundScreen({ onRetry, onHome }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <AfricanBG>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={fn.wrap}>
        {/* Animated face icon */}
        <Animated.View style={[fn.iconWrap, { transform: [{ scale: pulse }] }]}>
          <View style={fn.iconRing}>
            <Text style={fn.icon}>◎</Text>
          </View>
          {/* Corner brackets around the icon */}
          {[
            { top: 0, left: 0,  borderRightWidth: 0, borderBottomWidth: 0 },
            { top: 0, right: 0, borderLeftWidth:  0, borderBottomWidth: 0 },
            { bottom: 0, left: 0,  borderRightWidth: 0, borderTopWidth: 0 },
            { bottom: 0, right: 0, borderLeftWidth:  0, borderTopWidth: 0 },
          ].map((corner, i) => (
            <View key={i} style={[fn.corner, corner]} />
          ))}
        </Animated.View>

        {/* Text */}
        <FadeSlide delay={100}>
          <Text style={fn.title}>No Face Detected</Text>
        </FadeSlide>
        <FadeSlide delay={200}>
          <Text style={fn.body}>
            Our AI couldn't find a face in your photo. For the best results,
            make sure your face is centred in the frame, well-lit, and the
            camera is steady before scanning.
          </Text>
        </FadeSlide>

        {/* Tips */}
        <FadeSlide delay={320} style={fn.tipsCard}>
          {[
            { icon: "💡", tip: "Use good natural light — avoid harsh shadows" },
            { icon: "◎",  tip: "Centre your face fully inside the oval guide" },
            { icon: "🤳", tip: "Hold the phone at eye level, arm's length away" },
            { icon: "🚫", tip: "Remove sunglasses, hats or anything covering your face" },
          ].map(({ icon, tip }, i) => (
            <View key={i} style={fn.tipRow}>
              <Text style={fn.tipIcon}>{icon}</Text>
              <Text style={fn.tipText}>{tip}</Text>
            </View>
          ))}
        </FadeSlide>

        {/* CTAs */}
        <FadeSlide delay={480} style={{ width: "100%" }}>
          <GoldButton
            label="Try Again"
            onPress={onRetry}
            style={{ marginBottom: 12 }}
          />
          <TouchableOpacity style={fn.ghostBtn} onPress={onHome}>
            <Text style={fn.ghostBtnText}>Go Home</Text>
          </TouchableOpacity>
        </FadeSlide>
      </View>
    </AfricanBG>
  );
}
const fn = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  iconWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: "rgba(224,92,58,0.55)",
    backgroundColor: "rgba(224,92,58,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { color: C.error, fontSize: 38 },
  corner: {
    position: "absolute",
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: C.error,
    borderRadius: 3,
  },
  title: {
    color: C.cream,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  body: {
    color: C.creamDim,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
  },
  tipsCard: {
    width: "100%",
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    marginBottom: 32,
  },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  tipIcon: { fontSize: 16, width: 24, textAlign: "center" },
  tipText: { color: C.creamDim, fontSize: 13, lineHeight: 19, flex: 1 },
  ghostBtn: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  ghostBtnText: { color: C.creamDim, fontSize: 15, fontWeight: "600" },
});

// ─────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────
export default function ScanResultsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { scanId, result: passedResult } = route.params || {};

  const [result,      setResult]      = useState(passedResult || null);
  const [loading,     setLoading]     = useState(!passedResult);
  const [error,       setError]       = useState(null);
  const [faceError,   setFaceError]   = useState(false);

  // ── Detect face-not-found from a passed result ────────────
  // ScanProcessingScreen may pass result directly. If the backend
  // returned NO_FACE_DETECTED we receive it as an error string.
  useEffect(() => {
    if (passedResult && passedResult === 'NO_FACE_DETECTED') {
      setFaceError(true);
      setLoading(false);
    }
  }, []);

  // ── Fetch scan by ID if not passed directly ───────────────
  const fetchScan = useCallback(async () => {
    if (!scanId) {
      setError("No scan ID provided.");
      setLoading(false);
      return;
    }
    try {
      const data = await ScanAPI.getScan(scanId);
      setResult(data);
    } catch (err) {
      // Check for the specific face-not-detected code
      if (err.message === 'NO_FACE_DETECTED' || err.code === 'NO_FACE_DETECTED') {
        setFaceError(true);
      } else {
        setError(err.message || "Could not load scan results.");
      }
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useEffect(() => {
    if (!passedResult) fetchScan();
  }, []);

  // ── Loading ───────────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;

  // ── Face not detected ─────────────────────────────────────
  if (faceError) {
    return (
      <FaceNotFoundScreen
        onRetry={() => navigation.navigate("ScanCamera")}
        onHome={() => navigation.navigate("Main")}
      />
    );
  }

  // ── Generic error ─────────────────────────────────────────
  if (error || !result) {
    return (
      <AfricanBG>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <Text style={{ color: C.error, fontSize: 32, marginBottom: 16 }}>
            ⚠
          </Text>
          <Text
            style={{
              color: C.cream,
              fontSize: 20,
              fontWeight: "800",
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            Could Not Load Results
          </Text>
          <Text
            style={{
              color: C.creamDim,
              fontSize: 14,
              lineHeight: 22,
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            {error || "Results unavailable. Please try scanning again."}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: C.gold,
              borderRadius: 14,
              paddingVertical: 16,
              paddingHorizontal: 40,
              marginBottom: 14,
            }}
            onPress={() => navigation.navigate("ScanCamera")}
          >
            <Text
              style={{
                color: "#0F0500",
                fontSize: 15,
                fontWeight: "800",
                letterSpacing: 1,
              }}
            >
              Try Again
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Main")}>
            <Text style={{ color: C.creamDim, fontSize: 14 }}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </AfricanBG>
    );
  }

  // ── Normalise API fields ──────────────────────────────────
  const rawSkinType = result.skinType || result.skin_type || "Normal";
  const skinType = rawSkinType.charAt(0).toUpperCase() + rawSkinType.slice(1).toLowerCase();
  const confidence = typeof result.confidence === 'number' ? result.confidence : 85;
  const score = result.overallScore ?? result.score ?? 0;
  const fitzpatrick = result.fitzpatrickEst || null;
  const conditions = Array.isArray(result.conditions) ? result.conditions : [];
  const insights = result.melaninInsights || {
    pihRisk: "Moderate",
    spfGuidance: "Apply SPF 50 every morning — this is the single most important step for dark skin.",
    sensitivityFlags: ["Fragrance", "Alcohol Denat."],
  };
  // Pull ingredients from top-level (where backend puts them) or insights
  const topIngredients = result.goodIngredients || insights.goodIngredients || result.topIngredients || [];
  const avoidIngredients = result.avoidIngredients || insights.avoidIngredients || [];
  // ✅ FIX: backend returns 'result.routine' (Scan schema field), NOT 'routinePreview'.
  //  Previously this was always empty, breaking the routine preview section.
  const routineSteps  = Array.isArray(result.routine) ? result.routine : [];
  // Build a morning/night shape from the flat steps array for RoutinePreview
  const routinePreview = {
    morning: routineSteps.filter(s => s.timeOfDay === 'morning' || s.timeOfDay === 'both'),
    night:   routineSteps.filter(s => s.timeOfDay === 'night'   || s.timeOfDay === 'both'),
  };
  const disclaimer =
    result.disclaimer ||
    "This is a cosmetic, observational analysis only. Not a medical diagnosis.";
  // ── Plain-language summary sentence ────────────────────────
  const scoreTier = score >= 75 ? 'looking healthy' : score >= 55 ? 'doing well' : 'needing some care';
  const summarySentence = `Your skin is ${skinType.toLowerCase()} type and ${scoreTier} (${score}/100).`;
  const scanDate = result.createdAt
    ? new Date(result.createdAt).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return (
    <AfricanBG>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <FadeSlide delay={0} style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={s.title}>Your Results</Text>
            <Text style={s.date}>{scanDate}</Text>
          </View>
          <TouchableOpacity
            style={s.shareBtn}
            onPress={() => navigation.navigate("ScanReport", { result })}
          >
            <Text style={s.shareIcon}>↗</Text>
          </TouchableOpacity>
        </FadeSlide>

        {/* Summary hero card */}
        <FadeSlide delay={100} style={s.heroCard}>
          <View style={s.heroLeft}>
            <View style={s.heroTag}>
              <View style={s.heroTagDot} />
              <Text style={s.heroTagText}>SCAN COMPLETE</Text>
            </View>
            <Text style={s.heroTitle}>Your Skin{"\n"}Report</Text>
            <Text style={s.heroSub}>{summarySentence}</Text>
          </View>
          <ScoreRing score={score} />
        </FadeSlide>

        {/* Disclaimer */}
        <DisclaimerBanner text={disclaimer} />

        {/* Skin type */}
        <FadeSlide delay={200} style={s.section}>
          <SectionLabel text="Skin Type" sub="Identified from image analysis" />
          <SkinTypeCard skinType={skinType} confidence={confidence} fitzpatrick={fitzpatrick} />
        </FadeSlide>

        {/* Conditions */}
        {conditions.length > 0 && (
          <FadeSlide delay={280} style={s.section}>
            <SectionLabel
              text="What We Noticed"
              sub="Tap each one to learn what it means for you"
            />
            {conditions.map((cond, i) => (
              <ConditionCard key={i} item={cond} index={i} />
            ))}
          </FadeSlide>
        )}

        {/* Skin Tips */}
        <FadeSlide delay={360} style={s.section}>
          <SectionLabel
            text="Skin Tips For You"
            sub="Based on what we saw in your photo"
          />
          <SkinTipsCard insights={insights} />
        </FadeSlide>

        {/* Recommended ingredients */}
        {topIngredients.length > 0 && (
          <FadeSlide delay={440} style={s.section}>
            <SectionLabel text="Good For Your Skin" sub="Ingredients to look for on product labels" />
            <IngredientChips items={topIngredients} type="use" />
          </FadeSlide>
        )}

        {/* Avoid */}
        {avoidIngredients.length > 0 && (
          <FadeSlide delay={500} style={s.section}>
            <SectionLabel
              text="Ingredients to Avoid"
              sub="These can cause dark spots or irritation on your skin type"
            />
            <IngredientChips items={avoidIngredients} type="avoid" />
          </FadeSlide>
        )}

        {/* Routine preview */}
        <FadeSlide delay={560} style={s.section}>
          <SectionLabel
            text="Your Routine Preview"
            sub="Full routine available in the Routine tab"
          />
          <RoutinePreview routine={routinePreview} />
        </FadeSlide>

        {/* CTAs */}
        <FadeSlide delay={640} style={s.ctaBlock}>
          <GoldButton
            label="View Full Report"
            onPress={() => navigation.navigate("ScanReport", { result })}
            style={{ marginBottom: 12 }}
          />
          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={() => navigation.navigate("Routine")}
          >
            <Text style={s.secondaryBtnText}>Go to My Routine →</Text>
          </TouchableOpacity>
        </FadeSlide>

        <View style={{ height: 80 }} />
      </ScrollView>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop: 60, paddingHorizontal: 22 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { color: C.cream, fontSize: 18 },
  title: {
    color: C.cream,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  date: { color: C.creamDim, fontSize: 12, marginTop: 2 },
  shareBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.goldPale,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  shareIcon: { color: C.gold, fontSize: 18, fontWeight: "700" },
  heroCard: {
    backgroundColor: C.bgCard,
    borderWidth: 1.5,
    borderColor: C.borderBright,
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  heroLeft: { flex: 1 },
  heroTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  heroTagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold },
  heroTagText: {
    color: C.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: C.cream,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    marginBottom: 6,
  },
  heroSub: { color: C.creamDim, fontSize: 12 },
  section: { marginBottom: 26 },
  ctaBlock: { marginBottom: 10 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryBtnText: { color: C.cream, fontSize: 15, fontWeight: "600" },
});