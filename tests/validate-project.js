const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))

const originalPages = [
  'pages/welcome/index', 'pages/home/index', 'pages/family-edit/index', 'pages/student-edit/index',
  'pages/compass/index', 'pages/compass-questionnaire/index', 'pages/report/index', 'pages/timeline/index',
  'pages/advisor-request/index', 'pages/mine/index', 'pages/admin-families/index', 'pages/admin-family/index'
]
const partnerPages = ['pages/partner/yuanchao/index', 'pages/partner/music-exploration/index', 'pages/partner/apply/index']
assert.strictEqual(appConfig.pages.length, originalPages.length + partnerPages.length, 'unexpected page count')
for (const page of originalPages) assert(appConfig.pages.includes(page), `original MVP route removed: ${page}`)
for (const page of partnerPages) assert(appConfig.pages.includes(page), `missing Partner Experience route: ${page}`)
for (const page of appConfig.pages) {
  for (const extension of ['js', 'json', 'wxml', 'wxss']) {
    const file = path.join(root, `${page}.${extension}`)
    assert(fs.existsSync(file), `missing ${page}.${extension}`)
  }
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}

for (const file of walk(root)) {
  if (file.includes(`${path.sep}node_modules${path.sep}`)) continue
  const content = fs.readFileSync(file, 'utf8')
  if (file.endsWith('.json')) JSON.parse(content)
  if (file.endsWith('.js')) new Function('require', 'module', 'exports', 'getApp', 'wx', content)
  if (file.endsWith('.wxml')) {
    assert(!content.includes('.slice('), `unsupported method call in WXML: ${file}`)
    assert(!content.includes('<script'), `script must not appear in WXML: ${file}`)
  }
}

const schema = require('../models/schema')
for (const required of ['users', 'families', 'students', 'assessments', 'reports', 'timelineEvents', 'advisorNotes', 'analyticsEvents', 'partners', 'permissions', 'partnerExplorations', 'partnerApplications']) {
  assert(schema.tables[required], `missing model ${required}`)
}

console.log(`✓ project structure: ${appConfig.pages.length} pages, JSON and JS syntax valid`)
console.log('✓ original MVP routes, Partner Experience routes and required data models present')
