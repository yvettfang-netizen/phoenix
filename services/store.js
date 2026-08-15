const { SCHEMA_VERSION, tables } = require('../models/schema')

const STORAGE_KEY = 'PFS_DB_V01'

function emptyDatabase() {
  const database = { schemaVersion: SCHEMA_VERSION }
  Object.keys(tables).forEach((table) => { database[table] = [] })
  return database
}

function load() {
  const stored = wx.getStorageSync(STORAGE_KEY)
  if (!stored || stored.schemaVersion !== SCHEMA_VERSION) return emptyDatabase()
  const database = { ...emptyDatabase(), ...stored }
  Object.keys(tables).forEach((table) => {
    if (!Array.isArray(database[table])) database[table] = []
  })
  return database
}

function save(database) {
  wx.setStorageSync(STORAGE_KEY, database)
  return database
}

function reset() {
  return save(emptyDatabase())
}

module.exports = { STORAGE_KEY, emptyDatabase, load, save, reset }
