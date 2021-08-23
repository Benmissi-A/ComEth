//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

import "./ComEth.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ComEthFactory is Ownable {
    ComEth[] private _comEthAddresses;
    address private _factoryOwner;
    event ComEthCreated(ComEth comEth, address indexed comEthOwner);

    constructor(address factoryOwner_) {
        _factoryOwner = factoryOwner_;
    }

    function createComEth() external {
        ComEth comEth = new ComEth(msg.sender);
        _comEthAddresses.push(comEth);
        emit ComEthCreated(comEth, msg.sender);
    }

    function getComEths() public view returns(ComEth[] memory){
        return _comEthAddresses;
    }
}
