/* eslint-disable comma-dangle */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

const { expect } = require('chai');
const { ethers } = require('hardhat');

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
  describe('Modifiers, variables and getters', function () {
    // test des differents modifiers , des fonctions get sont mis en place
    // les variables d'etat ont les proprietes de la struct User du smartContrat

    it('should return hasPaid is true', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ from: bob.address, value: ethers.utils.parseEther('0.2') });
      const tx = await comEth.connect(bob).getUser(bob.address);
      expect(tx.hasPaid).to.equal(true);
    });
    it('should return hasPaid is false', async function () {
      await comEth.connect(eve).addUser();
      const tx = await comEth.getUser(eve.address);
      expect(tx.hasPaid).to.equal(false);
    });

    it('should return isBanned is false', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ from: bob.address, value: ethers.utils.parseEther('0.1') });
      const tx = await comEth.getUser(bob.address);
      expect(tx.isBanned).to.equal(false);
    });

    it('should revert as isBanned is true (unpaidSubscriptions >= 2)', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      // 5443200 increase time of 9 weeks (2 full cycles + 1 week) so: 2 unpaidSubscriptions
      await ethers.provider.send('evm_increaseTime', [5443200]);
      await ethers.provider.send('evm_mine');
      await expect(
        comEth
          .connect(bob)
          .submitProposal(['A', 'B', 'C'], 'quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.01'))
      ).to.be.revertedWith('Cometh: user is banned');
    });
    it('should return isActive as false', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).toggleIsActive();
      const tx = await comEth.getUser(bob.address);
      expect(tx.isActive).to.equal(false);
    });
  });

  describe('addUsers', function () {
    it('should emit UserAdded', async function () {
      await expect(comEth.connect(bob).addUser()).to.emit(comEth, 'UserAdded').withArgs(bob.address);
    });

    it('should revert because user already exists', async function () {
      await comEth.connect(bob).addUser();
      await expect(comEth.connect(bob).addUser()).to.be.revertedWith('ComEth: already an user');
    });
    it('should create User with the struct arguments: address, false, false, true, true, 1', async function () {
      await comEth.connect(bob).addUser();
      const tx = await comEth.getUser(bob.address);
      expect(tx.userAddress).to.equal(bob.address);
      expect(tx.isBanned).to.equal(false);
      expect(tx.hasPaid).to.equal(false);
      expect(tx.isActive).to.equal(true);
      expect(tx.exists).to.equal(true);
      expect(tx.unpaidSubscriptions).to.equal(1);
    });
    it('should set nbActiveUsers to 1', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).toggleIsActive();
      await comEth.connect(eve).addUser();
      expect(await comEth.getActiveUsersNb()).to.equal(1);
    });
  });

  describe('Pay', function () {
    it('should return hasPaid as true when user has paid', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      const tx = await comEth.getUser(alice.address);
      expect(tx.hasPaid).to.equal(true);
    });
    it('should return the right investmentBalance when user has paid', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      expect(await comEth.getInvestmentBalance(alice.address)).to.equal(subscriptionPrice);
    });
    it('should revert if already paid', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await expect(comEth.pay({ value: ethers.utils.parseEther('0.1') })).to.be.revertedWith(
        'ComEth: You have already paid your subscription for this month.'
      );
    });
    it('should accept new payment after a cycle ends', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await ethers.provider.send('evm_increaseTime', [2633400]);
      await ethers.provider.send('evm_mine');
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      expect(await comEth.getInvestmentBalance(alice.address)).to.equal(ethers.utils.parseEther('0.2'));
    });
    it('should transfer back exceeding weis', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.6') });
      expect(await comEth.getInvestmentBalance(bob.address)).to.equal(ethers.utils.parseEther('0.1'));
    });
    it('should emit Deposited', async function () {
      await comEth.addUser();
      await expect(comEth.pay({ value: ethers.utils.parseEther('0.1') }))
        .to.emit(comEth, 'Deposited')
        .withArgs(alice.address, ethers.utils.parseEther('0.1'));
    });
    it('should revert if user does not exist', async function () {
      await expect(comEth.connect(bob).pay()).to.be.revertedWith('ComEth: User is not part of the ComEth');
    });
    it('should revert if user is not active', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).toggleIsActive();
      await expect(comEth.connect(bob).pay()).to.be.revertedWith('Cometh: user is not active');
    });
    it('should revert if msg.value < amountToBePaid', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await ethers.provider.send('evm_increaseTime', [7889229]);
      await ethers.provider.send('evm_mine');
      await expect(comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') })).to.be.revertedWith(
        'ComEth: unsufficient amount to pay for subscription'
      );
    });
  });

  describe('testing balances', function () {
    it('should return balance of contract', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      expect(await comEth.getBalance()).to.equal(ethers.utils.parseEther('0.2'));
    });
    it('should return investmentBalance[comEth.address] ', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      expect(await comEth.getInvestmentBalance(comEth.address)).to.equal(ethers.utils.parseEther('0.2'));
    });
    it('should return investmentBalance of user', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      expect(await comEth.getInvestmentBalance(alice.address)).to.equal(ethers.utils.parseEther('0.1'));
    });
    // transfer ne fonctionne pas dans withdraw!!!
    it('should decrement balance after quitting contract', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      const tx1 = await comEth.getBalance();
      console.log(tx1.toString());
      await comEth.connect(bob).quitComEth();
      const tx = await comEth.getBalance();
      console.log(tx.toString());
      expect(await comEth.getBalance()).to.equal(ethers.utils.parseEther('0.1'));
    });
  });

  describe('Submit Proposal', function () {
    it('should emit ProposalCreated', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await expect(
        comEth
          .connect(bob)
          .submitProposal(['A', 'B', 'C'], 'quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.01'))
      )
        .to.emit(comEth, 'ProposalCreated')
        .withArgs(1, 'quel est votre choix ?');
    });
    it('should revert if isActive is false', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).toggleIsActive();
      await expect(
        comEth
          .connect(bob)
          .submitProposal(['A', 'B', 'C'], 'quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.01'))
      ).to.be.revertedWith('Cometh: user is not active');
    });
    it('should revert if isBanned', async function () {
      await comEth.connect(eve).addUser();
      await comEth.connect(eve).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.addUser();
      await comEth.connect(alice).toggleIsBanned(eve.address);
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
  });

  describe('Vote', function () {
    it('should emit Voted', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        bob.address,
        ethers.utils.parseEther('0.01')
      );
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });

      await expect(comEth.connect(bob).vote(1, 1))
        .to.emit(comEth, 'Voted')
        .withArgs(bob.address, 1, 'quel est votre choix ?');
    });
    it('should revert if already voted', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth
        .connect(bob)
        .submitProposal(['A', 'B', 'C'], 'quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0'));
      await comEth.connect(bob).vote(1, 1);
      await expect(comEth.connect(bob).vote(1, 1)).to.be.revertedWith('ComEth: Already voted');
    });
    it('should revert if isActive is false', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).toggleIsActive();
      await expect(comEth.connect(bob).vote(1, 1)).to.be.revertedWith('Cometh: user is not active');
    });
    it('should revert if user does not exist', async function () {
      await expect(comEth.vote(1, 1)).to.be.revertedWith('ComEth: User is not part of the ComEth');
    });
    it('should revert if isBanned', async function () {
      await comEth.connect(eve).addUser();
      await comEth.connect(eve).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.addUser();
      await comEth.toggleIsBanned(eve.address);
      await expect(comEth.connect(eve).vote(1, 1)).to.be.revertedWith('Cometh: user is banned');
    });
    it('should set vote status if time has run out', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0')
      );
      await comEth.vote(1, 1);
      await ethers.provider.send('evm_increaseTime', [1000]);
      await ethers.provider.send('evm_mine');
      await comEth.connect(bob).vote(1, 1);
      const tx = await comEth.proposalById(1);
      expect(tx.statusVote).to.equal(3);
    });
  });

  describe('proposalsByID', function () {
    it('should return proposal[id].proposition', async function () {
      await comEth.addUser();
      await comEth.connect(alice).pay({ value: ethers.utils.parseEther('0.1') });
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

    it('should return proposal[id].voteOptions[i]', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0.0')
      );
      const res = await comEth.proposalById(1);
      expect(res.voteOptions[1]).to.equal('B');
    });

    it('should return proposal[id].voteCount', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
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
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0.0')
      );
      const res = await comEth.proposalById(1);
      expect(res.author).to.equal(alice.address);
    });
    it('should return proposal[id].paiementReceiver', async function () {
      await comEth.addUser();
      await comEth.connect(eve).addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0.0')
      );
      const res = await comEth.proposalById(1);
      expect(res.paiementReceiver).to.equal(eve.address);
    });
    it('should return proposal[id].paiementAmount', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0')
      );
      const res = await comEth.proposalById(1);
      expect(res.paiementAmount).to.equal(0);
    });
    it('should return proposal[id].statusVote is Running', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal(
        ['A', 'B', 'C'],
        'quel est votre choix ?',
        900,
        eve.address,
        ethers.utils.parseEther('0')
      );
      const res = await comEth.proposalById(1);
      expect(res.statusVote).to.equal(1);
    });
    it('should return proposal[id].statusVote is Approved', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
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
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
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
  describe('quitComEth', function () {
    it('should set user.exists as false', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).quitComEth();
      const tx = await comEth.getUser(bob.address);
      expect(tx.exists).to.equal(false);
    });
    // pb: withdraw marche pas
    it('should emphasize if user isBanned', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await ethers.provider.send('evm_increaseTime', [5259600]);
      await ethers.provider.send('evm_mine');
      const tx = await comEth.getInvestmentBalance(comEth.address);
      await comEth.connect(bob).quitComEth();
      expect(await comEth.getInvestmentBalance(comEth.address)).to.equal(tx);
    });
  });
  describe('toggleIsBanned', function () {
    it('should set isBanned as true', async function () {
      await comEth.connect(bob).addUser();
      await comEth.addUser();
      await comEth.toggleIsBanned(bob.address);
      const tx = await comEth.getUser(bob.address);
      expect(tx.isBanned).to.equal(true);
    });
    // test marche mais il faut mettre require user.exists à toggleIsBanned sinon pas de sens
    it('should set isBanned as false', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await ethers.provider.send('evm_increaseTime', [7259600]);
      await ethers.provider.send('evm_mine');
      await comEth.connect(bob).quitComEth();
      await comEth.addUser();
      await comEth.toggleIsBanned(bob.address);
      const tx = await comEth.getUser(bob.address);
      expect(tx.isBanned).to.equal(false);
    });
  });
  describe('getters', function () {
    it('should return _users[userAddress_] through getUser', async function () {
      await comEth.connect(bob).addUser();
      const tx = await comEth.getUser(bob.address);
      expect(tx.toString()).to.equal(`${bob.address},${false},${false},${true},${true},${1}`);
    });
    it('should return investmentBalance of this.address', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(eve).addUser();
      await comEth.connect(eve).pay({ value: ethers.utils.parseEther('0.4') });
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.2') });
      expect(await comEth.getInvestmentBalance(comEth.address)).to.equal(ethers.utils.parseEther('0.3'));
    });
    // pb calcul amountToBePaid
    it('should return investmentBalance of bob', async function () {
      const cycleStart = await comEth.getCycle();
      console.log('initial cycle', cycleStart.toString());
      
      
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      
      await ethers.provider.send('evm_increaseTime', [2600000]);
      await ethers.provider.send('evm_mine');
      
      
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.4') });
      const cycle = await comEth.getCycle();
      const subscription = await comEth.getUser(bob.address);
      const balance = await comEth.getInvestmentBalance(bob.address);
      console.log(
        'unpaidSubscriptions',
        subscription.unpaidSubscriptions.toString(),
        'cycle after pay',
        cycle.toString(),
        'nb cycle',
        (Number(cycle.toString()) - Number(cycleStart.toString)) % 2419200,
        'bob balance',
        balance.toString()
      );
      
      
   
      await ethers.provider.send('evm_increaseTime', [2600000]);
      await ethers.provider.send('evm_mine');
   


      //await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.2') });

    
      expect(await comEth.getInvestmentBalance(bob.address)).to.equal(ethers.utils.parseEther('0.3'));
    });
    it('should return the balance of the contract', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      expect(await comEth.getBalance()).to.equal(ethers.utils.parseEther('0.2'));
    });
    it('should return the timestamp of current cycle start', async function () {
      await comEth.addUser();
      await ethers.provider.send('evm_increaseTime', [2505600]);
      await ethers.provider.send('evm_mine');
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      const tx = await comEth.getCreationTime();
      const nb = Number(tx) + 2419200;
      expect(await comEth.getCycle()).to.equal(`${nb}`);
    });
    it('should return the price of the subscription', async function () {
      expect(await comEth.getSubscriptionPrice()).to.equal(ethers.utils.parseEther('0.1'));
    });
    it('should return the number of unpaidSubscriptions', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await ethers.provider.send('evm_increaseTime', [5443200]);
      await ethers.provider.send('evm_mine');
      await comEth.quitComEth();
      expect(await comEth.getUnpaidSubscriptions(alice.address)).to.equal(2);
    });
    it('should return the right amount to be paid', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await ethers.provider.send('evm_increaseTime', [5443200]);
      await ethers.provider.send('evm_mine');
      await comEth.quitComEth();
      expect(await comEth.getAmountToBePaid(alice.address)).to.equal(ethers.utils.parseEther('0.2'));
    });
    // getWithdrawalAmount marche pas ???
    it('should return the amount you would withdraw by quitting comEth', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await ethers.provider.send('evm_increaseTime', [5443200]);
      await ethers.provider.send('evm_mine');
      await comEth.pay({ value: ethers.utils.parseEther('0.2') });
      expect(await comEth.getWithdrawalAmount()).to.equal(ethers.utils.parseEther('0.3'));
    });
    it('should return the right number of active users', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.toggleIsBanned(eve.address);
      await comEth.toggleIsActive();
      expect(await comEth.getActiveUsersNb()).to.equal(1);
    });
  });
});
