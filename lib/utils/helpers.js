import fs from 'fs'
import crypto from 'crypto'
import uuidValidate from 'uuid-validate'
import axios from 'axios'
import { isEmpty, isArray, reject, isFunction } from 'lodash'
import url from 'url'

/**
 * Checks if value is a hexadecimal string
 *
 * @param {string} value - The value to check
 * @returns {bool} true if value is a hexadecimal string, otherwise false
 */
export function isHex(value) {
  var hexRegex = /^[0-9a-f]{2,}$/i
  var isHex = hexRegex.test(value) && !(value.length % 2)
  return isHex
}

/**
 * Checks if a UUID is a valid v1 UUID.
 *
 * @param {string} uuid - The uuid to check
 * @returns {bool} true if uuid is valid, otherwise false
 */
export function isValidUUID(uuid) {
  if (uuidValidate(uuid, 1)) return true
  return false
}

export function sha256FileByPath(path) {
  return new Promise((resolve, reject) => {
    let sha256 = crypto.createHash('sha256')
    let readStream = fs.createReadStream(path)
    readStream.on('data', data => sha256.update(data))
    readStream.on('end', () => {
      let hash = sha256.digest('hex')
      resolve({
        path,
        hash
      })
    })
    readStream.on('error', err => {
      if (err.code === 'EACCES') {
        resolve({
          path: path,
          hash: null,
          error: 'EACCES'
        })
      }
      reject(err)
    })
  })
}

export async function fetchEndpoints(requestOptionsArray) {
  return await Promise.all(
    requestOptionsArray.map(async options => {
      let parsedUri = url.parse(options.uri)
      let baseUri = `${parsedUri.protocol}//${parsedUri.host}`
      let response
      try {
        response = await axios({
          method: options.method,
          headers: options.headers,
          url: options.uri,
          data: options.body || undefined,
          timeout: 10000
        })
        if (response.status >= 400) throw new Error(response.statusText)
        return {
          uri: baseUri,
          response: response.data,
          error: null
        }
      } catch (error) {
        console.log(error)
        return {
          uri: baseUri,
          response: null,
          error: error.message
        }
      }
    })
  )
}

/*
 * Helper function to validate a hashes argument that would be passed to other functions
 * @param {Array<String>} hashes - An Array of String Hashes in Hexadecimal form.
 * @param {Function} validator - a function to validate the array of items being validated
 * @returns {void}
 */
export function validateHashesArg(args, validator) {
  // Validate all hashes provided
  if (!isArray(args)) throw new Error('1st arg must be an Array')
  if (isEmpty(args)) throw new Error('1st arg must be a non-empty Array')
  if (args.length > 250) throw new Error('1st arg must be an Array with <= 250 elements')

  if (!validator || !isFunction(validator)) throw new Error('Need a validator function to test argument')
  let rejects = reject(args, validator)
  if (!isEmpty(rejects)) throw new Error(`arg contains invalid items : ${rejects.join(', ')}`)
}

/*
 * Helper function to validate a hashes argument that would be passed to other functions
 * @param {Array<String>} hashes - An Array of String Hashes in Hexadecimal form.
 * @returns {void}
 */
export function validateUrisArg(uris) {
  if (!isArray(uris)) throw new Error('uris arg must be an Array of String URIs')
  if (uris.length > 5) throw new Error('uris arg must be an Array with <= 5 elements')
}

/**
 * Get SHA256 hash(es) of selected file(s) and prepare for submitting to a Gateway
 * @param {Array<String>} paths - An Array of paths of the files to be hashed.
 * @param {Array<String>} uris - An Array of String URI's. Each hash will be submitted to each Gateway URI provided.
 * If none provided three will be chosen at random using service discovery.
 * @returns {Array<{path: String, hash: String} An Array of Objects, each a handle that contains all info needed to retrieve a proof.
 */
export async function getFileHashes(paths) {
  // Validate all paths provided
  // Criteria is the same as for hashes arg so can reuse the helper
  // except need a different validator function
  validateHashesArg(paths, path => fs.existsSync(path) && fs.lstatSync(path).isFile())

  let hashObjs = []
  hashObjs = await Promise.all(paths.map(path => sha256FileByPath(path)))

  // filter out any EACCES errors
  hashObjs = hashObjs.filter(hashObj => {
    if (hashObj.error === 'EACCES') console.error(`Insufficient permission to read file '${hashObj.path}', skipping`)
    return hashObj.error !== 'EACCES'
  })
  return hashObjs
}

/**
 * throws if the first arg is not an array or is an empty array
 */
export function testArrayArg(arg) {
  if (!isArray(arg)) throw new Error('Argument must be an Array')
  if (isEmpty(arg)) throw new Error(`Argument must be a non-empty Array`)
}
