//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ComEth {
    using Address for address payable;
    using Counters for Counters.Counter;

    //types de votes
    enum YesNo {
        yes,
        no,
        blank
    }

    enum VoteFormatting {
        YesNo,
        numberVote,
        selectVote
    }

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

    struct Proposal {
        VoteFormatting vote;
        StatusVote statusVote;
        uint256 createdAt;
        address author;
        string proposition;
        // comptabilisation votes
        uint256[] voteResults;
    }

    address private _comEthOwner;
    bool private _isActive;
    bool private _hasPaid;

    Proposal[] public selectVote;
    Users[] public nbUsers;

    string private _stringVote;

    uint256 private _numberVote;

    Counters.Counter private _id;

    mapping(address => User) private _users;
    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => mapping(Proposal => YesNo));
    mapping(address => mapping(uint256 => bool)) private _hasVoted;
    mapping(uint256 => uint256) private _timeLimits;
    mapping(uint256 => uint256) private _nbVotes;

    constructor(address comEthOwner_) {
        _comEthOwner = comEthOwner_;
    }

    //pot commun
    receive() external payable {}

    //votes
    function submitProposal(
        VoteFormatting vote_,
        string memory proposition,
        uint256 timeLimit
    ) public returns (uint256) {
        _id.increment();
        uint256 id = _id.current();
        _proposals[id] = Proposal({
            vote: vote_,
            statusVote: StatusVote.Running,
            createdAt: block.timestamp,
            author: msg.sender,
            proposition: proposition
        });
        _timeLimits[id] = timeLimit;
        selectVote.push(_proposals[id]);
        return id;
    }
    function proposalById(uint256 id) public view returns(Proposal memory) {
        return _proposals[id];
    }

        function getProposals() public view returns(Proposal[] memory) {
        return  selectVote;
    }

    function voteYesNo(uint256 id, YesNo answer) public {
        require(_hasVoted[msg.sender][id] == false, "ComEth: Already voted");
        require(_proposals[id].statusVote == StatusVote.Running, "ComEth: Not a running proposal");
        
        if(block.timestamp > _proposals[id].createdAt + _timeLimits[id]) {
            if(_proposals[id].nbYes > _proposals[id].nbNo) {
                _proposals[id].status = Status.Approved;
            } else {
                _proposals[id].status = Status.Rejected;
            }
        } else {
            if(vote_ == YesNo.Yes) {
                _proposals[id].nbYes += 1;
            } else {
                _proposals[id].nbNo += 1;
            }
            _hasVoted[msg.sender][id] = true;
            _nbVotes[id] += 1;
            if(nbUsers.length = _nbVotes[id]) {
                //resolve vote
            }
        }
    }

    //paiement
    function proceedPaiement() external payable {}

    //gestion des membres/rôles
    function _toggleIsActive(address userAddress) private returns (bool) {
        if (_users[userAddress].isActive = false) {
            _users[userAddress].isActive = true;
        } else {
            _users[userAddress].isActive = false;
        }
        return _users[userAddress].isActive;
    }

    //prison
    function ban() public {}

    function getIsBanned(address userAddress) public view returns (bool) {
        return _users[userAddress].isBanned;
    }

    //fermeture de comEth
}
