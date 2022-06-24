import chai, { expect } from 'chai'
import { BigNumber, Contract } from 'ethers'
import { solidity } from 'ethereum-waffle'

import { getCreate2Address } from './shared/utilities'

import WhaleswapPairJson from '../artifacts/contracts/WhaleswapPair.sol/WhaleswapPair.json'
import { ethers } from 'hardhat'
import { attachToContract, deployContract, deploySwapFactory } from '../scripts/deployer'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { TestToken, WhaleswapPair, WhaleswapRouter } from '../types'

chai.use(solidity)

const AddressZero = "0x0000000000000000000000000000000000000000";
const wBnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const maxUint256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

describe('WhaleswapRouter', async () => {
  let wallet: SignerWithAddress;
  let treasury: SignerWithAddress;
  let factory: Contract;
  let router: WhaleswapRouter;
  let token0: TestToken;
  let token1: TestToken;

  beforeEach(async () => {
    [wallet, treasury] = await ethers.getSigners();
    factory = await deploySwapFactory(wallet);
    await factory.setFeeTo(treasury.address);
    router = await deployContract("WhaleswapRouter", [factory.address, wBnb]) as WhaleswapRouter;
    token0 = await deployContract("TestToken", []) as TestToken;
    token1 = await deployContract("TestToken", []) as TestToken;
    await createPair([token0.address, token1.address], false) as WhaleswapPair;

    let tx = await token0.approve(router.address, maxUint256);
    await tx.wait();
    tx = await token1.approve(router.address, maxUint256);
    await tx.wait();
    tx = await token0.gimme(wallet.address, ethers.utils.parseEther("10000000"));
    await tx.wait();
    tx = await token1.gimme(wallet.address, ethers.utils.parseEther("10000000"));
    await tx.wait();
  })

  async function createPair(tokens: [string, string], isStable: boolean) {
    const bytecode = WhaleswapPairJson.bytecode;
    const create2Address = getCreate2Address(factory.address, [...tokens, isStable], bytecode);
    let tx = await factory.createPair(...tokens, isStable);
    await tx.wait();
    return await attachToContract("WhaleswapPair", create2Address, wallet);
  }

  it('addLiquidity', async () => {
    let tx = await router.addLiquidity(
      token0.address,
      token1.address,
      false,
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
    const pairAddress = await factory.getPair(token0.address, token1.address, false);
    let tx = await router.addLiquidity(
      token0.address,
      token1.address,
      false,
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
    const initialLpBalance0 = await token0.balanceOf(pairAddress);
    const initialLpBalance1 = await token1.balanceOf(pairAddress);

    const amountIn = ethers.utils.parseEther("1");
    tx = await router.swapExactTokensForTokens(
      amountIn,
      0,
      [{ from: token0.address, to: token1.address, stable: false }],
      wallet.address,
      maxUint256
    );
    await tx.wait();

    const finalBalance0 = await token0.balanceOf(wallet.address);
    const finalBalance1 = await token1.balanceOf(wallet.address);
    const finalLpBalance0 = await token0.balanceOf(pairAddress);
    const finalLpBalance1 = await token1.balanceOf(pairAddress);

    expect(finalLpBalance0).equals(initialLpBalance0.add(amountIn));
    expect(finalLpBalance1).lt(initialLpBalance1);

    // Should have {amountIn} less than we started with
    expect(finalBalance0).equals(initialBalance0.sub(amountIn));

    // Should have slightly more than before
    expect(Number(ethers.utils.formatEther(finalBalance1))).gt(Number(ethers.utils.formatEther(initialBalance1)));
  })

  // This test is currently just to compare the pancake output with ours as a sanity check
  /*it('doSwapPancake', async () => {
    const pancakeFactory = await ethers.getContractAt("IPancakeFactory", "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73", wallet) as IPancakeFactory;
    const pancakeRouter = await ethers.getContractAt("IPancakeRouter", "0x10ED43C718714eb63d5aA57B78B54704E256024E", wallet) as IPancakeRouter;

    let tx = await pancakeFactory.createPair(token0.address, token1.address);
    await tx.wait();

    const pairAddress = await pancakeFactory.getPair(token0.address, token1.address);
    const pancakePair = await ethers.getContractAt("IPancakePair", pairAddress, wallet) as IPancakePair;

    tx = await token0.approve(pancakeRouter.address, maxUint256);
    await tx.wait();
    tx = await token1.approve(pancakeRouter.address, maxUint256);
    await tx.wait();

    tx = await pancakeRouter.addLiquidity(
        token0.address,
        token1.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10"),
        0,
        0,
        wallet.address,
        maxUint256
    );
    await tx.wait();

    const initialBalance0 = await token0.balanceOf(wallet.address);
    const initialBalance1 = await token1.balanceOf(wallet.address);
    const initialLpBalance0 = await token0.balanceOf(pairAddress);
    const initialLpBalance1 = await token1.balanceOf(pairAddress);

    console.log(ethers.utils.formatEther(await pancakePair.balanceOf(wallet.address)))
    console.log(ethers.utils.formatEther(await token0.balanceOf(wallet.address)));
    console.log(ethers.utils.formatEther(await token1.balanceOf(wallet.address)));

    const amountIn = ethers.utils.parseEther("10");
    tx = await pancakeRouter.swapExactTokensForTokens(
        amountIn,
        0,
        [token0.address, token1.address],
        wallet.address,
        maxUint256
    );
    await tx.wait();
    console.log("!!!!");
    console.log(ethers.utils.formatEther(await token0.balanceOf(pairAddress)));
    console.log(ethers.utils.formatEther(await token1.balanceOf(pairAddress)));
    console.log(ethers.utils.formatEther(await token0.balanceOf(wallet.address)));
    console.log(ethers.utils.formatEther(await token1.balanceOf(wallet.address)));

    tx = await pancakeRouter.swapExactTokensForTokens(
      amountIn,
      0,
      [token1.address, token0.address],
      wallet.address,
      maxUint256
  );
  await tx.wait();
  console.log("!!!!");
  console.log(ethers.utils.formatEther(await token0.balanceOf(pairAddress)));
  console.log(ethers.utils.formatEther(await token1.balanceOf(pairAddress)));
  console.log(ethers.utils.formatEther(await token0.balanceOf(wallet.address)));
  console.log(ethers.utils.formatEther(await token1.balanceOf(wallet.address)));
    const finalBalance0 = await token0.balanceOf(wallet.address);
    const finalBalance1 = await token1.balanceOf(wallet.address);
    const finalLpBalance0 = await token0.balanceOf(pairAddress);
    const finalLpBalance1 = await token1.balanceOf(pairAddress);

    expect(finalLpBalance0).equals(initialLpBalance0.add(amountIn));
    expect(finalLpBalance1).lt(initialLpBalance1);

    // Should have {amountIn} less than we started with
    expect(finalBalance0).equals(initialBalance0.sub(amountIn));

    // Should have slightly more than before
    expect(Number(ethers.utils.formatEther(finalBalance1))).gt(Number(ethers.utils.formatEther(initialBalance1)));
  })*/

  it('doStableSwap', async () => {
    await createPair([token0.address, token1.address], true) as WhaleswapPair;
    const pairAddress = await factory.getPair(token0.address, token1.address, true);

    let tx = await router.addLiquidity(
      token0.address,
      token1.address,
      true,
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
    const initialLpBalance0 = await token0.balanceOf(pairAddress);
    const initialLpBalance1 = await token1.balanceOf(pairAddress);

    const amountIn = ethers.utils.parseEther("1");
    tx = await router.swapExactTokensForTokens(
      amountIn,
      0,
      [{ from: token0.address, to: token1.address, stable: true }],
      wallet.address,
      maxUint256
    );
    await tx.wait();

    const finalBalance0 = await token0.balanceOf(wallet.address);
    const finalBalance1 = await token1.balanceOf(wallet.address);
    const finalLpBalance0 = await token0.balanceOf(pairAddress);
    const finalLpBalance1 = await token1.balanceOf(pairAddress);

    // Should have {amountIn} less than we started with
    expect(finalBalance0).equals(initialBalance0.sub(amountIn));

    expect(finalLpBalance0).equals(initialLpBalance0.add(amountIn));
    expect(finalLpBalance1).lt(initialLpBalance1);

    // Should have slightly more than before
    expect(Number(ethers.utils.formatEther(finalBalance1))).gt(Number(ethers.utils.formatEther(initialBalance1)));
  })

  it('doSimpleSwap', async () => {
    const pairAddress = await factory.getPair(token0.address, token1.address, false);
    let tx = await router.addLiquidity(
      token0.address,
      token1.address,
      false,
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
    const initialLpBalance0 = await token0.balanceOf(pairAddress);
    const initialLpBalance1 = await token1.balanceOf(pairAddress);

    const amountIn = ethers.utils.parseEther("1");
    tx = await router.swapExactTokensForTokensSimple(
      amountIn,
      0,
      token0.address,
      token1.address,
      false,
      wallet.address,
      maxUint256
    );
    await tx.wait();

    const finalBalance0 = await token0.balanceOf(wallet.address);
    const finalBalance1 = await token1.balanceOf(wallet.address);
    const finalLpBalance0 = await token0.balanceOf(pairAddress);
    const finalLpBalance1 = await token1.balanceOf(pairAddress);

    expect(finalLpBalance0).equals(initialLpBalance0.add(amountIn));
    expect(finalLpBalance1).lt(initialLpBalance1);

    // Should have {amountIn} less than we started with
    expect(finalBalance0).equals(initialBalance0.sub(amountIn));

    // Should have slightly more than before
    expect(Number(ethers.utils.formatEther(finalBalance1))).gt(Number(ethers.utils.formatEther(initialBalance1)));
  })

  it('quote', async () => {
    expect(await router.quote(BigNumber.from(1), BigNumber.from(100), BigNumber.from(200))).to.eq(BigNumber.from(2))
    expect(await router.quote(BigNumber.from(2), BigNumber.from(200), BigNumber.from(100))).to.eq(BigNumber.from(1))
    await expect(router.quote(BigNumber.from(0), BigNumber.from(100), BigNumber.from(200))).to.be.revertedWith(
      'WhaleswapRouter: INSUFFICIENT_AMOUNT'
    )
    await expect(router.quote(BigNumber.from(1), BigNumber.from(0), BigNumber.from(200))).to.be.revertedWith(
      'WhaleswapRouter: INSUFFICIENT_LIQUIDITY'
    )
    await expect(router.quote(BigNumber.from(1), BigNumber.from(100), BigNumber.from(0))).to.be.revertedWith(
      'WhaleswapRouter: INSUFFICIENT_LIQUIDITY'
    )
  })

  function relDiff(a: number, b: number) {
    return 100 * Math.abs((a - b) / ((a + b) / 2));
  }

  it('getAmountOut', async () => {
    let tx = await router.addLiquidity(
      token0.address, token1.address, false, ethers.utils.parseEther("10000"), ethers.utils.parseEther("10000"), 0, 0, wallet.address, maxUint256
    );
    await tx.wait();

    /*let result = await router.getAmountOut(ethers.utils.parseEther("1000"), token0.address, token1.address);

    console.log("[+] Depositing $10,000 in each pool...");
    console.log("[+] Swapping $1,000...");
    console.log("[+] Volatile Slippage: " + relDiff(1000, Number(ethers.utils.formatEther(result[0]))).toFixed(2) + "%");

    result = await router.getAmountOut(ethers.utils.parseEther("10000"), token0.address, token1.address);
    console.log("[+] Swapping $10,000...");
    console.log("[+] Volatile Slippage: " + relDiff(10000, Number(ethers.utils.formatEther(result[0]))).toFixed(2) + "%");*/
    expect((await router["getAmountOut(uint256,address,address)"](ethers.utils.parseEther("2"), token0.address, token1.address))[0]).to.eq(BigNumber.from("1994602076885661310"));
    await expect(router["getAmountOut(uint256,address,address)"](BigNumber.from(0), token0.address, token1.address)).to.be.revertedWith(
      'WhaleswapRouter: INSUFFICIENT_INPUT_AMOUNT'
    )
    await expect(router["getAmountOut(uint256,address,address)"](ethers.utils.parseEther("2"), '0x0000000000000000000000000000000000000000', token1.address)).to.be.revertedWith(
      'WhaleswapRouter: INSUFFICIENT_LIQUIDITY'
    )
    await expect(router["getAmountOut(uint256,address,address)"](ethers.utils.parseEther("2"), token0.address, '0x0000000000000000000000000000000000000000')).to.be.revertedWith(
      'WhaleswapRouter: INSUFFICIENT_LIQUIDITY'
    )
  })

  it('getAmountOutStable', async () => {
    await createPair([token0.address, token1.address], true) as WhaleswapPair;
    let tx = await router.addLiquidity(
      token0.address, token1.address, true, ethers.utils.parseEther("10000"), ethers.utils.parseEther("10000"), 0, 0, wallet.address, maxUint256
    );
    await tx.wait();

    let result = await router["getAmountOut(uint256,address,address)"](ethers.utils.parseEther("1000"), token0.address, token1.address);

    /*console.log("[+] Depositing $10,000 in each pool...");
    console.log("[+] Swapping $1,000...");
    console.log("[+] Stable Slippage: " + relDiff(1000, Number(ethers.utils.formatEther(result[0]))).toFixed(2) + "%");

    result = await router.getAmountOut(ethers.utils.parseEther("10000"), token0.address, token1.address);
    console.log("[+] Swapping $10,000...");
    console.log("[+] Stable Slippage: " + relDiff(10000, Number(ethers.utils.formatEther(result[0]))).toFixed(2) + "%");*/

    expect((await router["getAmountOut(uint256,address,address)"](ethers.utils.parseEther("2"), token0.address, token1.address))[0]).to.eq(BigNumber.from("1999199999992012792"));
    await expect(router["getAmountOut(uint256,address,address)"](BigNumber.from(0), token0.address, token1.address)).to.be.revertedWith(
      'WhaleswapRouter: INSUFFICIENT_INPUT_AMOUNT'
    )
    await expect(router["getAmountOut(uint256,address,address)"](ethers.utils.parseEther("2"), '0x0000000000000000000000000000000000000000', token1.address)).to.be.revertedWith(
      'WhaleswapRouter: INSUFFICIENT_LIQUIDITY'
    )
    await expect(router["getAmountOut(uint256,address,address)"](ethers.utils.parseEther("2"), token0.address, '0x0000000000000000000000000000000000000000')).to.be.revertedWith(
      'WhaleswapRouter: INSUFFICIENT_LIQUIDITY'
    )
  })

  it('getAmountsOut', async () => {
    await token0.approve(router.address, maxUint256)
    await token1.approve(router.address, maxUint256)
    await router.addLiquidity(
      token0.address,
      token1.address,
      false,
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("10000"),
      0,
      0,
      wallet.address,
      maxUint256
    )

    await expect(router['getAmountsOut(uint256,address[])'](ethers.utils.parseEther("2"), [token0.address])).to.be.revertedWith(
      'WhaleswapRouter: INVALID_PATH'
    )
    const path: WhaleswapRouter.RouteStruct[] = [{ from: token0.address, to: token1.address, stable: false }]
    expect(await router['getAmountsOut(uint256,(address,address,bool)[])'](ethers.utils.parseEther("2"), path)).to.deep.eq([BigNumber.from("2000000000000000000"), BigNumber.from("1994602076885661310")])
  })

  async function addLiquidity(DTTAmount: BigNumber, WETHAmount: BigNumber) {
    await token0.approve(router.address, maxUint256)
    await router.addLiquidityETH(token0.address, false, DTTAmount, DTTAmount, WETHAmount, wallet.address, maxUint256, {
      value: WETHAmount
    })
  }
})
