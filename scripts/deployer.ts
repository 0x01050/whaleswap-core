import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import {
  TestToken,
  FlashERC20,
  FlashMain,
  BorrowerFERC20,
  BorrowerFWeth,
  FlashmintFactory,
  WhaleswapFactory,
  WhaleswapPair,
  WhaleswapERC20
} from "../types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const deployerAddress = "0xb286EF4f1334DddB9E14329D15631F823309d95D";

export const deployFlash = async (signer: SignerWithAddress): Promise<{
    flashmintFactory: FlashmintFactory,
    flashTokenMain: FlashMain,
    flashTokenERC20: FlashERC20,
    borrowerFERC20: BorrowerFERC20,
    borrowerFMain: BorrowerFWeth,
    testToken: TestToken
}> => {
    const testToken = await deployContract("TestToken", [], signer) as TestToken;
    const flashmintFactory = await deployContract("FlashmintFactory", [signer.address], signer) as FlashmintFactory;
    
    let tx = await flashmintFactory.createFlashMintableToken(testToken.address);
    await tx.wait();
    const flashTokenERC20Address = await flashmintFactory.getFmToken(testToken.address);
    const flashTokenERC20 = await attachToContract("FlashERC20", flashTokenERC20Address, signer) as FlashERC20;
    
    tx = await flashmintFactory.createFlashMintableToken(ZERO_ADDRESS);
    await tx.wait();
    const flashTokenMainAddress = await flashmintFactory.getFmToken(ZERO_ADDRESS);
    const flashTokenMain = await attachToContract("FlashMain", flashTokenMainAddress, signer) as FlashMain;

    const helper = await deployContract("Helper", [], signer);
    const borrowerFERC20 = await deployContract("BorrowerFERC20", [flashTokenERC20.address, helper.address], signer) as BorrowerFERC20;
    const borrowerFMain = await deployContract("BorrowerFWeth", [flashTokenMain.address, helper.address], signer) as BorrowerFWeth;
    
    return {
      flashmintFactory,
      flashTokenMain,
      flashTokenERC20,
      borrowerFERC20,
      borrowerFMain,
      testToken
    }
};

export const deploySwapFactory = async (signer: SignerWithAddress, flashmintFactoryAddress: string): Promise<WhaleswapFactory> =>{
  return await deployContract("WhaleswapFactory", [signer.address, flashmintFactoryAddress], signer) as WhaleswapFactory;
}

export const deployContract = async (
    contractName: string,
    args: any[] = [],
    signer?: SignerWithAddress
): Promise<Contract> => {
    let Contract = await ethers.getContractFactory(contractName, signer);
    const contract = await Contract.deploy(...args);
    await contract.deployed();
    return contract;
};

export const attachToContract = async (
  contractName: string,
  address: string,
  signer?: SignerWithAddress
): Promise<Contract> => {
    return (await ethers.getContractFactory(contractName, signer)).attach(address);
};