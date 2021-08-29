/* eslint-disable comma-dangle */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

const { expect } = require('chai');

describe('ComEth', function () {
  let ComEthFactory, comEthFactory, ComEth, comEth, dev, alice, bob, eve;

  this.beforeEach(async function () {
    [dev, alice, bob, eve] = await ethers.getSigners();
    ComEthFactory = await ethers.getContractFactory('Token');
    comEthFactory = await ComEthFactory.connect(dev).deploy();
    await comEthFactory.deployed();
  });

  describe('ComEthFactory Deployement', function () {
    it('should return factoryOwner ', function(){
      
    });
  });
});
