//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ComEth is AccessControl {
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
        uint256 unpaidSubscriptions;
    }

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
    uint256 private _subscriptionPrice ;
    uint256 private _subscriptionTimeCycle;
    bool private _isActive;
    bool private _hasPaid;
    User[] private _usersList;
    string private _stringVote;
    Proposal[] private _proposalsList;
    Counters.Counter private _id;
    uint256 private _cycleStart;

    mapping(address => uint256) private _investMentBalances;
    mapping(address => User) private _users;
    mapping(uint256 => Proposal) private _proposals;
    mapping(address => mapping(uint256 => bool)) private _hasVoted;
    mapping(uint256 => uint256) private _timeLimits;
    mapping(uint256 => uint256) private _nbVotes;

    event Deposited(address indexed sender, uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);
    event ProposalCreated(Proposal proposal);
    event Voted(address indexed voter, uint256 proposalId, string proposalDescription);
    event Spent(address paymentReceiver, uint256 amount, uint256 proposalId);
    event UserAdded(address indexed newUser, uint256 timestamp);
    event IsBanned(address user, uint256 timestamp, bool status);

    modifier hasPaid {
        require(_users[msg.sender].hasPaid = true , "Cometh: user has not paid subscription");
        _;
    }
    modifier isNotBanned {
        require(_users[msg.sender].isBanned = false , "Cometh: user is banned");
        _;
    }
    modifier isActive {
        require(_users[msg.sender].isActive = true , "Cometh: user is not active");
        _;
    }
    
    constructor(address comEthOwner_,uint256 subscriptionPrice_) {
        _comEthOwner = comEthOwner_;
        _subscriptionPrice = subscriptionPrice_;
        _subscriptionTimeCycle = 4 weeks;
        _cycleStart = block.timestamp;
    }

    receive() external payable {
        _deposit();
    }

    function submitProposal(
        string[] memory voteOptions_,
        string memory proposition_,
        uint256 timeLimit_,
        address paiementReceiver_,
        uint256 paiementAmount_
    ) public isActive isNotBanned hasPaid returns (uint256) {
        _handleCycle();
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
        emit ProposalCreated(_proposals[id]);
        return id;
    }

    function proposalById(uint256 id_) public view returns (Proposal memory) {
        return _proposals[id_];
    }

    function getProposalsList() public view returns (Proposal[] memory) {
        return _proposalsList;
    }

    function vote(uint256 id_, uint256 userChoice_) public isNotBanned hasPaid isActive {
        require(_hasVoted[msg.sender][id_] == false, "ComEth: Already voted");
        require(_proposals[id_].statusVote == StatusVote.Running, "ComEth: Not a running proposal");

        _handleCycle();
        if (block.timestamp > _proposals[id_].createdAt + _timeLimits[id_]) {
            if (_proposals[id_].voteCount[userChoice_] > (_usersList.length / 2)) {
                _proposals[id_].statusVote = StatusVote.Approved;
                _proceedPayment(id_);
            } else {
                _proposals[id_].statusVote = StatusVote.Rejected;
            }
        } else {
            _hasVoted[msg.sender][id_] = true;
            _proposals[id_].voteCount[userChoice_] += 1;
            if (_proposals[id_].voteCount[userChoice_] > _usersList.length / 2) {
                _proposals[id_].statusVote = StatusVote.Approved;
                _proceedPayment(id_);
            }
        }
        emit Voted(msg.sender, id_, _proposals[id_].proposition);
    }

    function _proceedPayment(uint256 id_) private {
        payable(_proposals[id_].paiementReceiver).sendValue(_proposals[id_].paiementAmount);
        emit Spent(_proposals[id_].paiementReceiver, _proposals[id_].paiementAmount, id_);
    }

    function toggleIsActive() public returns (bool) {
        if (_users[msg.sender].isActive = false) {
            _users[msg.sender].isActive = true;
        } else {
            _users[msg.sender].isActive = false;
        }
        return _users[msg.sender].isActive;
    }

    function addUser(address userAddress_) public {
        require(msg.sender == _comEthOwner, "ComEth: You are not allowed to add users.");
        _users[userAddress_] = User({userAddress: userAddress_, isBanned: false, hasPaid: false, isActive: true, unpaidSubscriptions: 1});
        _usersList.push(_users[userAddress_]);
        emit UserAdded(userAddress_, block.timestamp);
    }

    function _deposit() private {
        _investMentBalances[address(this)] += _subscriptionPrice * _users[msg.sender].unpaidSubscriptions;
        _investMentBalances[msg.sender] += _subscriptionPrice * _users[msg.sender].unpaidSubscriptions;
        if(_users[msg.sender].isBanned) {
            _users[msg.sender].isBanned = false;
            _users[msg.sender].unpaidSubscriptions = 1;
        }
        _users[msg.sender].hasPaid = true;
        emit Deposited(msg.sender, _subscriptionPrice * _users[msg.sender].unpaidSubscriptions);
    }

    function _withdraw() private {
        uint256 amount = (_investMentBalances[msg.sender]/_investMentBalances[address(this)])*address(this).balance;
        payable(msg.sender).sendValue(amount);
        emit Withdrawn(msg.sender, amount);
    }

    function pay() external payable {
        require(_users[msg.sender].hasPaid = false, "ComEth: You have already paid your subscription for this month.");
        _deposit();
    }

    function quitComEth() public {
        if(!_users[msg.sender].isBanned) {
            _withdraw();
        }
        
    }

    function _handleCycle() private {
        if(block.timestamp > _cycleStart + _subscriptionTimeCycle) {
            _cycleStart = _cycleStart + _subscriptionTimeCycle;
            for(uint256 i=0; i < _usersList.length; i++) {
                if((_users[_usersList[i].userAddress].hasPaid = false) && (_users[_usersList[i].userAddress].isActive = true)) {
                    _users[_usersList[i].userAddress].isBanned = true;
                    _users[_usersList[i].userAddress].unpaidSubscriptions += 1;
                }
                _users[_usersList[i].userAddress].hasPaid = false;
            }
        }
    }

    function _toggleIsBanned(address userAddress_) private returns (bool) {
        if (_users[userAddress_].isBanned = false) {
            _users[userAddress_].isBanned = true;
        } else {
            _users[userAddress_].isBanned = false;
        }
        emit IsBanned(userAddress_, block.timestamp, _users[userAddress_].isBanned);
        return _users[userAddress_].isBanned;
    }

    function getIsBanned(address userAddress_) public view returns (bool) {
        return _users[userAddress_].isBanned;
    }

    function getInvestmentBalance(address userAddress_) public view returns (uint256) {
        return _investMentBalances[userAddress_];
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    /*  
        - Créer rôles
        - Voter rôles / élections
        - Etoffer les options de vote (bannir, ...)
        - Gérer cotisations : cycles?
        - Gérer transactions en token
        - Getteurs
        - Ajouter modifiers
        - Sortie d'un user de la DAO + remboursement eventuel
        - fermeture de comEth + répartition du pot commun restant 
     */
}
