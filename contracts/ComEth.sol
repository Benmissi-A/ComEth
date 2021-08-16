//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";

contract ComEth {
        using Address for address payable;

    enum Vote {
        Yes,
        No
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
        StatusVote statusVote;
        bytes32 uuid;
    }

    address private _comEthOwner;
    bool private _isActive;
    bool private _hasPaid;
    
    mapping (address => User) private _users;
    mapping (uint256 => Proposal) private _proposals;

     constructor(address comEthOwner_){
         _comEthOwner = comEthOwner_ ;
     }

    //pot commun
    receive() external payable {
    }

    //votes
    function submitProposal () public {

    }

    function vote () public {

    }

    //paiement
    function proceedPaiement () internal {

    }

    //gestion des membres/rôles
    function _toggleIsActive (address userAddress) private returns (bool) {
        if (_users[userAddress].isActive = false) {
            _users[userAddress].isActive = true;
        } else {
            _users[userAddress].isActive = false;
        }
        return _users[userAddress].isActive;
    }

    //prison
    function ban () internal {

    }

    function getIsBanned (address userAddress) public returns (bool) {
        return _users[userAddress].isBanned;
    }
    //fermeture de comEth
     
}
