/**
 * Phoenix Academic Studio A2 — candidate-only protected PostgreSQL pool lease.
 *
 * One authenticated API request must occupy one exclusive leased client.
 * Never expose the raw pg.Pool or issue protected SQL using pool.query().
 * The guard erases persisted backend-bound Canonical context BEFORE each loan
 * and AFTER normal completion. An error discards the physical connection.
 *
 * This module is NOT installed into any production service by this candidate.
 * Real BFF integration and trusted environment configuration remain gated.
 */
async function scrub(client) {
  // The prior borrower may have left an active or aborted transaction.
  // Clearing a context inside an aborted transaction would fail.
  await client.query('ROLLBACK')
  // The login must have only the app role, never migration/owner privileges.
  await client.query('SET ROLE phoenix_canonical_app')
  await client.query('SELECT auth.clear_context()')
  const result = await client.query(
    'SELECT auth.current_principal_id() AS principal, auth.current_channel() AS channel'
  )
  if (result.rowCount !== 1 || result.rows[0].principal !== null || result.rows[0].channel !== null) {
    throw new Error('A2_CONTEXT_POOL_SCRUB_FAILED')
  }
}

/**
 * Run an entire protected request under an exclusively leased pg Client.
 * The callback may issue and redeem one-use context tickets as needed, but it
 * MUST NOT return a client, leave async work unawaited, or leak it to another
 * request. The wrapped Pool itself must remain private to this adapter.
 *
 * An error (including an aborted transaction, timeout or scrub failure)
 * destroys the backend rather than returning a potentially privileged
 * session to the pool. A new backend cannot inherit its backend_start-bound
 * authorization row even if stale rows await GC.
 *
 * @template T
 * @param {{connect:()=>Promise<{query:Function,release:Function}>}} pool
 * @param {(client:any)=>Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withCanonicalAcademyContext(pool, callback) {
  if (!pool || typeof pool.connect !== 'function' || typeof callback !== 'function') {
    throw new TypeError('A2_CONTEXT_POOL_INPUT_INVALID')
  }
  const client = await pool.connect()
  let cleanExit = false
  try {
    await scrub(client)
    const result = await callback(client)
    await scrub(client)
    cleanExit = true
    return result
  } finally {
    if (!cleanExit) {
      // Best effort, no mistaken permission to reuse even if this fails.
      try { await scrub(client) } catch { /* destroy below */ }
    }
    client.release(!cleanExit)
  }
}
