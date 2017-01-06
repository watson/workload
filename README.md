# workload

Sends HTTP requests to a server to mimic a natual load.

The requests are randomized using weights, so certain requests appear
more often than others.

It's also possible to mimic regular working hours so that the average
number of requests are lower at night and in the weekends.

This module is not intended to benchmark an HTTP server. If that's your
use-case I suggest you take a look at
[autocannon](https://github.com/mcollina/autocannon) instead. This
module is meant to help you simulate a real-world workload over a longer
period of time.

[![Build status](https://travis-ci.org/watson/workload.svg?branch=master)](https://travis-ci.org/watson/workload)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)
[![sponsor](https://img.shields.io/badge/sponsored%20by-Opbeat-3360A3.svg)](https://opbeat.com)

## Installation

For use from the command line, install globally:

```
npm install workload --global
```

For use programmatically:

```
npm install workload --save
```

## CLI Usage

Example making max 60 requests per minute to 5 different URL's with
different weights:

```
workload --max 60 \
  POST,http://example.com/signup,"Hello World" \
  10,http://example.com/ \
  2,http://example.com/foo \
  4,http://example.com/bar \
  8,http://example.com/baz
```

Run `workload --help` for all options.

## Programmatic Usage

```js
var Workload = require('workload')

var workload = new Workload({
  max: 30, // make a request once every 2 seconds maximum
  filter: Workload.stdFilters.workingHours,
  requests: [
    {weight: 1, url: 'http://example.com/signup', method: 'POST', body: '...'},
    {weight: 10, url: 'http://example.com/'},
    {weight: 2, url: 'http://example.com/foo'},
    {weight: 4, url: 'http://example.com/bar'},
    {weight: 8, url: 'http://example.com/baz'}
  ]
})

// stop after 1 minute
setTimeout(function () {
  workload.stop()
}, 60000)
```

## API

### `var workload = new Workload(options)`

Create a new workloader. The `workload` object is an EventEmitter.

The constructor takes the following options:

- `requests` - An array of `request` objects (see below)
- `max` - The maximum number of requests to make per minute (defaults to
  `12`)
- `headers` - An object containing the default HTTP headers to use for
  each request
- `filter` - An optional filter function - see [Filters](#filters) for
  details
- `filters` - An optional array of filter functions which will be called
  sequentially - see [Filters](#filters) for details

Each `request` object can contain the following properties:

- `url` - The URL to request
- `method` - The HTTP method to use (defaults to `GET`)
- `weight` - The chance that this request will be performed compared to
  the other requests (defaults to `1`)
- `headers` - A object containing HTTP headers to use for the request
  (overrules `options.headers`)
- `body` - Entity body for `PATCH`, `POST` and `PUT` requests. Must be a
  `Buffer`, `String` or `ReadStream`. If `json` is true, then body must
  be a JSON-serializable object.
- `json` - Sets body to JSON representation of value and adds
  `Content-type: application/json` header. Additionally, parses the
  response body as JSON.
- For additional options, [see the options accepted by the request
  module](https://github.com/request/request#requestoptions-callback).

### Event: `error`

Emitted if an error occurs during one of the requests.

### Event: `visit`

Emitted every time a request have been successfully performed. An object
with the following properties is emitted:

- `request` - The request options used when making the request
- `response` - The response object (an `http.IncomingMessage` instance)
- `body` - The body of the response

### `workload.stop()`

Stop making requests.

### `Workload.stdFilters.workdays`

This filter lowers the chances of a request being made during weekends.

### `Workload.stdFilters.workingHours`

This filter lowers the chances of a request being made during weekends
and at night.

### `Workload.stdFilters.expand`

This filter expands braces in URL's and picks a random matching URL.

For instance, given a request with a URL of
`http://example.com/foo/{1..10}` this filter will replace the `{1..10}`
part of the URL with a random number between 1 and 10. So the actual
requested URL might be `/foo/4`.

## Filters

A filter is a function that will either lower the chance of a request
being made or modify the request in some way.

The function is called every time a request is ready to be made. It's
passed the request object and a callback. Whether or not it calls the
callback determins if the request is performed or not.

It's also possible to modify the request inside a filter function by
manipulating the request object and passing it as an argument to the
callback.

Example filter function that only makes requests between 6am and 7am:

```js
function (request, next) {
  var hour = (new Date()).getHours()
  if (hour === 6) next()
}
```

Example filter function that modifies the request URL:

```js
function (request, next) {
  request.url += '/' + Math.random()
  next(request)
}
```

## Acknowledgements

This project was kindly sponsored by [Opbeat](https://opbeat.com).

## License

MIT
