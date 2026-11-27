import assert from 'node:assert/strict'
import test from 'node:test'
import type { Report } from '../src/domain/model'
import { renderSimpleReportPdf, reportPdfRows } from '../src/pdf/simple-pdf'

const report = {
  id: 'synthetic-report', userId: 'private-user-must-not-appear', familyId: 'private-family',
  studentId: 'private-student', assessmentId: 'private-assessment',
  dataAsOf: '2026-11-28', resultVersion: 'synthetic-v1',
  versions: { templateVersion: 'synthetic-v1' }, disclaimer: '教育支持参考，不保证录取。',
  sources: [{ sourceId: 'source-test', applicableYear: '2026', verifiedAt: '2026-11-27', dataVersion: 'v1' }],
  modules: Array.from({ length: 6 }, (_, i) => ({
    key: 'student_profile', title: '模块' + (i + 1), summary: '学习成长与香港繁體字。'.repeat(35), items: ['完整正文' + (i + 1)]
  }))
} as unknown as Report

function decodedText(pdf: Buffer): string {
  return [...pdf.toString('ascii').matchAll(/ Tm <([0-9A-F]+)> Tj ET/g)]
    .map(match => Buffer.from(match[1]!, 'hex').swap16().toString('utf16le')).join('')
}
test('CJK report PDF retains all six modules, summaries, items, sources and disclaimer across pages', () => {
  const pdf = renderSimpleReportPdf(report)
  const text = decodedText(pdf)
  assert.equal(pdf.subarray(0, 8).toString('ascii'), '%PDF-1.4')
  for (const module of report.modules ?? []) {
    assert.ok(text.includes(module.title))
    assert.ok(text.includes(module.summary.replace(/\n/g, '')) || text.replace(/第 \d+ \/ \d+ 页凤启教育罗盘 ｜ Phoenix Education Compass/g, '').includes(module.summary))
    for (const item of module.items ?? []) assert.ok(text.includes(item))
  }
  assert.ok(text.includes(report.disclaimer))
  assert.ok(text.includes('source-test'))
  assert.ok(!text.includes(report.userId))
  const source = pdf.toString('ascii')
  assert.ok(Number(source.match(/\/Type \/Pages \/Kids \[[^\]]+\] \/Count (\d+)/)?.[1]) > 1)
  const offset = Number(source.match(/startxref\n(\d+)/)?.[1])
  assert.equal(source.slice(offset, offset + 4), 'xref')
})
test('growth PDF uses the authoritative structured six sections, evidence and action details rather than module-code placeholders', () => {
  const growth = { ...report, reportKind: 'STUDENT_GROWTH_DISCOVERY', resultPayload: {
    student_snapshot: { education_system: 'DSE', grade_stage: '中三', target_regions: ['香港'], performance_self_view: '待验证', evidence_refs: ['EGD01'] },
    strength_signals: [{ code: 'PROBLEM_DECOMPOSITION', dimension: 'THINKING_LEARNING_STYLE', status: 'SUPPORTED', evidence_refs: ['EGD02'], source: 'STUDENT_SELF_REPORT' }],
    learning_bottlenecks: [], subject_focus: [], growth_direction: [],
    action_plan_30d: { horizon_days: 30, selected_action_code: 'INTEREST_PROJECT', goals: [{ code: 'FAMILY_GOAL_ALIGNMENT', status: 'NEEDS_VALIDATION', evidence_refs: ['EGD19'] }] },
    learning_signals: [], interest_signals: [], evidence_refs: ['EGD01','EGD02','EGD19'], questionnaire_versions: [],
    system_result_marker: 'FULL_SYSTEM_BANK', private_raw_answers: 'must-not-leak'
  } } as Report
  const rows = reportPdfRows(growth).map(row => row.text).join('\n')
  for (const value of ['学生成长快照','优势信号','学习卡点','学科重点','成长方向','30 天行动计划','问题拆解信号','已有回答支持','EGD19','香港 DSE']) assert.ok(rows.includes(value), value)
  assert.ok(!rows.includes('must-not-leak'))
  assert.ok(decodedText(renderSimpleReportPdf(growth)).includes('问题拆解信号'))
})
test('unsupported supplementary text fails closed instead of silently damaging the document', () => {
  assert.throws(() => renderSimpleReportPdf({ ...report, disclaimer: '扩展字符𠮷' }), /尚不能安全呈现/)
})
