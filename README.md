# eas-sandbox

**Note:** This proof of concept uses the sepolia testnet. I highly recommend using a faucet to get test funds. Check out [Google&#39;s Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

## RPC Provider API key (e.g., Infura, Alchemy)

Some of the tooling built will require n [Remote Procedure Call](https://www.cyfrin.io/blog/blockchain-rpc-node-guide) provider API key as to interact (read data, send transactions) with blockchain networks (like Ethereum and Sepolia). A RPC provider is a service that runs these nodes and gives you an easy way to connect to the blockchain without running your own node (which can be resource-intensive). Services like [Infura](https://www.infura.io/) and [Alchemy](https://www.alchemy.com/) are popular RPC providers. If you are using [MetaMask](https://metamask.io/) or any other wallet, I recommend creating an account with Infura because of it's integration with MetaMask.

## Reviewing your attestations and transactions

By default, all transactions have been configured for the Ethereum Sepolia test network.

- If you would like to review your attestations, please visit the [EAS Sepolia Explorer](https://sepolia.easscan.io/). You can search for your wallet address in the search bar to see all the attestations made by your wallet.

- If you would like to review your transactions, please visit the [Etherscan Sepolia Testnet Explorer](https://sepolia.etherscan.io/). You can search for your wallet address in the search bar to see all the transactions made by your wallet.

## Setting up your development environment

This TypeScript project uses [Yarn](https://yarnpkg.com/) as the package manager.

### Project Structure

- `src/`: Contains the core modular functions.
  - `config.ts`: Configuration constants (Contract addresses).
  - `provider.ts`: Function to initialize ethers provider and signer.
  - `eas-attestation.ts`: Functions for creating, fetching, and revoking on-chain and off-chain attestations.
  - `eas-schema.ts`: Functions for registering and fetching schemas.
  - `offchain-storage.ts`: Functions for saving and loading off-chain attestations to a local JSON file.
- `src/examples/`: Contains example scripts demonstrating how to use the modular functions.
- `offchain-attestations.json`: Local storage file for off-chain attestations (created when saving).
- `.env.example`: Example environment file structure.

### Installation

If you don&#39;t have Yarn installed, you can install it by running the following command:

```bash
npm install --global yarn
```

Install dependencies by running

```bash
yarn install --frozen-lockfile
```

### Configuration

In the root directory, create a `.env` file and copy the contents of the `.env.example` file into it. This file contains all the environment variables required to run the project.

At the minimum, you will need to set the following environment variables:

- `PRIVATE_KEY`: The private key of your wallet. This is used to sign transactions and attestations. **Keep this secret!**
- `INFURA_API_KEY`: The API key for your RPC provider (e.g., Infura, Alchemy). This is used to connect to the Ethereum network.

> NOTE: Ensure your wallet has some test ether from the Ethereum Sepolia test network. You can use a faucet to get some test ether. I recommend using [Google&#39;s Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) to get some test ether.

### Running sample examples

A suite of sample examples are provided in the `examples` directory. These examples demonstrate how to use the EAS SDK to create and verify attestations, as well as how to interact with the Ethereum network.

The following scripts in `src/examples/` demonstrate common EAS interactions:

- **`register-schema.ts`**:
  - Demonstrates how to register a new schema on the EAS Schema Registry.
  - Run with: `yarn example:register-schema`
  - **Note:** You need to edit the script to provide a valid `schema` object.

- **`fetch-schema.ts`**:
  - Shows how to fetch the details of an existing schema using its UID.
  - Run with: `yarn example:fetch-schema`
  - **Note:** You need to edit the script to provide a valid `schemaUID`.

- **`create-onchain-attestation.ts`**:
  - Creates a new attestation on-chain using a specific schema.
  - Run with: `yarn example:onchain`
  - **Note:** You need to edit the script to provide a valid `schemaUID` and `recipient` address.

- **`get-attestation.ts`**:
  - Fetches the details of an existing on-chain attestation using its UID.
  - Run with: `yarn example:fetch`
  - **Note:** You need to edit the script to provide a valid `attestationUID`.

- **`revoke-attestation.ts`**:
  - Revokes an existing on-chain attestation.
  - Run with: `yarn example:revoke`
  - **Note:** You need to edit the script to provide the correct `schemaUID` and `attestationUID` to revoke.

- **`create-offchain-attestation.ts`**:
  - Creates and signs an off-chain attestation. The result is printed to the console but not stored automatically by this script.
  - Run with: `yarn example:offchain`
  - **Note:** You need to edit the script to provide a valid `schemaUID` and `recipient` address.

- **`save-offchain-attestation.ts`**:
  - Creates a new signed off-chain attestation and then saves it to the local `offchain-attestations.json` file.
  - Run with: `yarn example:save-offchain`
  - **Note:** The script will create the `offchain-attestations.json` file if it doesn't exist. If it does exist, the new attestation will be appended to the existing list.

- **`load-offchain-attestations.ts`**:
  - Loads attestations from the `offchain-attestations.json` file.
  - Includes an optional query object within the script that can be uncommented and modified to filter the loaded attestations.
  - Run with: `yarn example:load-offchain`
  - **Note:** The script will print all loaded attestations to the console. You can modify the script to perform additional operations on the loaded attestations.

### Running workflow examples

The following scripts in `src/workflows/` demonstrate end-to-end use cases leveraging the modular EAS functions:

- **`workflow-impact-monitoring.ts`**:
  - Demonstrates registering the geospatial bounds of an area (e.g., a conservation project) as an on-chain attestation.
  - Run with: `yarn workflow:impact-monitoring`
  - **Note:** You may need to edit the script to provide specific schema details or coordinates.

- **`workflow-event-checkin.ts`**:
  - Simulates an event check-in process where attendance is recorded along with the user's geo-IP location in an attestation.
  - Run with: `yarn workflow:event-checkin`
  - **Note:** You may need to edit the script to provide a specific schema UID and recipient address.

- **`workflow-geocaching.ts`**:
  - Illustrates a geocaching scenario where finding a cache triggers the creation of an attestation containing geospatial metadata.
  - Run with: `yarn workflow:geocache`
  - **Note:** You may need to edit the script to provide relevant schema and location details.
