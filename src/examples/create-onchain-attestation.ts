import { getProviderSigner } from "../provider";
import { createOnChainAttestation, OnChainAttestationData } from "../eas-attestation";
import { ethers } from "ethers";

// Example usage of the createOnChainAttestation function

// Configuration for this specific example
const exampleSchemaUID = "0xb16fa048b0d597f5a821747eba64efa4762ee5143e9a80600d0005386edfc995"; // Replace with your actual schema UID
const exampleSchemaString = "uint256 eventId, uint8 voteIndex"; // Replace with your actual schema string
const exampleRecipient = "0xFD50b031E778fAb33DfD2Fc3Ca66a1EeF0652165"; // Replace if needed

async function runExampleOnChainAttestation() {
    try {
        // 1. Get the provider and signer
        const { signer } = getProviderSigner();

        // 2. Define the on-chain attestation data
        const attestationData: OnChainAttestationData = {
            recipient: exampleRecipient,
            expirationTime: 0n, // Use 0n for no expiration (BigInt)
            revocable: true,
            schemaUID: exampleSchemaUID,
            schemaString: exampleSchemaString,
            refUID: ethers.ZeroHash, // Optional: Reference another attestation UID if needed
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
        console.error("\nError running example on-chain attestation script:", error);
        process.exit(1);
    }
}

runExampleOnChainAttestation();
