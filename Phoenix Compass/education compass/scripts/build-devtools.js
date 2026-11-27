const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { buildDevelopment } = require('./build-development')
const { buildRelease, DIST_ROOT } = require('./build-release')

// WeChat DevTools keeps a file watcher on whichever dist/ directory it has open,
// which makes the atomic directory swap in build:development / build:release fail
// with EBUSY on Windows. Build atomically into an unwatched sibling, then mirror it
// into the watched directory file-by-file so DevTools can stay open and hot-reload.
const STAGING_DIRECTORY = path.join(DIST_ROOT, 'devtools-staging')
const TARGET_DIRECTORY = path.join(DIST_ROOT, 'development')
const RELEASE_STAGING_DIRECTORY = path.join(DIST_ROOT, 'devtools-release-staging')
const RELEASE_TARGET_DIRECTORY = path.join(DIST_ROOT, 'release')

function mirrorDirectory(source, destination) {
  if (process.platform !== 'win32') {
    throw new Error('build:devtools is only needed on Windows; use build:development elsewhere')
  }
  const result = spawnSync('robocopy', [source, destination, '/MIR', '/NFL', '/NDL', '/NJH', '/NP', '/R:3', '/W:1'], {
    encoding: 'utf8'
  })
  // robocopy exit codes 0-7 mean success; 8 and above mean at least one failure.
  if (result.error || result.status === null || result.status >= 8) {
    throw new Error(`robocopy failed (exit ${result.status}): ${result.stdout || ''}${result.stderr || ''}`)
  }
  return result.stdout.trim()
}

function buildDevtools(options = {}) {
  const staging = buildDevelopment({ ...options, outputDirectory: STAGING_DIRECTORY })
  const summary = mirrorDirectory(staging, TARGET_DIRECTORY)
  return { staging, target: TARGET_DIRECTORY, summary }
}

// Same trick for the remote build, so a release candidate can be regenerated while
// the tester-facing project is still open in DevTools. The artifact is byte-for-byte
// what build:release produces; only the way it reaches dist/release differs.
function buildDevtoolsRelease(options = {}) {
  const staging = buildRelease({ ...options, outputDirectory: RELEASE_STAGING_DIRECTORY })
  const provenance = JSON.parse(fs.readFileSync(path.join(staging, 'RELEASE_BUILD.json'), 'utf8'))
  // 没有 PHOENIX_API_BASE_URL / PHOENIX_MINIPROGRAM_APPID 时，buildRelease 会回落到
  // OFFLINE_TEST_ONLY（touristappid + education-compass-offline-test.invalid）。
  // 这种包一旦被镜像进 dist/release，开发工具里就会显示"无 AppID 关联"并在控制台
  // 报 ERR_NAME_NOT_RESOLVED，还可能被当成正式包上传。直接拦住，不再静默覆盖。
  if (provenance.artifactClass !== 'STAGING_OR_RELEASE_BUILD') {
    throw new Error(
      'build:devtools:release 需要 PHOENIX_API_BASE_URL 与 PHOENIX_MINIPROGRAM_APPID；' +
      `本次只生成了 ${provenance.artifactClass} 离线包（${staging}），未同步到 dist/release。`
    )
  }
  const summary = mirrorDirectory(staging, RELEASE_TARGET_DIRECTORY)
  return { staging, target: RELEASE_TARGET_DIRECTORY, summary, artifactClass: provenance.artifactClass }
}

if (require.main === module) {
  const wantsRelease = process.argv.slice(2).includes('--release')
  const { staging, target, summary, artifactClass } = wantsRelease ? buildDevtoolsRelease() : buildDevtools()
  if (summary) console.log(summary)
  console.log(`${artifactClass || 'LOCAL_DEVTOOLS_LOOPBACK_ONLY'} build synced: ${staging} -> ${target}`)
}

module.exports = {
  buildDevtools, buildDevtoolsRelease, mirrorDirectory,
  RELEASE_STAGING_DIRECTORY, RELEASE_TARGET_DIRECTORY, STAGING_DIRECTORY, TARGET_DIRECTORY
}
