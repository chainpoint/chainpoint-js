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

import { isEmpty, forEach, map, every, reject, keys, flatten, mapKeys, camelCase } from 'lodash'

import { isValidURI } from './utils/network'
import { isValidProofHandle } from './utils/proofs'
import { isValidUUID, isValidULID, fetchEndpoints, testArrayArg } from './utils/helpers'

/**
 * Retrieve a collection of proofs for one or more proof IDs from the appropriate Gateway(s)
 * The output of `submitProofs()` can be passed directly as the `proofHandles` arg to
 * this function.
 *
 * @param {Array<{uri: String, proofId: String}>} proofHandles - An Array of Objects, each Object containing
 * all info needed to retrieve a proof from a specific Gateway.
 * @return {Array<{uri: String, proofId: String, proof: String}>} - An Array of Objects, each returning the
 * URI the proof was returned from and the Proof in Base64 encoded binary form.
 */
async function getProofs(proofHandles) {
  // Validate all proofHandles provided
  testArrayArg(proofHandles)
  if (
    !every(proofHandles, h => {
      return isValidProofHandle(h)
    })
  )
    throw new Error('proofHandles Array contains invalid Objects')
  if (proofHandles.length > 250) throw new Error('proofHandles arg must be an Array with <= 250 elements')

  // Validate that *all* URI's provided are valid or throw
  let badHandleURIs = reject(proofHandles, function(u) {
    return isValidURI(u.uri)
  })
  if (!isEmpty(badHandleURIs))
    throw new Error(
      `some proof handles contain invalid URI values : ${map(badHandleURIs, h => {
        return h.uri
      }).join(', ')}`
    )

  // Validate that *all* proofIds provided are valid or throw
  let badHandleUUIDs = reject(proofHandles, function(u) {
    return isValidUUID(u.proofId) || isValidULID(u.proofId)
  })
  if (!isEmpty(badHandleUUIDs))
    throw new Error(
      `some proof handles contain invalid proofId UUID values : ${map(badHandleUUIDs, h => {
        return h.proofId
      }).join(', ')}`
    )

  try {
    // Collect together all proof UUIDs destined for a single Gateway
    // so they can be submitted to the Gateway in a single request.
    let uuidsByGateway = {}
    forEach(proofHandles, handle => {
      if (isEmpty(uuidsByGateway[handle.uri])) {
        uuidsByGateway[handle.uri] = []
      }
      uuidsByGateway[handle.uri].push(handle.proofId)
    })

    // For each Gateway construct a set of GET options including
    // the `proofIds` header with a list of all hash ID's to retrieve
    // proofs for from that Gateway.
    let gatewaysWithGetOpts = map(keys(uuidsByGateway), gatewayUri => {
      let headers = Object.assign(
        {
          accept: 'application/json',
          'content-type': 'application/json'
        },
        {
          proofIds: uuidsByGateway[gatewayUri].join(',')
        }
      )
      let getOptions = {
        method: 'GET',
        uri: gatewayUri + '/proofs',
        body: {},
        headers,
        timeout: 10000
      }
      return getOptions
    })

    let fetchResults = await fetchEndpoints(gatewaysWithGetOpts)

    let getResponses = fetchResults
      // Filter out and log any failed requests
      .filter(result => {
        if (result.error) {
          console.log(`Client error getting proof from ${result.uri} : ${result.error} : Skipping`)
          return false
        }
        return true
      })
      // Return an array of response bodies
      .map(result => result.response)

    let flatParsedBody = flatten(getResponses)

    let proofsResponse = []

    forEach(flatParsedBody, proofResp => {
      // Set to empty Array if unset of null
      proofResp.anchors_complete = proofResp.anchors_complete || []
      // Camel case object keys
      let proofRespCamel = mapKeys(proofResp, (v, k) => camelCase(k))
      proofsResponse.push(proofRespCamel)
    })
    return proofsResponse
  } catch (err) {
    console.error(err.message)
    throw err
  }
}

export default getProofs
