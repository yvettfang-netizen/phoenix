const TOKEN_KEY = 'askwise.session.token';
const SESSION_KEY = 'askwise.session.id';
const INVALIDATED_KEY = 'askwise.session.invalidated';
const PENDING_PREFIX = 'askwise.pending.';
let invalidatedToken = false;

function safeRemove(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (error) {
    return false;
  }
}

function safeSet(key, value) {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

function clearPendingStorage() {
  let keys;
  try {
    const info = wx.getStorageInfoSync();
    keys = Array.isArray(info.keys) ? info.keys : [];
  } catch (error) {
    return false;
  }

  let cleared = true;
  keys.filter((key) => String(key).indexOf(PENDING_PREFIX) === 0).forEach((key) => {
    if (!safeRemove(key)) {
      cleared = false;
    }
  });
  return cleared;
}

function makeSessionId() {
  return 'session-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function getToken() {
  if (invalidatedToken) {
    return '';
  }
  try {
    if (wx.getStorageSync(INVALIDATED_KEY) === true) {
      return '';
    }
    const value = wx.getStorageSync(TOKEN_KEY);
    return typeof value === 'string' ? value : '';
  } catch (error) {
    return '';
  }
}

function saveToken(token) {
  if (typeof token !== 'string' || !token) {
    throw new Error('A non-empty session token is required.');
  }
  if (!clearSession()) {
    throw new Error('Session cleanup failed.');
  }

  try {
    wx.setStorageSync(TOKEN_KEY, token);
    wx.setStorageSync(SESSION_KEY, makeSessionId());
    wx.setStorageSync(INVALIDATED_KEY, false);
    invalidatedToken = false;
  } catch (error) {
    invalidatedToken = true;
    safeRemove(TOKEN_KEY);
    safeRemove(SESSION_KEY);
    safeSet(INVALIDATED_KEY, true);
    throw error;
  }
}

function getSessionId() {
  if (invalidatedToken) {
    return '';
  }
  try {
    const value = wx.getStorageSync(SESSION_KEY);
    return typeof value === 'string' ? value : '';
  } catch (error) {
    return '';
  }
}

function clearSession() {
  // Invalidate the in-memory token before touching storage. A failed remove
  // must never allow the old token to be sent on a later request.
  invalidatedToken = true;
  const invalidationMarked = safeSet(INVALIDATED_KEY, true);
  const pendingCleared = clearPendingStorage();
  const tokenCleared = safeRemove(TOKEN_KEY);
  const sessionCleared = safeRemove(SESSION_KEY);
  return invalidationMarked && pendingCleared && tokenCleared && sessionCleared;
}

function clearToken() {
  return clearSession();
}

module.exports = {
  getToken,
  saveToken,
  getSessionId,
  clearPendingStorage,
  clearSession,
  clearToken
};
