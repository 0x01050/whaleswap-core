pragma solidity ^0.7.0;


interface IBorrower {
    function executeOnFlashMint(uint256 amount, uint256 debt) external;
    function executeOnFlashMint(uint256 amount) external;
}