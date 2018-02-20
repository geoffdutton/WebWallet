const url = require('url')
const util = require('./utils')
const sessionsDB = require('./models/sessions')
const usersDB = require('./models/users')
const admins = require('./models/admins')
const brutes = require('./models/brutes')
const shield = require('./shieldClient')

function apiServer (request, response) {
  var ipadress = request.connection.remoteAddress ||
    request.socket.remoteAddress ||
    (request.connection.socket ? request.connection.socket.remoteAddress : null)

  if (brutes.checkIP(ipadress)) {
    return
  }

  var uri = url.parse(request.url).pathname
  var args = util.GetArgumentsFromURI(uri)
  // console.log(uri.toLowerCase().split('/'), args)
  if (uri.toLowerCase().split('/')[2] === 'send') { // /api/send/<session>/<address>/<amount>
    util.CheckSessionUser(sessionsDB, usersDB, args[0]).then(x => {
      if (util.CheckStrNumber(args[2], 1)) { // TODO: max as real balance
        shield.exec('getbalance', x[0].username, function (err, balance) {
          if (err) {
            util.log(String(err), 3)
            util.APIResponseReturn(response, "Couldn't get addresses", 400)
            return
          }
          if (balance <= Number(args[2]) + 0.05) {
            util.APIResponseReturn(response, 'Not enough balance', 400)
            return
          }
          shield.exec('sendfrom', x[0].username, args[1], Number(args[2]), function (err, txid) {
            if (err) {
              util.log(String(err), 3)
              util.APIResponseReturn(response, "Couldn't broadcast transaction, do you have enough balance?", 400)
              return
            }
            util.APIResponseReturn(response, txid, 200)
          })
        })
      }
    }).catch(e => {
      util.APIResponseReturn(response, e, 400, false)
    })
  } else if (uri.toLowerCase().split('/')[2] === 'gettransactions') { // /api/gettransactions/<session>
    util.CheckSessionUser(sessionsDB, usersDB, args[0]).then(x => {
      shield.exec('listtransactions', x[0].username, function (err, txjson) {
        if (err) {
          util.log(String(err), 3)
          util.APIResponseReturn(response, "Couldn't get transactions", 500)
          return
        }
        util.APIResponseReturn(response, txjson, 200)
      })
    }).catch(e => {
      util.APIResponseReturn(response, e, 400, false)
    })
  } else if (uri.toLowerCase().split('/')[2] === 'getbalance') { // /api/gettransactions/<session>
    util.CheckSessionUser(sessionsDB, usersDB, args[0]).then(x => {
      shield.exec('getbalance', x[0].username, function (err, json) {
        if (err) {
          util.log(String(err), 3)
          util.APIResponseReturn(response, "Couldn't get addresses", 400)
          return
        }
        util.APIResponseReturn(response, json, 200)
      })
    }).catch(e => {
      util.APIResponseReturn(response, e, 400, false)
    })
  } else if (uri.toLowerCase().split('/')[2] === 'getaddresses') { // /api/gettransactions/<session>
    util.CheckSessionUser(sessionsDB, usersDB, args[0]).then(x => {
      shield.exec('getaddressesbyaccount', x[0].username, function (err, json) {
        if (err) {
          util.log(String(err), 3)
          util.APIResponseReturn(response, "Couldn't get addresses", 400)
          return
        }
        // console.log(x[0].username)
        util.APIResponseReturn(response, json, 200)
      })
    }).catch(e => {
      util.APIResponseReturn(response, e, 400, false)
    })
  } else if (uri.toLowerCase().split('/')[2] === 'addaddress') { // /api/gettransactions/<session>
    util.CheckSessionUser(sessionsDB, usersDB, args[0]).then(x => { // TODO: add error detection for core
      shield.exec('getaddressesbyaccount', x[0].username, function (err, txjson) {
        if (err) {
          util.log(String(err), 3)
          util.APIResponseReturn(response, "Couldn't get addresses", 400)
          return
        }
        if (txjson.length < 10) {
          shield.exec('getnewaddress', x[0].username, function (err, txjson) {
            if (err) {
              util.log(String(err), 3)
              util.APIResponseReturn(response, "Couldn't get addresses", 400)
              return
            }
            util.APIResponseReturn(response, txjson, 200)
          })
        }
      })
    }).catch(e => {
      util.APIResponseReturn(response, e, 400, false)
    })
    // @TODO Move this to a method in admins.js
  } else if (admins.adminTokens.indexOf(uri.split('/')[2]) !== -1) {
    if (uri.split('/')[3] === 'remove') {
      var adminDeliver = 'AdminToken "' + uri.split('/')[2] + '" removed.'
      response.writeHead(200, 'Content-Type: text/plain')
      response.write(adminDeliver, 'binary')
      response.end()
      util.log('AdminToken "' + uri.split('/')[2] + '" removed.', 2)

      // @TODO Move this to a method in admins.js
      delete admins.adminExpire[admins.adminTokens.indexOf(uri.split('/')[2])]
      delete admins.adminTokens[admins.adminTokens.indexOf(uri.split('/')[2])]
    } else {
      util.getAdminDashInfo(sessionsDB).then(resp => {
        response.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'vary': 'Origin, Accept-Encoding',
          'pragma': 'no-cache'
          // 'access-control-allow-credentials': true
        })
        response.write(resp, 'utf8')
        response.end()
      }).catch(err => {
        util.log('Getting AdminDashInfo: ' + String(err))
        var adminDeliver = 'Fuck'
        response.writeHead(200, 'Content-Type: text/plain')
        response.write(adminDeliver, 'binary')
        response.end()
      })
    }
  } else {
    response.writeHead(404, 'Content-Type: text/plain')
    response.write('API not found', 'binary')
    response.end()
  }
}

module.exports = apiServer
