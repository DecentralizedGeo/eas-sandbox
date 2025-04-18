import { getProviderSigner } from "../provider";
import { createOffChainAttestation, OffChainAttestationData } from "../eas-attestation";
import { ethers } from "ethers";

// Example usage of the createOffChainAttestation function

// Configuration for this specific example
const exampleSchemaUID = "0xb16fa048b0d597f5a821747eba64efa4762ee5143e9a80600d0005386edfc995"; // Replace with your actual schema UID
const exampleSchemaString = "uint256 eventId, uint8 voteIndex"; // Replace with your actual schema string
const exampleRecipient = "0xFD50b031E778fAb33DfD2Fc3Ca66a1EeF0652165"; // Replace if needed

async function runExampleOffChainAttestation() {
    try {
        // 1. Get the provider and signer
        const { signer } = getProviderSigner();

        // 2. Define the off-chain attestation data
        const attestationData: OffChainAttestationData = {
            recipient: exampleRecipient,
            expirationTime: 0n, // Use 0n for no expiration (BigInt)
            revocable: true,
            schemaUID: exampleSchemaUID,
            schemaString: exampleSchemaString,
            refUID: ethers.ZeroHash, // Optional: Reference another attestation UID if needed
            time: BigInt(Math.floor(Date.now() / 1000)), // Optional: Use current time or specify a time
            //   nonce: 0, // Optional: Use a specific nonce if needed
            dataToEncode: [
                // Update these values according to your schemaString
                { name: "eventId", value: 999, type: "uint256" }, // Example data
                { name: "voteIndex", value: 2, type: "uint8" },   // Example data
            ],
        };

        // 3. Create and sign the off-chain attestation
        console.log("\nAttempting to create and sign off-chain attestation...");
        const signedOffChainAttestation = await createOffChainAttestation(signer, attestationData);

        console.log("\nOff-chain attestation created and signed successfully:");
        console.log(JSON.stringify(signedOffChainAttestation, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2)); // Pretty print with BigInt support

        // Note: This signed attestation can now be stored or transmitted off-chain.
        // Verification would typically involve recovering the signer address from the signature
        // and checking it against an expected address, as well as verifying the data itself.

    } catch (error) {
        console.error("\nError running example off-chain attestation script:", error);
        process.exit(1);
    }
}

runExampleOffChainAttestation();
