import { getProviderSigner } from "../provider";
import { createOnChainAttestation, OnChainAttestationData } from "../eas-attestation";
import { ethers } from "ethers";
import { validateAttestationData } from "../utils/eas-helpers"; // Import the validator
import { fetchSchema } from "../eas-schema"; // Import fetchSchema

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

        // --- Schema String Validation Step ---
        console.log(`\nFetching schema record for UID: ${attestationData.schemaUID} to verify schema string...`);
        const schemaRecord = await fetchSchema(attestationData.schemaUID);

        if (!schemaRecord) {
            console.error("Failed to fetch schema record. Aborting creation.");
            process.exit(1);
        }

        if (schemaRecord.schema !== attestationData.schemaString) {
            console.error(`Schema string mismatch! Provided: "${attestationData.schemaString}", On-chain: "${schemaRecord.schema}". Aborting.`);
            process.exit(1);
        }
        console.log("Schema string matches the on-chain record.");
        // -------------------------------------

        // --- Data Validation Step (FR10) ---
        console.log("\nValidating attestation data against schema...");
        // Convert dataToEncode array to a simple key-value object for validation
        const dataObject = attestationData.dataToEncode.reduce((acc, item) => {
            acc[item.name] = item.value;
            return acc;
        }, {} as Record<string, any>);

        const isValid = validateAttestationData(attestationData.schemaString, dataObject);

        if (!isValid) {
            console.error("Attestation data validation failed. Aborting creation.");
            process.exit(1);
        }
        console.log("Data validation successful.");
        // -------------------------------------

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
