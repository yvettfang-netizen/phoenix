// The legacy Education worker used a separate PostgreSQL schema. It has been
// retired under the Founder Canonical-only decision. No independent tables or
// implicit fallback may be created by this process.
process.stderr.write('AGENT_WORKER_CANONICAL_PROVIDER_REQUIRED: legacy Education PostgresStore was removed\n')
process.exitCode = 1
