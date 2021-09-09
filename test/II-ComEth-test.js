/* eslint-disable comma-dangle */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

const { expect } = require('chai');

/*
addUser -OK
pay -OK
submitProposal -OK
vote -OK
proposalById -OK
toggleIsActive -OK
getIsBanned -OK
getInvestmentBalance

getProposalsList
getBalance
quitComEth

*/

/* on teste les fonctions du Contrat ComEth */
describe('ComEth', function () {
  // la liste des signers qui seront utilisés dans les tests
  let ComEth, comEth, alice, bob, eve;
  // tarif des cotisations fixe determine au lancement du smartContract
  const subscriptionPrice = ethers.utils.parseEther('0.1');

  this.beforeEach(async function () {
    // avant chaque test on deploie comet avec alice comme owner user par defaut
    [dev, alice, bob, eve] = await ethers.getSigners();
    ComEth = await ethers.getContractFactory('ComEth');
    comEth = await ComEth.connect(alice).deploy(alice.address, subscriptionPrice);
    await comEth.deployed();
  });
  describe('Getters / modifiers /user-statements', function () {
    // test des differents modifiers , des fonctions get sont mis en place
    // les variables d'etat ont les proprietes de la struct User du smartContrat

    it('should return if hasPaid is true', async function () {
      //
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ from: bob.address, value: ethers.utils.parseEther('0.1') });
      const tx = await comEth.getUser(bob.address);
      expect(tx.hasPaid).to.equal(true);
    });
    it('should return if hasPaid is false', async function () {
      await comEth.connect(eve).addUser();
      const tx = await comEth.getUser(eve.address);
      expect(tx.hasPaid).to.equal(false);
    });
    it('should return if isBanned is false', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ from: bob.address, value: ethers.utils.parseEther('0.1') });
      const tx = await comEth.getUser(bob.address);
      expect(tx.isBanned).to.equal(false);
    });
    it('should return if isBanned is false when cycle is not elapsed', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      const tx = await comEth.getUser(bob.address);
      expect(tx.isBanned).to.equal(false);
    });
    it('should return if isActive when cycle is elapsed', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).toggleIsActive();
      /* await ethers.provider.send('evm_increaseTime', [3600 * 24 * 15]);
      await ethers.provider.send('evm_mine'); */
      const tx = await comEth.getUser(bob.address);
      console.log(tx);
      expect(tx.isActive).to.equal(false);
    });
    it('should revert if isBanned is true', async function () {
      await comEth.connect(eve).addUser();
      await ethers.provider.send('evm_increaseTime', [2629800]);
      await ethers.provider.send('evm_mine');
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).quitComEth();
      await ethers.provider.send('evm_increaseTime', [2629800]);
      await ethers.provider.send('evm_mine');
      await expect(comEth.connect(eve).toggleIsActive()).to.be.revertedWith('Cometh: user is banned');
    });
  });
  describe('addUsers', function () {
    it('should emit UserAdded', async function () {
      await expect(comEth.connect(bob).addUser()).to.emit(comEth, 'UserAdded').withArgs(bob.address);
    });
    // it('should revert with ComEth: user already exist', async function () {
    //  await comEth.addUser(bob.address)
    //  await expect(comEth.addUser(bob.address)).to.be.revertedWith('ComEth: user already exist');
    // });
  });
  describe('Pay', function () {
    it('has payed', async function () {
      await comEth.addUser();
      await comEth.pay();
      expect(await comEth.getInvestmentBalance(alice.address)).to.equal(subscriptionPrice);
    });
    it('should revert if already pay', async function () {
      await comEth.addUser();
      await comEth.pay();
      await expect(comEth.pay()).to.be.revertedWith('ComEth: You have already paid your subscription for this month.');
    });
    it('should pay after a cycle', async function () {
      await comEth.addUser();
      await comEth.pay();
      await ethers.provider.send('evm_increaseTime', [2629800]);
      await ethers.provider.send('evm_mine');
      await comEth.handleCycle();
      expect(await comEth.getInvestmentBalance(alice.address)).to.equal(ethers.utils.parseEther('0.1'));
    });
  });
  describe('testing balances', function () {
    it('should return balance', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      const tx = await comEth.pay({ from: alice.address, value: ethers.utils.parseEther('0.1') });
      await tx.wait();
      const tx1 = await comEth.connect(bob).pay({ from: bob.address, value: ethers.utils.parseEther('0.1') });
      await tx1.wait();
      expect(await comEth.getBalance()).to.equal({ from: addr1, value: ethers.utils.parseEther('0.2') });
    });
    it('should return investmentBalance[comEth.address] ', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.pay();
      await comEth.connect(bob).pay();
      expect(await comEth.getInvestmentBalance(comEth.address)).to.equal(ethers.utils.parseEther('0.2'));
    });
    it('should return investmentBalance', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.pay();
      await comEth.connect(bob).pay();
      expect(await comEth.getInvestmentBalance(alice.address)).to.equal(ethers.utils.parseEther('0.1'));
    });
  });
  describe('Submit Proposal', function () {
    it('should emmit ProposalCreated', async function () {
      await comEth.connect(alice).addUser(bob.address);
      await comEth.connect(bob).pay();
      await expect(
        comEth
          .connect(bob)
          .submitProposal(['A', 'B', 'C'], 'quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.01'))
      )
        .to.emit(comEth, 'ProposalCreated')
        .withArgs(1, 'quel est votre choix ?');
    });
    it('should revert if isActive', async function () {
      await comEth.connect(alice).addUser(bob.address);
      await comEth.connect(bob).pay();
      await comEth.connect(bob).toggleIsActive();
      await expect(
        comEth
          .connect(bob)
          .submitProposal(['A', 'B', 'C'], 'quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.01'))
      ).to.be.revertedWith('Cometh: user is not active');
    });
    it('should revert if isBanned', async function () {
      await comEth.connect(eve).addUser();
      await comEth.connect(eve).pay();
      await comEth.toggleIsBanned(eve.address);

      await expect(
        comEth
          .connect(eve)
          .submitProposal(
            ['A', 'B', 'C'],
            'quel est votre choix ?',
            900,
            alice.address,
            ethers.utils.parseEther('0.01')
          )
      ).to.be.revertedWith('Cometh: user is banned');
    });
    it('should revert if hasPaid', async function () {
      await comEth.connect(alice).addUser(bob.address);
      await expect(
        comEth
          .connect(bob)
          .submitProposal(['A', 'B', 'C'], 'quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.01'))
      ).to.be.revertedWith('Cometh: user has not paid subscription');
    });
  });
  describe('Vote', function () {
    it('should emit Voted', async function () {
      await comEth.addUser();
      await comEth.pay();
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        bob.address,
        ethers.utils.parseEther('0.01')
      );
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay();

      await expect(comEth.connect(bob).vote(1, 1))
        .to.emit(comEth, 'Voted')
        .withArgs(bob.address, 1, 'quel est votre choix ?');
    });
    it('should revert if already voted', async function () {
      await comEth.connect(alice).addUser(bob.address);
      await comEth.connect(bob).pay();
      await comEth
        .connect(bob)
        .submitProposal(['A', 'B', 'C'], 'quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0'));
      await comEth.connect(bob).vote(1, 1);
      await expect(comEth.connect(bob).vote(1, 1)).to.be.revertedWith('ComEth: Already voted');
    });
    it('should revert if isActive', async function () {
      await comEth.connect(alice).addUser(bob.address);
      await comEth.connect(bob).pay();
      await comEth.connect(bob).toggleIsActive();
      await expect(comEth.connect(bob).vote(1, 1)).to.be.revertedWith('Cometh: user is not active');
    });
    it('should revert if hasPaid', async function () {
      await comEth.connect(eve).addUser();
      await expect(comEth.connect(eve).vote(1, 1)).to.be.revertedWith('Cometh: user has not paid subscription');
    });
    it('should revert if isBanned', async function () {
      await comEth.connect(eve).addUser();
      await comEth.connect(eve).pay();
      await comEth.toggleIsBanned(eve.address);
      await expect(comEth.connect(eve).vote(1, 1)).to.be.revertedWith('Cometh: user is banned');
    });
    it('should revert with ComEth: Not a running proposal', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.connect(bob).pay();
      await comEth.pay();
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0')
      );
      await ethers.provider.send('evm_increaseTime', [1000]);
      await ethers.provider.send('evm_mine');
      await comEth.connect(alice).vote(1, 1);
      await expect(comEth.connect(bob).vote(1, 1)).to.be.revertedWith('ComEth: Not a running proposal');
    });
  });
  describe('proposalsByID', function () {
    it('should return proposal[id].proposition', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.connect(alice).pay();
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0.01')
      );
      const res = await comEth.proposalById(1);
      expect(res.proposition).to.equal('quel est votre choix ?');
    });

    it('should return proposal[id].voteOptions', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.connect(bob).pay();
      await comEth.pay();
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0.0')
      );
      await comEth.connect(bob).vote(1, 1);
      await comEth.vote(1, 1);
      const res = await comEth.proposalById(1);
      expect(res.voteOptions[1]).to.equal('B');
    });

    it('should return proposal[id].voteCount', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.connect(bob).pay();
      await comEth.pay();
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0.0')
      );
      await comEth.connect(bob).vote(1, 1);
      await comEth.vote(1, 1);
      const res = await comEth.proposalById(1);
      expect(res.voteCount[1]).to.equal(2);
    });
    it('should return proposal[id].author', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.connect(bob).pay();
      await comEth.pay();
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0.0')
      );
      await comEth.connect(bob).vote(1, 1);
      await comEth.vote(1, 1);
      const res = await comEth.proposalById(1);
      expect(res.author).to.equal(alice.address);
    });
    it('should return proposal[id].paiementReceiver', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.connect(bob).pay();
      await comEth.pay();
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0.0')
      );
      await comEth.connect(bob).vote(1, 1);
      await comEth.vote(1, 1);
      const res = await comEth.proposalById(1);
      expect(res.paiementReceiver).to.equal(eve.address);
    });
    it('should return proposal[id].paiementAmount', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.connect(bob).pay();
      await comEth.pay();
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0')
      );
      await comEth.connect(bob).vote(1, 1);
      await comEth.vote(1, 1);
      const res = await comEth.proposalById(1);
      expect(res.paiementAmount).to.equal(0);
    });
    it('should return proposal[id].statusVote is Running', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.connect(bob).pay();
      await comEth.pay();
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0')
      );
      await comEth.connect(bob).vote(1, 1);
      const res = await comEth.proposalById(1);
      expect(res.statusVote).to.equal(1);
    });
    it('should return proposal[id].statusVote is Approved', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.connect(bob).pay();
      await comEth.pay();
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0')
      );
      await comEth.connect(bob).vote(1, 1);
      await comEth.vote(1, 1);
      const res = await comEth.proposalById(1);
      expect(res.statusVote).to.equal(2);
    });
    it('should return proposal[id].statusVote is Rejected', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.connect(bob).pay();
      await comEth.pay();
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0')
      );
      await ethers.provider.send('evm_increaseTime', [1000]);
      await ethers.provider.send('evm_mine');
      await comEth.connect(alice).vote(1, 1);
      const res = await comEth.proposalById(1);
      expect(res.statusVote).to.equal(3);
    });
  });
});
