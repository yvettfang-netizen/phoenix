import type { Report } from '../domain/model'
import { invariant } from '../domain/errors'
import { getEducationCompassQuestionnaireBank, isEducationSystem } from '../domain/education-compass/registry'

// Shared meaning with the existing mini-program report renderer. Unknown values remain
// explicitly identifiable; never invent a translation, ability grade or admission probability.
const labels: Record<string, string> = {
  GAOKAO: '内地高考', DSE: '香港 DSE', IGCSE: 'IGCSE', A_LEVEL: 'A-Level', AP_US: 'AP／美式课程', IB: 'IB', OTHER: '其他体系',
  SUPPORTED: '已有回答支持', NEEDS_VALIDATION: '需要进一步验证', UNKNOWN: '暂不确定',
  ACADEMIC_PERFORMANCE: '学业表现', LEARNING_PROCESS: '学习过程', THINKING_LEARNING_STYLE: '思维与学习方式', INTEREST_DIRECTION: '兴趣方向',
  FULL_SYSTEM_BANK: '正式体系题库', SYSTEM_BANK_PENDING: '公共题库 fallback',
  MATH: '数学', CHINESE: '中文／语文', ENGLISH: '英语', PHYSICS: '物理', CHEMISTRY: '化学', BIOLOGY: '生物',
  HISTORY: '历史', GEOGRAPHY: '地理', POLITICS: '政治', ECONOMICS: '经济', BUSINESS: '商业', COMPUTER_SCIENCE: '计算机科学',
  SCIENCE: '科学', ENGINEERING_TECH: '工程与科技', BUSINESS_ECONOMICS: '商业与经济', SOCIAL_PUBLIC: '社会与公共事务',
  LANGUAGE_HUMANITIES: '语言与人文', ARTS_CREATIVE: '艺术与创意', HEALTH_LIFE: '健康与生命', EDUCATION_CHILDREN: '教育与儿童',
  SUBJECT_DIAGNOSIS: '完成一次学科任务诊断', LEARNING_METHOD_PRACTICE: '尝试一套学习方法训练',
  INTEREST_PROJECT: '完成一个小型兴趣项目', SYSTEM_COMPARISON: '了解课程体系差异', PATH_CONSULTATION: '进行一次路径咨询',
  FAMILY_GOAL_ALIGNMENT: '与家长对齐近期目标',
  FOUNDATION_GAP: '基础知识存在卡点', KNOWLEDGE_TRANSFER_GAP: '知识迁移需要加强', FIRST_STEP_GAP: '复杂问题的第一步需要支持',
  ERROR_REVIEW_GAP: '错题复盘需要加强', PLANNING_GAP: '计划与执行节奏需要加强', DIRECTION_CLARITY_GAP: '兴趣方向清晰度待探索',
  FAMILY_GOAL_ALIGNMENT_GAP: '家庭目标需要进一步对齐', SUSTAINED_ENGAGEMENT: '持续投入信号', PLANNING_AND_REVIEW: '计划与复盘信号',
  ERROR_REVIEW_PATTERN: '错题归因与重试信号', PROBLEM_DECOMPOSITION: '问题拆解信号', KNOWLEDGE_RETRIEVAL_STABLE: '知识提取较稳定',
  KNOWLEDGE_RETRIEVAL_GAP: '知识提取需要支持', SUPPORT_CHECK_IN: '建议增加支持性沟通', SELF_SELECTED_FOCUS_UNKNOWN: '本人优先方向尚未确定',
  STUDENT_SELF_REPORT: '学生本人自述', OPTIONAL_RANGE_CONTEXT: '自愿提供的成绩区间', PARENT_OBSERVATION: '家长观察',
  UNSURE: '暂不确定', NOT_APPLICABLE: '不适用'
}

type Row = { text: string; heading?: boolean }
type Dict = Record<string, unknown>
const object = (value: unknown): Dict => value && typeof value === 'object' && !Array.isArray(value) ? value as Dict : {}
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : []
const str = (value: unknown): string => typeof value === 'string' || typeof value === 'number' ? String(value) : ''
function readable(value: unknown, options: Record<string, string>): string {
  if (Array.isArray(value)) return value.map(item => readable(item, options)).filter(Boolean).join('、')
  const code = str(value)
  if (!code) return ''
  if (Object.hasOwn(labels, code)) return labels[code]!
  if (Object.hasOwn(options, code)) return options[code]!
  if (code.startsWith('SUBJECT_STRENGTH_')) return '学科优势：' + readable(code.slice(17), options)
  if (code.startsWith('SUBJECT_')) return '学科重点：' + readable(code.slice(8), options)
  if (code.startsWith('ACTION_')) return '行动：' + readable(code.slice(7), options)
  return code
}
function growthRows(report: Report): Row[] {
  const result = object(report.resultPayload)
  const snapshot = object(result.student_snapshot)
  const options: Record<string, string> = Object.create(null)
  const versions = list(result.questionnaire_versions).map(str).filter(Boolean)
  if (isEducationSystem(snapshot.education_system)) {
    // Historical reports keep their recorded bank version. If that bank cannot be
    // resolved, retain the authoritative stored code rather than relabel from a new bank.
    for (const version of versions) {
      try {
        const bank = getEducationCompassQuestionnaireBank('LEVEL_2', snapshot.education_system, version)
        for (const question of bank.questions) {
          for (const option of [...question.options, ...(question.matrixSubjectOptions ?? []), ...(question.matrixRangeOptions ?? [])]) {
            options[option.code] = option.label
          }
        }
        break
      } catch { /* Historical bank may not be installed. Stored codes remain visible. */ }
    }
  }
  const rows: Row[] = []
  const heading = (text: string) => rows.push({ text, heading: true })
  const line = (title: string, value: unknown) => {
    const text = readable(value, options)
    if (text) rows.push({ text: title + '：' + text })
  }
  const signals = (value: unknown) => {
    const items = list(value)
    if (!items.length) rows.push({ text: '本项暂无可展示内容。' })
    for (const item of items) {
      const signal = object(item)
      line('信号', signal.code)
      line('证据维度', signal.dimension)
      line('状态', signal.status)
      line('依据题号', signal.evidence_refs)
      line('信息来源', signal.source)
    }
  }
  heading('01 学生成长快照')
  line('教育体系', snapshot.education_system)
  line('年级／阶段', snapshot.grade_stage)
  line('毕业或主要考试年份', snapshot.major_exam_year)
  line('考虑地区', snapshot.target_regions)
  line('学业状态自我观察', snapshot.performance_self_view)
  line('依据题号', snapshot.evidence_refs)
  const sections: [string, string][] = [
    ['02 优势信号', 'strength_signals'], ['03 学习卡点', 'learning_bottlenecks'],
    ['04 学科重点', 'subject_focus'], ['05 成长方向', 'growth_direction']
  ]
  for (const [title, key] of sections) { heading(title); signals(result[key]) }
  heading('06 30 天行动计划')
  const plan = object(result.action_plan_30d)
  line('计划周期（天）', plan.horizon_days)
  line('本人选择的行动', plan.selected_action_code)
  signals(plan.goals)
  heading('四大维度证据状态')
  const allSignals = [...list(result.learning_signals), ...list(result.interest_signals)].map(object)
  for (const dimension of ['ACADEMIC_PERFORMANCE','LEARNING_PROCESS','THINKING_LEARNING_STYLE','INTEREST_DIRECTION']) {
    const statuses = allSignals.filter(item => item.dimension === dimension).map(item => item.status)
    const status = statuses.includes('SUPPORTED') ? 'SUPPORTED' : statuses.includes('NEEDS_VALIDATION') ? 'NEEDS_VALIDATION' : 'UNKNOWN'
    line(readable(dimension, options), status)
  }
  heading('结果依据与版本')
  line('依据题号', result.evidence_refs)
  line('题库版本', versions)
  line('建议重点', result.recommended_focus)
  line('题库状态', result.system_result_marker)
  rows.push({ text: '仅反映本次回答的证据支持程度，不计算能力分、排名或百分位。' })
  return rows
}

export function reportPdfRows(report: Report): Row[] {
  const rows: Row[] = [
    { text: report.reportKind === 'STUDENT_GROWTH_DISCOVERY' ? '学生成长发现完整报告' : '教育成长规划完整报告', heading: true },
    { text: '报告编号：' + report.id },
    { text: '数据日期：' + report.dataAsOf },
    { text: '报告版本：' + (report.resultVersion || report.versions.templateVersion) }
  ]
  if (report.reportKind === 'STUDENT_GROWTH_DISCOVERY') {
    const result = object(report.resultPayload)
    invariant(['student_snapshot','strength_signals','learning_bottlenecks','subject_focus','growth_direction','action_plan_30d'].every(key => Object.hasOwn(result, key)), 409, 'REPORT_NOT_READY', '成长报告六项结果尚未齐备')
    rows.push(...growthRows(report))
  } else {
    for (const [index, module] of (report.modules ?? []).entries()) {
      rows.push({ text: (index + 1) + ' ' + module.title, heading: true })
      if (module.summary) rows.push({ text: module.summary })
      for (const item of module.items ?? []) rows.push({ text: '• ' + item })
    }
  }
  if (report.sources.length) {
    rows.push({ text: '资料来源', heading: true })
    for (const source of report.sources) {
      rows.push({ text: source.sourceId + ' ｜ ' + source.applicableYear + ' ｜ ' + source.verifiedAt + ' ｜ ' + source.dataVersion })
    }
  }
  rows.push({ text: '生成边界与免责声明', heading: true }, { text: report.disclaimer })
  return rows
}

// CJK review renderer. Standard Adobe GB1 font, not embedded: platform glyph
// coverage and true-device PDF viewing remain a separate release gate.
// Unsupported supplementary-plane text fails closed; do not silently drop glyphs.
function hex(text: string): string {
  return Buffer.from(text, 'utf16le').swap16().toString('hex').toUpperCase()
}
function wrap(row: Row): Row[] {
  const result: Row[] = []
  for (const line of row.text.replace(/\r\n?/g, '\n').replace(/\t/g, ' ').split('\n')) {
    const chars = Array.from(line)
    invariant(chars.every(char => { const code = char.codePointAt(0)!; return code >= 32 && code <= 0xFFFF && !(code >= 0xD800 && code <= 0xDFFF) && !(code >= 0xE000 && code <= 0xF8FF) && code !== 0xFFFD }), 409, 'REPORT_PDF_CHAR_UNSUPPORTED', '报告包含当前 PDF 字体尚不能安全呈现的字符')
    const width = row.heading ? 32 : 39
    for (let i = 0; i < chars.length; i += width) result.push({ text: chars.slice(i, i + width).join(''), heading: row.heading })
  }
  return result
}
function stream(body: string): string {
  return '<< /Length ' + Buffer.byteLength(body, 'ascii') + ' >>\nstream\n' + body + '\nendstream'
}
function unicodeMap(chars: string[]): string {
  const blocks: string[] = []
  for (let i = 0; i < chars.length; i += 100) {
    const group = chars.slice(i, i + 100)
    blocks.push(group.length + ' beginbfchar\n' + group.map(c => '<' + hex(c) + '> <' + hex(c) + '>').join('\n') + '\nendbfchar')
  }
  return [
    '/CIDInit /ProcSet findresource begin', '12 dict begin', 'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    '/CMapName /PhoenixUnicode def', '/CMapType 2 def',
    '1 begincodespacerange', '<0000> <FFFF>', 'endcodespacerange', ...blocks,
    'endcmap', 'CMapName currentdict /CMap defineresource pop', 'end', 'end'
  ].join('\n')
}
export function renderSimpleReportPdf(report: Report): Buffer {
  const lines = reportPdfRows(report).flatMap(wrap)
  invariant(lines.length > 0, 409, 'REPORT_NOT_READY', '报告内容为空')
  const pages: Row[][] = []
  for (let i = 0; i < lines.length; i += 38) pages.push(lines.slice(i, i + 38))
  const pageRows = pages.map((page, index) => [
    { text: '凤启教育罗盘 ｜ Phoenix Education Compass', heading: true },
    ...page, { text: '第 ' + (index + 1) + ' / ' + pages.length + ' 页' }
  ])
  const chars = [...new Set(Array.from(pageRows.flat().map(row => row.text).join('')))]
  const kids = pages.map((_, index) => (7 + index * 2) + ' 0 R').join(' ')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [' + kids + '] /Count ' + pages.length + ' >>',
    '<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [4 0 R] /ToUnicode 6 0 R >>',
    '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 5 >> /FontDescriptor 5 0 R /DW 1000 >>',
    '<< /Type /FontDescriptor /FontName /STSong-Light /Flags 6 /FontBBox [-250 -143 600 857] /ItalicAngle 0 /Ascent 857 /Descent -143 /CapHeight 857 /StemV 91 >>',
    stream(unicodeMap(chars))
  ]
  for (const [index, page] of pageRows.entries()) {
    const pageId = 7 + index * 2
    const content = page.map((row, rowIndex) => {
      const y = rowIndex === page.length - 1 ? 34 : 796 - rowIndex * 19
      const size = row.heading ? 14 : 12
      return 'BT /F1 ' + size + ' Tf 1 0 0 1 48 ' + y + ' Tm <' + hex(row.text) + '> Tj ET'
    }).join('\n')
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + (pageId + 1) + ' 0 R >>', stream(content))
  }
  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%Phoenix\n', 'ascii')]
  const offsets = [0]
  let position = chunks[0]!.length
  for (const [index, body] of objects.entries()) {
    offsets.push(position)
    const chunk = Buffer.from((index + 1) + ' 0 obj\n' + body + '\nendobj\n', 'ascii')
    chunks.push(chunk)
    position += chunk.length
  }
  const xref = [
    'xref', '0 ' + (objects.length + 1), '0000000000 65535 f ',
    ...offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n '),
    'trailer', '<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>',
    'startxref', String(position), '%%EOF\n'
  ].join('\n')
  return Buffer.concat([...chunks, Buffer.from(xref, 'ascii')])
}
