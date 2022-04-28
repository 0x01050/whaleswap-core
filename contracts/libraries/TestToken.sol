// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./ERC20.sol";

contract TestToken is ERC20 {

    uint256 public _depositLimit = 500e22;

    constructor() ERC20 ("LOL Token", "LOL"){
        _depositLimit = 10;
    }

    function gimme(address account, uint256 amount) public {
        require(account != address(0), "ERC20: mint to the zero address");
        _mint(account, amount);
    }
}
