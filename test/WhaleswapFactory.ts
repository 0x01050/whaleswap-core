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
  let testToken: TestToken;
  let testToken2: TestToken;
  let testToken3: TestToken;

  beforeEach(async () => {
    [wallet, other] = await ethers.getSigners();
    factory = await deploySwapFactory(wallet);
    testToken = await deployContract("TestToken", []) as TestToken;
    testToken2 = await deployContract("TestToken", []) as TestToken;
    testToken3 = await deployContract("TestToken", []) as TestToken;
  })

  it('feeTo, feeToSetter, allPairsLength', async () => {
    expect(await factory.feeTo()).to.eq(AddressZero)
    expect(await factory.feeToSetter()).to.eq(wallet.address)
    expect(await factory.allPairsLength()).to.eq(0)
  })

  async function createPair(tokens: [string, string], isStable: boolean, expectedIndex = 1) {
    const [token0, token1] = tokens[0].toUpperCase() < tokens[1].toUpperCase() ? [tokens[0], tokens[1]] : [tokens[1], tokens[0]];

    const bytecode = WhaleswapPair.bytecode
    const create2Address = getCreate2Address(factory.address, [...tokens, isStable], bytecode)
    await expect(factory.createPair(...tokens, isStable))
      .to.emit(factory, 'PairCreated')
      .withArgs(token0, token1, isStable, create2Address, BigNumber.from(expectedIndex))

    await expect(factory.createPair(...tokens, isStable)).to.be.reverted // Whaleswap: PAIR_EXISTS
    await expect(factory.createPair(...tokens.slice().reverse(), isStable)).to.be.reverted // Whaleswap: PAIR_EXISTS
    expect(await factory.getPair(...tokens, isStable)).to.eq(create2Address)
    expect(await factory.getPair(...tokens.slice().reverse(), isStable)).to.eq(create2Address)
    expect(await factory.allPairs(expectedIndex-1)).to.eq(create2Address)
    expect(await factory.allPairsLength()).to.eq(expectedIndex)

    const pair = await attachToContract("WhaleswapPair", create2Address, wallet)
    expect(await pair.factory()).to.eq(factory.address)
    expect(await pair.token0()).to.eq(token0)
    expect(await pair.token1()).to.eq(token1)
  }

  it('createPair', async () => {
    await createPair([testToken.address, testToken2.address], false)
  })

  it('createPair:reverse', async () => {
    await createPair([testToken.address, testToken2.address].slice().reverse() as [string, string], false)
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
