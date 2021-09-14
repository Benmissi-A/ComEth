/* eslint-disable comma-dangle */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

const { expect } = require('chai');
// const { ethers } = require('hardhat');
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
      /* const transactionCount = await alice.getTransactionCount();
      const futureAddress = getContractAddress({
        from: alice.address,
        nonce: transactionCount,
      }); */
      const futureAddress = '0xa16E02E87b7454126E5E10d957A927A7F5B5d2be';
      await expect(comEthFactory.connect(alice).createComEth(ethers.utils.parseEther('0.1')))
        .to.emit(comEthFactory, 'ComEthCreated')
        .withArgs(futureAddress);
    });
    /* it('should return an array of the ComEth addresses created contract sofar', async function () {
      await comEthFactory.connect(alice).createComEth(ethers.utils.parseEther('0.1'));
      const comEthAddress = '0xCafac3dD18aC6c6e92c921884f9E4176737C052c';
      expect(await comEthFactory.getComEths()).to.equal(comEthAddress);
    }); */
    it('should return factoryOwner ', async function () {
      expect(await comEthFactory.getFactoryOwner()).to.equal(dev.address);
    });
  });
});
