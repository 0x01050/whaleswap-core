// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @dev Interface of FlashWETH ERC20 token. Does not include
 * the optional functions; to access them see {FlashWETH}.
 */
interface IFlashWETH {

    function flashMint(uint256 amount) external; 
    function deposit() external payable;
    function withdraw(uint256 wad) external;
    function repayEthDebt() external payable;
    
    event FlashMint(address indexed src, uint256 wad);
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);
    
}
