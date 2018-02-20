// Move this to a separate file, otherwise you can end up with circular dependencies

module.exports = function log (rawMSG, code) {
  // move date into function, otherwise it's not the current time
  const d = new Date()
  const timeStamp = '[' + d.getHours() + ':' + d.getMinutes() + '] '
  const msg = timeStamp + String(rawMSG)
  switch (String(code).toLowerCase()) {
    default:
    case '0':
      console.log('  | ' + msg)
      break
    case '1':
    case 'error':
    case 'e':
      console.log('E | ' + msg)
      break
    case '2':
    case 'update':
    case 'u':
      console.log('U | ' + msg)
      break
    case '3':
    case 'debug':
    case 'd':
      console.log('D | ' + msg)
      break
  }
}
