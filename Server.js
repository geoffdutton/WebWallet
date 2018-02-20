const url = require('url')
const fs = require('fs')
const http = require('http')
const https = require('https')
const config = require('./config')
const pages = require('./lib/staticPages')
const util = require('./lib/utils')
const Sessions = require('./lib/models/sessions')
const Brutes = require('./lib/models/brutes')

function main () {
  const shield = require('./lib/shieldClient')
  shield.auth(config.XSH.rpcuser, config.XSH.rpcpassword)
  if (config.XSH.encrypted) {
    shield.exec('walletpassphrase', config.XSH.walletpassphrase, 10000000, function (err, data) {
      if (err) console.log(err)
      console.log(data)
    })
  }

  util.unit_test(this)
  // xsh.auth('test', 'muffin')

  // Should this be .init().then(() => do the rest)
  // If the pages fail to cache, is it still helpful to start the server?
  pages.init()

  function SSLoptions () {
    return {
      key: fs.readFileSync(config.SSL.key),
      cert: fs.readFileSync(config.SSL.cert),
      ca: fs.readFileSync(config.SSL.ca)
    }
  }

  util.fileExists(config.SSL.key, sslkey => {
    if (sslkey && !config.Testing) {
      https.createServer(SSLoptions(), ServerCallback).listen(config.Sockets.SSLPort)
      // @TODO This would be better handled at the web server level, or at least Cloudflare
      http.createServer((request, response) => { // Redirect http requests
        response.writeHead(301, { Location: 'https://' + config.FQDN + String(url.parse(request.url).pathname) })
        response.end()
      }).listen(config.Sockets.HTTPredirectPort)
      util.log('Web server running at => https://127.0.0.1:443/', 2)
      util.log('Redirect server running at => http://127.0.0.1:80/', 2)
    } else {
      http.createServer(ServerCallback).listen(config.Sockets.TestingPort)
      // util.log('Replica web server running at => http://127.0.0.1:' + String(config.Sockets.HTTPredirectPort) + '/', 2)
      util.log('Test web server running at => http://127.0.0.1:' + String(config.Sockets.TestingPort) + '/', 2)
    }
  })

  Brutes.startTicking()
  setInterval(() => Sessions.cleanup(), 30000) // 30s update rate
}

function ServerCallback (request, response) {
  const uri = url.parse(request.url).pathname
  switch (uri.split('/')[1]) { // localhost vs 127.0.0.1 >.<
    case 'api': // Using localhost you get api
      require('./lib/apiServer')(request, response)
      break
    default: // Using full IP you get site
      require('./lib/mainServer')(request, response)
      break
  }
}

module.exports = main
// if this file is being called directly
if (require.main === module) {
  // start the server
  main()
}
