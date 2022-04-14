// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.4;

import "./libraries/Ownable.sol";
import "./interfaces/IFlashERC20.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IHelper.sol";

contract BorrowerFERC20 is Ownable {
    IFlashERC20 private fERC20; // address of FlashERC20 contract

    IHelper private helper;

    constructor(address _fERC20, address _helper) {
        fERC20 = IFlashERC20(_fERC20);
        helper = IHelper(_helper);
    }

    // required to receive ETH in case you want to `withdraw` some fWETH for real ETH during `executeOnFlashMint`
    //Needed to store money
    receive() external payable {}

    function retrieve(uint256 amount) external onlyOwner {
        msg.sender.transfer(amount);
    }

    // call this function to fire off your flash mint
    function beginFlashMint(uint256 amount) public onlyOwner {
        fERC20.flashMint(amount);
    }

    // this is what executes during your flash mint
    function executeOnFlashMint(uint256 amount, uint256 debt) external {
        require(msg.sender == address(fERC20), "only FlashERC20 can execute");

        helper.burnGas(500000);

        IERC20(fERC20.underlying()).approve(address(fERC20), debt);

        // When this executes, this contract will have `amount` more fWETH tokens.
        // Do whatever you want with those tokens here.
        // You can even redeem them for ETH by calling `fWETH.withdraw(someAmount)`
        // But you must make sure this contract holds at least `amount` fWETH before this function finishes executing
        // or else the transaction will be reverted by the `FlashWETH.flashMint` function.
    }
}
