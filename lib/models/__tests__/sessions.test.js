const config = require('../../../config')
const actualDateNow = Date.now
const actualDate = new Date()
const fs = require('fs')
const DB_FILE_PATH = require('path').resolve(__dirname, '..', '..', '..', 'Databases', 'test_sessions.nosql')

const Sessions = require('../sessions')
const Admins = Sessions.Admins

describe('Sessions model', () => {
  beforeAll(() => {
    try {
      fs.unlinkSync(DB_FILE_PATH)
    } catch (_) {}
  })

  beforeEach(() => {
    Date.now = jest.fn(() => actualDate.getTime())
    Admins._reset()
  })

  afterEach(() => {
    Date.now = actualDateNow
  })

  it('creates the nosql file', done => {
    const builder = Sessions.insert({ some: 'thing' })
    builder.callback((err, count) => {
      expect(err).toBeFalsy()
      expect(count).toBe(1)
      expect(fs.existsSync(DB_FILE_PATH)).toBe(true)
      done()
    })
  })

  describe('Admins', () => {
    it('adds an admin session', () => {
      expect(Admins.add()).toBe(0)
      Admins.remove(0)
      expect(Admins.adminExpire).toEqual([])
      expect(Admins.adminTokens).toEqual([])
    })

    it('handles removing non-existing sessions', () => {
      try {
        expect(Admins.remove(3232)).toBeUndefined()
      } catch (err) {
        expect(err).toBeUndefined()
      }
    })

    test('purge removes expired admin tokens', () => {
      // expires in 15 minutes
      // .add() 1
      Date.now.mockImplementationOnce(() => actualDate.getTime() - config.Sessions.SessionTime * 60000 - 1)
      // .add() 2
      Date.now.mockImplementationOnce(() => actualDate.getTime())
      // .add() 3
      Date.now.mockImplementationOnce(() => actualDate.getTime() - config.Sessions.SessionTime * 60000 - 2)
      Admins.add()
      expect(Admins.adminExpire.length).toBe(1)
      expect(Admins.adminTokens.length).toBe(1)
      Admins.add()
      Admins.add()
      expect(Admins.adminExpire.length).toBe(3)
      expect(Admins.adminTokens.length).toBe(3)
      const firstToken = Admins.adminTokens[1]
      Admins.purge()
      expect(Admins.adminExpire.length).toBe(1)
      expect(Admins.adminTokens.length).toBe(1)
      expect(Admins.adminTokens[0]).toBe(firstToken)
    })
  })

  describe('cleanup', () => {
    it('resolves 0 when nothing removed', () => {
      jest.spyOn(Admins, 'purge')
      return Sessions.cleanup().then(count => {
        expect(count).toBe(0)
        expect(Admins.purge).toHaveBeenCalledTimes(1)
      })
    })
  })
})
