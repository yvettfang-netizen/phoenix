'use strict'
const assert = require('node:assert/strict')
const { createBackend } = require('../backend/server')
assert.throws(() => createBackend({ host: '127.0.0.1', port: 0 }), /CANONICAL_POSTGRES_PROVIDER_REQUIRED/)
assert.throws(() => createBackend({ host: '0.0.0.0', port: 0 }), /CANONICAL_GATEWAY_LOOPBACK_ONLY/)
console.log('✓ Family OS cannot open SQLite or mint demo principals; trusted Canonical provider is mandatory')
