/// <reference path="./types/api.d.ts" />

const config = require('./config');
const pending = require('./pending');
const storage = require('./storage');
const ui = require('./ui');

function makeError(code, message, extra) {
  const error = new Error(message || code);
  error.code = code;
  if (extra) {
    Object.keys(extra).forEach((key) => {
      error[key] = extra[key];
    });
  }
  return error;
}

function authHeader() {
  const token = storage.getToken();
  return token ? { Authorization: 'Bearer ' + token } : {};
}

function request(method, path, data, options) {
  let url;
  try {
    url = config.buildUrl(path);
  } catch (error) {
    return Promise.reject(error);
  }

  const header = Object.assign(
    { 'content-type': 'application/json' },
    options && options.auth === false ? {} : authHeader()
  );
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data: data || {},
      header,
      timeout: config.REQUEST_TIMEOUT_MS,
      success(response) {
        const status = response.statusCode || 0;
        if (status >= 200 && status < 300) {
          resolve(response.data);
          return;
        }
        if (status === 401) {
          storage.clearSession();
        }
        reject(makeError(status === 401 ? 'UNAUTHORIZED' : 'HTTP', 'API request failed.', {
          status,
          data: response.data
        }));
      },
      fail() {
        reject(makeError('NETWORK', 'Network request failed.'));
      }
    });
  });
}

function postPending(scope, path, payload, requestId) {
  const stored = pending.read(scope);
  const requestPayload = payload || (stored && stored.payload);
  if (!requestPayload) {
    return Promise.reject(makeError('VALIDATION', 'No pending payload is available.'));
  }

  const id = requestId || (stored && stored.request_id) || ui.newRequestId();
  const body = Object.assign({}, requestPayload, { request_id: id });
  try {
    pending.save(scope, id, body);
  } catch (error) {
    return Promise.reject(makeError('STORAGE', 'Pending payload could not be saved.'));
  }

  return request('POST', path, body).then((response) => {
    pending.clear(scope);
    return response;
  });
}

function saveTokenFromLogin(response) {
  const token = response && (response.token || response.access_token);
  if (typeof token !== 'string' || !token) {
    return Promise.reject(makeError('AUTH', 'Login response did not contain a token.'));
  }
  try {
    storage.saveToken(token);
  } catch (error) {
    return Promise.reject(makeError('STORAGE', 'Session token could not be stored.'));
  }
  return Promise.resolve(response);
}

function wechatLogin(code) {
  if (!code) {
    return Promise.reject(makeError('VALIDATION', 'WeChat login code is required.'));
  }
  return request('POST', '/wechat-login', { code }, { auth: false }).then(saveTokenFromLogin);
}

function localLogin(account, password) {
  if (!account || !password) {
    return Promise.reject(makeError('VALIDATION', 'Account and password are required.'));
  }
  return request('POST', '/login', { account, password }, { auth: false }).then(saveTokenFromLogin);
}

function logout() {
  if (!storage.getToken()) {
    storage.clearSession();
    return Promise.resolve({});
  }
  return request('POST', '/logout').then(
    (response) => {
      storage.clearSession();
      return response;
    },
    (error) => {
      storage.clearSession();
      return Promise.reject(error);
    }
  );
}

function getToday() {
  return request('GET', '/today');
}

function getTask(taskId) {
  return request('GET', '/tasks/' + encodeURIComponent(String(taskId)));
}

function createTask(payload, requestId) {
  return postPending('task-create', '/tasks', payload, requestId);
}

function submitAttempt(taskId, payload, requestId) {
  const scope = 'attempt-' + String(taskId);
  return postPending(scope, '/tasks/' + encodeURIComponent(String(taskId)) + '/attempts', payload, requestId);
}

function getEvidence() {
  return request('GET', '/evidence');
}

function getDashboard() {
  return request('GET', '/dashboard');
}

function getReflection() {
  return request('GET', '/reflection');
}

function submitReflection(payload, requestId) {
  return postPending('reflection', '/reflection', payload, requestId);
}

function isAllowedPhoto(filePath) {
  return /\.(png|jpe?g|webp)(?:$|[?#])/i.test(String(filePath || ''));
}

function parseUploadData(value) {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

function uploadPhoto(taskId, filePath, requestId) {
  const scope = 'upload-' + String(taskId);
  const stored = pending.read(scope);
  const selectedPath = filePath || (stored && stored.payload && stored.payload.filePath);
  if (!selectedPath || !isAllowedPhoto(selectedPath)) {
    return Promise.reject(makeError('VALIDATION', 'Only png, jpeg, or webp photos are supported.'));
  }

  const id = requestId || (stored && stored.request_id) || ui.newRequestId();
  try {
    pending.save(scope, id, { filePath: selectedPath });
  } catch (error) {
    return Promise.reject(makeError('STORAGE', 'Pending upload could not be saved.'));
  }

  let url;
  try {
    url = config.buildUrl('/tasks/' + encodeURIComponent(String(taskId)) + '/uploads');
  } catch (error) {
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url,
      filePath: selectedPath,
      name: 'photo',
      formData: { request_id: id },
      header: authHeader(),
      success(response) {
        const status = response.statusCode || 0;
        if (status >= 200 && status < 300) {
          pending.clear(scope);
          resolve(parseUploadData(response.data));
          return;
        }
        if (status === 401) {
          storage.clearSession();
        }
        reject(makeError(status === 401 ? 'UNAUTHORIZED' : 'HTTP', 'Upload failed.', {
          status,
          data: parseUploadData(response.data)
        }));
      },
      fail() {
        reject(makeError('NETWORK', 'Upload failed.'));
      }
    });
  });
}

function resolveDownloadUrl(resource) {
  const value = String(resource || '');
  const apiRoot = config.getApiRoot();

  if (/^\/uploads\//.test(value)) {
    return config.buildUrl(value);
  }

  if (/^https:\/\//i.test(value) && (value === apiRoot || value.indexOf(apiRoot + '/') === 0)) {
    return value;
  }

  throw makeError('CONFIG', 'Evidence download URL must be API-relative or same-origin API-prefixed.');
}

function downloadAuthenticated(resource) {
  let url;
  try {
    url = resolveDownloadUrl(resource);
  } catch (error) {
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      header: authHeader(),
      success(response) {
        const status = response.statusCode || 0;
        if (status >= 200 && status < 300) {
          resolve(response);
          return;
        }
        if (status === 401) {
          storage.clearSession();
        }
        reject(makeError(status === 401 ? 'UNAUTHORIZED' : 'HTTP', 'Download failed.', { status }));
      },
      fail() {
        reject(makeError('NETWORK', 'Download failed.'));
      }
    });
  });
}

module.exports = {
  request,
  wechatLogin,
  localLogin,
  logout,
  getToday,
  getTask,
  createTask,
  submitAttempt,
  getEvidence,
  getDashboard,
  getReflection,
  submitReflection,
  isAllowedPhoto,
  uploadPhoto,
  resolveDownloadUrl,
  downloadAuthenticated
};
