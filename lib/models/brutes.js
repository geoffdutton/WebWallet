// var brutesDB = nosql.load('./Databases/brutes.nosql') // TODO: change the ddos counter to db
// move this to models and eventually use a nosql db
const brutes = {
  counter: 0,
  ip: {},
  ban: {},
  ban_length: 0,
  interval: 0,
  maximum: 1e3,
  minutes: 5
}

function checkIP (ip) { // True: disallow, false: allow
  if (brutes.ban_length > 0 && brutes.ban[brutes.req.ip]) {
    return true
  }
  const count = (brutes.ip[ip] || 0) + 1
  brutes.ip[ip] = count
  if (count === 1) {
    brutes.counter++
  }
  if (count < brutes.maximum) {
    return false
  }
  brutes.ban[ip] = brutes.minutes + 1
  brutes.ban_length++
  return true
}

let checkTimeoutId
function startCheck () {
  checkTimeoutId = setInterval(function () {
    brutes.interval++
    let keys
    let length
    let count
    if (brutes.ban_length > 0 && brutes.interval % 60 === 0) {
      keys = Object.keys(brutes.ban)
      length = keys.length
      count = 0
      for (let i = 0; i < length; i++) {
        const key = keys[i]
        if (brutes.ban[key]-- > 0) continue
        brutes.ban_length--
        delete brutes.ban[key]
      }
      if (brutes.ban_length < 0) brutes.ban_length = 0
    }
    if (brutes.counter <= 0) return
    keys = Object.keys(brutes.ip)
    length = keys.length
    brutes.counter = length
    for (let i = 0; i < length; i++) {
      const key = keys[i]
      count = brutes.ip[key]--
      if (count) {
        brutes.counter--
        delete brutes.ip[key]
      }
    }
    if (brutes.counter < 0) brutes.counter = 0
  }, 1e3)
}

function stopCheck () {
  clearInterval(checkTimeoutId)
}

module.exports = {
  checkIP,
  startCheck,
  stopCheck
}
