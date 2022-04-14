// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

contract Helper {
    uint256 public c = 1;
    function burnGas(uint256 burn) public returns (uint256 burned) {
        uint256 start = gasleft();
        assert(start > burn + 200);
        uint256 end = start - burn;
        while (gasleft() > end + 5000) {
            c++;
        }
        while(gasleft() > end) {}
        burned = start - gasleft();
    }
}
