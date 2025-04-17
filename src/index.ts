import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import dotenv from 'dotenv';

dotenv.config();

// Ref: https://github.com/ethereum-attestation-service/eas-sdk
const EASContractAddress = '0xC2679fBD37d54388Ce493F1DB75320D236e1815e'; // Sepolia v0.26

async function main() {
    const eas = new EAS(EASContractAddress);
    const provider = ethers.getDefaultProvider('sepolia');

    // Create a signer
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("set PRIVATE_KEY in .env");
    const signer = new ethers.Wallet(privateKey, provider);

    // Connect to EAS with the signer
    eas.connect(signer);
}

main().catch((error: any) => {
    console.error(error);
    process.exitCode = 1;
});