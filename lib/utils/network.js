/**
 * Copyright 2019 Tierion
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * helper functions related to interacting with chainpoint network objects
 * such as Gateways and Cores
 */

import { parse } from 'url'
import { isInteger, slice, shuffle, isString } from 'lodash'
import { isURL, isIP } from 'validator'
import axios from 'axios'
import getConfig from '../config'

let config = getConfig()

/**
 * Check if valid URI
 *
 * @param {string} gatewayURI - The value to check
 * @returns {bool} true if value is a valid Gateway URI, otherwise false
 */
export function isValidURI(uri) {
  if (!isString(uri)) return false

  try {
    let isValidURI = isURL(uri, {
      protocols: ['http', 'https'],
      require_protocol: true,
      host_blacklist: ['0.0.0.0']
    })

    let parsedURI = parse(uri).hostname

    // Valid URI w/ IPv4 address?
    return isValidURI && isIP(parsedURI, 4)
  } catch (error) {
    return false
  }
}

/**
 * Retrieve an Array of discovered Core URIs. Returns one Core URI by default.
 *
 * @param {Integer} num - Max number of Core URI's to return.
 * @returns {string} - Returns an Array of Core URI strings.
 */
export async function getCores(num) {
  num = num || 1

  if (!isInteger(num) || num < 1) throw new Error('num arg must be an Integer >= 1')

  let cores = config.array('cores', ['3.142.136.148', '18.118.26.31', '3.133.161.241', '18.220.31.138', '3.145.43.113'])
  return slice(shuffle(cores), 0, num)
}

/**
 * Retrieve an Array of discovered Core URIs.
 *
 * @param {array} seedIps - array of seed IPs to use for peer discovery
 * @returns {string} - Returns an Array of Core IPs.
 */
export async function getCorePeerListAsync(seedIPs) {
  // eslint-disable-next-line no-undef
  seedIPs = shuffle(seedIPs)

  while (seedIPs.length > 0) {
    let targetIP = seedIPs.pop()
    try {
      let response = await axios.get(`http://${targetIP}/peers`)
      return response.data.concat([targetIP])
    } catch (error) {
      console.log(`Core IP ${targetIP} not responding to peers requests: ${error.message}`)
    }
  }
  throw new Error('Unable to retrieve Core peer list')
}

/**
 * Retrieve an Array of whitelisted Gateway URIs
 *
 * @param {array} coreIps - array of seed IPs to use for gateway discovery
 * @returns {string} - Returns an Array of Gateway IPs.
 */
export async function getGatewayListAsync(coreIPs) {
  // eslint-disable-next-line no-undef
  let gatewayIPs = []
  while (coreIPs.length > 0) {
    let targetIP = coreIPs.pop()
    try {
      let response = await axios.get(`http://${targetIP}/gateways/public`)
      if (response.data.length == 0) {
        throw new Error(`no gateway IPs returned from Core IP ${targetIP}`)
      }
      gatewayIPs.push(...response.data)
      if (gatewayIPs.length >= 3) {
        return gatewayIPs
      }
    } catch (error) {
      console.log(`Core IP ${targetIP} not responding to gateways requests: ${error.message}`)
    }
  }
  throw new Error('Unable to retrieve Core peer list')
}
