// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;


interface IHelper {
    function burnGas(uint256 burn) external returns (uint256 burned);
}
