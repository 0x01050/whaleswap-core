import chai from "chai";
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { expect } from "chai";
import { deployFlash } from "../scripts/deployer";
import { 
  BorrowerFERC20, BorrowerFERC20__factory, BorrowerFWeth, BorrowerFWeth__factory,
  FlashERC20, FlashERC20__factory, FlashMain, FlashMain__factory, TestToken, 
  TestToken__factory, FlashmintFactory, FlashmintFactory__factory
} from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

chai.use(solidity);

interface DeployedContracts {
  flashmintFactory: FlashmintFactory,
  flashTokenMain: FlashMain,
  flashTokenERC20: FlashERC20,
  borrowerFERC20: BorrowerFERC20,
  borrowerFMain: BorrowerFWeth,
  testToken: TestToken
};

describe("FlashMintableTokens", async function () {
  let testAc: SignerWithAddress;
  let testAc2: SignerWithAddress;
  let testAc3: SignerWithAddress;
  let deployedContracts: DeployedContracts;
  let deployedContractsOwner: DeployedContracts;
  let deployedContractsU2: DeployedContracts;

  const getSignedContracts = (signer: SignerWithAddress, contracts: DeployedContracts) => ({
    flashmintFactory: FlashmintFactory__factory.connect(contracts.flashmintFactory.address, signer) as FlashmintFactory,
    flashTokenMain: FlashMain__factory.connect(contracts.flashTokenMain.address, signer) as FlashMain,
    flashTokenERC20: FlashERC20__factory.connect(contracts.flashTokenERC20.address, signer) as FlashERC20,
    borrowerFERC20: BorrowerFERC20__factory.connect(contracts.borrowerFERC20.address, signer) as BorrowerFERC20,
    borrowerFMain: BorrowerFWeth__factory.connect(contracts.borrowerFMain.address, signer) as BorrowerFWeth,
    testToken: TestToken__factory.connect(contracts.testToken.address, signer) as TestToken
  })

  beforeEach(async function () {
    [testAc, testAc2, testAc3] = await ethers.getSigners();
    deployedContractsOwner = await deployFlash(testAc3);
    deployedContracts = getSignedContracts(testAc, deployedContractsOwner);
    deployedContractsU2 = getSignedContracts(testAc2, deployedContractsOwner);
  });

  it("FlashERC20 functions should work together", async function () {
    const {
      flashmintFactory,
      flashTokenERC20,
      borrowerFERC20,
      testToken } = deployedContracts;
    const accountAddress = await testAc.getAddress();

    await testToken.gimme(accountAddress, ethers.utils.parseEther("10000000000.0"));
    const initialBalance = await testToken.balanceOf(accountAddress);
    const depositAmount = ethers.utils.parseEther("10000.0");
    const flashMintAmount = ethers.utils.parseEther("1000.0");
    const fee = await flashmintFactory.fee();
    const actualFee = flashMintAmount.mul(fee).div(ethers.utils.parseEther("1"));

    // Approve fToken to spend the tokens
    await testToken.approve(flashTokenERC20.address, ethers.constants.MaxUint256);

    // Deposit token to the fToken contract (should get 1:1) 
    let tx = await flashTokenERC20.deposit(depositAmount);
    await tx.wait();
    const postDepositBalance = await testToken.balanceOf(accountAddress);

    // We should now have {depositAmount} less than before the deposit
    expect(ethers.utils.formatEther(postDepositBalance)).equal(ethers.utils.formatEther(initialBalance.sub(depositAmount)));

    // Transfer token to the borrower contract (prep for flash mint)
    await testToken.transfer(borrowerFERC20.address, depositAmount);

    // Perform flash mint
    tx = await deployedContractsOwner.borrowerFERC20.beginFlashMint(flashMintAmount);
    await tx.wait();

    // Retrieve tokens from the flash mint contract
    const postMintBalance = await testToken.balanceOf(accountAddress);
    const contractBalance = await testToken.balanceOf(deployedContractsOwner.borrowerFERC20.address);

    // We should now have {depositAmount} less again (now in contract) minus fees than before the flash mint
    expect(ethers.utils.formatEther(postMintBalance)).equal(ethers.utils.formatEther(postDepositBalance.sub(depositAmount)));
    expect(ethers.utils.formatEther(contractBalance)).equal(ethers.utils.formatEther(depositAmount.sub(actualFee)));

    tx = await flashTokenERC20.withdraw(depositAmount);
    await tx.wait();
    const postWithdrawBalance = await testToken.balanceOf(accountAddress);

    // We should now have our original amount minus deposit amount (in the contract) since we withdrew the original deposit
    expect(ethers.utils.formatEther(postWithdrawBalance)).equal(ethers.utils.formatEther(initialBalance.sub(depositAmount)));
  });

  it("FlashERC20 withdraw should work", async function () {
    const {
      flashTokenERC20,
      testToken 
    } = deployedContracts;
    const accountAddress = await testAc.getAddress();
    await testToken.gimme(accountAddress, ethers.utils.parseEther("10000000000.0"));
    const initialBalance = await testToken.balanceOf(accountAddress);
    const depositAmount = ethers.utils.parseEther("10000.0");

    // Approve fToken to spend the tokens
    await testToken.approve(flashTokenERC20.address, ethers.constants.MaxUint256);

    // Deposit token to the fToken contract (should get 1:1) 
    let tx = await flashTokenERC20.deposit(depositAmount);
    await tx.wait();
    const postDepositBalance = await testToken.balanceOf(accountAddress);

    // We should now have {depositAmount} less than before the deposit
    expect(ethers.utils.formatEther(postDepositBalance)).equal(ethers.utils.formatEther(initialBalance.sub(depositAmount)));

    tx = await flashTokenERC20.withdraw(depositAmount);
    await tx.wait();
    const postWithdrawBalance = await testToken.balanceOf(accountAddress);

    // We should now have the initial balance
    expect(ethers.utils.formatEther(postWithdrawBalance)).equal(ethers.utils.formatEther(initialBalance));
  });

  it("FlashERC20 deposit and transfer should work", async function () {
    const {
      flashTokenERC20,
      testToken
    } = deployedContracts;
    const accountAddress = await testAc.getAddress();
    const otherAccountAddress = await testAc2.getAddress();

    await testToken.gimme(accountAddress, ethers.utils.parseEther("10000000000.0"));
    const initialBalance = await testToken.balanceOf(accountAddress);
    const depositAmount = ethers.utils.parseEther("10000.0");
    const transferAmount = ethers.utils.parseEther("1000.0");

    // Approve fToken to spend the tokens
    await testToken.approve(flashTokenERC20.address, ethers.constants.MaxUint256);

    // Deposit token to obtain some fTokens
    let tx = await flashTokenERC20.deposit(depositAmount);
    await tx.wait();
    const postDepositBalance = await testToken.balanceOf(accountAddress);

    // We should now have {depositAmount} less than before the deposit
    expect(ethers.utils.formatEther(postDepositBalance)).equal(ethers.utils.formatEther(initialBalance.sub(depositAmount)));

    // Send some fTokens to another account
    tx = await testToken.transfer(otherAccountAddress, transferAmount);
    await tx.wait();
    const newBalance = await testToken.balanceOf(accountAddress);
    const otherAccountBalance = await testToken.balanceOf(otherAccountAddress);

    // We should now have {depositAmount} less than before the deposit
    expect(ethers.utils.formatEther(newBalance)).equal(ethers.utils.formatEther(postDepositBalance.sub(transferAmount)));
    expect(ethers.utils.formatEther(otherAccountBalance)).equal(ethers.utils.formatEther(transferAmount));
  });

  it("FlashMain functions should work together", async function () {
    const {
      flashmintFactory,
      flashTokenMain,
      borrowerFMain 
    } = deployedContracts;
    const initialBalance = await testAc.getBalance();
    const depositAmount = ethers.utils.parseEther("0.1");
    const flashMintAmount = ethers.utils.parseEther("0.01");
    const fee = await flashmintFactory.fee();
    const actualFee = flashMintAmount.mul(fee).div(ethers.utils.parseEther("1"));

    // Deposit token to the fToken contract (should get 1:1) 
    let tx = await flashTokenMain.deposit({ value: depositAmount });
    let txInfo = await tx.wait();
    const postDepositBalance = await testAc.getBalance();

    // We should now have {depositAmount} less than before the deposit
    expect(ethers.utils.formatEther(postDepositBalance)).equal(ethers.utils.formatEther(initialBalance.sub(depositAmount).sub(txInfo.gasUsed))); //TODO: Work out why this still doesn't add up

    // Perform flash mint
    tx = await borrowerFMain.beginFlashMint(flashMintAmount);
    txInfo = await tx.wait();

    // Retrieve tokens from the flash mint contract
    const postMintBalance = await testAc.getBalance();
    const contractBalance = await ethers.provider.getBalance(deployedContractsOwner.borrowerFMain.address);

    // We should now have {depositAmount} less again (now in contract) minus fees than before the flash mint
    expect(ethers.utils.formatEther(postMintBalance)).equal(ethers.utils.formatEther(postDepositBalance.sub(depositAmount).sub(txInfo.gasUsed)));
    expect(ethers.utils.formatEther(contractBalance)).equal(ethers.utils.formatEther(depositAmount.sub(actualFee)));

    tx = await flashTokenMain.withdraw(depositAmount);
    txInfo = await tx.wait();

    const postWithdrawBalance = await testAc.getBalance();

    // We should now have our original amount minus deposit amount (in the contract) since we withdrew the original deposit
    expect(ethers.utils.formatEther(postWithdrawBalance)).equal(ethers.utils.formatEther(postMintBalance.add(depositAmount).sub(txInfo.gasUsed)));
  });

  it("FlashMain withdraw should work", async function () {
    const {
      flashTokenMain
    } = deployedContracts;
    const initialBalance = await testAc.getBalance();
    const depositAmount = ethers.utils.parseEther("0.1");

    // Deposit token to the fToken contract (should get 1:1) 
    let tx = await flashTokenMain.deposit({ value: depositAmount });
    await tx.wait();
    const postDepositBalance = await testAc.getBalance();

    // We should now have {depositAmount} less than before the deposit
    expect(ethers.utils.formatEther(postDepositBalance)).equal(ethers.utils.formatEther(initialBalance.sub(depositAmount)));

    tx = await flashTokenMain.withdraw(depositAmount);
    await tx.wait();
    const postWithdrawBalance = await testAc.getBalance();

    // We should now have the initial balance
    expect(ethers.utils.formatEther(postWithdrawBalance)).equal(ethers.utils.formatEther(initialBalance));
  });

  it("FlashMain deposit and transfer should work", async function () {
    const {
      flashTokenMain
    } = deployedContracts;
    const accountAddress = await testAc.getAddress();
    const otherAccountAddress = await testAc2.getAddress();

    const initialBalance = await testAc.getBalance();
    const depositAmount = ethers.utils.parseEther("0.1");
    const transferAmount = ethers.utils.parseEther("0.01");

    // Deposit token to obtain some fTokens
    let tx = await flashTokenMain.deposit({ value: depositAmount });
    await tx.wait();
    const postDepositBalance = await testAc.getBalance();

    // We should now have {depositAmount} less than before the deposit
    expect(ethers.utils.formatEther(postDepositBalance)).equal(ethers.utils.formatEther(initialBalance.sub(depositAmount)));

    // Send some fTokens to another account
    tx = await testAc.sendTransaction({
      to: otherAccountAddress,
      value: transferAmount
    })
    await tx.wait();
    const newBalance = await testAc.getBalance();
    const otherAccountBalance = await testAc2.getBalance(otherAccountAddress);

    // We should now have {depositAmount} less than before the deposit
    expect(ethers.utils.formatEther(newBalance)).equal(ethers.utils.formatEther(postDepositBalance.sub(transferAmount)));
    expect(ethers.utils.formatEther(otherAccountBalance)).equal(ethers.utils.formatEther(transferAmount));
  });
});
