import { ethers, network as nw, run as HardhatRun } from "hardhat";
import {
    WhaleswapFactory__factory,
    WhaleswapInterfaceMulticall__factory,
    WhaleswapRouter__factory,
    WhaleswapRouter
} from "../types";
import * as dotenv from "dotenv";
dotenv.config();

const contracts: any = {
    mainnet: {
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
    },
    testnet: {
        [97]: { // BSC Testnet
            weth: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
            rpc: "https://data-seed-prebsc-1-s1.binance.org:8545",
            factory: "0x5E9Bc5875C1e3086E1C08Ebb9f9991c666474495",
            router: "0xca38537f132B841d0acdf343bcb2207A248A8ad9",
            multicall: "0xe42229bA0A91c491B22A9D20D61243741a20e6E9",
        },
        [4002]: { // Fantom Testnet
            weth: "0x07B9c47452C41e8E00f98aC4c075F5c443281d2A",
            rpc: "https://rpc.testnet.fantom.network",
            factory: "0x5E9Bc5875C1e3086E1C08Ebb9f9991c666474495",
            router: "0xca38537f132B841d0acdf343bcb2207A248A8ad9",
            multicall: "0xe42229bA0A91c491B22A9D20D61243741a20e6E9",
        },
        [43113]: { // Avalanche Fuji
            weth: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
            rpc: "https://api.avax-test.network/ext/bc/C/rpc",
            factory: "0x5E9Bc5875C1e3086E1C08Ebb9f9991c666474495",
            router: "0xca38537f132B841d0acdf343bcb2207A248A8ad9", //TODO: This needs updating
            multicall: "0xe42229bA0A91c491B22A9D20D61243741a20e6E9", //TODO: This needs updating
        },
        [1313161555]: { // Aurora Testnet
            weth: "0xc06fafa6d5fEAbD686b4aB0f3De759ac3b277cEb",
            rpc: "https://testnet.aurora.dev",
            factory: "",
            router: "",
            multicall: "",
        },
        //[588]: { // Metis Testnet
        //    weth: "0x420000000000000000000000000000000000000A",
        //    rpc: "https://stardust.metis.io/?owner=588",
        //    factory: "",
        //    router: "",
        //    multicall: "",
        //},
    },
};
const network = "testnet";

async function main() { 
    for(const chainId in contracts[network]){
        const prov = new ethers.providers.StaticJsonRpcProvider(contracts[network][chainId].rpc);
        const privKey = process.env['Testnet_Deployer_PrivateKey'];
        if(!privKey){
            console.log("No private key provided!");
            return;
        }
        const wallet = new ethers.Wallet(privKey, prov);
        const deployerAddress = await wallet.getAddress();

        // Deploy factory
        const factoryFactory = new WhaleswapFactory__factory(wallet);
        let factory;
        if (contracts[network][chainId].factory) {
            factory = factoryFactory.attach(
                contracts[network][chainId].factory
            );
        } else {
            factory = await factoryFactory.deploy(
                deployerAddress
            );
            await factory.deployed();

            if(chainId === "56" || chainId === "97"){
                await VerifyContract(factory.address, [
                    deployerAddress
                ]);
            }
        }
        console.log(`${chainId}: ✅ Factory: ${factory.address}`);

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
        const multicallFactory = new WhaleswapInterfaceMulticall__factory(wallet);
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