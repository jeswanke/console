/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
//import { inspect } from 'util'
import fs from 'fs'

import { RequestOptions, IncomingMessage } from 'http'
import { Http2ServerRequest } from 'http2'
import { parseBody } from '../src/lib/body-parser'

const getSnapshot = (obj: any, filteredKeys?: string[], max?: number) => {
  interface IProto {
    name?: string
    displayName?: string
  }
  obj = obj || {}
  const mx = max || 5
  const getReplacements = () => {
    const seen = new WeakSet()

    return (key: any, value: { continue?: any } | null | undefined) => {
      const type = typeof value
      switch (true) {
        case filteredKeys.indexOf(key) !== -1:
          return
        case key.startsWith('__'):
          return
        case Array.isArray(value):
          {
            if (seen.has(value)) {
              return
            }
            seen.add(value)
            const array = value as Array<any>
            if (array.length > mx) {
              return array.slice(0, mx)
            }
          }
          break
        case type === 'object':
          if (!value) {
            return {}
          }
          if (seen.has(value)) {
            return
          }
          seen.add(value)
          if (key === 'metadata' && value.continue !== undefined) {
            return
          }
          break
      }
      return value
    }
  }
  return JSON.parse(JSON.stringify(obj, getReplacements(), '  '))
}

export const pipeShot = (
  request: Http2ServerRequest,
  requestBody: any,
  options: RequestOptions,
  response: Http2ServerRequest | IncomingMessage
) => {
  if (process.env.NODE_ENV === 'production') {
    console.log('!!!! REMOVE pipeShot FROM CODE !!!!')
    return
  }
  if (process.env.NODE_ENV !== 'test') {
    void parseBody(response).then(async (bodyString) => {
      const body = JSON.parse(bodyString as unknown as string)
      const snapshot = getSnapshot(body, [], 3)
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      await fs.promises.appendFile('./pipeShot.txt', '\n=================================================')
      await fs.promises.appendFile('./pipeShot.txt', '\n=================================================')
      await fs.promises.appendFile('./pipeShot.txt', '\n=================================================')
      await fs.promises.appendFile('./pipeShot.txt', `\n\nconst response = ${JSON.stringify(snapshot)}`)
      await fs.promises.appendFile(
        './pipeShot.txt',
        `\n  nock('${options.hostname}').get('${options.path}').reply(200, response)`
      )
      await fs.promises.appendFile(
        './pipeShot.txt',
        `\n    const res = await request('${request.method}', '${request.url}', ${
          typeof requestBody === 'string' ? requestBody : ''
        })`
      )
      //      const myConsole = new console.Console(fs.appendFile('./pipeShot.txt', {}, true))
      // myConsole.log('const response = %j', snapshot)
      // myConsole.log(`  nock('${options.hostname}').get('${options.path}').reply(200, response)`)
      // myConsole.log(
      //   `const res = await request('${request.method}', '${request.url}', ${
      //     typeof requestBody === 'string' ? requestBody : ''
      //   })`
      // )
    })
  }
}
