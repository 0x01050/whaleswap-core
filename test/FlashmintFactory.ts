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

      const address = await factory.getToken(testToken.address);
      expect(address).not.equal("0x0000000000000000000000000000000000000000");
    });
});
