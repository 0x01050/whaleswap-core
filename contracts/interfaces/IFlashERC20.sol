//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;

import "./IERC20.sol";

/**
 * @dev Interface of FlashWETH ERC20 token. Does not include
 * the optional functions; to access them see {FlashWETH}.
 */
interface IFlashERC20 {
    function flashMint(uint256 amount) external;

    function deposit() external payable;

    function withdraw(uint256 wad) external;

    function underlying() external returns (address);

    event FlashMint(address indexed src, uint256 wad);
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);
}
