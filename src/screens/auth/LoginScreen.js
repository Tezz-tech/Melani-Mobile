// src/screens/auth/LoginScreen.js
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../store/AuthContext";

const { width: W, height: H } = Dimensions.get("window");

const C = {
  bg: "#0F0500",
  bgCard: "#1A0A02",
  bgInput: "#251205",
  border: "rgba(200,134,10,0.25)",
  borderFocus: "#C8860A",
  gold: "#C8860A",
  goldPale: "rgba(200,134,10,0.15)",
  cream: "#F5DEB3",
  creamDim: "rgba(245,222,179,0.55)",
  creamFaint: "rgba(245,222,179,0.25)",
  error: "#E05C3A",
};

// ── African background ────────────────────────────────────────
function AfricanBG({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View
        style={[
          ab.b,
          {
            width: 440,
            height: 440,
            borderRadius: 220,
            backgroundColor: "#7B3F00",
            opacity: 0.12,
            top: -120,
            left: -80,
          },
        ]}
      />
      <View
        style={[
          ab.b,
          {
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: "#C8860A",
            opacity: 0.06,
            bottom: -60,
            right: -60,
          },
        ]}
      />
      <View
        style={[
          ab.b,
          {
            width: 200,
            height: 200,
            borderRadius: 100,
            borderWidth: 1,
            borderColor: "rgba(200,134,10,0.15)",
            top: -60,
            left: -60,
          },
        ]}
      />
      <View
        style={[
          ab.b,
          {
            width: 160,
            height: 160,
            borderRadius: 80,
            borderWidth: 1,
            borderColor: "rgba(200,134,10,0.10)",
            bottom: -40,
            right: -40,
          },
        ]}
      />
      <View style={[ab.stripe, { top: H * 0.08 }]} />
      <View
        style={[
          ab.stripe,
          {
            top: H * 0.083,
            height: 0.8,
            backgroundColor: "rgba(240,192,64,0.10)",
          },
        ]}
      />
      <View style={[ab.stripe, { bottom: H * 0.06 }]} />
      {[
        { top: H * 0.15, left: W * 0.06, o: 0.3 },
        { top: H * 0.2, left: W * 0.9, o: 0.2 },
        { top: H * 0.78, left: W * 0.88, o: 0.25 },
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
    backgroundColor: "rgba(200,134,10,0.18)",
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
function FadeSlide({ delay = 0, from = 20, children, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 50,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ── Gold button ───────────────────────────────────────────────
function GoldButton({ label, onPress, loading }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={gb.root}
        onPress={onPress}
        activeOpacity={1}
        disabled={loading}
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
        {loading ? <LoadingDots /> : <Text style={gb.label}>{label}</Text>}
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

// ── Three bouncing dots loader ────────────────────────────────
function LoadingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    dots.forEach((dot, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, {
            toValue: -6,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.delay((2 - i) * 150),
        ]),
      ).start();
    });
  }, []);
  return (
    <View
      style={{ flexDirection: "row", gap: 6, alignItems: "center", height: 20 }}
    >
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: "#0F0500",
            transform: [{ translateY: d }],
          }}
        />
      ))}
    </View>
  );
}

// ── Back button ───────────────────────────────────────────────
function BackButton({ onPress }) {
  return (
    <TouchableOpacity
      style={{ position: "absolute", top: 56, left: 24, zIndex: 99 }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          backgroundColor: "rgba(200,134,10,0.12)",
          borderWidth: 1,
          borderColor: C.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: C.cream, fontSize: 18, lineHeight: 22 }}>←</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Divider ───────────────────────────────────────────────────
function GoldDivider({ label }) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", marginVertical: 20 }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      {label && (
        <Text
          style={{
            color: C.creamDim,
            fontSize: 12,
            marginHorizontal: 12,
            letterSpacing: 1,
          }}
        >
          {label}
        </Text>
      )}
      <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
    </View>
  );
}

// ── Input field ───────────────────────────────────────────────
function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  delay = 0,
  error,
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(!secureTextEntry);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const focusIn = () => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };
  const focusOut = () => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 8,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -8,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 5,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [error]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? C.error : C.border, error ? C.error : C.borderFocus],
  });

  return (
    <FadeSlide delay={delay} style={{ marginBottom: 14 }}>
      <Animated.View
        style={[
          fld.container,
          { borderColor, transform: [{ translateX: shakeAnim }] },
        ]}
      >
        <Text style={[fld.label, { color: focused ? C.gold : C.creamDim }]}>
          {label}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            style={fld.input}
            placeholder={placeholder}
            placeholderTextColor={C.creamFaint}
            value={value}
            onChangeText={onChangeText}
            onFocus={focusIn}
            onBlur={focusOut}
            secureTextEntry={secureTextEntry && !visible}
            keyboardType={keyboardType}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {secureTextEntry && (
            <TouchableOpacity
              onPress={() => setVisible(!visible)}
              style={{ paddingLeft: 10 }}
            >
              <Text style={{ color: C.creamDim, fontSize: 12 }}>
                {visible ? "○" : "●"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
      {error ? <Text style={fld.error}>{error}</Text> : null}
    </FadeSlide>
  );
}
const fld = StyleSheet.create({
  container: {
    backgroundColor: C.bgInput,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  input: {
    flex: 1,
    color: C.cream,
    fontSize: 16,
    fontWeight: "500",
    paddingVertical: 0,
  },
  error: {
    color: C.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: "500",
  },
});

// ── General error banner ──────────────────────────────────────
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <FadeSlide style={{ marginBottom: 14 }}>
      <View style={eb.box}>
        <Text style={eb.icon}>!</Text>
        <Text style={eb.text}>{message}</Text>
      </View>
    </FadeSlide>
  );
}
const eb = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(224,92,58,0.10)",
    borderWidth: 1,
    borderColor: "rgba(224,92,58,0.35)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  icon: {
    color: C.error,
    fontSize: 15,
    fontWeight: "900",
    width: 18,
    textAlign: "center",
  },
  text: {
    color: C.error,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    lineHeight: 19,
  },
});

// ─────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Animated scan line
  const scanLine = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const scanY = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 68],
  });

  // ── Validation ────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!identifier.trim()) e.identifier = "Enter your email or phone";
    if (password.length < 6) e.password = "Enter your password";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit → real API ─────────────────────────────────────
  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await login({ email: identifier, password });
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (err) {
      const code = err.statusCode ?? err.status ?? err.response?.status;

      if (code === 401) {
        setErrors({ password: "Incorrect email or password." });
      } else if (!code || code === 0) {
        setErrors({
          general: "No internet connection. Check your network and try again.",
        });
      } else if (code === 429) {
        setErrors({
          general: "Too many attempts. Please wait a moment and try again.",
        });
      } else {
        setErrors({
          general: err.message || "Login failed. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AfricanBG>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <BackButton onPress={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Scan card */}
          <FadeSlide delay={0} style={s.cardWrap}>
            <View style={s.card}>
              <View
                style={[
                  s.corner,
                  {
                    top: 10,
                    left: 10,
                    borderRightWidth: 0,
                    borderBottomWidth: 0,
                    borderTopLeftRadius: 4,
                  },
                ]}
              />
              <View
                style={[
                  s.corner,
                  {
                    top: 10,
                    right: 10,
                    borderLeftWidth: 0,
                    borderBottomWidth: 0,
                    borderTopRightRadius: 4,
                  },
                ]}
              />
              <View
                style={[
                  s.corner,
                  {
                    bottom: 10,
                    left: 10,
                    borderRightWidth: 0,
                    borderTopWidth: 0,
                    borderBottomLeftRadius: 4,
                  },
                ]}
              />
              <View
                style={[
                  s.corner,
                  {
                    bottom: 10,
                    right: 10,
                    borderLeftWidth: 0,
                    borderTopWidth: 0,
                    borderBottomRightRadius: 4,
                  },
                ]}
              />
              <Animated.View
                style={[s.scanBar, { transform: [{ translateY: scanY }] }]}
              />
              <View style={s.cardLogoRing}>
                <Text style={s.cardLogoLetter}>M</Text>
              </View>
              <Text style={s.cardAppName}>MELANIN SCAN</Text>
            </View>
          </FadeSlide>

          {/* Title */}
          <FadeSlide delay={200} style={{ marginBottom: 26 }}>
            <Text style={s.title}>Welcome Back</Text>
            <Text style={s.subtitle}>
              Sign in to continue your skin journey.
            </Text>
          </FadeSlide>

          {/* General error banner */}
          {errors.general && <ErrorBanner message={errors.general} />}

          {/* Fields */}
          <View style={{ marginBottom: 4 }}>
            <InputField
              label="Email or Phone"
              placeholder="email or +234..."
              value={identifier}
              onChangeText={(t) => {
                setIdentifier(t);
                setErrors((e) => ({ ...e, identifier: "", general: "" }));
              }}
              keyboardType="email-address"
              delay={300}
              error={errors.identifier}
            />
            <InputField
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrors((e) => ({ ...e, password: "", general: "" }));
              }}
              secureTextEntry
              delay={400}
              error={errors.password}
            />
          </View>

          {/* Forgot password — navigates directly to ForgotPassword screen */}
          <FadeSlide
            delay={470}
            style={{ alignItems: "flex-end", marginBottom: 20 }}
          >
            <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
              <Text style={{ color: C.gold, fontSize: 13, fontWeight: "600" }}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </FadeSlide>

          {/* CTA */}
          <FadeSlide delay={540}>
            <GoldButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
            />
          </FadeSlide>

          <GoldDivider label="OR" />

          {/* Signup link */}
          <FadeSlide
            delay={650}
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 4,
            }}
          >
            <Text style={{ color: C.creamDim, fontSize: 14 }}>
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={{ color: C.gold, fontSize: 14, fontWeight: "700" }}>
                Create one
              </Text>
            </TouchableOpacity>
          </FadeSlide>

          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AfricanBG>
  );
}

const s = StyleSheet.create({
  scroll: { paddingTop: 108, paddingHorizontal: 24 },

  cardWrap: { alignItems: "center", marginBottom: 30 },
  card: {
    width: 130,
    height: 130,
    backgroundColor: C.bgCard,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: C.gold,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  corner: {
    position: "absolute",
    width: 14,
    height: 14,
    borderColor: C.gold,
    borderWidth: 2,
  },
  scanBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: "rgba(200,134,10,0.55)",
    shadowColor: C.gold,
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
  },
  cardLogoRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: C.gold,
    backgroundColor: C.goldPale,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLogoLetter: { color: C.gold, fontSize: 18, fontWeight: "900" },
  cardAppName: {
    color: C.gold,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 10,
  },

  title: {
    color: C.cream,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  subtitle: { color: C.creamDim, fontSize: 14, lineHeight: 21 },
});