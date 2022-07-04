import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-abi-exporter";
import "hardhat-change-network";
import * as dotenv from "dotenv";
dotenv.config();

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      chainId: 56,
      forking: {
        url: "https://speedy-nodes-nyc.moralis.io/214f6439e2aaf21012c17787/bsc/mainnet/archive",
        //url: "https://speedy-nodes-nyc.moralis.io/214f6439e2aaf21012c17787/bsc/testnet/archive",
      },
      accounts: [
        { privateKey: process.env['Deployer_PrivateKey'], balance: '1000000000000000000' },
        { privateKey: process.env['Tests_PrivateKey'], balance: '1000000000000000000' }
      ]
    },
    ropsten: {
      url: "https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      chainId: 97,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    mainnet: {
      url: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      chainId: 1,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    bsc: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    opera: {
      url: "https://rpc.ftm.tools",
      chainId: 250,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    operaTestnet: {
      url: "https://rpc.testnet.fantom.network",
      chainId: 4002,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    optimisticEthereum: {
      url: "https://mainnet.optimism.io",
      chainId: 10,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    optimisticKovan: {
      url: "https://kovan.optimism.io",
      chainId: 69,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    polygon: {
      url: "https://polygon-rpc.com",
      chainId: 137,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    polygonMumbai: {
      url: "https://matic-mumbai.chainstacklabs.com",
      chainId: 80001,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    arbitrumOne: {
      url: "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    arbitrumTestnet: {
      url: "https://rinkeby.arbitrum.io/rpc",
      chainId: 421611,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    avalancheFujiTestnet: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    aurora: {
      url: "https://mainnet.aurora.dev",
      chainId: 1313161554,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    auroraTestnet: {
      url: "https://testnet.aurora.dev",
      chainId: 1313161555,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    metis: {
      url: "https://andromeda.metis.io/?owner=1088",
      chainId: 1088,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    metisTestnet: {
      url: "https://stardust.metis.io/?owner=588",
      chainId: 588,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    cronos: {
      url: "https://evm.cronos.org",
      chainId: 25,
      accounts: [process.env['Deployer_PrivateKey']]
    },
    cronosTestnet: {
      url: "https://evm-t3.cronos.org",
      chainId: 338,
      accounts: [process.env['Deployer_PrivateKey']]
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env["EtherScan_API_Key"],
      ropsten: process.env["EtherScan_API_Key"],
      // binance smart chain
      bsc: process.env["BscScan_API_Key"],
      bscTestnet: process.env["BscScan_API_Key"],
      // fantom mainnet
      opera: process.env["FtmScan_API_Key"],
      ftmTestnet: process.env["FtmScan_API_Key"],
      // optimism
      optimisticEthereum: process.env["OptimismEtherScan_API_Key"],
      optimisticKovan: process.env["OptimismEtherScan_API_Key"],
      // polygon
      polygon: process.env["PolyScan_API_Key"],
      polygonMumbai: process.env["PolyScan_API_Key"],
      // arbitrum
      arbitrumOne: process.env["ArbiScan_API_Key"],
      arbitrumTestnet: process.env["ArbiScan_API_Key"],
      // avalanche
      avalanche: process.env["SnowTrace_API_Key"],
      avalancheFujiTestnet: process.env["SnowTrace_API_Key"],
      // aurora
      aurora: "api-key",
      auroraTestnet: "api-key",
      // metis
      //metis: "",
      //metisTestnet: "",
      // cronos
      //cronos: "",
      //cronosTestnet: "",
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true
          }
        }
      },
      {
        version: "0.6.2",
        settings: {
          optimizer: {
            enabled: true
          }
        }
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true
          }
        }
      },
      {
        version: "0.7.0",
        settings: {
          optimizer: {
            enabled: true
          }
        }
      },
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true
          }
        }
      },
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true
          }
        }
      }
    ]
  },
  typechain: {
    outDir: "types",
    target: "ethers-v5",
  },
  abiExporter: {
    path: "./contracts/abi",
    clear: true,
    flat: true,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000
  }
};