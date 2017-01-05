'use strict'

var assert = require('assert')
var http = require('http')
var Workload = require('./')

var total = 0
var max = 500
var visits = []
var workload

console.log('testing %d requests - please wait...', max)

var server = http.createServer(function (req, res) {
  total++
  var g = parseInt(req.url[1], 10)
  if (!visits[g]) visits[g] = 1
  else visits[g]++
  res.end()

  if (total === max) {
    assert.equal(visits.length, 4)
    visits.forEach(function (n, i) {
      assert((visits[i - 1] || 0) < n)
    })
    workload.stop()
    server.close()
  }
})

server.listen(function () {
  var port = server.address().port
  var url = 'http://localhost:' + port + '/'
  var opts = {
    max: 100,
    requests: [
      {url: url + 0},
      {weight: 2, url: url + 1},
      {weight: 4, url: url + 2},
      {weight: 8, url: url + 3}
    ]
  }
  workload = new Workload(opts)
})
