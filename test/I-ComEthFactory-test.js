/* eslint-disable comma-dangle */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

const { expect } = require('chai');
const { getContractAddress } = require('@ethersproject/address');

describe('ComEthFactory', function () {
  let ComEthFactory, comEthFactory, dev, alice, bob, eve;

  // it deploys first
  this.beforeEach(async function () {
    [dev, alice, bob, eve] = await ethers.getSigners();
    ComEthFactory = await ethers.getContractFactory('ComEthFactory');
    comEthFactory = await ComEthFactory.connect(dev).deploy(dev.address);
    await comEthFactory.deployed();
  });

  describe('functions', function () {
    /* getContractAddress(): the address of the contract can only be generated using the address
       of the deployer and its nonce.
       We import @ethersproject/address for this.
    */
    it('should emit event ComEthCreated', async function () {
      const futureAddress = getContractAddress({
        from: comEthFactory.address,
        nonce: comEthFactory.deployTransaction.nonce + 1,
      });
      await expect(comEthFactory.connect(alice).createComEth(ethers.utils.parseEther('0.1')))
        .to.emit(comEthFactory, 'ComEthCreated')
        .withArgs(futureAddress);
    });
    //
    it('should return factoryOwner ', async function () {
      expect(await comEthFactory.getFactoryOwner()).to.equal(dev.address);
    });
  });
});
