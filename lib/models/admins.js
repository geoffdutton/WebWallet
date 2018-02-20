// this should probably be moved in with sessions.js
const config = require('../../config')
const log = require('../log')
const util = require('../utils')

module.exports = {
  adminExpire: [], // TODO: change to db
  adminTokens: [],
  _reset () {
    this.adminExpire = []
    this.adminTokens = []
  },

  add () {
    const id = this.adminTokens.length
    this.adminExpire[id] = Date.now() + config.Sessions.SessionTime * 60000
    this.adminTokens[id] = String(util.randtext(16, config.PassReq.Mask).replace('#', '!'))
    log('Added an adminToken ' + this.adminTokens[id], 2)
    return id
  },

  getToken (id) {
    return this.adminTokens[id]
  },

  remove (id) {
    this.adminExpire.splice(id, 1)
    const token = this.adminTokens[id]
    this.adminTokens.splice(id, 1)
    log('Removed an adminToken ' + token, 2)
  },

  purge () {
    for (let i = 0; i < this.adminTokens.length; i++) {
      const dateNow = Date.now()
      if (Number(this.adminExpire[i]) < dateNow) {
        this.remove(i)
      }
    }
  }
}
