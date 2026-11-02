function parseStudentResponse(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

function responseText(value) {
  const parsed = parseStudentResponse(value);
  if (parsed === null || parsed === undefined) {
    return '';
  }
  if (typeof parsed === 'string') {
    return parsed;
  }
  try {
    return JSON.stringify(parsed);
  } catch (error) {
    return String(parsed);
  }
}

function projectDiagnosis(value) {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return { type: '', reason: value, confidence: null };
  }
  return {
    type: value.type || '',
    reason: value.reason || '',
    confidence: value.confidence === undefined ? null : value.confidence
  };
}

function projectHint(value) {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return { hint_level: '', content: value };
  }
  return {
    hint_level: value.hint_level === undefined ? '' : value.hint_level,
    content: value.content || ''
  };
}

function normalizedCorrect(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }
  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }
  return null;
}

function projectAttempt(value) {
  const attempt = value || {};
  const isCorrect = normalizedCorrect(attempt.is_correct);
  return {
    attemptNumber: attempt.attempt_number === undefined ? '' : attempt.attempt_number,
    studentResponse: parseStudentResponse(attempt.student_response),
    studentResponseText: responseText(attempt.student_response),
    hintLevel: attempt.hint_level === undefined ? '' : attempt.hint_level,
    isCorrect,
    isCorrectLabel: isCorrect === null ? '未判定' : (isCorrect ? '规则识别通过' : '规则识别未通过'),
    timestamp: attempt.timestamp || ''
  };
}

function projectPhoto(value) {
  const photo = value || {};
  return {
    id: String(photo.id || ''),
    studentId: photo.student_id === undefined ? 0 : Number(photo.student_id),
    taskId: photo.task_id === undefined ? 0 : Number(photo.task_id),
    contentType: photo.content_type || '',
    bytes: photo.bytes === undefined ? 0 : Number(photo.bytes),
    createdAt: photo.created_at || ''
  };
}

function projectTaskDetail(response) {
  const detail = response || {};
  const session = detail.session || null;
  const solvedRaw = session && session.solved !== undefined ? Number(session.solved) : 0;
  const sessionSolved = Number.isFinite(solvedRaw) ? solvedRaw : 0;
  return {
    task: detail.task || null,
    session,
    sessionSolved,
    solved: sessionSolved === 1,
    attempts: Array.isArray(detail.attempts) ? detail.attempts.map(projectAttempt) : [],
    diagnosis: projectDiagnosis(detail.diagnosis),
    latestHint: projectHint(detail.latestHint),
    latestEvidence: detail.latestEvidence || null,
    photos: Array.isArray(detail.photos) ? detail.photos.map(projectPhoto) : []
  };
}

module.exports = {
  parseStudentResponse,
  responseText,
  projectDiagnosis,
  projectHint,
  projectAttempt,
  projectPhoto,
  projectTaskDetail
};
