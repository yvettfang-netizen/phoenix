const config = require('./config');
const POSES = {
  idle: '/assets/aoyu/poses/idle.png'
};
const POSE_FILES = {
  guiding: 'guiding.png',
  celebrating: 'celebrating.png',
  reflecting: 'reflecting.png',
  listening: 'listening.png',
  thinking: 'thinking.png',
  encouraging: 'encouraging.png'
};

function remotePose(name) {
  try {
    return config.buildAssetUrl('/assets/aoyu/poses/' + POSE_FILES[name]);
  } catch (error) {
    return POSES.idle;
  }
}

function poseFor(state) {
  if (state === 'error') {
    return POSES.idle;
  }
  if (state === 'busy') {
    return remotePose('thinking');
  }
  if (state === 'solved') {
    return remotePose('celebrating');
  }
  if (POSE_FILES[state]) {
    return remotePose(state);
  }
  return POSES.idle;
}

function pageState(state, message) {
  return {
    state,
    busy: state === 'busy',
    companionSrc: poseFor(state),
    error: message || ''
  };
}

function newRequestId() {
  return 'askwise-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function safeError(error) {
  if (error && error.code === 'CONFIG') {
    return '客户端尚未配置 HTTPS API 地址。';
  }
  if (error && (error.code === 'UNAUTHORIZED' || error.status === 401)) {
    return '登录已失效，请重新登录。';
  }
  if (error && error.code === 'VALIDATION') {
    return error.message || '请检查输入后再试。';
  }
  if (error && error.code === 'STORAGE') {
    return '本地待提交记录暂时不可用，请稍后再试。';
  }
  if (error && error.code === 'API_SHAPE') {
    return error.message || '服务端响应不完整，未标记为成功。';
  }
  return '网络暂时不可用，请点击“重试”或稍后再试。';
}

function isUnauthorized(error) {
  return Boolean(error && (error.code === 'UNAUTHORIZED' || error.status === 401));
}

function toLogin() {
  wx.reLaunch({ url: '/pages/login/index' });
}

module.exports = {
  POSES,
  POSE_FILES,
  poseFor,
  pageState,
  newRequestId,
  safeError,
  isUnauthorized,
  toLogin
};
