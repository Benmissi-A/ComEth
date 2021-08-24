//SPDX-License-Identifier: Unlicensed
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
    //roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    User[] private _usersList;

    string private _stringVote;
    Proposal[] private _proposalsList;
    Counters.Counter private _id;

    mapping(address => uint256) private _investMentBalances;
    mapping(address => User) private _users;
    mapping(uint256 => Proposal) private _proposals;
    mapping(address => mapping(uint256 => bool)) private _hasVoted;
    mapping(uint256 => uint256) private _timeLimits;
    mapping(uint256 => uint256) private _nbVotes;

    event Deposited(address indexed sender, uint256 amount);
    event ProposalCreated(Proposal proposal);
    event Voted(address indexed voter, uint256 proposalId, string proposalDescription);
    event Spent(address paymentReceiver, uint256 amount, uint256 proposalId);
    event UserAdded(address indexed newUser, uint256 timestamp);
    event IsBanned(address user, uint256 timestamp, bool status);

    constructor(address comEthOwner_) {
        _comEthOwner = comEthOwner_;
        //_setupRole(ADMIN_ROLE, _comEthOwner);
    }

    receive() external payable {
        _deposit(msg.sender, msg.value);
    }

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
        emit ProposalCreated(_proposals[id]);
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

    // function _changeRole(bytes32 role_, address account_)  internal virtual {
    //     _revokeRole(role_, account_);
    //     _grantRole(role_, account_);
    //     //emit RoleChanged();
    // }

    function _toggleIsActive(address userAddress) private returns (bool) {
        if (_users[userAddress].isActive = false) {
            _users[userAddress].isActive = true;
        } else {
            _users[userAddress].isActive = false;
        }
        return _users[userAddress].isActive;
    }

    function addUser(address userAddress_) public {
        _users[userAddress_] = User({userAddress: userAddress_, isBanned: false, hasPaid: false, isActive: true});
        _usersList.push(_users[userAddress_]);
        emit UserAdded(userAddress_, block.timestamp);
    }

    function _deposit(address sender, uint256 amount) private {
        _investMentBalances[sender] += amount;
        emit Deposited(sender, amount);
    }

    function pay() external payable {
        uint256 amount = msg.value;
        _deposit(msg.sender, amount);
    }

    function toggleIsBanned(address userAddress_) public returns (bool) {
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
