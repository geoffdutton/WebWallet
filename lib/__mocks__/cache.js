const MockCache = {
  SyncCache: jest.fn(() => Promise.resolve()),
  getCachedFiles: jest.fn(() => MockCache.__cachedFiles),
  AddFileToCache: jest.fn(() => Promise.resolve())
}
MockCache.__cachedFiles = {}

module.exports = MockCache
