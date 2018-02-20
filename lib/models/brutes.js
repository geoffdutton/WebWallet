// var brutesDB = nosql.load('./Databases/brutes.nosql') // TODO: change the ddos counter to db
// move this to models and eventually use a nosql db

class Brutes /* extends Model */ {
  constructor () {
    this.counter = 0
    this.ip = {}
    this.ban = {}
    this.ban_length = 0
    this.interval = 0
    this.maximum = 1000 // or 1e3
    this.minutes = 5

    this._checkTimeoutId = null
    this._tick = this._tick.bind(this)
  }

  /**
   * @TODO Maybe change this to be True = good, False = bad... ?
   * @param ip
   * @returns {boolean} True = DISALLOW, False = ALLOW
   */
  checkIP (ip) {
    if (this.ban_length > 0 && this.ban[ip]) {
      return true
    }
    const count = (this.ip[ip] || 0) + 1
    this.ip[ip] = count
    if (count === 1) {
      this.counter++
    }
    if (count < this.maximum) {
      return false
    }

    // should this add a minute each time? right now it's just setting it to 6
    this.ban[ip] = this.minutes + 1
    this.ban_length++
    return true
  }

  /**
   * A method that will be run by setInterval(..., 1000)
   */
  _tick () {
    this.interval++
    let keys
    let length
    let count

    // this doesn't modify anything until 60th tick (and each after that)
    if (this.ban_length > 0 && this.interval % 60 === 0) {
      keys = Object.keys(this.ban)
      length = keys.length
      count = 0
      for (let i = 0; i < length; i++) {
        const key = keys[i]
        if (this.ban[key]-- > 0) continue
        this.ban_length--
        delete this.ban[key]
      }
      if (this.ban_length < 0) this.ban_length = 0
    }
    if (this.counter <= 0) return
    keys = Object.keys(this.ip)
    length = keys.length
    this.counter = length
    for (let i = 0; i < length; i++) {
      const key = keys[i]
      count = this.ip[key]--
      if (count) {
        this.counter--
        delete this.ip[key]
      }
    }
    if (this.counter < 0) this.counter = 0
  }

  startTicking () {
    this._checkTimeoutId = setInterval(this._tick, 1000) // or 1e3
  }

  stopTicking () {
    clearInterval(this._checkTimeoutId)
    this._checkTimeoutId = null
  }
}

const instance = new Brutes()
module.exports = {
  // bind to instance to guarentee `this` context
  checkIP: instance.checkIP.bind(instance),
  startTicking: instance.startTicking.bind(instance),
  stopTicking: instance.stopTicking.bind(instance),
  // exposed for testing
  Brutes
}
