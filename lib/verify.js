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

import url from 'url'
import { isEmpty, isString, forEach, map, uniqWith, isEqual, uniq, flatten, mapKeys, camelCase } from 'lodash'

import { isValidGatewayURI } from './utils/network'
import { fetchEndpoints } from './utils/helpers'
// need to import evaluate this way so that tests can stub it and confirm
// it was called
import * as evaluate from './evaluate'

/**
 * Verify a collection of proofs using an optionally provided Gateway URI
 *
 * @param {Array} proofs - An Array of String, or Object proofs from getProofs(), to be verified. Proofs can be in any of the supported JSON-LD or Binary formats.
 * @param {String} uri - [Optional] The Gateway URI to submit proof(s) to for verification. If not provided a Gateway will be selected at random. All proofs will be verified by a single Gateway.
 * @return {Array<Object>} - An Array of Objects, one for each proof submitted, with vefification info.
 */
export default async function verifyProofs(proofs, uri) {
  let evaluatedProofs = evaluate.evaluateProofs(proofs)

  // Validate and return an Array with a single Gateway URI
  let gatewayUri
  if (isEmpty(uri)) {
    gatewayUri = 'http://3.17.155.208'
  } else {
    if (!isString(uri)) throw new Error('uri arg must be a String')
    if (!isValidGatewayURI(uri)) throw new Error(`uri arg contains invalid Gateway URI : ${uri}`)
    gatewayUri = uri
  }

  // Assign all flat proofs to the same Gateway URI for verification
  let singleGatewayFlatProofs = map(evaluatedProofs, proof => {
    let oldProofURI = url.parse(proof.uri)
    proof.uri = gatewayUri + oldProofURI.path
    return proof
  })

  let flatProofs = uniqWith(singleGatewayFlatProofs, isEqual)
  let anchorURIs = []
  forEach(flatProofs, proof => {
    anchorURIs.push(proof.uri)
  })

  let uniqAnchorURIs = uniq(anchorURIs)

  let gatewaysWithGetOpts = map(uniqAnchorURIs, anchorURI => {
    let headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }

    return {
      method: 'GET',
      uri: anchorURI,
      body: {},
      headers,
      timeout: 10000
    }
  })

  let fetchResults = await fetchEndpoints(gatewaysWithGetOpts)

  let getResponses = fetchResults
    // Filter out and log any failed requests
    .filter(result => {
      if (result.error) {
        console.log(`Client error in verify response from ${result.uri} : ${result.error} : Skipping`)
        return false
      }
      return true
    })
    // Return an array of response bodies
    .map(result => result.response)

  // fetchEndpoints returns an Array entry for each host it submits to.
  let flatParsedBody = flatten(getResponses)

  let hashesFound = {}

  forEach(gatewaysWithGetOpts, (getOpt, index) => {
    // only add blockHeight to hashesFound map if a hash was returned
    // this avoids adding a uri with an empty value to the hashes found map
    if (flatParsedBody[index].length) {
      let uriSegments = getOpt.uri.split('/')
      let blockHeight = uriSegments[uriSegments.length - 2]
      hashesFound[blockHeight] = flatParsedBody[index]
    }
  })

  if (isEmpty(hashesFound)) throw new Error('No hashes were found.')
  let results = []

  forEach(flatProofs, flatProof => {
    let uriSegments = flatProof.uri.split('/')
    let blockHeight = uriSegments[uriSegments.length - 2]
    if (flatProof.expected_value === hashesFound[blockHeight]) {
      // IT'S GOOD!
      flatProof.verified = true
      flatProof.verified_at = new Date().toISOString().slice(0, 19) + 'Z'
    } else {
      // IT'S NO GOOD :-(
      flatProof.verified = false
      flatProof.verified_at = null
    }

    // Camel case object keys
    let flatProofCamel = mapKeys(flatProof, (v, k) => camelCase(k))

    results.push(flatProofCamel)
  })
  return results
}
