//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

contract ComEth {
    address private _comEthOwner;

     constructor(address comEthOwner_){
         _comEthOwner = comEthOwner_ ;
     }
}
