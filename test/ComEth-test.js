/* eslint-disable quotes */
/* eslint-disable no-undef */

const { expect } = require('chai');

describe('ComEth', function () {

 let ComEthFactory, comEthFactory, ComEth, comEth, dev, alice, bob, eve;


  this.beforeEach(async function () {
    [dev, alice, bob, eve] = await ethers.getSigners();
    ComEthFactory = await ethers.getContractFactory('Token');
    comEthFactory = await ComEthFactory.connect(dev).deploy();
    await token.deployed();
  });

  describe('ComEthFactory Deployement' , function() {
    it ('should emit event ')
  })

});
