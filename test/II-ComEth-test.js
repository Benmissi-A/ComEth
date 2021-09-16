/* eslint-disable comma-dangle */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

const { expect } = require('chai');

describe('ComEth', function () {
  // la liste des signers qui seront utilisés dans les tests
  let ComEth, comEth, alice, bob, eve;
  // tarif des cotisations fixes determiné au lancement de ComEth
  const subscriptionPrice = ethers.utils.parseEther('0.1');

  this.beforeEach(async function () {
    // avant chaque test on deploie comet avec alice comme utilisateur par defaut
    [dev, alice, bob, eve] = await ethers.getSigners();
    ComEth = await ethers.getContractFactory('ComEth');
    comEth = await ComEth.connect(alice).deploy(subscriptionPrice);
    await comEth.deployed();
  });
  // on teste les différents modifiers à l'aide des fonctions de notre contrat
  // on teste l'exactitude des paramètres de User
  describe('Modifiers and parameters of User', function () {
    // on teste la variale hasPaid de user afin que le modifier hasPaid marche
    // après enregistrement et paiement de l'utilisateur, hasPaid is true
    it('should return hasPaid is true', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ from: bob.address, value: ethers.utils.parseEther('0.2') });
      const tx = await comEth.connect(bob).getUser(bob.address);
      expect(tx.hasPaid).to.equal(true);
    });
    // après enregistrement, si utilisateur ne paie pas, hasPaid is false
    it('should return hasPaid is false', async function () {
      await comEth.connect(eve).addUser();
      const tx = await comEth.getUser(eve.address);
      expect(tx.hasPaid).to.equal(false);
    });
    // après simple enregistrement isBanned doit être false
    it('should return isBanned is false', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ from: bob.address, value: ethers.utils.parseEther('0.1') });
      const tx = await comEth.getUser(bob.address);
      expect(tx.isBanned).to.equal(false);
    });
    // si user n'a pas payé 2 souscriptions ou plus, isBanned est true donc submitProposal va revert
    it('should revert if hasPaid is false', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await ethers.provider.send('evm_increaseTime', [3024000]);
      await ethers.provider.send('evm_mine');
      await expect(
        comEth.connect(bob).submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.01'))
      ).to.be.revertedWith('Cometh: user has not paid subscription');
    });
    // si user isActive is true, il devient false après activation du toggleIsActive
    it('should return isActive as false', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).toggleIsActive();
      const tx = await comEth.getUser(bob.address);
      expect(tx.isActive).to.equal(false);
    });
  });

  // on teste la fonction addUsers()
  describe('addUsers', function () {
    // elle doit émettre un event UserAdded avec address de user comme argument
    it('should emit UserAdded', async function () {
      await expect(comEth.connect(bob).addUser()).to.emit(comEth, 'UserAdded').withArgs(bob.address);
    });
    // elle doit revert si User existe déjà
    it('should revert because user already exists', async function () {
      await comEth.connect(bob).addUser();
      await expect(comEth.connect(bob).addUser()).to.be.revertedWith('ComEth: already an user');
    });
    // addUser() doit initialiser User avec les paramètres par défaut
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
  });

  // on teste la fonction pay()
  describe('Pay', function () {
    // elle return hasPaid is true si à jour dans les paiements
    it('should return hasPaid as true when user has paid', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      const tx = await comEth.getUser(alice.address);
      expect(tx.hasPaid).to.equal(true);
    });
    // elle incrémente la balance de user
    it('should return the right investmentBalance when user has paid', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      expect(await comEth.getInvestmentBalance(alice.address)).to.equal(subscriptionPrice);
    });
    // elle revert si déjà à jour dans les paiements
    it('should revert if already paid', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await expect(comEth.pay({ value: ethers.utils.parseEther('0.1') })).to.be.revertedWith(
        'ComEth: You have already paid your subscription for this month.'
      );
    });
    // le paiement est effectué si user plus à jour dans les paiements
    it('should accept new payment after a cycle ends', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await ethers.provider.send('evm_increaseTime', [2633400]);
      await ethers.provider.send('evm_mine');
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      expect(await comEth.getInvestmentBalance(alice.address)).to.equal(ethers.utils.parseEther('0.2'));
    });
    /* si msg.value trop élevé, on 'rembourse' le trop perçu, et on
    incrémente la balance du montant nécessaire uniquement */
    it('should transfer back exceeding weis', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.6') });
      expect(await comEth.getInvestmentBalance(bob.address)).to.equal(ethers.utils.parseEther('0.1'));
    });
    // un paiement effectué doit émettre un event 'Deposited' avec les arguments address et amount
    it('should emit Deposited', async function () {
      await comEth.addUser();
      await expect(comEth.pay({ value: ethers.utils.parseEther('0.1') }))
        .to.emit(comEth, 'Deposited')
        .withArgs(alice.address, ethers.utils.parseEther('0.1'));
    });
    // un user ne peut pas payer s'il n'est pas utilisateur enregistré de ComEth
    it('should revert if user does not exist', async function () {
      await expect(comEth.connect(bob).pay()).to.be.revertedWith('ComEth: User is not part of the ComEth');
    });
    // on ne peut pas payer quand on a pris le statut inactif, on est en sommeil, on doit se réactiver pour participer
    it('should revert if user is not active', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).toggleIsActive();
      await expect(comEth.connect(bob).pay()).to.be.revertedWith('Cometh: user is not active');
    });
    // si msg.value pas suffisant pour mettre à jour ses souscriptions, revert
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

  // on teste les balances de notre contrat
  describe('testing balances', function () {
    // les montants des paiements arrivent dans la balance des ethers stockés dans le contrat
    it('should return balance of contract', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      expect(await comEth.getBalance()).to.equal(ethers.utils.parseEther('0.2'));
    });
    // les montants des paiements doit être incrémenté dans notre balance de ComEth
    it('should return investmentBalance[comEth.address] ', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      expect(await comEth.getInvestmentBalance(comEth.address)).to.equal(ethers.utils.parseEther('0.2'));
    });
    // le montant du paiement d'un user doit incrémenter sa propre balance
    it('should return investmentBalance of user', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      expect(await comEth.getInvestmentBalance(alice.address)).to.equal(ethers.utils.parseEther('0.1'));
    });
    // la balanceOf du contrat doit être décrémentée si un user quitte ComEth avec un withdraw
    it('should decrement balance after quitting contract', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).quitComEth();
      expect(await comEth.getBalance()).to.equal(ethers.utils.parseEther('0.1'));
    });
  });

  // Tests de la fonction submitProposal
  describe('Submit Proposal', function () {
    /* submitProposal: il faut d'abord rejoindre ComEth, avoir payé sa souscription,
       ne pas être inactif et ne pas être banni */
    // submitProposal émet l'event 'ProposalCreated'
    it('should emit ProposalCreated', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await expect(
        comEth.connect(bob).submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.01'))
      )
        .to.emit(comEth, 'ProposalCreated')
        .withArgs(1, 'quel est votre choix ?');
    });
    // si un user est inactif, il n'a pas le droit d'utiliser submitProposal()
    it('should revert if isActive is false', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).toggleIsActive();
      await expect(
        comEth.connect(bob).submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.01'))
      ).to.be.revertedWith('Cometh: user is not active');
    });
    // si un user n'a pas payé pour le mois courant, il n'a pas le droit d'utiliser submitProposal()
    it('should revert if hasPaid is false', async function () {
      await comEth.connect(eve).addUser();
      await comEth.connect(eve).pay({ value: ethers.utils.parseEther('0.1') });
      // on laisse passé assez de temps pour créer un impayé:
      await ethers.provider.send('evm_increaseTime', [3024000]);
      await ethers.provider.send('evm_mine');
      await expect(
        comEth
          .connect(eve)
          .submitProposal('quel est votre choix ?', 900, alice.address, ethers.utils.parseEther('0.01'))
      ).to.be.revertedWith('Cometh: user has not paid subscription');
    });
  });

  // Tests de la fonction Vote
  describe('Vote', function () {
    /* Pour pouvoir utiliser la fonction vote() il faut avoir rejoint une communauté,
       avoir payé sa souscription, ne pas être inactif, ni banni */
    // la fonction vote émet l'event 'Voted' avec 3 arguments: userAddress, proposalId, proposalString
    it('should emit Voted', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal('quel est votre choix ?', 900, bob.address, ethers.utils.parseEther('0.01'));
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await expect(comEth.connect(bob).vote(1, 1))
        .to.emit(comEth, 'Voted')
        .withArgs(bob.address, 1, 'quel est votre choix ?');
    });
    // On n'a pas le droit de voter deux fois: revert
    it('should revert if already voted', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth
        .connect(bob)
        .submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0'));
      await comEth.connect(bob).vote(1, 1);
      await expect(comEth.connect(bob).vote(1, 1)).to.be.revertedWith('ComEth: Already voted');
    });
    // seulement les users actifs ont le droit de voter, revert si inactif
    it('should revert if isActive is false', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(bob).toggleIsActive();
      await expect(comEth.connect(bob).vote(1, 1)).to.be.revertedWith('Cometh: user is not active');
    });
    // Si l'utilisateur n'existe pas, revert.
    // Utile si user quitte ComEth car alors user.exists == false
    it('should revert if user does not exist', async function () {
      await expect(comEth.vote(1, 1)).to.be.revertedWith('ComEth: User is not part of the ComEth');
    });
    // si user n'a pas payé le mois courant il ne peut pas voter
    it('should revert if user has not paid', async function () {
      await comEth.connect(eve).addUser();
      await comEth.connect(eve).pay({ value: ethers.utils.parseEther('0.1') });
      // on laisse passer assez de temps pour créér un impayé:
      await ethers.provider.send('evm_increaseTime', [3024000]);
      await ethers.provider.send('evm_mine');
      await expect(comEth.connect(eve).vote(1, 1)).to.be.revertedWith('Cometh: user has not paid subscription');
    });
    /* StatusVote.Running == 0
       StatusVote.Approved == 1
       StatusVote.Rejected == 2
    */
    // si majorité vote non, la proposition sera rejetée
    it('should set vote status if time has run out', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0'));
      await comEth.vote(1, 1);
      await ethers.provider.send('evm_increaseTime', [1000]);
      await ethers.provider.send('evm_mine');
      await comEth.connect(bob).vote(1, 1);
      const tx = await comEth.proposalById(1);
      expect(tx.statusVote).to.equal(2);
    });
  });

  // Tests du getteur proposalById
  describe('proposalsByID', function () {
    /* On consulte la Struct Proposal d'un id donné grâce à un mapping
       puis on appelle la variable souhaitée */
    // variable proposition de proposal va retourner la string de description
    it('should return proposal[id].proposition', async function () {
      await comEth.addUser();
      await comEth.connect(alice).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.01'));
      const res = await comEth.proposalById(1);
      expect(res.proposition).to.equal('quel est votre choix ?');
    });
    // de même: nbYes va retourner le nombre de votes 'oui' enregistrés pour un proposal donné
    it('should return proposal[id].nbYes', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.0'));
      await comEth.connect(bob).vote(1, 1);
      await comEth.vote(1, 1);
      const res = await comEth.proposalById(1);
      expect(res.nbYes).to.equal(2);
    });
    // de même: nbNo va retourner le nombre de votes 'no' enregistrés pour un proposal donné
    it('should return proposal[id].nbNo', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.0'));
      await comEth.connect(bob).vote(1, 0);
      await comEth.vote(1, 1);
      const res = await comEth.proposalById(1);
      expect(res.nbNo).to.equal(1);
    });
    // de même: author va retourner le créateur du proposal donné
    it('should return proposal[id].author', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.0'));
      const res = await comEth.proposalById(1);
      expect(res.author).to.equal(alice.address);
    });
    /* de même: paiementReceiver va retourner l'address du destinataire de la transaction prévue
       pour un proposal donné s'il est adopté
    */
    it('should return proposal[id].paiementReceiver', async function () {
      await comEth.addUser();
      await comEth.connect(eve).addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0.0'));
      const res = await comEth.proposalById(1);
      expect(res.paiementReceiver).to.equal(eve.address);
    });
    /* de même: paiementAmount va retourner l'amount de la transaction prévue
       pour un proposal donné s'il est adopté
    */
    it('should return proposal[id].paiementAmount', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0'));
      const res = await comEth.proposalById(1);
      expect(res.paiementAmount).to.equal(0);
    });
    // Status.Vote == 0 soit "Running" si la proposition est toujours en cours
    it('should return proposal[id].statusVote is Running', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0'));
      const res = await comEth.proposalById(1);
      expect(res.statusVote).to.equal(0);
    });
    // Status.Vote == 1 soit "Approved" si la proposition a été adoptée
    it('should return proposal[id].statusVote is Approved', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0'));
      await comEth.connect(bob).vote(1, 1);
      await comEth.vote(1, 1);
      const res = await comEth.proposalById(1);
      expect(res.statusVote).to.equal(1);
    });
    // Status.Vote == 2 soit "Rejected" si la proposition a été refusée
    it('should return proposal[id].statusVote is Rejected', async function () {
      await comEth.addUser();
      await comEth.connect(bob).addUser();
      await comEth.connect(eve).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.submitProposal('quel est votre choix ?', 900, eve.address, ethers.utils.parseEther('0'));
      await ethers.provider.send('evm_increaseTime', [1000]);
      await ethers.provider.send('evm_mine');
      await comEth.connect(alice).vote(1, 1);
      const res = await comEth.proposalById(1);
      expect(res.statusVote).to.equal(2);
    });
  });
  // Tests de la fonction quitComEth: pour sortir de ComEth
  describe('quitComEth', function () {
    // quand user utilise quitComEth alors variable exists == false
    it('should set user.exists as false', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).quitComEth();
      const tx = await comEth.getUser(bob.address);
      expect(tx.exists).to.equal(false);
    });
    /* quand user es 'banned' le withdraw ne sera pas triggered
       sa balance sera set à 0 mais la balance de ComEth reste la même
       il perd ses fonds */
    it('should not proceed payment to bob if bob isBanned', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await ethers.provider.send('evm_increaseTime', [5259600]);
      await ethers.provider.send('evm_mine');
      const tx = await comEth.getInvestmentBalance(comEth.address);
      await comEth.connect(bob).quitComEth();
      expect(await comEth.getInvestmentBalance(comEth.address)).to.equal(tx);
    });
  });

  // Tests des getteurs
  describe('getters', function () {
    // getUser retourne le Struct d'un User donné avec ses différentes variables
    it('should return _users[userAddress_] through getUser', async function () {
      await comEth.connect(bob).addUser();
      const tx = await comEth.getUser(bob.address);
      expect(tx.toString()).to.equal(`${bob.address},${false},${false},${true},${true},${1}`);
    });
    /* investmentBalance retourne la somme de tous les paiements reçus depuis le début
       moins les sommes retirées avec les quitComEth, c'est l'investissement
       total du ComEth */
    it('should return investmentBalance of this.address', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.connect(eve).addUser();
      await comEth.connect(eve).pay({ value: ethers.utils.parseEther('0.4') });
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.2') });
      expect(await comEth.getInvestmentBalance(comEth.address)).to.equal(ethers.utils.parseEther('0.3'));
    });
    /* c'est la somme des paiements de bob depuis le début
       + la fonction rembourse le trop perçu quand cela s'applique */
    it('should return investmentBalance of bob', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await ethers.provider.send('evm_increaseTime', [2729743]);
      await ethers.provider.send('evm_mine');
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.4') });
      await ethers.provider.send('evm_increaseTime', [2729743]);
      await ethers.provider.send('evm_mine');
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.2') });
      expect(await comEth.getInvestmentBalance(bob.address)).to.equal(ethers.utils.parseEther('0.3'));
    });
    // getBalance retourne la balance totale de l'address du contrat
    it('should return the balance of the contract', async function () {
      await comEth.connect(bob).addUser();
      await comEth.connect(bob).pay({ value: ethers.utils.parseEther('0.1') });
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      expect(await comEth.getBalance()).to.equal(ethers.utils.parseEther('0.2'));
    });
    // retourne le createdAt du cycle de souscription en cours: fonctionne comme un id
    it('should return the timestamp of current cycle start', async function () {
      await comEth.addUser();
      await ethers.provider.send('evm_increaseTime', [2505600]);
      await ethers.provider.send('evm_mine');
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      const tx = await comEth.getCreationTime();
      const nb = Number(tx) + 2419200;
      expect(await comEth.getCycle()).to.equal(`${nb}`);
    });
    // retourne le montant de la souscription
    it('should return the price of the subscription', async function () {
      expect(await comEth.getSubscriptionPrice()).to.equal(ethers.utils.parseEther('0.1'));
    });
    /* si on ne paie pas pendant suffisemment longtemps, on occasionne des impayés
       on utilise le quitComEth pour trigger le calcul des impayés via le modifier
       checkSubscription */
    it('should return the number of unpaidSubscriptions', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await ethers.provider.send('evm_increaseTime', [5443200]);
      await ethers.provider.send('evm_mine');
      await comEth.quitComEth();
      expect(await comEth.getUnpaidSubscriptions(alice.address)).to.equal(2);
    });
    // à partir des impayés, on évalue le montant à payer pour régulariser sa situation
    it('should return the right amount to be paid', async function () {
      await comEth.addUser();
      await comEth.pay({ value: ethers.utils.parseEther('0.1') });
      await ethers.provider.send('evm_increaseTime', [5443200]);
      await ethers.provider.send('evm_mine');
      await comEth.quitComEth();
      expect(await comEth.getAmountToBePaid(alice.address)).to.equal(ethers.utils.parseEther('0.2'));
    });
    // on détermine à quel montant on est éligible si l'on quitte ComEth
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
  });
});
