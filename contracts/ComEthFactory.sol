//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**@title ComEthFactory
  *@author Amine Benmissi, Guillaume Bezie, Sarah Marques, Stella Soler
  *@notice Use this contract to create a new ComEth, a DAO-like community budget management tool
 */

import "./ComEth.sol";

contract ComEthFactory {

    address private _factoryOwner;
    event ComEthCreated(address indexed comEthAddress);

    ///@param factoryOwner_ the owner of this ComEth Factory contract
    constructor(address factoryOwner_) {
        _factoryOwner = factoryOwner_;
    }

    ///@notice create a ComEth community and manage a common pote like a DAO
    /**@param subscriptionPrice_ the price in weis of the subscription 
    that each user will have to pay every 4 weeks to be able to use the future ComEth*/
    function createComEth(uint256 subscriptionPrice_) external {
        ComEth comEth = new ComEth(subscriptionPrice_);
        emit ComEthCreated(address(comEth));
    }

    ///@return the address of the owner of this ComEth Factory
    function getFactoryOwner() public view returns (address){
        return _factoryOwner;
    }
}
