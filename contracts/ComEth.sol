//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ComEth {
    using Address for address payable;
    using Counters for Counters.Counter;

    enum StatusVote {
        Inactive,
        Running,
        Approved,
        Rejected
    }

    struct User {
        address userAddress;
        bool isBanned;
        bool hasPaid;
        bool isActive;
    }
    // Proposal correct
    struct Proposal {
        string[] voteOptions;
        uint256[] voteCount;
        StatusVote statusVote;
        uint256 createdAt;
        address author;
        string proposition;
        address paiementReceiver;
        uint256 paiementAmount;
    }

    address private _comEthOwner;
    bool private _isActive;
    bool private _hasPaid;

    User[] private _usersList;

    uint256 private _balance;
    string private _stringVote;
    Proposal[] private _proposalsList;
    Counters.Counter private _id;

    mapping(address => uint256) private _balances;
    mapping(address => User) private _users;
    mapping(uint256 => Proposal) private _proposals;
    mapping(address => mapping(uint256 => bool)) private _hasVoted;
    mapping(uint256 => uint256) private _timeLimits;
    mapping(uint256 => uint256) private _nbVotes;

    constructor(address comEthOwner_) {
        _comEthOwner = comEthOwner_;
    }

    //pot commun
    receive() external payable {
        _deposit(msg.sender, msg.value);
    }

    //votes
    function submitProposal(
        string[] memory voteOptions_,
        string memory proposition_,
        uint256 timeLimit_,
        address paiementReceiver_,
        uint256 paiementAmount_
    ) public returns (uint256) {
        _id.increment();
        uint256 id = _id.current();

        _proposals[id] = Proposal({
            voteOptions: voteOptions_,
            voteCount: new uint256[](voteOptions_.length),
            statusVote: StatusVote.Running,
            createdAt: block.timestamp,
            author: msg.sender,
            proposition: proposition_,
            paiementReceiver: paiementReceiver_,
            paiementAmount: paiementAmount_
        });
        _timeLimits[id] = timeLimit_;
        _proposalsList.push(_proposals[id]);
        return id;
    }

    function proposalById(uint256 id_) public view returns (Proposal memory) {
        return _proposals[id_];
    }

    function getProposalsList() public view returns (Proposal[] memory) {
        return _proposalsList;
    }

    function vote(uint256 id_, uint256 userChoice_) public {
        require(_hasVoted[msg.sender][id_] == false, "ComEth: Already voted");
        require(_proposals[id_].statusVote == StatusVote.Running, "ComEth: Not a running proposal");

        if (block.timestamp > _proposals[id_].createdAt + _timeLimits[id_]) {
            if (_proposals[id_].voteCount[userChoice_] > _usersList.length / 2) {
                _proposals[id_].statusVote = StatusVote.Approved;
                _proceedPaiement(id_);
            } else {
                _proposals[id_].statusVote = StatusVote.Rejected;
            }
        } else {
            _hasVoted[msg.sender][id_] = true;
            _proposals[id_].voteCount[userChoice_] += 1;
            if (_proposals[id_].voteCount[userChoice_] > _usersList.length / 2) {
                _proposals[id_].statusVote = StatusVote.Approved;
                _proceedPaiement(id_);
            }
        }
    }

    //paiement
    function _proceedPaiement(uint256 id_) private {
        payable(_proposals[id_].paiementReceiver).sendValue(_proposals[id_].paiementAmount);
    }

    //gestion des membres/rôles
    function _toggleIsActive(address userAddress) private returns (bool) {
        if (_users[userAddress].isActive = false) {
            _users[userAddress].isActive = true;
        } else {
            _users[userAddress].isActive = false;
        }
        return _users[userAddress].isActive;
    }

    //ajouter utilisateur
    function addUser(address userAddress_) public {
        _users[userAddress_] = User({userAddress: userAddress_, isBanned: false, hasPaid: false, isActive: true});
        _usersList.push(_users[userAddress_]);
    }

    //callback

    function _deposit(address sender, uint256 amount) private {
        _balances[address(this)] += amount;
        _balances[sender] += amount;
    }

    function pay(uint256 amount_) external payable {
        _deposit(msg.sender, amount_);
    }

    //prison
    function toggleIsBanned(address userAddress_) public returns (bool) {
        if (_users[userAddress_].isBanned = false) {
            _users[userAddress_].isBanned = true;
        } else {
            _users[userAddress_].isBanned = false;
        }
        return _users[userAddress_].isBanned;
    }

    function getIsBanned(address userAddress_) public view returns (bool) {
        return _users[userAddress_].isBanned;
    }

    function getBalance(address userAddress_) public view returns (uint256){
        return _balances[userAddress_];
    }       
 //fermeture de comEth
}
