const assert = require('assert')

const storage = new Map()
const uploadCalls = []
const requestCalls = []
const navigationCalls = []

function mergePath(target, path, value) {
  const parts = path.split('.')
  let cursor = target
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]
    if (cursor[part] === undefined) cursor[part] = {}
    cursor = cursor[part]
  }
  cursor[parts[parts.length - 1]] = value
}

function installWx() {
  global.wx = {
    getStorageSync: (key) => storage.get(key), setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key), getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }),
    getRandomValues: (bytes) => bytes.fill(7), getFileInfo: ({ success }) => success({ size: 128, digest: 'hash-docx-1' }),
    uploadFile: (options) => {
      uploadCalls.push(options)
      if (global.__beforeUploadResponse) global.__beforeUploadResponse(options)
      if (global.__uploadResult) options.success(global.__uploadResult)
      else options.success({ statusCode: 201, data: JSON.stringify({ document: { id: `doc_${uploadCalls.length}`, type: options.formData.type, fileName: options.formData.originalName, size: 128, uploadStatus: 'UPLOADED', parseStatus: 'PENDING', contentHash: 'hash-docx-1' } }) })
    },
    request: (options) => options.success({ statusCode: 200, data: {} }),
    requirePrivacyAuthorize: ({ success }) => success(),
    chooseMessageFile: ({ success }) => success({ tempFiles: [{ tempFilePath: '/tmp/fake.pdf', name: '成绩单.pdf', size: 128, type: 'file' }] }),
    chooseMedia: ({ success }) => success({ tempFiles: [{ tempFilePath: '/tmp/fake.png', name: '证明.png', size: 128, fileType: 'image' }] }),
    chooseImage: ({ success }) => success({ tempFiles: [{ tempFilePath: '/tmp/fake.png', name: '证明.png', size: 128, type: 'image' }] }),
    downloadFile: (options) => {
      if (global.__beforeDownloadResponse) global.__beforeDownloadResponse(options)
      options.success({ statusCode: 200, tempFilePath: '/tmp/authorized-file' })
    },
    previewImage: ({ success }) => success(), openDocument: ({ success }) => success(),
    showToast: () => undefined, showModal: ({ success }) => success && success({ confirm: true }),
    navigateTo: (options) => navigationCalls.push({ type: 'navigateTo', ...options }),
    redirectTo: (options) => navigationCalls.push({ type: 'redirectTo', ...options }),
    navigateBack: (options) => navigationCalls.push({ type: 'navigateBack', ...options }),
    switchTab: (options) => navigationCalls.push({ type: 'switchTab', ...options }),
    reLaunch: (options) => navigationCalls.push({ type: 'reLaunch', ...options })
  }
}

function loadPage(relative) {
  let definition
  const previous = global.Page
  global.Page = (value) => { definition = value }
  delete require.cache[require.resolve(relative)]
  require(relative)
  if (previous) global.Page = previous
  else delete global.Page
  assert(definition, `${relative} did not register a page`)
  definition.data = JSON.parse(JSON.stringify(definition.data || {}))
  definition.setData = function setData(patch) {
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (key.includes('.')) mergePath(this.data, key, value)
      else this.data[key] = value
    })
  }
  return definition
}

async function run() {
  installWx()
  let currentUserId = 'user_1'
  global.getApp = () => ({ getCurrentUser: () => currentUserId ? ({ id: currentUserId, role: 'family_user' }) : null })
  const config = require('../config/masters')
  config.setEnabledForTests(true)
  const model = require('../models/masters-intake')
  const api = require('../services/api')
  const masters = require('../services/masters')
  const originalRequest = api.request
  const originalUploadResult = global.__uploadResult

  api.setAccessToken('trusted-token')
  api.request = async (path, options = {}) => {
    requestCalls.push({ path, options })
    if (path === '/v1/masters/capabilities') return { contractVersion: 'masters-intake-v1.1', consentVersion: config.SERVICE_CONSENT_VERSION, serviceConsentText: '测试服务资料保留 14 天，仅用于咨询。', maxFileBytes: model.MAX_DOCUMENT_SIZE, maxDocuments: model.MAX_DOCUMENTS, retentionDays: 14 }
    if (path === '/v1/masters/consultations' && options.method === 'POST') return { consultation: { id: 'c1', profileVersion: 1, status: 'DRAFT', profile: model.emptyProfile(), documents: [], consent: { accepted: true } } }
    if (path === '/v1/masters/consultations/c1') return { consultation: { id: 'c1', profileVersion: 1, status: 'DRAFT', profile: model.emptyProfile(), documents: [], consent: { accepted: true } } }
    if (path.endsWith('/extraction/resolve')) return { document: { id: 'doc_resume', type: 'RESUME', name: 'resume.docx', sizeBytes: 128, sha256: 'hash-docx-1', uploadStatus: 'UPLOADED', parseStatus: 'SUCCEEDED' }, consultation: { id: 'c1', profileVersion: Number(options.data && options.data.version || 1) + 1, status: 'DRAFT', profile: options.data && options.data.accepted ? model.normalizeProfile({ [options.data.field]: options.data.value }) : model.emptyProfile(), documents: [] } }
    if (path.endsWith('/extraction')) return { fields: [], conflicts: [] }
    if (path.endsWith('/confirm')) return { consultation: { id: 'c1', profileVersion: 1, status: 'DRAFT', profile: model.emptyProfile(), documents: [] } }
    if (path.endsWith('/submit')) return { consultation: { id: 'c1', profileVersion: 1, status: 'SUBMITTED', profile: model.emptyProfile(), documents: [] } }
    if (path.includes('/documents/') && options.method === 'DELETE') return { consultation: { id: 'c1', profileVersion: 2, status: 'DRAFT', profile: model.emptyProfile(), documents: [] } }
    if (path.endsWith('/retry')) return { document: { id: 'doc_retry', type: 'TRANSCRIPT', name: '成绩单.pdf', sizeBytes: 128, sha256: 'hash-docx-1', uploadStatus: 'UPLOADED', parseStatus: 'MANUAL_REVIEW' }, consultation: { id: 'c1', profileVersion: 2, status: 'DRAFT', profile: model.emptyProfile(), documents: [] } }
    if (path.endsWith('/withdraw')) return { consultation: { id: 'c1', profileVersion: 1, status: 'WITHDRAWN', profile: model.emptyProfile(), documents: [] } }
    if (path.endsWith('/report')) return { report: { id: 'r1', status: 'RELEASED', version: 1, payload: { candidatePrograms: [] } } }
    throw new Error(`unexpected request ${path}`)
  }

  const profile = model.normalizeProfile({
    name: '虚构学生', contact: { type: 'wechat', value: 'fake-contact' }, languageType: 'IELTS',
    languageScores: { total: '7.0', subscores: { listening: '7.5' }, examDate: '2026-06-01' }, targetYear: 'UNDECIDED'
  })
  assert.strictEqual(profile.contact.type, 'wechat')
  assert.strictEqual(profile.languageScores.subscores.listening, '7.5')
  assert.strictEqual(profile.languageScores.examDate, '2026-06-01')
  assert.strictEqual(Object.prototype.hasOwnProperty.call(profile, 'languageDate'), false)
  const draft = model.resumeDraft({
    ...profile, degree: '文学学士', averageScore: '86.5', gpa: '3.7', gpaScale: '4.0',
    experiences: [{ type: 'RESEARCH', title: '实验室项目', organization: '虚构实验室', description: '整理公开数据', startDate: '', endDate: '' }, { type: 'INTERNSHIP' }]
  })
  assert.strictEqual(draft.title, '简历草稿（仅据本人提供事实）')
  assert(draft.text.includes('文学学士') && draft.text.includes('均分 86.5') && draft.text.includes('GPA 3.7') && draft.text.includes('分制 4.0'))
  assert(draft.text.includes('IELTS') && draft.text.includes('实验室项目') && !draft.text.includes('undefined'))
  const dtoDocument = model.normalizeDocument({ id: 'dto1', type: 'TRANSCRIPT', sizeBytes: 4096, sha256: 'sha256-dto', originalName: 'transcript.pdf' })
  assert.strictEqual(dtoDocument.size, 4096)
  assert.strictEqual(dtoDocument.contentHash, 'sha256-dto')
  assert.strictEqual(model.normalizeConsultation({ consultation: { id: 'dto-c', profileVersion: 9, profile: model.emptyProfile() } }).version, '9')
  const cards = model.buildMaterialCards([{ id: 'doc_grad', type: 'GRADUATION', name: '毕业证.jpg', size: 100 }], 'ENROLLED')
  assert(cards.hiddenDocuments.some((item) => item.type === 'GRADUATION'), 'hidden status material must remain visible in other categories')
  assert(cards.cards.find((item) => item.type === 'ENROLLMENT').visible)

  const created = await masters.createConsultation({ targetYear: 'UNDECIDED', channel: 'partner', path: 'RESUME', serviceConsent: { accepted: true } }, 'create-key-1')
  assert.strictEqual(created.id, 'c1')
  const createCall = requestCalls.find((item) => item.options.method === 'POST' && item.path === '/v1/masters/consultations')
  assert.strictEqual(createCall.options.headers['Idempotency-Key'], 'create-key-1')
  assert.deepStrictEqual(createCall.options.data.serviceConsent, { accepted: true, copyVersion: 'masters_service_consent_v1.1' })
  await masters.confirmConsultation('c1', 1, { accuracyConfirmed: true, consent: { accepted: true } }, 'confirm-key-1')
  await masters.submitConsultation('c1', 1, 'submit-key-1')
  const retried = await masters.retryDocumentExtraction('c1', 'doc1', 1, 'retry-key-1')
  assert.strictEqual(retried.document.id, 'doc_retry')
  const retryCall = requestCalls.find((item) => item.options.method === 'POST' && item.path.endsWith('/documents/doc1/retry'))
  assert.strictEqual(retryCall.options.headers['Idempotency-Key'], 'retry-key-1')
  assert.deepStrictEqual(retryCall.options.data, { version: 1 })

  const uploaded = await masters.uploadDocument('c1', { filePath: '/tmp/resume.docx', name: 'resume.docx', size: 128, mimeType: 'file' }, { version: 1, type: 'RESUME', idempotencyKey: 'upload-key-1' })
  assert.strictEqual(uploaded.document.id, 'doc_1')
  assert.strictEqual(uploadCalls[0].name, 'file')
  assert.strictEqual(uploadCalls[0].formData.version, '1')
  assert.strictEqual(uploadCalls[0].formData.type, 'RESUME')
  assert.strictEqual(uploadCalls[0].formData.originalName, 'resume.docx')
  assert.strictEqual(uploadCalls[0].header.Authorization, 'Bearer trusted-token')
  assert.strictEqual(uploadCalls[0].header['Idempotency-Key'], 'upload-key-1')
  await assert.rejects(() => masters.uploadDocument('c1', { filePath: '/tmp/old.doc', name: 'old.doc', size: 128 }, { version: 1, type: 'RESUME' }), (error) => error.code === 'FILE_TYPE_UNSUPPORTED')
  global.__uploadResult = { statusCode: 503, data: JSON.stringify({ error: { code: 'UPLOAD_FAILED', message: '服务端暂时不可用' } }) }
  await assert.rejects(() => masters.uploadDocument('c1', { filePath: '/tmp/fail.pdf', name: 'fail.pdf', size: 128 }, { version: 1, type: 'TRANSCRIPT' }), (error) => error.code === 'UPLOAD_FAILED')
  global.__uploadResult = originalUploadResult
  assert.strictEqual((await masters.chooseMessageFiles(1))[0].name, '成绩单.pdf')
  assert.strictEqual((await masters.chooseImages(1))[0].name, '证明.png')
  const requestForTokenTest = api.request
  api.request = async () => { api.setAccessToken('rotated-token'); return { consultation: { id: 'c1', profileVersion: 1, status: 'DRAFT', profile: model.emptyProfile(), documents: [] } } }
  await assert.rejects(() => masters.getConsultation('c1'), (error) => error.code === 'AUTH_CONTEXT_CHANGED')
  api.request = requestForTokenTest
  api.setAccessToken('trusted-token')
  global.__beforeUploadResponse = () => api.setAccessToken('rotated-token')
  await assert.rejects(() => masters.uploadDocument('c1', { filePath: '/tmp/rotated.pdf', name: 'rotated.pdf', size: 128 }, { version: 1, type: 'TRANSCRIPT' }), (error) => error.code === 'AUTH_CONTEXT_CHANGED')
  delete global.__beforeUploadResponse
  api.setAccessToken('trusted-token')
  global.__beforeDownloadResponse = () => api.setAccessToken('rotated-token')
  await assert.rejects(() => masters.downloadDocument('c1', 'doc_1'), (error) => error.code === 'AUTH_CONTEXT_CHANGED')
  delete global.__beforeDownloadResponse
  api.setAccessToken('trusted-token')

  const fullDocuments = Array.from({ length: 20 }, (_, index) => ({ id: `full_${index}`, type: 'RESUME', name: `resume_${index}.pdf`, size: 128 }))
  await assert.rejects(() => masters.uploadDocument('c1', { filePath: '/tmp/replacement.pdf', name: 'replacement.pdf', size: 128 }, { version: 1, type: 'RESUME', existingDocuments: fullDocuments }), (error) => error.code === 'DOCUMENT_LIMIT_REACHED')
  const replacement = await masters.uploadDocument('c1', { filePath: '/tmp/replacement.pdf', name: 'replacement.pdf', size: 128 }, { version: 1, type: 'RESUME', existingDocuments: fullDocuments, replaceDocumentId: 'full_0' })
  assert(replacement.document.id, 'replacing one document at the limit must still use actual upload')
  assert.strictEqual(uploadCalls[uploadCalls.length - 1].formData.replaceDocumentId, 'full_0')

  const freshPage = loadPage('../pages/masters-materials/index.js')
  masters.clearDraftId()
  freshPage.onLoad({ path: 'RESUME' })
  freshPage.setData({ loggedIn: true })
  await freshPage.loadConsultation()
  assert.strictEqual(freshPage.data.cards.length, 7, 'a new consultation must show its material cards before a server draft exists')
  assert.strictEqual(freshPage.data.retentionDays, 14, 'consent must show the server retention policy')
  assert.strictEqual(freshPage.data.uploadConfigReady, true)
  const requestForCapabilities = api.request
  api.request = async () => { throw new Error('Rules unavailable') }
  assert.strictEqual(await freshPage.loadUploadConfiguration(), false)
  let choseWithoutRules = false
  const chooseForCapabilities = masters.chooseMessageFiles
  masters.chooseMessageFiles = async () => { choseWithoutRules = true; return [] }
  await freshPage.selectUpload({ currentTarget: { dataset: { type: 'RESUME', source: 'file' } } })
  assert.strictEqual(choseWithoutRules, false, 'file selection must wait for the actual retention and upload policy')
  masters.chooseMessageFiles = chooseForCapabilities
  api.request = requestForCapabilities

  const materialsPage = loadPage('../pages/masters-materials/index.js')
  materialsPage.onLoad({ path: 'GUIDED', channel: 'partner' })
  materialsPage.setData({ loggedIn: true, consultationId: 'c1', version: 1, serviceConsent: true, documents: [], profile: model.emptyProfile() })
  materialsPage.data.profile.adultConfirmed = true
  const originalChoose = masters.chooseMessageFiles
  const originalUpload = masters.uploadDocument
  const pageUploadTypes = []
  let supplementalDescription
  masters.chooseMessageFiles = async () => [{ tempFilePath: '/tmp/fake.pdf', name: 'same.pdf', size: 128, type: 'file' }]
  masters.uploadDocument = async (id, file, options) => {
    pageUploadTypes.push(options.type)
    if (options.type === 'SUPPLEMENTAL') supplementalDescription = options.description
    return { document: { id: `server_${options.type}`, type: options.type, name: file.name, size: file.size, uploadStatus: 'UPLOADED', parseStatus: 'PENDING' } }
  }
  materialsPage.supplementalDescriptionChange({ detail: { value: '科研：虚构课程项目证明' } })
  for (const type of model.DOCUMENT_TYPES) await materialsPage.selectUpload({ currentTarget: { dataset: { type, source: 'file' } } })
  assert.deepStrictEqual(pageUploadTypes, model.DOCUMENT_TYPES, 'each of the seven cards must invoke the typed upload contract')
  assert.strictEqual(supplementalDescription, '科研：虚构课程项目证明')
  const filesBeforeGuided = materialsPage.data.documents.slice()
  materialsPage.switchToGuided()
  assert.strictEqual(materialsPage.data.path, 'GUIDED')
  assert.deepStrictEqual(materialsPage.data.documents, filesBeforeGuided, 'switching to guided must retain saved materials')
  materialsPage.setData({ documents: [{ id: 'saved-grad', type: 'GRADUATION', name: '毕业证.jpg', size: 128 }] })
  materialsPage.educationStatusChange({ detail: { value: 'ENROLLED' } })
  assert(materialsPage.data.hiddenDocuments.some((item) => item.type === 'GRADUATION'))
  materialsPage.educationStatusChange({ detail: { value: 'GRADUATED' } })
  assert(materialsPage.data.cards.find((item) => item.type === 'DEGREE').visible)
  materialsPage.setData({
    profile: model.normalizeProfile({ institution: '本人已填写院校' }),
    extractionFields: [{ field: 'institution', value: '识别院校', documentId: 'doc1', sourceName: '成绩单.pdf' }]
  })
  let savedProfile
  const originalSaveProfile = masters.saveProfile
  masters.saveProfile = async (id, version, value) => { savedProfile = value; return { id: 'c1', profileVersion: version, status: 'DRAFT', profile: value, documents: [] } }
  await materialsPage.adoptExtraction({ currentTarget: { dataset: { index: 0 } } })
  assert.strictEqual(savedProfile, undefined, 'adopting extraction must preserve an existing profile field without overwriting it')
  materialsPage.setData({ profile: model.emptyProfile(), version: 1, extractionFields: [{ field: 'name', value: '识别学生', documentId: 'doc1', sourceName: '简历.docx' }] })
  await materialsPage.adoptExtraction({ currentTarget: { dataset: { index: 0 } } })
  assert.strictEqual(materialsPage.data.profile.name, '识别学生')
  assert.strictEqual(materialsPage.data.version, 2, 'accepted extraction must apply the returned consultation version')
  materialsPage.setData({ extractionFields: [{ field: 'name', value: '识别学生', documentId: 'doc1', sourceName: '简历.docx' }] })
  await materialsPage.rejectExtraction({ currentTarget: { dataset: { index: 0 } } })
  assert.strictEqual(materialsPage.data.version, 3, 'rejected extraction must apply the returned consultation version')
  masters.saveProfile = originalSaveProfile
  materialsPage.loadedUserId = 'user_1'
  materialsPage.loadedForUser = true
  materialsPage.setData({ consultationId: 'c1', profile: model.normalizeProfile({ name: '前一账号' }), documents: [{ id: 'private-doc', type: 'RESUME', name: 'private.docx' }], extractionFields: [{ field: 'name', value: '前一账号', documentId: 'private-doc' }] })
  currentUserId = 'user_2'
  materialsPage.onShow()
  assert.strictEqual(materialsPage.data.consultationId, '')
  assert.strictEqual(materialsPage.data.profile.name, '')
  assert.strictEqual(materialsPage.data.documents.length, 0)
  assert.strictEqual(materialsPage.data.extractionFields.length, 0)
  const confirmPage = loadPage('../pages/masters-confirm/index.js')
  confirmPage.onLoad({ id: 'c1' })
  confirmPage.loadedUserId = 'user_1'
  confirmPage.loaded = true
  confirmPage.setData({ consultationId: 'c1', profile: model.normalizeProfile({ name: '前一账号' }), documents: [{ id: 'private-doc', type: 'RESUME', name: 'private.docx' }], resumeDraft: model.resumeDraft({ name: '前一账号' }) })
  confirmPage.onShow()
  assert.strictEqual(confirmPage.data.consultationId, '')
  assert.strictEqual(confirmPage.data.profile.name, '')
  assert.strictEqual(confirmPage.data.documents.length, 0)
  currentUserId = 'user_1'
  masters.chooseMessageFiles = originalChoose
  masters.uploadDocument = originalUpload

  const intakePage = loadPage('../pages/masters-intake/index.js')
  intakePage.onLoad({ channel: 'not-allowed' })
  const share = intakePage.onShareAppMessage()
  assert(/channel=organic$/.test(share.path), 'share payload must use a whitelist channel only')
  assert(!/reportId|studentId|price|39\.9/i.test(JSON.stringify(share)))
  const mastersSources = ['../pages/masters-intake/index.wxml', '../pages/masters-materials/index.wxml', '../pages/masters-confirm/index.wxml', '../pages/masters-status/index.wxml', '../pages/masters-report/index.wxml'].map((file) => require('fs').readFileSync(require('path').resolve(__dirname, file), 'utf8')).join('\n')
  assert(!/[¥￥]|39\.9|微信支付|套餐/.test(mastersSources), 'masters entry must stay free and separate from paid Compass')

  masters.clearDraftId('c1')
  config.resetEnabledForTests()
  api.request = originalRequest
  api.setAccessToken('')
  if (originalUploadResult === undefined) delete global.__uploadResult
  else global.__uploadResult = originalUploadResult
  console.log('✓ masters client: fields, consent separation, seven real typed uploads, persistence/error states, status switching, share and paid isolation')
}

if (require.main === module) run().catch((error) => { console.error(error); process.exitCode = 1 })
module.exports = { run }
