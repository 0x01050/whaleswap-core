import { ethers, network as nw, run as HardhatRun } from "hardhat";
import {
    WhaleswapFactory__factory,
    WhaleswapRouter__factory,
    WhaleswapRouter,
    FlashmintFactory__factory,
    Multicall2__factory
} from "../types";
import * as dotenv from "dotenv";
dotenv.config();

const contracts: any = {
    mainnet: {
        [1]: { // Ethereum Mainnet
            weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            rpc: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        },
        [10]: { // Optimism Mainnet
            weth: "0x4200000000000000000000000000000000000006",
            rpc: "https://mainnet.optimism.io",
        },
        [137]: { // Polygon Mainnet
            weth: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
            rpc: "https://polygon-rpc.com",
        },
        [42161]: { // Arbitrum Mainnet
            weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            rpc: "https://arb1.arbitrum.io/rpc",
        },
        [56]: { // BSC Mainnet
            weth: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
            rpc: "https://bsc-dataseed.binance.org"
        },
        [43114]: { // Avalanche
            weth: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
            rpc: "https://api.avax.network/ext/bc/C/rpc"
        },
        [250]: { // Fantom
            weth: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
            rpc: "https://rpc.ftm.tools"
        }, 
        [1088]: { // Metis 
            weth: "0x420000000000000000000000000000000000000A",
            rpc: "https://andromeda.metis.io/?owner=1088"
        },
        [1313161554]: { // Aurora
            weth: "0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB",
            rpc: "https://mainnet.aurora.dev"
        },
        [25]: { // Cronos
            weth: "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23",
            rpc: "https://evm.cronos.org",
        },
    },
    testnet: {
        [3]: { // Ethereum Ropsten
            weth: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
            rpc: "https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
            fmFactory: "0xc24839dD20855c5CCEA5293032B57CeaC0eca9F3",
            swapFactory: "0xD18E754824641182823D5534fAC974B6F98eb962",
            router: "0x7e17e886488df4A1a44D23c67dB212e48428d56C",
            multicall: "0xCE19e2b65F193291Dd41A047ED468faC0895e12c",
        },
        [69]: { // Optimism Kovan Testnet
            weth: "0x4200000000000000000000000000000000000006",
            rpc: "https://kovan.optimism.io",
            fmFactory: "0xc24839dD20855c5CCEA5293032B57CeaC0eca9F3",
            swapFactory: "0xD18E754824641182823D5534fAC974B6F98eb962",
            router: "0x7e17e886488df4A1a44D23c67dB212e48428d56C",
            multicall: "0xCE19e2b65F193291Dd41A047ED468faC0895e12c",
        },
        [80001]: { // Polygon Mumbai Testnet
            weth: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
            rpc: "https://matic-mumbai.chainstacklabs.com",
            fmFactory: "0xc24839dD20855c5CCEA5293032B57CeaC0eca9F3",
            swapFactory: "0xD18E754824641182823D5534fAC974B6F98eb962",
            router: "0x7e17e886488df4A1a44D23c67dB212e48428d56C",
            multicall: "0xCE19e2b65F193291Dd41A047ED468faC0895e12c",
        },
        [421611]: { // Arbitrum Rinkeby Testnet
            weth: "0xEBbc3452Cc911591e4F18f3b36727Df45d6bd1f9",
            rpc: "https://rinkeby.arbitrum.io/rpc",
            fmFactory: "0xc24839dD20855c5CCEA5293032B57CeaC0eca9F3",
            swapFactory: "0xD18E754824641182823D5534fAC974B6F98eb962",
            router: "0x7e17e886488df4A1a44D23c67dB212e48428d56C",
            multicall: "0xCE19e2b65F193291Dd41A047ED468faC0895e12c",
        },
        [97]: { // BSC Testnet
            weth: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
            rpc: "https://data-seed-prebsc-1-s1.binance.org:8545",
            fmFactory: "0xc24839dD20855c5CCEA5293032B57CeaC0eca9F3",
            swapFactory: "0xD18E754824641182823D5534fAC974B6F98eb962",
            router: "0x7e17e886488df4A1a44D23c67dB212e48428d56C",
            multicall: "0xCE19e2b65F193291Dd41A047ED468faC0895e12c",
        },
        [4002]: { // Fantom Testnet
            weth: "0x07B9c47452C41e8E00f98aC4c075F5c443281d2A",
            rpc: "https://rpc.testnet.fantom.network",
            fmFactory: "0xc24839dD20855c5CCEA5293032B57CeaC0eca9F3",
            swapFactory: "0xD18E754824641182823D5534fAC974B6F98eb962",
            router: "0x7e17e886488df4A1a44D23c67dB212e48428d56C",
            multicall: "0xCE19e2b65F193291Dd41A047ED468faC0895e12c",
        },
        [43113]: { // Avalanche Fuji
            weth: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
            rpc: "https://api.avax-test.network/ext/bc/C/rpc",
            fmFactory: "0xc24839dD20855c5CCEA5293032B57CeaC0eca9F3",
            swapFactory: "0xD18E754824641182823D5534fAC974B6F98eb962",
            router: "0x7e17e886488df4A1a44D23c67dB212e48428d56C",
            multicall: "0xCE19e2b65F193291Dd41A047ED468faC0895e12c",
        },
        /*[1313161555]: { // Aurora Testnet
            weth: "0xc06fafa6d5fEAbD686b4aB0f3De759ac3b277cEb",
            rpc: "https://testnet.aurora.dev",
            fmFactory: "",
            swapFactory: "",
            router: "",
            multicall: "",
        },*/
        [588]: { // Metis Testnet
            weth: "0x420000000000000000000000000000000000000A",
            rpc: "https://stardust.metis.io/?owner=588",
            fmFactory: "0xc24839dD20855c5CCEA5293032B57CeaC0eca9F3",
            swapFactory: "0xD18E754824641182823D5534fAC974B6F98eb962",
            router: "0x7e17e886488df4A1a44D23c67dB212e48428d56C",
            multicall: "0xCE19e2b65F193291Dd41A047ED468faC0895e12c",
        },
        [338]: { // Cronos Testnet
            weth: "0x923a5A0FaFb0174a0749E18Ceb0A8751898C76Cf",
            rpc: "https://evm-t3.cronos.org",
            fmFactory: "0xc24839dD20855c5CCEA5293032B57CeaC0eca9F3",
            swapFactory: "0xD18E754824641182823D5534fAC974B6F98eb962",
            router: "0x7e17e886488df4A1a44D23c67dB212e48428d56C",
            multicall: "0xCE19e2b65F193291Dd41A047ED468faC0895e12c",
        },
    },
};
const network = "testnet";

async function main() { 
    for(const chainId in contracts[network]){
        console.log("Deploying chain:", chainId);
        const prov = new ethers.providers.StaticJsonRpcProvider(contracts[network][chainId].rpc);
        const privKey = process.env['Deployer_PrivateKey'];
        if(!privKey){
            console.log("No private key provided!");
            return;
        }
        const wallet = new ethers.Wallet(privKey, prov);
        const deployerAddress = await wallet.getAddress();
        
        // Deploy flash mint factory
        const mintFactoryFactory = new FlashmintFactory__factory(wallet);
        let flashmintFactory;
        if (contracts[network][chainId].fmFactory) {
            flashmintFactory = mintFactoryFactory.attach(
                contracts[network][chainId].fmFactory
            );
        } else {
            flashmintFactory = await mintFactoryFactory.deploy(
                deployerAddress
            );
            await flashmintFactory.deployed();

            if(chainId === "56" || chainId === "97"){
                await VerifyContract(flashmintFactory.address, [
                    deployerAddress
                ]);
            }
        }
        console.log(`${chainId}: ✅ Flashmint Factory: ${flashmintFactory.address}`);

        // Deploy swap factory
        const factoryFactory = new WhaleswapFactory__factory(wallet);
        let factory;
        if (contracts[network][chainId].swapFactory) {
            factory = factoryFactory.attach(
                contracts[network][chainId].swapFactory
            );
        } else {
            factory = await factoryFactory.deploy(
                deployerAddress
            );
            await factory.deployed();

            if(chainId === "56" || chainId === "97"){
                await VerifyContract(factory.address, [
                    deployerAddress,
                    flashmintFactory.address
                ]);
            }
        }
        console.log(`${chainId}: ✅ Swap Factory: ${factory.address}`);

        // Deploy router
        let router: WhaleswapRouter;
        const routerFactory = new WhaleswapRouter__factory(wallet);
        if (contracts[network][chainId].router) {
            router = routerFactory.attach(
                contracts[network][chainId].router
            );
        } else {
            router = await routerFactory.deploy(
                factory.address,
                contracts[network][chainId].weth
            );
            await router.deployed();
            
            if(chainId === "56" || chainId === "97"){
                await VerifyContract(router.address, [
                    factory.address,
                    contracts[network][chainId].weth
                ]);
            }
        }
        console.log(`${chainId}: ✅ Router: ${router.address}`);

        // Deploy multicall
        let multicall;
        const multicallFactory = new Multicall2__factory(wallet);
        if (contracts[network][chainId].multicall) {
            multicall = multicallFactory.attach(
                contracts[network][chainId].multicall
            );
        } else {
            multicall = await multicallFactory.deploy();
            await multicall.deployed();

            if(chainId === "56" || chainId === "97"){
                await VerifyContract(multicall.address, []);
            }
        }
        console.log(`${chainId}: ✅ Multicall: ${multicall.address}`);

        // Deploy distributor
        /*let distributor;
        const distributorFactory = new MerkleDistributor__factory(wallet);
        if (contracts[network][chainId].distributor) {
            distributor = multicallFactory.attach(
                contracts[network][chainId].distributor
            );
        } else {
            distributor = await distributorFactory.deploy();
            await distributor.deployed();

            if(chainId === "56" || chainId === "97"){
                await VerifyContract(distributor.address, []);
            }
        }
        console.log(`${chainId}: ✅ Distributor: ${distributor.address}`);*/
    }
}

export async function VerifyContract(
    contractAddress: string,
    parameters: any[]
) {
    //Don't bother if running in a network fork
    if (nw.name !== "hardhat") {
        try {
            await HardhatRun("verify:verify", {
                address: contractAddress,
                constructorArguments: parameters,
            });
        } catch (e: any) {
            if (e.message.endsWith("Reason: Already Verified")) {
                console.log("Contract already verified, this is fine.");
            } else if(e.message.includes("Reason: The Etherscan API responded that the address") && e.message.includes("does not have bytecode")) {
                await VerifyContract(contractAddress, parameters);
            }
            else {
                throw e;
            }
        }
    }
}

main()
    .then(() => process.exit())
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });