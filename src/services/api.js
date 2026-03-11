// src/services/api.js
//
//  ScanAPI.submitScan sends { imageBase64, mimeType } as a plain
//  JSON body.  The backend receives this and passes imageBase64
//  directly to Gemini as inlineData — no file, no FormData,
//  no multer, nothing written to disk.
//
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = __DEV__
  ? 'https://melani-backend.onrender.com/api'      // Android emulator → host machine
  // ? 'http://localhost:5000/api'   // iOS simulator
  : 'https://melani-backend.onrender.com/api';

const DEFAULT_TIMEOUT = 15_000;
const SCAN_TIMEOUT    = 70_000;  // Gemini vision can take 20–40s

// ─────────────────────────────────────────────────────────────
//  Token storage
// ─────────────────────────────────────────────────────────────
export const TokenStorage = {
  async getAccess()     { return AsyncStorage.getItem('accessToken'); },
  async getRefresh()    { return AsyncStorage.getItem('refreshToken'); },
  async setTokens(a, r) { await AsyncStorage.multiSet([['accessToken', a], ['refreshToken', r]]); },
  async clearTokens()   { await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']); },
  async setUser(u)      { await AsyncStorage.setItem('user', JSON.stringify(u)); },
  async getUser() {
    const raw = await AsyncStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },
};

// ─────────────────────────────────────────────────────────────
//  Core fetch wrapper
// ─────────────────────────────────────────────────────────────
async function request(method, path, body = null, auth = false, timeout = DEFAULT_TIMEOUT) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);

  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await TokenStorage.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const opts = { method, headers, signal: ctrl.signal };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res  = await fetch(`${BASE_URL}${path}`, opts);
    const data = await res.json();
    clearTimeout(timer);

    if (res.status === 401 && auth) {
      const ok = await tryRefresh();
      if (ok) return request(method, path, body, auth, timeout);
      await TokenStorage.clearTokens();
      throw { status: 401, message: 'Session expired. Please log in again.' };
    }

    if (!res.ok) {
      throw { status: res.status, message: data.message || 'Something went wrong.', errors: data.errors || null };
    }
    return data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError')
      throw { status: 408, message: 'Request timed out. Check your connection.' };
    if (err.message === 'Network request failed')
      throw { status: 0, message: 'No internet connection.' };
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
//  Silent token refresh
// ─────────────────────────────────────────────────────────────
async function tryRefresh() {
  try {
    const refreshToken = await TokenStorage.getRefresh();
    if (!refreshToken) return false;
    const res  = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (!res.ok) return false;
    await TokenStorage.setTokens(data.data.accessToken, refreshToken);
    return true;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────
//  Auth API
// ─────────────────────────────────────────────────────────────
export const AuthAPI = {
  async register(payload) {
    const data = await request('POST', '/auth/register', payload);
    await TokenStorage.setTokens(data.data.accessToken, data.data.refreshToken);
    await TokenStorage.setUser(data.data.user);
    return data.data;
  },
  async login(payload) {
    const data = await request('POST', '/auth/login', payload);
    await TokenStorage.setTokens(data.data.accessToken, data.data.refreshToken);
    await TokenStorage.setUser(data.data.user);
    return data.data;
  },
  async logout() {
    try { await request('POST', '/auth/logout', null, true); }
    finally { await TokenStorage.clearTokens(); }
  },
  async getMe() {
    const data = await request('GET', '/auth/me', null, true);
    await TokenStorage.setUser(data.data.user);
    return data.data.user;
  },
  async updateMe(updates) {
    const data = await request('PATCH', '/auth/update-me', updates, true);
    await TokenStorage.setUser(data.data.user);
    return data.data.user;
  },
  async forgotPassword(email) {
    return request('POST', '/auth/forgot-password', { email });
  },
  async resetPassword(token, password) {
    return request('PATCH', `/auth/reset-password/${token}`, { password });
  },
  async isAuthenticated() {
    try {
      const token = await TokenStorage.getAccess();
      if (!token) return false;
      await request('GET', '/auth/me', null, true);
      return true;
    } catch { return false; }
  },
  async deleteAccount(password) {
    await request('DELETE', '/auth/delete-account', { password }, true);
    await TokenStorage.clearTokens();
  },
};

// ─────────────────────────────────────────────────────────────
//  Scan API
// ─────────────────────────────────────────────────────────────
export const ScanAPI = {
  /**
   * Submit a new skin scan.
   *
   * Sends the image as base64 in a plain JSON body.
   * The backend receives req.body.imageBase64 and passes it
   * directly to Gemini Vision as inlineData.
   * No FormData, no multipart, no multer, no disk write.
   *
   * Request shape:
   *   POST /api/scans
   *   Content-Type: application/json
   *   {
   *     "imageBase64": "<pure base64 string — no data: prefix>",
   *     "mimeType":    "image/jpeg"
   *   }
   *
   * @param {{ imageBase64: string, mimeType?: string }} params
   */
  async submitScan({ imageBase64, mimeType = 'image/jpeg' }) {
    if (!imageBase64) throw { status: 400, message: 'imageBase64 is required' };

    // Strip "data:image/jpeg;base64," prefix if expo-camera accidentally included it
    const clean = imageBase64.replace(/^data:image\/[a-z]+;base64,/i, '');

    const data = await request(
      'POST',
      '/scans',
      { imageBase64: clean, mimeType },
      true,
      SCAN_TIMEOUT,
    );

    // Backend returns: { status: 'success', data: { scan: { ... } } }
    return data.data?.scan || data.data || data;
  },

  /**
   * Paginated scan history
   * @returns {{ data: scan[], meta: { page, totalPages, total } }}
   */
  async getHistory(page = 1, limit = 10) {
    // Backend paginated() shape: { success, data: [...scans], meta: { total, totalPages, ... } }
    // data.data  = the scans array (at top level, NOT nested inside another object)
    // data.meta  = pagination info
    // We return { data: scans[], meta } so callers can read both.
    const res = await request('GET', `/scans?page=${page}&limit=${limit}`, null, true);
    return {
      data: Array.isArray(res.data) ? res.data : [],
      meta: res.meta || { total: 0, totalPages: 1, page: 1 },
    };
  },

  /**
   * Aggregated stats: totalScans, latestScore, averageScore, improvement, scoreHistory[]
   */
  async getStats() {
    // Backend success() shape: { success, data: { stats: {...} } }
    const res = await request('GET', '/scans/stats', null, true);
    return res.data?.stats || res.data || res;
  },

  /** Full single scan by MongoDB _id or scanId shortcode */
  async getScan(id) {
    const data = await request('GET', `/scans/${id}`, null, true);
    return data.data?.scan || data.data || data;
  },

  /** Soft-delete a scan */
  async deleteScan(id) {
    return request('DELETE', `/scans/${id}`, null, true);
  },
};

// ─────────────────────────────────────────────────────────────
//  Routine API
// ─────────────────────────────────────────────────────────────
export const RoutineAPI = {
  async getMyRoutine() {
    const data = await request('GET', '/routine', null, true);
    return data.data?.routine || data.data || data;
  },
  async generate(skinData) {
    const data = await request('POST', '/routine/generate', skinData, true, 30_000);
    return data.data?.routine || data.data || data;
  },
  async completeStep(routineId, timeOfDay, order) {
    const data = await request('POST', `/routine/${routineId}/complete-step`, { timeOfDay, order }, true);
    return data.data?.routine || data.data || data;
  },
  async update(updates) {
    const data = await request('PUT', '/routine', updates, true);
    return data.data?.routine || data.data || data;
  },
};

// ─────────────────────────────────────────────────────────────
//  Product API
// ─────────────────────────────────────────────────────────────
export const ProductAPI = {
  async getAll(filters = {}) {
    const qs   = new URLSearchParams(filters).toString();
    const data = await request('GET', `/products${qs ? `?${qs}` : ''}`, null, true);
    return data.data?.products || data.data || data;
  },
  async getAIRecommendations(scanData, concerns = [], budget = 'medium') {
    const data = await request('POST', '/products/recommendations', { ...scanData, concerns, budget }, true, 30_000);
    return data.data?.products || data.data || data;
  },
  async checkIngredients(ingredients) {
    const data = await request('POST', '/products/ingredient-check', { ingredients }, true);
    return data.data || data;
  },
};

// ─────────────────────────────────────────────────────────────
//  Subscription API  →  /api/subscription
// ─────────────────────────────────────────────────────────────
export const SubscriptionAPI = {

  // GET /api/subscription  — current plan + history
  async get() {
    const data = await request('GET', '/subscription', null, true);
    return data.data;  // { current, history }
  },

  // POST /api/subscription/initiate
  // Returns { reference, authorizationUrl, accessCode, amount, plan, billing }
  // authorizationUrl → open in WebBrowser / InAppBrowser for Paystack checkout
  async initiate(plan, billing = 'monthly') {
    const data = await request('POST', '/subscription/initiate', { plan, billing }, true);
    return data.data;
  },

  // POST /api/subscription/verify  — call after Paystack redirects back
  // Returns { plan, billing, expiresAt, amountNGN, user }
  async verify(reference) {
    const data = await request('POST', '/subscription/verify', { reference }, true);
    return data.data;
  },

  // POST /api/subscription/cancel
  async cancel() {
    const data = await request('POST', '/subscription/cancel', null, true);
    return data.data;  // { accessUntil }
  },
};

export default { AuthAPI, TokenStorage, ScanAPI, RoutineAPI, ProductAPI, SubscriptionAPI };