// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import './FlashmintFactory.sol';
import './WhaleswapPair.sol';

contract WhaleswapFactory {
    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    // contracts
    FlashmintFactory public immutable factory;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    constructor(address _feeToSetter, address flashfactory) public {
        feeToSetter = _feeToSetter;
        factory = FlashmintFactory(flashfactory);
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, 'Whaleswap: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'Whaleswap: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'Whaleswap: PAIR_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(WhaleswapPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        WhaleswapPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);

        //Create the flash-mintable tokens if they don't exist
        if(factory.getToken(tokenA) == address(0)) {
            factory.createFlashMintableToken(tokenA);
        }
        if(factory.getToken(tokenB) == address(0)) {
            factory.createFlashMintableToken(tokenB);
        }
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'Whaleswap: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, 'Whaleswap: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }
}
