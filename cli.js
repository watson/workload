#!/usr/bin/env node
'use strict'

var path = require('path')
var http = require('http')
var argv = require('minimist')(process.argv.slice(2))
var csv = require('csv-line')
var Workload = require('./')
var pkg = require('./package')

var FILTERS = {
  WD: Workload.stdFilters.workdays,
  WH: Workload.stdFilters.workingHours,
  EX: Workload.stdFilters.expand
}

if (argv.h || argv.help) help()
else if (argv.v || argv.version) version()
else if (argv.f || argv.file || argv._.length) run()
else invalid()

function run () {
  var file = argv.f || argv.file
  var opts
  if (file) {
    file = path.resolve(file)
    console.log(file)
    opts = require(file)
  } else {
    opts = {}
    if (argv.max) opts.max = argv.max
    if (argv.filter) {
      if (!Array.isArray(argv.filter)) argv.filter = [argv.filter]
      opts.filters = argv.filter.map(function (name) {
        return FILTERS[name]
      })
    }
    if (argv.H) opts.headers = parseHeaders(argv.H)
    if (argv.H) opts.headers = parseHeaders(argv.H)

    opts.requests = argv._.map(function (line) {
      var parts = csv.decode(line)
      var req = {}
      if (Number.isFinite(parts[0])) req.weight = parts.shift()
      if (http.METHODS.indexOf(parts[0]) !== -1) req.method = parts.shift()
      req.url = parts.shift()
      if (parts.length) req.body = parts[0]
      return req
    })
  }

  var workload = new Workload(opts)

  if (!argv.silent) {
    workload.on('visit', function (visit) {
      var method = visit.request.method || 'GET'
      var url = visit.request.url
      var code = visit.response.statusCode
      console.log('%d %s %s %s', code, http.STATUS_CODES[code], method, url)
    })
  }
}

function parseHeaders (lines) {
  var headers = {}
  lines.forEach(function (line) {
    var split = line.indexOf(':')
    headers[line.slice(0, split)] = line.slice(split + 1).trim()
  })
  return headers
}

function invalid () {
  console.log('ERROR: Invalid arguments!')
  console.log()
  help()
  process.exit(1)
}

function help () {
  console.log(`Usage:
  ${pkg.name} [options] requests...

Options:

  -h, --help       Show this help
  -v, --version    Show the version
  -f, --file PATH  Load config from JSON file
  --silent         Don't output anything
  --max NUM        The maximum number of requests per minute (default: 12)
  --filter NAME    Use named standard filter (see Filters section below)
  -H LINE          Add default HTTP header (can be used multiple times)

Filter names:

  WD   Workdays - This filter lowers the chances of a request being made during
       weekends
  WH   Working Hours - This filter lowers the chances of a request being made
       during weekends and at night
  EX   Expand - This filter expands braces in URL's and picks a random matching
       URL

Each request is a comma separated list of values follwoing this pattern:

  [WEIGHT,][METHOD,]URL[,BODY]

  WEIGHT  The numeric weight of the request (default: 1)
  METHOD  HTTP method (default: GET)
  URL     Full URL to request (required)
  BODY    The HTTP body

Examples:

  ${pkg.name} http://example.com http://example.com/foo
    Make two GET requests with equal weight

  ${pkg.name} 1,http://example.com 2,http://example.com/foo
    Make two GET requests with a double chance of the latter being made

  ${pkg.name} --max=60 http://example.com POST,http://example.com,"Hello World"
    Make a maximum of one request per second and make either a GET
    request or a POST request with the body "Hello World"

  ${pkg.name} -H "Accept: text/plain" http://example.com
    Set a custom Accept header
`)
}

function version () {
  console.log(pkg.version)
}
