/* eslint-disable comma-dangle */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

const { expect } = require('chai');

/* 
proposalById
getProposalsList
vote
toggleIsActive
addUser
pay
quitComEth
getIsBanned
getInvestmentBalance
getBalance
*/

describe('ComEth', function () {
  let ComEth, comEth, dev, alice, bob, eve;

  this.beforeEach(async function () {
    [dev, alice, bob, eve] = await ethers.getSigners();
    ComEth = await ethers.getContractFactory('ComEth');
    comEth = await ComEth.connect(alice).deploy(alice.address, ethers.utils.parseEther('0.1'));
    await comEth.deployed();
  });
  describe('addUsers', function () {
    it('should emit UserAdded', async function () {
      await expect(comEth.addUser(bob.address)).to.emit(comEth, 'UserAdded').withArgs(bob.address);
    });
    it('has payed', async function () {
      await expect(comEth.addUser(bob.address)).to.emit(comEth, 'UserAdded').withArgs(bob.address);
    });
  });
  describe('Submit Proposal', function () {
    it('it submit proposal', async function () {
      await comEth.addUser(bob.address);
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
    describe('Vote', function () {
      it('should emit Voted', async function () {
        //await expect(comEth.addUser(bob.address)).to.emit(comEth, 'UserAdded').withArgs(bob.address);
      });
    });
  });
});
