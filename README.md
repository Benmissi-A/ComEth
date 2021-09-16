# ComEth Dapp BackEnd

[![made-with-Solidity](https://img.shields.io/badge/Made%20with-Solidity-1f425f.svg)](https://docs.soliditylang.org/en/v0.8.7/) [![made-with-Javascript](https://img.shields.io/badge/Made%20with-Javascript-1f425f.svg)](https://developer.mozilla.org/fr/docs/Web/JavaScript)

[![built-with openzeppelin](https://img.shields.io/badge/built%20with-OpenZeppelin-3677FF)](https://docs.openzeppelin.com/)
[![built-with EthersJs](https://img.shields.io/badge/built%20with-EthersJs-3677FF)](https://docs.ethers.io/v5/)

## Description

- Used Testnet : Rinkeby

### **ComEth**

This repository contains a Hardhat project for our **DAO-like ComEth DApp using the Ethereum Blockchain**. There will be a "ComEth Factory" allowing a user to create a personalized ComEth project. Each ComEth gathers users together and offers them the tools to manage their common pot through the payment of a monthly subscription and a voting system, all in an entirely decentralized structure.

## Architecture version 0.1

![back-architecture](./back-architecture.png)

## _Built by "Equipe Epique" for its certification project at Alyra, the Blockchain School_ !

### Developers : Amine Benmissi, Guillaume Bézie, Sarah Marques, Stella Soler

[![created-by Benmissi-A](https://img.shields.io/badge/created%20by-Benmissi-FFA07A)](https://github.com/Benmissi-A)
[![created-by LokieDieKatze](https://img.shields.io/badge/created%20by-GuillaumeB75-FFA07A)](https://github.com/GuillaumeB75)
[![created-by LokieDieKatze](https://img.shields.io/badge/created%20by-LokiDieKatze-FFA07A)](https://github.com/LokiDieKatze)
[![created-by StellaGreen](https://img.shields.io/badge/created%20by-StellaGreen-FFA07A)](https://github.com/StellaGreen)

---

### Test librairies :

- Ethers Js
- Chai

### Install the Repository :

To use this project you need to "fork" this repository :

- ComEth :

On your Git Bash, choose the location then:

```zsh
git clone https://github.com/Benmissi-A/ComEth
yarn
```

### You need to add to your environment a .env file :

Add your Infura project ID and your account private key this way:

```
INFURA_PROJECT_ID="<your_infura_projet_id>"
DEPLOYER_PRIVATE_KEY="<your_account_private_key>"
```

## Smart Contracts

### **_ComEthFactory.sol_**

This contract is a **factory** that allows any user to **create a ComEth community** and choose the price of the **subscription** (the subscription time lasts 4 weeks). An event "ComEthCreated" is then emitted. The creator of the contract can share the address of this new ComEth so that other users can join it and **start making proposals about how to manage the Ethers of the common pot**.

### **ComEth.sol**

The subscription time begins when the ComEth is deployed and created and its price has been determined by the creator. The user of the dApp will have to connect to its **Metamask** wallet in order to use the functions.

- **addUsers()**

The first step would be to **join the ComEth** through the function addUser(). The user is directly considered as an active user but it must **pay the subscription** before being able to **participate in decision making activities**.
An event "UserAdded" is emitted with its address as parameter.

- **pay()**

After joining the ComEth the user has the possibility to pay its first subscription so he can start participating.
The **payment is due every 4 weeks**. If it misses the deadline once it gets 1 unpaidSubscription, if it misses twice it gets 2, etc. Note: after 2 unpaidSubscription, the user receives the status "banned", also implying counting as an inactive user, than prevents from submitting proposals, voting and getting Ether back when quitting ComEth. Using the pay() function, the **due amount of ether is automatically calculated** and the user can go back to normal and participate again it the decision making.
A "Deposited" event is emitted, saving its address and the paid amount of Ether.

- **submitProposal()**

The user can submit to the community **a proposal for an Ether transaction**. To do so, the user must not have the status "inactive" and must be up-to-date regarding his subscription.
To submit a proposal the user enters as parameters a short description, a period of time (for the votes), the address of the recipient for the transaction of Ether, as well as the amount of Ether to be transferred.
An "Proposalcreated" event is emitted with the unique id of the proposal just created and its description as arguments.

- **vote()**

The user would use the id of a proposal to check its details and **vote for or against** it.
It must be "active" and have no unpaidSubscription to be ale to vote.
After the time to vote has run out, the proposal will be adopted by **absolute majority**, meaning that strictly more than 50% of the active users must have voted for the proposal, otherwise it will be rejected.
The calculation of the votes numbers is processed in the vote() function. This way, if a majority is reached before the end of the time period, **the vote will be directly approved or rejected**.
Next, the **corresponding transaction is automatically launched if and only if the proposal has been approved**.
At the end of the voting process, an event "Voted" is emitted, registering the voter's address, the id of the proposal and its description.

- **toggleIsActive()**

This function allows an user to **"take a break"**. It means it will not have to pay the subscription until the reverses the action. This is one of the cases where an user is said "inactive", it will not count by the calculation of the majority.

- **quitComEth()**

It is possible to **quit the ComEth at anytime** and get back an amount of Ether determined on the basis of your fair share of the common pot: it calculates the percentage of your investment towards the contract and gives back that **percentage of the current balance of the common pot**.
If an user has the status "banned" it can still quit the ComEth but won't be allowed to withdraw its share. This can be fixed by paying the accumulated unpaid subscriptions first.

## Licence

MIT License

Copyright (c) 2021 Dapp_ComEth

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
