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

    enum Vote {
        YesNo,
        stringVote,
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
        bool hasVoted;
        bool hasPaid;
        bool isActive;
    }

    struct Proposal {
        Vote vote;
        StatusVote statusVote;
        bytes32 uuid;
        uint256 createdAt;
        address author;
        string proposition;
    }

    address private _comEthOwner;
    bool private _isActive;
    bool private _hasPaid;

    string[] public selectVote;

    string private _stringVote;

    uint256 private _numberVote;

    Counters.Counter private _id;

    mapping(address => User) private _users;
    mapping(uint256 => Proposal) private _proposals;

    constructor(address comEthOwner_) {
        _comEthOwner = comEthOwner_;
    }

    //pot commun
    receive() external payable {}

    //votes
    function submitProposal(
        Vote vote_,
        bytes32 uuid_,
        string memory proposition
    ) public returns (uint256) {
        _id.increment();
        uint256 id = _id.current();

        _proposals[id] = Proposal({
            vote: vote_,
            statusVote: StatusVote.Running,
            uuid: uuid_,
            createdAt: block.timestamp,
            author: msg.sender,
            proposition: proposition
        });
        return id;
    }

    function vote() public {}

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
