import chai, { expect } from 'chai'
import { BigNumber, Contract } from 'ethers'
import { solidity } from 'ethereum-waffle'

import { getCreate2Address } from './shared/utilities'

import WhaleswapPairJson from '../artifacts/contracts/WhaleswapPair.sol/WhaleswapPair.json'
import { ethers } from 'hardhat'
import { attachToContract, deployContract, deploySwapFactory } from '../scripts/deployer'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { FlashERC20, FlashmintFactory, TestToken, WhaleswapPair, WhaleswapRouter } from '../types'

chai.use(solidity)

const AddressZero = "0x0000000000000000000000000000000000000000";
const wBnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const maxUint256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

describe('WhaleswapRouter', async () => {
  let wallet: SignerWithAddress;
  let other: SignerWithAddress;
  let factory: Contract;
  let router: WhaleswapRouter;
  let flashmintFactory: FlashmintFactory;
  let token0: TestToken;
  let token1: TestToken;
  let pair: WhaleswapPair;
  
  beforeEach(async () => {
    [wallet, other] = await ethers.getSigners();
    flashmintFactory = await deployContract("FlashmintFactory", [wallet.address], wallet) as FlashmintFactory;
    factory = await deploySwapFactory(wallet, flashmintFactory.address);
    router = await deployContract("WhaleswapRouter", [factory.address, wBnb]) as WhaleswapRouter;
    token0 = await deployContract("TestToken", []) as TestToken;
    token1 = await deployContract("TestToken", []) as TestToken;
    pair = await createPair([token0.address, token1.address]) as WhaleswapPair;

    let tx = await token0.approve(router.address, ethers.utils.parseEther("100000000"));
    await tx.wait();
    tx = await token1.approve(router.address, ethers.utils.parseEther("100000000"));
    await tx.wait();
    tx = await token0.gimme(wallet.address, ethers.utils.parseEther("10000000"));
    await tx.wait();
    tx = await token1.gimme(wallet.address, ethers.utils.parseEther("10000000"));
    await tx.wait();
  })

  async function createPair(tokens: [string, string]) {
    const bytecode = WhaleswapPairJson.bytecode;
    const create2Address = getCreate2Address(factory.address, tokens, bytecode);
    let tx = await factory.createPair(...tokens);
    await tx.wait();
    return await attachToContract("WhaleswapPair", create2Address, wallet);
  }

  it('addLiquidity', async () => {
    let tx = await router.addLiquidity(
        token0.address,
        token1.address,
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
        0,
        0,
        wallet.address,
        maxUint256
    );
    await tx.wait();
  })

  it('doSwap', async () => {
    let tx = await router.addLiquidity(
        token0.address,
        token1.address,
        ethers.utils.parseEther("1000000"),
        ethers.utils.parseEther("1000000"),
        0,
        0,
        wallet.address,
        maxUint256
    );
    await tx.wait();

    const initialBalance0 = await token0.balanceOf(wallet.address);
    const initialBalance1 = await token1.balanceOf(wallet.address);
    const amountIn = ethers.utils.parseEther("1");
    tx = await router.swapExactTokensForTokens(
        amountIn,
        0,
        [token0.address, token1.address],
        wallet.address,
        maxUint256
    );
    await tx.wait();
    const finalBalance0 = await token0.balanceOf(wallet.address);
    const finalBalance1 = await token1.balanceOf(wallet.address);

    // Should have {amountIn} less than we started with
    expect(finalBalance0).equals(initialBalance0.sub(amountIn));

    // Should have slightly more than before
    expect(Number(ethers.utils.formatEther(finalBalance1))).gt(Number(ethers.utils.formatEther(initialBalance1)));
  })

  it('doSwapWithFlashMint', async () => {
    let tx = await router.addLiquidity(
        token0.address,
        token1.address,
        ethers.utils.parseEther("1000000"),
        ethers.utils.parseEther("1000000"),
        0,
        0,
        wallet.address,
        maxUint256
    );
    await tx.wait();
    const fmt = await attachToContract("FlashERC20", await flashmintFactory.getFmToken(token0.address), wallet) as FlashERC20;

    const initialBalance0 = await token0.balanceOf(wallet.address);
    const initialBalance1 = await token1.balanceOf(wallet.address);
    const initialLpBalance0 = await token0.balanceOf(pair.address);
    const initialLpBalance1 = await token1.balanceOf(pair.address);

    const amountIn = ethers.utils.parseEther("1");
    tx = await router.swapExactTokensForTokens(
        amountIn,
        0,
        [fmt.address, token1.address],
        wallet.address,
        maxUint256
    );
    await tx.wait();

    const finalBalance0 = await token0.balanceOf(wallet.address);
    const finalBalance1 = await token1.balanceOf(wallet.address);
    const finalLpBalance0 = await token0.balanceOf(pair.address);
    const finalLpBalance1 = await token1.balanceOf(pair.address);
    const lpFmtBalance = await fmt.balanceOf(pair.address);

    // Should have {amountIn} less than we started with
    expect(finalBalance0).equals(initialBalance0.sub(amountIn));

    // Should have slightly more than before
    expect(Number(ethers.utils.formatEther(finalBalance1))).gt(Number(ethers.utils.formatEther(initialBalance1)));

    // LP should be greater than and less than the initial balances, holding no fmts
    expect(finalLpBalance0).gt(initialLpBalance0);
    expect(finalLpBalance1).lt(initialLpBalance1);
    expect(lpFmtBalance).equals(0);
  })

  it('quote', async () => {
    expect(await router.quote(BigNumber.from(1), BigNumber.from(100), BigNumber.from(200))).to.eq(BigNumber.from(2))
    expect(await router.quote(BigNumber.from(2), BigNumber.from(200), BigNumber.from(100))).to.eq(BigNumber.from(1))
    await expect(router.quote(BigNumber.from(0), BigNumber.from(100), BigNumber.from(200))).to.be.revertedWith(
      'WhaleswapLibrary: INSUFFICIENT_AMOUNT'
    )
    await expect(router.quote(BigNumber.from(1), BigNumber.from(0), BigNumber.from(200))).to.be.revertedWith(
      'WhaleswapLibrary: INSUFFICIENT_LIQUIDITY'
    )
    await expect(router.quote(BigNumber.from(1), BigNumber.from(100), BigNumber.from(0))).to.be.revertedWith(
      'WhaleswapLibrary: INSUFFICIENT_LIQUIDITY'
    )
  })

  it('getAmountOut', async () => {
    expect(await router.getAmountOut(BigNumber.from(2), BigNumber.from(100), BigNumber.from(100))).to.eq(BigNumber.from(1))
    await expect(router.getAmountOut(BigNumber.from(0), BigNumber.from(100), BigNumber.from(100))).to.be.revertedWith(
      'WhaleswapLibrary: INSUFFICIENT_INPUT_AMOUNT'
    )
    await expect(router.getAmountOut(BigNumber.from(2), BigNumber.from(0), BigNumber.from(100))).to.be.revertedWith(
      'WhaleswapLibrary: INSUFFICIENT_LIQUIDITY'
    )
    await expect(router.getAmountOut(BigNumber.from(2), BigNumber.from(100), BigNumber.from(0))).to.be.revertedWith(
      'WhaleswapLibrary: INSUFFICIENT_LIQUIDITY'
    )
  })

  it('getAmountIn', async () => {
    expect(await router.getAmountIn(BigNumber.from(1), BigNumber.from(100), BigNumber.from(100))).to.eq(BigNumber.from(2))
    await expect(router.getAmountIn(BigNumber.from(0), BigNumber.from(100), BigNumber.from(100))).to.be.revertedWith(
      'WhaleswapLibrary: INSUFFICIENT_OUTPUT_AMOUNT'
    )
    await expect(router.getAmountIn(BigNumber.from(1), BigNumber.from(0), BigNumber.from(100))).to.be.revertedWith(
      'WhaleswapLibrary: INSUFFICIENT_LIQUIDITY'
    )
    await expect(router.getAmountIn(BigNumber.from(1), BigNumber.from(100), BigNumber.from(0))).to.be.revertedWith(
      'WhaleswapLibrary: INSUFFICIENT_LIQUIDITY'
    )
  })

  it('getAmountsOut', async () => {
    await token0.approve(router.address, maxUint256)
    await token1.approve(router.address, maxUint256)
    await router.addLiquidity(
      token0.address,
      token1.address,
      BigNumber.from(10000),
      BigNumber.from(10000),
      0,
      0,
      wallet.address,
      maxUint256
    )

    await expect(router.getAmountsOut(BigNumber.from(2), [token0.address])).to.be.revertedWith(
      'WhaleswapLibrary: INVALID_PATH'
    )
    const path = [token0.address, token1.address]
    expect(await router.getAmountsOut(BigNumber.from(2), path)).to.deep.eq([BigNumber.from(2), BigNumber.from(1)])
  })

  it('getAmountsIn', async () => {
    await token0.approve(router.address, maxUint256)
    await token1.approve(router.address, maxUint256)
    await router.addLiquidity(
      token0.address,
      token1.address,
      BigNumber.from(10000),
      BigNumber.from(10000),
      0,
      0,
      wallet.address,
      maxUint256
    )

    await expect(router.getAmountsIn(BigNumber.from(1), [token0.address])).to.be.revertedWith(
      'WhaleswapLibrary: INVALID_PATH'
    )
    const path = [token0.address, token1.address]
    expect(await router.getAmountsIn(BigNumber.from(1), path)).to.deep.eq([BigNumber.from(2), BigNumber.from(1)])
  })

  async function addLiquidity(DTTAmount: BigNumber, WETHAmount: BigNumber) {
    await token0.approve(router.address, maxUint256)
    await router.addLiquidityETH(token0.address, DTTAmount, DTTAmount, WETHAmount, wallet.address, maxUint256, {
      value: WETHAmount
    })
  }
})
