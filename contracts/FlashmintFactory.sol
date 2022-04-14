// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import './FlashERC20.sol';
import './FlashMain.sol';

contract FlashmintFactory {
    address public feeTo;
    address public feeSetter;
    uint256 public fee = 0.001e18; // 0.1% fee

    mapping(address => address) public getToken;
    address[] public allTokens;

    event TokenCreated(address indexed baseToken, address fmToken, uint);

    constructor(address _feeSetter) {
        feeSetter = _feeSetter;
    }

    function createFlashMintableToken(address baseToken) external returns (address fmToken) {
        require(getToken[baseToken] == address(0), 'Flashmint: TOKEN_EXISTS');
        bytes memory bytecode = getCreationBytecode(baseToken);
        bytes32 salt = keccak256(abi.encodePacked(baseToken));
        assembly {
            fmToken := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        getToken[baseToken] = fmToken;
        allTokens.push(fmToken);
        emit TokenCreated(baseToken, fmToken, allTokens.length);
    }

    function allTokensLength() external view returns (uint) {
        return allTokens.length;
    }

    function setFee(uint256 _fee) external {
        require(msg.sender == feeSetter, 'Flashmint: FORBIDDEN');
        fee = _fee;
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeSetter, 'Flashmint: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeSetter(address _feeSetter) external {
        require(msg.sender == feeSetter, 'Flashmint: FORBIDDEN');
        feeSetter = _feeSetter;
    }

    function getCreationBytecode(address _baseToken) public pure returns (bytes memory) {
        if(_baseToken == address(0)) {
            bytes memory bytecode = type(FlashMain).creationCode;
            return abi.encodePacked(bytecode, abi.encode(_baseToken));
        }
        else {
            bytes memory bytecode = type(FlashERC20).creationCode;
            return abi.encodePacked(bytecode, abi.encode(_baseToken));
        }
    }
}