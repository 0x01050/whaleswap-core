// SPDX-License-Identifier: UNLICENSED
//  _    _ _           _            _
// | |  | | |         | |          | |
// | |  | | |__   __ _| | ___      | | ___   __ _ _ __  ___
// | |/\| | '_ \ / _` | |/ _ \     | |/ _ \ / _` | '_ \/ __|
// \  /\  / | | | (_| | |  __/  _  | | (_) | (_| | | | \__ \
//  \/  \/|_| |_|\__,_|_|\___| (_) |_|\___/ \__,_|_| |_|___/
//
//  Whale.loans Flashmintable token wrappers
//
//  https://Whale.Loans
//
pragma solidity ^0.8.13;

import "./libraries/ERC20.sol";
import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";
import "./libraries/ReentrancyGuard.sol";
import "./interfaces/IBorrower.sol";
import "./FlashmintFactory.sol";

// @title FlashWBNB
// @notice A simple ERC20 BNB-wrapper with flash-mint functionality.
// @dev This is meant to be a drop-in replacement for WBNB.
contract FlashMain is ERC20, ReentrancyGuard {
    using SafeERC20 for ERC20;
    using SafeMath for uint256;

    // internal vars
    uint256 public _depositLimit = 500e22;

    // constants
    uint256 private constant oneEth = 1e18;

    // should never be changed by inheriting contracts
    uint256 public _borrowerDebt;

    // contracts
    FlashmintFactory public immutable factory;

    // Events with parameter names that are consistent with the WETH9 contract.
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);
    event FlashMint(address indexed src, uint256 wad);
    event NewDepositLimit(uint256 dpl);

    constructor() ERC20("Flash WBNB", "fWBNB") {
        factory = FlashmintFactory(msg.sender);
        _setupDecimals(18);
    }

    receive() external payable {
        deposit();
    }

    function setDepositLimit(uint256 value) public {
        require(msg.sender == factory.feeSetter(), "Only flashmint factory fee setter can update deposit limit");
        _depositLimit = value;
        emit NewDepositLimit(_depositLimit);
    }

    // Mints fWBNB in 1-to-1 correspondence with BNB.
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        assert(address(this).balance <= _depositLimit);
        emit Deposit(msg.sender, msg.value);
    }

    // Redeems fWBNB 1-to-1 for BNB.
    function withdraw(uint256 wad) public {
        _burn(msg.sender, wad); // reverts if `msg.sender` does not have enough fWBNB
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    // Allows anyone to mint unbacked fWBNB as long as it gets burned by the end of the transaction.
    // @audit The `nonReentrant` modifier is critical here.
    function flashMint(uint256 amount) external nonReentrant {
        require(amount < (type(uint256).max - totalSupply()));

        // calculate fee
        uint256 fee = FlashmintFactory(factory).fee();
        _borrowerDebt = amount.mul(fee).div(oneEth);

        // mint tokens
        _mint(msg.sender, amount);

        // hand control to borrower
        IBorrower(msg.sender).executeOnFlashMint(amount, _borrowerDebt);

        // burn tokens
        _burn(msg.sender, amount); // reverts if `msg.sender` does not have enough fWBNB

        // double-check that all fWBNB is backed by BNB
        assert(address(this).balance >= totalSupply());

        // send the fee
        if (fee != 0) {
            payable(FlashmintFactory(factory).feeTo()).transfer(_borrowerDebt);
        }

        // check that fee has been paid
        require(_borrowerDebt == 0, "Fee not paid");

        emit FlashMint(msg.sender, amount);
    }

    // @notice Repay all or part of the loan
    function repayEthDebt() external payable {
        _borrowerDebt = _borrowerDebt.sub(msg.value); // does not allow overpayment
    }
}