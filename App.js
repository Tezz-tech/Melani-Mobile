// App.js
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

// ── Auth context ──────────────────────────────────────────────
import { AuthProvider, useAuth } from './src/store/AuthContext';

// ── Screens ───────────────────────────────────────────────────

// Splash & Auth
import SplashScreen    from './src/screens/SplashScreen';
import WelcomeScreen   from './src/screens/auth/WelcomeScreen';
import SignupScreen    from './src/screens/auth/SignupScreen';
import LoginScreen     from './src/screens/auth/LoginScreen';
import OTPVerifyScreen from './src/screens/auth/OTPVerifyScreen';

// Onboarding
import OnboardingScreen   from './src/screens/onboarding/Onboardingscreen';
import ConsentScreen      from './src/screens/onboarding/Consentscreen';
import ProfileSetupScreen from './src/screens/onboarding/ProfileSetupScreen';

// Main App Tabs
import HomeScreen        from './src/screens/main/HomeScreen';
import ScanHistoryScreen from './src/screens/main/ScanHistoryScreen';
import RoutineScreen     from './src/screens/main/RoutineScreen';
import ProfileScreen     from './src/screens/main/ProfileScreen';

// Scan Flow
import ScanCameraScreen     from './src/screens/scan/ScanCameraScreen';
import ScanProcessingScreen from './src/screens/scan/ScanProcessingScreen';
import ScanResultsScreen    from './src/screens/scan/ScanResultsScreen';
import ScanReportScreen     from './src/screens/scan/ScanReportScreen';

// Subscription & Payments
import SubscriptionScreen   from './src/screens/subscription/SubscriptionScreen';
import PaymentScreen        from './src/screens/subscription/PaymentScreen';
import PaymentSuccessScreen from './src/screens/subscription/PaymentSuccessScreen';

// Settings & Account
import SettingsScreen      from './src/screens/settings/SettingsScreen';
import NotificationsScreen from './src/screens/settings/NotificationsScreen';
import PrivacyScreen       from './src/screens/settings/PrivacyScreen';
import DeleteAccountScreen from './src/screens/settings/DeleteAccountScreen';
import HelpScreen          from './src/screens/settings/HelpScreen';

// Auth — additional screens
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

// Error boundary
import ErrorBoundary from './src/components/ErrorBoundary';

// ─────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Boot spinner — shown while AuthContext restores session ───
function BootScreen() {
  return (
    <View style={styles.boot}>
      <ActivityIndicator size="large" color="#C8860A" />
    </View>
  );
}

// ── Bottom tab navigator (authenticated users only) ───────────
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1C0A00',
          borderTopColor: 'rgba(200,134,10,0.2)',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarActiveTintColor:   '#C8860A',
        tabBarInactiveTintColor: 'rgba(245,222,179,0.4)',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScanHistory"
        component={ScanHistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Routine"
        component={RoutineScreen}
        options={{
          tabBarLabel: 'Routine',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="spa" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────
//
//  isLoading = true   → BootScreen (restoring session from storage)
//  isAuthenticated    → authenticated stack (Main + all app screens)
//  !isAuthenticated   → unauthenticated stack (Splash → … → ProfileSetup)
//
//  React Navigation swaps the tree automatically when isAuthenticated
//  changes. Never call navigation.navigate('Main') manually — the swap
//  happens on its own when completeOnboarding() or login() fires.
// ─────────────────────────────────────────────────────────────
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  // Still hydrating stored token — show spinner only then
  if (isLoading) return <BootScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {isAuthenticated ? (
        // ── AUTHENTICATED STACK ───────────────────────────────
        <>
          <Stack.Screen name="Main"           component={MainTabNavigator}     options={{ animation: 'fade'              }} />

          {/* Scan flow */}
          <Stack.Screen name="ScanCamera"     component={ScanCameraScreen}     options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="ScanProcessing" component={ScanProcessingScreen} options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="ScanResults"    component={ScanResultsScreen}    options={{ animation: 'slide_from_right'  }} />
          <Stack.Screen name="ScanReport"     component={ScanReportScreen}     options={{ animation: 'slide_from_right'  }} />

          {/* Subscription & payments */}
          <Stack.Screen name="Subscription"   component={SubscriptionScreen}   options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Payment"        component={PaymentScreen}        options={{ animation: 'slide_from_right'  }} />
          <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} options={{ animation: 'fade', gestureEnabled: false }} />

          {/* Settings & account */}
          <Stack.Screen name="Settings"       component={SettingsScreen}       options={{ animation: 'slide_from_right'  }} />
          <Stack.Screen name="Notifications"  component={NotificationsScreen}  options={{ animation: 'slide_from_right'  }} />
          <Stack.Screen name="Privacy"        component={PrivacyScreen}        options={{ animation: 'slide_from_right'  }} />
          <Stack.Screen name="DeleteAccount"  component={DeleteAccountScreen}  options={{ animation: 'slide_from_right'  }} />
          <Stack.Screen name="Help"           component={HelpScreen}           options={{ animation: 'slide_from_right'  }} />

          {/* ✅ FIX: ProfileSetup also accessible from Profile → Skin Concerns */}
          <Stack.Screen name="ProfileSetup"   component={ProfileSetupScreen}   options={{ animation: 'slide_from_right'  }} />
        </>
      ) : (
        // ── UNAUTHENTICATED STACK ─────────────────────────────
        <>
          <Stack.Screen name="Splash"       component={SplashScreen}       />
          <Stack.Screen name="Welcome"      component={WelcomeScreen}      />
          <Stack.Screen name="Signup"       component={SignupScreen}        />
          <Stack.Screen name="Login"        component={LoginScreen}        />
          <Stack.Screen name="OTPVerify"    component={OTPVerifyScreen}    options={{ animation: 'slide_from_right' }} />

          {/* Onboarding — after OTP, before entering the app */}
          <Stack.Screen name="Onboarding"      component={OnboardingScreen}      options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Consent"          component={ConsentScreen}         options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ProfileSetup"     component={ProfileSetupScreen}    options={{ animation: 'slide_from_right' }} />

          {/* Password reset */}
          <Stack.Screen name="ForgotPassword"   component={ForgotPasswordScreen}  options={{ animation: 'slide_from_bottom' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

// ── Root app ──────────────────────────────────────────────────
//
//  AuthProvider must wrap NavigationContainer so navigation.reset()
//  and navigation.navigate() work inside auth action callbacks.
// ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: '#0F0500',
    alignItems: 'center',
    justifyContent: 'center',
  },
});