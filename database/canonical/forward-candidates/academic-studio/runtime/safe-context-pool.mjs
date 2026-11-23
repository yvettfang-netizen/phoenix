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
async function scrub(client, check) {
  const query = (sql) => {
    check()
    return client.query(sql)
  }
  // The prior borrower may have left an active or aborted transaction.
  // Clearing a context inside an aborted transaction would fail.
  await query('ROLLBACK')
  // The login must have only the app role, never migration/owner privileges.
  await query('SET ROLE phoenix_canonical_app')
  await query('SELECT auth.clear_context()')
  const result = await query(
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
 * @param {{connect:(callback:(error:Error|undefined,client:any)=>void)=>void}} pool Node PostgreSQL pool
 * @param {(client:any)=>Promise<T>} callback
 * @param {{signal?:AbortSignal}} [options]
 * @returns {Promise<T>}
 */
export async function withCanonicalAcademyContext(pool, callback, { signal } = {}) {
  if (!pool || typeof pool.connect !== 'function' || typeof callback !== 'function') {
    throw new TypeError('A2_CONTEXT_POOL_INPUT_INVALID')
  }
  signal?.throwIfAborted()

  let rejectInterruption
  const interruption = new Promise((_, reject) => { rejectInterruption = reject })
  let interruptionReason
  let interrupted = false
  const interrupt = (reason) => {
    if (interrupted) return
    interruptionReason = reason
    interrupted = true
    rejectInterruption(reason)
  }
  const check = () => {
    if (interrupted) throw interruptionReason
  }
  const onAbort = () => interrupt(signal.reason)
  const release = (client, discard) => {
    try {
      client.release(discard)
    } finally {
      client.removeListener('error', interrupt)
    }
  }

  let checkedOut
  let finished = false
  let cleanExit = false
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const checkout = new Promise((resolve, reject) => {
      pool.connect((error, client) => {
        if (error) return reject(error)
        // pg-pool removes its idle error handler just before this callback.
        client.on('error', interrupt)
        // A request may have stopped while pg-pool waited for a connection.
        if (finished) release(client, true)
        else checkedOut = client
        resolve(client)
      })
    })
    const client = await Promise.race([checkout, interruption])
    const work = async () => {
      await scrub(client, check)
      check()
      const result = await callback(client)
      await scrub(client, check)
      return result
    }
    const result = await Promise.race([work(), interruption])
    check()
    cleanExit = true
    return result
  } finally {
    finished = true
    signal?.removeEventListener('abort', onAbort)
    // Close failed leases immediately. Cleanup SQL could wait for broken I/O.
    if (checkedOut) release(checkedOut, !cleanExit)
  }
}
