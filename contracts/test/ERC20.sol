pragma solidity ^0.7.0;

import '../WhaleswapERC20.sol';

contract ERC20 is WhaleswapERC20 {
    constructor(uint _totalSupply) public {
        _mint(msg.sender, _totalSupply);
    }
}
