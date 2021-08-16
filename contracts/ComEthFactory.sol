//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

import "./ComEth.sol";

contract ComEthFactory {
    ComEth[] public comEthAddresses;
    event ComEthCreated(ComEth comEth);

    address private _comEthOwner;

    constructor() {}

    function createComEth(address comEthOwner_) external {
        ComEth comEth = new ComEth(comEthOwner_);

        comEthAddresses.push(comEth);
        emit ComEthCreated(comEth);
    }
}
