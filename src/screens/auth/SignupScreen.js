// src/screens/auth/SignupScreen.js
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
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

function AfricanBG({ children }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View
        style={[
          ab.blob,
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
          ab.blob,
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
          ab.blob,
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
      {children}
    </View>
  );
}
const ab = StyleSheet.create({
  blob: { position: "absolute" },
  stripe: {
    position: "absolute",
    width: W,
    height: 1.5,
    backgroundColor: "rgba(200,134,10,0.18)",
  },
});

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

function GoldButton({ label, onPress, loading, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
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

function BackButton({ onPress }) {
  return (
    <TouchableOpacity style={bk.btn} onPress={onPress} activeOpacity={0.7}>
      <View style={bk.inner}>
        <Text style={bk.arrow}>←</Text>
      </View>
    </TouchableOpacity>
  );
}
const bk = StyleSheet.create({
  btn: { position: "absolute", top: 56, left: 24, zIndex: 99 },
  inner: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(200,134,10,0.12)",
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: { color: "#F5DEB3", fontSize: 18, lineHeight: 22 },
});

function LogoMark({ size = 50 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: C.gold,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.goldPale,
        shadowColor: C.gold,
        shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <Text style={{ color: C.gold, fontSize: size * 0.32, fontWeight: "900" }}>
        M
      </Text>
    </View>
  );
}

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

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
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
          inf.container,
          { borderColor, transform: [{ translateX: shakeAnim }] },
        ]}
      >
        <Text style={[inf.label, { color: focused ? C.gold : C.creamDim }]}>
          {label}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            style={inf.input}
            placeholder={placeholder}
            placeholderTextColor={C.creamFaint}
            value={value}
            onChangeText={onChangeText}
            onFocus={focusIn}
            onBlur={focusOut}
            secureTextEntry={secureTextEntry && !visible}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
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
      {error ? <Text style={inf.error}>{error}</Text> : null}
    </FadeSlide>
  );
}
const inf = StyleSheet.create({
  container: {
    backgroundColor: C.bgInput,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 62,
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
    color: "#F5DEB3",
    fontSize: 16,
    fontWeight: "500",
    paddingVertical: 0,
  },
  error: {
    color: "#E05C3A",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: "500",
  },
});

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
export default function SignupScreen() {
  const navigation = useNavigation();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2 || !parts[1])
      e.fullName = "Please enter your first and last name";
    if (!email.includes("@")) e.email = "Enter a valid email address";
    if (phone.replace(/\D/g, "").length < 10)
      e.phone = "Enter a valid phone number";
    if (password.length < 8)
      e.password = "Password must be at least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ");

    try {
      await register({ firstName, lastName, email, phone, password });

      // ✅ register() now dispatches REGISTER_SUCCESS which sets pendingUser
      // but does NOT flip isAuthenticated — the unauthenticated stack stays
      // mounted so this navigate fires correctly every time.
      navigation.navigate('Onboarding');
    } catch (err) {
      const msg = (err.message || "").toLowerCase();
      const code = err.statusCode ?? err.status ?? err.response?.status;

      if (!code || code === 0) {
        setErrors({
          general: "No internet connection. Check your network and try again.",
        });
      } else if (code === 429) {
        setErrors({
          general: "Too many attempts. Please wait a moment and try again.",
        });
      } else if (msg.includes("email")) {
        setErrors({ email: err.message });
      } else if (msg.includes("phone")) {
        setErrors({ phone: err.message });
      } else if (msg.includes("password")) {
        setErrors({ password: err.message });
      } else {
        setErrors({
          general: err.message || "Registration failed. Please try again.",
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
          <FadeSlide delay={0} style={s.header}>
            <LogoMark size={50} />
            <Text style={s.title}>Create Account</Text>
            <Text style={s.subtitle}>
              Join thousands discovering their skin's true potential.
            </Text>
          </FadeSlide>

          <FadeSlide delay={150} style={s.progressRow}>
            {["Account", "Verify", "Profile"].map((step, i) => (
              <View
                key={i}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <View style={[s.progressDot, i === 0 && s.progressDotActive]}>
                  <Text style={[s.progressNum, i === 0 && s.progressNumActive]}>
                    {i + 1}
                  </Text>
                </View>
                <Text
                  style={[s.progressLabel, i === 0 && s.progressLabelActive]}
                >
                  {step}
                </Text>
                {i < 2 && <View style={s.progressLine} />}
              </View>
            ))}
          </FadeSlide>

          {errors.general && <ErrorBanner message={errors.general} />}

          <View style={{ marginBottom: 4 }}>
            <InputField
              label="Full Name"
              placeholder="First and last name"
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                setErrors((e) => ({ ...e, fullName: "", general: "" }));
              }}
              autoCapitalize="words"
              delay={200}
              error={errors.fullName}
            />
            <InputField
              label="Email Address"
              placeholder="your@email.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setErrors((e) => ({ ...e, email: "", general: "" }));
              }}
              keyboardType="email-address"
              delay={280}
              error={errors.email}
            />
            <InputField
              label="Phone Number"
              placeholder="+234 800 000 0000"
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                setErrors((e) => ({ ...e, phone: "", general: "" }));
              }}
              keyboardType="phone-pad"
              delay={360}
              error={errors.phone}
            />
            <InputField
              label="Password"
              placeholder="Min. 8 characters"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrors((e) => ({ ...e, password: "", general: "" }));
              }}
              secureTextEntry
              delay={440}
              error={errors.password}
            />
          </View>

          <FadeSlide delay={510} style={{ marginBottom: 20 }}>
            <Text style={s.terms}>
              By continuing, you agree to our{" "}
              <Text style={{ color: C.gold, fontWeight: "600" }}>
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text style={{ color: C.gold, fontWeight: "600" }}>
                Privacy Policy
              </Text>
              .
            </Text>
          </FadeSlide>

          <FadeSlide delay={570}>
            <GoldButton
              label="Create Account"
              onPress={handleSignup}
              loading={loading}
            />
          </FadeSlide>

          <GoldDivider label="OR" />

          <FadeSlide
            delay={650}
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 4,
            }}
          >
            <Text style={{ color: C.creamDim, fontSize: 14 }}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={{ color: C.gold, fontSize: 14, fontWeight: "700" }}>
                Sign In
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
  header: { alignItems: "center", marginBottom: 28 },
  title: {
    color: "#F5DEB3",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginTop: 14,
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(245,222,179,0.55)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 20,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(200,134,10,0.10)",
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
    shadowColor: C.gold,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 6,
  },
  progressNum: {
    color: "rgba(245,222,179,0.55)",
    fontSize: 11,
    fontWeight: "700",
  },
  progressNumActive: { color: "#0F0500" },
  progressLabel: {
    color: "rgba(245,222,179,0.55)",
    fontSize: 10,
    marginLeft: 6,
    fontWeight: "500",
  },
  progressLabelActive: { color: C.gold },
  progressLine: {
    width: 22,
    height: 1.5,
    backgroundColor: C.border,
    marginHorizontal: 6,
  },
  terms: {
    color: "rgba(245,222,179,0.55)",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
