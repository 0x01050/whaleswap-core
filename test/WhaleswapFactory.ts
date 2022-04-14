import chai, { expect } from 'chai'
import { BigNumber, Contract } from 'ethers'
import { solidity } from 'ethereum-waffle'

import { getCreate2Address } from './shared/utilities'

import WhaleswapPair from '../artifacts/contracts/WhaleswapPair.sol/WhaleswapPair.json'
import { ethers } from 'hardhat'
import { attachToContract, deployContract, deploySwapFactory } from '../scripts/deployer'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { FlashmintFactory, TestToken } from '../types'

chai.use(solidity)

const AddressZero = "0x0000000000000000000000000000000000000000";

describe('WhaleswapFactory', async () => {
  let wallet: SignerWithAddress;
  let other: SignerWithAddress;
  let factory: Contract;
  let flashmintFactory: FlashmintFactory;
  let testToken: TestToken;
  let testToken2: TestToken;
  let testToken3: TestToken;

  beforeEach(async () => {
    [wallet, other] = await ethers.getSigners();
    flashmintFactory = await deployContract("FlashmintFactory", [wallet.address], wallet) as FlashmintFactory;
    factory = await deploySwapFactory(wallet, flashmintFactory.address);
    testToken = await deployContract("TestToken", []) as TestToken;
    testToken2 = await deployContract("TestToken", []) as TestToken;
    testToken3 = await deployContract("TestToken", []) as TestToken;
  })

  it('feeTo, feeToSetter, allPairsLength', async () => {
    expect(await factory.feeTo()).to.eq(AddressZero)
    expect(await factory.feeToSetter()).to.eq(wallet.address)
    expect(await factory.allPairsLength()).to.eq(0)
  })

  async function createPair(tokens: [string, string], expectedIndex = 1) {
    const [token0, token1] = tokens[0].toUpperCase() < tokens[1].toUpperCase() ? [tokens[0], tokens[1]] : [tokens[1], tokens[0]];

    const bytecode = WhaleswapPair.bytecode
    const create2Address = getCreate2Address(factory.address, tokens, bytecode)
    await expect(factory.createPair(...tokens))
      .to.emit(factory, 'PairCreated')
      .withArgs(token0, token1, create2Address, BigNumber.from(expectedIndex))

    await expect(factory.createPair(...tokens)).to.be.reverted // Whaleswap: PAIR_EXISTS
    await expect(factory.createPair(...tokens.slice().reverse())).to.be.reverted // Whaleswap: PAIR_EXISTS
    expect(await factory.getPair(...tokens)).to.eq(create2Address)
    expect(await factory.getPair(...tokens.slice().reverse())).to.eq(create2Address)
    expect(await factory.allPairs(expectedIndex-1)).to.eq(create2Address)
    expect(await factory.allPairsLength()).to.eq(expectedIndex)

    const pair = await attachToContract("WhaleswapPair", create2Address, wallet)
    expect(await pair.factory()).to.eq(factory.address)
    expect(await pair.token0()).to.eq(token0)
    expect(await pair.token1()).to.eq(token1)
  }

  it('createPair', async () => {
    await createPair([testToken.address, testToken2.address])
  })

  it('createPair:reverse', async () => {
    await createPair([testToken.address, testToken2.address].slice().reverse() as [string, string])
  })

  it('createPairWithFlashmintableTokens', async () => {
    await createPair([testToken.address, testToken2.address])
    let tokenAFmt = await flashmintFactory.getToken(testToken.address)
    expect(tokenAFmt).to.not.eq(AddressZero)
    let tokenBFmt = await flashmintFactory.getToken(testToken2.address)
    expect(tokenBFmt).to.not.eq(AddressZero)

    // Create a pair with an overlapping token
    await createPair([testToken.address, testToken3.address], 2)

    // Ensure it won't get weird if we double deploy
    let tokenAFmt2 = await flashmintFactory.getToken(testToken.address)
    expect(tokenAFmt).equal(tokenAFmt2)
    let tokenBFmt2 = await flashmintFactory.getToken(testToken2.address)
    expect(tokenBFmt).equal(tokenBFmt2)
    let tokenCFmt = await flashmintFactory.getToken(testToken3.address)
    expect(tokenCFmt).to.not.eq(AddressZero)
  })

  it('setFeeTo', async () => {
    await expect(factory.connect(other).setFeeTo(other.address)).to.be.revertedWith('Whaleswap: FORBIDDEN')
    await factory.setFeeTo(wallet.address)
    expect(await factory.feeTo()).to.eq(wallet.address)
  })

  it('setFeeToSetter', async () => {
    await expect(factory.connect(other).setFeeToSetter(other.address)).to.be.revertedWith('Whaleswap: FORBIDDEN')
    await factory.setFeeToSetter(other.address)
    expect(await factory.feeToSetter()).to.eq(other.address)
    await expect(factory.setFeeToSetter(wallet.address)).to.be.revertedWith('Whaleswap: FORBIDDEN')
  })
})
