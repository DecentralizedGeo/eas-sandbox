# eas-sandbox

This repository aims to provide developers with flexible, composable functions for interacting with the [Ethereum Attestation Service (EAS)](https://docs.attest.org/docs/welcome), allowing for quick prototyping and testing of attestation workflows. We've built a modular TypeScript package, wrapping the [EAS SDK](https://docs.attest.org/docs/developer-tools/eas-sdk#table-of-contents) into a composable set of helper methods, that does much of the heavy lifting for you. This package is designed to be used in conjunction with the EAS SDK, to aid in building real-world applications and workflows.

We've also built a set of configurable example scripts that demonstrate various patterns of interacting with EAS, using the built-in helper functions. The "workflow" examples are more complex but structured to simulate a real-world scenarios and how it would be done with EAS. The goal is to provide a set of building blocks that you can use to become more familiar with the EAS environment and how the EAS SDK can be used.

> **Note:** Our work uses the sepolia testnet. I highly recommend using a faucet to get test funds. Check out [Google&#39;s Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

## Table of Contents

- [eas-sandbox](#eas-sandbox)
  - [Table of Contents](#table-of-contents)
  - [RPC Provider API key (e.g., Infura, Alchemy)](#rpc-provider-api-key-eg-infura-alchemy)
  - [Reviewing your attestations and transactions](#reviewing-your-attestations-and-transactions)
  - [Getting Started](#getting-started)
    - [Project Structure](#project-structure)
    - [Setting up your development environment](#setting-up-your-development-environment)
    - [Installation](#installation)
    - [Configuration](#configuration)
  - [Using the Configuration Manifest](#using-the-configuration-manifest)
  - [Running sample examples](#running-sample-examples)
  - [Running workflow examples](#running-workflow-examples)
  - [QR Code Proof of Concept](#qr-code-proof-of-concept)
    - [Running with Validation](#running-with-validation)
  - [ProofMode Proof of Concept](#proofmode-proof-of-concept)

## RPC Provider API key (e.g., Infura, Alchemy)

Some of the tooling built will require n [Remote Procedure Call](https://www.cyfrin.io/blog/blockchain-rpc-node-guide) provider API key as to interact (read data, send transactions) with blockchain networks (like Ethereum and Sepolia). A RPC provider is a service that runs these nodes and gives you an easy way to connect to the blockchain without running your own node (which can be resource-intensive). Services like [Infura](https://www.infura.io/) and [Alchemy](https://www.alchemy.com/) are popular RPC providers. If you are using [MetaMask](https://metamask.io/) or any other wallet, I recommend creating an account with Infura because of it's integration with MetaMask.

## Reviewing your attestations and transactions

By default, all transactions have been configured for the Ethereum Sepolia test network.

- If you would like to review your attestations, please visit the [EAS Sepolia Explorer](https://sepolia.easscan.io/). You can search for your wallet address in the search bar to see all the attestations made by your wallet.
- If you would like to review your transactions, please visit the [Etherscan Sepolia Testnet Explorer](https://sepolia.etherscan.io/). You can search for your wallet address in the search bar to see all the transactions made by your wallet.

## Getting Started

### Project Structure

- `src/`: Contains the core modular functions.
  - `config.ts`: Configuration constants (Contract addresses).
  - `provider.ts`: Function to initialize ethers provider and signer.
  - `eas-attestation.ts`: Functions for creating, fetching, and revoking on-chain and off-chain attestations.
  - `eas-schema.ts`: Functions for registering and fetching schemas.
  - `offchain-storage.ts`: Functions for saving and loading off-chain attestations to a local JSON file.
- `src/utils/`: Contains utility functions for various tasks.
  - `config-helpers.ts`: Functions for loading and validating configuration files.
  - `eas-helpers.ts`: Functions for interacting with the EAS SDK and Ethereum network.
- `src/examples/`: Contains example scripts demonstrating how to use the modular functions.
- `src/workflows/`: Contains end-to-end workflow examples that leverage the modular functions.
- `config/`: Contains configuration files.
  - `examples.yaml`: Configuration manifest for example scripts.
- `offchain-attestations.json`: Local storage file for off-chain attestations (created when saving).
- `.env.example`: Example environment file structure.

### Setting up your development environment

This TypeScript project uses [Yarn](https://yarnpkg.com/) as the package manager.

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

## Using the Configuration Manifest

To provide a flexible way to configure and run the example scripts without modifying their source code, this project uses a YAML-based configuration manifest file named `examples.yaml`, located in the `config/` directory.

**Purpose:**

- Centralize configuration for example scripts.
- Allow users to specify parameters like schema UIDs, attestation data, recipient addresses, etc., for different scripts.
- Support complex scenarios, such as defining multiple attestations for a single workflow script or running a script with different sets of parameters.

**Structure:**

The `examples.yaml` file is a YAML object where top-level keys are the names of the example scripts (e.g., `create-onchain-attestation`, `register-schema`). Each script name maps to an array of configuration objects. This allows a script to be configured with multiple distinct parameter sets.

A configuration object can either define parameters for a single operation or, for scripts designed to handle multiple attestations in a batch, it can contain an `attestations` key. This key holds an array of individual attestation configurations.

**Example `config/examples.yaml` Structure:**

```yaml
# config/examples.yaml

# Configuration for the 'create-onchain-attestation.ts' script
create-onchain-attestation:
  - schemaUid: "0xyourSchemaUIDhere..." # Required: The UID of the schema to attest against
    fields:
      message: "Hello from YAML config!"
      value: 100
    recipient: "0xRecipientAddress..."   # Optional: Defaults to ethers.ZeroAddress
    revocable: true                    # Optional: Defaults to true
    expirationTime: 0                  # Optional: Attestation does not expire. Provide Unix timestamp for expiration.
    # referenceUid: "0xPreviousAttestationUID..." # Optional: For chained attestations

# Configuration for 'register-schema.ts'
register-schema:
  - schemaString: "string message, uint256 value" # Required: The schema definition
    resolverAddress: "0xResolverContractAddress..." # Optional: Defaults to ethers.ZeroAddress
    revocable: true                             # Optional: Defaults to true

# Example for a script that might process multiple attestations (e.g., a workflow)
# (Assuming a script named 'batch-attestation-workflow' exists)
batch-attestation-workflow:
  - attestations:
      - schemaUid: "0xSchemaUID1..."
        fields: { data: "First item in batch" }
        recipient: "0xAddressA..."
      - schemaUid: "0xSchemaUID2..."
        fields: { info: "Second item in batch" }
        recipient: "0xAddressB..."
        referenceUid: "0xSomeOtherAttestationUID..."
```

**Configurable Properties:**

The following properties can be defined within each configuration object (or within each object in the `attestations` array). While most are optional with sensible defaults, specific scripts might require certain properties to be set for successful execution (e.g., `schemaUid` and `fields` for creating an attestation).

- `schemaUid` (`string | null`): The UID of the EAS schema.
  - *Used by*: Scripts creating attestations, fetching schemas, revoking attestations.
  - *Default*: `null`
- `schemaString` (`string | null`): The schema definition string (e.g., "string message, uint256 value").
  - *Used by*: Scripts registering new schemas.
  - *Default*: `null`
- `fields` (`Record<string, any> | null`): An object containing the key-value pairs for the attestation data, matching the schema.
  - *Used by*: Scripts creating attestations.
  - *Default*: `null`
- `recipient` (`string | null`): The Ethereum address of the attestation recipient.
  - *Used by*: Scripts creating attestations.
  - *Default*: `ethers.ZeroAddress` (i.e., `0x0000000000000000000000000000000000000000`)
- `revocable` (`boolean`): Whether the attestation or schema is revocable.
  - *Used by*: Scripts creating attestations or registering schemas.
  - *Default*: `true`
- `expirationTime` (`number | bigint`): The Unix timestamp (in seconds) when the attestation expires. A value of `0` means it never expires. This is converted to a `BigInt` internally.
  - *Used by*: Scripts creating attestations.
  - *Default*: `0n` (no expiration)
- `referenceUid` (`string | null`): The UID of a previous attestation that this new attestation references (for chained attestations).
  - *Used by*: Scripts creating attestations.
  - *Default*: `ethers.ZeroHash` (i.e., `0x0000000000000000000000000000000000000000000000000000000000000000`)
- `createPrivateData` (`boolean`): A flag to indicate if the attestation should be created as a private data attestation.
  - *Used by*: Scripts creating attestations, to differentiate between public and private data flows.
  - *Default*: `false`
- `fieldsToDisclose` (`string[] | null`): An array of field names to disclose when creating a proof for a private data attestation.
  - *Used by*: Scripts that generate proofs for private data attestations.
  - *Default*: `null` (meaning all fields that are part of the private data might be proven, or none if not applicable)
- `attestationUid` (`string | null`): The UID of an existing attestation.
  - *Used by*: Scripts that fetch or revoke attestations.
  - *Default*: `null`
- `resolverAddress` (`string | null`): The address of a resolver contract for schema registration.
  - *Used by*: Scripts registering new schemas.
  - *Default*: `ethers.ZeroAddress`

By modifying `config/examples.yaml`, you can run the example scripts with your desired parameters without needing to edit the TypeScript files directly. Refer to individual script documentation or comments for specific configuration needs.

> Note: Properties that are omitted from a given section of the YAML file will use their default values as defined in the code. This allows you to only specify the properties you want to customize while keeping the rest at their defaults.

## Running sample examples

A suite of sample examples are provided in the `examples` directory. These examples demonstrate how to use the EAS SDK to create and verify attestations, as well as how to interact with the Ethereum network. The properties and parameters for these scripts are primarily configured through the `config/examples.yaml` manifest file. Each script looks for a top-level key in the YAML file that matches its filename (e.g., `create-onchain-attestation` for `create-onchain-attestation.ts`).

The following scripts in `src/examples/` demonstrate common EAS interactions:

- **`register-schema.ts`**:

  - Demonstrates how to register a new schema on the EAS Schema Registry.
  - Run with: `yarn example:register-schema`
  - **Note:** Configure the `register-schema` section in `config/examples.yaml`. Minimally, provide `schemaString`.
- **`fetch-schema.ts`**:

  - Shows how to fetch the details of an existing schema using its UID.
  - Run with: `yarn example:fetch-schema`
  - **Note:** Configure the `fetch-schema` section in `config/examples.yaml`. Minimally, provide `schemaUid`.
- **`create-onchain-attestation.ts`**:

  - Creates a new attestation on-chain using a specific schema.
  - Run with: `yarn example:attest-onchain`
  - **Note:** Configure the `attest-onchain` section in `config/examples.yaml`. Minimally, provide `schemaUid` and `fields`.
- **`get-attestation.ts`**:

  - Fetches the details of an existing on-chain attestation using its UID.
  - Run with: `yarn example:fetch-attestation`
  - **Note:** Configure the `fetch-attestation` section in `config/examples.yaml`. Minimally, provide `attestationUid`.
- **`revoke-attestation.ts`**:

  - Revokes an existing on-chain attestation.
  - Run with: `yarn example:revoke`
  - **Note:** Configure the `revoke-attestation` section in `config/examples.yaml`. Minimally, provide `attestationUid`.
- **`create-offchain-attestation.ts`**:

  - Creates and signs an off-chain attestation. The result is printed to the console but not stored automatically by this script.
  - Run with: `yarn example:attest-offchain`
  - **Note:** Configure the `attest-offchain` section in `config/examples.yaml`. Minimally, provide `schemaUid` and `fields`.
- **`save-offchain-attestation.ts`**:

  - Creates a new signed off-chain attestation and then saves it to the local `offchain-attestations.json` file.
  - Run with: `yarn example:save-offchain`
  - **Note:** Configure the `save-offchain-attestation` section in `config/examples.yaml`. Minimally, provide `schemaUid` and `fields`. The script will create/append to `offchain-attestations.json`.
- **`load-offchain-attestations.ts`**:

  - Loads attestations from the `offchain-attestations.json` file.
  - Run with: `yarn example:load-offchain`
  - **Note:** This script primarily loads data from `offchain-attestations.json`. Configuration in `examples.yaml` under `load-offchain-attestations` might be used for optional filtering parameters if implemented in the script. See configuration section for more details.
- **`chained-attestation.ts`**:

  - Demonstrates how to create a new attestation that references a previous attestation.
  - Run with: `yarn example:chained-attestation`
  - **Note:** Configure the `chained-attestation` section in `config/examples.yaml`. Minimally, provide `schemaUid`, `fields`, and `referenceUid`.
- **`gas-comparison.ts`**:

  - Compares the gas costs of storing geojson objects on chain as `strings` and `int40` coordinates pairs. More details on the significance of optimized schemas can be found in the [EAS documentation](https://docs.attest.org/docs/tutorials/gas-efficiency) while the specifics of storing geometry data on-chain can be found [here](/Docs/optimzing-geometry-data-on-chain.md).
  - Run with: `yarn example:gas-cost-comparison`
  - **Note:** Configure the `gas-cost-comparison` section in `config/examples.yaml`. To simulate the cost of attesting geojson objects, add a valid geojson object to the `coordinates` key.
- **`list-items.ts`**:

  - Lists attestations or schemas for a given wallet address and referenced attestations.
  - Run with: `yarn example:list-items`
  - **Note:** Configure the `list-items` section in `config/examples.yaml`. To query attestations and schemas from a given `walletAddress`, add the `walletAddress` value to the `recipient` property. Update the `referenceUid` property To view referenced attestations from a given `UID`.

  > The query limit default is set to 10.  If necessary, modify the `queryLimit` variable in the script.
  >
- **`prepare-private-data.ts`**:

  - Shows how to prepare private data for an attestation using the EAS SDK's PrivateData class.
  - Run with: `yarn example:create-private-data-object`
  - **Note:** Configure the `create-private-data-object` section in `config/examples.yaml`. Minimally, provide `schemaUid`, `schemaString`, and `fields`.
- **`private-data-proofs.ts`**:

  - Demonstrates creating and verifying proofs for private data attestations.
  - Run with: `yarn example:generate-private-data-proofs`
  - **Note:** Configure the `generate-private-data-proofs` section in `config/examples.yaml`. Minimally, provide `schemaUid`, `fields`, and `fieldsToDisclose`.
- **`private-data-proofs-onchain.ts`**:

  - Demonstrates creating and verifying proofs for private data attestations that are stored on-chain. The resulting proof can be used to verify the on-chain attestation.
  - Run with: `yarn example:generate-onchain-private-data-proofs`
  - **Note:** Configure the `generate-onchain-private-data-proofs` section in `config/examples.yaml`. Minimally, provide `schemaUid`, `fields`, and `fieldsToDisclose`.

## Running workflow examples

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

  - Illustrates a geocaching scenario that simulates a user scanning a QR code that triggers the creation of an attestation containing geospatial metadata grabbed from the scanned QR code.
  - Run with: `yarn workflow:geocache`
  - **Note:** You may need to edit the script to provide relevant schema and location details.
- **`workflow-proofmode.ts`**:

  - Illustrates a scenario that simulates a user uploading a ProofMode file that triggers the creation of an attestation containing metadata grabbed from the uploaded ProofMode file.
  - Run with: `yarn workflow:proofmode`
  - **Note:** You may need to edit the script to provide relevant schema details.

## QR Code Proof of Concept

Under the `qr-poc` directory of this repository lives a React project bootstrapped with Vite. This emulates a practical example of how location attestations may be generated by common end users. The examples parallels experiences such as scanning into restaurants, that is -- checking in with a mobile device. With this example, the React app leverages a `useEffect` hook to trigger an attestation generation transaction on page load. To take this a step further, a QR code can be generated to point to the hosted webapp in which mobile devices with Metamask configured can scan the QR code and generate attestations on the device.

**To run this**

Run the following in a terminal located at the root directory of this repository

```
yarn run dev:qr-poc
```

**To build**

Run the following in a terminal located at the root directory of this repository

```bash
yarn run build:qr-poc
```

### Running with Validation

Adjacent to the `qr-poc` folder exists a `validator` workspace. This poses as a proof of concept off-chain validator that monitors a specific Sepolia attestation SchemaUID, decrypting the `recipePayload` attribute. Although running this is **not** required, it can be tested with the QR code single page application (SPA). To properly run it, update the `src/config.ts` file's `ENCRYPTION_KEY` and `SCHEMA_UID` values. Then, in a terminal run:

```bash
yarn run dev:validator
```

Then, with the QR code SPA running, navigate to the development server URL and add the `secret` parameter equal to the `ENCRYPTION_KEY` value. For example, if my `ENCRYPTION_KEY` is `hello`, the URL I should navigate to is `http://localhost:5173/?secret=hello` assuming my development server is on `http://localhost:5173/`

## ProofMode Proof of Concept

Under the `src/workflows` directory, you'll find `workflow-proofmode.ts`, which demonstrates a practical implementation of media verification attestations using EAS. This workflow emulates how ProofMode (a mobile app for capturing verifiable photos) data can be attested on-chain, preserving the integrity and origin of digital evidence.

The workflow performs the following steps:

1. **Schema Registration**: Ensures a schema designed for ProofMode metadata exists, creating one if necessary
2. **Metadata Extraction**: Locates and extracts a ProofMode zip file containing media with verification metadata
3. **Metadata Processing**: Parses the extracted proof.json file to extract:
   - Geolocation data (latitude/longitude coordinates)
   - Timestamps of when the media was captured
   - Device information and identifiers
   - Network details and connectivity information
   - Other verification details organized by proof type
4. **Proof Type Classification**: Categorizes verification data into different proof types:
   - BASIC: Core location and device information
   - NETWORK: Cell information
  
> **Note:**
The NOTARY and C2PA proof type classifications aren't yet implemented.


5. **On-chain Attestation**: Creates a tamper-evident, blockchain-backed verification record with the extracted metadata

> **Note:**
The current workflow extracts metadata from ProofMode files but doesn't include the actual images in the EAS schema. Only the metadata and proofs about the images are stored on-chain.


### Key Features

- **Automatic Schema Management**: Checks for existing schemas before registration to avoid duplication
- **Rich Metadata Extraction**: Extracts and preserves comprehensive verification data
- **Flexible Proof Types**: The system can handle multiple types of proofs from the same media file
- **Self-contained Verification**: Proof types are preserved as structured data in the attestation

This proof of concept is particularly valuable for applications requiring verified media evidence, such as journalism, human rights documentation, legal evidence collection, and scientific field research where the authenticity and provenance of media are critical.

**To run this workflow**

When using ProofMode, ensure you select location mode at a minimum.

> **Note:**
Given that the NOTARY and C2PA  proof type classifications aren't yet implemented, the workflow will only recognize NETWORK as an additional proof type classification.

Place your ProofMode zip file (format: `Test_PM-*.zip`) containing an image and its proof.json file in the `sample-data` directory of this repository.

Then, run the following command from the root directory:

```bash
yarn workflow:proofmode
```