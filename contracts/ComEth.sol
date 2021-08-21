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
        // comptabilisation votes
        uint256[] voteCount; 
        StatusVote statusVote;
        uint256 createdAt;
        address author;
        string proposition;
    }
    address private _comEthOwner;
    bool private _isActive;
    bool private _hasPaid;

    User[] private _usersList;


    string private _stringVote;
    Proposal[] private _proposalsList;
    Counters.Counter private _id;

    mapping(address => User) private _users;
    mapping(uint256 => Proposal) private _proposals;
    //mapping(uint256 => mapping(Proposal => YesNo));
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
        string[] memory voteOptions_,
        string memory proposition_,
        uint256 timeLimit_
    ) public returns (uint256) {
        _id.increment();
        uint256 id = _id.current();

        _proposals[id] = Proposal({
            voteOptions: voteOptions_,
            voteCount: new uint256[](voteOptions_.length),
            statusVote: StatusVote.Running,
            createdAt: block.timestamp,
            author: msg.sender,
            proposition: proposition_
        });
        _timeLimits[id] = timeLimit_;
        _proposalsList.push(_proposals[id]);
        return id;
    }
    function proposalById(uint256 id) public view returns(Proposal memory) {
        return _proposals[id];
    }

        function getProposalsList() public view returns(Proposal[] memory) {
        return  _proposalsList;
    }

    function voteYesNo(uint256 id, uint256 userChoice_) public {
        require(_hasVoted[msg.sender][id] == false, "ComEth: Already voted");
        require(_proposals[id].statusVote == StatusVote.Running, "ComEth: Not a running proposal");
        
        if(block.timestamp > _proposals[id].createdAt + _timeLimits[id]) {
            if(_proposals[id].voteCount[userChoice_] > _usersList.length / 2) {
                _proposals[id].statusVote = StatusVote.Approved;
                //proceedPaiement()
            } else {
                _proposals[id].statusVote = StatusVote.Rejected;
            }
        } else {
            _hasVoted[msg.sender][id] = true;
            _proposals[id].voteCount[userChoice_] += 1;
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
