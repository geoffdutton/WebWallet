const path = require('path')
const fs = require('fs')
const util = require('./utils')
const config = require('../config')
const cache = require('./cache')

const CACHED_HTML_PATH = path.resolve(__dirname, '..', 'cachedHTML')
const MAIN_PAGES = ['Login', 'Dashboard', 'AdminDash']

var pages = {}
function syncFiles () {
  return cache.SyncCache().then(() => {
    pages = cache.getCachedFiles() // TODO: find more memory efficient way
    Object.keys(pages).forEach(val => {
      pages[val].content = pages[val].content
        .replace('{CAPTCHA}', util.GetCaptchaHTML())
        .replace('{FQDN}', config.FQDN || 'localhost') // if no FQDN default to
    })
  }).catch(() => {
    util.log("Couldn't update files in cache!", 1)
  })
}

function init () {
  fs.watch(CACHED_HTML_PATH, syncFiles)

  const addFilePromises = []
  MAIN_PAGES.forEach(page => {
    addFilePromises.push(
      cache.AddFileToCache(page, path.join(CACHED_HTML_PATH, `${page}.html`))
    )
  })

  return Promise.all(addFilePromises)
    .catch(err => {
      // the error will contain the filename
      util.log('Static Pages Cache Error: ' + String(err), 2)
    })
}

module.exports = {
  init,
  syncFiles,
  getPages: function () {
    return pages
  },
  CACHED_HTML_PATH
}
