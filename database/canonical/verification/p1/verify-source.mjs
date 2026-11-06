import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {existsSync,readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import path from 'node:path'

const root=process.cwd()
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex')
const candidate=path.resolve(root,'database/canonical/forward-candidates/service-workbench/0038_service_project_workbench.sql')
const manifest=JSON.parse(readFileSync(path.resolve(root,'database/canonical/forward-candidates/service-workbench/manifest.json'),'utf8'))
assert.equal(hash(candidate),manifest.sha256,'P0 0038 candidate hash drifted')
const summary=path.resolve(root,'database/canonical/forward-candidates/service-workbench/0039_service_project_summary.sql')
const summaryManifest=JSON.parse(readFileSync(path.resolve(root,'database/canonical/forward-candidates/service-workbench/manifest-0039-summary.json'),'utf8'))
assert.equal(hash(summary).toUpperCase(),summaryManifest.sha256,'P1 0039 candidate hash drifted')
assert.match(readFileSync(summary,'utf8'),/^BEGIN;\n/)
assert.match(readFileSync(summary,'utf8'),/\nCOMMIT;\n$/)
const status=execFileSync('git',['status','--short','--untracked-files=all'],{encoding:'utf8'})
assert.doesNotMatch(status,/database[\\/]+canonical[\\/]+migrations[\\/]+0038|database[\\/]+canonical[\\/]+migrations[\\/]+0039/,'Active migrations must not be modified or promoted by P1')
const bridge=readFileSync(path.resolve(root,'website/phoenix-nova-website-v5/lib/customer-canonical-bridge.ts'),'utf8')
assert.match(bridge,/readCustomerSession/)
assert.match(bridge,/provider\.resolve/)
assert.match(bridge,/CANONICAL_ACCESS_ATTEMPT/)
assert.match(bridge,/CANONICAL_ACCESS_GRANTED/)
assert.match(bridge,/x-customer-id/)
const acceptance=readFileSync(path.resolve(root,'database/canonical/verification/p1/acceptance.mjs'),'utf8')
const browser=readFileSync(path.resolve(root,'database/canonical/verification/p1/browser.mjs'),'utf8')
for(const marker of [
 'createServer',
 'D1 client A summary',
 'same-family subject isolation',
 'client C receives multiple',
 'real empty state',
 'project authorization revocation',
 'expires_at',
 'TASK_STATUS',
 'SCHOOL_SELECTION',
 'rt.call',
 'synthetic D1 outage',
 'SERVICE_WORKBENCH_API_ORIGIN'
])assert.ok((acceptance+'\n'+browser).includes(marker),'P1 acceptance coverage missing: '+marker)
for(const marker of [
 'startP1Fixture',
 'PLAYWRIGHT_MODULE',
 'FamilyCenterV2',
 'family-center-v2.css',
 'ServiceWorkbench',
 'routeMocking:false',
 'Synthetic isolated browser component harness',
 'client-identity',
 'client-c',
 'client-empty',
 'There are no service projects to show yet',
 'Service history',
 'On hold',
 'scrollWidth'
])assert.ok(browser.includes(marker),'P1 browser coverage missing: '+marker)
for(const file of [
 'database/canonical/verification/p1/acceptance.mjs',
 'website/phoenix-nova-website-v5/lib/customer-canonical-bridge.ts',
 'website/phoenix-nova-website-v5/lib/family-service-summary.ts'
])assert.ok(path.isAbsolute(path.resolve(root,file)),'P1 source path must be repository-relative')
for(const file of [
 'database/canonical/verification/p1/acceptance.mjs',
 'website/phoenix-nova-website-v5/lib/customer-canonical-bridge.ts',
 'website/phoenix-nova-website-v5/lib/family-service-summary.ts'
])assert.ok(existsSync(path.resolve(root,file)),'Required P1 source is missing: '+file)
console.log('PASS P0 0038 immutable candidate and P1 0039 manifest integrity')
