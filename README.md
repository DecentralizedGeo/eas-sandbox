# eas-sandbox

**Note:** This proof of concept uses the sepolia testnet. I highly recommend using a faucet to get test funds. Check out [Google&#39;s Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

## RPC Provider API key (e.g., Infura, Alchemy)

Some of the tooling built will require n [Remote Procedure Call](https://www.cyfrin.io/blog/blockchain-rpc-node-guide) provider API key as to interact (read data, send transactions) with blockchain networks (like Ethereum and Sepolia). A RPC provider is a service that runs these nodes and gives you an easy way to connect to the blockchain without running your own node (which can be resource-intensive). Services like [Infura](https://www.infura.io/) and [Alchemy](https://www.alchemy.com/) are popular RPC providers. If you are using [MetaMask](https://metamask.io/) or any other wallet, I recommend creating an account with Infura because of it's integration with MetaMask.

## Configuration

Configure your .env file in the root directory to have the following:

```env
PRIVATE_KEY="<Private key of sepolia wallet>"
# Wallet private key (KEEP THIS SECRET!)
PRIVATE_KEY=<Private key of sepolia wallet>

# RPC Provider API Key (e.g., Infura, Alchemy)
INFURA_API_KEY=<INFURA_API_KEY=YOUR_INFURA_API_KEY_HERE>
```

## Running

First install dependencies by running

```bash
yarn install --frozen-lockfile
```

Then run

```bash
yarn start
```

To run the test script!

> NOTE: Ensure your wallet has some test ether from the Ethereum Sepolia test network. You can use a faucet to get some test ether. I recommend using [Google&#39;s Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) to get some test ether.
