# Important:

Chainpoint-js is for use with the Chainpoint v4 Network. If you need to work with the older Chainpoint v3 Network (chainpoint-services), please use [chainpoint-client](https://www.npmjs.com/package/chainpoint-client).

# Chainpoint Client (JavaScript)

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![npm](https://img.shields.io/npm/l/chainpoint-js.svg)](https://www.npmjs.com/package/chainpoint-js)
[![npm](https://img.shields.io/npm/v/chainpoint-js.svg)](https://www.npmjs.com/package/chainpoint-js)

## About

Chainpoint-js is a javascript client for creating and verifying [Chainpoint](https://chainpoint.org) proofs. Each proof cryptographically proves the integrity and existence of data at a point in time. This client handles all the steps for submitting hashes, retrieving proofs, and verifying proofs.

API documentation is available in the [Client API document](https://github.com/chainpoint/chainpoint-js/blob/master/API.md).

See [Chainpoint Start](https://github.com/chainpoint/chainpoint-start) for an overview of the Chainpoint Network.

## Proof Creation and Verification Overview

Creating a Chainpoint proof is an asynchronous process.

### Submit Hash(es)

This is an HTTP request that passes an Array of hash(es) to a Gateway. The Gateway will return a Version 1 UUID for each hash submitted. This `proofId` is used later for retrieving a proof. Chainpoint-js will automatically attempt to connect to three public Gateways. This default behavior can be overridden to submit hashes to specific Gateways by passing an array of Gateway URIs as an argument (see example below).

### Get Proof(s)

Proofs are first anchored to the 'Calendar' chain maintained by every Chainpoint Core. This takes around 2 minutes. Retrieving a `proofId` at this stage returns a proof anchored to the Calendar.

Proofs are appended with data as they are anchored to additional blockchains. For example, it takes 60 - 90 minutes to anchor a proof to Bitcoin. Calling getProofs will now append the first proof with data that anchors it to the Bitcoin Blockchain.

Gateways retain proofs for 24 hours. Clients must retrieve and permanently store each Chainpoint proof.

### Verify Proof(s)

Anyone with a Chainpoint proof can verify that it cryptographically anchors to one or more public blockchains. The verification process performs the operations in the proof to re-create a Merkle root. This value is compared to a Merkle root stored in the public blockchain. If the values match, the proof is valid.

### Evaluate Proof(s)

This function calculates and returns the expected values for each anchor. This function does not verify that the expected values exist on the public blockchains. In most common cases, you will want to use Verify instead.

## Examples

[Try It Out with RunKit](https://runkit.com/jacohend/tierion-chainpoint-js-example)

```javascript
const chp = require('chainpoint-js')

async function runIt() {
  // A few sample SHA-256 proofs to anchor
  let hashes = [
    '1d2a9e92b561440e8d27a21eed114f7018105db00262af7d7087f7dea9986b0a',
    '2d2a9e92b561440e8d27a21eed114f7018105db00262af7d7087f7dea9986b0a',
    '3d2a9e92b561440e8d27a21eed114f7018105db00262af7d7087f7dea9986b0a'
  ]

  // This line is only needed when specifying your own Gateway URIs.
  // Otherwise when the `uris` argument is omitted, automatic public Gateway discovery will be used.
  let uris = ['http://3.133.135.157', 'http://18.191.50.129', 'http://18.224.185.143']

  // Submit each hash to selected Gateways
  let proofHandles = await chp.submitHashes(hashes, uris)
  console.log('Submitted Proof Objects: Expand objects below to inspect.')
  console.log(proofHandles)

  // Wait for Calendar proofs to be available
  console.log('Sleeping 120 seconds (60 sec aggregation, 60 sec calendar) to wait for proofs to generate...')
  await new Promise(resolve => setTimeout(resolve, 130000))

  // Retrieve a Calendar proof for each hash that was submitted
  let proofs = await chp.getProofs(proofHandles)
  console.log('Proof Objects: Expand objects below to inspect.')
  console.log(proofs)

  // Verify every anchor in every Calendar proof
  let verifiedProofs = await chp.verifyProofs(proofs)
  console.log('Verified Proof Objects: Expand objects below to inspect.')
  console.log(verifiedProofs)

  // Wait 90 minutes for Bitcoin anchor proof, then run getProofs again
}

runIt()
```

### JavaScript Client-Side Frameworks Example

Note: If you are using any client-side JavaScript framework (ex. Angular, React, etc) remember to import chainpoint-js in the following manner:

```js
import chainpoint from 'chainpoint-js/dist/bundle.web'
```

or

```js
const chainpoint = require('chainpoint-js/dist/bundle.web')
```

### Browser Script Tag Example

You can copy `dist/bundle.web.js` into your app to be served from your own web server and included in a script tag.

Or install the `npm` package in a place available to your web server pages and set the `script src` tag as shown in the example below. A set of window global functions (e.g. `chainpointClient.submitHashes()`) will then be available for use in a fashion similar to that shown in the examples above.

```html
<script src="./node_modules/chainpoint-js/dist/bundle.web.js">
```

## License

[Apache License, Version 2.0](https://opensource.org/licenses/Apache-2.0)

```txt
Copyright (C) 2017-2020 Tierion

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
