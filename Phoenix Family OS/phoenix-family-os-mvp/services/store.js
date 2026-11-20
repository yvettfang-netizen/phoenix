// Synthetic, Node-only test fixture. No local WeChat or SQLite business store.
// Phoenix Canonical PostgreSQL is the sole authority for real users/families.
const { SCHEMA_VERSION, tables } = require('../models/schema')
const STORAGE_KEY = 'PHOENIX_SYNTHETIC_TEST_ONLY_V1'

function assertFixtureOnly() {
  if (typeof process === 'undefined' || !process.versions || !process.versions.node ||
      process.env.NODE_ENV === 'production' ||
      (typeof wx !== 'undefined' && typeof wx.getAccountInfoSync === 'function')) {
    throw new Error('CANONICAL_PROVIDER_REQUIRED: local business records are disabled')
  }
}

function emptyDatabase() {
  const data = { schemaVersion: SCHEMA_VERSION }
  for (const table of Object.keys(tables)) data[table] = []
  return data
}
function load() {
  assertFixtureOnly()
  const stored = wx.getStorageSync(STORAGE_KEY)
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return emptyDatabase()
  const snapshot = { ...emptyDatabase(), ...stored, schemaVersion: SCHEMA_VERSION }
  for (const table of Object.keys(tables)) if (!Array.isArray(snapshot[table])) snapshot[table] = []
  return snapshot
}
function save(data) {
  assertFixtureOnly()
  wx.setStorageSync(STORAGE_KEY, data)
  return data
}
function reset() { return save(emptyDatabase()) }
module.exports = { STORAGE_KEY, emptyDatabase, load, save, reset }
