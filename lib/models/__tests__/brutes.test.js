const Brutes = require('../brutes')

describe('Brutes model', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  describe('checkIP', () => {
    it('bans after max', () => {
      expect(Brutes.checkIP(1)).toBe(false)
      let max = 1000 - 1
      while (max--) {
        const result = Brutes.checkIP(1)
        if (max === 1) {
          expect(result).toBe(false)
        }
      }
      expect(Brutes.checkIP(1)).toBe(true)
    })

    it('adds 1 minutes and incr ban_length for each check over maximum', () => {
      const brute = new Brutes.Brutes()
      brute.maximum = 2
      const ip = '123.123.321.321'
      expect(brute.checkIP(ip)).toBe(false)
      expect(brute.ip[ip]).toBe(1)
      expect(brute.ban[ip]).toBeUndefined()
      expect(brute.checkIP(ip)).toBe(true)
      // should this add a minute each time? right now it's just setting it to 6
      expect(brute.ban[ip]).toBe(6)
      expect(brute.checkIP(ip)).toBe(true)
      expect(brute.ban[ip]).toBe(6)
    })
  })

  describe('_tick', () => {
    let tBrute

    beforeEach(() => {
      tBrute = new Brutes.Brutes()
    })

    it('adjusts some stuff and shit', () => {
      // .ban_length === 0
      // .counter <= 0
      const beforeTick = JSON.stringify(tBrute)
      tBrute._tick()
      tBrute._tick()
      tBrute._tick()
      // this is the only thing that should change
      expect(tBrute.interval).toBe(3)
      // set it back so they match
      tBrute.interval = 0
      expect(JSON.stringify(tBrute)).toBe(beforeTick)
    })
  })

  test('start and stop ticking', () => {
    const brute = new Brutes.Brutes()
    brute._tick = jest.fn()
    brute.startTicking()
    expect(brute._tick).not.toHaveBeenCalled()
    jest.runTimersToTime(1000)
    expect(brute._tick).toHaveBeenCalledTimes(1)
    jest.runTimersToTime(1000)
    expect(brute._tick).toHaveBeenCalledTimes(2)
    // ...etc
    brute.stopTicking()
    expect(brute._checkTimeoutId).toBeNull()
    jest.runTimersToTime(1000)
    expect(brute._tick).toHaveBeenCalledTimes(2)
    jest.runTimersToTime(1000)
    expect(brute._tick).toHaveBeenCalledTimes(2)
  })
})
