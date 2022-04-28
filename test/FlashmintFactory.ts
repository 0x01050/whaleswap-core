import chai from "chai";
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { expect } from "chai";
import { deployContract } from "../scripts/deployer";
import { TestToken, FlashmintFactory } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

chai.use(solidity);

describe("FlashmintFactory", async function () {
    let testAc: SignerWithAddress;
    let factory: FlashmintFactory;

    beforeEach(async function () {
      [testAc] = await ethers.getSigners();
      factory = await deployContract("FlashmintFactory", [testAc.address], testAc) as FlashmintFactory;
    });

    it("FlashmintFactory should create pair", async function () {
      const testToken = await deployContract("TestToken", []) as TestToken;

      let tx = await factory.createFlashMintableToken(testToken.address);
      await tx.wait();

      const fmAddress = await factory.getFmToken(testToken.address);
      expect(fmAddress).not.equal("0x0000000000000000000000000000000000000000");

      const baseAddress = await factory.getBaseToken(fmAddress);
      expect(baseAddress).equal(testToken.address);
    });
});
