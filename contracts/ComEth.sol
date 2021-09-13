//SPDX-License-Identifier: MIT
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
        bool exists;
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

    uint256 private _createdAt;
    address private _comEthOwner;
    uint256 private _subscriptionPrice;
    uint256 private _subscriptionTimeCycle;
    bool private _isActive;
    bool private _hasPaid;
    uint256 private _nbActiveUsers;
    string private _stringVote;
    Proposal[] private _proposalsList;
    Counters.Counter private _id;
    uint256 private _cycleStart;

    mapping(address => uint256) private _userTimeStamp;

    mapping(address => User) private _users;

    mapping(address => uint256) private _investmentBalances;

    mapping(uint256 => Proposal) private _proposals;
    mapping(address => mapping(uint256 => bool)) private _hasVoted;
    mapping(uint256 => uint256) private _timeLimits;
    mapping(uint256 => uint256) private _nbVotes;

    event Deposited(address indexed sender, uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);
    event ProposalCreated(uint256 id, string description);
    event Voted(address indexed voter, uint256 proposalId, string proposalDescription);
    event Spent(address paymentReceiver, uint256 amount, uint256 proposalId);
    event UserAdded(address indexed newUser);
    event IsBanned(address user, bool status);

    modifier isNotBanned() {
        require(_users[msg.sender].isBanned == false, "Cometh: user is banned");
        _;
    }

    modifier isActive() {
        require(_users[msg.sender].isActive == true, "Cometh: user is not active");
        _;
    }

    modifier hasPaid() {
        require(_users[msg.sender].hasPaid == true, "Cometh: user has not paid subscription");
        _;
    }

    modifier userExist() {
        require(_users[msg.sender].exists == true, "ComEth: User is not part of the ComEth");
        _;
    }

    modifier checkSubscription() {
        //on check le cycle
        if (block.timestamp > _cycleStart + _subscriptionTimeCycle) {
            uint256 newCycleStart = _cycleStart + ((block.timestamp - _cycleStart) / _subscriptionTimeCycle) * _subscriptionTimeCycle;
            _cycleStart = newCycleStart;
        }
        //_userTimeStamp[msg.sender] === 0 nouvel inscrit
        if (_userTimeStamp[msg.sender] != 0) {
            // pour les autres , onchecke s'ils ont payé ce mois
            if (_userTimeStamp[msg.sender] < _cycleStart) {
                // réinitialisation has paid a false pour prochain cycle
                _users[msg.sender].hasPaid = false;
                // réinitialisation du unpaidSubscription
                if (_users[msg.sender].isActive) {
                        _users[msg.sender].unpaidSubscriptions = (_cycleStart - _userTimeStamp[msg.sender]) / _subscriptionTimeCycle;
                // pour les autres , a un nouveau cycle egal  1 subscription a payer  ;)
                }
                }
            }
            if(_users[msg.sender].unpaidSubscriptions >= 2) {
                _users[msg.sender].isBanned = true;
                _nbActiveUsers -= 1;
            }
            // on remet tout a jour  avec le nouveau cycle start
            // haspaid et banned sont pris en compte par les autres modifier ;)
            // a tester ^^
        _userTimeStamp[msg.sender] = _cycleStart;
        _;
    }

    constructor(address comEthOwner_, uint256 subscriptionPrice_) {
        _comEthOwner = comEthOwner_;
        _subscriptionPrice = subscriptionPrice_;
        _subscriptionTimeCycle = 4 weeks;
        _createdAt = block.timestamp;
        _cycleStart = block.timestamp;
    }

    receive() external payable {}

    function submitProposal(
        string[] memory voteOptions_,
        string memory proposition_,
        uint256 timeLimit_,
        address paiementReceiver_,
        uint256 paiementAmount_
    ) public isActive checkSubscription isNotBanned returns (uint256) {
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
        emit ProposalCreated(id, _proposals[id].proposition);

        return id;
    }

    function proposalById(uint256 id_) public view returns (Proposal memory) {
        return _proposals[id_];
    }

    function getProposalsList() public view returns (Proposal[] memory) {
        return _proposalsList;
    }

    function vote(uint256 id_, uint256 userChoice_) public userExist isActive checkSubscription isNotBanned {
        require(_hasVoted[msg.sender][id_] == false, "ComEth: Already voted");
        // require(_proposals[id_].statusVote == StatusVote.Running, "ComEth: Not a running proposal");

        if (block.timestamp > _proposals[id_].createdAt + _timeLimits[id_]) {
            if (_proposals[id_].voteCount[userChoice_] > (_nbActiveUsers / 2)) {
                _proposals[id_].statusVote = StatusVote.Approved;
                _proceedPayment(id_);
            } else {
                _proposals[id_].statusVote = StatusVote.Rejected;
            }
        } else {
            _hasVoted[msg.sender][id_] = true;
            _proposals[id_].voteCount[userChoice_] += 1;
            if (_proposals[id_].voteCount[userChoice_] > _nbActiveUsers / 2) {
                _proposals[id_].statusVote = StatusVote.Approved;
                _proceedPayment(id_);
            }
            emit Voted(msg.sender, id_, _proposals[id_].proposition);
        }
    }

    function _proceedPayment(uint256 id_) private {
        payable(_proposals[id_].paiementReceiver).sendValue(_proposals[id_].paiementAmount);
        emit Spent(_proposals[id_].paiementReceiver, _proposals[id_].paiementAmount, id_);
    }

    function toggleIsActive() public isNotBanned returns (bool) {
        //require(_users[msg.sender].isBanned == false, "ComEth: You can not use this function if you are banned.");
        _users[msg.sender].isActive = !_users[msg.sender].isActive;
        if (_users[msg.sender].isActive == false) {
            _nbActiveUsers -= 1;
        } else {
            _nbActiveUsers += 1;
        }
        return _users[msg.sender].isActive;
    }

    function addUser() public {
        require(_users[msg.sender].exists == false, "ComEth: already an user");
        _users[msg.sender] = User({
            userAddress: msg.sender,
            isBanned: false,
            hasPaid: false,
            isActive: true,
            exists: true,
            unpaidSubscriptions: 1
        });
        _nbActiveUsers += 1;
        emit UserAdded(msg.sender);
    }

    function _deposit() private {
        uint256 amount = _subscriptionPrice *  _users[msg.sender].unpaidSubscriptions;
        _investmentBalances[address(this)] += amount;
        _investmentBalances[msg.sender] += amount;
        if (_users[msg.sender].isBanned) {
            _users[msg.sender].isBanned = false;
            _nbActiveUsers += 1;
            _users[msg.sender].unpaidSubscriptions = 0;
        }
        emit Deposited(msg.sender, amount);
    }

    function _withdraw() internal {}

    /// msg.Value will be calculated in the front part and equal getPaymentAmount(msg.sender)
    function pay() external payable userExist isActive checkSubscription {
        require(_users[msg.sender].hasPaid == false, "ComEth: You have already paid your subscription for this month.");
        require(msg.value >= (_subscriptionPrice *  _users[msg.sender].unpaidSubscriptions), "ComEth: unsufficient amount to pay for subscription");
        if(msg.value > _subscriptionPrice *  _users[msg.sender].unpaidSubscriptions) {
            payable(msg.sender).sendValue(msg.value - _subscriptionPrice *  _users[msg.sender].unpaidSubscriptions);
        }
        _users[msg.sender].unpaidSubscriptions = 0;
        _users[msg.sender].hasPaid = true;
        _deposit();
    }

    function quitComEth() public payable userExist checkSubscription {
        if (_users[msg.sender].isBanned == false && _investmentBalances[msg.sender] > 0) {
            uint256 getBack = (_investmentBalances[msg.sender] / _investmentBalances[address(this)]) *
                address(this).balance;
            _investmentBalances[address(this)] -= _investmentBalances[msg.sender];
            _investmentBalances[msg.sender] = 0;
            payable(msg.sender).transfer(getBack);
            emit Withdrawn(msg.sender, getBack);
        }
        _investmentBalances[msg.sender] = 0;
        _users[msg.sender].exists = false;
    }

    function toggleIsBanned(address userAddress_) public userExist {
        _toggleIsBanned(userAddress_);
    }

    function _toggleIsBanned(address userAddress_) private returns (bool) {
        if (_users[userAddress_].isBanned == false) {
            _users[userAddress_].isBanned = true;
            _nbActiveUsers -= 1;
        } else {
            _users[userAddress_].isBanned = false;
            _nbActiveUsers += 1;
        }
        emit IsBanned(userAddress_, _users[userAddress_].isBanned);
        return _users[userAddress_].isBanned;
    }

    function getUser(address userAddress_) public view returns (User memory) {
        return _users[userAddress_];
    }

    function getInvestmentBalance(address userAddress_) public view returns (uint256) {
        return _investmentBalances[userAddress_];
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getCycle() public view returns (uint256) {
        return _cycleStart;
    }

    function getSubscriptionPrice() public view returns (uint256) {
        return _subscriptionPrice;
    }

    function getUnpaidSubscriptions(address userAddress) public view returns (uint256) {
        return _users[userAddress].unpaidSubscriptions;
    }

    function getAmountToBePaid(address userAddress) public view returns (uint256) {
        return _subscriptionPrice * _users[userAddress].unpaidSubscriptions;
    }

    function getWithdrawalAmount() public view returns (uint256) {
        return ((_investmentBalances[msg.sender] / _investmentBalances[address(this)]) * address(this).balance);
    }

    function getActiveUsersNb() public view returns (uint256) {
        return _nbActiveUsers;
    }

    function getCreationTime() public view returns (uint256) {
        return _createdAt;
    }

}
