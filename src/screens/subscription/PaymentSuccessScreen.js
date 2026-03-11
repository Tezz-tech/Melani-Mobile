// src/screens/subscription/PaymentSuccessScreen.js
//
//  API CONNECTIONS:
//  ─────────────────────────────────────────────────────────────
//  • Receives confirmed { plan, billing, amount } from PaymentScreen
//    (payment already verified before navigation — no extra API call needed)
//  • useAuth().updateUser() already called in PaymentScreen after verify
//  • SubscriptionAPI.cancel() available from "Manage" → ProfileScreen
//
//  If you land here from a Paystack webhook firing before the frontend
//  verify call, the plan is already active in the DB. The screen is
//  purely presentational — no additional network calls needed.
//
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../../store/AuthContext";

const { width: W, height: H } = Dimensions.get("window");

const C = {
  bg: "#0B0300",
  bgCard: "#180900",
  bgCard2: "#1E0C02",
  border: "rgba(200,134,10,0.22)",
  borderBright: "rgba(200,134,10,0.55)",
  gold: "#C8860A",
  goldLight: "#E8A020",
  goldPale: "rgba(200,134,10,0.14)",
  cream: "#F5DEB3",
  creamDim: "rgba(245,222,179,0.55)",
  creamFaint: "rgba(245,222,179,0.18)",
  success: "#5DBE8A",
  successPale: "rgba(93,190,138,0.12)",
  elite: "#E8D48A",
};

// ─────────────────────────────────────────────────────────────
//  Confetti
// ─────────────────────────────────────────────────────────────
function ConfettiParticle({ x, delay, color }) {
  const y = useRef(new Animated.Value(-20)).current;
  const op = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(y, {
          toValue: H * 0.55 + Math.random() * 100,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(rot, {
          toValue: 3 + Math.random() * 4,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(op, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(op, {
            toValue: 0,
            duration: 600,
            delay: 1400,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(sc, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
  }, []);
  const rotate = rot.interpolate({
    inputRange: [0, 4],
    outputRange: ["0deg", "720deg"],
  });
  const SIZE = 6 + Math.floor(Math.random() * 6);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: 0,
        width: SIZE,
        height: SIZE,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? SIZE / 2 : 2,
        opacity: op,
        transform: [{ translateY: y }, { rotate }, { scale: sc }],
      }}
    />
  );
}
const CONFETTI_COLORS = [
  "#C8860A",
  "#E8A020",
  "#5DBE8A",
  "#F5DEB3",
  "#E8D48A",
  "#C86020",
];
const CONFETTI = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.random() * W,
  delay: Math.random() * 800,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

// ─────────────────────────────────────────────────────────────
//  Burst lines
// ─────────────────────────────────────────────────────────────
function BurstLines({ triggered }) {
  const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
  const anims = useRef(
    ANGLES.map(() => ({
      len: new Animated.Value(0),
      op: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    if (triggered) {
      ANGLES.forEach((_, i) => {
        setTimeout(() => {
          Animated.parallel([
            Animated.spring(anims[i].len, {
              toValue: 1,
              friction: 5,
              tension: 50,
              useNativeDriver: false,
            }),
            Animated.sequence([
              Animated.timing(anims[i].op, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(anims[i].op, {
                toValue: 0,
                duration: 400,
                delay: 300,
                useNativeDriver: true,
              }),
            ]),
          ]).start();
        }, i * 40);
      });
    }
  }, [triggered]);

  return (
    <View
      style={{
        position: "absolute",
        width: W,
        height: W,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {ANGLES.map((angle, i) => {
        const width = anims[i].len.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 60],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              width,
              height: 2,
              borderRadius: 1,
              backgroundColor: C.gold,
              opacity: anims[i].op,
              transform: [{ rotate: `${angle}deg` }, { translateX: 30 }],
            }}
          />
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
//  Success orb
// ─────────────────────────────────────────────────────────────
function SuccessOrb({ planColor }) {
  const scale = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0.8)).current;
  const ring2 = useRef(new Animated.Value(0.6)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.15,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setBurst(true);
      Animated.timing(check, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.4,
            duration: 1600,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }, 600);
    Animated.loop(
      Animated.sequence([
        Animated.timing(ring1, {
          toValue: 1.1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(ring1, {
          toValue: 0.8,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ring2, {
            toValue: 1.2,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(ring2, {
            toValue: 0.6,
            duration: 1600,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }, 500);
  }, []);

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        height: 220,
        marginBottom: 10,
      }}
    >
      <BurstLines triggered={burst} />
      <Animated.View
        style={[so.glow, { opacity: glow, backgroundColor: planColor }]}
      />
      <Animated.View
        style={[
          so.ring2,
          { borderColor: `${planColor}20`, transform: [{ scale: ring2 }] },
        ]}
      />
      <Animated.View
        style={[
          so.ring1,
          { borderColor: `${planColor}35`, transform: [{ scale: ring1 }] },
        ]}
      />
      <Animated.View
        style={[
          so.orb,
          {
            borderColor: planColor,
            backgroundColor: `${planColor}18`,
            transform: [{ scale }],
            shadowColor: planColor,
          },
        ]}
      >
        <Animated.Text
          style={[
            so.checkmark,
            { opacity: check, transform: [{ scale: check }] },
          ]}
        >
          ✓
        </Animated.Text>
      </Animated.View>
    </View>
  );
}
const so = StyleSheet.create({
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
  },
  ring2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
  },
  ring1: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
  },
  orb: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 14,
  },
  checkmark: {
    color: C.success,
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 52,
  },
});

// ─────────────────────────────────────────────────────────────
//  Features unlocked
// ─────────────────────────────────────────────────────────────
function UnlockedFeature({ icon, text, delay }) {
  const op = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(-20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(tx, {
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
      style={[uf.row, { opacity: op, transform: [{ translateX: tx }] }]}
    >
      <View style={uf.iconBox}>
        <Text style={uf.icon}>{icon}</Text>
      </View>
      <Text style={uf.text}>{text}</Text>
      <Text style={uf.check}>✓</Text>
    </Animated.View>
  );
}
const uf = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(93,190,138,0.12)",
    borderWidth: 1,
    borderColor: "rgba(93,190,138,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 14 },
  text: { flex: 1, color: C.cream, fontSize: 13, fontWeight: "500" },
  check: { color: C.success, fontSize: 14, fontWeight: "900" },
});

// ─────────────────────────────────────────────────────────────
//  Next step card
// ─────────────────────────────────────────────────────────────
function NextStepCard({ icon, step, title, desc, onPress, delay }) {
  const scale = useRef(new Animated.Value(1)).current;
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, {
        toValue: 1,
        duration: 480,
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
      style={{ opacity: op, transform: [{ translateY: ty }], marginBottom: 10 }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
        }
      >
        <Animated.View style={[ns.card, { transform: [{ scale }] }]}>
          <View style={ns.stepBadge}>
            <Text style={ns.stepNum}>{step}</Text>
          </View>
          <View style={ns.iconBox}>
            <Text style={{ fontSize: 18 }}>{icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ns.title}>{title}</Text>
            <Text style={ns.desc}>{desc}</Text>
          </View>
          <Text style={ns.arrow}>→</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const ns = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: C.goldPale,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: -6,
    left: -6,
    zIndex: 1,
  },
  stepNum: { color: C.gold, fontSize: 10, fontWeight: "900" },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(200,134,10,0.10)",
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: C.cream, fontSize: 14, fontWeight: "700", marginBottom: 3 },
  desc: { color: C.creamDim, fontSize: 12, lineHeight: 17 },
  arrow: { color: C.gold, fontSize: 18 },
});

// ─────────────────────────────────────────────────────────────
//  Primary button
// ─────────────────────────────────────────────────────────────
function PrimaryButton({ label, icon, color, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(-W)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: W,
          duration: 2200,
          delay: 600,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: -W,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 12 }}>
      <TouchableOpacity
        style={[prib.btn, { backgroundColor: color, shadowColor: color }]}
        onPress={onPress}
        activeOpacity={0.9}
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
        <Animated.View
          style={[prib.shimmer, { transform: [{ translateX: shimmer }] }]}
        />
        <Text style={prib.icon}>{icon}</Text>
        <Text style={prib.label}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
const prib = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 50,
  },
  icon: { color: "#0B0300", fontSize: 18 },
  label: {
    color: "#0B0300",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});

// ─────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────
export default function PaymentSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const {
    plan = { id: "pro", name: "Pro", color: C.gold, icon: "◈" },
    billing = "monthly",
    amount = "₦2,500",
  } = route.params || {};

  // Use live user data from AuthContext if available (more authoritative)
  const activePlan = user?.subscription?.plan || plan.id;
  const planColor = plan?.color || C.gold;
  const renewalDate = user?.subscription?.expiresAt
    ? new Date(user.subscription.expiresAt).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date(
        Date.now() + (billing === "yearly" ? 365 : 30) * 24 * 3600 * 1000,
      ).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const UNLOCKED = {
    pro: [
      { icon: "◉", text: "Unlimited skin scans" },
      { icon: "◈", text: "Full condition analysis & melanin insights" },
      { icon: "✦", text: "African product recommendations" },
      { icon: "◎", text: "Progress tracking & history" },
      { icon: "↗", text: "Export & share scan reports" },
    ],
    elite: [
      { icon: "◉", text: "Everything in Pro, unlocked" },
      { icon: "✦", text: "Priority AI model access" },
      { icon: "◎", text: "Monthly 1-on-1 skin consultation" },
      { icon: "◈", text: "Custom ingredient formula" },
      { icon: "💎", text: "Family account — 3 users" },
    ],
  };
  const unlocked = UNLOCKED[plan?.id] || UNLOCKED.pro;

  const globalOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(globalOp, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleGoHome = () =>
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  const handleScan = () => {
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    setTimeout(() => navigation.navigate("ScanCamera"), 300);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Confetti */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {CONFETTI.map((p) => (
          <ConfettiParticle
            key={p.id}
            x={p.x}
            delay={p.delay}
            color={p.color}
          />
        ))}
      </View>

      {/* Glows */}
      <View style={[s.glowA, { backgroundColor: planColor }]} />
      <View style={s.glowB} />
      <View style={[s.stripe, { top: H * 0.06 }]} />

      <Animated.ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        style={{ opacity: globalOp }}
      >
        {/* Success orb */}
        <SuccessOrb planColor={planColor} />

        {/* Headline */}
        <View style={s.headlineBlock}>
          <View style={s.successTag}>
            <View style={s.tagDot} />
            <Text style={s.tagText}>PAYMENT SUCCESSFUL</Text>
          </View>
          <Text style={s.headline}>
            Welcome to{"\n"}
            <Text style={{ color: planColor }}>
              {plan?.name || "Pro"} Plan
            </Text>{" "}
            ✦
          </Text>
          <Text style={s.subtext}>
            Your skin transformation starts now. Everything is unlocked and
            ready.
          </Text>
          <View style={s.receiptRow}>
            <Text style={s.receiptLabel}>Amount Paid</Text>
            <Text style={[s.receiptAmount, { color: planColor }]}>
              {amount}
            </Text>
            <Text style={s.receiptPeriod}>
              /{billing === "yearly" ? "year" : "month"}
            </Text>
          </View>
        </View>

        {/* Features unlocked */}
        <View style={s.unlockedCard}>
          <View style={s.unlockedHeader}>
            <View style={s.unlockedDot} />
            <Text style={s.unlockedTitle}>Features Unlocked</Text>
            <View style={s.unlockedCountBox}>
              <Text style={s.unlockedCount}>{unlocked.length}</Text>
            </View>
          </View>
          {unlocked.map((f, i) => (
            <UnlockedFeature
              key={i}
              icon={f.icon}
              text={f.text}
              delay={400 + i * 80}
            />
          ))}
        </View>

        {/* Next steps */}
        <View style={{ marginBottom: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 4,
                height: 18,
                borderRadius: 2,
                backgroundColor: C.gold,
              }}
            />
            <Text style={{ color: C.cream, fontSize: 17, fontWeight: "800" }}>
              What to do next
            </Text>
          </View>
          <NextStepCard
            icon="◉"
            step={1}
            title="Take Your First Pro Scan"
            desc="Experience full condition analysis and melanin-specific insights."
            onPress={handleScan}
            delay={700}
          />
          <NextStepCard
            icon="✦"
            step={2}
            title="Review Your Routine"
            desc="Your personalised AM + PM routine is ready in the Routine tab."
            onPress={handleGoHome}
            delay={780}
          />
          <NextStepCard
            icon="◈"
            step={3}
            title="Enable Reminders"
            desc="Set routine reminders and monthly scan alerts from Settings."
            onPress={handleGoHome}
            delay={860}
          />
        </View>

        {/* Receipt */}
        <View style={s.receiptCard}>
          {[
            { label: "Plan", value: `${plan?.name} Plan` },
            {
              label: "Billing",
              value: billing === "yearly" ? "Annual" : "Monthly",
            },
            { label: "Amount Charged", value: amount, highlight: true },
            {
              label: "Date",
              value: new Date().toLocaleDateString("en-NG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            },
            { label: "Next Renewal", value: renewalDate },
          ].map((row, i, arr) => (
            <View key={i}>
              <View style={s.receiptCardRow}>
                <Text style={s.rLabel}>{row.label}</Text>
                <Text style={[s.rVal, row.highlight && { color: planColor }]}>
                  {row.value}
                </Text>
              </View>
              {i < arr.length - 1 && <View style={s.rDivider} />}
            </View>
          ))}
        </View>

        {/* CTAs */}
        <View style={{ marginBottom: 24, marginTop: 24 }}>
          <PrimaryButton
            label="Start My First Pro Scan"
            icon="◉"
            color={planColor}
            onPress={handleScan}
          />
          <TouchableOpacity style={s.ghostBtn} onPress={handleGoHome}>
            <Text style={s.ghostBtnText}>Go to Home Dashboard</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={{ alignItems: "center", paddingBottom: 10, gap: 5 }}>
          <Text
            style={{
              color: "rgba(200,134,10,0.35)",
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 2,
            }}
          >
            MELANIN SCAN · {plan?.name?.toUpperCase()} MEMBER
          </Text>
          <Text style={{ color: "rgba(245,222,179,0.18)", fontSize: 10 }}>
            Built for melanin-rich skin, by design.
          </Text>
        </View>

        <View style={{ height: 60 }} />
      </Animated.ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop: 60, paddingHorizontal: 22 },
  glowA: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    opacity: 0.09,
    top: -120,
    left: (W - 340) / 2,
  },
  glowB: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#5DBE8A",
    opacity: 0.04,
    bottom: -80,
    right: -60,
  },
  stripe: {
    position: "absolute",
    width: W,
    height: 1,
    backgroundColor: "rgba(200,134,10,0.14)",
  },

  headlineBlock: { alignItems: "center", marginBottom: 28 },
  successTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(93,190,138,0.12)",
    borderWidth: 1,
    borderColor: "rgba(93,190,138,0.35)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 18,
  },
  tagDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.success,
  },
  tagText: {
    color: C.success,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  headline: {
    color: C.cream,
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 42,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  subtext: {
    color: C.creamDim,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  receiptLabel: {
    color: C.creamDim,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
  },
  receiptAmount: { fontSize: 24, fontWeight: "900" },
  receiptPeriod: { color: C.creamDim, fontSize: 12 },

  unlockedCard: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 26,
  },
  unlockedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  unlockedDot: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: C.success,
  },
  unlockedTitle: { flex: 1, color: C.cream, fontSize: 16, fontWeight: "800" },
  unlockedCountBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(93,190,138,0.15)",
    borderWidth: 1,
    borderColor: "rgba(93,190,138,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  unlockedCount: { color: C.success, fontSize: 12, fontWeight: "900" },

  receiptCard: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    overflow: "hidden",
  },
  receiptCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  rLabel: { color: C.creamDim, fontSize: 12, fontWeight: "600" },
  rVal: { color: C.cream, fontSize: 13, fontWeight: "700" },
  rDivider: { height: 1, backgroundColor: C.border },

  ghostBtn: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  ghostBtnText: { color: C.cream, fontSize: 15, fontWeight: "600" },
});
