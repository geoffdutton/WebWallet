// cache the client here so we can use it in multiple spots
const xsh = require('node-xsh')

const shield = xsh({
  host: '127.0.0.1',
  port: '20103',
  https: false
})

module.exports = shield
