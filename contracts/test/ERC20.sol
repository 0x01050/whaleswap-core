// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import '../WhaleswapERC20.sol';

contract ERC20 is WhaleswapERC20 {
    constructor(uint _totalSupply) {
        _mint(msg.sender, _totalSupply);
    }
}
