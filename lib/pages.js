const path = require('path')
const fs = require('fs')
const util = require('utils')
const config = require('../config')
const cache = require('./cache')

const pagesRoot = path.resolve(__dirname, '..', 'cachedHTML')
var pages

function SyncFiles () {
  return cache.SyncCache().then(() => {
    pages = cache.getCachedFiles() // TODO: find more memory efficient way
    Object.keys(pages).forEach(function (val, i) {
      pages[val].content = pages[val].content
        .replace('{CAPTCHA}', util.GetCaptchaHTML())
        .replace('{FQDN}', config.FQDN || 'localhost') // if no FQDN default to
    })
  }).catch(() => {
    util.log("Couldn't update files in cache!", 1)
  })
}

function init () {
  fs.watch('./cachedHTML', SyncFiles)

  cache.AddFileToCache('Login', path.join(pagesRoot, 'Login.html')).then(() => {
    cache.AddFileToCache('Dashboard', path.join(pagesRoot, 'Dashboard.html')).then(() => {
      cache.AddFileToCache('AdminDash', path.join(pagesRoot, 'AdminDash.html'))
        .then(SyncFiles)// Important for fast boot
        .catch(err => {
          util.log('Couldn\'t Cache page /Dashboard: ' + String(err), 2)
        })
    }).catch(err => {
      util.log('Couldn\'t Cache page /Login: ' + String(err), 2)
    })
  }).catch(err => {
    util.log('Couldn\'t Cache page /Login: ' + String(err), 2)
  })
}

module.exports = {
  init,
  SyncFiles,
  getPages: function () {
    return pages
  }
}
