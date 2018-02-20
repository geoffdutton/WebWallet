const log = require('../log')

var originalConsoleLog = console.log

describe('log()', () => {
  beforeEach(() => {
    console.log = jest.fn()
  })

  afterEach(() => {
    console.log = originalConsoleLog
  })

  it('logs code 0', () => {
    var d = new Date()
    log('something', 0)
    expect(console.log).toHaveBeenLastCalledWith(`  | [${d.getHours()}:${d.getMinutes()}] something`)
  })

  it('logs code error', () => {
    var d = new Date()
    log('something', 'error')
    expect(console.log).toHaveBeenLastCalledWith(`E | [${d.getHours()}:${d.getMinutes()}] something`)
  })

  it('logs code u', () => {
    var d = new Date()
    log('something', 'u')
    expect(console.log).toHaveBeenLastCalledWith(`U | [${d.getHours()}:${d.getMinutes()}] something`)
  })

  it('logs code 3', () => {
    var d = new Date()
    log('something', '3')
    expect(console.log).toHaveBeenLastCalledWith(`D | [${d.getHours()}:${d.getMinutes()}] something`)
  })
})
