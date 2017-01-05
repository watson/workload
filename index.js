'use strict'

var util = require('util')
var EventEmitter = require('events').EventEmitter
var xtend = require('xtend')
var request = require('request')
var weighted = require('weighted')
var maybe = require('mostly-working-hours')
var pkg = require('./package')

var USER_AGENT = pkg.name + '/' + pkg.version

module.exports = Workload

function Workload (opts) {
  if (!(this instanceof Workload)) return new Workload(opts)

  EventEmitter.call(this)

  var self = this
  var max = opts.max || 1 / 5 // default to max one request every 5 seconds
  var filter = opts.filter || function (_, cb) { cb() }
  this._defaultHeaders = opts.headers

  var weights = opts.requests.map(function (req) {
    return req.weight || 1
  })

  this._timer = setInterval(function () {
    var req = xtend({}, weighted.select(opts.requests, weights))
    filter(req, function (modified) {
      self._visit(modified || req)
    })
  }, Math.round(1000 / max))
}

util.inherits(Workload, EventEmitter)

Workload.stdFilters = {
  workingHours: function (_, cb) {
    maybe(cb)
  }
}

Workload.prototype.stop = function stop () {
  clearInterval(this._timer)
}

Workload.prototype._visit = function _visit (req) {
  var self = this

  req = xtend(req, {headers: this._defaultHeaders}, {headers: {'user-agent': USER_AGENT}})

  request(req, function (err, res, body) {
    if (err) return self.emit('error', err)
    self.emit('visit', {
      request: req,
      response: res,
      body: body
    })
  })
}
