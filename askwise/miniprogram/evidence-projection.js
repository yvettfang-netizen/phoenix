function displayValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

function projectEvidence(value) {
  const evidence = value || {};
  return {
    id: evidence.id === undefined ? 0 : Number(evidence.id),
    taskId: evidence.task_id === undefined ? 0 : Number(evidence.task_id),
    date: evidence.date || '',
    subject: evidence.subject || '',
    topic: evidence.topic || '',
    question: evidence.question || '',
    initialAttempt: displayValue(evidence.initial_attempt),
    diagnosis: displayValue(evidence.diagnosis),
    hintLevel: evidence.hint_level === undefined ? '' : evidence.hint_level,
    hintCount: evidence.hint_count === undefined ? 0 : evidence.hint_count,
    retryCount: evidence.retry_count === undefined ? 0 : evidence.retry_count,
    finalResult: displayValue(evidence.final_result),
    independence: displayValue(evidence.independence),
    reflection: displayValue(evidence.reflection),
    createdAt: evidence.created_at || ''
  };
}

function projectEvidenceList(value) {
  return (Array.isArray(value) ? value : []).map(projectEvidence);
}

module.exports = { displayValue, projectEvidence, projectEvidenceList };
