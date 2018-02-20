const log = require('../log')
const Admins = require('./admins')
const db = require('./load')('sessions')

function cleanup () {
  Admins.purge()

  return new Promise((resolve, reject) => {
    db.remove().make(function (builder) {
      builder.where('expiretime', '<', Date.now())
      builder.callback(function (err, count) {
        if (err) {
          log("Can't remove sessions: " + String(err), 1)
          return reject(err)
        }
        if (count !== 0) {
          log('Removed sessions: ' + String(count), 2)
        }
        resolve(count)
      })
    })
  })
}
db.cleanup = cleanup
db.Admins = Admins
module.exports = db
