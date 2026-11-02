const STORAGE_PREFIX = 'askwise.pending.';
const storage = require('./storage');

function storageKey(scope) {
  const sessionId = storage.getSessionId();
  if (!sessionId) {
    return '';
  }
  return STORAGE_PREFIX + sessionId + '.' + String(scope).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function save(scope, requestId, payload) {
  const key = storageKey(scope);
  if (!key) {
    throw new Error('A logged-in session is required for pending data.');
  }
  wx.setStorageSync(key, {
    request_id: requestId,
    payload,
    saved_at: Date.now()
  });
}

function read(scope) {
  try {
    const key = storageKey(scope);
    if (!key) {
      return null;
    }
    const value = wx.getStorageSync(key);
    return value && value.request_id && value.payload ? value : null;
  } catch (error) {
    return null;
  }
}

function clear(scope) {
  try {
    const key = storageKey(scope);
    if (key) {
      wx.removeStorageSync(key);
    }
  } catch (error) {
    // Best effort cleanup; no credential is stored here.
  }
}

module.exports = {
  save,
  read,
  clear
};
