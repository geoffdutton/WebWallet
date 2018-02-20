const url = require('url')
const http = require('http')
const https = require('https')
const pages = require('./lib/staticPages')
const util = require('./lib/utils')
const config = require('./config')
const fs = require('fs')

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

  const sessionsDB = require('./lib/models/sessions')
  const admins = require('./lib/models/admins')

  function ClearOldSessions () {
    for (var i = 0; i === admins.adminTokens.length; i++) {
      if (Number(admins.adminExpire[i]) < Date.now()) {
        delete admins.adminExpire[i]
        delete admins.adminTokens[i]
        util.log('Removed an adminToken', 2)
      }
    }

    sessionsDB.remove().make(function (builder) {
      builder.where('expiretime', '<', Date.now())
      builder.callback(function (err, count) {
        if (err) {
          util.log("Can't remove sessions: " + String(err), 1)
        }
        if (count !== 0) {
          util.log('Removed sessions: ' + String(count), 2)
        }
      })
    })
  }

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
      https.createServer(SSLoptions(), TESTsubDomainSeperator).listen(config.Sockets.SSLPort)
      // @TODO This would be better handled at the web server level, or at least Cloudflare
      http.createServer((request, response) => { // Redirect http requests
        response.writeHead(301, { Location: 'https://' + config.FQDN + String(url.parse(request.url).pathname) })
        response.end()
      }).listen(config.Sockets.HTTPredirectPort)
      util.log('Web server running at => https://127.0.0.1:443/', 2)
      util.log('Redirect server running at => http://127.0.0.1:80/', 2)
    } else {
      http.createServer(TESTsubDomainSeperator).listen(config.Sockets.TestingPort)
      // util.log('Replica web server running at => http://127.0.0.1:' + String(config.Sockets.HTTPredirectPort) + '/', 2)
      util.log('Test web server running at => http://127.0.0.1:' + String(config.Sockets.TestingPort) + '/', 2)
    }
  })

  setInterval(ClearOldSessions, 30000) // 30s update rate
}

function TESTsubDomainSeperator (request, response) {
  var uri = url.parse(request.url).pathname
  switch (uri.split('/')[1]) { // localhost vs 127.0.0.1 >.<
    case 'api': // Using localhost you get api
      require('./lib/apiServer')(request, response)
      break
    default: // Using full IP you get site
      require('./lib/mainServer')(request, response)
      break
  }
}

// if this file is being called directly
if (require.main === module) {
  // start the server
  main()
}
