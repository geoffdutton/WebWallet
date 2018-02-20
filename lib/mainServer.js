const url = require('url')
const fs = require('fs')
const path = require('path')
const util = require('./utils')
const config = require('../config')
const shield = require('./shieldClient')
const Sessions = require('./models/sessions')
const Admins = Sessions.Admins
const usersDB = require('./models/users')
const brutes = require('./models/brutes')
const StaticPages = require('./staticPages')

// FIXME: overlapping with  `switch (require('path').extname(uri)) {`
const contentTypesByExtension = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf'
}

function getErrorPage (errorcode) {
  // TODO: Cache maybe? Yeah
  switch (errorcode) {
    case 404:
      return fs.readFileSync('../errorcodes/404.html', 'binary')
    default:
      return fs.readFileSync('../errorcodes/' + String(errorcode) + '.html', 'binary')
  }
}

function mainServer (request, response) {
  // Default variable initialization
  var uri = url.parse(request.url).pathname
  var cookies = util.parseCookies(request)

  // @TODO Check for `X-Forwarded-For` header, or if using Cloudflare `CF-Connecting-IP`, for the real IP
  var ipadress = request.connection.remoteAddress ||
    request.socket.remoteAddress ||
    (request.connection.socket ? request.connection.socket.remoteAddress : null)
  var Head = {}
  var ConstructHeader = function (add) {
    var nHead = {}
    Object.assign(nHead, Head, add)
    return nHead
  }

  switch (path.extname(uri)) {
    case '.html':
    case '.png':
    case '.svg':
    case '.css':
    case '.jpg':
    case '.ico':
    case '.get':
    case '.gif':
    case '.txt':
    case '.js':
      DeliverFile()
      break
    default:
      if (uri.split('/')[1].indexOf('.get') !== -1) DeliverFile()
      else {
        util.log('Updated: uri: ' + String(uri), 3)
        util.UpdateSession(Sessions, cookies['session'], {
          'currentUrl': uri
        }).then(head => {
          Head = ConstructHeader(head)
          cookies['session'] = String(head['Set-Cookie']).split('=')[1]
          DeliverFile()
        }).catch(err => {
          util.log('(mainServer.js:73) Cookies > ' + String(err), 1)
          DeliverFile()
        })
      }
      break
  }

  function DeliverPage (page, httpcode) {
    response.writeHead(httpcode, ConstructHeader({
      'Content-Type': 'text/html'
    }))
    response.write(page)
    response.end()
  }

  function DeliverFile () {
    if (brutes.checkIP(ipadress)) return
    if (uri === '/') {
      util.Redirect(response, '/Login', {})
      return
    }

    const pages = StaticPages.getPages()

    if (uri.replace('.html', '').toLowerCase() === '/login') {
      util.getSession(Sessions, cookies['session']).then(resp => {
        if (resp.username !== '') {
          util.log('User has already logged in, session: ' + String(cookies['session']), 1)
          util.Redirect(response, '/Dashboard', {})
        } else {
          if (util.CheckIfIsPostReq(request)) {
            util.ProcessPostReq(request, response, function () {
              if (request.post.type === 'login') { // TODO: if not found (maybe check required parameters beforehand)
                util.log('Login got!', 2)
                util.ValidateCaptcha(request, !(resp.loginFails > 3)).then(() => {
                  util.GetUserVerified(usersDB, request.post.username, request.post.password).then(user => {
                    util.log('Logged in succesfully, response: ' + String(user.username), 2)
                    util.addSessionUsr(Sessions, cookies['session'], request.post.username.toLowerCase()).then(head => {
                      Head = ConstructHeader(head)
                      cookies['session'] = String(head['Set-Cookie']).split('=')[1]
                    }).catch(err => {
                      util.log('Error Applying sessionUsr to cookie: ' + String(err), 1)
                    })
                    util.Redirect(response, '/Dashboard', {})
                  }).catch(err => {
                    util.log('Login failed || ERROR: ' + String(err), 1)
                    util.addLoginFailsSession(Sessions, cookies['session']).then(resp => {
                      util.log('Session: ' + String(cookies['session']) + ' failed the login ' + String(resp) + 'x', 2)
                      if (resp >= 10) {
                        // TODO: Log brutes' ip
                        DeliverPage(util.AddJS(util.AddAntiBruteCaptcha(pages['Login'].content), util.gettoast('Username or Password Incorrect')), 200) // Captcha page if above 10 tries (maybe logged?)
                      } else if (resp > 3) {
                        DeliverPage(util.AddJS(util.AddAntiBruteCaptcha(pages['Login'].content), util.gettoast('Username or Password Incorrect')), 200) // Captcha page if above 3 tries
                      } else {
                        DeliverPage(util.AddJS(pages['Login'].content, util.gettoast('Username or Password Incorrect')), 200) // Normal Login page if under 3 tries
                      }
                    })
                  })
                }).catch(err => {
                  DeliverPage(util.AddJS(util.AddAntiBruteCaptcha(pages['Login'].content), util.gettoast('Error, did your captcha fail?')), 200)
                  util.log('Captcha: ' + String(err), 1)
                })
              } else if (request.post.type === 'privkey') { // PRIVATE KEY CHECKING
                DeliverPage(pages['Login'].content, 200) // TODO: change to real page + session
              } else if (request.post.type === 'signup') {
                util.ValidateCaptcha(request).then(() => {
                  if (request.post.username.length >= 5 && request.post.username.length <= 60 && request.post.password.length >= 8 && request.post.password.length <= 60 && request.password === request.confirmPasswordSignUp) {
                    util.GetUser(usersDB, request.post.username.toLowerCase()).then(() => {
                      DeliverPage(util.AddJS(pages['Login'].content, util.gettoast('That username already exists')), 200)
                    }).catch(() => { // Couldn't find a existing user with that username
                      usersDB.insert({
                        username: request.post.username.toLowerCase(), // TODO: check replacing
                        displayname: request.post.displayname,
                        password: util.HashPass(request.post.password, config.PassReq.SALTA, config.PassReq.SALTB),
                        type: 1
                      }).callback(function (err) {
                        util.log('A user has been created.', 2)
                        if (!err) {
                          shield.exec('getNewAddress', request.post.username.toLowerCase(), function (err, addr) {
                            if (err) {
                              util.log(String(err), 3)
                            }
                            util.addSessionUsr(Sessions, cookies['session'], request.post.username.toLowerCase()).then(head => {
                              Head = ConstructHeader(head)
                              cookies['session'] = String(head['Set-Cookie']).split('=')[1]
                            }).catch(err => {
                              util.log('Inserting usersDB: ' + String(err), 3)
                            })
                            util.Redirect(response, '/Dashboard', {})
                          })
                        }
                      })
                    })
                  } else { // Smartass trying to get past the javascript in the file itself (Lower than 4 char)
                    DeliverPage(util.AddJS(pages['Login'].content, util.gettoast('Invalid Username')), 200)
                    util.log('Invalid signup request: ' + request.post.username + ' | ' + request.post.password, 1)
                  }
                }).catch(err => {
                  DeliverPage(util.AddJS(pages['Login'].content, util.gettoast('Error, did the captcha fail?')), 200)
                  util.log('Captcha: ' + String(err), 1)
                })
              } else {
                // Just '/Login'
                DeliverPage(pages['Login'].content, 200)
              } // If post request but not a certain method ... goto Just '/Login'
            })
          } else {
            // Just '/Login'
            DeliverPage(pages['Login'].content, 200)
          }
        }
      }).catch(err => {
        util.log('Getting cookie /Login: "' + String(err) + '" Creating a new session', 1)
        DeliverPage(util.AddJS(pages['Login'].content, util.gettoast(cookies['session'] === undefined || cookies['session'] === '' ? 'Welcome' : 'Your session has expired, please try again.')), 200)
      })
    } else if (uri.toLowerCase() === '/logout') {
      util.log('Logging out session: ' + String(cookies['session']), 2)
      util.addSessionUsr(Sessions, cookies['session'], '').then(head => {
        Head = ConstructHeader(head)
        cookies['session'] = String(head['Set-Cookie']).split('=')[1]
      }).catch(err => {
        util.log('Logging out: ' + String(err), 1)
      })
      util.Redirect(response, '/Login', {})
    } else if (uri.replace('.html', '').toLowerCase() === '/dashboard') { // Show basic dashboard
      var stringy = ''
      util.getSession(Sessions, cookies['session']).then(resp => {
        if (resp.username === undefined || resp.username === '') {
          util.log('User hasn\'t logged in yet, session: ' + String(cookies['session']), 1)
          util.Redirect(response, '/Login', {})
        } else {
          util.GetUser(usersDB, resp.username).then(resp => {
            stringy = stringy + '\ninfo["userName"] = "' + String(resp.username) + '"'
            stringy = stringy + '\ninfo["displayName"] = "' + String(resp.displayname) + '"'

            if (resp.type >= 9) DeliverPage(util.AddJS(util.replaceAll(pages['Dashboard'].content, '<li><a href="/">Home</a></li>', '<li><a href="/">Home</a></li>\n<li><a href="/AdminDash">AdminDash</a></li>'), stringy), 200)
            else DeliverPage(util.AddJS(pages['Dashboard'].content, stringy), 200)
          }).catch(err => {
            util.log('Getting user: ' + String(err), 1)
          })
        }
      }).catch(err => {
        util.log('Getting cookie: ' + String(err), 1)
        util.Redirect(response, '/Login', {})
      })
    } else if (uri.replace('.html', '').toLowerCase() === '/admindash') { // Show AdminDash.
      util.getSession(Sessions, cookies['session']).then(resp => {
        if (resp.username === undefined || resp.username === '') {
          util.log('User hasn\'t logged in yet, session: ' + String(cookies['session']), 1)
          util.Redirect(response, '/Login', {})
        } else {
          util.GetUser(usersDB, resp.username).then(resp => {
            if (resp.type >= 9) {  // When they have the right privileges deliver the actual site:
              const adminTokenId = Admins.add()
              util.GetUser(usersDB, resp.username).then(resp => {
                DeliverPage(pages['AdminDash'].content.replace('//PrivateToken//', Admins.getToken(adminTokenId)), 200)
              }).catch(err => {
                util.log('Getting user: ' + String(err), 1)
              })
            } else {
              util.log('User doesn\'t have the right privileges, session: ' + String(cookies['session']) + ' Privilege: ' + String(resp.type), 1)
              util.Redirect(response, '/Dashboard', {})
            }
          })
        }
      }).catch(err => {
        util.log('Getting cookie: ' + String(err), 1)
        util.Redirect(response, '/Login', {})
      })
    } else if (uri.toLowerCase().split('/')[1] === 'js') {
      let filename = path.join(__dirname, '/allowedJS', uri.toLowerCase().split('/')[2])
      fs.readFile(filename, 'binary', function (err, file) { // TODO: organize
        if (err) return DeliverPage('Internal Server error 500' + '\n', 500)
        response.writeHead(200, 'application/javascript')
        response.write(file)
        response.end()
      })
    } else if (util.IllegalAddressesCheck(path.join(__dirname, uri))) {
      var filename = path.join(__dirname, uri)
      util.fileExists(filename, function (exists) { // Deliver files like a normal human being
        if (!exists) {
          DeliverPage(getErrorPage(404), 404)
          return
        }

        if (fs.statSync(filename).isDirectory()) filename += '/index.html'

        fs.readFile(filename, 'binary', function (err, file) { // TODO: organize
          if (err) {
            DeliverPage('Internal Server error 500' + '\n', 500)
            return
          }

          const headers = {}
          const contentType = contentTypesByExtension[path.extname(filename)]
          if (contentType) headers['Content-Type'] = contentType
          else { // Filter unsupported file formats
            DeliverPage(getErrorPage(404), 404)
            return
          }

          // Deliver a standard file (with headers if html)
          if (util.endsWith(uri, '/') || util.endsWith(uri, '.html') || contentType === 'text/html') { // If it's a normal page
            response.writeHead(200, ConstructHeader(headers))
          } else {
            response.writeHead(200, headers)
          }
          response.write(file, 'binary')
          response.end()
        })
      })
    }
  }
}

module.exports = mainServer
