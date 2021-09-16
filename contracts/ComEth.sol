//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

///@title ComEth
///@author Amine Benmissi, Guillaume Bezie, Sarah Marques, Stella Soler
///@notice a DAO-like community budget management tool

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ComEth {
    using Address for address payable;
    using Counters for Counters.Counter;

    enum StatusVote {
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
        uint256 nbYes;
        uint256 nbNo;
        StatusVote statusVote;
        uint256 createdAt;
        address author;
        string proposition;
        address paiementReceiver;
        uint256 paiementAmount;
    }


    uint256 private _createdAt;
    uint256 private _subscriptionPrice;
    uint256 private _subscriptionTimeCycle;
    uint256 private _nbActiveUsers;
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
    event Rejected(uint256 proposalId);
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

    /**@dev to update a users status we use a modifier without a require so that some code 
        can be processed to check its data before it calls a function.
        - First we verify if the cycle has finished and launch a new one in case it is true.
        - Then we check last time the user has paid and reassess its unpaid subscriptions if needed.
          (Not applicable if new user or if user is not active)
        - We also set its status to "isBanned" if he has 2 or more unpaid subscriptions.
          The number of inactive users must be decremented if a user isBanned for the calculation of the majority.
        - In the case of a new user it is given the current cycle timestamp so that it has only one subscription to pay.*/
    modifier checkSubscription() {
        if (block.timestamp > _cycleStart + _subscriptionTimeCycle) {
            uint256 newCycleStart = _cycleStart + ((block.timestamp - _cycleStart) / _subscriptionTimeCycle) * _subscriptionTimeCycle;
            _cycleStart = newCycleStart;
        }
        if(_userTimeStamp[msg.sender] != 0){
            if(_userTimeStamp[msg.sender] < _cycleStart) {
                _users[msg.sender].hasPaid = false;
                if (_users[msg.sender].isActive) {
                        _users[msg.sender].unpaidSubscriptions = (_cycleStart - _userTimeStamp[msg.sender]) / _subscriptionTimeCycle;
                }
                }
            }
        if(_users[msg.sender].unpaidSubscriptions >= 2) {
            _users[msg.sender].isBanned = true;
            _nbActiveUsers -= 1;
        }

        _userTimeStamp[msg.sender] = _cycleStart;
        _;
    }

    ///@param subscriptionPrice_ the creator of ComEth chooses the amount of wei to be paid by each user every 4 weeks
    ///@notice the first cycle starts when the contract is deployed
    ///@dev no owner foreseen
    constructor(uint256 subscriptionPrice_) {
        _subscriptionPrice = subscriptionPrice_;
        _subscriptionTimeCycle = 4 weeks;
        _createdAt = block.timestamp;
        _cycleStart = block.timestamp;
    }

    receive() external payable {
    }

    ///@notice add yourself (metamask connected address) as an user of this ComEth
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

    ///@notice use this function to submit a proposal for a common budget spending
    ///@param proposition_ presents your proposal in a few words
    ///@param timeLimit_ specifies how much time users have to vote for this proposal
    ///@param paiementReceiver_ specifies the address of the paiement receiver if the proposal is approved
    ///@param paiementAmount_ specifies the amount of the paiement in weis if the proposal is approved
    ///@return the unique id of this proposal
    function submitProposal(
        string memory proposition_,
        uint256 timeLimit_,
        address paiementReceiver_,
        uint256 paiementAmount_
    ) public userExist isActive checkSubscription hasPaid returns (uint256) {
        require(paiementAmount_ <= address(this).balance, "ComEth: not enough funds for this proposal");
        _id.increment();
        uint256 id = _id.current();
        _proposals[id] = Proposal({
            nbYes: 0,
            nbNo: 0,
            statusVote: StatusVote.Running,
            createdAt: block.timestamp,
            author: msg.sender,
            proposition: proposition_,
            paiementReceiver: paiementReceiver_,
            paiementAmount: paiementAmount_
        });
        _timeLimits[id] = timeLimit_;
        emit ProposalCreated(id, _proposals[id].proposition);
        return id;
    }

    /**@notice make sure you have the active status and have paid your subscription for this cycle.
        Then specify the id of the proposal you want to vote for, the make your choice.
    */
    ///@param id_ specifies the id of the proposal one wants to vote for
    ///@param userChoice_ represents the voting choice of the user
    /**@dev this function also resolves the vote. It allows to check if majority is reached. 
        If so, it will approve the proposal before the end of the voting time limit. 
        It also gives the status approved of rejected if the time is up.
        May the proposal be approved, the function will launch the payment.
    */
    function vote(uint256 id_, uint256 userChoice_) public userExist isActive checkSubscription hasPaid {
        require(_hasVoted[msg.sender][id_] == false, "ComEth: Already voted");
        require(_proposals[id_].statusVote == StatusVote.Running, "ComEth: Not a running proposal");

        if (block.timestamp > _proposals[id_].createdAt + _timeLimits[id_]) {
            if (_proposals[id_].nbYes * 2 > _nbActiveUsers) {
                _proposals[id_].statusVote = StatusVote.Approved;
                _proceedPayment(id_);
            } else {
                _proposals[id_].statusVote = StatusVote.Rejected;
                emit Rejected(id_);
            }
        } else { 
            _hasVoted[msg.sender][id_] = true;
            if(userChoice_ == 1) {
                _proposals[id_].nbYes += 1;
            }
            if(userChoice_ == 0) {
                _proposals[id_].nbNo += 1;
            }
            if (_proposals[id_].nbYes * 2 > _nbActiveUsers) {
                _proposals[id_].statusVote = StatusVote.Approved;
                _proceedPayment(id_);
            }
            if (_proposals[id_].nbNo * 2 > _nbActiveUsers) {
                _proposals[id_].statusVote = StatusVote.Rejected;
                emit Rejected(id_);
            }
            emit Voted(msg.sender, id_, _proposals[id_].proposition);
        }
    }

    ///@param id_ of the approved proposal to get its payment executed
    function _proceedPayment(uint256 id_) private {
        payable(_proposals[id_].paiementReceiver).sendValue(_proposals[id_].paiementAmount);
        emit Spent(_proposals[id_].paiementReceiver, _proposals[id_].paiementAmount, id_);
    }

    /**@notice use this function to proceed to the payment of your current subscription 
        and all of those you have missed since last payment (if it applies).
    */
    ///@dev msg.value will be calculated by the dApp using getPaymentAmount(msg.sender)
    function pay() external payable userExist isActive checkSubscription {
        require(_users[msg.sender].hasPaid == false, "ComEth: You have already paid your subscription for this month.");
        require(msg.value >= (_subscriptionPrice *  _users[msg.sender].unpaidSubscriptions), "ComEth: unsufficient amount to pay for subscription");
        if(msg.value > _subscriptionPrice *  _users[msg.sender].unpaidSubscriptions) {
            payable(msg.sender).sendValue(msg.value - _subscriptionPrice *  _users[msg.sender].unpaidSubscriptions);
        }
        _users[msg.sender].hasPaid = true;
        _deposit();
    }

    ///@dev updates the balances after a payment and the variables isBanned and unpaidSubscriptions of the user
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


    /**@notice change your status active/inactive with this toggle function 
    and pause all activity in this ComEth.*/
    ///@dev changes the isActive status of the user and updates the number of active users
    ///@return the new isActive status of the user: true for active, false for inactive
    function toggleIsActive() public isNotBanned returns(bool){
        _users[msg.sender].isActive = !_users[msg.sender].isActive;
        if(_users[msg.sender].isActive == false) {
            _nbActiveUsers -= 1;
        } else {
            _nbActiveUsers += 1;
        }
        return _users[msg.sender].isActive;
    }

    /**@notice quit your ComEth. To get your share of the common pot you must:
    - have invested in the ComEth through payments
    - not be banned 
    Otherwise you can still quite the ComEth without a payment*/
    ///@dev proceeds to payment if it applies, updates balances and number of active users
    function quitComEth() public userExist checkSubscription {
        if(_users[msg.sender].isBanned == false && _investmentBalances[msg.sender] > 0) {
            uint256 amount = getWithdrawalAmount();
            _withdraw(amount);
            _investmentBalances[address(this)] -= _investmentBalances[msg.sender];
        }
        _investmentBalances[msg.sender] = 0;
        _users[msg.sender].exists = false;
        if(_users[msg.sender].isBanned == false && _users[msg.sender].isActive == true) {
            _nbActiveUsers -= 1;
        }
    }
    
    ///@param amount of the ether transfer when eligible user quits the ComEth 
    function _withdraw(uint256 amount) private {
        payable(msg.sender).sendValue(amount);
        emit Withdrawn(msg.sender, amount);
    }

    ///@param id_ of the proposal to be found
    ///@return all the data of the proposal
    function proposalById(uint256 id_) public view returns (Proposal memory) {
        return _proposals[id_];
    }

    ///@param userAddress_ address of the user to be found
    ///@return all the data of the user
    function getUser(address userAddress_) public view returns (User memory) {
        return _users[userAddress_];
    }

    ///@param userAddress_ address of the user to be checked
    ///@return the total amount of ether the user has put in the contract ever
    function getInvestmentBalance(address userAddress_) public view returns (uint256) {
        return _investmentBalances[userAddress_];
    }

    ///@return the total amount of ether stocked in this ComEth/contract
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    ///@return the timestamp of the current cycle meaning when it started
    function getCycle() public view returns (uint256) {
        return _cycleStart;
    }

    ///@return the price of the subscription : the amount of weis each user must pay every new cycle
    function getSubscriptionPrice() public view returns (uint256) {
        return _subscriptionPrice;
    }

    ///@param userAddress address of the user to be checked
    ///@return the number of unpaid subscriptions that the user has
    function getUnpaidSubscriptions(address userAddress) public view returns (uint256) {
        return _users[userAddress].unpaidSubscriptions;
    }

    ///@param userAddress address of the user to be checked
    ///@return the amount of ether in weis that the user must pay to keep using the ComEth
    function getAmountToBePaid(address userAddress) public view returns (uint256) {
        return _subscriptionPrice * _users[userAddress].unpaidSubscriptions;
    }

    ///@return the amount of ether in wei that an user is eligible to receive if he quits the ComEth
    function getWithdrawalAmount() public view returns (uint256) {
        return ((((_investmentBalances[msg.sender] * 100) / _investmentBalances[address(this)]) * address(this).balance) / 100 );
    }

    ///@dev function for testing purpose
    ///@return the block.timestamp of the deployment of this ComEth/contract
    function getCreationTime() public view returns (uint256) {
        return _createdAt;
    }

    ///@dev its gets the number of total proposals
    ///@return the id of the last proposal
    function getId() public view returns(uint256) {
        return _id.current();
    }
}
