//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

import "./ComEth.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ComEthFactory is Ownable {
    ComEth[] public comEthAddresses;
    address private _factoryOwner;
    event ComEthCreated(ComEth comEth);

    constructor(address factoryOwner_) {
        _factoryOwner = factoryOwner_;
    }

    function createComEth(address comEthOwner_) external {
        ComEth comEth = new ComEth(comEthOwner_);

        comEthAddresses.push(comEth);
        emit ComEthCreated(comEth);
    }
}
