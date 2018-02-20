const dbFilePrefix = process.env.NODE_ENV === 'test' ? 'test_' : ''
const path = require('path')
const nosql = require('nosql')

module.exports = dbName => nosql.load(
    path.resolve(__dirname, '..', '..', 'Databases', `${dbFilePrefix}${dbName}.nosql`)
  )
