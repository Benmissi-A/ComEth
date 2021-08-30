/* eslint-disable comma-dangle */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

const { expect } = require('chai');

/* 
addUser
pay
submitProposal
proposalById
getProposalsList
vote
toggleIsActive
quitComEth
getIsBanned
getInvestmentBalance
getBalance
*/

describe('ComEth', function () {
  let ComEth, comEth, dev, alice, bob, eve;
  const subscriptionPrice = ethers.utils.parseEther('0.1');

  this.beforeEach(async function () {
    [dev, alice, bob, eve] = await ethers.getSigners();
    ComEth = await ethers.getContractFactory('ComEth');
    comEth = await ComEth.connect(alice).deploy(alice.address, subscriptionPrice);
    await comEth.deployed();
  });
  describe('addUsers', function () {
    it('should emit UserAdded', async function () {
      await expect(comEth.addUser(bob.address)).to.emit(comEth, 'UserAdded').withArgs(bob.address);
    });
    it('should revert with Cometh: you are not allowed to add users', async function () {
      await expect(comEth.connect(bob).addUser(bob.address)).to.be.revertedWith(
        'ComEth: You are not allowed to add users.'
      );
    });
    // it('should revert with ComEth: user already exist', async function () {
    //  await comEth.addUser(bob.address)
    //  await expect(comEth.addUser(bob.address)).to.be.revertedWith('ComEth: user already exist');
    // });
  });
  describe('Pay', function () {
    it('has payed', async function () {
      await comEth.addUser(alice.address);
      await comEth.pay();
      expect(await comEth.getInvestmentBalance(alice.address)).to.equal(subscriptionPrice);
    });
    it('should revert if already pay', async function () {
      await comEth.addUser(alice.address);
      await comEth.pay();
     await expect( comEth.pay()).to.be.revertedWith('ComEth: You have already paid your subscription for this month.');
    });
  });
  describe('Submit Proposal', function () {
    it('it submit proposal', async function () {
      await comEth.connect(alice).addUser(bob.address);
      await comEth.connect(bob).pay();
      await expect(
        comEth
          .connect(bob)
          .submitProposal(
            ['one', 'two', 'Frééé'],
            'qui sont les meilleurs',
            900,
            eve.address,
            ethers.utils.parseEther('0.01')
          )
      )
        .to.emit(comEth, 'ProposalCreated')
        .withArgs(1, 'qui sont les meilleurs');
    });
  });
  describe('Vote', function () {
    it('should emit Voted', async function () {
      await comEth.addUser(alice.address);
      await comEth.pay();
      await comEth.submitProposal(
        ['one', 'two', 'Frééé'],
        'qui sont les meilleurs',
        900,
        eve.address,
        ethers.utils.parseEther('0.01')
      );
      await comEth.addUser(bob.address);
      await comEth.connect(bob).pay();

      await expect(comEth.connect(bob).vote(1, 1))
        .to.emit(comEth, 'Voted')
        .withArgs(bob.address, 1, 'qui sont les meilleurs');
    });
  });
});
