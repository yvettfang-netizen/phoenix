import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root=fileURLToPath(new URL('../../../..',import.meta.url))
const sqlPath=resolve(root,'database/canonical/forward-candidates/service-workbench/0039_service_project_summary.sql')
const manifestPath=resolve(root,'database/canonical/forward-candidates/service-workbench/manifest-0039-summary.json')
const servicePath=resolve(root,'Phoenix Compass/education compass/server/src/services/service-workbench.ts')
const sql=readFileSync(sqlPath,'utf8')
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'))
const service=readFileSync(servicePath,'utf8')

assert.equal(createHash('sha256').update(sql).digest('hex').toUpperCase(),manifest.sha256)
assert.match(sql,/BEGIN;\s*[\s\S]*CREATE FUNCTION service\.workbench_summary\(/)
assert.match(sql,/p_limit integer DEFAULT 20/)
assert.match(sql,/p_limit < 1 OR p_limit > 50/)
assert.match(sql,/service\.workbench_can_read\(p\.service_project_id\)/)
assert.match(sql,/service\.workbench_opened\(p\.service_project_id\)/)
assert.match(sql,/service\.workbench_subject\(a\.service_project_id,s\.subject_person_id\)/)
for(const field of ['service_project_id','name','compass','status','current_stage','adviser','next_milestone','customer_todo_count','overdue_count','latest_progress','detail_href'])
  assert.match(sql,new RegExp("'" + field + "'"))
assert.match(sql,/'as_of'/)
assert.match(sql,/'expires_at'/)
assert.match(sql,/'next_cursor'/)
for(const forbidden of ['workbench_materials','service.deliverables','workbench_messages','workbench_commercial_events','docs.documents','document_versions','insurance'])
  assert.doesNotMatch(sql,new RegExp(forbidden))
assert.match(service,/resource==='summary'\?'SELECT service\.workbench_summary\(\$1,\$2::timestamptz,\$3::uuid\) AS result'/)
assert.match(service,/route==='summary'&&\(method==='GET'\|\|method==='POST'\)/)
assert.match(service,/method==='POST'&&Object\.keys\(body\)\.some\(k=>k!==\'limit\'&&k!==\'cursor\'\)/)
assert.match(service,/parseSummaryCursor\(body\.cursor\)/)
assert.match(service,/summaryPageSize=20/)
console.log('service-project-summary-contract: PASS')
