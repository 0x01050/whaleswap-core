import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-abi-exporter";
import * as dotenv from "dotenv";
dotenv.config();

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      chainId: 97,
      forking: {
        //url: "https://speedy-nodes-nyc.moralis.io/214f6439e2aaf21012c17787/bsc/mainnet/archive",
        url: "https://speedy-nodes-nyc.moralis.io/214f6439e2aaf21012c17787/bsc/testnet/archive",
      },
      accounts: [
        { privateKey: process.env['Testnet_Deployer_PrivateKey'], balance: '1000000000000000000' },
        { privateKey: process.env['Mainnet_Deployer_PrivateKey'], balance: '1000000000000000000' }
      ]
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: [process.env['Testnet_Deployer_PrivateKey']]
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: [process.env['Mainnet_Deployer_PrivateKey']]
    }
  },
  etherscan: {
    apiKey: process.env["BscScan_API_Key"]
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