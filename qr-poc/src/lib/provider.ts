import { ethers } from "ethers";
// import * as dotenv from "dotenv";

// dotenv.config();

const privateKey = import.meta.env.VITE_PRIVATE_KEY;
const infuraApiKey = import.meta.env.VITE_INFURA_API_KEY;

// Moved the check for infuraApiKey here as it's needed for the URL
if (!infuraApiKey) {
    throw new Error("INFURA_API_KEY not found in .env file. Please provide an API key for your RPC provider (e.g., Infura, Alchemy).");
}

const rpcProviderUrl = `https://sepolia.infura.io/v3/${infuraApiKey}`;

/**
 * Initializes and returns an ethers JsonRpcProvider and Wallet signer.
 * Reads PRIVATE_KEY and INFURA_API_KEY from .env file.
 * @returns { { provider: ethers.JsonRpcProvider, signer: ethers.Wallet } }
 */
export function getProviderSigner() {
    // Check for privateKey inside the function scope
    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in .env file. Please add your wallet's private key.");
    }

    console.log(`Connecting to RPC provider at ${rpcProviderUrl}...`);
    const provider = new ethers.JsonRpcProvider(rpcProviderUrl);
    // Now TypeScript knows privateKey is a string here
    const signer = new ethers.Wallet(privateKey, provider);
    console.log(`Using signer address: ${signer.address}`);
    return { provider, signer };
}
