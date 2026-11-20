// Legacy Education Compass wx storage is retired. The following in-memory
// fixture namespace is for Node test execution only; it is never a production
// customer/family/student/order database. Canonical PostgreSQL is authoritative.
const { SCHEMA_VERSION, tables } = require('../models/schema')
const STORAGE_KEY = 'PHOENIX_EDUCATION_SYNTHETIC_TEST_ONLY_V1'

function assertFixtureOnly() {
  if (typeof process === 'undefined' || !process.versions || !process.versions.node ||
      process.env.NODE_ENV === 'production') {
    throw new Error('CANONICAL_EDUCATION_PROVIDER_REQUIRED: local business storage retired')
  }
}
function emptyDatabase() {
  const database = { schemaVersion: SCHEMA_VERSION }
  Object.keys(tables).forEach(table => { database[table] = [] })
  return database
}
function migrate(stored) {
  if (!stored || typeof stored !== 'object') return emptyDatabase()
  const database = { ...emptyDatabase(), ...stored, schemaVersion: SCHEMA_VERSION }
  Object.keys(tables).forEach(table => {
    if (!Array.isArray(database[table])) database[table] = []
  })
  return database
}
function load() {
  assertFixtureOnly()
  return migrate(wx.getStorageSync(STORAGE_KEY))
}
function save(database) {
  assertFixtureOnly()
  wx.setStorageSync(STORAGE_KEY, database)
  return database
}
function reset() { return save(emptyDatabase()) }
module.exports = { STORAGE_KEY, emptyDatabase, migrate, load, save, reset }
