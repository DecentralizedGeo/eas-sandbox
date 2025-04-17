import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { getProviderSigner } from "./provider";
import { createOnChainAttestation, OnChainAttestationData } from "./eas-attestation";

dotenv.config(); // Load environment variables from .env file

// Configuration - Values a user might want to change
const EASContractAddress = "0xC2679fBD37d54388Ce493F1DB75320D236e1815e"; // Sepolia v0.26

const schemaUID = "0xb16fa048b0d597f5a821747eba64efa4762ee5143e9a80600d0005386edfc995"; // Example schema UID - Replace with your actual schema UID
// const schemaUID = "0xba4171c92572b1e4f241d044c32cdf083be9fd946b8766977558ca6378c824e2"; // Astral Protocol Schema #544

const schemaString = "uint256 eventId, uint8 voteIndex"; // Example schema string - Replace with your actual schema string
// const schemaString = "uint256 eventTimestamp,string srs,string locationType,string location,string[] recipeType,bytes[] recipePayload,string[] mediaType,string[] mediaData,string memo"
const recipientAddress = "0xFD50b031E778fAb33DfD2Fc3Ca66a1EeF0652165"; // Example recipient - Replace if needed

// Environment variables - Sensitive values
const privateKey = process.env.PRIVATE_KEY;
const infuraApiKey = process.env.INFURA_API_KEY; // Or your preferred RPC provider API key (e.g., ALCHEMY_API_KEY)
const rpcProviderUrl = `https://sepolia.infura.io/v3/${infuraApiKey}`; // Construct RPC URL

if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in .env file. Please add your wallet's private key.");
}
if (!infuraApiKey) {
    throw new Error("INFURA_API_KEY not found in .env file. Please provide an API key for your RPC provider (e.g., Infura, Alchemy).");
}

// Initialize EAS SDK
const eas = new EAS(EASContractAddress);

// Initialize Provider and Signer
console.log(`Connecting to RPC provider at ${rpcProviderUrl}...`);
// Use ethers.JsonRpcProvider directly for ethers v6+
const provider = new ethers.JsonRpcProvider(rpcProviderUrl);
const signer = new ethers.Wallet(privateKey, provider);

// Connect Signer to EAS SDK
eas.connect(signer as any); // Cast signer to 'any' as a workaround for type incompatibility

// Example usage of the modular functions

// Configuration for this specific example
const exampleSchemaUID = "0xb16fa048b0d597f5a821747eba64efa4762ee5143e9a80600d0005386edfc995"; // Replace with your actual schema UID
const exampleSchemaString = "uint256 eventId, uint8 voteIndex"; // Replace with your actual schema string
const exampleRecipient = "0xFD50b031E778fAb33DfD2Fc3Ca66a1EeF0652165"; // Replace if needed

async function runExampleAttestation() {
    try {
        // 1. Get the provider and signer
        const { signer } = getProviderSigner();

        // 2. Define the attestation data
        const attestationData: OnChainAttestationData = {
            recipient: exampleRecipient,
            expirationTime: 0n, // Use 0n for no expiration (BigInt)
            revocable: true,
            schemaUID: exampleSchemaUID,
            schemaString: exampleSchemaString,
            dataToEncode: [
                // Update these values according to your schemaString
                { name: "eventId", value: 1, type: "uint256" },
                { name: "voteIndex", value: 1, type: "uint8" },
            ],
        };

        // 3. Create the on-chain attestation
        console.log("\nAttempting to create on-chain attestation...");
        const newAttestationUID = await createOnChainAttestation(signer, attestationData);

        console.log(`\nExample script finished successfully. Attestation UID: ${newAttestationUID}`);

    } catch (error) {
        console.error("\nError running example attestation script:", error);
        process.exit(1);
    }
}

runExampleAttestation();
