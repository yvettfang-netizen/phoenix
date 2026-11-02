const API_BASE_URL = '';
const API_PREFIX = '/api/pilot/v1';
const REQUEST_TIMEOUT_MS = 12000;

function configError(message) {
  const error = new Error(message);
  error.code = 'CONFIG';
  return error;
}

function getApiRoot() {
  return getApiOrigin() + API_PREFIX;
}

function getApiOrigin() {
  const base = String(API_BASE_URL || '').trim();
  if (!base) {
    throw configError('HTTPS API base is not configured.');
  }
  if (!/^https:\/\/[^/\s]+(?:\/.*)?$/i.test(base)) {
    throw configError('API base must be an HTTPS origin.');
  }
  return base.replace(/\/+$/, '');
}

function buildUrl(path) {
  const root = getApiRoot();
  if (!path) {
    return root;
  }
  return root + (String(path).charAt(0) === '/' ? String(path) : '/' + String(path));
}

function buildAssetUrl(path) {
  const origin = getApiOrigin();
  const value = String(path || '');
  return origin + (value.charAt(0) === '/' ? value : '/' + value);
}

module.exports = {
  API_BASE_URL,
  API_PREFIX,
  REQUEST_TIMEOUT_MS,
  getApiOrigin,
  getApiRoot,
  buildUrl,
  buildAssetUrl
};
