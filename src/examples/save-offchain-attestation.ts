import { getProviderSigner } from "../provider";
import { createOffChainAttestation, OffChainAttestationData } from "../eas-attestation";
import { saveOffChainAttestation } from "../offchain-storage";
import { ethers } from "ethers";

// Example usage: Create an off-chain attestation and save it to local storage

// --- Configuration --- Define the attestation details
const exampleSchemaUID = "0xb16fa048b0d597f5a821747eba64efa4762ee5143e9a80600d0005386edfc995"; // Replace with your actual schema UID
const exampleSchemaString = "uint256 eventId, uint8 voteIndex"; // Replace with your actual schema string
const exampleRecipient = "0xFD50b031E778fAb33DfD2Fc3Ca66a1EeF0652165"; // Replace if needed
// ---------------------

async function runExampleSaveOffChain() {
    try {
        // 1. Get the provider and signer
        const { signer } = getProviderSigner();

        // 2. Define the off-chain attestation data
        const attestationData: OffChainAttestationData = {
            recipient: exampleRecipient,
            expirationTime: 0n, // No expiration
            revocable: true,
            schemaUID: exampleSchemaUID,
            schemaString: exampleSchemaString,
            refUID: ethers.ZeroHash,
            time: BigInt(Math.floor(Date.now() / 1000)),
            dataToEncode: [
                { name: "eventId", value: Math.floor(Math.random() * 10000), type: "uint256" }, // Random event ID for uniqueness
                { name: "voteIndex", value: Math.random() > 0.5 ? 1 : 0, type: "uint8" }, // Random vote
            ],
        };

        // 3. Create and sign the off-chain attestation
        console.log("\nAttempting to create and sign off-chain attestation...");
        const signedOffChainAttestation = await createOffChainAttestation(signer, attestationData);
        console.log("Signed Attestation UID:", signedOffChainAttestation.uid);

        // 4. Save the signed attestation to local storage
        await saveOffChainAttestation(signedOffChainAttestation);

        console.log("\nExample script finished successfully. Attestation saved.");

    } catch (error) {
        console.error("\nError running example saveOffChainAttestation script:", error);
        process.exit(1);
    }
}

runExampleSaveOffChain();
