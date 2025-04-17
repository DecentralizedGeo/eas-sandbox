import { EAS, NO_EXPIRATION, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
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

    // Define schema
    const schemaEncoder = new SchemaEncoder("string message");

    // Encode data according to the schema
    const encodedData = schemaEncoder.encodeData([
        { name: "message", value: "hello world - DGC", type: "string" }
    ]);

    /**
     * Notes from matt:
     * 
     * The encoded data must adhere to an existing schemaUID on EAS. Check out https://sepolia.easscan.org/schema/create
     * to create a schema. If it already exists, you can use the schema ID returned. Note that you must have your
     * wallet connected to use the tool.
     */
    const schemaUID = '0x3969bb076acfb992af54d51274c5c868641ca5344e1aacd0b1f5e4f80ac0822f'; 

    console.log("Sending transaction to EAS... (give this a moment!)");
    // Create the attestation
    const transaction = await eas.attest({
        schema: schemaUID,
        data: {
            recipient: ethers.ZeroAddress,
            expirationTime: NO_EXPIRATION,
            revocable: true,
            data: encodedData,
        },
    });

    const newAttestationUID = await transaction.wait();

    console.log("Attestation created with UID:", newAttestationUID);
    console.log("Transaction hash:", transaction.tx.hash);

    console.log("Transaction URL:", `https://sepolia.etherscan.io/tx/${transaction.tx.hash}`);
    console.log("Attestation URL:", `https://sepolia.easscan.org/attestation/view/${newAttestationUID}`);
}

main().catch((error: any) => {
    console.error(error);
    process.exitCode = 1;
});