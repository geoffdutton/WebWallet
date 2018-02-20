const fs = require('fs')
const path = require('path')
const util = require('../utils')
const StaticPages = require('../staticPages')
const cache = require('../cache')
jest.mock('../cache')

describe('Static Pages', () => {
  const originalUtilLog = util.log

  beforeEach(() => {
    fs.watch = jest.fn()
    util.log = jest.fn()
  })

  afterEach(() => {
    util.log = originalUtilLog
  })

  it('watches cachedHTML and adds 3 main pages', () => {
    return StaticPages.init().then(() => {
      expect(fs.watch).toHaveBeenCalledWith(StaticPages.CACHED_HTML_PATH, StaticPages.syncFiles)
      const mainPages = ['Login', 'Dashboard', 'AdminDash']
      expect(cache.AddFileToCache).toHaveBeenCalledTimes(mainPages.length)
      mainPages.forEach(p => {
        expect(cache.AddFileToCache).toHaveBeenCalledWith(p, path.join(StaticPages.CACHED_HTML_PATH, `${p}.html`))
      })
    })
  })

  it('logs on any rejection', () => {
    cache.AddFileToCache.mockImplementationOnce(() => Promise.reject(new Error('OH SHIT')))
    return StaticPages.init().then(() => {
      expect(util.log).toHaveBeenCalledWith('Static Pages Cache Error: Error: OH SHIT', 2)
    })
  })

  it('syncs files and updates content', () => {
    const fakeFiles = {
      FileA: {
        content: 'fileA {CAPTCHA} {FQDN}'
      },
      FileB: {
        content: 'fileB'
      }
    }

    cache.getCachedFiles.mockReturnValue(fakeFiles)

    return StaticPages.syncFiles().then(() => {
      expect(fakeFiles.FileA.content).toBe(`fileA ${util.GetCaptchaHTML()} localhost`)
      expect(fakeFiles.FileB.content).toBe('fileB')

      expect(StaticPages.getPages()).toBe(fakeFiles)
    })
  })

  it('logs on rejection', () => {
    cache.SyncCache.mockImplementationOnce(() => Promise.reject(new Error('OH SHIT')))
    return StaticPages.syncFiles().then(() => {
      expect(util.log).toHaveBeenCalledWith("Couldn't update files in cache!", 1)
    })
  })
})
