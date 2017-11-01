'use strict'

var assert = require('assert')
var http = require('http')
var test = require('tape')
var pkg = require('./package')
var Workload = require('./')

var workload

test('Workload.stdFilters.expand', function (t) {
  var req
  for (var n = 0; n < 10000; n++) {
    req = {url: 'http://example.com/foo/{1..9}'}
    Workload.stdFilters.expand(req, function () {
      var url = req.url
      var base = url.slice(0, url.lastIndexOf('/'))
      var num = url.slice(url.lastIndexOf('/') + 1)
      assert.equal(base, 'http://example.com/foo')
      assert(!Number.isNaN(Number(num)), 'is not NaN')
      assert(/^\d$/.test(num), num + ' is in expected range')
    })
  }
  t.end()
})

test('modifying filter', function (t) {
  var server = http.createServer(function (req, res) {
    res.end()
    workload.stop()
    server.close()
    t.equal(req.url, '/foo')
    t.end()
  })

  server.listen(function () {
    var port = server.address().port
    var opts = {
      max: 5 * 60,
      filter: function filter (req, cb) {
        req.url += '/foo'
        cb()
      },
      requests: [{url: 'http://localhost:' + port}]
    }
    workload = new Workload(opts)
  })
})

test('replacing filter', function (t) {
  var server = http.createServer(function (req, res) {
    res.end()
    workload.stop()
    server.close()
    t.equal(req.url, '/bar')
    t.end()
  })

  server.listen(function () {
    var port = server.address().port
    var opts = {
      max: 5 * 60,
      filter: function filter (req, next) {
        next({url: req.url + '/bar'})
      },
      requests: [{url: 'http://localhost:' + port}]
    }
    workload = new Workload(opts)
  })
})

test('filters arary', function (t) {
  t.plan(3)

  var n = 0

  var server = http.createServer(function (req, res) {
    res.end()
    workload.stop()
    server.close()
    t.equal(req.url, '/filters')
  })

  server.listen(function () {
    var port = server.address().port
    var opts = {
      max: 5 * 60,
      filters: [f1, f2],
      requests: [{url: 'http://localhost:' + port + '/filters'}]
    }
    workload = new Workload(opts)
  })

  function f1 (req, cb) {
    t.equal(n++, 0)
    cb()
  }

  function f2 (req, cb) {
    t.equal(n++, 1)
    process.nextTick(cb)
  }
})

test('error event', function (t) {
  var server = http.createServer(function (req, res) {
    req.socket.destroy()
  })

  server.listen(function () {
    var port = server.address().port
    var opts = {
      max: 5 * 60,
      requests: [{url: 'http://localhost:' + port}]
    }
    workload = new Workload(opts)
    workload.on('error', function (err) {
      workload.stop()
      server.close()
      t.ok(err.message, 'socket hang up')
      t.end()
    })
  })
})

test('visit event', function (t) {
  var server = http.createServer(function (req, res) {
    res.end('Hello World')
  })

  server.listen(function () {
    var port = server.address().port
    var opts = {
      max: 5 * 60,
      requests: [{url: 'http://localhost:' + port}]
    }
    workload = new Workload(opts)
    workload.on('visit', function (visit) {
      workload.stop()
      server.close()
      t.deepEqual(visit.request, {headers: {'user-agent': 'workload/' + pkg.version}, url: 'http://localhost:' + port})
      t.ok(visit.response instanceof http.IncomingMessage)
      t.equal(visit.response.statusCode, 200)
      t.equal(visit.body, 'Hello World')
      t.end()
    })
  })
})

test('custom headers', function (t) {
  t.plan(3)

  var server = http.createServer(function (req, res) {
    t.equal(req.headers.custom1, 'foo')
    t.equal(req.headers.custom2, 'bar')
    t.equal(req.headers.custom3, 'baz')
    res.end()
    workload.stop()
    server.close()
  })

  server.listen(function () {
    var port = server.address().port
    var opts = {
      max: 5 * 60,
      headers: {custom1: 'foo'},
      requests: [{url: 'http://localhost:' + port, headers: {custom2: 'bar'}}],
      filter: function (req, next) {
        req.headers.custom3 = 'baz'
        next(req)
      }
    }
    workload = new Workload(opts)
  })
})

test('default values', function (t) {
  var deadswitch

  var server = http.createServer(function (req, res) {
    res.end()
    clearTimeout(deadswitch)
    workload.stop()
    server.close()
    t.equal(req.url, '/basic')
    t.end()
  })

  server.listen(function () {
    var port = server.address().port
    var opts = {
      requests: [{url: 'http://localhost:' + port + '/basic'}]
    }
    workload = new Workload(opts)
    deadswitch = setTimeout(function () {
      t.fail('no request detected')
    }, 6000)
  })
})

test('weights - 500 requests', function (t) {
  var total = 0
  var max = 500
  var visits = []

  var server = http.createServer(function (req, res) {
    total++
    var g = parseInt(req.url[1], 10)
    if (!visits[g]) visits[g] = 1
    else visits[g]++
    res.end()

    if (total === max) {
      t.equal(visits.length, 4)
      visits.forEach(function (n, i) {
        t.ok((visits[i - 1] || 0) < n)
      })
      workload.stop()
      server.close()
      t.end()
    }
  })

  server.listen(function () {
    var port = server.address().port
    var url = 'http://localhost:' + port + '/'
    var opts = {
      max: 100 * 60,
      requests: [
        {url: url + 0},
        {weight: 2, url: url + 1},
        {weight: 4, url: url + 2},
        {weight: 8, url: url + 3}
      ]
    }
    workload = new Workload(opts)
  })
})

test('custom agent', function (t) {
  t.plan(1)

  var server = http.createServer(function (req, res) {
    t.equal(req.headers['user-agent'], 'custom agent')
    res.end()
    workload.stop()
    server.close()
  })

  server.listen(function () {
    var port = server.address().port
    var opts = {
      max: 5 * 60,
      headers: {'user-agent': 'custom agent'},
      requests: [{url: 'http://localhost:' + port}],
      filter: function (req, next) {
        if (req.headers === undefined) {
          req.headers = {}
        }
        req.headers['user-agent'] = 'custom agent'
        next(req)
      }
    }
    workload = new Workload(opts)
  })
})
