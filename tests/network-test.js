import { expect } from 'chai'

import { network } from '../lib/utils'

describe('network utilities', () => {
  describe('isValidGatewayURI', () => {
    it('should only pass valid gateway URIs', () => {
      let validURIs = ['http://123.45.64.2', 'https://123.54.32.11']
      let invalidURIs = [
        123, // should only accept strings
        '0.0.0.0', // blacklisted
        'chainpoint.org', // must be IP address
        '123.45.66.3', // must have protocol
        'ftp://123.45.66.3' // only accept http or https protocol
      ]
      validURIs.forEach(uri => expect(network.isValidURI(uri), `expected ${uri} to be validated`).to.be.true)
      invalidURIs.forEach(uri => expect(network.isValidURI(uri), `expected ${uri} to be validated`).to.be.false)
    })
  })

  describe('getCorePeerListAsync', () => {
    it('should return valid core IPs from seed core', async () => {
      let ips = ['18.220.31.138']
      let cores = await network.getCorePeerListAsync(ips)
      cores.forEach(
        core => expect(network.isValidURI('http://' + core), `Invalid core URI returned: ${core}`).to.be.true
      )
    })
  })

  describe('getGatewayListAsync', () => {
    it('should return valid gateway IPs from seed core', async () => {
      let ips = ['18.220.31.138']
      let gateways = await network.getCorePeerListAsync(ips)
      gateways.forEach(
        gt => expect(network.isValidURI('http://' + gt), `Invalid gateway URI returned: ${gt}`).to.be.true
      )
    })
  })

  describe('getCores', () => {
    it('should return valid core URIs corresponding to the number requested', async () => {
      let count = 2
      let cores = await network.getCores(count)
      expect(cores).to.have.lengthOf.at.most(count)
      cores.forEach(
        core => expect(network.isValidURI('http://' + core), `Invalid core URI returned: ${core}`).to.be.true
      )
    })
  })
})
