// src/store/AuthContext.js
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { AuthAPI, TokenStorage } from '../services/api';

// ─────────────────────────────────────────────────────────────
//  State shape
// ─────────────────────────────────────────────────────────────
const initialState = {
  user:            null,
  pendingUser:     null,   // holds registered user until onboarding completes
  isAuthenticated: false,
  isLoading:       true,   // true ONLY while restoring session on app start
  error:           null,
};

function reducer(state, action) {
  switch (action.type) {

    case 'RESTORE_SESSION':
      return {
        ...state,
        user:            action.user,
        isAuthenticated: !!action.user,
        isLoading:       false,
      };

    case 'LOGIN_SUCCESS':
      // Existing users skip onboarding — go straight to Main
      return {
        ...state,
        user:            action.user,
        isAuthenticated: true,
        isLoading:       false,
        error:           null,
      };

    case 'REGISTER_SUCCESS':
      // ✅ Does NOT set isAuthenticated — navigator stays on unauthenticated
      // stack so OTPVerify → Onboarding → ProfileSetup can run in sequence.
      // Does NOT touch isLoading — no flash back to Splash.
      return {
        ...state,
        pendingUser: action.user,
        error:       null,
      };

    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        user:            state.pendingUser,
        pendingUser:     null,
        isAuthenticated: true,
        error:           null,
      };

    case 'COMPLETE_ONBOARDING_WITH_USER':
      // Fallback: pendingUser was null (app backgrounded during onboarding),
      // so we pass the stored user explicitly from TokenStorage.
      return {
        ...state,
        user:            action.user,
        pendingUser:     null,
        isAuthenticated: true,
        error:           null,
      };

    case 'LOGOUT':
      return {
        ...state,
        user:            null,
        pendingUser:     null,
        isAuthenticated: false,
        isLoading:       false,
        error:           null,
      };

    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.updates } };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    // ✅ SET_LOADING is now only used internally during session restore.
    // register() and login() manage their own loading state locally
    // so they never flip isLoading on the context (which causes the
    // navigator to briefly show BootScreen, then remount at Splash).
    case 'SET_LOADING':
      return { ...state, isLoading: action.value };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────
//  Context
// ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── Restore session on app start ─────────────────────────
  // This is the ONLY place isLoading should be true.
  // It flips false via RESTORE_SESSION once the check completes.
  useEffect(() => {
    (async () => {
      try {
        const user  = await TokenStorage.getUser();
        const token = await TokenStorage.getAccess();

        if (user && token) {
          // Restore immediately from storage so the navigator doesn't wait
          dispatch({ type: 'RESTORE_SESSION', user });

          // Silently refresh user data in the background
          AuthAPI.getMe()
            .then(freshUser => dispatch({ type: 'UPDATE_USER', updates: freshUser }))
            .catch(() => {
              // Token was invalid — clear storage and force login
              TokenStorage.clearTokens();
              dispatch({ type: 'RESTORE_SESSION', user: null });
            });
        } else {
          dispatch({ type: 'RESTORE_SESSION', user: null });
        }
      } catch {
        dispatch({ type: 'RESTORE_SESSION', user: null });
      }
    })();
  }, []);

  // ── Actions ──────────────────────────────────────────────

  const register = async (payload) => {
    // ✅ No SET_LOADING dispatch here — that was causing isLoading → true
    // → BootScreen flash → unauthenticated stack remount at Splash.
    // The screen manages its own loading spinner locally.
    const { user } = await AuthAPI.register(payload); // throws on error
    dispatch({ type: 'REGISTER_SUCCESS', user });
    return user;
  };

  const login = async (payload) => {
    // Same — no SET_LOADING dispatch; screen manages its own spinner.
    const { user } = await AuthAPI.login(payload);
    dispatch({ type: 'LOGIN_SUCCESS', user });
    return user;
  };

  // ✅ Call this from the last onboarding screen (ProfileSetupScreen)
  // when the user taps your final CTA. Do NOT call navigation.navigate()
  // after this — the navigator swap is automatic.
  const completeOnboarding = async () => {
    // pendingUser is set by REGISTER_SUCCESS. In rare cases (app backgrounded
    // between signup and onboarding completion) it may be null. Fall back to
    // the user persisted in AsyncStorage so the session is never lost.
    if (!state.pendingUser) {
      const storedUser = await TokenStorage.getUser();
      dispatch({ type: 'COMPLETE_ONBOARDING_WITH_USER', user: storedUser });
    } else {
      dispatch({ type: 'COMPLETE_ONBOARDING' });
    }
  };

  const logout = async () => {
    try {
      await AuthAPI.logout();
    } catch {
      // Token may be expired — tokens are cleared by AuthAPI.logout's finally block.
      // We must still dispatch LOGOUT so isAuthenticated flips false.
    }
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (updates) => dispatch({ type: 'UPDATE_USER', updates });
  const clearError = ()         => dispatch({ type: 'CLEAR_ERROR' });

  return (
    <AuthContext.Provider
      value={{
        ...state,
        register,
        login,
        logout,
        completeOnboarding,
        updateUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};