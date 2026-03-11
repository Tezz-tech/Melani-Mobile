// src/store/AuthContext.js
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { AuthAPI, TokenStorage } from '../services/api';

// ─────────────────────────────────────────────────────────────
//  State shape
// ─────────────────────────────────────────────────────────────
const initialState = {
  user:          null,
  isAuthenticated: false,
  isLoading:     true,   // true while checking stored tokens on app start
  error:         null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'RESTORE_SESSION':
      return { ...state, user: action.user, isAuthenticated: !!action.user, isLoading: false };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      return { ...state, user: action.user, isAuthenticated: true, isLoading: false, error: null };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, isLoading: false, error: null };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.updates } };
    case 'SET_ERROR':
      return { ...state, error: action.error, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
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
  useEffect(() => {
    (async () => {
      try {
        const user = await TokenStorage.getUser();
        const token = await TokenStorage.getAccess();

        if (user && token) {
          // Silently refresh user data in background
          AuthAPI.getMe().then(freshUser => {
            dispatch({ type: 'UPDATE_USER', updates: freshUser });
          }).catch(() => {
            // Token invalid — clear and force login
            TokenStorage.clearTokens();
            dispatch({ type: 'RESTORE_SESSION', user: null });
          });

          dispatch({ type: 'RESTORE_SESSION', user });
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
    dispatch({ type: 'SET_LOADING', value: true });
    const { user } = await AuthAPI.register(payload); // throws on error
    dispatch({ type: 'REGISTER_SUCCESS', user });
    return user;
  };

  const login = async (payload) => {
    dispatch({ type: 'SET_LOADING', value: true });
    const { user } = await AuthAPI.login(payload);
    dispatch({ type: 'LOGIN_SUCCESS', user });
    return user;
  };

  const logout = async () => {
    await AuthAPI.logout();
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (updates) => dispatch({ type: 'UPDATE_USER', updates });
  const clearError = ()         => dispatch({ type: 'CLEAR_ERROR' });

  return (
    <AuthContext.Provider value={{ ...state, register, login, logout, updateUser, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};