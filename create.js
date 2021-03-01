const _ = require('lodash')
const https = require('https')

module.exports = async function create(argv) {
  const { auth, count, hostname, protocol, value, type, platform, walletIds } = argv
  const shards = 4
  const limit = value * shards === parseInt(value * shards) ? value : ((parseInt(value * shards) + 1) / shards)
  const options = {
    hostname,
    protocol,
    path: `/v1/promotions`,
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + auth
    },
    body: {
      type,
      numGrants: type === 'ugp' ? count : walletIds.length,
      value: limit,
      platform,
      active: true,
    }
  }
  if (type === 'ugp') {
    return request(options).then((res) => ([res]))
  } else {
    return Promise.all(Array(count).fill().map(() => {
      return request(options)
    }))
  }
}

async function request (options) {
  return new Promise((resolve, reject) => {
    const {
      headers,
      body: payload
    } = options
    const opts = Object.assign({
      protocol: 'https:',
      method: 'GET',
      headers: Object.assign({
        'Content-Type': 'application/json'
      }, headers)
    }, options)
    const { method } = opts
    const methodIsGet = method.toLowerCase() === 'get'
    const req = https.request(options, (res) => {
      res.setEncoding('utf8')
      const chunks = []
      res.on('data', (chunk) => {
        chunks.push(chunk)
      })
      res.on('end', () => {
        const body = chunks.join('')
        const { statusCode } = res
        try {
          const json = JSON.parse(body)
          if (statusCode < 200 || statusCode >= 400) {
            failure(new Error(`request failed`), statusCode, json, body)
          } else {
            resolve([json])
          }
        } catch (e) {
          failure(e, statusCode, null, body)
        }
      })
    })
    req.on('error', (e) => failure(e))
    if (payload && !methodIsGet) {
      const data = _.isObject(payload) ? JSON.stringify(payload) : payload
      req.write(data)
    }
    req.end()

    function failure (err, statusCode, json, body) {
      reject(Object.assign(err, {
        statusCode,
        opts,
        body,
        payload,
        json
      }))
    }
  })
}
